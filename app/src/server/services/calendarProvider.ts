import { fromZonedTime } from "date-fns-tz";

export type CalendarEvent = {
  id?: string;
  title: string;
  start: string; // ISO string in UTC
  end: string; // ISO string in UTC
  timezone: string;
  description?: string;
  attendees?: Array<{ email: string }>;
  remindersMinutes?: number[];
};

export interface CalendarProvider {
  listEvents(): Promise<CalendarEvent[]>;
  createEvent(event: CalendarEvent): Promise<CalendarEvent>;
  updateEvent(event: CalendarEvent): Promise<CalendarEvent>;
  deleteEvent(eventId: string): Promise<void>;
}

/**
 * Very small provider abstraction so future calendar vendors can be added.
 * Only Google Calendar is implemented for now.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  constructor(
    private readonly fetcher: typeof fetch,
    private readonly accessToken: string,
  ) {}

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    let attempt = 0;
    let delay = 300;

    while (attempt < 3) {
      const response = await this.fetcher(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
          ...(init.headers || {}),
        },
      });

      if (response.ok) {
        return response.json() as Promise<T>;
      }

      attempt += 1;
      if (attempt >= 3) {
        const body = await response.text();
        throw new Error(
          `Google Calendar request failed (${response.status}): ${body}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }

    throw new Error("Exceeded retry attempts for Google Calendar request");
  }

  async listEvents(): Promise<CalendarEvent[]> {
    const data = await this.request<any>(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      { method: "GET" },
    );
    return (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.summary,
      start: item.start?.dateTime || item.start?.date,
      end: item.end?.dateTime || item.end?.date,
      timezone: item.start?.timeZone || "UTC",
      description: item.description,
      attendees: item.attendees,
    }));
  }

  async createEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const payload = this.normalizeEvent(event);
    const created = await this.request<any>(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      { method: "POST", body: JSON.stringify(payload) },
    );
    return this.toEvent(created);
  }

  async updateEvent(event: CalendarEvent): Promise<CalendarEvent> {
    if (!event.id) throw new Error("Event ID is required for updates");
    const payload = this.normalizeEvent(event);
    const updated = await this.request<any>(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
    return this.toEvent(updated);
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.request<void>(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      { method: "DELETE" },
    );
  }

  private normalizeEvent(event: CalendarEvent) {
    const startUtc = fromZonedTime(event.start, event.timezone).toISOString();
    const endUtc = fromZonedTime(event.end, event.timezone).toISOString();

    return {
      summary: event.title,
      description: event.description,
      attendees: event.attendees,
      start: { dateTime: startUtc, timeZone: "UTC" },
      end: { dateTime: endUtc, timeZone: "UTC" },
      reminders: event.remindersMinutes
        ? {
            useDefault: false,
            overrides: event.remindersMinutes.map((minutes) => ({
              method: "email",
              minutes,
            })),
          }
        : undefined,
    };
  }

  private toEvent(item: any): CalendarEvent {
    return {
      id: item.id,
      title: item.summary,
      start: item.start?.dateTime || item.start?.date,
      end: item.end?.dateTime || item.end?.date,
      timezone: item.start?.timeZone || "UTC",
      description: item.description,
      attendees: item.attendees,
    };
  }
}
