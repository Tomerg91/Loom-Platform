import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { User } from "wasp/entities";
import {
  logSession,
  useQuery,
  useAction,
  getSessionsForClient,
} from "wasp/client/operations";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

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

  // Pre-fill session number from search params
  useEffect(() => {
    if (sessionNumberParam) {
      setSessionNumber(parseInt(sessionNumberParam, 10));
    }
  }, [sessionNumberParam]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setFormData({ ...formData, sessionDate: newDate });
    setDateWarning(null);
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
    <div className="mt-10 px-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Log Session</h1>
        {sessionNumber && (
          <p className="text-muted-foreground mt-2">
            Session #{sessionNumber}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
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
                <AlertDescription className="text-yellow-800">
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
                rows={5}
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
                rows={4}
                className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-muted-foreground">
                Private notes visible only to you
              </p>
            </div>

            {/* Messages */}
            {successMessage && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {errorMessage && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
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
  );
}
