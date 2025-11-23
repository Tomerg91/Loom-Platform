import { useState } from "react";
import type { User } from "wasp/entities";
import {
  inviteClient,
  getPendingInvitations,
  useQuery,
  useAction,
} from "wasp/client/operations";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription } from "../components/ui/alert";
import { CheckCircle, Mail, Clock } from "lucide-react";

export default function CoachDashboardPage({ user }: { user: User }) {
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inviteClientFn = useAction(inviteClient);
  const { data: pendingInvitations, refetch } = useQuery(getPendingInvitations);

  const handleInviteClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      setIsInviting(true);
      await inviteClientFn({ email });
      setSuccessMessage(`Invitation sent to ${email}!`);
      setEmail("");
      refetch(); // Refresh pending invitations list
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="mt-10 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, Coach {user.username || user.email}
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your clients and track their somatic progress
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Invite New Client Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invite New Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInviteClient} className="space-y-4">
              <Input
                type="email"
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isInviting}
              />
              <Button type="submit" disabled={isInviting} className="w-full">
                {isInviting ? "Sending..." : "Send Invitation"}
              </Button>
            </form>

            {successMessage && (
              <Alert className="mt-4 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {errorMessage && (
              <Alert className="mt-4 bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingInvitations && pendingInvitations.length > 0 ? (
              <ul className="space-y-2">
                {pendingInvitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="text-sm p-2 bg-gray-50 rounded border"
                  >
                    <div className="font-medium">{inv.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Sent {new Date(inv.createdAt).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                No pending invitations
              </p>
            )}
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {user.subscriptionStatus === "active"
                ? `Active - ${user.subscriptionPlan} Plan`
                : "No active subscription"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
