/**
 * Email Notification Handler
 *
 * Subscribes to notification events and sends emails to users based on their preferences
 */

import { emailSender } from "wasp/server/email";
import type { PrismaClient } from "wasp/server";
import {
  notificationEmitter,
  NotificationEventType,
  type EventHandler,
} from "../eventEmitter";
import { getSessionReminderEmailContent } from "../templates/sessionReminder";
import { getSessionSummaryPostedEmailContent } from "../templates/sessionSummaryPosted";
import { getResourceSharedEmailContent } from "../templates/resourceShared";

// ============================================
// EMAIL HANDLER CLASS
// ============================================

export class EmailNotificationHandler {
  constructor(private prisma: PrismaClient) {}

  /**
   * Register all email handlers
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
   * Handle SESSION_REMINDER event
   */
  private handleSessionReminder: EventHandler<NotificationEventType.SESSION_REMINDER> =
    async (payload) => {
      try {
        // Get client and preferences
        const clientProfile = await this.prisma.clientProfile.findUnique({
          where: { id: payload.clientId },
          include: {
            user: { include: { notificationPreferences: true } },
            coach: { include: { user: true } },
          },
        });

        if (!clientProfile?.user?.email) {
          console.warn(
            `Session reminder: Client ${payload.clientId} has no email`,
          );
          return;
        }

        // Check email preference
        const preferences = clientProfile.user.notificationPreferences;
        if (!preferences?.emailSessionReminders) {
          console.log(
            `Session reminder email disabled for user ${clientProfile.user.id}`,
          );
          return;
        }

        // Get coach name
        const coachName =
          clientProfile.coach?.user?.email?.split("@")[0] || "Your Coach";

        // Format time if available
        let timeString: string | undefined;
        if (clientProfile.scheduleTime && clientProfile.scheduleTimezone) {
          try {
            const { toZonedTime, format: formatTz } = await import(
              "date-fns-tz"
            );
            const zonedDate = toZonedTime(
              payload.sessionDate,
              clientProfile.scheduleTimezone,
            );
            timeString = formatTz(zonedDate, "h:mm a zzz", {
              timeZone: clientProfile.scheduleTimezone,
            });
          } catch (error) {
            console.warn("Error formatting session time:", error);
          }
        }

        // Send email
        const emailContent = getSessionReminderEmailContent({
          clientName: clientProfile.user.username || "Client",
          coachName,
          sessionDate: payload.sessionDate,
          time: timeString,
          appUrl: `${process.env["WASP_WEB_CLIENT_URL"]}/client/sessions`,
        });

        await emailSender.send({
          to: clientProfile.user.email,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
        });

        console.log(
          `Session reminder email sent to ${clientProfile.user.email}`,
        );
      } catch (error) {
        console.error("Error sending session reminder email:", error);
        // Log fallback for development
        if (process.env["NODE_ENV"] === "development") {
          console.log(
            `Session reminder would be sent for client ${payload.clientId} on ${payload.sessionDate}`,
          );
        }
      }
    };

  /**
   * Handle SESSION_SUMMARY_POSTED event
   */
  private handleSessionSummaryPosted: EventHandler<NotificationEventType.SESSION_SUMMARY_POSTED> =
    async (payload) => {
      try {
        // Get client and preferences
        const clientProfile = await this.prisma.clientProfile.findUnique({
          where: { id: payload.clientId },
          include: {
            user: { include: { notificationPreferences: true } },
            coach: { include: { user: true } },
          },
        });

        if (!clientProfile?.user?.email) {
          console.warn(
            `Session summary: Client ${payload.clientId} has no email`,
          );
          return;
        }

        // Check email preference
        const preferences = clientProfile.user.notificationPreferences;
        if (!preferences?.emailSessionSummaries) {
          console.log(
            `Session summary email disabled for user ${clientProfile.user.id}`,
          );
          return;
        }

        // Get session to retrieve session date
        const session = await this.prisma.coachSession.findUnique({
          where: { id: payload.sessionId },
        });

        if (!session) {
          console.warn(
            `Session summary: Session ${payload.sessionId} not found`,
          );
          return;
        }

        // Get coach name
        const coachName =
          clientProfile.coach?.user?.email?.split("@")[0] || "Your Coach";

        // Send email
        const emailContent = getSessionSummaryPostedEmailContent({
          clientName: clientProfile.user.username || "Client",
          coachName,
          sessionDate: session.sessionDate,
          topic: payload.topic,
          summary: payload.sharedSummary,
          appUrl: `${process.env["WASP_WEB_CLIENT_URL"]}/client/sessions`,
        });

        await emailSender.send({
          to: clientProfile.user.email,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
        });

        console.log(
          `Session summary email sent to ${clientProfile.user.email}`,
        );
      } catch (error) {
        console.error("Error sending session summary email:", error);
        if (process.env["NODE_ENV"] === "development") {
          console.log(
            `Session summary would be sent for client ${payload.clientId}`,
          );
        }
      }
    };

  /**
   * Handle RESOURCE_SHARED event
   */
  private handleResourceShared: EventHandler<NotificationEventType.RESOURCE_SHARED> =
    async (payload) => {
      try {
        // Get client and preferences
        const clientProfile = await this.prisma.clientProfile.findUnique({
          where: { id: payload.clientId },
          include: {
            user: { include: { notificationPreferences: true } },
            coach: { include: { user: true } },
          },
        });

        if (!clientProfile?.user?.email) {
          console.warn(
            `Resource shared: Client ${payload.clientId} has no email`,
          );
          return;
        }

        // Check email preference
        const preferences = clientProfile.user.notificationPreferences;
        if (!preferences?.emailResourceShared) {
          console.log(
            `Resource shared email disabled for user ${clientProfile.user.id}`,
          );
          return;
        }

        // Get coach name
        const coachName =
          clientProfile.coach?.user?.email?.split("@")[0] || "Your Coach";

        // Get resource description if available
        const resource = await this.prisma.resource.findUnique({
          where: { id: payload.resourceId },
        });

        // Send email
        const emailContent = getResourceSharedEmailContent({
          clientName: clientProfile.user.username || "Client",
          coachName,
          resourceName: resource?.name || payload.resourceName,
          resourceDescription: resource?.description || undefined,
          appUrl: `${process.env["WASP_WEB_CLIENT_URL"]}/client/resources`,
        });

        await emailSender.send({
          to: clientProfile.user.email,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
        });

        console.log(
          `Resource shared email sent to ${clientProfile.user.email}`,
        );
      } catch (error) {
        console.error("Error sending resource shared email:", error);
        if (process.env["NODE_ENV"] === "development") {
          console.log(
            `Resource shared would be sent for client ${payload.clientId}`,
          );
        }
      }
    };
}
