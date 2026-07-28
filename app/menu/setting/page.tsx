"use client";

import { useEffect, useState } from "react";

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

const themeOptions: {
  value: ThemeMode;
  title: string;
  description: string;
  icon: typeof SunIcon;
}[] = [
  {
    value: "light",
    title: "Light Mode",
    description: "Tampilan terang untuk penggunaan normal.",
    icon: SunIcon,
  },
  {
    value: "dark",
    title: "Dark Mode",
    description: "Tampilan gelap agar mata lebih nyaman.",
    icon: MoonIcon,
  },
];

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
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("Sales");
  const [username, setUsername] = useState("-");
  const [theme, setTheme] = useState<ThemeMode>("light");

  const applyTheme = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    syncThemeToDocument(nextTheme);
  };

  useEffect(() => {
    setUserName(localStorage.getItem("piposmart_user_name") || "User");
    setUserRole(localStorage.getItem("piposmart_user_role") || "Sales");
    setUsername(localStorage.getItem("piposmart_user_username") || "-");

    const savedTheme = localStorage.getItem("piposmart_theme");
    const nextTheme: ThemeMode = savedTheme === "dark" ? "dark" : "light";

    setTheme(nextTheme);
    syncThemeToDocument(nextTheme);
  }, []);

  return (
    <div className="space-y-6 font-sans text-[#1C1C1E]">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
            <SettingIcon />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
              Setting
            </p>
            <h1 className="text-2xl font-black text-gray-950">
              Pengaturan Akun
            </h1>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
              <UserIcon />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900">Profile Login</p>
              <p className="text-xs font-medium text-gray-400">
                Data akun yang sedang aktif.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-black uppercase text-gray-400">
                Nama
              </p>
              <p className="mt-1 text-sm font-black text-gray-900">
                {userName}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-black uppercase text-gray-400">
                Username
              </p>
              <p className="mt-1 text-sm font-black text-gray-900">
                {username}
              </p>
            </div>

            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
              <p className="text-[10px] font-black uppercase text-[#C92C1E]">
                Role
              </p>
              <p className="mt-1 text-sm font-black text-[#C92C1E]">
                {userRole}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-gray-900">Preferensi Sistem</p>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Atur tampilan sistem sesuai kenyamanan penggunaan.
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-gray-900">
                    Mode Tampilan
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-gray-400">
                    Mode aktif:{" "}
                    {theme === "dark" ? "Dark Mode" : "Light Mode"}
                  </p>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#C92C1E] shadow-sm">
                  {theme === "dark" ? "Dark" : "Light"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {themeOptions.map((option) => {
                  const isActive = theme === option.value;
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => applyTheme(option.value)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        isActive
                          ? "border-red-100 bg-red-50 text-[#C92C1E]"
                          : "border-gray-200 bg-white text-gray-600 hover:border-red-100 hover:bg-red-50/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            isActive ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-xs font-black">{option.title}</p>
                          <p className="mt-0.5 text-[10px] font-medium leading-4 text-gray-400">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div>
                <p className="text-xs font-black text-gray-900">Status Akun</p>
                <p className="text-[11px] font-medium text-gray-400">
                  Sesi login tersimpan lokal
                </p>
              </div>
              <span className="h-2 w-2 rounded-full bg-green-500" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}