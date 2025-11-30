import React, { useState } from "react";
import { useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getClientAnalytics } from "wasp/client/operations";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Skeleton } from "../../components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { BodyZoneChart } from "./charts/BodyZoneChart";
import { SensationChart } from "./charts/SensationChart";
import { IntensityTrendChart } from "./charts/IntensityTrendChart";

interface ClientAnalyticsDashboardProps {
  clientId: string;
}

export function ClientAnalyticsDashboard({ clientId }: ClientAnalyticsDashboardProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"30d" | "90d" | "365d">("30d");

  const { data: analytics, isLoading, error, refetch } = useQuery(getClientAnalytics, {
    clientId,
    period,
  });

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
        <CardHeader>
          <CardTitle>{t("somatic.analytics.title")}</CardTitle>
          <CardDescription>
            {t(`somatic.analytics.period.${period}`)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Period Selector Tabs */}
          <Tabs value={period} onValueChange={(v) => setPeriod(v as "30d" | "90d" | "365d")}>
            <TabsList>
              <TabsTrigger value="30d">{t("somatic.analytics.period.30d")}</TabsTrigger>
              <TabsTrigger value="90d">{t("somatic.analytics.period.90d")}</TabsTrigger>
              <TabsTrigger value="365d">{t("somatic.analytics.period.365d")}</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Body Zones Chart */}
          {analytics.topBodyZones.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t("somatic.analytics.topZones")}</h3>
              <BodyZoneChart data={analytics.topBodyZones} />
            </div>
          )}

          {/* Sensations Chart */}
          {analytics.topSensations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t("somatic.analytics.topSensations")}</h3>
              <SensationChart data={analytics.topSensations} />
            </div>
          )}

          {/* Intensity Trend Chart */}
          {analytics.intensityTrendOverTime.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t("somatic.analytics.intensityTrend")}</h3>
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
