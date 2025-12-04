import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Sparkles, Activity, Map } from "lucide-react";

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
  onMarkComplete,
}: OnboardingModalProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only show wizard for CLIENT role for now, fallback to simple welcome for others if needed
  // But for this task, we focus on the Client experience.

  const steps = [
    {
      id: "welcome",
      icon: <Sparkles className="w-16 h-16 text-primary mb-4" />,
      title: t("onboarding.wizard.step1Title", "Welcome to Loom"),
      description: t(
        "onboarding.wizard.step1Desc",
        "Your space for somatic exploration and healing. We're honored to be part of your journey.",
      ),
    },
    {
      id: "body_map",
      icon: <Map className="w-16 h-16 text-blue-500 mb-4" />,
      title: t("onboarding.wizard.step2Title", "The Body Map"),
      description: t(
        "onboarding.wizard.step2Desc",
        "Click on any body part to log a sensation. Use the interactive map to visualize where you feel energy, tension, or flow.",
      ),
    },
    {
      id: "tracking",
      icon: <Activity className="w-16 h-16 text-green-500 mb-4" />,
      title: t("onboarding.wizard.step3Title", "Track Your Progress"),
      description: t(
        "onboarding.wizard.step3Desc",
        "Over time, you'll see patterns emerge. Share your logs with your coach to deepen your sessions.",
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Mark all steps as "viewed" or just mark onboarding as complete
      await onMarkComplete({ wizard_completed: true });
      onClose();
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white dark:bg-slate-900 border-none shadow-2xl">
        <div className="relative h-[450px] flex flex-col">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />

          {/* Content Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-lg mb-6 ring-1 ring-black/5">
                  {steps[currentStep]?.icon}
                </div>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-3">
                  {steps[currentStep]?.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {steps[currentStep]?.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer / Navigation */}
          <div className="p-6 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between z-10">
            {/* Step Indicators */}
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? "bg-primary w-6"
                      : "bg-gray-300 dark:bg-slate-600"
                  }`}
                />
              ))}
            </div>

            {/* Button */}
            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className="group"
              size="lg"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  {t("onboarding.getStarted", "Get Started")}
                  <Check className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  {t("common.next", "Next")}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
