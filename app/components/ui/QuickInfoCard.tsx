"use client";

import { isValidElement, type ReactNode } from "react";
import { formatCompactRupiah, isRupiahDisplayValue } from "@/app/lib/numberFormat";

export type QuickInfoTone =
  | "accent"
  | "emerald"
  | "sky"
  | "amber"
  | "rose"
  | "violet"
  | "slate";

export type QuickInfoSilhouetteKind =
  | "building"
  | "tag"
  | "wallet"
  | "check-square"
  | "people"
  | "percent"
  | "users"
  | "lead"
  | "target"
  | "briefcase"
  | "interact"
  | "training"
  | "closing";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function extractNodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractNodeText).join(" ").trim();
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractNodeText(node.props.children);
  }
  return "";
}

function getValueDensityClass(valueText: string): string | null {
  const normalizedText = valueText.replace(/\s+/g, " ").trim();
  if (!normalizedText) return null;

  const wordCount = normalizedText.split(" ").filter(Boolean).length;
  if (normalizedText.length >= 24 || wordCount >= 4) {
    return "quick-info-card__value--tight";
  }

  if (normalizedText.length >= 15 || wordCount >= 2) {
    return "quick-info-card__value--compact";
  }

  return null;
}

function normalizeQuickInfoValue(value: ReactNode): ReactNode {
  if (typeof value === "string" && isRupiahDisplayValue(value)) {
    return formatCompactRupiah(value);
  }

  return value;
}

function normalizeQuickInfoDescription(description: ReactNode): ReactNode {
  if (typeof description === "string" && isRupiahDisplayValue(description)) {
    return formatCompactRupiah(description);
  }

  return description;
}

function QuickInfoSilhouette({
  kind,
}: {
  kind: QuickInfoSilhouetteKind;
}) {
  const iconByKind: Record<QuickInfoSilhouetteKind, ReactNode> = {
    building: (
      <>
        <path
          d="M3.75 21h16.5M4.5 21V8.25A2.25 2.25 0 0 1 6.75 6h10.5a2.25 2.25 0 0 1 2.25 2.25V21M8.25 6V3.75h7.5V6M8.25 11.25h.008M12 11.25h.008M15.75 11.25h.008M8.25 15h.008M12 15h.008M15.75 15h.008"
        />
      </>
    ),
    tag: (
      <>
        <path d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3z" />
        <path d="M6 6h.008v.008H6V6z" />
      </>
    ),
    wallet: (
      <>
        <path d="M4.5 8.25A2.25 2.25 0 0 1 6.75 6h10.5a2.25 2.25 0 0 1 2.25 2.25v7.5A2.25 2.25 0 0 1 17.25 18H6.75a2.25 2.25 0 0 1-2.25-2.25v-7.5z" />
        <path d="M8.25 12h7.5M12 8.25v7.5" />
      </>
    ),
    "check-square": (
      <>
        <path d="M9 12.75 11.25 15 15 9.75" />
        <path d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25V6.75z" />
      </>
    ),
    people: (
      <>
        <path d="M18 18.72a8.97 8.97 0 0 0 3.75.78M18 18.72a8.97 8.97 0 0 1-3.75.78M18 18.72v-3.47m-3.75 4.25a8.97 8.97 0 0 1-3.75-.78m3.75.78v-3.47m-3.75 2.69a8.97 8.97 0 0 1-3.75.78M10.5 18.72v-3.47m0 3.47a8.97 8.97 0 0 0 3.75.78M6.75 19.5A8.97 8.97 0 0 1 3 18.72v-3.47m3.75 4.25v-3.47M3 15.25C3 14.01 5.239 13 8 13s5 1.01 5 2.25m-10 0c0 1.24 2.239 2.25 5 2.25s5-1.01 5-2.25m2.25 0C15.25 14.01 17.489 13 20.25 13s5 1.01 5 2.25m-10 0c0 1.24 2.239 2.25 5 2.25s5-1.01 5-2.25M8 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm8 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      </>
    ),
    percent: (
      <>
        <line x1="19" y1="5" x2="5" y2="19" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
        <circle cx="17" cy="9" r="2.25" />
        <path d="M14.5 20c0-2.6 1.9-4.7 4.5-4.7" />
      </>
    ),
    lead: (
      <>
        <path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.001 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="8" width="18" height="12" rx="2" />
        <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>
    ),
    interact: (
      <>
        <path d="M4 5h16v10H9l-5 4V5z" />
      </>
    ),
    training: (
      <>
        <path d="M12 4 2 9l10 5 10-5-10-5z" />
        <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
      </>
    ),
    closing: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l2.5 2.5L16 9" />
      </>
    ),
  };

  return (
    <div
      aria-hidden="true"
      className={joinClasses(
        "quick-info-card__decor pointer-events-none absolute bottom-0 right-0",
        "h-32 w-32 translate-x-3 translate-y-2",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-full w-full"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {iconByKind[kind]}
      </svg>
    </div>
  );
}

export function QuickInfoCardGrid({
  children,
  columns = 4,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "quick-info-card-grid",
        `quick-info-card-grid--${columns}`,
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function QuickInfoCard({
  label,
  value,
  description,
  tone = "slate",
  silhouette,
  className,
  valueClassName,
  descriptionClassName,
}: {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  tone?: QuickInfoTone;
  silhouette?: QuickInfoSilhouetteKind;
  className?: string;
  valueClassName?: string;
  descriptionClassName?: string;
}) {
  const isAccent = tone === "accent";
  const normalizedValue = normalizeQuickInfoValue(value);
  const normalizedDescription =
    description === undefined
      ? undefined
      : normalizeQuickInfoDescription(description);
  const valueText = extractNodeText(normalizedValue);
  const valueDensityClass = getValueDensityClass(valueText);

  return (
    <div
      className={joinClasses(
        "quick-info-card",
        isAccent && "quick-info-card--accent",
        !isAccent && `quick-info-card--${tone}`,
        className,
      )}
    >
      <div className="quick-info-card__surface">
        <div className="quick-info-card__top">
          <p className="quick-info-card__label">{label}</p>
          {!isAccent ? (
            <span
              aria-hidden="true"
              className={joinClasses(
                "quick-info-card__dot",
                `quick-info-card__dot--${tone}`,
              )}
            />
          ) : null}
        </div>

        <div>
          <div
            className={joinClasses(
              "quick-info-card__value",
              valueDensityClass,
              valueClassName,
            )}
          >
            {normalizedValue}
          </div>
          {normalizedDescription ? (
            <p
              className={joinClasses(
                "quick-info-card__description",
                descriptionClassName,
              )}
            >
              {normalizedDescription}
            </p>
          ) : null}
        </div>
      </div>

      {isAccent && silhouette ? <QuickInfoSilhouette kind={silhouette} /> : null}
    </div>
  );
}
