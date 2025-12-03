/**
 * Releases any HELD availability slots that have been held for more than 15 minutes
 * This job runs every 15 minutes via PgBoss
 */
export const releaseExpiredHolds = async (_args: void, context: any) => {
  try {
    // Calculate the cutoff time (15 minutes ago)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Find all HELD slots that were updated more than 15 minutes ago
    const expiredHolds = await context.entities.AvailabilitySlot.findMany({
      where: {
        status: "HELD",
        updatedAt: { lt: fifteenMinutesAgo },
      },
    });

    // Release each expired hold
    if (expiredHolds.length > 0) {
      await context.entities.AvailabilitySlot.updateMany({
        where: {
          status: "HELD",
          updatedAt: { lt: fifteenMinutesAgo },
        },
        data: {
          status: "OPEN",
          clientId: null,
        },
      });

      console.log(
        `[Availability Job] Released ${expiredHolds.length} expired holds`,
      );
    }
  } catch (error) {
    // Log with structured data
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[Availability Job] Error releasing expired holds", {
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });

    // Re-throw to let PgBoss handle retry logic
    throw error;
  }
};
