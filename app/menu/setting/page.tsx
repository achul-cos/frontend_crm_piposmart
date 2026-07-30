"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { getProfile } from "@/app/lib/api";

type ThemeMode = "light" | "dark";

const SettingIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.4}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const UserIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.4}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0"
    />
  </svg>
);

const PencilIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
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
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const KeyIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
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
      d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
    />
  </svg>
);

const SunIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.4}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v1.5m0 15V21m9-9h-1.5M4.5 12H3m15.364-6.364l-1.061 1.061M6.697 17.303l-1.061 1.061m12.728 0l-1.061-1.061M6.697 6.697L5.636 5.636M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
    />
  </svg>
);

const MoonIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.4}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.752 15.002A9.718 9.718 0 0112.5 21C7.253 21 3 16.747 3 11.5A9.718 9.718 0 018.998 2.248 7.5 7.5 0 0019.752 13.002a7.47 7.47 0 002 .0z"
    />
  </svg>
);

const ShieldCheckIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.4}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
    />
  </svg>
);

const syncThemeToDocument = (nextTheme: ThemeMode) => {
  localStorage.setItem("piposmart_theme", nextTheme);

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(nextTheme);
  document.documentElement.style.colorScheme = nextTheme;

  document.body.classList.remove("light", "dark");
  document.body.classList.add(nextTheme);

  window.dispatchEvent(
    new CustomEvent("piposmart-theme-change", {
      detail: {
        theme: nextTheme,
        isDark: nextTheme === "dark",
      },
    }),
  );
};

export default function SettingPage() {
  usePageTitle("Setting");

  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("Sales");
  const [username, setUsername] = useState("-");
  const [theme, setTheme] = useState<ThemeMode>("light");

  const applyTheme = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    syncThemeToDocument(nextTheme);
  };

  const loadProfile = async () => {
    const localName = localStorage.getItem("piposmart_user_name") || "User";
    const localRole = localStorage.getItem("piposmart_user_role") || "Sales";
    const localUsername = localStorage.getItem("piposmart_user_username") || "-";

    setUserName(localName);
    setUserRole(localRole);
    setUsername(localUsername);

    try {
      const profile = await getProfile();
      if (profile.name) {
        setUserName(profile.name);
        localStorage.setItem("piposmart_user_name", profile.name);
      }
      if (profile.email) {
        setUsername(profile.email);
        localStorage.setItem("piposmart_user_username", profile.email);
      }
      if (profile.role) {
        setUserRole(profile.role);
        localStorage.setItem("piposmart_user_role", profile.role);
      }
    } catch {
      // Use local session fallback
    }
  };

  useEffect(() => {
    void loadProfile();

    const savedTheme = localStorage.getItem("piposmart_theme");
    const nextTheme: ThemeMode = savedTheme === "dark" ? "dark" : "light";

    setTheme(nextTheme);
    syncThemeToDocument(nextTheme);
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-5 font-sans text-[#1C1C1E]">
      {/* Header Section */}
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
            <SettingIcon />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
              Setting Akun
            </p>
            <h1 className="text-xl font-black text-gray-950">
              Pengaturan Akun & Tampilan
            </h1>
          </div>
        </div>
      </section>

      {/* Compact Main Card Layout */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Informasi & Keamanan Pengguna</h2>
              <p className="text-xs font-medium text-gray-400">
                Detail akun, sesi login, dan mode tampilan.
              </p>
            </div>
          </div>

          <span className="rounded-full border border-red-100 bg-red-50 px-3 py-0.5 text-[11px] font-black text-[#C92C1E]">
            {userRole}
          </span>
        </div>

        {/* Vertical User Info Details */}
        <div className="mt-5 space-y-3">
          <div className="flex flex-col gap-0.5 rounded-2xl border border-gray-100 bg-[#FAFAFA] p-3.5">
            <span className="text-[9px] font-black uppercase text-gray-400">
              Nama Lengkap Pengguna
            </span>
            <span className="text-sm font-black text-gray-900">{userName}</span>
          </div>

          <div className="flex flex-col gap-0.5 rounded-2xl border border-gray-100 bg-[#FAFAFA] p-3.5">
            <span className="text-[9px] font-black uppercase text-gray-400">
              Username / Email Login
            </span>
            <span className="text-sm font-black text-gray-900">{username}</span>
          </div>

          <div className="flex flex-col gap-0.5 rounded-2xl border border-red-100 bg-red-50/50 p-3.5">
            <span className="text-[9px] font-black uppercase text-[#C92C1E]">
              Hak Akses Sistem (Role)
            </span>
            <span className="text-sm font-black text-[#C92C1E]">{userRole}</span>
          </div>

          {/* Action Buttons for Edit Profile & Change Password */}
          <div className="mt-5 flex flex-wrap gap-2.5 border-t border-gray-100 pt-4">
            <Link
              href="/menu/edit-profile"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#C92C1E] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-red-700"
            >
              <PencilIcon />
              <span>Edit Profil</span>
            </Link>

            <Link
              href="/menu/ganti-password"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-amber-600"
            >
              <KeyIcon />
              <span>Ganti Password</span>
            </Link>
          </div>
        </div>

        {/* Integrated Theme Switcher Section */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="mb-3">
            <h3 className="text-xs font-black text-gray-900">
              Preferensi Mode Tampilan
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => applyTheme("light")}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                theme === "light"
                  ? "border-red-200 bg-red-50 text-[#C92C1E] shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-red-100 hover:bg-gray-50"
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  theme === "light" ? "bg-white text-[#C92C1E]" : "bg-gray-100 text-gray-500"
                }`}
              >
                <SunIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black">Light Mode</p>
                <p className="text-[10px] font-medium text-gray-400">Tampilan terang</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyTheme("dark")}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                theme === "dark"
                  ? "border-red-200 bg-red-50 text-[#C92C1E] shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-red-100 hover:bg-gray-50"
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  theme === "dark" ? "bg-white text-[#C92C1E]" : "bg-gray-100 text-gray-500"
                }`}
              >
                <MoonIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black">Dark Mode</p>
                <p className="text-[10px] font-medium text-gray-400">Tampilan gelap</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}