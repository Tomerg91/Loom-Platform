import { HttpError } from "wasp/server";
import type {
  CreateSomaticLog,
  GetSomaticLogs,
  UpdateSomaticLogVisibility,
  GetClientAnalytics,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  computeClientAnalytics,
  type ClientAnalyticsResult,
} from "./analytics";
import { isAdmin, isCoach, requireAuth, requireRole } from "../server/rbac";

// BodyZone type definition matching Prisma schema
type BodyZone =
  | "HEAD"
  | "THROAT"
  | "CHEST"
  | "SOLAR_PLEXUS"
  | "BELLY"
  | "PELVIS"
  | "ARMS"
  | "LEGS"
  | "FULL_BODY";

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
  try {
    // ============================================
    // STEP 1: VALIDATE INPUT
    // ============================================
    const { bodyZone, sensation, intensity, note, sharedWithCoach } =
      ensureArgsSchemaOrThrowHttpError(createSomaticLogSchema, rawArgs);

    // ============================================
    // STEP 2: AUTHENTICATE & AUTHORIZE
    // ============================================
    const clientContext = requireRole(context, ["CLIENT"], {
      unauthenticatedMessage: "You must be logged in to create somatic logs",
      unauthorizedMessage: "Only clients can create somatic logs",
    });

    // ============================================
    // STEP 3: GET OR CREATE CLIENT PROFILE
    // ============================================
    let clientProfile = await clientContext.entities.ClientProfile.findUnique({
      where: { userId: clientContext.user.id },
    });

    // If profile doesn't exist, attempt to create it
    // This handles cases where a user is created but profile isn't auto-created
    if (!clientProfile) {
      console.warn(
        `[SomaticLog] Creating missing client profile for user ${clientContext.user.id}`,
      );

      try {
        clientProfile = await clientContext.entities.ClientProfile.create({
          data: {
            userId: clientContext.user.id,
          },
        });
      } catch (profileCreateError) {
        console.error(
          `[SomaticLog] Failed to create client profile for user ${clientContext.user.id}:`,
          profileCreateError,
        );

        throw new HttpError(
          500,
          "Failed to initialize client profile. Please contact support if this persists.",
        );
      }
    }

    // ============================================
    // STEP 4: CREATE SOMATIC LOG
    // ============================================
    try {
      await clientContext.entities.SomaticLog.create({
        data: {
          bodyZone,
          sensation,
          intensity,
          note: note || null,
          sharedWithCoach,
          clientId: clientProfile.id,
        },
      });
    } catch (logCreateError) {
      console.error(
        `[SomaticLog] Failed to create log for client ${clientProfile.id}:`,
        logCreateError,
      );

      throw new HttpError(500, "Failed to save sensation. Please try again.");
    }

    // ============================================
    // STEP 5: UPDATE CLIENT ACTIVITY
    // ============================================
    try {
      await clientContext.entities.ClientProfile.update({
        where: { id: clientProfile.id },
        data: { lastActivityDate: new Date() },
      });
    } catch (activityError) {
      // Log error but don't fail the request
      // Activity tracking is non-critical
      console.warn(
        `[SomaticLog] Failed to update activity date for client ${clientProfile.id}:`,
        activityError,
      );
    }
  } catch (error) {
    // Re-throw known errors
    if (error instanceof HttpError) {
      throw error;
    }

    // Log unexpected errors
    console.error("[SomaticLog] Unexpected error in createSomaticLog:", error);

    // Return generic error to client
    throw new HttpError(
      500,
      "An unexpected error occurred while logging your sensation. Please try again.",
    );
  }
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
  try {
    const args = ensureArgsSchemaOrThrowHttpError(
      getSomaticLogsSchema,
      rawArgs,
    );
    const authenticatedContext = requireAuth(
      context,
      "You must be logged in to view somatic logs",
    );

    // Build filter conditions with type safety
    const whereConditions: any = {};
    if (args.startDate) {
      whereConditions.createdAt = {
        ...whereConditions.createdAt,
        gte: args.startDate,
      };
    }
    if (args.endDate) {
      whereConditions.createdAt = {
        ...whereConditions.createdAt,
        lte: args.endDate,
      };
    }
    if (args.bodyZones && args.bodyZones.length > 0) {
      whereConditions.bodyZone = { in: args.bodyZones };
    }
    if (args.minIntensity !== undefined) {
      whereConditions.intensity = {
        ...whereConditions.intensity,
        gte: args.minIntensity,
      };
    }
    if (args.maxIntensity !== undefined) {
      whereConditions.intensity = {
        ...whereConditions.intensity,
        lte: args.maxIntensity,
      };
    }

    // If user is CLIENT: return their own logs
    if (authenticatedContext.user.role === "CLIENT") {
      let clientProfile =
        await authenticatedContext.entities.ClientProfile.findUnique({
          where: { userId: authenticatedContext.user.id },
          include: {
            somaticLogs: {
              where: whereConditions,
              orderBy: { createdAt: "desc" },
            },
          },
        });

      // If profile doesn't exist, create it gracefully
      if (!clientProfile) {
        console.warn(
          `[GetSomaticLogs] Creating missing client profile for user ${authenticatedContext.user.id}`,
        );

        try {
          clientProfile =
            await authenticatedContext.entities.ClientProfile.create({
              data: {
                userId: authenticatedContext.user.id,
              },
              include: {
                somaticLogs: {
                  where: whereConditions,
                  orderBy: { createdAt: "desc" },
                },
              },
            });
        } catch (error) {
          console.error(
            `[GetSomaticLogs] Failed to create client profile:`,
            error,
          );
          // Return empty array instead of failing
          return [];
        }
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
    if (authenticatedContext.user.role === "COACH") {
      if (!args.clientId) {
        throw new HttpError(
          400,
          "Client ID is required for coaches to view logs",
        );
      }

      try {
        const coachProfile =
          await authenticatedContext.entities.CoachProfile.findUnique({
            where: { userId: authenticatedContext.user.id },
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
          console.warn(
            `[GetSomaticLogs] Coach profile not found for user ${authenticatedContext.user.id}`,
          );
          throw new HttpError(
            404,
            "Coach profile not found. Please contact support.",
          );
        }

        const client = coachProfile.clients[0];
        if (!client) {
          console.warn(
            `[GetSomaticLogs] Coach ${authenticatedContext.user.id} attempted unauthorized access to client ${args.clientId}`,
          );
          throw new HttpError(
            403,
            "You do not have access to this client's logs",
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
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }

        console.error("[GetSomaticLogs] Unexpected error:", error);
        throw new HttpError(500, "Failed to fetch logs. Please try again.");
      }
    }

    // ADMIN can view any client's logs (if needed in the future)
    throw new HttpError(403, "Invalid user role for this operation");
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    console.error("[GetSomaticLogs] Unexpected error:", error);
    throw new HttpError(500, "Failed to fetch logs. Please try again.");
  }
};

// ============================================
// UPDATE SOMATIC LOG VISIBILITY
// ============================================
const updateSomaticLogVisibilitySchema = z.object({
  logId: z.string().min(1, "Log ID is required"),
  sharedWithCoach: z.boolean(),
});

type UpdateSomaticLogVisibilityInput = z.infer<
  typeof updateSomaticLogVisibilitySchema
>;

export const updateSomaticLogVisibility: UpdateSomaticLogVisibility<
  UpdateSomaticLogVisibilityInput,
  SomaticLogResponse
> = async (rawArgs, context) => {
  try {
    const { logId, sharedWithCoach } = ensureArgsSchemaOrThrowHttpError(
      updateSomaticLogVisibilitySchema,
      rawArgs,
    );

    if (!context.user) {
      throw new HttpError(
        401,
        "You must be logged in to update log visibility",
      );
    }

    if (context.user.role !== "CLIENT") {
      throw new HttpError(403, "Only clients can update log visibility");
    }

    // Get client profile to ensure they own this log
    let clientProfile = await context.entities.ClientProfile.findUnique({
      where: { userId: context.user.id },
    });

    // If profile doesn't exist, create it
    if (!clientProfile) {
      console.warn(
        `[UpdateLogVisibility] Creating missing client profile for user ${context.user.id}`,
      );

      try {
        clientProfile = await context.entities.ClientProfile.create({
          data: {
            userId: context.user.id,
          },
        });
      } catch (error) {
        console.error(
          `[UpdateLogVisibility] Failed to create client profile:`,
          error,
        );
        throw new HttpError(
          500,
          "Failed to initialize client profile. Please contact support.",
        );
      }
    }

    // Verify the log exists and belongs to this client
    const log = await context.entities.SomaticLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new HttpError(404, "Sensation log not found");
    }

    if (log.clientId !== clientProfile.id) {
      console.warn(
        `[UpdateLogVisibility] Client ${context.user.id} attempted unauthorized access to log ${logId}`,
      );
      throw new HttpError(403, "You do not have permission to update this log");
    }

    // Update the visibility
    try {
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
    } catch (updateError) {
      console.error(
        `[UpdateLogVisibility] Failed to update log ${logId}:`,
        updateError,
      );
      throw new HttpError(
        500,
        "Failed to update log visibility. Please try again.",
      );
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    console.error("[UpdateLogVisibility] Unexpected error:", error);
    throw new HttpError(500, "An unexpected error occurred. Please try again.");
  }
};

// ============================================
// GET CLIENT ANALYTICS
// ============================================
const getClientAnalyticsSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  period: z.enum(["30d", "90d", "365d"]),
});

type GetClientAnalyticsInput = z.infer<typeof getClientAnalyticsSchema>;

export const getClientAnalytics: GetClientAnalytics<
  GetClientAnalyticsInput,
  any
> = async (rawArgs, context) => {
  const { clientId, period } = ensureArgsSchemaOrThrowHttpError(
    getClientAnalyticsSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to view analytics");
  }

  // Get the client profile
  const clientProfile = await context.entities.ClientProfile.findUnique({
    where: { id: clientId },
  });

  if (!clientProfile) {
    throw new HttpError(404, "Client not found");
  }

  // Authorization: coaches can view their clients' analytics, admins can view any
  if (context.user.role === "COACH") {
    // Check if this coach is the client's coach
    if (!clientProfile.coachId) {
      throw new HttpError(403, "Client has no assigned coach");
    }
    const coach = await context.entities.CoachProfile.findUnique({
      where: { id: clientProfile.coachId },
    });
    if (!coach || coach.userId !== context.user.id) {
      throw new HttpError(
        403,
        "You do not have permission to view this client's analytics",
      );
    }
  } else if (context.user.role === "CLIENT") {
    throw new HttpError(403, "Clients cannot view analytics data");
  } else if (context.user.role !== "ADMIN") {
    throw new HttpError(403, "Invalid user role");
  }

  // Try to get cached analytics from SomaticLogAnalytics table
  const cached = await context.entities.SomaticLogAnalytics.findUnique({
    where: {
      clientId_period: {
        clientId,
        period,
      },
    },
  });

  // If cache exists and is fresh (less than 1 hour old), return it
  if (cached) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (cached.computedAt > oneHourAgo) {
      return {
        topBodyZones: cached.topBodyZones as any[],
        topSensations: cached.topSensations as any[],
        intensityTrendOverTime: cached.intensityTrendOverTime as any[],
        totalLogsInPeriod: cached.totalLogsInPeriod,
      };
    }
  }

  // Cache is stale or missing, compute on-demand
  const analytics = await computeClientAnalytics(
    context.entities,
    clientId,
    period,
  );

  return analytics;
};
