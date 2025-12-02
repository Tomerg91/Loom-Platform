import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Calendar, Users } from "lucide-react";

export default function UpcomingSessions() {
  // NOTE: getUpcomingSessions operation was removed (Module 10 - incomplete)
  // Showing placeholder until recurring sessions feature is restored
  const isLoading = false;
  const error: Error | null = null;

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
