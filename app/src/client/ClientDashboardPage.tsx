import type { User } from "wasp/entities";
import { getSomaticLogs, getRecentSessionsForClient, useQuery, useAction, getOnboardingStatus, updateOnboardingStatus, updateSomaticLogVisibility } from "wasp/client/operations";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import SomaticLogForm from "./SomaticLogForm";
import EmptyStateWithHelp from "./components/EmptyStateWithHelp";
import SomaticLogFilters, { type SomaticLogFiltersState } from "./components/SomaticLogFilters";
import OnboardingModal from "../components/OnboardingModal";
import { formatDistanceToNow, format, startOfToday, startOfWeek, startOfMonth } from "date-fns";
import { Calendar, Zap, BookOpen, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

export default function ClientDashboardPage({ user }: { user: User }) {
  const { data: somaticLogs, refetch } = useQuery(getSomaticLogs);
  const { data: recentSessions } = useQuery(getRecentSessionsForClient);
  const { data: onboardingStatus } = useQuery(getOnboardingStatus);
  const updateOnboarding = useAction(updateOnboardingStatus);
  const updateVisibility = useAction(updateSomaticLogVisibility);
  const { t } = useTranslation();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [filters, setFilters] = useState<SomaticLogFiltersState>({
    dateRange: 'allTime',
    bodyZones: [],
    minIntensity: 1,
    maxIntensity: 10,
  });

  useEffect(() => {
    // Show onboarding if not completed
    if (onboardingStatus && !onboardingStatus.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [onboardingStatus]);

  const handleLogSuccess = () => {
    // Refetch logs when a new one is created
    refetch();
  };

  const handleFiltersChange = (newFilters: SomaticLogFiltersState) => {
    setFilters(newFilters);
  };

  const handleOnboardingComplete = async (steps: Record<string, boolean>) => {
    try {
      await updateOnboarding({
        onboardingCompleted: true,
        onboardingSteps: steps,
      });
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to update onboarding:', error);
    }
  };

  const handleToggleSharingStatus = async (logId: string, currentSharedStatus: boolean) => {
    try {
      await updateVisibility({
        logId,
        sharedWithCoach: !currentSharedStatus,
      });
      refetch(); // Refresh logs to show updated status
    } catch (error) {
      console.error('Failed to update sharing status:', error);
    }
  };

  // Apply filters to somatic logs
  const filteredLogs = somaticLogs?.filter((log) => {
    // Date range filter
    if (filters.dateRange !== 'allTime') {
      const logDate = new Date(log.createdAt);
      let startDate: Date;

      if (filters.dateRange === 'today') {
        startDate = startOfToday();
      } else if (filters.dateRange === 'thisWeek') {
        startDate = startOfWeek(new Date());
      } else if (filters.dateRange === 'thisMonth') {
        startDate = startOfMonth(new Date());
      } else {
        startDate = new Date(0);
      }

      if (logDate < startDate) return false;
    }

    // Body zone filter
    if (filters.bodyZones.length > 0 && !filters.bodyZones.includes(log.bodyZone)) {
      return false;
    }

    // Intensity filter
    if (log.intensity < filters.minIntensity || log.intensity > filters.maxIntensity) {
      return false;
    }

    return true;
  }) || [];

  return (
    <>
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        userRole={user.role}
        onboardingSteps={onboardingStatus?.onboardingSteps}
        onMarkComplete={handleOnboardingComplete}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {user.username || user.email}
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your somatic journey with the Satya Method
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Somatic Log Form */}
          <div>
            <SomaticLogForm onSuccess={handleLogSuccess} />
          </div>

          {/* Recent Sensations */}
          <Card>
            <CardHeader>
              <CardTitle>{t("client.recentSensations")}</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredLogs.length === 0 && (somaticLogs?.length ?? 0) > 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t("filters.noResults")}</p>
                </div>
              ) : !somaticLogs || somaticLogs.length === 0 ? (
                <EmptyStateWithHelp
                  icon={<Zap className="h-8 w-8" />}
                  title={t("client.noLogsTitle")}
                  description={t("client.noLogsDescription")}
                  buttonText={t("client.logFirstSensationBtn")}
                  helpTitle={t("client.somaticLoggingHelp")}
                  helpContent={
                    <div className="space-y-4">
                      <p>{t("client.somaticLoggingExplanation")}</p>
                      <div>
                        <h4 className="font-semibold mb-2">
                          {t("client.howToLog")}
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>{t("client.step1SelectZone")}</li>
                          <li>{t("client.step2ChooseSensation")}</li>
                          <li>{t("client.step3SetIntensity")}</li>
                          <li>{t("client.step4OptionalNotes")}</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                          {log.bodyZone.replace(/_/g, " ")}
                        </span>
                        <span className="ml-2 inline-block px-2 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded">
                          {log.sensation}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSharingStatus(log.id, log.sharedWithCoach)}
                          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                          title={log.sharedWithCoach ? t('sharing.private') : t('sharing.sharedWithCoach')}
                        >
                          {log.sharedWithCoach ? (
                            <Eye className="h-4 w-4 text-primary" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Intensity:
                        </span>
                        <div className="flex gap-1">
                          {Array.from({ length: 10 }, (_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-4 rounded-sm ${
                                i < log.intensity
                                  ? "bg-primary"
                                  : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium">
                          {log.intensity}/10
                        </span>
                      </div>
                    </div>
                    {log.note && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        "{log.note}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters - Full Width Below */}
      <div className="mt-6">
        <SomaticLogFilters filters={filters} onFiltersChange={handleFiltersChange} />
      </div>

      {/* Recent Sessions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("client.recentSessions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recentSessions || recentSessions.length === 0 ? (
            <EmptyStateWithHelp
              icon={<BookOpen className="h-8 w-8" />}
              title={t("client.noSessionsTitle")}
              description={t("client.noSessionsDescription")}
              buttonText={t("client.learnAboutSessionsBtn")}
              helpTitle={t("client.sessionHistoryHelp")}
              helpContent={
                <div className="space-y-4">
                  <p>{t("client.sessionHistoryExplanation")}</p>
                  <div>
                    <h4 className="font-semibold mb-2">
                      {t("client.whatYouWillSee")}
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>{t("client.sessionDate")}</li>
                      <li>{t("client.sharedSummary")}</li>
                      <li>{t("client.sessionNotes")}</li>
                      <li>{t("client.coachInsights")}</li>
                    </ul>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3 text-sm">
                    <p className="font-medium mb-1">💡 {t("client.tip")}</p>
                    <p>{t("client.sessionTip")}</p>
                  </div>
                </div>
              }
            />
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-sm">
                        {format(new Date(session.sessionDate), "MMMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(session.sessionDate), "h:mm a")}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(session.sessionDate), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {session.sharedSummary && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                      "{session.sharedSummary}"
                    </p>
                  )}
                  {!session.sharedSummary && (
                    <p className="text-xs text-muted-foreground italic">
                      No summary shared yet.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
