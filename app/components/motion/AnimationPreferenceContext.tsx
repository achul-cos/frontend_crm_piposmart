"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { MotionConfig } from "motion/react";

export type MotionPreference = "full" | "reduced" | "off";

const STORAGE_KEY = "piposmart_motion_pref";
const EVENT_NAME = "piposmart-motion-change";

function readStoredPreference(): MotionPreference {
  if (typeof window === "undefined") return "full";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "full" || raw === "reduced" || raw === "off") return raw;
  return "full";
}

interface AnimationPreferenceContextValue {
  preference: MotionPreference;
  setPreference: (pref: MotionPreference) => void;
}

const AnimationPreferenceContext = createContext<AnimationPreferenceContextValue>({
  preference: "full",
  setPreference: () => {},
});

export function AnimationPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<MotionPreference>(readStoredPreference);

  useEffect(() => {
    const sync = () => setPreferenceState(readStoredPreference());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT_NAME, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT_NAME, sync);
    };
  }, []);

  const setPreference = useCallback((pref: MotionPreference) => {
    window.localStorage.setItem(STORAGE_KEY, pref);
    setPreferenceState(pref);
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }, []);

  return (
    <AnimationPreferenceContext.Provider value={{ preference, setPreference }}>
      <MotionConfig
        reducedMotion={preference === "off" ? "always" : "never"}
        transition={{ duration: preference === "reduced" ? 0.12 : 0.25, ease: "easeOut" }}
      >
        {children}
      </MotionConfig>
    </AnimationPreferenceContext.Provider>
  );
}

export function useAnimationPreference() {
  return useContext(AnimationPreferenceContext);
}
