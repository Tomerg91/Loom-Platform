import type {
  ConnectGoogleCalendar,
  DisconnectGoogleCalendar,
  GetCalendarConnection,
} from "wasp/server/operations";
import { HttpError } from "wasp/server";
import { GoogleCalendarService } from "./service";

/**
 * Connect user's Google Calendar
 * Creates a new "Loom Platform" calendar and stores the connection
 */
export const connectGoogleCalendar: ConnectGoogleCalendar<
  void,
  { calendarId: string; calendarName: string }
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  // Check if already connected
  const existing = await context.entities.UserCalendarConnection.findUnique({
    where: { userId: context.user.id },
  });

  if (existing && existing.isConnected) {
    throw new HttpError(400, "Google Calendar already connected");
  }

  const service = new GoogleCalendarService();
  let calendarId: string;

  try {
    calendarId = await service.createCalendarForUser(
      context.user.email || "user@loom.platform",
    );
  } catch (error) {
    throw new HttpError(
      500,
      `Failed to create calendar: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  // Create or update connection record
  const connection = existing
    ? await context.entities.UserCalendarConnection.update({
        where: { userId: context.user.id },
        data: {
          calendarId,
          calendarName: `Loom Platform - ${context.user.email}`,
          isConnected: true,
          connectedAt: new Date(),
        },
      })
    : await context.entities.UserCalendarConnection.create({
        data: {
          userId: context.user.id,
          calendarId,
          calendarName: `Loom Platform - ${context.user.email}`,
          isConnected: true,
        },
      });

  return {
    calendarId: connection.calendarId,
    calendarName: connection.calendarName || "",
  };
};

/**
 * Disconnect Google Calendar
 * Sets isConnected to false but keeps the calendar in Google Calendar
 */
export const disconnectGoogleCalendar: DisconnectGoogleCalendar<
  void,
  { success: boolean }
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const connection = await context.entities.UserCalendarConnection.findUnique({
    where: { userId: context.user.id },
  });

  if (!connection) {
    throw new HttpError(404, "Calendar connection not found");
  }

  await context.entities.UserCalendarConnection.update({
    where: { userId: context.user.id },
    data: {
      isConnected: false,
    },
  });

  return { success: true };
};

/**
 * Get current calendar connection status
 */
export const getCalendarConnection: GetCalendarConnection<
  void,
  {
    isConnected: boolean;
    calendarName?: string;
    lastSyncAt?: Date;
    syncErrorCount: number;
    lastError?: string;
  } | null
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const connection = await context.entities.UserCalendarConnection.findUnique({
    where: { userId: context.user.id },
  });

  if (!connection) {
    return null;
  }

  const result: {
    isConnected: boolean;
    calendarName?: string;
    lastSyncAt?: Date;
    syncErrorCount: number;
    lastError?: string;
  } = {
    isConnected: connection.isConnected,
    syncErrorCount: connection.syncErrorCount,
  };

  if (connection.calendarName) {
    result.calendarName = connection.calendarName;
  }
  if (connection.lastSyncAt) {
    result.lastSyncAt = connection.lastSyncAt;
  }
  if (connection.lastError) {
    result.lastError = connection.lastError;
  }

  return result;
};
