"use client";

import type { ReactNode } from "react";
import QuickInfoCard, {
  type QuickInfoSilhouetteKind,
  type QuickInfoTone,
} from "@/app/components/ui/QuickInfoCard";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function DetailSummaryCard({
  title,
  value,
  description,
  primary = false,
  tone,
  silhouette,
  className,
  valueClassName,
  descriptionClassName,
}: {
  title: string;
  value: ReactNode;
  description: ReactNode;
  primary?: boolean;
  tone?: Exclude<QuickInfoTone, "accent">;
  silhouette?: QuickInfoSilhouetteKind;
  className?: string;
  valueClassName?: string;
  descriptionClassName?: string;
}) {
  const resolvedTone: QuickInfoTone = primary ? "accent" : tone || "slate";

  return (
    <QuickInfoCard
      label={title}
      value={value}
      description={description}
      tone={resolvedTone}
      silhouette={primary ? silhouette : undefined}
      className={joinClasses("h-full", className)}
      valueClassName={joinClasses(
        primary ? "text-[2rem] md:text-[2.25rem]" : "text-[1.95rem] md:text-[2.15rem]",
        valueClassName,
      )}
      descriptionClassName={joinClasses("max-w-[32ch]", descriptionClassName)}
    />
  );
}
