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
import ActionItemList from "@src/workspace/components/ActionItemList";
import WorkspaceFileList from "@src/workspace/components/WorkspaceFileList";

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
    <div className="mt-10 px-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {t("session.sessionHistory")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("session.totalSessions", { total })}
        </p>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sessions">
            {t("session.sessionHistory")}
          </TabsTrigger>
          <TabsTrigger value="files">{t("workspace.files")}</TabsTrigger>
          <TabsTrigger value="actions">
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
                  className="cursor-pointer hover:shadow-md transition-shadow"
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
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                            <span className="text-sm font-semibold text-blue-700">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(
                                new Date(session.sessionDate),
                                "MMM d, yyyy",
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {format(new Date(session.sessionDate), "h:mm a")}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        {expandedSessionId === session.id ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {expandedSessionId === session.id && (
                    <CardContent className="space-y-4 border-t pt-4">
                      {/* Somatic Anchor Badge */}
                      {(session as any).somaticAnchor && (
                        <div className="flex items-center gap-2">
                          <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                            🎯{" "}
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
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">
                            {t("session.sessionSummary")}
                          </h3>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
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
                            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
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
                                    className="w-full flex items-center gap-2 p-2 text-left bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors disabled:opacity-50"
                                  >
                                    {downloadingResourceId === resource.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                        <span className="text-sm text-gray-700">
                                          {t("session.downloading")}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                        <span className="text-sm text-blue-600 underline">
                                          📄 {resource.name}
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
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t("session.noSessionsYet")}
                  </h3>
                  <p className="text-muted-foreground">
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
  );
}
