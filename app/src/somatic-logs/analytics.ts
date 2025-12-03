import type { ComputeSomaticAnalyticsJob } from "wasp/server/jobs";

// ============================================
// TYPE DEFINITIONS
// ============================================
export interface BodyZoneStats {
  zone: string;
  count: number;
  avgIntensity: number;
}

export interface SensationStats {
  sensation: string;
  count: number;
  avgIntensity: number;
}

export interface IntensityTrendPoint {
  weekStart: string; // ISO date string
  avgIntensity: number;
}

export interface ClientAnalyticsResult {
  topBodyZones: BodyZoneStats[];
  topSensations: SensationStats[];
  intensityTrendOverTime: IntensityTrendPoint[];
  totalLogsInPeriod: number;
}

// ============================================
// HELPER: Get date range for period
// ============================================
function getDateRange(period: "30d" | "90d" | "365d") {
  const endDate = new Date();
  const startDate = new Date();

  if (period === "30d") {
    startDate.setDate(endDate.getDate() - 30);
  } else if (period === "90d") {
    startDate.setDate(endDate.getDate() - 90);
  } else if (period === "365d") {
    startDate.setFullYear(endDate.getFullYear() - 1);
  }

  // Normalize to start of day (UTC)
  startDate.setUTCHours(0, 0, 0, 0);
  endDate.setUTCHours(23, 59, 59, 999);

  return { startDate, endDate };
}

// ============================================
// HELPER: Get start of week (Monday) for a date
// ============================================
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ============================================
// MAIN: Compute analytics for a single client
// ============================================
export async function computeClientAnalytics(
  entities: any,
  clientId: string,
  period: "30d" | "90d" | "365d",
): Promise<ClientAnalyticsResult> {
  const { startDate, endDate } = getDateRange(period);

  // Fetch all somatic logs for this client in the period
  const logs = await entities.somaticLog.findMany({
    where: {
      clientId,
      sharedWithCoach: true,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      bodyZone: true,
      sensation: true,
      intensity: true,
      createdAt: true,
    },
  });

  // ============================================
  // COMPUTE: Top body zones
  // ============================================
  const zoneMap = new Map<string, { count: number; totalIntensity: number }>();
  const sensationMap = new Map<
    string,
    { count: number; totalIntensity: number }
  >();
  const trendMap = new Map<string, { intensities: number[]; count: number }>();

  for (const log of logs) {
    // Accumulate zone stats
    const zoneKey = log.bodyZone;
    if (!zoneMap.has(zoneKey)) {
      zoneMap.set(zoneKey, { count: 0, totalIntensity: 0 });
    }
    const zoneStats = zoneMap.get(zoneKey)!;
    zoneStats.count += 1;
    zoneStats.totalIntensity += log.intensity;

    // Accumulate sensation stats
    const sensationKey = log.sensation;
    if (!sensationMap.has(sensationKey)) {
      sensationMap.set(sensationKey, { count: 0, totalIntensity: 0 });
    }
    const sensationStats = sensationMap.get(sensationKey)!;
    sensationStats.count += 1;
    sensationStats.totalIntensity += log.intensity;

    // Accumulate weekly trend
    const weekStart = getWeekStart(log.createdAt);
    const weekKey = weekStart.toISOString().split("T")[0];
    if (!trendMap.has(weekKey)) {
      trendMap.set(weekKey, { intensities: [], count: 0 });
    }
    const trendStats = trendMap.get(weekKey)!;
    trendStats.intensities.push(log.intensity);
    trendStats.count += 1;
  }

  // Convert maps to sorted arrays
  const topBodyZones: BodyZoneStats[] = Array.from(zoneMap.entries())
    .map(([zone, stats]) => ({
      zone,
      count: stats.count,
      avgIntensity: parseFloat((stats.totalIntensity / stats.count).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5

  const topSensations: SensationStats[] = Array.from(sensationMap.entries())
    .map(([sensation, stats]) => ({
      sensation,
      count: stats.count,
      avgIntensity: parseFloat((stats.totalIntensity / stats.count).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5

  const intensityTrendOverTime: IntensityTrendPoint[] = Array.from(
    trendMap.entries(),
  )
    .map(([weekStart, stats]) => ({
      weekStart,
      avgIntensity: parseFloat(
        (stats.intensities.reduce((a, b) => a + b, 0) / stats.count).toFixed(2),
      ),
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart)); // Chronological order

  return {
    topBodyZones,
    topSensations,
    intensityTrendOverTime,
    totalLogsInPeriod: logs.length,
  };
}

// ============================================
// CRON JOB: Compute analytics for all active clients
// ============================================
export const computeAllClientAnalytics: ComputeSomaticAnalyticsJob<
  never,
  { success: boolean; message: string }
> = async (_args, context) => {
  try {
    // Find all clients with activity in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeClients = await context.entities.ClientProfile.findMany({
      where: {
        lastActivityDate: {
          gte: sevenDaysAgo,
        },
      },
      select: { id: true },
    });

    console.log(
      `[Analytics] Computing analytics for ${activeClients.length} active clients`,
    );

    let successCount = 0;
    let errorCount = 0;

    // Compute analytics for each period (30d, 90d, 365d)
    const periods = ["30d", "90d", "365d"] as const;

    for (const client of activeClients) {
      for (const period of periods) {
        try {
          const analytics = await computeClientAnalytics(
            context.entities,
            client.id,
            period,
          );

          const { startDate, endDate } = getDateRange(period);

          // Upsert the analytics record
          await context.entities.SomaticLogAnalytics.upsert({
            where: {
              clientId_period: {
                clientId: client.id,
                period,
              },
            },
            create: {
              clientId: client.id,
              period,
              computedAt: new Date(),
              periodStartDate: startDate,
              periodEndDate: endDate,
              topBodyZones: analytics.topBodyZones as any,
              topSensations: analytics.topSensations as any,
              intensityTrendOverTime: analytics.intensityTrendOverTime as any,
              totalLogsInPeriod: analytics.totalLogsInPeriod,
            },
            update: {
              computedAt: new Date(),
              periodStartDate: startDate,
              periodEndDate: endDate,
              topBodyZones: analytics.topBodyZones as any,
              topSensations: analytics.topSensations as any,
              intensityTrendOverTime: analytics.intensityTrendOverTime as any,
              totalLogsInPeriod: analytics.totalLogsInPeriod,
            },
          });

          successCount += 1;
        } catch (error) {
          console.error(
            `[Analytics] Error computing analytics for client ${client.id}, period ${period}:`,
            error,
          );
          errorCount += 1;
        }
      }
    }

    const message = `[Analytics] Completed: ${successCount} successful, ${errorCount} errors`;
    console.log(message);

    return {
      success: errorCount === 0,
      message,
    };
  } catch (error) {
    console.error("[Analytics] Cron job failed:", error);
    return {
      success: false,
      message: `Cron job failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
};
