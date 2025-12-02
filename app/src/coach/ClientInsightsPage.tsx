import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "wasp/entities";
import { getClientInsights, useQuery } from "wasp/client/operations";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Skeleton } from "../components/ui/skeleton";
import { ArrowLeft, BarChart3, AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { cn } from "../lib/utils";
// TODO: Install recharts package to fix this import
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

type BodyZone =
  | "HEAD"
  | "THROAT"
  | "CHEST"
  | "SOLAR_PLEXUS"
  | "BELLY"
  | "PELVIS"
  | "ARMS"
  | "LEGS"
  | "FULL_BODY";

type TimeRange = "30days" | "3months" | "allTime";

function ClientInsightsPageContent({ user: _user }: { user: User }) {
  void _user;
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const clientId = clientIdParam?.trim();

  if (!clientId) {
    return <MissingClientInsightsNotice />;
  }

  return <ClientInsightsView clientId={clientId} />;
}

function MissingClientInsightsNotice() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="mt-10 px-6 pb-12">
      <div className="max-w-md mx-auto">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-yellow-800 ml-2">
            <div className="font-semibold text-lg mb-2">
              {t("errors.missingClientId.title", "Invalid Client")}
            </div>
            <p className="text-sm mb-4">
              {t(
                "errors.missingClientId.message",
                "The client ID is missing or invalid."
              )}
            </p>
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => navigate("/coach")}
          className="w-full mt-4 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back", "Go Back")}
        </Button>
      </div>
    </div>
  );
}

function ClientInsightsView({ clientId }: { clientId: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");

  // Fetch insights data
  const { data: insightsData, isLoading, error } = useQuery(getClientInsights, {
    clientId,
    timeRange,
  });

  // Get body zone labels
  const getBodyZoneLabel = useCallback(
    (zone: BodyZone): string => {
      const zoneKey = `somatic.bodyZones.${zone}`;
      return t(zoneKey, zone);
    },
    [t],
  );

  // Prepare data for charts
  const sensationChartData = useMemo(() => {
    if (!insightsData || insightsData.hasInsufficientData) {
      return [];
    }
    return insightsData.topSensations.map((item) => ({
      sensation: item.sensation,
      count: item.count,
      percentage: item.percentage,
    }));
  }, [insightsData]);

  const bodyZoneChartData = useMemo(() => {
    if (!insightsData || insightsData.hasInsufficientData) {
      return [];
    }
    return insightsData.bodyZoneActivity.map((item) => ({
      zone: getBodyZoneLabel(item.bodyZone),
      count: item.count,
      percentage: item.percentage,
      bodyZone: item.bodyZone,
    }));
  }, [getBodyZoneLabel, insightsData]);

  // Time range label mapping
  const timeRangeLabels: Record<TimeRange, string> = {
    "30days": t("insights.timeRange.30days", "Last 30 Days"),
    "3months": t("insights.timeRange.3months", "Last 3 Months"),
    allTime: t("insights.timeRange.allTime", "All Time"),
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="mt-10 px-6 pb-12">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/coach/client/${clientId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>

          <Card className="mt-4">
            <CardContent className="pt-8 pb-8 space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-64 w-full" />
              <div className="flex items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t("common.loading", "Loading...")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mt-10 px-6 pb-12">
        <div className="max-w-md mx-auto">
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800 ml-2">
              <div className="font-semibold text-lg mb-2">
                {t("errors.loadingError", "Error Loading Insights")}
              </div>
              <p className="text-sm mb-4">
                {error instanceof Error
                  ? error.message
                  : t("errors.unknownError", "An unknown error occurred")}
              </p>
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => navigate(`/coach/client/${clientId}`)}
            className="w-full mt-4 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back", "Go Back")}
          </Button>
        </div>
      </div>
    );
  }

  // No insights data
  if (!insightsData) {
    return (
      <div className="mt-10 px-6 pb-12">
        <div className="max-w-md mx-auto">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-800 ml-2">
              <div className="font-semibold text-lg mb-2">
                {t("common.error", "Error")}
              </div>
              <p className="text-sm mb-4">
                {t("errors.unknownError", "An unknown error occurred")}
              </p>
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => navigate(`/coach/client/${clientId}`)}
            className="w-full mt-4 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back", "Go Back")}
          </Button>
        </div>
      </div>
    );
  }

  // Insufficient data state
  if (insightsData.hasInsufficientData) {
    return (
      <div className="mt-10 px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/coach/client/${clientId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                {t("insights.title", "Client Insights")}
              </h1>
            </div>
          </div>

          {/* Empty State */}
          <Card className="mt-6 border-dashed">
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {t(
                    "insights.emptyState.title",
                    "Not enough data yet"
                  )}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t(
                    "insights.emptyState.subtitle",
                    "{{clientName}} needs at least {{minLogs}} somatic logs to see patterns. Currently has {{totalLogs}}.",
                    {
                      clientName: "Client",
                      minLogs: insightsData.minLogsRequired,
                      totalLogs: insightsData.totalLogs,
                    }
                  )}
                </p>
                <Button
                  onClick={() => navigate(`/coach/client/${clientId}`)}
                  className="flex items-center gap-2 mx-auto"
                >
                  {t(
                    "insights.emptyState.action",
                    "View Client Details"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main insights view
  return (
    <div className="mt-10 px-6 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/coach/client/${clientId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              {t("insights.title", "Client Insights")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {timeRangeLabels[timeRange]} • {insightsData.totalLogs} logs
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["30days", "3months", "allTime"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-4 py-2",
                timeRange === range
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {timeRangeLabels[range]}
            </Button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t("insights.stats.totalLogs", "Total Logs")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {insightsData.totalLogs}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t("insights.stats.averageIntensity", "Average Intensity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {insightsData.averageIntensity.toFixed(1)}/10
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t("insights.stats.uniqueSensations", "Unique Sensations")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {sensationChartData.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Sensations Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("insights.sensations.title", "Top Recurring Sensations")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sensationChartData.length > 0 ? (
                <div className="space-y-3">
                  {sensationChartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {item.sensation}
                          </span>
                          <span className="text-xs text-gray-500">
                            {item.count} {t("insights.sensations.logs", "logs")}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 ml-3 whitespace-nowrap">
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {t("insights.noData", "No sensation data available")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Body Zone Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("insights.bodyZones.title", "Body Zone Activity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bodyZoneChartData.length > 0 ? (
                <div className="space-y-3">
                  {bodyZoneChartData
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">
                              {item.zone}
                            </span>
                            <span className="text-xs text-gray-500">
                              {item.count} {t("insights.sensations.logs", "logs")}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-emerald-600 h-2 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 ml-3 whitespace-nowrap">
                          {item.percentage}%
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {t("insights.noData", "No body zone data available")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ClientInsightsPage({ user }: { user: User }) {
  return <ClientInsightsPageContent user={user} />;
}
