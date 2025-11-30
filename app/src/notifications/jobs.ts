/**
 * Notification Background Jobs
 *
 * Cron jobs for sending scheduled notifications
 */

import type { PrismaClient } from "wasp/server";
import { notificationEmitter, NotificationEventType } from "./eventEmitter";

// ============================================
// SESSION REMINDERS JOB
// ============================================

/**
 * Checks for upcoming sessions (24 hours) and emits reminder events
 * Scheduled: Daily at 9 AM
 */
export async function checkUpcomingSessionsJob(
  args: Record<string, never>,
  context: { entities: PrismaClient }
): Promise<void> {
  try {
    console.log("[Job] Starting session reminders job...");

    // Calculate time window: 24-48 hours from now (for 24-hour reminder)
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

    // Find clients with sessions scheduled for tomorrow
    const clientsWithUpcomingSessions =
      await context.entities.clientProfile.findMany({
        where: {
          AND: [
            { nextSessionDate: { gte: tomorrow } },
            { nextSessionDate: { lt: tomorrowEnd } },
            { userId: { not: null } }, // Only registered clients
          ],
        },
        include: {
          user: {
            include: { notificationPreferences: true },
          },
        },
      });

    console.log(
      `[Job] Found ${clientsWithUpcomingSessions.length} clients with upcoming sessions`
    );

    // Emit reminder event for each client
    for (const clientProfile of clientsWithUpcomingSessions) {
      if (clientProfile.nextSessionDate) {
        try {
          // Get coach name if coach is assigned
          let coachName = "Your Coach";
          if (clientProfile.coachId) {
            const coach = await context.entities.coachProfile.findUnique({
              where: { id: clientProfile.coachId },
              include: { user: true },
            });
            if (coach?.user?.email) {
              coachName = coach.user.email.split("@")[0];
            }
          }

          await notificationEmitter.emit(
            NotificationEventType.SESSION_REMINDER,
            {
              clientId: clientProfile.id,
              sessionDate: clientProfile.nextSessionDate,
              coachName,
            }
          );

          console.log(
            `[Job] Reminder emitted for client ${clientProfile.id}`
          );
        } catch (error) {
          console.error(
            `[Job] Error emitting reminder for client ${clientProfile.id}:`,
            error
          );
        }
      }
    }

    console.log("[Job] Session reminders job completed successfully");
  } catch (error) {
    console.error("[Job] Error in checkUpcomingSessionsJob:", error);
    throw error;
  }
}
