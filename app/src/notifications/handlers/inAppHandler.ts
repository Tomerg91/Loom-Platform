/**
 * In-App Notification Handler
 *
 * Subscribes to notification events and creates in-app notifications in the database
 */

import type { PrismaClient } from "wasp/server";
import {
  notificationEmitter,
  NotificationEventType,
  type EventHandler,
} from "../eventEmitter";

// ============================================
// IN-APP HANDLER CLASS
// ============================================

export class InAppNotificationHandler {
  constructor(private prisma: PrismaClient) {}

  /**
   * Register all in-app handlers
   */
  register(): void {
    notificationEmitter.subscribe(
      NotificationEventType.SESSION_REMINDER,
      this.handleSessionReminder.bind(this),
    );

    notificationEmitter.subscribe(
      NotificationEventType.SESSION_SUMMARY_POSTED,
      this.handleSessionSummaryPosted.bind(this),
    );

    notificationEmitter.subscribe(
      NotificationEventType.RESOURCE_SHARED,
      this.handleResourceShared.bind(this),
    );
  }

  /**
   * Handle SESSION_REMINDER event - create in-app notification
   */
  private handleSessionReminder: EventHandler<NotificationEventType.SESSION_REMINDER> =
    async (payload) => {
      try {
        // Get the client's user ID
        const clientProfile = await this.prisma.clientProfile.findUnique({
          where: { id: payload.clientId },
          select: { userId: true, coach: { select: { user: true } } },
        });

        if (!clientProfile?.userId) {
          console.warn(
            `In-app notification: Client ${payload.clientId} has no user account`,
          );
          return;
        }

        // Check in-app notification preference
        const preferences =
          await this.prisma.notificationPreferences.findUnique({
            where: { userId: clientProfile.userId },
          });

        if (preferences && !preferences.inAppSessionReminders) {
          console.log(
            `In-app session reminder disabled for user ${clientProfile.userId}`,
          );
          return;
        }

        // Get coach name for the message
        const coachName =
          clientProfile.coach?.user?.email?.split("@")[0] || "Your Coach";

        // Create the notification
        await this.prisma.notification.create({
          data: {
            userId: clientProfile.userId,
            type: NotificationEventType.SESSION_REMINDER,
            title: "Upcoming Session",
            message: `Your session with ${coachName} is scheduled for tomorrow`,
            metadata: {
              clientId: payload.clientId,
              sessionDate: payload.sessionDate.toISOString(),
              coachName,
            },
          },
        });

        console.log(
          `In-app session reminder created for user ${clientProfile.userId}`,
        );
      } catch (error) {
        console.error("Error creating session reminder notification:", error);
      }
    };

  /**
   * Handle SESSION_SUMMARY_POSTED event - create in-app notification
   */
  private handleSessionSummaryPosted: EventHandler<NotificationEventType.SESSION_SUMMARY_POSTED> =
    async (payload) => {
      try {
        // Get the client's user ID
        const clientProfile = await this.prisma.clientProfile.findUnique({
          where: { id: payload.clientId },
          select: { userId: true, coach: { select: { user: true } } },
        });

        if (!clientProfile?.userId) {
          console.warn(
            `In-app notification: Client ${payload.clientId} has no user account`,
          );
          return;
        }

        // Check in-app notification preference
        const preferences =
          await this.prisma.notificationPreferences.findUnique({
            where: { userId: clientProfile.userId },
          });

        if (preferences && !preferences.inAppSessionSummaries) {
          console.log(
            `In-app session summary disabled for user ${clientProfile.userId}`,
          );
          return;
        }

        // Get coach name for the message
        const coachName =
          clientProfile.coach?.user?.email?.split("@")[0] || "Your Coach";

        // Create the notification
        await this.prisma.notification.create({
          data: {
            userId: clientProfile.userId,
            type: NotificationEventType.SESSION_SUMMARY_POSTED,
            title: "Session Summary",
            message: `${coachName} has posted your session summary`,
            metadata: {
              clientId: payload.clientId,
              sessionId: payload.sessionId,
              topic: payload.topic,
              coachName,
            },
          },
        });

        console.log(
          `In-app session summary created for user ${clientProfile.userId}`,
        );
      } catch (error) {
        console.error("Error creating session summary notification:", error);
      }
    };

  /**
   * Handle RESOURCE_SHARED event - create in-app notification
   */
  private handleResourceShared: EventHandler<NotificationEventType.RESOURCE_SHARED> =
    async (payload) => {
      try {
        // Get the client's user ID
        const clientProfile = await this.prisma.clientProfile.findUnique({
          where: { id: payload.clientId },
          select: { userId: true, coach: { select: { user: true } } },
        });

        if (!clientProfile?.userId) {
          console.warn(
            `In-app notification: Client ${payload.clientId} has no user account`,
          );
          return;
        }

        // Check in-app notification preference
        const preferences =
          await this.prisma.notificationPreferences.findUnique({
            where: { userId: clientProfile.userId },
          });

        if (preferences && !preferences.inAppResourceShared) {
          console.log(
            `In-app resource shared disabled for user ${clientProfile.userId}`,
          );
          return;
        }

        // Get coach name for the message
        const coachName =
          clientProfile.coach?.user?.email?.split("@")[0] || "Your Coach";

        // Create the notification
        await this.prisma.notification.create({
          data: {
            userId: clientProfile.userId,
            type: NotificationEventType.RESOURCE_SHARED,
            title: "New Resource",
            message: `${coachName} shared "${payload.resourceName}" with you`,
            metadata: {
              clientId: payload.clientId,
              resourceId: payload.resourceId,
              resourceName: payload.resourceName,
              coachName,
            },
          },
        });

        console.log(
          `In-app resource shared created for user ${clientProfile.userId}`,
        );
      } catch (error) {
        console.error("Error creating resource shared notification:", error);
      }
    };
}
