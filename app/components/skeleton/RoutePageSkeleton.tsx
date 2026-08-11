"use client";

import { CardSkeleton, SkeletonBlock, TableSkeleton } from "@/app/components/skeleton/Skeleton";

export default function RoutePageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="border-b-2 border-[#C92C1E] p-5">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-3 h-8 w-72 max-w-full" />
          <SkeletonBlock className="mt-2 h-4 w-full max-w-2xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} lines={3} />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-11 w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="p-5">
          <TableSkeleton rows={8} columns={6} />
        </div>
      </div>
    </div>
  );
}

