import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { User } from "wasp/entities";
import {
  inviteClient,
  getPendingInvitations,
  getClientsForCoach,
  useQuery,
  useAction,
  getOnboardingStatus,
  updateOnboardingStatus,
  cancelInvitation,
} from "wasp/client/operations";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  CheckCircle,
  Mail,
  Clock,
  Users,
  Calendar,
  Plus,
  Lock,
  X,
} from "lucide-react";
import FormFieldWithValidation from "../components/FormFieldWithValidation";
import { formatRelativeTime } from "../shared/date";
import UpcomingSessions from "./components/UpcomingSessions";
import OnboardingModal from "../components/OnboardingModal";
import AddOfflineClientDialog from "./components/AddOfflineClientDialog";

export default function CoachDashboardPage({ user }: { user: User }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAddOfflineDialog, setShowAddOfflineDialog] = useState(false);

  // ============================================
  // EMAIL VALIDATION STATE
  // ============================================
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState("");

  // ============================================
  // CANCEL INVITATION STATE
  // ============================================
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [invitationToCancel, setInvitationToCancel] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const validateEmail = (value: string): string => {
    if (!value) {
      return "Email is required";
    }

    // RFC 5322 simplified email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }

    return "";
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailTouched) {
      setEmailError(validateEmail(value));
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  const inviteClientFn = useAction(inviteClient);
  const cancelInvitationFn = useAction(cancelInvitation);
  const { data: pendingInvitations, refetch } = useQuery(getPendingInvitations);
  const { data: clients, refetch: refetchClients } =
    useQuery(getClientsForCoach);
  const { data: onboardingStatus } = useQuery(getOnboardingStatus);
  const updateOnboarding = useAction(updateOnboardingStatus);

  useEffect(() => {
    // Show onboarding if not completed
    if (onboardingStatus && !onboardingStatus.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [onboardingStatus]);

  const handleInviteClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    // Validate email before submitting
    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      setEmailTouched(true);
      return;
    }

    try {
      setIsInviting(true);
      await inviteClientFn({ email });
      setSuccessMessage(`Invitation sent to ${email}!`);
      setEmail("");
      setEmailTouched(false);
      setEmailError("");
      refetch(); // Refresh pending invitations list
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelClick = (inv: { id: string; email: string }) => {
    setInvitationToCancel(inv);
    setCancelError(null);
  };

  const handleConfirmCancel = async () => {
    if (!invitationToCancel) return;

    try {
      setCancelingId(invitationToCancel.id);
      setCancelError(null);
      await cancelInvitationFn({ invitationId: invitationToCancel.id });
      setInvitationToCancel(null);
      refetch(); // Refresh pending invitations list
    } catch (error: any) {
      setCancelError(error.message || "Failed to cancel invitation");
    } finally {
      setCancelingId(null);
    }
  };

  const handleOnboardingComplete = async (steps: Record<string, boolean>) => {
    try {
      await updateOnboarding({
        onboardingCompleted: true,
        onboardingSteps: steps,
      });
      setShowOnboarding(false);
    } catch (error) {
      console.error("Failed to update onboarding:", error);
    }
  };

  return (
    <>
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        userRole={user.role}
        onboardingSteps={onboardingStatus?.onboardingSteps}
        onMarkComplete={handleOnboardingComplete}
      />

      <AddOfflineClientDialog
        isOpen={showAddOfflineDialog}
        onClose={() => setShowAddOfflineDialog(false)}
        onSuccess={() => refetchClients()}
      />

      <div className="mt-10 px-6 grain">
        <div className="mb-8 reveal">
          <h1 className="text-4xl font-display font-bold text-foreground leading-tight">
            Welcome, Coach {user.username || user.email}
          </h1>
          <p className="text-muted-foreground mt-3 font-body text-lg">
            Manage your clients and track their somatic progress
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* Upcoming Sessions - Full Width */}
          <UpcomingSessions />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 reveal-stagger">
          {/* My Clients Card */}
          <Card className="hover-scale-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clients && clients.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {clients.map((client) => {
                    const isOffline = !client.userId;
                    const displayName =
                      client.username || client.displayName || "Client";

                    return (
                      <div
                        key={client.id}
                        role="button"
                        tabIndex={0}
                        className="p-3 border border-border rounded-xl hover-scale-subtle cursor-pointer bg-card-subtle transition-colors"
                        onClick={() => {
                          navigate(`/coach/client/${client.id}`);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigate(`/coach/client/${client.id}`);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="font-medium text-sm">
                            {displayName}
                          </div>
                          {isOffline && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              <Lock className="h-2.5 w-2.5" />
                              Offline
                            </span>
                          )}
                        </div>
                        {client.email && (
                          <div className="text-xs text-muted-foreground">
                            {client.email}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {client.somaticLogCount} logs
                          </span>
                          {client.lastLogDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatRelativeTime(client.lastLogDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No clients yet. Send an invitation or add an offline client to
                  get started!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Invite New Client Card */}
          <Card className="hover-scale-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Mail className="h-5 w-5" />
                Invite New Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteClient} className="space-y-4">
                <FormFieldWithValidation
                  label="Email Address"
                  error={emailError}
                  touched={emailTouched}
                  success={emailTouched && !emailError && email.length > 0}
                  required={true}
                  hint="We'll send an invitation link to this email address"
                >
                  <Input
                    type="email"
                    placeholder="client@example.com"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    disabled={isInviting}
                    className={`${
                      emailTouched && emailError ? "border-red-500" : ""
                    } ${
                      emailTouched && !emailError && email
                        ? "border-green-500"
                        : ""
                    }`}
                  />
                </FormFieldWithValidation>
                <Button
                  type="submit"
                  disabled={isInviting || (emailTouched && !!emailError)}
                  className="w-full"
                >
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

          {/* Add Offline Client Card */}
          <Card className="hover-scale-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Plus className="h-5 w-5" />
                Add Offline Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                {t(
                  "coach.addOfflineClientHelp",
                  "Create a client profile for someone who won't use the app themselves.",
                )}
              </p>
              <Button
                onClick={() => setShowAddOfflineDialog(true)}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("coach.addOfflineClientButton", "Add Offline Client")}
              </Button>
            </CardContent>
          </Card>

          {/* Pending Invitations Card */}
          <Card className="hover-scale-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
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
                      className="text-sm p-2 bg-card-subtle rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium">{inv.email}</div>
                          <div className="text-xs text-muted-foreground">
                            Sent {new Date(inv.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCancelClick({ id: inv.id, email: inv.email })
                          }
                          disabled={cancelingId === inv.id}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No pending invitations
                </p>
              )}
              {cancelError && (
                <Alert className="mt-4 bg-red-50 border-red-200">
                  <AlertDescription className="text-red-800">
                    {cancelError}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Subscription Card */}
          <Card className="hover-scale-subtle">
            <CardHeader>
              <CardTitle className="font-display">Subscription</CardTitle>
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

      {/* Cancel Invitation Confirmation Dialog */}
      <AlertDialog
        open={!!invitationToCancel}
        onOpenChange={(open) => {
          if (!open) setInvitationToCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Cancel Invitation?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel the invitation to{" "}
            <strong>{invitationToCancel?.email}</strong>? They will no longer be
            able to use this link to join.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end mt-4">
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelingId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelingId ? "Canceling..." : "Yes, Cancel Invitation"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
