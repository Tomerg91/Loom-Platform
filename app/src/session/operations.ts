import { HttpError } from "wasp/server";
import type {
  CreateSession,
  UpdateSession,
  DeleteSession,
  GetSessionsForClient,
  GetRecentSessionsForClient,
  UpdateClientSchedule,
  LogSession,
  GetUpcomingSessions,
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
    });

    // Return ONLY public fields for CLIENT
    const publicSessions: SessionResponsePublic[] = sessions.map((session) => ({
      id: session.id,
      sessionDate: session.sessionDate,
      sharedSummary: session.sharedSummary,
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
    });

    const fullSessions: SessionResponse[] = sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      sessionDate: session.sessionDate,
      privateNotes: session.privateNotes,
      sharedSummary: session.sharedSummary,
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
    });

    return sessions.map((session) => ({
      id: session.id,
      sessionDate: session.sessionDate,
      sharedSummary: session.sharedSummary,
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
    });

    return sessions.map((session) => ({
      id: session.id,
      sessionDate: session.sessionDate,
      sharedSummary: session.sharedSummary,
    }));
  }

  throw new HttpError(403, "Invalid user role");
};

// ============================================
// UPDATE CLIENT SCHEDULE (Module 10)
// ============================================
const updateClientScheduleSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  scheduleDay: z.number().int().min(0).max(6, "Day must be 0-6"),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),
  scheduleTimezone: z.string().min(1, "Timezone is required"),
  startDate: z.string().or(z.date()).optional(),
});

type UpdateClientScheduleInput = z.infer<typeof updateClientScheduleSchema>;

export type ScheduleResponse = {
  clientId: string;
  scheduleDay: number;
  scheduleTime: string;
  scheduleTimezone: string;
  nextSessionDate: Date;
};

export const updateClientSchedule: UpdateClientSchedule<
  UpdateClientScheduleInput,
  ScheduleResponse
> = async (rawArgs, context) => {
  const {
    clientId,
    scheduleDay,
    scheduleTime,
    scheduleTimezone,
    startDate,
  } = ensureArgsSchemaOrThrowHttpError(updateClientScheduleSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, "You must be logged in");
  }

  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can set client schedules");
  }

  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  const client = await context.entities.ClientProfile.findUnique({
    where: { id: clientId },
  });

  if (!client || client.coachId !== coachProfile.id) {
    throw new HttpError(403, "You do not have access to this client");
  }

  // Calculate the next session date
  const nextSessionDate = calculateNextSessionDate(
    scheduleDay,
    scheduleTime,
    scheduleTimezone,
    startDate ? new Date(startDate) : new Date()
  );

  // Update the client profile
  const updatedClient = await context.entities.ClientProfile.update({
    where: { id: clientId },
    data: {
      scheduleDay,
      scheduleTime,
      scheduleTimezone,
      nextSessionDate,
    },
  });

  return {
    clientId: updatedClient.id,
    scheduleDay: updatedClient.scheduleDay!,
    scheduleTime: updatedClient.scheduleTime!,
    scheduleTimezone: updatedClient.scheduleTimezone!,
    nextSessionDate: updatedClient.nextSessionDate!,
  };
};

// ============================================
// LOG SESSION (Module 10)
// ============================================
const logSessionSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  sessionDate: z.string().or(z.date()),
  topic: z.string().optional().nullable(),
  privateNotes: z.string().optional().nullable(),
  sharedSummary: z.string().optional().nullable(),
});

type LogSessionInput = z.infer<typeof logSessionSchema>;

export type LogSessionResponse = {
  id: string;
  sessionNumber: number;
  sessionDate: Date;
  topic: string | null;
  privateNotes: string | null;
  sharedSummary: string | null;
  nextSessionDate: Date | null;
  dateWarning?: string;
};

export const logSession: LogSession<LogSessionInput, LogSessionResponse> =
  async (rawArgs, context) => {
    const { clientId, sessionDate, topic, privateNotes, sharedSummary } =
      ensureArgsSchemaOrThrowHttpError(logSessionSchema, rawArgs);

    if (!context.user) {
      throw new HttpError(401, "You must be logged in");
    }

    if (context.user.role !== "COACH") {
      throw new HttpError(403, "Only coaches can log sessions");
    }

    const coachProfile = await context.entities.CoachProfile.findUnique({
      where: { userId: context.user.id },
    });

    if (!coachProfile) {
      throw new HttpError(404, "Coach profile not found");
    }

    const client = await context.entities.ClientProfile.findUnique({
      where: { id: clientId },
    });

    if (!client || client.coachId !== coachProfile.id) {
      throw new HttpError(403, "You do not have access to this client");
    }

    // Calculate the next session date (7 days from logged date, preserving time)
    const sessionDateObj = new Date(sessionDate);
    let nextSessionDate: Date | null = null;
    let dateWarning: string | undefined;

    if (client.scheduleTimezone && client.scheduleTime) {
      const [hours, minutes] = client.scheduleTime.split(":").map(Number);

      // Add 7 days to the logged session date
      const nextDateBase = addDays(sessionDateObj, 7);

      // Create the next date with the scheduled time in the user's timezone
      const zonedDate = toZonedTime(nextDateBase, client.scheduleTimezone);
      zonedDate.setHours(hours, minutes, 0, 0);

      // Convert back to UTC
      nextSessionDate = fromZonedTime(zonedDate, client.scheduleTimezone);

      // Check if logged date matches expected schedule
      if (
        client.nextSessionDate &&
        Math.abs(
          sessionDateObj.getTime() - client.nextSessionDate.getTime()
        ) > 24 * 60 * 60 * 1000
      ) {
        dateWarning =
          "Session logged on different date than scheduled. Schedule has been advanced from the logged date.";
      }
    }

    // Increment session count and create session
    const nextSessionNumber = (client.sessionCount || 0) + 1;

    const session = await context.entities.CoachSession.create({
      data: {
        sessionDate: sessionDateObj,
        sessionNumber: nextSessionNumber,
        topic: topic || null,
        privateNotes: privateNotes || null,
        sharedSummary: sharedSummary || null,
        coachId: coachProfile.id,
        clientId: clientId,
      },
    });

    // Update client with new session count and next session date
    const updatedClient = await context.entities.ClientProfile.update({
      where: { id: clientId },
      data: {
        sessionCount: nextSessionNumber,
        ...(nextSessionDate && { nextSessionDate }),
      },
    });

    return {
      id: session.id,
      sessionNumber: session.sessionNumber || nextSessionNumber,
      sessionDate: session.sessionDate,
      topic: session.topic,
      privateNotes: session.privateNotes,
      sharedSummary: session.sharedSummary,
      nextSessionDate: updatedClient.nextSessionDate,
      ...(dateWarning && { dateWarning }),
    };
  };

// ============================================
// GET UPCOMING SESSIONS (Module 10)
// ============================================
const getUpcomingSessionsSchema = z.object({
  limit: z.number().int().positive().default(10).optional(),
});

type GetUpcomingSessionsInput = z.infer<typeof getUpcomingSessionsSchema>;

export type UpcomingSessionResponse = {
  clientId: string;
  clientName: string;
  clientEmail: string;
  nextSessionDate: Date;
  sessionCount: number;
  scheduleDay: number;
  scheduleTime: string;
  scheduleTimezone: string;
};

export const getUpcomingSessions: GetUpcomingSessions<
  GetUpcomingSessionsInput,
  UpcomingSessionResponse[]
> = async (rawArgs, context) => {
  const args = ensureArgsSchemaOrThrowHttpError(
    getUpcomingSessionsSchema,
    rawArgs
  );

  if (!context.user) {
    throw new HttpError(401, "You must be logged in");
  }

  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can view upcoming sessions");
  }

  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
    include: {
      clients: {
        where: {
          nextSessionDate: { not: null },
        },
        orderBy: { nextSessionDate: "asc" },
        take: args.limit || 10,
        include: {
          user: true,
        },
      },
    },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  return coachProfile.clients.map((client) => ({
    clientId: client.id,
    clientName: client.user.username || client.user.email || "Unknown",
    clientEmail: client.user.email || "unknown@example.com",
    nextSessionDate: client.nextSessionDate!,
    sessionCount: client.sessionCount,
    scheduleDay: client.scheduleDay!,
    scheduleTime: client.scheduleTime!,
    scheduleTimezone: client.scheduleTimezone!,
  }));
};
