import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { User } from "wasp/entities";
import type { LogSessionResponse } from "../session/operations";
import {
  useQuery,
  useAction,
  getSessionsForClient,
  getRecentSessionsForClient,
  getCoachResources,
  logSession,
} from "wasp/client/operations";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { AlertCircle, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import FormFieldWithValidation from "../components/FormFieldWithValidation";
import BodyMapSelector from "../client/components/BodyMapSelector";

function LogSessionPageContent({ user }: { user: User }) {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const clientId = clientIdParam?.trim();

  if (!clientId) {
    return <MissingLogSessionClient />;
  }

  return <LogSessionForm user={user} clientId={clientId} />;
}

function MissingLogSessionClient() {
  const navigate = useNavigate();
  const { t } = useTranslation();

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

function LogSessionForm({
  user,
  clientId,
}: {
  user: User;
  clientId: string;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  // ============================================
  // VALIDATION STATE
  // ============================================
  const [touched, setTouched] = useState({
    sessionDate: false,
    topic: false,
    sharedSummary: false,
    privateNotes: false,
  });

  const [errors, setErrors] = useState({
    sessionDate: "",
    topic: "",
    sharedSummary: "",
    privateNotes: "",
  });

  // Validation functions
  const validateField = (name: string, value: string) => {
    let error = "";

    switch (name) {
      case "sessionDate":
        if (!value) {
          error = "Session date is required";
        } else {
          const selectedDate = new Date(value);
          const now = new Date();
          if (selectedDate > now) {
            error = "Session date cannot be in the future";
          }
        }
        break;

      case "topic":
        if (value && value.length < 3) {
          error = "Topic must be at least 3 characters";
        } else if (value && value.length > 100) {
          error = "Topic cannot exceed 100 characters";
        }
        break;

      case "sharedSummary":
        if (value && value.length > 2000) {
          error = "Summary cannot exceed 2000 characters";
        }
        break;

      case "privateNotes":
        if (value && value.length > 5000) {
          error = "Private notes cannot exceed 5000 characters";
        }
        break;
    }

    return error;
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const value = formData[fieldName as keyof typeof formData];
    const stringValue = typeof value === "string" ? value : "";
    const error = validateField(fieldName, stringValue);
    setErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  const handleFieldChange = (
    fieldName: string,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (touched[fieldName as keyof typeof touched]) {
      const error = validateField(fieldName, value);
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
  };

  // Fetch sessions list for refetching after successful submission
  const { refetch: refetchSessions } = useQuery(getSessionsForClient, {
    clientId: clientId || "",
  });

  // Fetch previous session context (last session)
  const {
    data: previousSessions,
    isLoading: isContextLoading,
    error: contextError,
  } = useQuery(getRecentSessionsForClient, {
    clientId: clientId || "",
  });

  // Get the logSession action
  const logSessionFn = useAction(logSession);

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

  // Get previous session (if any)
  const previousSession = previousSessions && previousSessions.length > 0 ? previousSessions[0] : null;

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

  // Get the browser's timezone
  const getBrowserTimezone = (): string => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "Unknown";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ============================================
    // VALIDATE ALL FIELDS BEFORE SUBMIT
    // ============================================
    const newErrors = {
      sessionDate: validateField("sessionDate", formData.sessionDate),
      topic: validateField("topic", formData.topic),
      sharedSummary: validateField("sharedSummary", formData.sharedSummary),
      privateNotes: validateField("privateNotes", formData.privateNotes),
    };

    setErrors(newErrors);
    setTouched({
      sessionDate: true,
      topic: true,
      sharedSummary: true,
      privateNotes: true,
    });

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some((error) => error !== "");
    if (hasErrors) {
      setErrorMessage("Please fix validation errors before submitting");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result: LogSessionResponse = await logSessionFn({
        clientId,
        sessionDate: new Date(formData.sessionDate),
        topic: formData.topic || null,
        privateNotes: formData.privateNotes || null,
        sharedSummary: formData.sharedSummary || null,
        somaticAnchor: (formData.somaticAnchor || null) as any,
        resourceIds: formData.resourceIds,
      });

      setSuccessMessage(
        t("session.sessionLoggedSuccess", { number: result.sessionNumber })
      );

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
        navigate(`/coach/client/${clientId}`);
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
        <h1 className="text-3xl font-bold text-foreground">{t("session.logSession")}</h1>
        {sessionNumber && (
          <p className="text-muted-foreground mt-2">
            Session #{sessionNumber}
          </p>
        )}
      </div>

      {/* Two-Column Layout: Desktop 2 cols, Mobile 1 col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Previous Session Context */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">
                {t("session.previousSession")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isContextLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t("common.loading")}
                  </p>
                </div>
              ) : previousSession ? (
                <div className="space-y-4">
                  {/* Session Date */}
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">
                      {t("session.sessionDate")}
                    </p>
                    <p className="text-sm text-foreground">
                      {format(new Date(previousSession.sessionDate), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>

                  {/* Somatic Anchor */}
                  {(previousSession as any).somaticAnchor && (
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">
                        {t("session.bodyZoneDiscussed")}
                      </p>
                      <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full mt-1">
                        {t(`somatic.bodyZones.${(previousSession as any).somaticAnchor}`)}
                      </span>
                    </div>
                  )}

                  {/* Shared Summary */}
                  {previousSession.sharedSummary && (
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">
                        {t("session.sessionSummary")}
                      </p>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap line-clamp-4">
                        {previousSession.sharedSummary}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {t("session.noPreviousSessions")}
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
              <CardTitle className="text-lg">{t("session.sessionDetails")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Session Date */}
                <div className="space-y-2">
                  <Label htmlFor="sessionDate">{t("session.sessionDate")}</Label>
                  <Input
                    type="datetime-local"
                    id="sessionDate"
                    value={formData.sessionDate}
                    onChange={handleDateChange}
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("session.sessionDateHelp")}
                  </p>
                  {/* Timezone Indicator */}
                  <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900 mb-1">
                      {t("session.timezoneInfo")}
                    </p>
                    <div className="space-y-1 text-xs text-blue-800">
                      <p>
                        {t("session.yourTimezone")}:
                        <span className="font-semibold ml-1">{getBrowserTimezone()}</span>
                      </p>
                      <p className="mt-2 italic text-blue-700">
                        {t("session.timezoneNote")}
                      </p>
                    </div>
                  </div>
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
                <FormFieldWithValidation
                  label={t("session.topic")}
                  error={errors.topic}
                  touched={touched.topic}
                  success={touched.topic && !errors.topic && formData.topic.length > 0}
                  hint={t("session.topicHelp")}
                >
                  <Input
                    type="text"
                    id="topic"
                    placeholder={t("session.topicPlaceholder")}
                    value={formData.topic}
                    onChange={(e) => handleFieldChange("topic", e.target.value)}
                    onBlur={() => handleFieldBlur("topic")}
                    disabled={isSubmitting}
                    className={`${
                      touched.topic && errors.topic ? "border-red-500" : ""
                    } ${
                      touched.topic && !errors.topic && formData.topic ? "border-green-500" : ""
                    }`}
                  />
                </FormFieldWithValidation>

                {/* Somatic Anchor */}
                <div className="space-y-2">
                  <Label htmlFor="somaticAnchor">
                    {t("session.bodyZoneDiscussed")}
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
                    <option value="">{t("session.noAnchor")}</option>
                    <option value="HEAD">{t("somatic.bodyZones.HEAD")}</option>
                    <option value="THROAT">{t("somatic.bodyZones.THROAT")}</option>
                    <option value="CHEST">{t("somatic.bodyZones.CHEST")}</option>
                    <option value="SOLAR_PLEXUS">{t("somatic.bodyZones.SOLAR_PLEXUS")}</option>
                    <option value="BELLY">{t("somatic.bodyZones.BELLY")}</option>
                    <option value="PELVIS">{t("somatic.bodyZones.PELVIS")}</option>
                    <option value="ARMS">{t("somatic.bodyZones.ARMS")}</option>
                    <option value="LEGS">{t("somatic.bodyZones.LEGS")}</option>
                    <option value="FULL_BODY">{t("somatic.bodyZones.FULL_BODY")}</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {t("session.bodyZoneHelp")}
                  </p>
                </div>

                {/* Shared Summary */}
                <FormFieldWithValidation
                  label={t("session.sharedSummary")}
                  error={errors.sharedSummary}
                  touched={touched.sharedSummary}
                  success={touched.sharedSummary && !errors.sharedSummary && formData.sharedSummary.length > 0}
                  hint={`${t("session.sharedSummaryHelp")} (${formData.sharedSummary.length}/2000)`}
                >
                  <textarea
                    id="sharedSummary"
                    placeholder={t("session.sharedSummaryPlaceholder")}
                    value={formData.sharedSummary}
                    onChange={(e) => handleFieldChange("sharedSummary", e.target.value)}
                    onBlur={() => handleFieldBlur("sharedSummary")}
                    disabled={isSubmitting}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      touched.sharedSummary && errors.sharedSummary ? "border-red-500" : ""
                    } ${
                      touched.sharedSummary && !errors.sharedSummary && formData.sharedSummary ? "border-green-500" : ""
                    }`}
                  />
                </FormFieldWithValidation>

                {/* Private Notes */}
                <FormFieldWithValidation
                  label={t("session.privateNotes")}
                  error={errors.privateNotes}
                  touched={touched.privateNotes}
                  success={touched.privateNotes && !errors.privateNotes && formData.privateNotes.length > 0}
                  hint={`${t("session.privateNotesHelp")} (${formData.privateNotes.length}/5000)`}
                >
                  <textarea
                    id="privateNotes"
                    placeholder={t("session.privateNotesPlaceholder")}
                    value={formData.privateNotes}
                    onChange={(e) => handleFieldChange("privateNotes", e.target.value)}
                    onBlur={() => handleFieldBlur("privateNotes")}
                    disabled={isSubmitting}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      touched.privateNotes && errors.privateNotes ? "border-red-500" : ""
                    } ${
                      touched.privateNotes && !errors.privateNotes && formData.privateNotes ? "border-green-500" : ""
                    }`}
                  />
                </FormFieldWithValidation>

                {/* Attach Resources */}
                <div className="space-y-2">
                  <Label>{t("session.attachResources")}</Label>
                  {isResourcesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("session.loadingResources")}
                    </div>
                  ) : resourcesError ? (
                    <p className="text-sm text-red-600">
                      {t("session.errorLoadingResources")}
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
                      {t("session.noResourcesAvailable")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("session.selectResourcesHelp")}
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
                    {isSubmitting ? t("session.saving") : t("session.logSession")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    disabled={isSubmitting}
                  >
                    {t("common.cancel")}
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

/**
 * Wrapper component that provides error boundary protection
 * for the LogSessionPage
 */
export default function LogSessionPage({
  user,
}: {
  user: User;
}) {
  return (
    <ErrorBoundary>
      <LogSessionPageContent user={user} />
    </ErrorBoundary>
  );
}
