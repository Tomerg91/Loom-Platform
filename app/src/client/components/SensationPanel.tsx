import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Save,
  Activity,
  Thermometer,
  Wind,
  Zap,
  Droplets,
  Anchor,
  AlertCircle,
  CircleDashed,
} from "lucide-react";

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
  { label: "Tight", icon: Anchor },
  { label: "Heavy", icon: CircleDashed },
  { label: "Hot", icon: Thermometer },
  { label: "Cold", icon: Wind },
  { label: "Tingling", icon: Zap },
  { label: "Numb", icon: Droplets },
  { label: "Vibrating", icon: Activity },
  { label: "Empty", icon: AlertCircle },
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
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 50, opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full h-full flex flex-col bg-white/10 backdrop-blur-xl border border-white/20 dark:bg-slate-900/40 dark:border-slate-700/30 rounded-2xl p-6 shadow-2xl overflow-hidden relative"
    >
      {/* Decorative Gradient Blob */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h2 className="text-2xl font-light text-slate-800 dark:text-slate-100 tracking-tight">
            What do you feel?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Focusing on your{" "}
            <span className="font-semibold text-teal-600 dark:text-teal-400">
              {zoneLabels[selectedZone]}
            </span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-full transition-colors text-slate-500 dark:text-slate-400"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sensation Buttons */}
      <motion.div
        className="grid grid-cols-2 gap-3 mb-8 relative z-10"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.03,
            },
          },
        }}
      >
        {SENSATIONS.map(({ label, icon: Icon }) => (
          <motion.button
            key={label}
            onClick={() => setSelectedSensation(label)}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
            }}
            className={`
              relative group flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-300
              ${
                selectedSensation === label
                  ? "bg-teal-600/90 border-teal-500 text-white shadow-lg shadow-teal-900/20 scale-[1.02]"
                  : "bg-white/40 dark:bg-slate-800/40 border-white/40 dark:border-slate-700/40 text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:border-teal-200 dark:hover:border-teal-800"
              }
            `}
          >
            <Icon
              className={`w-6 h-6 ${
                selectedSensation === label
                  ? "text-white"
                  : "text-slate-400 dark:text-slate-500 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors"
              }`}
            />
            <span className="text-sm font-medium">{label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Save Button */}
      <div className="mt-auto relative z-10">
        <AnimatePresence mode="wait">
          {selectedSensation ? (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              onClick={handleSaveToJournal}
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-medium py-4 rounded-xl shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2 group transition-all duration-300"
            >
              <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Save to Journal
            </motion.button>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm text-slate-400 dark:text-slate-500 italic"
            >
              Select a sensation to continue
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
