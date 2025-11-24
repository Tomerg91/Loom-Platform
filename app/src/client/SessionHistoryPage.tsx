import { useState } from "react";
import type { User } from "wasp/entities";
import { getSessionsForClient, useQuery } from "wasp/client/operations";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { ChevronDown, ChevronUp, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

export default function SessionHistoryPage({ user }: { user: User }) {
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Get client profile ID from an endpoint or local storage/context
  // For now, we'll make a query that returns it
  const clientId = (user as any).clientProfile?.id;

  const { data: response, isLoading, error } = useQuery(getSessionsForClient, {
    clientId: clientId || "",
  });

  if (!clientId) {
    return (
      <div className="mt-10 px-6">
        <Alert className="bg-yellow-50 border-yellow-200">
          <Calendar className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You are not set up as a client. Please contact your coach.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-10 px-6">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Session History
        </h1>
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 px-6">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Session History
        </h1>
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-800">
            Error loading session history
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const sessions = response?.sessions || [];
  const total = response?.total || 0;

  return (
    <div className="mt-10 px-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Session History</h1>
        <p className="text-muted-foreground mt-2">
          {total} session{total !== 1 ? "s" : ""} completed
        </p>
      </div>

      {sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session, index) => (
            <Card
              key={session.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() =>
                setExpandedSessionId(
                  expandedSessionId === session.id ? null : session.id
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
                            "MMM d, yyyy"
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
                  {session.sharedSummary ? (
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">
                        Session Summary
                      </h3>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {session.sharedSummary}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground italic">
                        No summary available for this session.
                      </p>
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
                No Sessions Yet
              </h3>
              <p className="text-muted-foreground">
                Your session history will appear here as you complete sessions
                with your coach.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
