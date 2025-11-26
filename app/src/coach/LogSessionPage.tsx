import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { User } from "wasp/entities";
import {
  logSession,
  useQuery,
  useAction,
  getSessionsForClient,
  getSessionContext,
  getCoachResources,
} from "wasp/client/operations";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import BodyMapSelector from "../client/components/BodyMapSelector";

export default function LogSessionPage({
  user,
}: {
  user: User;
}) {
  const { clientId } = useParams<{ clientId: string }>();
  const [searchParams] = useSearchParams();
  const sessionNumberParam = searchParams.get("sessionNumber");

  const [formData, setFormData] = useState({
    sessionDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    topic: "",
    privateNotes: "",
    sharedSummary: "",
    somaticAnchor: "",
    resourceIds: [] as string[],
  });

  const [sessionNumber, setSessionNumber] = useState<number | null>(null);
  const [dateWarning, setDateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const logSessionFn = useAction(logSession);
  const { refetch: refetchSessions } = useQuery(getSessionsForClient, {
    clientId: clientId || "",
  });

  // Fetch session context (somatic logs for heatmap)
  const {
    data: contextData,
    isLoading: isContextLoading,
    error: contextError,
  } = useQuery(getSessionContext, {
    clientId: clientId || "",
  });

  // Fetch available resources for this coach
  const {
    data: resourcesData,
    isLoading: isResourcesLoading,
    error: resourcesError,
  } = useQuery(getCoachResources);

  // Pre-fill session number from search params
  useEffect(() => {
    if (sessionNumberParam) {
      setSessionNumber(parseInt(sessionNumberParam, 10));
    }
  }, [sessionNumberParam]);

  // Calculate heatmap data from somatic logs
  const calculateHeatmapData = () => {
    if (!contextData?.somaticLogs) return [];

    const zones = new Map<string, { sum: number; count: number }>();

    contextData.somaticLogs.forEach((log) => {
      const existing = zones.get(log.bodyZone) || { sum: 0, count: 0 };
      zones.set(log.bodyZone, {
        sum: existing.sum + log.intensity,
        count: existing.count + 1,
      });
    });

    return Array.from(zones.entries()).map(([zone, data]) => ({
      zone: zone as any,
      intensity: Math.round(data.sum / data.count),
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setFormData({ ...formData, sessionDate: newDate });
    setDateWarning(null);
  };

  const handleResourceToggle = (resourceId: string) => {
    setFormData((prev) => ({
      ...prev,
      resourceIds: prev.resourceIds.includes(resourceId)
        ? prev.resourceIds.filter((id) => id !== resourceId)
        : [...prev.resourceIds, resourceId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId) {
      setErrorMessage("Client ID is missing");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await logSessionFn({
        clientId,
        sessionDate: new Date(formData.sessionDate),
        topic: formData.topic || null,
        privateNotes: formData.privateNotes || null,
        sharedSummary: formData.sharedSummary || null,
        somaticAnchor: (formData.somaticAnchor || null) as any,
        resourceIds: formData.resourceIds,
      });

      setSuccessMessage(
        `Session #${result.sessionNumber} logged successfully!`
      );
      if (result.dateWarning) {
        setDateWarning(result.dateWarning);
      }

      // Reset form
      setFormData({
        sessionDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        topic: "",
        privateNotes: "",
        sharedSummary: "",
        somaticAnchor: "",
        resourceIds: [],
      });

      // Refetch sessions list
      refetchSessions();

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = `/coach/client/${clientId}`;
      }, 2000);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to log session");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-10 px-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Log Session</h1>
        {sessionNumber && (
          <p className="text-muted-foreground mt-2">
            Session #{sessionNumber}
          </p>
        )}
      </div>

      {/* Two-Column Layout: Desktop 2 cols, Mobile 1 col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: The Briefing */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">
                Recent Somatic Activity (Last 14 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isContextLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Loading client context...
                  </p>
                </div>
              ) : contextError ? (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 text-sm">
                    Unable to load somatic logs. Proceeding with session log...
                  </AlertDescription>
                </Alert>
              ) : contextData?.somaticLogs && contextData.somaticLogs.length > 0 ? (
                <div className="space-y-4">
                  <BodyMapSelector
                    mode="readonly"
                    highlightedZones={calculateHeatmapData()}
                  />
                  <div className="bg-gray-50 rounded-md p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">
                      Found {contextData.somaticLogs.length} log
                      {contextData.somaticLogs.length !== 1 ? "s" : ""} from
                      the last 14 days
                    </p>
                    <p>
                      Review the heatmap above to understand where your client
                      has been experiencing sensations.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No somatic logs recorded in the last 14 days
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: The Log Form */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Session Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Session Date */}
                <div className="space-y-2">
                  <Label htmlFor="sessionDate">Session Date & Time</Label>
                  <Input
                    type="datetime-local"
                    id="sessionDate"
                    value={formData.sessionDate}
                    onChange={handleDateChange}
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Date and time when the session took place
                  </p>
                </div>

                {dateWarning && (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 text-sm">
                      {dateWarning}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Topic */}
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic (Optional)</Label>
                  <Input
                    type="text"
                    id="topic"
                    placeholder="e.g., Work Stress, Anxiety Management"
                    value={formData.topic}
                    onChange={(e) =>
                      setFormData({ ...formData, topic: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Main topic or focus of this session
                  </p>
                </div>

                {/* Somatic Anchor */}
                <div className="space-y-2">
                  <Label htmlFor="somaticAnchor">
                    Body Zone Discussed (Optional)
                  </Label>
                  <select
                    id="somaticAnchor"
                    value={formData.somaticAnchor}
                    onChange={(e) =>
                      setFormData({ ...formData, somaticAnchor: e.target.value })
                    }
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- No anchor --</option>
                    <option value="HEAD">Head</option>
                    <option value="THROAT">Throat</option>
                    <option value="CHEST">Chest</option>
                    <option value="SOLAR_PLEXUS">Solar Plexus</option>
                    <option value="BELLY">Belly</option>
                    <option value="PELVIS">Pelvis</option>
                    <option value="ARMS">Arms</option>
                    <option value="LEGS">Legs</option>
                    <option value="FULL_BODY">Full Body</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Which body zone was the focus of this session?
                  </p>
                </div>

                {/* Shared Summary */}
                <div className="space-y-2">
                  <Label htmlFor="sharedSummary">
                    Session Summary (Visible to Client)
                  </Label>
                  <textarea
                    id="sharedSummary"
                    placeholder="What happened in this session? What key insights did we explore?"
                    value={formData.sharedSummary}
                    onChange={(e) =>
                      setFormData({ ...formData, sharedSummary: e.target.value })
                    }
                    disabled={isSubmitting}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be visible to your client
                  </p>
                </div>

                {/* Private Notes */}
                <div className="space-y-2">
                  <Label htmlFor="privateNotes">
                    Private Notes (Coach Only)
                  </Label>
                  <textarea
                    id="privateNotes"
                    placeholder="Personal observations, next steps, follow-up items..."
                    value={formData.privateNotes}
                    onChange={(e) =>
                      setFormData({ ...formData, privateNotes: e.target.value })
                    }
                    disabled={isSubmitting}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Private notes visible only to you
                  </p>
                </div>

                {/* Attach Resources */}
                <div className="space-y-2">
                  <Label>Attach Resources (Homework)</Label>
                  {isResourcesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading resources...
                    </div>
                  ) : resourcesError ? (
                    <p className="text-sm text-red-600">
                      Error loading resources
                    </p>
                  ) : resourcesData && resourcesData.length > 0 ? (
                    <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                      {resourcesData.map((resource) => (
                        <div key={resource.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id={`resource-${resource.id}`}
                            checked={formData.resourceIds.includes(
                              resource.id
                            )}
                            onChange={() =>
                              handleResourceToggle(resource.id)
                            }
                            disabled={isSubmitting}
                            className="mt-1"
                          />
                          <label
                            htmlFor={`resource-${resource.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            <p className="font-medium text-foreground">
                              {resource.name}
                            </p>
                            {resource.description && (
                              <p className="text-xs text-muted-foreground">
                                {resource.description}
                              </p>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No resources available. Upload resources in your library
                      first.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Select resources to attach as homework for this session
                  </p>
                </div>

                {/* Messages */}
                {successMessage && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 text-sm">
                      {successMessage}
                    </AlertDescription>
                  </Alert>
                )}

                {errorMessage && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800 text-sm">
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isSubmitting ? "Saving..." : "Log Session"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.history.back()}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
