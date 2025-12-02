import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import type { User } from "wasp/entities";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  onboardingSteps?: Record<string, boolean> | null;
  onMarkComplete: (steps: Record<string, boolean>) => Promise<void>;
}

export default function OnboardingModal({
  isOpen,
  onClose,
  userRole,
  onboardingSteps = null,
  onMarkComplete,
}: OnboardingModalProps) {
  const { t } = useTranslation();
  const [localSteps, setLocalSteps] = useState<Record<string, boolean>>(
    onboardingSteps || {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStepsForRole = (): OnboardingStep[] => {
    if (userRole === "COACH") {
      return [
        {
          id: "invite_client",
          title: t("onboarding.coachChecklist.step1"),
          description: t("onboarding.coachChecklist.step1Description"),
          completed: localSteps["invite_client"] || false,
        },
        {
          id: "learn_body_mapping",
          title: t("onboarding.coachChecklist.step2"),
          description: t("onboarding.coachChecklist.step2Description"),
          completed: localSteps["learn_body_mapping"] || false,
        },
        {
          id: "understand_sessions",
          title: t("onboarding.coachChecklist.step3"),
          description: t("onboarding.coachChecklist.step3Description"),
          completed: localSteps["understand_sessions"] || false,
        },
        {
          id: "discover_resources",
          title: t("onboarding.coachChecklist.step4"),
          description: t("onboarding.coachChecklist.step4Description"),
          completed: localSteps["discover_resources"] || false,
        },
      ];
    } else {
      return [
        {
          id: "log_sensation",
          title: t("onboarding.clientChecklist.step1"),
          description: t("onboarding.clientChecklist.step1Description"),
          completed: localSteps["log_sensation"] || false,
        },
        {
          id: "explore_body_map",
          title: t("onboarding.clientChecklist.step2"),
          description: t("onboarding.clientChecklist.step2Description"),
          completed: localSteps["explore_body_map"] || false,
        },
        {
          id: "review_sessions",
          title: t("onboarding.clientChecklist.step3"),
          description: t("onboarding.clientChecklist.step3Description"),
          completed: localSteps["review_sessions"] || false,
        },
        {
          id: "access_resources",
          title: t("onboarding.clientChecklist.step4"),
          description: t("onboarding.clientChecklist.step4Description"),
          completed: localSteps["access_resources"] || false,
        },
      ];
    }
  };

  const steps = getStepsForRole();
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  const handleToggleStep = (stepId: string) => {
    setLocalSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const handleMarkComplete = async () => {
    setIsSubmitting(true);
    try {
      await onMarkComplete(localSteps);
      onClose();
    } catch (error) {
      console.error("Failed to mark onboarding complete:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    userRole === "COACH"
      ? t("onboarding.coachChecklist.title")
      : t("onboarding.clientChecklist.title");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("onboarding.welcome")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div>
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            <p className="text-sm text-muted-foreground">
              {t("onboarding.getStarted")}
            </p>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedCount} / {steps.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps Checklist */}
          <div className="space-y-3">
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => handleToggleStep(step.id)}
                className="w-full flex items-start gap-4 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h3
                    className={`font-medium ${
                      step.completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t("onboarding.skipForNow")}
            </Button>
            <Button
              onClick={handleMarkComplete}
              disabled={isSubmitting || completedCount === 0}
            >
              {isSubmitting
                ? t("common.loading")
                : t("onboarding.markComplete")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
