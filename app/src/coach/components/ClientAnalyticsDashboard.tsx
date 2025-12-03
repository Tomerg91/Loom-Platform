import React, { useState } from "react";
import { useQuery, useAction } from "wasp/client/operations";
import {
  getClientAnalytics,
  generateClientExportPdf,
} from "wasp/client/operations";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { AlertTriangle, Download, FileText } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { BodyZoneChart } from "./charts/BodyZoneChart";
import { SensationChart } from "./charts/SensationChart";
import { IntensityTrendChart } from "./charts/IntensityTrendChart";
import {
  exportAnalyticsAsCSV,
  type ClientAnalyticsResult,
} from "@src/utils/csv/exportAnalytics";

interface ClientAnalyticsDashboardProps {
  clientId: string;
  clientName?: string;
}

export function ClientAnalyticsDashboard({
  clientId,
  clientName = "Client",
}: ClientAnalyticsDashboardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [period, setPeriod] = useState<"30d" | "90d" | "365d">("30d");
  const [isExporting, setIsExporting] = useState(false);

  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useQuery(getClientAnalytics, {
    clientId,
    period,
  });

  const generatePdfExport = useAction(generateClientExportPdf);

  // ========== EXPORT HANDLERS ==========
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      if (!analytics) {
        toast({
          title: t("somatic.analytics.exportError"),
          description: t("somatic.analytics.noDataToExport", {
            defaultValue: "No data available to export",
          }),
          variant: "destructive",
        });
        return;
      }

      // Get client name from analytics context or use default
      const displayName = clientName || "Client";

      // Export analytics as CSV
      exportAnalyticsAsCSV(
        analytics as ClientAnalyticsResult,
        displayName,
        period,
      );

      toast({
        title: t("somatic.analytics.exportSuccess"),
        description: t("somatic.analytics.csvExportedSuccess", {
          defaultValue: "Analytics exported as CSV",
        }),
      });
    } catch (err) {
      console.error("CSV export failed:", err);
      toast({
        title: t("somatic.analytics.exportError"),
        description: t("somatic.analytics.csvExportFailed", {
          defaultValue: "Failed to export CSV",
        }),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      const result = await generatePdfExport({
        clientId,
        period,
      });

      // Convert base64 to blob and download
      const binaryString = atob(result.pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: t("somatic.analytics.exportSuccess"),
        description: t("somatic.analytics.pdfExportedSuccess", {
          defaultValue: "Report exported as PDF",
        }),
      });
    } catch (err) {
      console.error("PDF export failed:", err);
      toast({
        title: t("somatic.analytics.exportError"),
        description: t("somatic.analytics.pdfExportFailed", {
          defaultValue: "Failed to export PDF",
        }),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("somatic.analytics.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("somatic.analytics.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t("somatic.analytics.error")}
              </AlertDescription>
            </Alert>
            <button
              onClick={() => refetch()}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("common.retry")}
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics || analytics.totalLogsInPeriod === 0) {
    return (
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("somatic.analytics.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                {t("somatic.analytics.empty")}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("somatic.analytics.title")}</CardTitle>
            <CardDescription>
              {t(`somatic.analytics.period.${period}`)}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={isExporting || !analytics}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {t("somatic.analytics.exportCsv", { defaultValue: "CSV" })}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting || !analytics}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {t("somatic.analytics.exportPdf", { defaultValue: "PDF" })}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Period Selector Tabs */}
          <Tabs
            value={period}
            onValueChange={(v) => setPeriod(v as "30d" | "90d" | "365d")}
          >
            <TabsList>
              <TabsTrigger value="30d">
                {t("somatic.analytics.period.30d")}
              </TabsTrigger>
              <TabsTrigger value="90d">
                {t("somatic.analytics.period.90d")}
              </TabsTrigger>
              <TabsTrigger value="365d">
                {t("somatic.analytics.period.365d")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Body Zones Chart */}
          {analytics.topBodyZones.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {t("somatic.analytics.topZones")}
              </h3>
              <BodyZoneChart data={analytics.topBodyZones} />
            </div>
          )}

          {/* Sensations Chart */}
          {analytics.topSensations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {t("somatic.analytics.topSensations")}
              </h3>
              <SensationChart data={analytics.topSensations} />
            </div>
          )}

          {/* Intensity Trend Chart */}
          {analytics.intensityTrendOverTime.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {t("somatic.analytics.intensityTrend")}
              </h3>
              <IntensityTrendChart data={analytics.intensityTrendOverTime} />
            </div>
          )}

          {/* Summary stats */}
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {t("somatic.analytics.totalLogs", {
                defaultValue: "Total logs in period: {{count}}",
                count: analytics.totalLogsInPeriod,
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
