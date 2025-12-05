import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "wasp/entities";
import {
  getSessionsForClient,
  getResourceDownloadUrl,
  useQuery,
  useAction,
} from "wasp/client/operations";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import ActionItemList from "../workspace/components/ActionItemList";
import WorkspaceFileList from "../workspace/components/WorkspaceFileList";

export default function SessionHistoryPage({ user }: { user: User }) {
  const { t } = useTranslation();

  // Helper to convert BodyZone enum to display name
  const getBodyZoneLabel = (zone: string): string => {
    const zoneKey = `somatic.bodyZones.${zone}`;
    return t(zoneKey, { defaultValue: zone });
  };
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null,
  );
  const [downloadingResourceId, setDownloadingResourceId] = useState<
    string | null
  >(null);

  const getDownloadUrl = useAction(getResourceDownloadUrl);

  // Get client profile ID from an endpoint or local storage/context
  // For now, we'll make a query that returns it
  const clientId = (user as any).clientProfile?.id;

  const {
    data: response,
    isLoading,
    error,
  } = useQuery(getSessionsForClient, {
    clientId: clientId || "",
  });

  if (!clientId) {
    return (
      <div className="mt-10 px-6">
        <Alert className="bg-yellow-50 border-yellow-200">
          <Calendar className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            {t("session.notSetupAsClient")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-10 px-6">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          {t("session.sessionHistory")}
        </h1>
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">
              {t("common.loading")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 px-6">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          {t("session.sessionHistory")}
        </h1>
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-800">
            {t("session.failedLoadHistory")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const sessions = response?.sessions || [];
  const total = response?.total || 0;

  const handleDownloadResource = async (
    resourceId: string,
    resourceName: string,
  ) => {
    try {
      setDownloadingResourceId(resourceId);
      const downloadUrl = await getDownloadUrl({ resourceId });
      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = resourceName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download resource:", error);
      alert(t("session.downloadFailed"));
    } finally {
      setDownloadingResourceId(null);
    }
  };

  // Get coach ID for workspace access
  const coachId = (user as any).clientProfile?.coachId;

  return (
    <div className="content-container section-padding pb-12">
      <div className="mb-10 animate-fade-in">
        <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">
          {t("session.sessionHistory")}
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          {t("session.totalSessions", { total })}
        </p>
      </div>

      <div className="w-full">
        <Tabs defaultValue="sessions">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl mb-8">
            <TabsTrigger value="sessions" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              {t("session.sessionHistory")}
            </TabsTrigger>
            <TabsTrigger value="files" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">{t("workspace.files")}</TabsTrigger>
            <TabsTrigger value="actions" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              {t("workspace.actionItems")}
            </TabsTrigger>
          </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            {sessions.length > 0 ? (
              <div className="space-y-4">
                {sessions.map((session, index) => (
                  <Card
                    key={session.id}
                    variant="glass"
                    className="cursor-pointer hover:shadow-soft-lg transition-all duration-300 group"
                    onClick={() =>
                      setExpandedSessionId(
                        expandedSessionId === session.id ? null : session.id,
                      )
                    }
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <span className="text-sm font-bold text-primary">
                                #{index + 1}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4 text-primary/60" />
                                {format(
                                  new Date(session.sessionDate),
                                  "MMM d, yyyy",
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4 text-primary/60" />
                                {format(
                                  new Date(session.sessionDate),
                                  "h:mm a",
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-muted-foreground group-hover:text-primary transition-colors">
                          {expandedSessionId === session.id ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {expandedSessionId === session.id && (
                      <CardContent className="space-y-6 border-t border-border/50 pt-6 animate-fade-in">
                        {/* Somatic Anchor Badge */}
                        {(session as any).somaticAnchor && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent-foreground text-xs font-semibold rounded-full border border-accent/20">
                              <span className="text-base">🎯</span>
                              {t("session.anchor", {
                                zone: getBodyZoneLabel(
                                  (session as any).somaticAnchor,
                                ),
                              })}
                            </span>
                          </div>
                        )}

                        {/* Session Summary */}
                        {session.sharedSummary ? (
                          <div className="bg-white/40 dark:bg-black/20 rounded-xl p-4 border border-border/50">
                            <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              {t("session.sessionSummary")}
                            </h3>
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-serif">
                              {session.sharedSummary}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-muted-foreground italic">
                              {t("session.noSummary")}
                            </p>
                          </div>
                        )}

                        {/* Attached Resources (Homework) */}
                        {(session as any).resources &&
                          (session as any).resources.length > 0 && (
                            <div>
                              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-secondary" />
                                {t("session.homework")}
                              </h3>
                              <div className="space-y-2">
                                {(session as any).resources.map(
                                  (resource: {
                                    id: string;
                                    name: string;
                                    type: string;
                                  }) => (
                                    <button
                                      key={resource.id}
                                      onClick={() =>
                                        handleDownloadResource(
                                          resource.id,
                                          resource.name,
                                        )
                                      }
                                      disabled={
                                        downloadingResourceId === resource.id
                                      }
                                      className="w-full flex items-center gap-3 p-3 text-left bg-white/50 dark:bg-white/5 hover:bg-primary/5 rounded-xl border border-border/50 transition-all disabled:opacity-50 group/btn"
                                    >
                                      {downloadingResourceId === resource.id ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                          <span className="text-sm text-muted-foreground">
                                            {t("session.downloading")}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <div className="p-2 bg-primary/10 rounded-lg group-hover/btn:bg-primary/20 transition-colors">
                                            <FileText className="h-4 w-4 text-primary" />
                                          </div>
                                          <span className="text-sm font-medium text-foreground group-hover/btn:text-primary transition-colors">
                                            {resource.name}
                                          </span>
                                        </>
                                      )}
                                    </button>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card variant="glass">
                <CardContent className="py-16">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                      {t("session.noSessionsYet")}
                    </h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      {t("session.noSessionsDescription")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Workspace Files Tab */}
          {clientId && coachId && (
            <TabsContent value="files">
              <WorkspaceFileList
                coachId={coachId}
                clientId={clientId}
                isCoachView={false}
              />
            </TabsContent>
          )}

          {/* Action Items Tab */}
          {clientId && coachId && (
            <TabsContent value="actions">
              <ActionItemList
                coachId={coachId}
                clientId={clientId}
                isCoachView={false}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
