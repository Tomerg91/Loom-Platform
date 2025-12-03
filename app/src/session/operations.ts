import { HttpError } from "wasp/server";
import type {
  CreateSession,
  UpdateSession,
  DeleteSession,
  GetSessionsForClient,
  GetRecentSessionsForClient,
  LogSession,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  notificationEmitter,
  NotificationEventType,
} from "../notifications/eventEmitter";
import { GoogleCalendarService } from "../google-calendar/service";
import { requireCoachOwnsClient } from "../server/rbac";
import {
  sanitizeSensitiveTextInput,
  sanitizeSensitiveTextOutput,
} from "../server/security/encryption";

// ============================================
// GOOGLE CALENDAR SYNC HELPER
// ============================================
/**
 * Helper: Add session to user's Google Calendar if connected
 * Catches errors and logs them but doesn't fail session creation
 */
async function syncSessionToGoogleCalendar(
  session: any, // CoachSession type
  user: any, // User type
  context: any, // Wasp context
): Promise<void> {
  try {
    const connection = await context.entities.UserCalendarConnection.findUnique(
      {
        where: { userId: user.id },
      },
    );

    if (!connection?.isConnected) {
      return; // Not connected, skip sync
    }

    const service = new GoogleCalendarService();

    // Format event details
    const title = session.topic || "Coaching Session";
    const description = `Session with client\nTopic: ${
      session.topic || "General"
    }\nNotes: ${session.sharedSummary || "None"}`;

    // Add 1-hour duration default
    const startTime = new Date(session.sessionDate);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const googleEventId = await service.addSessionEvent(
      connection.calendarId,
      title,
      startTime,
      endTime,
      description,
    );

    // Store the Google Calendar event reference
    await context.entities.GoogleCalendarEvent.create({
      data: {
        sessionId: session.id,
        googleEventId,
      },
    });

    // Update last sync time
    await context.entities.UserCalendarConnection.update({
      where: { userId: user.id },
      data: {
        lastSyncAt: new Date(),
      },
    });
  } catch (error) {
    // Log error but don't fail session creation
    console.error("Google Calendar sync failed:", {
      userId: user.id,
      sessionId: session.id,
      error: error instanceof Error ? error.message : String(error),
    });

    // Update error tracking in database
    try {
      await context.entities.UserCalendarConnection.update({
        where: { userId: user.id },
        data: {
          lastError: error instanceof Error ? error.message : String(error),
          lastErrorAt: new Date(),
          syncErrorCount: { increment: 1 },
        },
      });
    } catch (updateError) {
      console.error("Failed to update calendar error", updateError);
    }
  }
}

// ============================================
// SESSION RESPONSE TYPE
// ============================================
export type SessionResponse = {
  id: string;
  createdAt: Date;
  sessionDate: Date;
  sessionNumber?: number | null;
  topic?: string | null;
  privateNotes: string | null | undefined;
  sharedSummary: string | null | undefined;
};

export type SessionResponsePublic = {
  id: string;
  sessionDate: Date;
  sessionNumber?: number | null;
  topic?: string | null;
  sharedSummary: string | null | undefined;
  somaticAnchor: string | null;
  resources: { id: string; name: string; type: string; s3Key: string }[];
};

// ============================================
// TIMEZONE UTILITIES
// ============================================

// ============================================
// TEXT SANITIZATION HELPERS
// ============================================
const normalizeSensitiveFields = <
  T extends { privateNotes?: string | null; sharedSummary?: string | null },
>(
  session: T,
) => ({
  ...session,
  privateNotes: sanitizeSensitiveTextOutput(session.privateNotes ?? null),
  sharedSummary: sanitizeSensitiveTextOutput(session.sharedSummary ?? null),
});

// ============================================
// CREATE SESSION
// ============================================
const createSessionSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  sessionDate: z.string().or(z.date()).optional(),
  privateNotes: z.string().optional().nullable(),
  sharedSummary: z.string().optional().nullable(),
});

type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const createSession: CreateSession<
  CreateSessionInput,
  SessionResponse
> = async (rawArgs, context) => {
  const { clientId, sessionDate, privateNotes, sharedSummary } =
    ensureArgsSchemaOrThrowHttpError(createSessionSchema, rawArgs);

  const { coachProfile } = await requireCoachOwnsClient(context, clientId, {
    unauthenticatedMessage: "You must be logged in to create sessions",
    unauthorizedMessage: "Only coaches can create sessions",
  });

  // Create the session
  const session = await context.entities.CoachSession.create({
    data: {
      sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
      privateNotes: sanitizeSensitiveTextInput(privateNotes) ?? null,
      sharedSummary: sanitizeSensitiveTextInput(sharedSummary) ?? null,
      coachId: coachProfile.id,
      clientId: clientId,
    },
  });

  // Sync to Google Calendar (fire-and-forget, doesn't fail session creation)
  await syncSessionToGoogleCalendar(session, context.user, context);

  // Update client's lastActivityDate
  await context.entities.ClientProfile.update({
    where: { id: clientId },
    data: { lastActivityDate: new Date() },
  });

  return {
    id: session.id,
    createdAt: session.createdAt,
    sessionDate: session.sessionDate,
    privateNotes: sanitizeSensitiveTextOutput(session.privateNotes),
    sharedSummary: sanitizeSensitiveTextOutput(session.sharedSummary),
  };
};

// ============================================
// UPDATE SESSION
// ============================================
const updateSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  sessionDate: z.string().or(z.date()).optional(),
  privateNotes: z.string().optional().nullable(),
  sharedSummary: z.string().optional().nullable(),
});

type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

export const updateSession: UpdateSession<
  UpdateSessionInput,
  SessionResponse
> = async (rawArgs, context) => {
  const { sessionId, sessionDate, privateNotes, sharedSummary } =
    ensureArgsSchemaOrThrowHttpError(updateSessionSchema, rawArgs);

  // Get the session and verify ownership
  const session = await context.entities.CoachSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  const { coachProfile } = await requireCoachOwnsClient(
    context,
    session.clientId,
    {
      unauthenticatedMessage: "You must be logged in to update sessions",
      unauthorizedMessage: "Only coaches can update sessions",
    },
  );

  if (session.coachId !== coachProfile.id) {
    throw new HttpError(403, "You do not have access to this session");
  }

  // Update the session
  const updatedSession = await context.entities.CoachSession.update({
    where: { id: sessionId },
    data: {
      ...(sessionDate && { sessionDate: new Date(sessionDate) }),
      ...(privateNotes !== undefined && {
        privateNotes: sanitizeSensitiveTextInput(privateNotes),
      }),
      ...(sharedSummary !== undefined && {
        sharedSummary: sanitizeSensitiveTextInput(sharedSummary),
      }),
    },
  });

  return {
    id: updatedSession.id,
    createdAt: updatedSession.createdAt,
    sessionDate: updatedSession.sessionDate,
    privateNotes: sanitizeSensitiveTextOutput(updatedSession.privateNotes),
    sharedSummary: sanitizeSensitiveTextOutput(updatedSession.sharedSummary),
  };
};

// ============================================
// DELETE SESSION
// ============================================
const deleteSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

type DeleteSessionInput = z.infer<typeof deleteSessionSchema>;

export const deleteSession: DeleteSession<DeleteSessionInput, void> = async (
  rawArgs,
  context,
) => {
  const { sessionId } = ensureArgsSchemaOrThrowHttpError(
    deleteSessionSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to delete sessions");
  }

  // Ensure user is a COACH
  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can delete sessions");
  }

  // Get the coach profile
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // Get the session and verify ownership
  const session = await context.entities.CoachSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.coachId !== coachProfile.id) {
    throw new HttpError(403, "You do not have access to this session");
  }

  // Soft delete the session for GDPR compliance
  await context.entities.CoachSession.update({
    where: { id: sessionId },
    data: { deletedAt: new Date() },
  });
};

// ============================================
// GET SESSIONS FOR CLIENT (with pagination)
// ============================================
const getSessionsForClientSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  page: z.number().int().positive().default(1).optional(),
  limit: z.number().int().positive().default(10).optional(),
});

type GetSessionsForClientInput = z.infer<typeof getSessionsForClientSchema>;

export type SessionsResponse = {
  sessions: SessionResponse[] | SessionResponsePublic[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const getSessionsForClient: GetSessionsForClient<
  GetSessionsForClientInput,
  SessionsResponse
> = async (rawArgs, context) => {
  const args = ensureArgsSchemaOrThrowHttpError(
    getSessionsForClientSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to view sessions");
  }

  const page = args.page || 1;
  const limit = args.limit || 10;
  const skip = (page - 1) * limit;

  // If user is CLIENT: return their own sessions with privacy filter
  if (context.user.role === "CLIENT") {
    const clientProfile = await context.entities.ClientProfile.findUnique({
      where: { userId: context.user.id, deletedAt: null },
    });

    if (!clientProfile) {
      return { sessions: [], total: 0, page, limit, totalPages: 0 };
    }

    // Verify that the requested client matches the authenticated user
    if (args.clientId !== clientProfile.id) {
      throw new HttpError(
        403,
        "You do not have access to this client's sessions",
      );
    }

    const [total, sessions] = await Promise.all([
      context.entities.CoachSession.count({
        where: { clientId: args.clientId, deletedAt: null },
      }),
      context.entities.CoachSession.findMany({
        where: { clientId: args.clientId, deletedAt: null },
        orderBy: { sessionDate: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          sessionDate: true,
          sharedSummary: true,
          somaticAnchor: true,
          resources: {
            select: { id: true, name: true, type: true, s3Key: true },
          },
        },
      }),
    ]);

    // Return ONLY public fields for CLIENT (including harmony features)
    const publicSessions: SessionResponsePublic[] = sessions.map((session) => ({
      id: session.id,
      sessionDate: session.sessionDate,
      sharedSummary: sanitizeSensitiveTextOutput(session.sharedSummary),
      somaticAnchor: session.somaticAnchor,
      resources: session.resources.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        s3Key: r.s3Key,
      })),
    }));

    const totalPages = Math.ceil(total / limit);
    return { sessions: publicSessions, total, page, limit, totalPages };
  }

  // If user is COACH: return all fields for their clients
  if (context.user.role === "COACH") {
    const coachProfile = await context.entities.CoachProfile.findUnique({
      where: { userId: context.user.id, deletedAt: null },
      include: {
        clients: {
          where: { id: args.clientId, deletedAt: null },
        },
      },
    });

    if (!coachProfile) {
      throw new HttpError(404, "Coach profile not found");
    }

    const client = coachProfile.clients[0];
    if (!client) {
      throw new HttpError(
        403,
        "You do not have access to this client's sessions",
      );
    }

    const [total, sessions] = await Promise.all([
      context.entities.CoachSession.count({
        where: { clientId: args.clientId, deletedAt: null },
      }),
      context.entities.CoachSession.findMany({
        where: { clientId: args.clientId, deletedAt: null },
        orderBy: { sessionDate: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          createdAt: true,
          sessionDate: true,
          privateNotes: true,
          sharedSummary: true,
        },
      }),
    ]);

    const fullSessions: SessionResponse[] = sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      sessionDate: session.sessionDate,
      ...normalizeSensitiveFields(session),
    }));

    const totalPages = Math.ceil(total / limit);
    return { sessions: fullSessions, total, page, limit, totalPages };
  }

  throw new HttpError(403, "Invalid user role");
};

// ============================================
// GET RECENT SESSIONS FOR CLIENT (last 3)
// ============================================
const getRecentSessionsForClientSchema = z.object({
  clientId: z.string().min(1, "Client ID is required").optional(),
});

type GetRecentSessionsForClientInput = z.infer<
  typeof getRecentSessionsForClientSchema
>;

export const getRecentSessionsForClient: GetRecentSessionsForClient<
  GetRecentSessionsForClientInput,
  SessionResponsePublic[]
> = async (rawArgs, context) => {
  const args = ensureArgsSchemaOrThrowHttpError(
    getRecentSessionsForClientSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to view sessions");
  }

  // CLIENT users can only view their own sessions
  if (context.user.role === "CLIENT") {
    const clientProfile = await context.entities.ClientProfile.findUnique({
      where: { userId: context.user.id, deletedAt: null },
    });

    if (!clientProfile) {
      return [];
    }

    // If a clientId is provided, verify it matches the authenticated user
    if (args.clientId && args.clientId !== clientProfile.id) {
      throw new HttpError(
        403,
        "You do not have access to this client's sessions",
      );
    }

    const sessions = await context.entities.CoachSession.findMany({
      where: { clientId: clientProfile.id, deletedAt: null },
      orderBy: { sessionDate: "desc" },
      take: 3,
      select: {
        id: true,
        sessionDate: true,
        sharedSummary: true,
        somaticAnchor: true,
        resources: {
          select: { id: true, name: true, type: true, s3Key: true },
        },
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      sessionDate: session.sessionDate,
      sharedSummary: sanitizeSensitiveTextOutput(session.sharedSummary),
      somaticAnchor: session.somaticAnchor,
      resources: session.resources.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        s3Key: r.s3Key,
      })),
    }));
  }

  // COACH users can view their clients' sessions
  if (context.user.role === "COACH") {
    if (!args.clientId) {
      throw new HttpError(400, "Client ID is required for coaches");
    }

    const coachProfile = await context.entities.CoachProfile.findUnique({
      where: { userId: context.user.id, deletedAt: null },
      include: {
        clients: {
          where: { id: args.clientId, deletedAt: null },
        },
      },
    });

    if (!coachProfile || coachProfile.clients.length === 0) {
      throw new HttpError(
        403,
        "You do not have access to this client's sessions",
      );
    }

    const sessions = await context.entities.CoachSession.findMany({
      where: { clientId: args.clientId, deletedAt: null },
      orderBy: { sessionDate: "desc" },
      take: 3,
      select: {
        id: true,
        sessionDate: true,
        sharedSummary: true,
        somaticAnchor: true,
        resources: {
          select: { id: true, name: true, type: true, s3Key: true },
        },
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      sessionDate: session.sessionDate,
      sharedSummary: sanitizeSensitiveTextOutput(session.sharedSummary),
      somaticAnchor: session.somaticAnchor,
      resources: session.resources.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        s3Key: r.s3Key,
      })),
    }));
  }

  throw new HttpError(403, "Invalid user role");
};

// ============================================
// LOG SESSION (Enhanced operation with all fields)
// ============================================
const logSessionSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  sessionDate: z.string().or(z.date()).optional(),
  topic: z.string().optional().nullable(),
  privateNotes: z.string().optional().nullable(),
  sharedSummary: z.string().optional().nullable(),
  somaticAnchor: z
    .enum([
      "HEAD",
      "THROAT",
      "CHEST",
      "SOLAR_PLEXUS",
      "BELLY",
      "PELVIS",
      "ARMS",
      "LEGS",
      "FULL_BODY",
    ])
    .optional()
    .nullable(),
  resourceIds: z.array(z.string()).optional().default([]),
});

type LogSessionInput = z.infer<typeof logSessionSchema>;

export type LogSessionResponse = {
  id: string;
  sessionNumber: number | null;
  sessionDate: Date;
  topic: string | null;
  privateNotes: string | null;
  sharedSummary: string | null;
  somaticAnchor: string | null;
};

export const logSession: LogSession<
  LogSessionInput,
  LogSessionResponse
> = async (rawArgs, context) => {
  const args = ensureArgsSchemaOrThrowHttpError(logSessionSchema, rawArgs);
  const {
    clientId,
    sessionDate,
    topic,
    privateNotes,
    sharedSummary,
    somaticAnchor,
    resourceIds,
  } = args;

  // ============================================
  // AUTHENTICATION & AUTHORIZATION
  // ============================================
  const { coachProfile } = await requireCoachOwnsClient(context, clientId, {
    unauthenticatedMessage: "You must be logged in to log sessions",
    unauthorizedMessage: "Only coaches can log sessions",
  });

  // ============================================
  // VALIDATE RESOURCES (if provided)
  // ============================================
  if (resourceIds && resourceIds.length > 0) {
    // Verify all resources exist and belong to this coach
    const resources = await context.entities.Resource.findMany({
      where: {
        id: { in: resourceIds },
        coachId: coachProfile.id,
      },
    });

    if (resources.length !== resourceIds.length) {
      throw new HttpError(
        403,
        "One or more selected resources are not available or do not belong to you",
      );
    }
  }

  // ============================================
  // CALCULATE SESSION NUMBER (auto-increment)
  // ============================================
  const lastSession = await context.entities.CoachSession.findFirst({
    where: { clientId: clientId, deletedAt: null },
    orderBy: { sessionNumber: "desc" },
  });

  const sessionNumber = (lastSession?.sessionNumber || 0) + 1;

  // ============================================
  // CREATE SESSION WITH RESOURCE ATTACHMENT
  // ============================================
  const session = await context.entities.CoachSession.create({
    data: {
      sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
      sessionNumber: sessionNumber,
      topic: topic || null,
      privateNotes: sanitizeSensitiveTextInput(privateNotes) ?? null,
      sharedSummary: sanitizeSensitiveTextInput(sharedSummary) ?? null,
      somaticAnchor: somaticAnchor || null,
      coachId: coachProfile.id,
      clientId: clientId,
      // Attach resources
      ...(resourceIds &&
        resourceIds.length > 0 && {
          resources: {
            connect: resourceIds.map((id) => ({ id })),
          },
        }),
    },
  });

  // ============================================
  // UPDATE CLIENT ACTIVITY
  // ============================================
  await context.entities.ClientProfile.update({
    where: { id: clientId },
    data: { lastActivityDate: new Date() },
  });

  // ============================================
  // EMIT NOTIFICATION EVENT (if summary provided)
  // ============================================
  if (sharedSummary) {
    try {
      await notificationEmitter.emit(
        NotificationEventType.SESSION_SUMMARY_POSTED,
        {
          clientId: clientId,
          sessionId: session.id,
          topic: topic || undefined,
          sharedSummary: sharedSummary,
        },
      );
    } catch (error) {
      console.error("Error emitting session summary notification:", error);
      // Don't fail the operation if notification fails
    }
  }

  return {
    id: session.id,
    sessionNumber: session.sessionNumber,
    sessionDate: session.sessionDate,
    topic: session.topic,
    privateNotes: sanitizeSensitiveTextOutput(session.privateNotes),
    sharedSummary: sanitizeSensitiveTextOutput(session.sharedSummary),
    somaticAnchor: session.somaticAnchor,
  };
};
