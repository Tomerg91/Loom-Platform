import { HttpError } from "wasp/server";
import type { GetClientInsights } from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { subDays, subMonths } from "date-fns";

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
// GET CLIENT INSIGHTS
// ============================================

const getClientInsightsSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  timeRange: z.enum(["30days", "3months", "allTime"]),
});

type GetClientInsightsInput = z.infer<typeof getClientInsightsSchema>;

type SensationData = {
  sensation: string;
  count: number;
  percentage: number;
};

type BodyZoneActivityData = {
  bodyZone: BodyZone;
  count: number;
  percentage: number;
};

type InsufficientDataResponse = {
  hasInsufficientData: true;
  minLogsRequired: number;
  totalLogs: number;
};

type ClientInsightsData = {
  hasInsufficientData: false;
  topSensations: SensationData[];
  bodyZoneActivity: BodyZoneActivityData[];
  averageIntensity: number;
  totalLogs: number;
  timeRange: string;
};

type ClientInsightsResponse = InsufficientDataResponse | ClientInsightsData;

/**
 * Get insights for a specific client.
 * Only accessible to the coach who owns the client.
 * Requires minimum 5 somatic logs to generate insights.
 */
export const getClientInsights: GetClientInsights<
  GetClientInsightsInput,
  ClientInsightsResponse
> = async (rawArgs, context) => {
  // Validate input
  const args = ensureArgsSchemaOrThrowHttpError(
    getClientInsightsSchema,
    rawArgs,
  );

  // ============================================
  // AUTHENTICATION & AUTHORIZATION
  // ============================================

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to view insights");
  }

  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can view client insights");
  }

  // Get coach profile
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // Get client profile and verify coach owns client
  const clientProfile = await context.entities.ClientProfile.findUnique({
    where: { id: args.clientId },
  });

  if (!clientProfile) {
    throw new HttpError(404, "Client not found");
  }

  if (clientProfile.coachId !== coachProfile.id) {
    throw new HttpError(
      403,
      "You do not have access to this client's insights",
    );
  }

  // ============================================
  // TIME RANGE FILTERING
  // ============================================

  const getDateFilter = (timeRange: string): { gte: Date } | undefined => {
    const now = new Date();
    switch (timeRange) {
      case "30days":
        return { gte: subDays(now, 30) };
      case "3months":
        return { gte: subMonths(now, 3) };
      case "allTime":
        return undefined;
      default:
        return undefined;
    }
  };

  const dateFilter = getDateFilter(args.timeRange);

  // ============================================
  // COUNT TOTAL LOGS
  // ============================================

  const whereClause = {
    clientId: args.clientId,
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    sharedWithCoach: true, // Only consider logs shared with coach
  };

  const totalLogs = await context.entities.SomaticLog.count({
    where: whereClause,
  });

  // ============================================
  // EARLY RETURN FOR INSUFFICIENT DATA
  // ============================================

  const minLogsRequired = 5;
  if (totalLogs < minLogsRequired) {
    return {
      hasInsufficientData: true,
      minLogsRequired,
      totalLogs,
    };
  }

  // ============================================
  // GET SENSATION FREQUENCY AGGREGATION
  // ============================================

  const sensationAggregation = await context.entities.SomaticLog.groupBy({
    by: ["sensation"],
    where: whereClause,
    _count: {
      sensation: true,
    },
    orderBy: {
      _count: {
        sensation: "desc",
      },
    },
    take: 10, // Top 10 sensations
  });

  const topSensations: SensationData[] = sensationAggregation.map((item) => ({
    sensation: item.sensation,
    count: item._count.sensation,
    percentage: Math.round((item._count.sensation / totalLogs) * 100),
  }));

  // ============================================
  // GET BODY ZONE FREQUENCY AGGREGATION
  // ============================================

  const bodyZoneAggregation = await context.entities.SomaticLog.groupBy({
    by: ["bodyZone"],
    where: whereClause,
    _count: {
      bodyZone: true,
    },
    orderBy: {
      _count: {
        bodyZone: "desc",
      },
    },
  });

  const bodyZoneActivity: BodyZoneActivityData[] = bodyZoneAggregation.map(
    (item) => ({
      bodyZone: item.bodyZone as BodyZone,
      count: item._count.bodyZone,
      percentage: Math.round((item._count.bodyZone / totalLogs) * 100),
    }),
  );

  // ============================================
  // GET AVERAGE INTENSITY
  // ============================================

  const intensityAggregation = await context.entities.SomaticLog.aggregate({
    where: whereClause,
    _avg: {
      intensity: true,
    },
  });

  const averageIntensity =
    Math.round((intensityAggregation._avg.intensity || 0) * 10) / 10;

  // ============================================
  // RETURN INSIGHTS DATA
  // ============================================

  return {
    hasInsufficientData: false,
    topSensations,
    bodyZoneActivity,
    averageIntensity,
    totalLogs,
    timeRange: args.timeRange,
  };
};
