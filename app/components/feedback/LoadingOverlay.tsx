"use client";

import { AnimatedOverlay, AnimatedPanel } from "@/app/components/motion/primitives";

export default function LoadingOverlay({ label }: { label?: string }) {
  return (
    <AnimatedOverlay
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4 backdrop-blur-[2px]"
    >
      <AnimatedPanel className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#C92C1E]" />
        <p className="text-xs font-black text-gray-600 dark:text-slate-200">{label || "Memproses..."}</p>
      </AnimatedPanel>
    </AnimatedOverlay>
  );
}
