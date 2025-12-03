import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

type BodyZone =
  | "HEAD"
  | "THROAT"
  | "CHEST"
  | "SOLAR_PLEXUS"
  | "BELLY"
  | "PELVIS"
  | "ARMS"
  | "LEGS";

interface SensationPanelProps {
  selectedZone: BodyZone;
  onClose: () => void;
}

const zoneLabels: Record<BodyZone, string> = {
  HEAD: "Head",
  THROAT: "Throat",
  CHEST: "Chest",
  SOLAR_PLEXUS: "Solar Plexus",
  BELLY: "Belly",
  PELVIS: "Pelvis",
  ARMS: "Arms",
  LEGS: "Legs",
};

const SENSATIONS = [
  "Tight",
  "Heavy",
  "Hot",
  "Cold",
  "Tingling",
  "Numb",
  "Vibrating",
  "Empty",
];

/**
 * SensationPanel Component
 *
 * Slides in from the right when a body zone is selected.
 * Allows user to select a sensation and save to sessionStorage.
 * On "Save to Journal" click, stores data and redirects to /signup.
 */
export default function SensationPanel({
  selectedZone,
  onClose,
}: SensationPanelProps) {
  const [selectedSensation, setSelectedSensation] = useState<string | null>(
    null,
  );

  const handleSaveToJournal = () => {
    if (!selectedSensation) return;

    // Save to sessionStorage for OAuth-safe persistence
    const pendingLog = {
      zone: selectedZone,
      sensation: selectedSensation,
      timestamp: new Date().toISOString(),
    };

    sessionStorage.setItem("pending_somatic_log", JSON.stringify(pendingLog));

    // Redirect to signup
    window.location.href = "/signup";
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg p-6 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          What do you feel in your{" "}
          <span className="text-teal-600">{zoneLabels[selectedZone]}</span>?
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sensation Buttons */}
      <motion.div
        className="grid grid-cols-2 gap-3 mb-6"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.05,
            },
          },
        }}
      >
        {SENSATIONS.map((sensation) => (
          <motion.button
            key={sensation}
            onClick={() => setSelectedSensation(sensation)}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
            }}
            className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 transform ${
              selectedSensation === sensation
                ? "bg-teal-600 text-white shadow-md scale-105"
                : "bg-white dark:bg-slate-700 text-foreground hover:bg-teal-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600"
            }`}
          >
            {sensation}
          </motion.button>
        ))}
      </motion.div>

      {/* Save Button */}
      <AnimatePresence>
        {selectedSensation && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={handleSaveToJournal}
            className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 transform active:scale-95"
          >
            Save to Journal
          </motion.button>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!selectedSensation && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground mt-auto"
        >
          Select a sensation to continue
        </motion.p>
      )}
    </motion.div>
  );
}
