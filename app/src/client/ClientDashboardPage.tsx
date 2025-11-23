import type { User } from "wasp/entities";
import { getSomaticLogs, useQuery } from "wasp/client/operations";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import SomaticLogForm from "./SomaticLogForm";
import { formatDistanceToNow } from "date-fns";

export default function ClientDashboardPage({ user }: { user: User }) {
  const { data: somaticLogs, refetch } = useQuery(getSomaticLogs);

  const handleLogSuccess = () => {
    // Refetch logs when a new one is created
    refetch();
  };

  return (
    <div className="mt-10 px-6 pb-12">
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
            <CardTitle>Recent Sensations</CardTitle>
          </CardHeader>
          <CardContent>
            {!somaticLogs || somaticLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No logs yet. Start by creating your first body map entry.
              </p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {somaticLogs.map((log) => (
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
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
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
    </div>
  );
}
