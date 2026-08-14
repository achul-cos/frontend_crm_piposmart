"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import { type ThemeMode } from "@/app/lib/theme";

const footerLinks = [
  { href: "/menu/sop", label: "SOP" },
  { href: "/menu/bantuan", label: "Pusat Bantuan" },
  { href: "/menu/setting", label: "Pengaturan" },
];

const SunIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3.75v1.5m0 13.5v1.5m8.25-8.25h-1.5M5.25 12h-1.5m13.334-6.084-1.06 1.06M7.976 16.024l-1.06 1.06m10.168 0-1.06-1.06M7.976 7.976l-1.06-1.06M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
    />
  </svg>
);

const HeartSparkleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 20.25l-1.267-1.154C5.423 14.264 2.25 11.38 2.25 7.875A4.125 4.125 0 016.375 3.75c1.61 0 3.155.744 4.125 2.019A5.343 5.343 0 0112 8.032a5.343 5.343 0 011.5-2.263A5.122 5.122 0 0117.625 3.75 4.125 4.125 0 0121.75 7.875c0 3.505-3.173 6.389-8.483 11.221L12 20.25z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18.75 2.75v2.5m-1.25-1.25H20m-10.25 8.5v2m-1-1h2"
    />
  </svg>
);

const MoonIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.752 15.002A9.718 9.718 0 0112.5 21C7.253 21 3 16.747 3 11.5A9.718 9.718 0 018.998 2.248 7.5 7.5 0 0019.752 13.002a7.47 7.47 0 002 .0z"
    />
  </svg>
);

type AppFooterProps = {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
};

const footerThemeOptions: {
  theme: ThemeMode;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { theme: "light", label: "Light Mode", icon: SunIcon },
  { theme: "pink", label: "Pink Mode", icon: HeartSparkleIcon },
  { theme: "dark", label: "Dark Mode", icon: MoonIcon },
];

export default function AppFooter({
  isDarkMode,
  themeMode,
  onThemeChange,
}: AppFooterProps) {
  return (
    <footer
      className={`mt-16 w-full shrink-0 border-t ${
        isDarkMode
          ? "border-slate-800 bg-[#1E293B] text-slate-100"
          : "border-gray-200 bg-white text-[#2C2C2E]"
      }`}
      aria-label="Footer aplikasi"
    >
      <div className="h-1 w-full bg-[#C92C1E]" />

      <div
        className={`flex flex-col gap-8 px-6 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between ${
          isDarkMode ? "bg-[#1E293B]" : "bg-white"
        }`}
      >
        <div className="max-w-xl">
          <div className="inline-flex px-1 py-1">
            <Image
              src="/assets/logo teks.png"
              alt="Piposmart CRM"
              width={760}
              height={190}
              className="app-logo-wordmark h-8 w-auto object-contain sm:h-9"
            />
          </div>
          <p
            className={`mt-3 max-w-lg text-xs font-medium leading-5 ${
              isDarkMode ? "text-slate-300" : "text-gray-500"
            }`}
          >
            Ruang kerja terintegrasi untuk pengelolaan customer, penjualan,
            langganan, dan performa tim Piposmart.
          </p>
        </div>

        <nav
          aria-label="Tautan footer"
          className="flex flex-col items-start gap-3 lg:items-end"
        >
          <div className="flex flex-wrap items-center gap-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl border px-4 py-2.5 text-xs font-bold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C92C1E] ${
                  isDarkMode
                    ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-red-900 hover:bg-red-950/30 hover:text-red-300"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-[#C92C1E]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div
            className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${
              isDarkMode
                ? "border-slate-700/80 bg-slate-900/90"
                : "border-gray-200 bg-white/95"
            }`}
            aria-label="Pengganti tema aplikasi"
          >
            {footerThemeOptions.map(({ theme, label, icon: Icon }) => {
              const isActive = themeMode === theme;

              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => onThemeChange(theme)}
                  title={label}
                  aria-label={label}
                  aria-pressed={isActive}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                    isActive
                      ? theme === "pink"
                        ? "border-pink-200 bg-pink-50 text-pink-500"
                        : "border-red-100 bg-red-50 text-[#C92C1E]"
                      : isDarkMode
                        ? "border-transparent bg-transparent text-slate-500 hover:text-slate-200"
                        : "border-transparent bg-transparent text-gray-400 hover:text-[#C92C1E]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <div
        className={`flex flex-col gap-2 border-t px-6 py-4 text-[11px] font-semibold sm:flex-row sm:items-center sm:justify-between sm:px-8 ${
          isDarkMode
            ? "border-slate-800 bg-[#0F172A] text-slate-400"
            : "border-gray-100 bg-[#FAF9F6] text-gray-400"
        }`}
      >
        <p>&copy; 2026 PT Piposmart Digital Indonesia</p>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>CRM Workspace &middot; Beta</span>
        </div>
      </div>
    </footer>
  );
}
