import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Calendar, Clock, Users } from "lucide-react";
import { format, isPast } from "date-fns";

export default function UpcomingSessions() {
  // NOTE: getUpcomingSessions operation was removed (Module 10 - incomplete)
  // Showing placeholder until recurring sessions feature is restored
  const isLoading = false;
  const error: Error | null = null;
  const upcomingSessions: Array<{
    client: { id: string; user: { username?: string } };
    nextSessionDate: Date;
  }> = [];

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
        {/* NOTE: getUpcomingSessions operation was removed (Module 10 - incomplete) */}
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">
            Upcoming sessions feature is currently unavailable.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Please use the Client Details page to manage sessions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
