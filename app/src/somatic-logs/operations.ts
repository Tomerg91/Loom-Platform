import { HttpError } from "wasp/server";
import type {
  CreateSomaticLog,
  GetSomaticLogs,
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
});

type CreateSomaticLogInput = z.infer<typeof createSomaticLogSchema>;

export const createSomaticLog: CreateSomaticLog<
  CreateSomaticLogInput,
  void
> = async (rawArgs, context) => {
  const { bodyZone, sensation, intensity, note } =
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
      clientId: clientProfile.id,
    },
  });
};

// ============================================
// GET SOMATIC LOGS
// ============================================
const getSomaticLogsSchema = z.object({
  clientId: z.string().optional(),
});

type GetSomaticLogsInput = z.infer<typeof getSomaticLogsSchema>;

type SomaticLogResponse = {
  id: string;
  createdAt: Date;
  bodyZone: BodyZone;
  sensation: string;
  intensity: number;
  note: string | null;
};

export const getSomaticLogs: GetSomaticLogs<
  GetSomaticLogsInput,
  SomaticLogResponse[]
> = async (rawArgs, context) => {
  const args = ensureArgsSchemaOrThrowHttpError(getSomaticLogsSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to view somatic logs");
  }

  // If user is CLIENT: return their own logs
  if (context.user.role === "CLIENT") {
    const clientProfile = await context.entities.ClientProfile.findUnique({
      where: { userId: context.user.id },
      include: {
        somaticLogs: {
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
      bodyZone: log.bodyZone,
      sensation: log.sensation,
      intensity: log.intensity,
      note: log.note,
    }));
  }

  // If user is COACH: return logs for specific client
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
      bodyZone: log.bodyZone,
      sensation: log.sensation,
      intensity: log.intensity,
      note: log.note,
    }));
  }

  // ADMIN can view any client's logs (if needed in the future)
  throw new HttpError(403, "Invalid user role");
};
