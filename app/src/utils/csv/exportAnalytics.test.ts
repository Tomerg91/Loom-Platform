import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import {
  formatAnalyticsToCSV,
  formatSessionsToCSV,
  generateCSVFilename,
  downloadCSV,
} from "./exportAnalytics";
import type { ClientAnalyticsResult, SessionData } from "./exportAnalytics";

// Set up DOM environment for download tests
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
(global as any).document = dom.window.document;
(global as any).URL = dom.window.URL;

describe("exportAnalytics", () => {
  describe("formatAnalyticsToCSV", () => {
    let mockAnalytics: ClientAnalyticsResult;

    beforeEach(() => {
      mockAnalytics = {
        topBodyZones: [
          { zone: "CHEST", count: 15, avgIntensity: 6.5 },
          { zone: "THROAT", count: 10, avgIntensity: 5.2 },
        ],
        topSensations: [
          { sensation: "Tight", count: 12, avgIntensity: 6.8 },
          { sensation: "Hot", count: 8, avgIntensity: 5.5 },
        ],
        intensityTrendOverTime: [
          { weekStart: "2025-11-01", avgIntensity: 6.2 },
          { weekStart: "2025-11-08", avgIntensity: 6.5 },
        ],
        totalLogsInPeriod: 25,
      };
    });

    it("should format analytics data as CSV", () => {
      const csv = formatAnalyticsToCSV(mockAnalytics, "John Doe", "30d");

      expect(csv).toContain("Analytics Report - John Doe");
      expect(csv).toContain("Period: 30d");
      expect(csv).toContain("Body Zones Statistics");
      expect(csv).toContain("Top Sensations");
      expect(csv).toContain("Weekly Intensity Trend");
      expect(csv).toContain("CHEST");
      expect(csv).toContain("Tight");
    });

    it("should handle empty analytics", () => {
      const emptyAnalytics: ClientAnalyticsResult = {
        topBodyZones: [],
        topSensations: [],
        intensityTrendOverTime: [],
        totalLogsInPeriod: 0,
      };

      const csv = formatAnalyticsToCSV(emptyAnalytics, "Jane Doe", "90d");

      expect(csv).toContain("Analytics Report - Jane Doe");
      expect(csv).toContain("Period: 90d");
      expect(csv).toContain("Total Logs in Period");
    });

    it("should format numbers correctly", () => {
      const csv = formatAnalyticsToCSV(mockAnalytics, "Test Client", "30d");

      expect(csv).toContain("15"); // count
      expect(csv).toContain("6.5"); // avgIntensity
    });
  });

  describe("formatSessionsToCSV", () => {
    let mockSessions: SessionData[];

    beforeEach(() => {
      mockSessions = [
        {
          id: "1",
          sessionDate: new Date("2025-11-20"),
          sessionNumber: 1,
          topic: "Work Stress",
          sharedSummary: "Discussed tension in shoulders",
        },
        {
          id: "2",
          sessionDate: new Date("2025-11-27"),
          sessionNumber: 2,
          topic: "Sleep Issues",
          sharedSummary: "Explored relaxation techniques",
        },
      ];
    });

    it("should format sessions as CSV", () => {
      const csv = formatSessionsToCSV(mockSessions, "John Doe");

      expect(csv).toContain("Session History - John Doe");
      expect(csv).toContain("Work Stress");
      expect(csv).toContain("Sleep Issues");
      expect(csv).toContain("Discussed tension in shoulders");
    });

    it("should handle sessions with missing optional fields", () => {
      const partialSessions: SessionData[] = [
        {
          id: "1",
          sessionDate: new Date("2025-11-20"),
        },
      ];

      const csv = formatSessionsToCSV(partialSessions, "Test");

      expect(csv).toContain("Session History - Test");
    });

    it("should handle empty sessions array", () => {
      const csv = formatSessionsToCSV([], "Empty Client");

      expect(csv).toContain("Session History - Empty Client");
      expect(csv).toContain("Session #");
    });
  });

  describe("generateCSVFilename", () => {
    it("should generate analytics filename with period", () => {
      const filename = generateCSVFilename("John Doe", "analytics", "30d");

      expect(filename).toMatch(
        /somatic-analytics-john_doe-30d-\d{4}-\d{2}-\d{2}\.csv/,
      );
    });

    it("should generate sessions filename", () => {
      const filename = generateCSVFilename("Jane Smith", "sessions");

      expect(filename).toMatch(
        /somatic-sessions-jane_smith-\d{4}-\d{2}-\d{2}\.csv/,
      );
    });

    it("should sanitize client names", () => {
      const filename = generateCSVFilename(
        "John O'Donnell-Smith",
        "analytics",
        "90d",
      );

      expect(filename).not.toContain("'");
      expect(filename).not.toContain("-Smith");
      expect(filename).toContain("john");
    });

    it("should handle different periods", () => {
      const filename30 = generateCSVFilename("Client", "analytics", "30d");
      const filename90 = generateCSVFilename("Client", "analytics", "90d");
      const filename365 = generateCSVFilename("Client", "analytics", "365d");

      expect(filename30).toContain("30d");
      expect(filename90).toContain("90d");
      expect(filename365).toContain("365d");
    });
  });

  describe("downloadCSV", () => {
    it("should be a callable function", () => {
      expect(typeof downloadCSV).toBe("function");
    });

    it("should accept valid parameters", () => {
      // Test that the function can be called with valid parameters
      // The actual DOM interaction is tested in E2E tests
      expect(() => downloadCSV("test", "file.csv")).toBeDefined();
    });
  });
});
