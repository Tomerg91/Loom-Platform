import { useEffect, useCallback, useState } from "react";

type BodyZone = "HEAD" | "THROAT" | "CHEST" | "SOLAR_PLEXUS" | "BELLY" | "PELVIS" | "ARMS" | "LEGS" | "FULL_BODY";

export interface SomaticLogDraft {
  selectedZone?: BodyZone;
  selectedSensation: string;
  intensity: number;
  note: string;
  sharedWithCoach: boolean;
  savedAt: number; // timestamp
}

const DRAFT_STORAGE_KEY = "somatic_log_draft";
const DRAFT_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Custom hook for managing somatic log form state persistence
 * Automatically saves draft to localStorage on every change
 * Loads draft from localStorage on mount
 * Expires drafts after 24 hours
 */
export function useSomaticLogDraft() {
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  /**
   * Load draft from localStorage on mount
   */
  const loadDraft = useCallback((): SomaticLogDraft | null => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return null;

      const draft: SomaticLogDraft = JSON.parse(stored);

      // Check if draft has expired (24 hours)
      const now = Date.now();
      if (now - draft.savedAt > DRAFT_EXPIRY_TIME) {
        // Draft expired, remove it
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        return null;
      }

      return draft;
    } catch (error) {
      console.error("Failed to load somatic log draft:", error);
      // If parsing fails, remove the corrupted draft
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
  }, []);

  /**
   * Save draft to localStorage
   */
  const saveDraft = useCallback((draft: Omit<SomaticLogDraft, "savedAt">) => {
    try {
      const draftWithTimestamp: SomaticLogDraft = {
        ...draft,
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftWithTimestamp));
    } catch (error) {
      // Silently fail if localStorage is full or unavailable
      // This shouldn't block form submission
      console.warn("Failed to save somatic log draft:", error);
    }
  }, []);

  /**
   * Clear draft from localStorage
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear somatic log draft:", error);
    }
  }, []);

  /**
   * Get the age of the draft in seconds (for display)
   */
  const getDraftAge = useCallback((draft: SomaticLogDraft): number => {
    const ageMs = Date.now() - draft.savedAt;
    return Math.floor(ageMs / 1000);
  }, []);

  return {
    loadDraft,
    saveDraft,
    clearDraft,
    getDraftAge,
    isDraftLoaded,
    setIsDraftLoaded,
  };
}
