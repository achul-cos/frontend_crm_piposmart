"use client";

export const THEME_STORAGE_KEY = "piposmart_theme";

export type ThemeMode = "light" | "dark" | "pink";

export function normalizeThemeMode(value: string | null | undefined): ThemeMode {
  switch (value) {
    case "dark":
    case "pink":
      return value;
    default:
      return "light";
  }
}

export function isDarkTheme(theme: ThemeMode): boolean {
  return theme === "dark";
}

export function getThemeRootClassName(theme: ThemeMode): string {
  if (theme === "dark") {
    return "dark";
  }
  if (theme === "pink") {
    return "light pink-mode";
  }
  return "light";
}

export function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  return normalizeThemeMode(localStorage.getItem(THEME_STORAGE_KEY));
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === "undefined") {
    return;
  }

  const applyThemeClasses = (element: HTMLElement) => {
    element.classList.remove("light", "dark", "pink-mode");

    if (theme === "dark") {
      element.classList.add("dark");
    } else {
      element.classList.add("light");
      if (theme === "pink") {
        element.classList.add("pink-mode");
      }
    }

    element.dataset.theme = theme;
  };

  applyThemeClasses(document.documentElement);
  document.documentElement.style.colorScheme = isDarkTheme(theme) ? "dark" : "light";

  if (document.body) {
    applyThemeClasses(document.body);
  }
}

export function persistThemeMode(theme: ThemeMode): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function dispatchThemeChange(theme: ThemeMode): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent("piposmart-theme-change", {
      detail: {
        theme,
        isDark: isDarkTheme(theme),
        isPink: theme === "pink",
      },
    }),
  );
}
