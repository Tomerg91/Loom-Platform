import Papa from "papaparse";
import type {
  BodyZoneStats,
  SensationStats,
  IntensityTrendPoint,
} from "@src/somatic-logs/analytics";

export interface ClientAnalyticsResult {
  topBodyZones: BodyZoneStats[];
  topSensations: SensationStats[];
  intensityTrendOverTime: IntensityTrendPoint[];
  totalLogsInPeriod: number;
}

export interface SessionData {
  id: string;
  sessionDate: Date;
  sessionNumber?: number | null;
  topic?: string | null;
  sharedSummary?: string | null;
}

/**
 * Format analytics data to CSV content
 */
export function formatAnalyticsToCSV(
  analytics: ClientAnalyticsResult,
  clientName: string,
  period: string,
): string {
  const rows: string[][] = [];
  const timestamp = new Date().toISOString().split("T")[0];

  // Header
  rows.push([`Analytics Report - ${clientName}`]);
  rows.push([`Period: ${period}`, `Generated: ${timestamp}`]);
  rows.push([]);

  // Body Zones Section
  rows.push(["Body Zones Statistics"]);
  rows.push(["Zone", "Count", "Avg Intensity"]);
  analytics.topBodyZones.forEach((zone) => {
    rows.push([zone.zone, zone.count.toString(), zone.avgIntensity.toString()]);
  });
  rows.push([]);

  // Sensations Section
  rows.push(["Top Sensations"]);
  rows.push(["Sensation", "Count", "Avg Intensity"]);
  analytics.topSensations.forEach((sensation) => {
    rows.push([
      sensation.sensation,
      sensation.count.toString(),
      sensation.avgIntensity.toString(),
    ]);
  });
  rows.push([]);

  // Intensity Trend Section
  rows.push(["Weekly Intensity Trend"]);
  rows.push(["Week Starting", "Avg Intensity"]);
  analytics.intensityTrendOverTime.forEach((trend) => {
    const date = new Date(trend.weekStart).toLocaleDateString();
    rows.push([date, trend.avgIntensity.toString()]);
  });
  rows.push([]);

  // Summary
  rows.push(["Summary"]);
  rows.push(["Total Logs in Period", analytics.totalLogsInPeriod.toString()]);

  return Papa.unparse(rows);
}

/**
 * Format session history to CSV content
 */
export function formatSessionsToCSV(
  sessions: SessionData[],
  clientName: string,
): string {
  const rows: string[][] = [];
  const timestamp = new Date().toISOString().split("T")[0];

  // Header
  rows.push([`Session History - ${clientName}`]);
  rows.push([`Generated: ${timestamp}`]);
  rows.push([]);

  // Sessions Table
  rows.push(["Session #", "Date", "Topic", "Summary"]);
  sessions.forEach((session) => {
    const date = new Date(session.sessionDate).toLocaleDateString();
    rows.push([
      session.sessionNumber?.toString() || "",
      date,
      session.topic || "",
      session.sharedSummary || "",
    ]);
  });

  return Papa.unparse(rows);
}

/**
 * Generate filename for CSV export
 */
export function generateCSVFilename(
  clientName: string,
  dataType: "analytics" | "sessions",
  period?: string,
): string {
  const sanitizedName = clientName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const timestamp = new Date().toISOString().split("T")[0];

  if (dataType === "analytics" && period) {
    return `somatic-analytics-${sanitizedName}-${period}-${timestamp}.csv`;
  } else if (dataType === "sessions") {
    return `somatic-sessions-${sanitizedName}-${timestamp}.csv`;
  }

  return `export-${sanitizedName}-${timestamp}.csv`;
}

/**
 * Trigger CSV download in browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Export analytics as CSV (client-side)
 */
export function exportAnalyticsAsCSV(
  analytics: ClientAnalyticsResult,
  clientName: string,
  period: string,
): void {
  const csvContent = formatAnalyticsToCSV(analytics, clientName, period);
  const filename = generateCSVFilename(clientName, "analytics", period);
  downloadCSV(csvContent, filename);
}

/**
 * Export sessions as CSV (client-side)
 */
export function exportSessionsAsCSV(
  sessions: SessionData[],
  clientName: string,
): void {
  const csvContent = formatSessionsToCSV(sessions, clientName);
  const filename = generateCSVFilename(clientName, "sessions");
  downloadCSV(csvContent, filename);
}
