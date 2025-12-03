import { getGoogleCalendarClient } from "./config";

export class GoogleCalendarService {
  /**
   * Create a dedicated "Loom Platform" calendar for a user
   * Returns the calendar ID for future API calls
   */
  async createCalendarForUser(userEmail: string): Promise<string> {
    const calendar = getGoogleCalendarClient();

    try {
      const response = await calendar.calendars.insert({
        requestBody: {
          summary: `Loom Platform - ${userEmail}`,
          description: "Coaching sessions synced from Loom Platform",
          timeZone: "UTC",
        },
      });

      const calendarId = response.data.id;
      if (!calendarId) {
        throw new Error("Calendar creation failed: no ID returned");
      }

      return calendarId;
    } catch (error) {
      throw new Error(
        `Failed to create Google Calendar: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Add a session event to user's Google Calendar
   * Returns the Google Calendar event ID
   */
  async addSessionEvent(
    calendarId: string,
    title: string,
    startTime: Date,
    endTime: Date,
    description: string,
  ): Promise<string> {
    const calendar = getGoogleCalendarClient();

    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: title,
          description,
          start: { dateTime: startTime.toISOString() },
          end: { dateTime: endTime.toISOString() },
          transparency: "opaque", // Mark as busy
        },
      });

      const eventId = response.data.id;
      if (!eventId) {
        throw new Error("Event creation failed: no ID returned");
      }

      return eventId;
    } catch (error) {
      throw new Error(
        `Failed to add calendar event: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Update an existing event on Google Calendar
   */
  async updateSessionEvent(
    calendarId: string,
    eventId: string,
    title: string,
    startTime: Date,
    endTime: Date,
    description: string,
  ): Promise<void> {
    const calendar = getGoogleCalendarClient();

    try {
      await calendar.events.update({
        calendarId,
        eventId,
        requestBody: {
          summary: title,
          description,
          start: { dateTime: startTime.toISOString() },
          end: { dateTime: endTime.toISOString() },
          transparency: "opaque",
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to update calendar event: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Delete an event from Google Calendar
   */
  async deleteSessionEvent(calendarId: string, eventId: string): Promise<void> {
    const calendar = getGoogleCalendarClient();

    try {
      await calendar.events.delete({
        calendarId,
        eventId,
      });
    } catch (error) {
      throw new Error(
        `Failed to delete calendar event: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
