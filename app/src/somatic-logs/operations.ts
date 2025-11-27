import { HttpError } from "wasp/server";
import type {
  CreateSomaticLog,
  GetSomaticLogs,
  UpdateSomaticLogVisibility,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

// BodyZone type definition matching Prisma schema
type BodyZone = "HEAD" | "THROAT" | "CHEST" | "SOLAR_PLEXUS" | "BELLY" | "PELVIS" | "ARMS" | "LEGS" | "FULL_BODY";

// ============================================
// CREATE SOMATIC LOG
// ============================================
const createSomaticLogSchema = z.object({
  bodyZone: z.enum([
    "HEAD",
    "THROAT",
    "CHEST",
    "SOLAR_PLEXUS",
    "BELLY",
    "PELVIS",
    "ARMS",
    "LEGS",
    "FULL_BODY",
  ]),
  sensation: z.string().min(1, "Sensation is required"),
  intensity: z.number().min(1).max(10, "Intensity must be between 1 and 10"),
  note: z.string().optional(),
  sharedWithCoach: z.boolean().optional().default(true),
});

type CreateSomaticLogInput = z.infer<typeof createSomaticLogSchema>;

export const createSomaticLog: CreateSomaticLog<
  CreateSomaticLogInput,
  void
> = async (rawArgs, context) => {
  const { bodyZone, sensation, intensity, note, sharedWithCoach } =
    ensureArgsSchemaOrThrowHttpError(createSomaticLogSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to create somatic logs");
  }

  // Ensure user is a CLIENT
  if (context.user.role !== "CLIENT") {
    throw new HttpError(403, "Only clients can create somatic logs");
  }

  // Get the client profile
  const clientProfile = await context.entities.ClientProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!clientProfile) {
    throw new HttpError(404, "Client profile not found");
  }

  // Create the somatic log
  await context.entities.SomaticLog.create({
    data: {
      bodyZone,
      sensation,
      intensity,
      note: note || null,
      sharedWithCoach,
      clientId: clientProfile.id,
    },
  });

  // Update client's lastActivityDate
  await context.entities.ClientProfile.update({
    where: { id: clientProfile.id },
    data: { lastActivityDate: new Date() },
  });
};

// ============================================
// GET SOMATIC LOGS (with filtering)
// ============================================
const getSomaticLogsSchema = z.object({
  clientId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  bodyZones: z.array(z.string()).optional(),
  minIntensity: z.number().optional(),
  maxIntensity: z.number().optional(),
});

type GetSomaticLogsInput = z.infer<typeof getSomaticLogsSchema>;

type SomaticLogResponse = {
  id: string;
  createdAt: Date;
  bodyZone: BodyZone;
  sensation: string;
  intensity: number;
  note: string | null;
  sharedWithCoach: boolean;
};

export const getSomaticLogs: GetSomaticLogs<
  GetSomaticLogsInput,
  SomaticLogResponse[]
> = async (rawArgs, context) => {
  const args = ensureArgsSchemaOrThrowHttpError(getSomaticLogsSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to view somatic logs");
  }

  // Build filter conditions
  const whereConditions: any = {};
  if (args.startDate) {
    whereConditions.createdAt = { ...whereConditions.createdAt, gte: args.startDate };
  }
  if (args.endDate) {
    whereConditions.createdAt = { ...whereConditions.createdAt, lte: args.endDate };
  }
  if (args.bodyZones && args.bodyZones.length > 0) {
    whereConditions.bodyZone = { in: args.bodyZones };
  }
  if (args.minIntensity !== undefined) {
    whereConditions.intensity = { ...whereConditions.intensity, gte: args.minIntensity };
  }
  if (args.maxIntensity !== undefined) {
    whereConditions.intensity = { ...whereConditions.intensity, lte: args.maxIntensity };
  }

  // If user is CLIENT: return their own logs
  if (context.user.role === "CLIENT") {
    const clientProfile = await context.entities.ClientProfile.findUnique({
      where: { userId: context.user.id },
      include: {
        somaticLogs: {
          where: whereConditions,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!clientProfile) {
      return [];
    }

    return clientProfile.somaticLogs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      bodyZone: log.bodyZone as BodyZone,
      sensation: log.sensation,
      intensity: log.intensity,
      note: log.note,
      sharedWithCoach: log.sharedWithCoach,
    }));
  }

  // If user is COACH: return only shared logs for their clients
  if (context.user.role === "COACH") {
    if (!args.clientId) {
      throw new HttpError(400, "Client ID is required for coaches");
    }

    const coachProfile = await context.entities.CoachProfile.findUnique({
      where: { userId: context.user.id },
      include: {
        clients: {
          where: { id: args.clientId },
          include: {
            somaticLogs: {
              where: {
                ...whereConditions,
                sharedWithCoach: true, // Only show shared logs to coaches
              },
              orderBy: { createdAt: "desc" },
            },
          },
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
        "You do not have access to this client's logs"
      );
    }

    return client.somaticLogs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      bodyZone: log.bodyZone as BodyZone,
      sensation: log.sensation,
      intensity: log.intensity,
      note: log.note,
      sharedWithCoach: log.sharedWithCoach,
    }));
  }

  // ADMIN can view any client's logs (if needed in the future)
  throw new HttpError(403, "Invalid user role");
};

// ============================================
// UPDATE SOMATIC LOG VISIBILITY
// ============================================
const updateSomaticLogVisibilitySchema = z.object({
  logId: z.string().min(1, "Log ID is required"),
  sharedWithCoach: z.boolean(),
});

type UpdateSomaticLogVisibilityInput = z.infer<typeof updateSomaticLogVisibilitySchema>;

export const updateSomaticLogVisibility: UpdateSomaticLogVisibility<
  UpdateSomaticLogVisibilityInput,
  SomaticLogResponse
> = async (rawArgs, context) => {
  const { logId, sharedWithCoach } = ensureArgsSchemaOrThrowHttpError(
    updateSomaticLogVisibilitySchema,
    rawArgs
  );

  if (!context.user) {
    throw new HttpError(401, "You must be logged in");
  }

  if (context.user.role !== "CLIENT") {
    throw new HttpError(403, "Only clients can update log visibility");
  }

  // Get client profile to ensure they own this log
  const clientProfile = await context.entities.ClientProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!clientProfile) {
    throw new HttpError(404, "Client profile not found");
  }

  // Verify the log belongs to this client
  const log = await context.entities.SomaticLog.findUnique({
    where: { id: logId },
  });

  if (!log || log.clientId !== clientProfile.id) {
    throw new HttpError(403, "You do not have permission to update this log");
  }

  // Update the visibility
  const updatedLog = await context.entities.SomaticLog.update({
    where: { id: logId },
    data: { sharedWithCoach },
  });

  return {
    id: updatedLog.id,
    createdAt: updatedLog.createdAt,
    bodyZone: updatedLog.bodyZone as BodyZone,
    sensation: updatedLog.sensation,
    intensity: updatedLog.intensity,
    note: updatedLog.note,
    sharedWithCoach: updatedLog.sharedWithCoach,
  };
};
