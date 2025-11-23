import { useState } from "react";
import { createSomaticLog, useAction } from "wasp/client/operations";
import BodyMapSelector from "./components/BodyMapSelector";

// BodyZone type definition matching Prisma schema
type BodyZone = "HEAD" | "THROAT" | "CHEST" | "SOLAR_PLEXUS" | "BELLY" | "PELVIS" | "ARMS" | "LEGS" | "FULL_BODY";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Slider } from "../components/ui/slider";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Loader2 } from "lucide-react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const createSomaticLogFn = useAction(createSomaticLog);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedZone) {
      setErrorMessage("Please select a body zone");
      return;
    }

    if (!selectedSensation) {
      setErrorMessage("Please select a sensation");
      return;
    }

    try {
      setIsSubmitting(true);
      await createSomaticLogFn({
        bodyZone: selectedZone,
        sensation: selectedSensation,
        intensity,
        note: note.trim() || undefined,
      });

      setSuccessMessage("Sensation logged successfully!");

      // Reset form
      setSelectedZone(undefined);
      setSelectedSensation("");
      setIntensity(5);
      setNote("");

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to log sensation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log a New Sensation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Body Map Selector */}
          <div className="space-y-2">
            <Label>Select Body Zone</Label>
            <div className="flex justify-center py-4 bg-gray-50 rounded-lg">
              <BodyMapSelector
                selectedZone={selectedZone}
                onZoneSelect={setSelectedZone}
              />
            </div>
          </div>

          {/* Sensation Chips */}
          <div className="space-y-2">
            <Label>What are you feeling?</Label>
            <div className="flex flex-wrap gap-2">
              {SENSATIONS.map((sensation) => (
                <button
                  key={sensation}
                  type="button"
                  onClick={() => setSelectedSensation(sensation)}
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
                Selected: <span className="font-medium">{selectedSensation}</span>
              </p>
            )}
          </div>

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
              value={[intensity]}
              onValueChange={(value) => setIntensity(value[0])}
              disabled={isSubmitting}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Mild</span>
              <span>Intense</span>
            </div>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Notes (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Any additional details about this sensation..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                {errorMessage}
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

          {/* Submit Button */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging...
              </>
            ) : (
              "Log Sensation"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
