"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AutoTableColumnVisibilityEnhancer from "@/app/components/table/AutoTableColumnVisibilityEnhancer";
import {
  clearStoredAuth,
  getRoleLabel,
  readStoredUserSession,
  type StoredUserSession,
} from "@/app/lib/api";
import "./globals.css";

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

const LogoutIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
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
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);

type MenuItem = {
  text: string;
  href: string;
  colorClass: string;
  icon: (className: string) => React.ReactElement;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

const ChevronDownIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
  </svg>
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<StoredUserSession>(() =>
    readStoredUserSession(),
  );

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Umum: true,
    "Data Admin": true,
    Marketing: true,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };
  const [isDarkMode, setIsDarkMode] = useState(false);

  const isAuthPage = pathname.startsWith("/auth");
  const loggedInUser = session.name || "User";
  const loggedInRole = getRoleLabel(session.role);
  const isAuthenticated = session.isAuthenticated;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyTheme = () => {
      const savedTheme = localStorage.getItem("piposmart_theme");
      const shouldUseDark = savedTheme === "dark";

      setIsDarkMode(shouldUseDark);

      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(shouldUseDark ? "dark" : "light");
      document.documentElement.style.colorScheme = shouldUseDark
        ? "dark"
        : "light";

      document.body?.classList.remove("light", "dark");
      document.body?.classList.add(shouldUseDark ? "dark" : "light");
    };
    const syncSession = () => {
      setSession(readStoredUserSession());
      setAuthChecked(true);
    };

    applyTheme();
    syncSession();

    window.addEventListener("storage", applyTheme);
    window.addEventListener("piposmart-theme-change", applyTheme);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener("storage", applyTheme);
      window.removeEventListener("piposmart-theme-change", applyTheme);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    if (!isAuthPage && !isAuthenticated) {
      console.warn("[AUTH] Redirecting to /auth/login because !isAuthenticated", { pathname });
      router.replace("/auth/login");
      return;
    }

    if (isAuthPage && isAuthenticated && pathname !== "/auth/logout") {
      console.warn("[AUTH] Redirecting to / because isAuthPage && isAuthenticated", { pathname });
      router.replace("/");
      return;
    }
  }, [authChecked, isAuthPage, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncSession = () => {
      setSession(readStoredUserSession());
      setAuthChecked(true);
    };

    syncSession();
    window.addEventListener("piposmart-auth-change", syncSession);

    return () => {
      window.removeEventListener("piposmart-auth-change", syncSession);
    };
  }, []);

  const iconBuilding = (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 21V8.25A2.25 2.25 0 016.75 6h10.5a2.25 2.25 0 012.25 2.25V21M8.25 6V3.75h7.5V6M8.25 11.25h.008M12 11.25h.008M15.75 11.25h.008M8.25 15h.008M12 15h.008M15.75 15h.008"
      />
    </svg>
  );

  const iconPeople = (className: string) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a8.97 8.97 0 003.75.78M18 18.72a8.97 8.97 0 01-3.75.78M18 18.72v-3.47m-3.75 4.25a8.97 8.97 0 01-3.75-.78m3.75.78v-3.47m-3.75 2.69a8.97 8.97 0 01-3.75.78M10.5 18.72v-3.47m0 3.47a8.97 8.97 0 003.75.78M6.75 19.5A8.97 8.97 0 013 18.72v-3.47m3.75 4.25v-3.47M3 15.25c0-1.24 2.239-2.25 5-2.25s5 1.01 5 2.25m-10 0c0 1.24 2.239 2.25 5 2.25s5-1.01 5-2.25m2.25 0c0-1.24 2.239-2.25 5-2.25s5 1.01 5 2.25m-10 0c0 1.24 2.239 2.25 5 2.25s5-1.01 5-2.25M8 10.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm8 0a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
      />
    </svg>
  );

  const menuGroups: MenuGroup[] = [
    {
      title: "Umum",
      items: [
        {
          text: "Dashboard",
          href: "/",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          ),
        },
        {
          text: "SOP",
          href: "/menu/sop",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h4m3 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ),
        },
        {
          text: "Bantuan",
          href: "/menu/bantuan",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v.01M12 13c0-1.2 1.5-1.2 1.5-2.5A1.5 1.5 0 0012 9a1.5 1.5 0 00-1.5 1.5" />
            </svg>
          ),
        },
      ],
    },
    {
      title: "Data Admin",
      items: [
        {
          text: "Owner",
          href: "/menu/owner-outlet",
          colorClass: "text-[#C92C1E]",
          icon: iconBuilding,
        },
        {
          text: "Outlet",
          href: "/menu/kelolaan-outlet",
          colorClass: "text-[#C92C1E]",
          icon: iconBuilding,
        },
        {
          text: "Katalog",
          href: "/menu/paket-langganan",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          ),
        },
        {
          text: "Topup",
          href: "/menu/wallets",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 8.25A2.25 2.25 0 016.75 6h10.5a2.25 2.25 0 012.25 2.25v7.5A2.25 2.25 0 0117.25 18H6.75a2.25 2.25 0 01-2.25-2.25v-7.5z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12h7.5M12 8.25v7.5" />
            </svg>
          ),
        },
        {
          text: "Subscribe",
          href: "/menu/subscribe",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 6.75A2.25 2.25 0 016.75 4.5h10.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25V6.75z"
              />
            </svg>
          ),
        },
        {
          text: "Mitra",
          href: "/menu/kelolaan-mitra",
          colorClass: "text-[#C92C1E]",
          icon: iconPeople,
        },
        {
          text: "Komisi",
          href: "/menu/komisi",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="19" y1="5" x2="5" y2="19" strokeLinecap="round" />
              <circle cx="6.5" cy="6.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
          ),
        },
        {
          text: "Kelola User",
          href: "/menu/kelola-user",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="9" cy="8" r="3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
              <circle cx="17" cy="9" r="2.25" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 20c0-2.6 1.9-4.7 4.5-4.7" />
            </svg>
          ),
        },
      ],
    },
    {
      title: "Marketing",
      items: [
        {
          text: "Lead",
          href: "/menu/lead",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.001 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          ),
        },
        {
          text: "Target",
          href: "/menu/target",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="4.5" />
              <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
            </svg>
          ),
        },
        {
          text: "Sales",
          href: "/menu/sales",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="8" width="18" height="12" rx="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          ),
        },
        {
          text: "Mitra Sales",
          href: "/menu/mitra-sales",
          colorClass: "text-[#C92C1E]",
          icon: iconPeople,
        },
        {
          text: "Closing",
          href: "/menu/closing",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l2.5 2.5L16 9" />
            </svg>
          ),
        },
        {
          text: "Training",
          href: "/menu/training",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4L2 9l10 5 10-5-10-5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
            </svg>
          ),
        },
        {
          text: "Interact",
          href: "/menu/interact",
          colorClass: "text-[#C92C1E]",
          icon: (className: string) => (
            <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 5h16v10H9l-5 4V5z"
              />
            </svg>
          ),
        },
      ],
    },
  ];

  const flatMenuItems = menuGroups.flatMap((group) => group.items);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      const savedUserName =
        localStorage.getItem("piposmart_user_name") || "User";

      sessionStorage.removeItem(`piposmart_sop_seen_${savedUserName}`);
      clearStoredAuth();
    }

    router.push("/auth/logout");
  };

  if (isAuthPage) {
    return (
      <html
        lang="id"
        className={isDarkMode ? "dark" : "light"}
        suppressHydrationWarning
      >
        <body
          className={`antialiased font-sans transition-colors duration-300 ${
            isDarkMode
              ? "bg-[#0F172A] text-gray-100"
              : "bg-[#FAF9F6] text-[#2C2C2E]"
          }`}
        >
          <AutoTableColumnVisibilityEnhancer />
          {children}
        </body>
      </html>
    );
  }

  if (!authChecked || !isAuthenticated) {
    return (
      <html
        lang="id"
        className={isDarkMode ? "dark" : "light"}
        suppressHydrationWarning
      >
        <body
          className={`antialiased font-sans transition-colors duration-300 ${
            isDarkMode
              ? "bg-[#0F172A] text-gray-100"
              : "bg-[#FAF9F6] text-[#2C2C2E]"
          }`}
        >
          <div className="flex min-h-screen items-center justify-center">
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-bold text-gray-500 shadow-sm">
              Memeriksa sesi login...
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html
      lang="id"
      className={isDarkMode ? "dark" : "light"}
      suppressHydrationWarning
    >
      <body
        className={`antialiased font-sans transition-colors duration-300 ${
          isDarkMode
            ? "bg-[#0F172A] text-gray-100"
            : "bg-[#FAF9F6] text-[#2C2C2E]"
        }`}
      >
        <AutoTableColumnVisibilityEnhancer />
        <div className="flex min-h-screen">
          <aside
            className={`fixed z-30 flex h-full flex-col justify-between border-r p-4 transition-all duration-300 ${
              isDarkMode
                ? "border-slate-800 bg-slate-950"
                : "border-gray-200/80 bg-white"
            } ${isSidebarOpen ? "w-64" : "w-20"}`}
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                className={`flex min-h-[65px] shrink-0 items-center justify-between border-b pb-4 ${
                  isDarkMode ? "border-slate-800" : "border-gray-100"
                }`}
              >
                {isSidebarOpen && (
                  <div className="transition-all duration-200">
                    <span
                      className={`block text-[10px] font-bold uppercase tracking-widest ${
                        isDarkMode ? "text-slate-500" : "text-gray-400"
                      }`}
                    >
                      WORKSPACE
                    </span>

                    <h2 className="mt-0.5 text-lg font-black tracking-tight text-[#C92C1E]">
                      Piposmart CRM
                    </h2>
                  </div>
                )}

                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`flex items-center justify-center rounded-xl border p-2 text-[#C92C1E] transition-all duration-200 hover:border-red-200 hover:bg-red-50 ${
                    isDarkMode
                      ? "border-slate-800 bg-slate-900"
                      : "border-gray-200/60 bg-gray-50"
                  } ${!isSidebarOpen ? "w-full text-center" : ""}`}
                  title={isSidebarOpen ? "Tutup Menu" : "Buka Menu"}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>

              <nav className="scrollbar-none flex-1 space-y-1 overflow-y-auto pt-4 pr-1">
                {isSidebarOpen
                  ? menuGroups.map((group) => {
                      const isOpen = openGroups[group.title] ?? true;
                      return (
                        <div key={group.title} className="pb-1">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.title)}
                            className="flex w-full items-center justify-between rounded-lg px-4 py-2 text-left"
                          >
                            <span
                              className={`text-[10px] font-black uppercase tracking-widest ${
                                isDarkMode ? "text-slate-500" : "text-gray-400"
                              }`}
                            >
                              {group.title}
                            </span>
                            <ChevronDownIcon
                              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                isDarkMode ? "text-slate-500" : "text-gray-400"
                              } ${
                                isOpen ? "rotate-0" : "-rotate-90"
                              }`}
                            />
                          </button>

                          {isOpen && (
                            <div className="space-y-1">
                              {group.items.map((item) => {
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
                                        : isDarkMode
                                          ? "text-slate-300 hover:bg-red-950/30 hover:text-red-300"
                                          : "text-gray-600 hover:bg-red-50 hover:text-[#C92C1E]"
                                    }`}
                                  >
                                    {item.icon(
                                      `w-5 h-5 shrink-0 transition-colors ${
                                        isActive ? "text-white" : item.colorClass
                                      }`,
                                    )}
                                    <span className="truncate text-sm font-semibold">
                                      {item.text}
                                    </span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  : flatMenuItems.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href));

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={item.text}
                          className={`flex items-center justify-center rounded-xl px-0 py-3 transition-all duration-200 ${
                            isActive
                              ? "bg-[#C92C1E] text-white shadow-sm"
                              : isDarkMode
                                ? "text-slate-300 hover:bg-red-950/30 hover:text-red-300"
                                : "text-gray-600 hover:bg-red-50 hover:text-[#C92C1E]"
                          }`}
                        >
                          {item.icon(
                            `w-5 h-5 shrink-0 transition-colors ${
                              isActive ? "text-white" : item.colorClass
                            }`,
                          )}
                        </Link>
                      );
                    })}
              </nav>
            </div>

            <div
              className={`space-y-3 border-t pt-4 ${
                isDarkMode ? "border-slate-800" : "border-gray-100"
              }`}
            >
              <div
                className={`rounded-2xl border p-3 transition-all duration-200 ${
                  isDarkMode
                    ? "border-slate-800 bg-slate-900/80"
                    : "border-red-100 bg-red-50/60"
                } ${!isSidebarOpen ? "p-2" : ""}`}
                title={`${loggedInUser} • ${loggedInRole} • Klik profile untuk setting`}
              >
                <div className="flex items-center gap-2">
                  <Link
                    href="/menu/setting"
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl transition ${
                      !isSidebarOpen ? "justify-center" : ""
                    }`}
                  >
                    <ProfileTagIcon
                      className={`h-4 w-4 shrink-0 ${
                        isDarkMode ? "text-red-300" : "text-[#C92C1E]"
                      }`}
                    />

                    {isSidebarOpen && (
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-xs font-black leading-tight ${
                            isDarkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {loggedInUser}
                        </p>

                        <p className="truncate text-[9px] font-black uppercase tracking-wider text-[#C92C1E]">
                          {loggedInRole}
                        </p>
                      </div>
                    )}
                  </Link>

                  {isSidebarOpen && (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition ${
                        isDarkMode
                          ? "border-red-900/50 bg-red-950/40 text-red-300 hover:bg-red-950"
                          : "border-red-100 bg-white text-red-600 hover:bg-red-50"
                      }`}
                      title="Keluar"
                    >
                      <LogoutIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {!isSidebarOpen && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`mt-2 flex h-9 w-full items-center justify-center rounded-xl border transition ${
                      isDarkMode
                        ? "border-red-900/50 bg-red-950/40 text-red-300"
                        : "border-red-100 bg-white text-red-600"
                    }`}
                    title="Keluar"
                  >
                    <LogoutIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div
                className={`flex items-center px-1 text-[11px] font-semibold ${
                  isSidebarOpen ? "justify-between" : "justify-center"
                } ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
              >
                {isSidebarOpen && <span>v0.1 • Underdevelopment</span>}
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
              </div>
            </div>
          </aside>

          <main
            className={`min-h-screen flex-1 p-8 transition-all duration-300 ${
              isDarkMode ? "bg-[#0F172A]" : "bg-[#FAF9F6]"
            } ${isSidebarOpen ? "ml-64" : "ml-20"}`}
          >
            <div className="w-full max-w-full">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
