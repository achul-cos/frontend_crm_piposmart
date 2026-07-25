"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/app/lib/auth/session";
import { canSeeMenu, roleLabel } from "@/app/lib/auth/rbac";

const ProfileTagIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
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

const SettingIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
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

type MenuItem = {
  text: string;
  href: string;
  icon: (className: string) => React.ReactNode;
};

const MENU_ITEMS: MenuItem[] = [
  {
    text: "Dashboard Overview",
    href: "/",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    text: "SOP Operasional",
    href: "/menu/sop",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4m3 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    text: "Kelolaan Customer",
    href: "/menu/data-kelolaan",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.001 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    text: "Kelolaan Mitra",
    href: "/menu/kelolaan-mitra",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a8.97 8.97 0 003.75.78M18 18.72a8.97 8.97 0 01-3.75.78M18 18.72v-3.47m-3.75 4.25a8.97 8.97 0 01-3.75-.78m3.75.78v-3.47m-3.75 2.69a8.97 8.97 0 01-3.75.78M10.5 18.72v-3.47m0 3.47a8.97 8.97 0 003.75.78M6.75 19.5A8.97 8.97 0 013 18.72v-3.47m3.75 4.25v-3.47M3 15.25c0-1.24 2.239-2.25 5-2.25s5 1.01 5 2.25m-10 0c0 1.24 2.239 2.25 5 2.25s5-1.01 5-2.25m2.25 0c0-1.24 2.239-2.25 5-2.25s5 1.01 5 2.25m-10 0c0 1.24 2.239 2.25 5 2.25s5-1.01 5-2.25M8 10.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm8 0a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
      </svg>
    ),
  },
  {
    text: "Paket Langganan",
    href: "/menu/paket-langganan",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
  },
  {
    text: "Laporan Penjualan",
    href: "/menu/laporan-penjualan",
    icon: (className) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

/**
 * Kerangka aplikasi (sidebar + area konten).
 *
 * Menggantikan chrome yang dulu ada di `app/layout.tsx`. Dua perubahan pokok:
 *  1. Identitas pengguna diambil dari `useSession()`, bukan dari `localStorage`
 *     (guard `localStorage` yang lama sudah digantikan `proxy.ts`).
 *  2. Menu disaring berdasarkan `user.permissions` — Sales tidak lagi melihat
 *     menu yang bukan haknya.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, permissions, logout } = useSession();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isAuthPage = pathname.startsWith("/auth");

  // Halaman auth tampil tanpa kerangka.
  if (isAuthPage) {
    return <>{children}</>;
  }

  const displayName = user?.name ?? (isLoading ? "Memuat…" : "User");
  const displayRole = user ? roleLabel(user.role) : "Guest";

  const visibleMenu = MENU_ITEMS.filter((item) =>
    canSeeMenu(item.href, permissions),
  );

  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed z-30 flex h-full flex-col justify-between border-r border-gray-200/80 bg-white p-4 transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="scrollbar-none max-h-[80vh] space-y-6 overflow-y-auto pr-1">
          <div className="flex min-h-[65px] items-center justify-between border-b border-gray-100 pb-4">
            {isSidebarOpen && (
              <div className="transition-all duration-200">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  WORKSPACE
                </span>
                <h2 className="mt-0.5 text-lg font-black tracking-tight text-[#C92C1E]">
                  Piposmart CRM
                </h2>
              </div>
            )}

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`flex items-center justify-center rounded-xl border border-gray-200/60 bg-gray-50 p-2 text-[#C92C1E] transition-all duration-200 hover:border-red-200 hover:bg-red-50 ${
                !isSidebarOpen ? "w-full text-center" : ""
              }`}
              title={isSidebarOpen ? "Tutup Menu" : "Buka Menu"}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <nav className="space-y-1">
            {visibleMenu.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                    isActive
                      ? "bg-[#C92C1E] text-white shadow-sm"
                      : "text-gray-600 hover:bg-red-50 hover:text-[#C92C1E]"
                  } ${!isSidebarOpen ? "justify-center px-0" : ""}`}
                >
                  {item.icon(
                    `w-5 h-5 shrink-0 transition-colors ${
                      isActive ? "text-white" : "text-[#C92C1E]"
                    }`,
                  )}

                  {isSidebarOpen && (
                    <span className="truncate text-sm font-semibold">
                      {item.text}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <div
            className={`flex items-center gap-2 rounded-xl border border-red-100 bg-red-50/60 text-[#C92C1E] ${
              isSidebarOpen ? "px-3 py-2" : "justify-center px-0 py-2.5"
            }`}
            title={`${displayName} • ${displayRole}`}
          >
            <ProfileTagIcon className="h-4 w-4 shrink-0" />
            {isSidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black leading-tight text-gray-900">
                  {displayName}
                </p>
                <p className="truncate text-[9px] font-black uppercase tracking-wider text-[#C92C1E]">
                  {displayRole}
                </p>
              </div>
            )}
          </div>

          <Link
            href="/menu/setting"
            className={`flex w-full items-center justify-between rounded-xl border border-red-100 bg-red-50/60 py-2.5 text-sm font-bold text-red-600 transition-all duration-200 hover:bg-red-50 ${
              isSidebarOpen ? "px-4" : "justify-center px-0"
            }`}
            title="Setting"
          >
            {isSidebarOpen ? (
              <>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <SettingIcon className="h-4 w-4 text-red-500" />
                  Setting
                </span>
                <span className="text-xs opacity-60">›</span>
              </>
            ) : (
              <SettingIcon className="h-5 w-5 text-red-500" />
            )}
          </Link>

          <button
            onClick={() => void logout()}
            className={`flex w-full items-center justify-between rounded-xl border border-red-100 bg-red-50/60 py-2.5 text-sm font-bold text-red-600 transition-all duration-200 hover:bg-red-50 ${
              isSidebarOpen ? "px-4" : "justify-center px-0"
            }`}
          >
            {isSidebarOpen ? (
              <>
                <span className="text-sm font-semibold">Sign Out</span>
                <span className="text-xs opacity-60">→</span>
              </>
            ) : (
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
          </button>

          <div
            className={`flex items-center px-1 text-[11px] font-semibold text-gray-400 ${
              isSidebarOpen ? "justify-between" : "justify-center"
            }`}
          >
            {isSidebarOpen && <span>v1.0.0 • Active</span>}
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-green-500" />
          </div>
        </div>
      </aside>

      <main
        className={`min-h-screen flex-1 bg-[#FAF9F6] p-8 transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        <div className="w-full max-w-full">{children}</div>
      </main>
    </div>
  );
}
