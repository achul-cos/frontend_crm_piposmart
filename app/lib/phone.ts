// Shared phone-number formatting. Backend/legacy data arrives in mixed shapes (+62..., 62...,
// 0..., or bare national digits) — these helpers normalize defensively rather than assuming one
// canonical input format.

function digitsOnly(phone?: string | null): string {
  return (phone ?? "").replace(/\D/g, "");
}

// Admins read phone numbers most naturally with the local trunk prefix, not the +62 international
// form — every display site in the app should render through this, never the raw backend value.
export function formatPhoneDisplay(phone?: string | null): string {
  const digits = digitsOnly(phone);
  if (!digits) return "";

  let national = digits;
  if (digits.startsWith("62")) {
    national = digits.slice(2);
  } else if (digits.startsWith("0")) {
    national = digits.slice(1);
  }
  return `0${national}`;
}

// wa.me links require the international form without a leading 0 — the opposite direction from
// formatPhoneDisplay, so keep this as a separate explicit function rather than a flag.
export function toWhatsAppNumber(phone?: string | null): string {
  const digits = digitsOnly(phone);
  if (!digits) return "";

  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return `62${digits}`;
}

export function getWhatsAppUrl(phone?: string | null): string {
  const number = toWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}` : "";
}
