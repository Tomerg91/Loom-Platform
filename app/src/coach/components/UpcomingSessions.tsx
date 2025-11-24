import { useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getUpcomingSessions } from "wasp/client/operations";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Calendar, Clock, Users } from "lucide-react";
import { format, isPast } from "date-fns";

export default function UpcomingSessions() {
  const { data: upcomingSessions, isLoading, error } = useQuery(
    getUpcomingSessions,
    { limit: 10 }
  );

  const handleStartSession = (clientId: string, sessionNumber: number) => {
    window.location.href = `/coach/client/${clientId}/log-session?sessionNumber=${sessionNumber}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm">Error loading sessions</p>
        </CardContent>
      </Card>
    );
  }

  const sessions = upcomingSessions || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {sessions.map((session) => {
              const isOverdue = isPast(new Date(session.nextSessionDate));
              return (
                <div
                  key={session.clientId}
                  className={`p-4 border rounded-lg transition-colors ${
                    isOverdue
                      ? "border-red-200 bg-red-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-base">
                        {session.clientName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.clientEmail}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-blue-600">
                        #{session.sessionCount + 1}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Session
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(
                        new Date(session.nextSessionDate),
                        "EEE MMM d, yyyy"
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {session.scheduleTime}
                    </span>
                  </div>

                  {isOverdue && (
                    <div className="text-xs text-red-600 font-semibold mb-3">
                      OVERDUE
                    </div>
                  )}

                  <Button
                    onClick={() =>
                      handleStartSession(
                        session.clientId,
                        session.sessionCount + 1
                      )
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    Start Session
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              No upcoming sessions scheduled.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Set up schedules for your clients to see them here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
