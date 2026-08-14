"use client";

// Shared loading-skeleton primitives. Pulse animation is driven by motion so it respects the
// user's animation preference (MotionConfig reducedMotion) the same way every other animated
// piece of UI does, instead of a raw Tailwind `animate-pulse` that always runs.

import { motion } from "motion/react";

export function SkeletonBlock({
  className = "",
  style,
  delayMs = 0,
}: {
  className?: string;
  style?: React.CSSProperties;
  delayMs?: number;
}) {
  return (
    <motion.div
      className={`rounded-lg bg-gray-200 dark:bg-slate-700 ${className}`}
      style={style}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: delayMs / 1000 }}
    />
  );
}

export function SkeletonText({ className = "" }: { className?: string }) {
  return <SkeletonBlock className={`h-4 w-full ${className}`} />;
}

// Mimics a real <table>'s row/column grid so the layout doesn't jump once data arrives.
export function TableSkeleton({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full overflow-hidden" role="status" aria-label="Memuat data">
      <table className="w-full border-collapse">
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-100 dark:border-slate-800">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <SkeletonBlock
                    className={`h-4 ${colIndex === 0 ? "w-8" : "w-full max-w-[140px]"}`}
                    delayMs={(rowIndex * columns + colIndex) * 20}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div
      className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      role="status"
      aria-label="Memuat data"
    >
      <SkeletonBlock className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonText key={index} className={index === lines - 1 ? "w-2/3" : ""} />
      ))}
    </div>
  );
}
