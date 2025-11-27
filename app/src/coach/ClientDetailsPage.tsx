import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "wasp/entities";
import { getSomaticLogs, useQuery, getSessionsForClient, useAction, createSession, updateSession, deleteSession } from "wasp/client/operations";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription } from "../components/ui/alert";
import BodyMapSelector from "../client/components/BodyMapSelector";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ArrowLeft, Calendar, Activity, Plus, Loader2, Trash2, Edit2, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { SessionResponse } from "../session/operations";

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

type ZoneHighlight = {
  zone: BodyZone;
  intensity: number;
};

function ClientDetailsPageContent({ user }: { user: User }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const clientId = clientIdParam || "";

  // Validate clientId parameter
  if (!clientId) {
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
                  "The client ID is missing or invalid. Please select a client from your dashboard."
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

  // State for sessions
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionResponse | null>(null);
  const [sessionForm, setSessionForm] = useState({
    sessionDate: new Date().toISOString().split("T")[0],
    sessionTime: new Date().toTimeString().slice(0, 5),
    privateNotes: "",
    sharedSummary: "",
  });
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionSuccess, setSessionSuccess] = useState<string | null>(null);
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionToDelete, setSessionToDelete] = useState<
    Pick<SessionResponse, "id" | "sessionDate"> | null
  >(null);
  const itemsPerPage = 10;

  // State for schedule modal
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scheduleDay: 1, // Monday
    scheduleTime: "14:00",
    scheduleTimezone: "America/New_York",
  });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Fetch somatic logs for this client
  const { data: somaticLogs, isLoading, error } = useQuery(getSomaticLogs, {
    clientId,
  });

  // Fetch sessions for this client
  const { data: sessionsResponse, refetch: refetchSessions } = useQuery(getSessionsForClient, {
    clientId,
    page: currentPage,
    limit: itemsPerPage,
  });

  const createSessionFn = useAction(createSession);
  const updateSessionFn = useAction(updateSession);
  const deleteSessionFn = useAction(deleteSession);
  const updateScheduleFn = useAction(updateClientSchedule);

  // Calculate zone highlights from recent logs (last 30 days)
  const getZoneHighlights = (): ZoneHighlight[] => {
    if (!somaticLogs || somaticLogs.length === 0) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Filter logs from last 30 days
    const recentLogs = somaticLogs.filter(
      (log) => new Date(log.createdAt) >= thirtyDaysAgo
    );

    // Group by zone and calculate average intensity
    const zoneMap = new Map<BodyZone, number[]>();

    recentLogs.forEach((log) => {
      const zone = log.bodyZone as BodyZone;
      if (!zoneMap.has(zone)) {
        zoneMap.set(zone, []);
      }
      zoneMap.get(zone)!.push(log.intensity);
    });

    // Calculate average intensity for each zone
    const highlights: ZoneHighlight[] = [];
    zoneMap.forEach((intensities, zone) => {
      const avgIntensity =
        intensities.reduce((sum, val) => sum + val, 0) / intensities.length;
      highlights.push({ zone, intensity: Math.round(avgIntensity) });
    });

    return highlights;
  };

  const zoneHighlights = getZoneHighlights();

  // Session handlers
  const handleOpenSessionDialog = (session?: SessionResponse) => {
    if (session) {
      setEditingSession(session);
      setSessionForm({
        sessionDate: format(new Date(session.sessionDate), "yyyy-MM-dd"),
        sessionTime: format(new Date(session.sessionDate), "HH:mm"),
        privateNotes: session.privateNotes || "",
        sharedSummary: session.sharedSummary || "",
      });
    } else {
      setEditingSession(null);
      setSessionForm({
        sessionDate: new Date().toISOString().split("T")[0],
        sessionTime: new Date().toTimeString().slice(0, 5),
        privateNotes: "",
        sharedSummary: "",
      });
    }
    setSessionError(null);
    setSessionSuccess(null);
    setIsSessionDialogOpen(true);
  };

  const handleCloseSessionDialog = () => {
    setIsSessionDialogOpen(false);
    setEditingSession(null);
    setSessionError(null);
    setSessionSuccess(null);
  };

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError(null);
    setSessionSuccess(null);

    try {
      setIsSubmittingSession(true);
      const sessionDateTime = new Date(`${sessionForm.sessionDate}T${sessionForm.sessionTime}`);

      if (editingSession) {
        await updateSessionFn({
          sessionId: editingSession.id,
          sessionDate: sessionDateTime,
          privateNotes: sessionForm.privateNotes || null,
          sharedSummary: sessionForm.sharedSummary || null,
        });
        setSessionSuccess("Session updated successfully!");
      } else {
        await createSessionFn({
          clientId,
          sessionDate: sessionDateTime,
          privateNotes: sessionForm.privateNotes || null,
          sharedSummary: sessionForm.sharedSummary || null,
        });
        setSessionSuccess("Session logged successfully!");
      }

      setTimeout(() => {
        handleCloseSessionDialog();
        refetchSessions();
      }, 1000);
    } catch (error: any) {
      setSessionError(error.message || "Failed to save session");
    } finally {
      setIsSubmittingSession(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      setSessionError(null);
      await deleteSessionFn({ sessionId });
      setSessionSuccess("Session deleted successfully!");
      setDeleteConfirm(null);
      setTimeout(() => {
        refetchSessions();
      }, 500);
    } catch (error: any) {
      setSessionError(error.message || "Failed to delete session");
    }
  };

  const handleOpenScheduleDialog = () => {
    setScheduleError(null);
    setScheduleSuccess(null);
    setIsScheduleDialogOpen(true);
  };

  const handleCloseScheduleDialog = () => {
    setIsScheduleDialogOpen(false);
    setScheduleError(null);
    setScheduleSuccess(null);
  };

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError(null);
    setScheduleSuccess(null);

    try {
      setIsSubmittingSchedule(true);
      await updateScheduleFn({
        clientId,
        scheduleDay: scheduleForm.scheduleDay,
        scheduleTime: scheduleForm.scheduleTime,
        scheduleTimezone: scheduleForm.scheduleTimezone,
      });
      setScheduleSuccess("Schedule set successfully! Next session date has been calculated.");
      setTimeout(() => {
        handleCloseScheduleDialog();
      }, 1500);
    } catch (error: any) {
      setScheduleError(error.message || "Failed to set schedule");
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-10 px-6">
        <p className="text-muted-foreground">Loading client data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 px-6">
        <p className="text-red-500">
          Error loading client data: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 px-6 pb-12">
      {/* Header with Back Button */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/coach")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Client Details</h1>
            <p className="text-muted-foreground mt-2">
              Viewing somatic journey and body map data
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleOpenScheduleDialog}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Schedule Settings
            </Button>
            <Button
              onClick={() => handleOpenSessionDialog()}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Log Session
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Visual Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Body Map Summary (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {zoneHighlights.length > 0 ? (
              <div>
                <BodyMapSelector
                  mode="readonly"
                  highlightedZones={zoneHighlights}
                />
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Intensity based on average of recent logs
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  No data from the last 30 days
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Client Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">
                  {somaticLogs?.length || 0}
                </p>
              </div>
              {somaticLogs && somaticLogs.length > 0 && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Most Recent Entry
                    </p>
                    <p className="text-lg font-medium">
                      {formatDistanceToNow(new Date(somaticLogs[0].createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Active Zones (Last 30 Days)
                    </p>
                    <p className="text-lg font-medium">
                      {zoneHighlights.length}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Somatic Logs History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Somatic Log History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!somaticLogs || somaticLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No somatic logs yet for this client.
            </p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Zone</th>
                      <th className="pb-3 font-medium">Sensation</th>
                      <th className="pb-3 font-medium">Intensity</th>
                      <th className="pb-3 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {somaticLogs.map((log) => (
                      <tr key={log.id} className="text-sm">
                        <td className="py-3">
                          <div>
                            <div className="font-medium">
                              {format(new Date(log.createdAt), "MMM d, yyyy")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(log.createdAt), "h:mm a")}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                            {log.bodyZone.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="inline-block px-2 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded">
                            {log.sensation}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {Array.from({ length: 10 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-4 rounded-sm ${
                                    i < log.intensity ? "bg-primary" : "bg-gray-200"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-medium">
                              {log.intensity}/10
                            </span>
                          </div>
                        </td>
                        <td className="py-3 max-w-xs">
                          {log.note ? (
                            <p className="text-xs text-muted-foreground italic truncate">
                              {log.note}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No note
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-3">
                {somaticLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 space-y-3 bg-card"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">
                          {format(new Date(log.createdAt), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), "h:mm a")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                        {log.bodyZone.replace(/_/g, " ")}
                      </span>
                      <span className="inline-block px-2 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded">
                        {log.sensation}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Intensity:
                        </span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 10 }, (_, i) => (
                            <div
                              key={i}
                              className={`w-1 h-3 rounded-sm ${
                                i < log.intensity ? "bg-primary" : "bg-gray-200"
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
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Note:
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.note}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Session History Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Session History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!sessionsResponse || sessionsResponse.sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No sessions logged yet. Click "Log Session" to create one.
            </p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Private Notes</th>
                      <th className="pb-3 font-medium">Shared Summary</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sessionsResponse.sessions.map((session: any) => (
                      <tr key={session.id} className="text-sm">
                        <td className="py-3">
                          <div>
                            <div className="font-medium">
                              {format(new Date(session.sessionDate), "MMM d, yyyy")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(session.sessionDate), "h:mm a")}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 max-w-xs">
                          {session.privateNotes ? (
                            <p className="text-xs text-muted-foreground italic truncate">
                              {session.privateNotes}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 max-w-xs">
                          {session.sharedSummary ? (
                            <p className="text-xs text-muted-foreground italic truncate">
                              {session.sharedSummary}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenSessionDialog(session)}
                              className="p-2 hover:bg-gray-100 rounded transition-colors"
                              title="Edit session"
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() =>
                                setSessionToDelete({
                                  id: session.id,
                                  sessionDate: session.sessionDate,
                                })
                              }
                              className="p-2 hover:bg-gray-100 rounded transition-colors"
                              title="Delete session"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-3">
                {sessionsResponse.sessions.map((session: any) => (
                  <div
                    key={session.id}
                    className="border rounded-lg p-4 space-y-3 bg-card"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">
                          {format(new Date(session.sessionDate), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(session.sessionDate), "h:mm a")}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenSessionDialog(session)}
                          className="p-2 hover:bg-gray-100 rounded transition-colors"
                          title="Edit session"
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() =>
                            setSessionToDelete({
                              id: session.id,
                              sessionDate: session.sessionDate,
                            })
                          }
                          className="p-2 hover:bg-gray-100 rounded transition-colors"
                          title="Delete session"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    {session.privateNotes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Private Notes:
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.privateNotes}
                        </p>
                      </div>
                    )}

                    {session.sharedSummary && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Shared Summary:
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.sharedSummary}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {sessionsResponse && sessionsResponse.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Page {sessionsResponse.page} of {sessionsResponse.totalPages} ({sessionsResponse.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === sessionsResponse.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Session Dialog Modal */}
      <Dialog open={isSessionDialogOpen} onOpenChange={setIsSessionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSession ? "Edit Session" : "Log New Session"}
            </DialogTitle>
            <DialogDescription>
              {editingSession
                ? "Update the session details below."
                : "Record a completed session with this client."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitSession} className="space-y-4">
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session-date">Session Date</Label>
                <Input
                  id="session-date"
                  type="date"
                  value={sessionForm.sessionDate}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, sessionDate: e.target.value })
                  }
                  disabled={isSubmittingSession}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-time">Session Time</Label>
                <Input
                  id="session-time"
                  type="time"
                  value={sessionForm.sessionTime}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, sessionTime: e.target.value })
                  }
                  disabled={isSubmittingSession}
                />
              </div>
            </div>

            {/* Private Notes */}
            <div className="space-y-2">
              <Label htmlFor="private-notes">Private Notes (Coach Only)</Label>
              <Textarea
                id="private-notes"
                placeholder="Your private observations and thoughts about this session..."
                value={sessionForm.privateNotes}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, privateNotes: e.target.value })
                }
                disabled={isSubmittingSession}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Only you can see these notes.
              </p>
            </div>

            {/* Shared Summary */}
            <div className="space-y-2">
              <Label htmlFor="shared-summary">Shared Summary (Visible to Client)</Label>
              <Textarea
                id="shared-summary"
                placeholder="A summary of the session to share with your client..."
                value={sessionForm.sharedSummary}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, sharedSummary: e.target.value })
                }
                disabled={isSubmittingSession}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                The client will see this recap.
              </p>
            </div>

            {/* Error Message */}
            {sessionError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  {sessionError}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {sessionSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  {sessionSuccess}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseSessionDialog}
                disabled={isSubmittingSession}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingSession}>
                {isSubmittingSession ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingSession ? "Update Session" : "Log Session"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Session Confirmation Dialog */}
      <Dialog
        open={!!sessionToDelete}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("session.deleteSession", "Delete Session")}</DialogTitle>
            <DialogDescription>
              {t(
                "session.deleteConfirm",
                "Are you sure you want to delete this session from {{date}}? This action cannot be undone.",
                {
                  date: sessionToDelete
                    ? format(new Date(sessionToDelete.sessionDate), "MMM d, yyyy")
                    : "",
                }
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSessionToDelete(null)}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (sessionToDelete) {
                  handleDeleteSession(sessionToDelete.id);
                }
              }}
            >
              {t("session.deleteSessionConfirm", "Delete Session")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog Modal */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Recurring Session Schedule</DialogTitle>
            <DialogDescription>
              Configure the weekly meeting day and time for this client.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitSchedule} className="space-y-4">
            {/* Day of Week */}
            <div className="space-y-2">
              <Label htmlFor="schedule-day">Day of Week</Label>
              <select
                id="schedule-day"
                value={scheduleForm.scheduleDay}
                onChange={(e) =>
                  setScheduleForm({
                    ...scheduleForm,
                    scheduleDay: parseInt(e.target.value, 10),
                  })
                }
                disabled={isSubmittingSchedule}
                className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="schedule-time">Time (24h format)</Label>
              <Input
                id="schedule-time"
                type="time"
                value={scheduleForm.scheduleTime}
                onChange={(e) =>
                  setScheduleForm({
                    ...scheduleForm,
                    scheduleTime: e.target.value,
                  })
                }
                disabled={isSubmittingSchedule}
              />
              <p className="text-xs text-muted-foreground">
                Scheduled session time
              </p>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="schedule-timezone">Timezone</Label>
              <select
                id="schedule-timezone"
                value={scheduleForm.scheduleTimezone}
                onChange={(e) =>
                  setScheduleForm({
                    ...scheduleForm,
                    scheduleTimezone: e.target.value,
                  })
                }
                disabled={isSubmittingSchedule}
                className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/New_York">Eastern</option>
                <option value="America/Chicago">Central</option>
                <option value="America/Denver">Mountain</option>
                <option value="America/Los_Angeles">Pacific</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="Australia/Sydney">Australia/Sydney</option>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Client's timezone for scheduling
              </p>
            </div>

            {/* Error Message */}
            {scheduleError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  {scheduleError}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {scheduleSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  {scheduleSuccess}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseScheduleDialog}
                disabled={isSubmittingSchedule}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingSchedule}>
                {isSubmittingSchedule ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Set Schedule"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Wrapper component that provides error boundary protection
 * for the ClientDetailsPage
 */
export default function ClientDetailsPage({ user }: { user: User }) {
  return (
    <ErrorBoundary>
      <ClientDetailsPageContent user={user} />
    </ErrorBoundary>
  );
}
