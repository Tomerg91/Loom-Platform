import { useState, useEffect } from "react";
import { createSomaticLog, useAction } from "wasp/client/operations";
import BodyMapSelector from "./components/BodyMapSelector";
import { useTranslation } from "react-i18next";
import { useSomaticLogDraft } from "./hooks/use-somatic-log-draft";
import { useRetryOperation } from "./hooks/use-retry-operation";
import { useSomaticLogErrorHandler } from "./hooks/use-somatic-log-error-handler";

// BodyZone type definition matching Prisma schema
type BodyZone =
  | "HEAD"
  | "THROAT"
  | "CHEST"
  | "SOLAR_PLEXUS"
  | "BELLY"
  | "PELVIS"
  | "ARMS"
  | "LEGS"
  | "FULL_BODY";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Slider } from "../components/ui/slider";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Loader2, Eye, EyeOff, AlertCircle, RefreshCw } from "lucide-react";
import FormFieldWithValidation from "../components/FormFieldWithValidation";
import VoiceInput from "./components/VoiceInput";
import { toast } from "../hooks/use-toast";
import i18n from "./i18n";

const SENSATIONS = [
  "Tight",
  "Hot",
  "Cold",
  "Heavy",
  "Vibrating",
  "Empty",
] as const;

type SomaticLogFormProps = {
  onSuccess?: () => void;
};

export default function SomaticLogForm({ onSuccess }: SomaticLogFormProps) {
  const [selectedZone, setSelectedZone] = useState<BodyZone | undefined>();
  const [selectedSensation, setSelectedSensation] = useState<string>("");
  const [intensity, setIntensity] = useState<number>(5);
  const [note, setNote] = useState<string>("");
  const [sharedWithCoach, setSharedWithCoach] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const { t } = useTranslation();

  // Initialize custom hooks
  const { loadDraft, saveDraft, clearDraft, isDraftLoaded, setIsDraftLoaded } =
    useSomaticLogDraft();
  const { executeWithRetry, retryState, resetRetryState } = useRetryOperation({
    maxRetries: 3,
    initialDelayMs: 1000,
  });
  const { parseError, shouldShowRetryButton } = useSomaticLogErrorHandler();

  // ============================================
  // VALIDATION STATE
  // ============================================
  const [touched, setTouched] = useState({
    bodyZone: false,
    sensation: false,
    note: false,
  });

  const [errors, setErrors] = useState({
    bodyZone: "",
    sensation: "",
    note: "",
  });

  const createSomaticLogFn = useAction(createSomaticLog);

  // ============================================
  // LOAD DRAFT ON MOUNT
  // ============================================
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setSelectedZone(draft.selectedZone);
      setSelectedSensation(draft.selectedSensation);
      setIntensity(draft.intensity);
      setNote(draft.note);
      setSharedWithCoach(draft.sharedWithCoach);
      setDraftAvailable(true);
    }
    setIsDraftLoaded(true);
  }, [loadDraft, setIsDraftLoaded]);

  // ============================================
  // AUTO-SAVE DRAFT ON FORM CHANGES
  // ============================================
  useEffect(() => {
    if (!isDraftLoaded) return; // Don't save while loading

    // Debounce draft saving (only save if form has substantive content)
    const timeout = setTimeout(() => {
      if (selectedZone || selectedSensation || note) {
        saveDraft({
          selectedZone: selectedZone ?? undefined,
          selectedSensation,
          intensity,
          note,
          sharedWithCoach,
        });
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [
    selectedZone,
    selectedSensation,
    intensity,
    note,
    sharedWithCoach,
    isDraftLoaded,
    saveDraft,
  ]);

  // ============================================
  // VALIDATION FUNCTIONS
  // ============================================
  const validateField = (name: string, value: any) => {
    let error = "";

    switch (name) {
      case "bodyZone":
        if (!value) {
          error = t(
            "somatic.validation.bodyZoneRequired",
            "Please select a body zone",
          );
        }
        break;

      case "sensation":
        if (!value) {
          error = t(
            "somatic.validation.sensationRequired",
            "Please select a sensation",
          );
        }
        break;

      case "note":
        if (value && value.length > 1000) {
          error = t(
            "somatic.validation.noteTooLong",
            "Notes cannot exceed 1000 characters",
          );
        }
        break;
    }

    return error;
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const value =
      fieldName === "bodyZone"
        ? selectedZone
        : fieldName === "sensation"
          ? selectedSensation
          : note;
    const error = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  const handleZoneChange = (zone: BodyZone | undefined) => {
    setSelectedZone(zone);
    if (touched.bodyZone) {
      const error = validateField("bodyZone", zone);
      setErrors((prev) => ({ ...prev, bodyZone: error }));
    }
  };

  const handleSensationChange = (sensation: string) => {
    setSelectedSensation(sensation);
    if (touched.sensation) {
      const error = validateField("sensation", sensation);
      setErrors((prev) => ({ ...prev, sensation: error }));
    }
  };

  const handleNoteChange = (value: string) => {
    setNote(value);
    if (touched.note) {
      const error = validateField("note", value);
      setErrors((prev) => ({ ...prev, note: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    resetRetryState();

    // ============================================
    // VALIDATE ALL FIELDS BEFORE SUBMIT
    // ============================================
    const newErrors = {
      bodyZone: validateField("bodyZone", selectedZone),
      sensation: validateField("sensation", selectedSensation),
      note: validateField("note", note),
    };

    setErrors(newErrors);
    setTouched({
      bodyZone: true,
      sensation: true,
      note: true,
    });

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some((error) => error !== "");
    if (hasErrors) {
      setErrorMessage(
        t(
          "somatic.validation.fixErrors",
          "Please fix validation errors before submitting",
        ),
      );
      setShowRetryButton(false);
      return;
    }

    // ============================================
    // SUBMIT WITH RETRY LOGIC
    // ============================================
    try {
      setIsSubmitting(true);
      setShowRetryButton(false);

      const { success, error: retryError } = await executeWithRetry(
        async () => {
          return await createSomaticLogFn({
            bodyZone: selectedZone!,
            sensation: selectedSensation,
            intensity,
            note: note.trim() || undefined,
            sharedWithCoach,
          });
        },
        (attemptNumber, error, nextRetryIn) => {
          console.log(
            `Retry attempt ${attemptNumber}, next retry in ${nextRetryIn}ms:`,
            error,
          );
        },
      );

      if (!success) {
        // Retry mechanism exhausted
        const errorDetail = parseError(retryError);
        setErrorMessage(errorDetail.userMessage);
        setShowRetryButton(shouldShowRetryButton(errorDetail));

        // Draft is automatically saved, no need to clear it
        return;
      }

      // ============================================
      // SUCCESS: CLEAR DRAFT AND RESET FORM
      // ============================================
      setSuccessMessage(
        t("somatic.success.logged", "Sensation logged successfully!"),
      );
      clearDraft(); // Clear the draft after successful submission

      // Reset form
      setSelectedZone(undefined);
      setSelectedSensation("");
      setIntensity(5);
      setNote("");
      setSharedWithCoach(true);
      setDraftAvailable(false);

      // Reset validation state
      setTouched({
        bodyZone: false,
        sensation: false,
        note: false,
      });
      setErrors({
        bodyZone: "",
        sensation: "",
        note: "",
      });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      // Fallback for unexpected errors
      const errorDetail = parseError(error);
      setErrorMessage(errorDetail.userMessage);
      setShowRetryButton(shouldShowRetryButton(errorDetail));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // HANDLE RETRY
  // ============================================
  const handleRetry = async () => {
    setShowRetryButton(false);
    await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log a New Sensation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Body Map Selector */}
          <FormFieldWithValidation
            label="Select Body Zone"
            error={errors.bodyZone}
            touched={touched.bodyZone}
            success={touched.bodyZone && !errors.bodyZone && !!selectedZone}
            required={true}
          >
            <div
              className="flex justify-center py-4 bg-gray-50 rounded-lg"
              onBlur={() => handleFieldBlur("bodyZone")}
            >
              <BodyMapSelector
                selectedZone={selectedZone}
                onZoneSelect={handleZoneChange}
              />
            </div>
          </FormFieldWithValidation>

          {/* Sensation Chips */}
          <FormFieldWithValidation
            label="What are you feeling?"
            error={errors.sensation}
            touched={touched.sensation}
            success={
              touched.sensation && !errors.sensation && !!selectedSensation
            }
            required={true}
          >
            <div
              className="flex flex-wrap gap-2"
              onBlur={() => handleFieldBlur("sensation")}
            >
              {SENSATIONS.map((sensation) => (
                <button
                  key={sensation}
                  type="button"
                  onClick={() => handleSensationChange(sensation)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedSensation === sensation
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                  disabled={isSubmitting}
                >
                  {sensation}
                </button>
              ))}
            </div>
            {selectedSensation && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected:{" "}
                <span className="font-medium">{selectedSensation}</span>
              </p>
            )}
          </FormFieldWithValidation>

          {/* Intensity Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Intensity</Label>
              <span className="text-sm font-medium text-primary">
                {intensity}/10
              </span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={[intensity ?? 5]}
              onValueChange={(value) => {
                if (value && value.length > 0) {
                  setIntensity(value[0] ?? 5);
                }
              }}
              disabled={isSubmitting}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Mild</span>
              <span>Intense</span>
            </div>
          </div>

          {/* Optional Note */}
          <FormFieldWithValidation
            label={
              <div className="flex items-center justify-between w-full">
                <span>Notes (Optional)</span>
                <VoiceInput
                  onTranscript={(text: string) => {
                    // Append text with a space if note is not empty
                    const newNote = note ? `${note} ${text}` : text;
                    // Truncate if exceeds limit
                    if (newNote.length <= 1000) {
                      handleNoteChange(newNote);
                    } else {
                      handleNoteChange(newNote.slice(0, 1000));
                      toast({
                        title: "Note limit reached",
                        description:
                          "Your note has been truncated to 1000 characters.",
                        variant: "destructive", // Changed from warning to destructive as warning might not exist
                      });
                    }
                  }}
                  language={i18n.language === "he" ? "he-IL" : "en-US"}
                />
              </div>
            }
            error={errors.note}
            touched={touched.note}
            success={touched.note && !errors.note && note.length > 0}
            hint={`${note.length}/1000 characters`}
          >
            <Textarea
              id="note"
              placeholder="Any additional details about this sensation..."
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              onBlur={() => handleFieldBlur("note")}
              disabled={isSubmitting}
              rows={3}
              className={`resize-none ${
                touched.note && errors.note ? "border-red-500" : ""
              } ${
                touched.note && !errors.note && note ? "border-green-500" : ""
              }`}
            />
          </FormFieldWithValidation>

          {/* Share with Coach Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              {sharedWithCoach ? (
                <Eye className="h-5 w-5 text-primary" />
              ) : (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label className="font-medium cursor-pointer">
                  {t("sharing.sharedWithCoach")}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("sharing.shareExplanation")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSharedWithCoach(!sharedWithCoach)}
              disabled={isSubmitting}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                sharedWithCoach ? "bg-primary" : "bg-muted-foreground"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  sharedWithCoach ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Draft Recovery Message */}
          {draftAvailable && !errorMessage && !successMessage && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  {t(
                    "somatic.draft.recovered",
                    "We've recovered your previous draft. Feel free to edit or submit it.",
                  )}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {errorMessage && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{errorMessage}</p>
                    {retryState.nextRetryIn && retryState.isRetrying && (
                      <p className="text-sm mt-1 opacity-75">
                        {t(
                          "somatic.error.retrying",
                          "Retrying in {{time}}ms...",
                          {
                            time: retryState.nextRetryIn,
                          },
                        )}
                      </p>
                    )}
                    {showRetryButton && (
                      <p className="text-sm mt-1 opacity-75">
                        {t(
                          "somatic.error.savedDraft",
                          "Your work is saved. You can try again.",
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {successMessage && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {retryState.isRetrying ? "Retrying..." : "Logging..."}
                </>
              ) : (
                t("somatic.action.log", "Log Sensation")
              )}
            </Button>

            {/* Retry Button */}
            {showRetryButton && !isSubmitting && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRetry}
                className="flex gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {t("somatic.action.retry", "Retry")}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
