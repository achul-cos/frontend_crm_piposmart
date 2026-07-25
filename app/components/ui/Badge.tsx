import React from "react";

type BadgeTone = "brand" | "neutral" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<BadgeTone, string> = {
  brand: "border-red-100 bg-red-50 text-[#C92C1E]",
  neutral: "border-gray-100 bg-gray-50 text-gray-500",
  success: "border-green-100 bg-green-50 text-green-700",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  danger: "border-red-100 bg-red-50 text-red-700",
};

export default function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Warna badge untuk stage lead (NEW, POSSIBLE, POTENTIAL, CLOSING, INVALID). */
export function stageTone(statusAkun: string): BadgeTone {
  switch (statusAkun) {
    case "Berlangganan":
      return "success";
    case "Potensial":
      return "brand";
    case "Kemungkinan Potensial":
      return "warning";
    case "Tidak Potensial":
      return "danger";
    default:
      return "neutral";
  }
}
