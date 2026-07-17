"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

const CallChatIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
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
      d="M7.5 8.25h9m-9 3h5.25M21 12c0 4.142-4.03 7.5-9 7.5a10.7 10.7 0 01-3.58-.61L3 20.25l1.58-4.11A6.93 6.93 0 013 12c0-4.142 4.03-7.5 9-7.5s9 3.358 9 7.5z"
    />
  </svg>
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loggedInUser, setLoggedInUser] = useState("User");
  const [loggedInRole, setLoggedInRole] = useState("Guest");

  const isAuthPage = pathname.startsWith("/auth");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isLoggedIn = localStorage.getItem("piposmart_is_logged_in");
    const userName = localStorage.getItem("piposmart_user_name");
    const userRole = localStorage.getItem("piposmart_user_role");

    if (!isAuthPage && isLoggedIn !== "true") {
      router.replace("/auth/login");
      return;
    }

    if (userName) setLoggedInUser(userName);
    if (userRole) setLoggedInRole(userRole);
  }, [isAuthPage, router]);

  const menuItems = [
    {
      text: "Dashboard Overview",
      href: "/",
      colorClass: "text-[#C92C1E]",
      icon: (className: string) => (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      text: "SOP Operasional",
      href: "/menu/sop",
      colorClass: "text-[#C92C1E]",
      icon: (className: string) => (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h4m3 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      text: "Kelolaan Customer",
      href: "/menu/data-kelolaan",
      colorClass: "text-[#C92C1E]",
      icon: (className: string) => (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.001 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      text: "Call & Chat",
      href: "/menu/call-chat",
      colorClass: "text-[#C92C1E]",
      icon: (className: string) => <CallChatIcon className={className} />,
    },
    {
      text: "Report",
      href: "/menu/report",
      colorClass: "text-[#C92C1E]",
      icon: (className: string) => (
        <svg
          className={className}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },

  ];

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("piposmart_is_logged_in");
      localStorage.removeItem("piposmart_user_name");
      localStorage.removeItem("piposmart_user_role");
      localStorage.removeItem("piposmart_user_username");
      localStorage.removeItem("piposmart_user");
      localStorage.removeItem("piposmart_token");
      localStorage.removeItem("isLoggedIn");
    }

    router.push("/auth/logout");
  };

  if (isAuthPage) {
    return (
      <html lang="id">
        <body className="bg-[#FAF9F6] text-[#2C2C2E] antialiased font-sans">
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="id">
      <body className="bg-[#FAF9F6] text-[#2C2C2E] antialiased font-sans">
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

              <nav className="space-y-1">
                {menuItems.map((item) => {
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
                          isActive ? "text-white" : item.colorClass
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
                title={`${loggedInUser} • ${loggedInRole}`}
              >
                <ProfileTagIcon className="h-4 w-4 shrink-0" />
                {isSidebarOpen && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black leading-tight text-gray-900">
                      {loggedInUser}
                    </p>
                    <p className="truncate text-[9px] font-black uppercase tracking-wider text-[#C92C1E]">
                      {loggedInRole}
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
                onClick={handleLogout}
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
                  <svg
                    className="h-5 w-5 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
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
      </body>
    </html>
  );
}