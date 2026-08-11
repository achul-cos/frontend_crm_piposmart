"use client";

export const FONT_FAMILY_STORAGE_KEY = "piposmart_font_family";
export const FONT_FAMILY_EVENT_NAME = "piposmart-font-family-change";

export type FontFamilyMode = "sans" | "serif" | "mono" | "handwriting";

const FONT_FAMILY_STACKS: Record<FontFamilyMode, string> = {
  sans: 'Arial, Helvetica, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: '"Consolas", "Courier New", monospace',
  handwriting:
    '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive',
};

export function normalizeFontFamilyMode(
  value: string | null | undefined,
): FontFamilyMode {
  switch (value) {
    case "serif":
    case "mono":
    case "handwriting":
      return value;
    default:
      return "sans";
  }
}

export function getFontFamilyStack(mode: FontFamilyMode): string {
  return FONT_FAMILY_STACKS[mode];
}

export function readStoredFontFamilyMode(): FontFamilyMode {
  if (typeof window === "undefined") {
    return "sans";
  }

  return normalizeFontFamilyMode(
    window.localStorage.getItem(FONT_FAMILY_STORAGE_KEY),
  );
}

export function applyFontFamilyToDocument(mode: FontFamilyMode): void {
  if (typeof document === "undefined") {
    return;
  }

  const stack = getFontFamilyStack(mode);

  document.documentElement.style.setProperty("--app-font-family", stack);
  document.documentElement.dataset.fontFamily = mode;

  if (document.body) {
    document.body.style.setProperty("--app-font-family", stack);
    document.body.dataset.fontFamily = mode;
  }
}

export function persistFontFamilyMode(mode: FontFamilyMode): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FONT_FAMILY_STORAGE_KEY, mode);
}

export function dispatchFontFamilyChange(mode: FontFamilyMode): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(FONT_FAMILY_EVENT_NAME, {
      detail: {
        mode,
        stack: getFontFamilyStack(mode),
      },
    }),
  );
}
