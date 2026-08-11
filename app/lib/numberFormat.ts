export function formatCompactRupiah(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "-";

  const amount =
    typeof value === "number" ? value : parseLocalizedNumber(String(value));

  if (amount === null || Number.isNaN(amount)) {
    return typeof value === "string" ? value : "-";
  }

  const absoluteAmount = Math.abs(amount);
  const signPrefix = amount < 0 ? "-" : "";

  if (absoluteAmount < 1000) {
    return `${signPrefix}Rp. ${new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
    }).format(absoluteAmount)}`;
  }

  const units = [
    { threshold: 1_000_000_000_000, suffix: "t" },
    { threshold: 1_000_000_000, suffix: "b" },
    { threshold: 1_000_000, suffix: "m" },
    { threshold: 1_000, suffix: "k" },
  ] as const;

  const matchedUnit =
    units.find((unit) => absoluteAmount >= unit.threshold) || units.at(-1);

  if (!matchedUnit) {
    return `${signPrefix}Rp. ${new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
    }).format(absoluteAmount)}`;
  }

  const compactValue = absoluteAmount / matchedUnit.threshold;
  const formattedValue = compactValue.toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return `${signPrefix}Rp. ${formattedValue}${matchedUnit.suffix}`;
}

export function isRupiahDisplayValue(value: string): boolean {
  const normalizedValue = value.replace(/\s+/g, " ").trim().toLowerCase();
  return normalizedValue.startsWith("rp") || normalizedValue.startsWith("idr");
}

function parseLocalizedNumber(value: string): number | null {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  const digitsOnly = normalizedValue.replace(/[^0-9,-]/g, "");
  if (!digitsOnly) return null;

  const normalizedNumber = digitsOnly
    .replace(/\./g, "")
    .replace(/,/g, ".");

  const parsed = Number(normalizedNumber);
  return Number.isNaN(parsed) ? null : parsed;
}
