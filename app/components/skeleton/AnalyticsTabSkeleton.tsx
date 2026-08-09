"use client";

import { CardSkeleton, SkeletonBlock } from "@/app/components/skeleton/Skeleton";

export default function AnalyticsTabSkeleton({
  sections = 2,
}: {
  sections?: number;
}) {
  return (
    <div className="space-y-6">
      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <div
          key={sectionIndex}
          className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm"
        >
          <div className="border-b border-gray-100 p-5">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-3 h-7 w-72 max-w-full" />
            <SkeletonBlock className="mt-2 h-4 w-full max-w-3xl" />
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-2">
            <CardSkeleton lines={4} />
            <CardSkeleton lines={4} />
          </div>
        </div>
      ))}
    </div>
  );
}

