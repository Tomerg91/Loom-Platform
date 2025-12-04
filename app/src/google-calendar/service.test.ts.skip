import { GoogleCalendarService } from "./service";
import { getGoogleCalendarClient } from "./config";

// Mock the Google Calendar client
jest.mock("./config");

describe("GoogleCalendarService", () => {
  let service: GoogleCalendarService;

  beforeEach(() => {
    service = new GoogleCalendarService();
    jest.clearAllMocks();
  });

  describe("createCalendarForUser", () => {
    it("should successfully create a calendar", async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: "calendar-123" },
      });

      const mockCalendarClient = {
        calendars: { insert: mockInsert },
      };

      (getGoogleCalendarClient as jest.Mock).mockReturnValue(
        mockCalendarClient,
      );

      const calendarId =
        await service.createCalendarForUser("user@example.com");

      expect(calendarId).toBe("calendar-123");
      expect(mockInsert).toHaveBeenCalledWith({
        requestBody: {
          summary: "Loom Platform - user@example.com",
          description: "Coaching sessions synced from Loom Platform",
          timeZone: "UTC",
        },
      });
    });

    it("should throw error if API fails", async () => {
      const mockInsert = jest.fn().mockRejectedValue(new Error("API Error"));

      const mockCalendarClient = {
        calendars: { insert: mockInsert },
      };

      (getGoogleCalendarClient as jest.Mock).mockReturnValue(
        mockCalendarClient,
      );

      await expect(
        service.createCalendarForUser("user@example.com"),
      ).rejects.toThrow("Failed to create Google Calendar");
    });

    it("should throw error if no calendar ID returned", async () => {
      const mockInsert = jest.fn().mockResolvedValue({ data: {} });

      const mockCalendarClient = {
        calendars: { insert: mockInsert },
      };

      (getGoogleCalendarClient as jest.Mock).mockReturnValue(
        mockCalendarClient,
      );

      await expect(
        service.createCalendarForUser("user@example.com"),
      ).rejects.toThrow("Calendar creation failed");
    });
  });

  describe("addSessionEvent", () => {
    it("should successfully add an event", async () => {
      const startTime = new Date("2025-12-10T14:00:00Z");
      const endTime = new Date("2025-12-10T15:00:00Z");

      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: "event-123" },
      });

      const mockCalendarClient = {
        events: { insert: mockInsert },
      };

      (getGoogleCalendarClient as jest.Mock).mockReturnValue(
        mockCalendarClient,
      );

      const eventId = await service.addSessionEvent(
        "cal-123",
        "Coaching Session",
        startTime,
        endTime,
        "Session notes",
      );

      expect(eventId).toBe("event-123");
      expect(mockInsert).toHaveBeenCalledWith({
        calendarId: "cal-123",
        requestBody: {
          summary: "Coaching Session",
          description: "Session notes",
          start: { dateTime: startTime.toISOString() },
          end: { dateTime: endTime.toISOString() },
          transparency: "opaque",
        },
      });
    });

    it("should handle API errors gracefully", async () => {
      const mockInsert = jest.fn().mockRejectedValue(new Error("Rate limited"));

      const mockCalendarClient = {
        events: { insert: mockInsert },
      };

      (getGoogleCalendarClient as jest.Mock).mockReturnValue(
        mockCalendarClient,
      );

      await expect(
        service.addSessionEvent(
          "cal-123",
          "Coaching Session",
          new Date(),
          new Date(),
          "Notes",
        ),
      ).rejects.toThrow("Failed to add calendar event");
    });

    it("should throw error if no event ID returned", async () => {
      const mockInsert = jest.fn().mockResolvedValue({ data: {} });

      const mockCalendarClient = {
        events: { insert: mockInsert },
      };

      (getGoogleCalendarClient as jest.Mock).mockReturnValue(
        mockCalendarClient,
      );

      await expect(
        service.addSessionEvent(
          "cal-123",
          "Coaching Session",
          new Date("2025-12-10T14:00:00Z"),
          new Date("2025-12-10T15:00:00Z"),
          "Session notes",
        ),
      ).rejects.toThrow("Event creation failed");
    });
  });

  describe("updateSessionEvent", () => {
    it("should successfully update an event", async () => {
      const startTime = new Date("2025-12-10T15:00:00Z");
      const endTime = new Date("2025-12-10T16:00:00Z");

      const mockUpdate = jest.fn().mockResolvedValue({
        data: { id: "event-123" },
      });

      const mockCalendarClient = {
        events: { update: mockUpdate },
      };

      (getGoogleCalendarClient as jest.Mock).mockReturnValue(
        mockCalendarClient,
      );

      await service.updateSessionEvent(
        "cal-123",
        "event-123",
        "Updated Session",
        startTime,
        endTime,
        "Updated notes",
      );

      expect(mockUpdate).toHaveBeenCalledWith({
        calendarId: "cal-123",
        eventId: "event-123",
        requestBody: {
          summary: "Updated Session",
          description: "Updated notes",
          start: { dateTime: startTime.toISOString() },
          end: { dateTime: endTime.toISOString() },
          transparency: "opaque",
        },
      });
    });

    it("should handle API errors gracefully", async () => {
      const mockUpdate = jest
        .fn()
        .mockRejectedValue(new Error("Event not found"));

      const mockCalendarClient = {
        events: { update: mockUpdate },
      };

      (getGoogleCalendarClient as jest.Mock).mockReturnValue(
        mockCalendarClient,
      );

      await expect(
        service.updateSessionEvent(
          "cal-123",
          "event-123",
          "Updated Session",
          new Date(),
          new Date(),
          "Notes",
        ),
      ).rejects.toThrow("Failed to update calendar event");
    });
  });

  describe("deleteSessionEvent", () => {
    it("should successfully delete an event", async () => {
      const mockDelete = jest.fn().mockResolvedValue({});

      const mockCalendarClient = {
        events: { delete: mockDelete },
      };

      (getGoogleCalendarClient as jest.Mock).mockReturnValue(
        mockCalendarClient,
      );

      await service.deleteSessionEvent("cal-123", "event-123");

      expect(mockDelete).toHaveBeenCalledWith({
        calendarId: "cal-123",
        eventId: "event-123",
      });
    });

    it("should handle API errors gracefully", async () => {
      const mockDelete = jest
        .fn()
        .mockRejectedValue(new Error("Event not found"));

      const mockCalendarClient = {
        events: { delete: mockDelete },
      };

      (getGoogleCalendarClient as jest.Mock).mockReturnValue(
        mockCalendarClient,
      );

      await expect(
        service.deleteSessionEvent("cal-123", "event-123"),
      ).rejects.toThrow("Failed to delete calendar event");
    });
  });
});
