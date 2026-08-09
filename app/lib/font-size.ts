"use client";

export const FONT_SIZE_STORAGE_KEY = "piposmart_font_size";
export const FONT_SIZE_EVENT_NAME = "piposmart-font-size-change";

export type FontSizeMode =
  | "small"
  | "medium"
  | "large"
  | "xlarge"
  | "xxlarge";

const FONT_SIZE_SCALE_MAP: Record<FontSizeMode, number> = {
  small: 0.92,
  medium: 1,
  large: 1.08,
  xlarge: 1.16,
  xxlarge: 1.24,
};

export function normalizeFontSizeMode(
  value: string | null | undefined,
): FontSizeMode {
  switch (value) {
    case "small":
    case "large":
    case "xlarge":
    case "xxlarge":
      return value;
    default:
      return "medium";
  }
}

export function getFontSizeScale(mode: FontSizeMode): number {
  return FONT_SIZE_SCALE_MAP[mode];
}

export function readStoredFontSizeMode(): FontSizeMode {
  if (typeof window === "undefined") {
    return "medium";
  }

  return normalizeFontSizeMode(
    window.localStorage.getItem(FONT_SIZE_STORAGE_KEY),
  );
}

export function applyFontSizeToDocument(mode: FontSizeMode): void {
  if (typeof document === "undefined") {
    return;
  }

  const scale = String(getFontSizeScale(mode));

  document.documentElement.style.setProperty("--app-font-scale", scale);
  document.documentElement.dataset.fontSize = mode;

  if (document.body) {
    document.body.style.setProperty("--app-font-scale", scale);
    document.body.dataset.fontSize = mode;
  }
}

export function persistFontSizeMode(mode: FontSizeMode): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, mode);
}

export function dispatchFontSizeChange(mode: FontSizeMode): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(FONT_SIZE_EVENT_NAME, {
      detail: {
        mode,
        scale: getFontSizeScale(mode),
      },
    }),
  );
}
