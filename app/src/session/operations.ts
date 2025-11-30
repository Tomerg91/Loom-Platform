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
import { addDays, setHours, setMinutes, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

// ============================================
// SESSION RESPONSE TYPE
// ============================================
export type SessionResponse = {
  id: string;
  createdAt: Date;
  sessionDate: Date;
  sessionNumber?: number | null;
  topic?: string | null;
  privateNotes: string | null;
  sharedSummary: string | null;
};

export type SessionResponsePublic = {
  id: string;
  sessionDate: Date;
  sessionNumber?: number | null;
  topic?: string | null;
  sharedSummary: string | null;
  somaticAnchor: string | null;
  resources: { id: string; name: string; type: string; s3Key: string }[];
};

// ============================================
// TIMEZONE UTILITIES
// ============================================
function calculateNextSessionDate(
  scheduleDay: number,
  scheduleTime: string,
  scheduleTimezone: string,
  startDate: Date = new Date()
): Date {
  // Parse time (format: "14:00")
  const [hours, minutes] = scheduleTime.split(":").map(Number);

  // Get today's date in the user's timezone
  const zonedNow = toZonedTime(startDate, scheduleTimezone);
  const todayDayOfWeek = zonedNow.getDay();

  // Calculate days until the target day
  let daysUntil = scheduleDay - todayDayOfWeek;
  if (daysUntil <= 0) {
    daysUntil += 7;
  }

  // Create the next session date in the user's timezone
  let nextDate = new Date(zonedNow);
  nextDate.setDate(nextDate.getDate() + daysUntil);
  nextDate.setHours(hours, minutes, 0, 0);

  // Convert back to UTC
  const utcDate = fromZonedTime(nextDate, scheduleTimezone);
  return utcDate;
}

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

export const createSession: CreateSession<CreateSessionInput, SessionResponse> =
  async (rawArgs, context) => {
    const { clientId, sessionDate, privateNotes, sharedSummary } =
      ensureArgsSchemaOrThrowHttpError(createSessionSchema, rawArgs);

    if (!context.user) {
      throw new HttpError(401, "You must be logged in to create sessions");
    }

    // Ensure user is a COACH
    if (context.user.role !== "COACH") {
      throw new HttpError(403, "Only coaches can create sessions");
    }

    // Get the coach profile
    const coachProfile = await context.entities.CoachProfile.findUnique({
      where: { userId: context.user.id },
    });

    if (!coachProfile) {
      throw new HttpError(404, "Coach profile not found");
    }

    // Verify that the client belongs to this coach
    const clientProfile = await context.entities.ClientProfile.findUnique({
      where: { id: clientId },
    });

    if (!clientProfile || clientProfile.coachId !== coachProfile.id) {
      throw new HttpError(403, "You do not have access to this client");
    }

    // Create the session
    const session = await context.entities.CoachSession.create({
      data: {
        sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
        privateNotes: privateNotes || null,
        sharedSummary: sharedSummary || null,
        coachId: coachProfile.id,
        clientId: clientId,
      },
    });

    // Update client's lastActivityDate
    await context.entities.ClientProfile.update({
      where: { id: clientId },
      data: { lastActivityDate: new Date() },
    });

    return {
      id: session.id,
      createdAt: session.createdAt,
      sessionDate: session.sessionDate,
      privateNotes: session.privateNotes,
      sharedSummary: session.sharedSummary,
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

export const updateSession: UpdateSession<UpdateSessionInput, SessionResponse> =
  async (rawArgs, context) => {
    const { sessionId, sessionDate, privateNotes, sharedSummary } =
      ensureArgsSchemaOrThrowHttpError(updateSessionSchema, rawArgs);

    if (!context.user) {
      throw new HttpError(401, "You must be logged in to update sessions");
    }

    // Ensure user is a COACH
    if (context.user.role !== "COACH") {
      throw new HttpError(403, "Only coaches can update sessions");
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

    // Update the session
    const updatedSession = await context.entities.CoachSession.update({
      where: { id: sessionId },
      data: {
        ...(sessionDate && { sessionDate: new Date(sessionDate) }),
        ...(privateNotes !== undefined && { privateNotes }),
        ...(sharedSummary !== undefined && { sharedSummary }),
      },
    });

    return {
      id: updatedSession.id,
      createdAt: updatedSession.createdAt,
      sessionDate: updatedSession.sessionDate,
      privateNotes: updatedSession.privateNotes,
      sharedSummary: updatedSession.sharedSummary,
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
  context
) => {
  const { sessionId } = ensureArgsSchemaOrThrowHttpError(
    deleteSessionSchema,
    rawArgs
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

  // Delete the session
  await context.entities.CoachSession.delete({
    where: { id: sessionId },
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
    rawArgs
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
      where: { userId: context.user.id },
    });

    if (!clientProfile) {
      return { sessions: [], total: 0, page, limit, totalPages: 0 };
    }

    // Verify that the requested client matches the authenticated user
    if (args.clientId !== clientProfile.id) {
      throw new HttpError(403, "You do not have access to this client's sessions");
    }

    // Get total count
    const total = await context.entities.CoachSession.count({
      where: { clientId: args.clientId },
    });

    // Get paginated sessions
    const sessions = await context.entities.CoachSession.findMany({
      where: { clientId: args.clientId },
      orderBy: { sessionDate: "desc" },
      skip,
      take: limit,
      include: { resources: true },
    });

    // Return ONLY public fields for CLIENT (including harmony features)
    const publicSessions: SessionResponsePublic[] = sessions.map((session) => ({
      id: session.id,
      sessionDate: session.sessionDate,
      sharedSummary: session.sharedSummary,
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
      where: { userId: context.user.id },
      include: {
        clients: {
          where: { id: args.clientId },
        },
      },
    });

    if (!coachProfile) {
      throw new HttpError(404, "Coach profile not found");
    }

    const client = coachProfile.clients[0];
    if (!client) {
      throw new HttpError(403, "You do not have access to this client's sessions");
    }

    // Get total count
    const total = await context.entities.CoachSession.count({
      where: { clientId: args.clientId },
    });

    // Get paginated sessions
    const sessions = await context.entities.CoachSession.findMany({
      where: { clientId: args.clientId },
      orderBy: { sessionDate: "desc" },
      skip,
      take: limit,
      include: { resources: true },
    });

    const fullSessions: SessionResponse[] = sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      sessionDate: session.sessionDate,
      privateNotes: session.privateNotes,
      sharedSummary: session.sharedSummary,
    })) as any; // Cast to maintain backward compatibility

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
    rawArgs
  );

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to view sessions");
  }

  // CLIENT users can only view their own sessions
  if (context.user.role === "CLIENT") {
    const clientProfile = await context.entities.ClientProfile.findUnique({
      where: { userId: context.user.id },
    });

    if (!clientProfile) {
      return [];
    }

    // If a clientId is provided, verify it matches the authenticated user
    if (args.clientId && args.clientId !== clientProfile.id) {
      throw new HttpError(403, "You do not have access to this client's sessions");
    }

    const sessions = await context.entities.CoachSession.findMany({
      where: { clientId: clientProfile.id },
      orderBy: { sessionDate: "desc" },
      take: 3,
      include: { resources: true },
    });

    return sessions.map((session) => ({
      id: session.id,
      sessionDate: session.sessionDate,
      sharedSummary: session.sharedSummary,
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
      where: { userId: context.user.id },
      include: {
        clients: {
          where: { id: args.clientId },
        },
      },
    });

    if (!coachProfile || coachProfile.clients.length === 0) {
      throw new HttpError(403, "You do not have access to this client's sessions");
    }

    const sessions = await context.entities.CoachSession.findMany({
      where: { clientId: args.clientId },
      orderBy: { sessionDate: "desc" },
      take: 3,
      include: { resources: true },
    });

    return sessions.map((session) => ({
      id: session.id,
      sessionDate: session.sessionDate,
      sharedSummary: session.sharedSummary,
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
  somaticAnchor: z.enum(["HEAD", "THROAT", "CHEST", "SOLAR_PLEXUS", "BELLY", "PELVIS", "ARMS", "LEGS", "FULL_BODY"]).optional().nullable(),
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

export const logSession: LogSession<LogSessionInput, LogSessionResponse> = async (rawArgs, context) => {
  const args = ensureArgsSchemaOrThrowHttpError(logSessionSchema, rawArgs);
  const { clientId, sessionDate, topic, privateNotes, sharedSummary, somaticAnchor, resourceIds } = args;

  // ============================================
  // AUTHENTICATION & AUTHORIZATION
  // ============================================
  if (!context.user) {
    throw new HttpError(401, "You must be logged in to log sessions");
  }

  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can log sessions");
  }

  // Get the coach profile
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // ============================================
  // VALIDATE CLIENT OWNERSHIP
  // ============================================
  const clientProfile = await context.entities.ClientProfile.findUnique({
    where: { id: clientId },
  });

  if (!clientProfile || clientProfile.coachId !== coachProfile.id) {
    throw new HttpError(403, "You do not have access to this client");
  }

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
      throw new HttpError(403, "One or more selected resources are not available or do not belong to you");
    }
  }

  // ============================================
  // CALCULATE SESSION NUMBER (auto-increment)
  // ============================================
  const lastSession = await context.entities.CoachSession.findFirst({
    where: { clientId: clientId },
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
      privateNotes: privateNotes || null,
      sharedSummary: sharedSummary || null,
      somaticAnchor: somaticAnchor || null,
      coachId: coachProfile.id,
      clientId: clientId,
      // Attach resources
      ...(resourceIds && resourceIds.length > 0 && {
        resources: {
          connect: resourceIds.map(id => ({ id })),
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

  return {
    id: session.id,
    sessionNumber: session.sessionNumber,
    sessionDate: session.sessionDate,
    topic: session.topic,
    privateNotes: session.privateNotes,
    sharedSummary: session.sharedSummary,
    somaticAnchor: session.somaticAnchor,
  };
};
