"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // STATE: Mengontrol status buka/tutup sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Cek status halaman login
  const isLoginPage = pathname === "/login";

  // 🌟 Menu navigasi utama sidebar
  const menuItems = [
    { 
      text: "Dashboard Overview", 
      href: "/", 
      colorClass: "text-[#C92C1E]", 
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      text: "SOP Operasional", 
      href: "/menu/sop", 
      colorClass: "text-[#C92C1E]", 
      // 🛠️ FIX: dulu icon-nya sama persis dengan "Report" (bar chart), padahal
      // SOP itu soal panduan/dokumen prosedur — sekarang pakai icon dokumen
      // dengan tanda centang (checklist) yang lebih pas secara makna.
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4m3 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      text: "Kelolaan Customer", 
      href: "/menu/data-kelolaan", 
      colorClass: "text-[#C92C1E]", 
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.001 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      text: "Report", 
      href: "/menu/report", 
      colorClass: "text-[#C92C1E]", 
      icon: (className: string) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("isLoggedIn");
    }
    router.push("/login");
  };

  if (isLoginPage) {
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
          
          {/* SIDEBAR NAVIGASI GLOBAL */}
          <aside className={`bg-white border-r border-gray-200/80 p-4 flex flex-col justify-between fixed h-full z-30 transition-all duration-300 ${
            isSidebarOpen ? "w-64" : "w-20"
          }`}>
            <div className="space-y-6 overflow-y-auto max-h-[80vh] pr-1 scrollbar-none">
              
              {/* Header Sidebar Branding */}
              <div className="pb-4 border-b border-gray-100 flex items-center justify-between min-h-[65px]">
                {isSidebarOpen && (
                  <div className="transition-all duration-200">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">WORKSPACE</span>
                    <h2 className="text-lg font-black text-[#C92C1E] mt-0.5 tracking-tight">Piposmart CRM</h2>
                  </div>
                )}
                
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`p-2 rounded-xl bg-gray-50 hover:bg-red-50 text-[#C92C1E] border border-gray-200/60 hover:border-red-200 transition-all duration-200 cursor-pointer flex items-center justify-center ${
                    !isSidebarOpen ? "w-full text-center" : ""
                  }`}
                  title={isSidebarOpen ? "Tutup Menu" : "Buka Menu"}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              
              {/* Menu Navigasi Link Minimalis */}
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-[#C92C1E] text-white shadow-sm"
                          : "text-gray-600 hover:bg-red-50 hover:text-[#C92C1E]"
                      } ${!isSidebarOpen ? "justify-center px-0" : ""}`}
                    >
                      {item.icon(`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? "text-white" : item.colorClass
                      }`)}
                      
                      {isSidebarOpen && <span className="text-sm font-semibold truncate">{item.text}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bagian Bawah Sidebar */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <button
                onClick={handleLogout}
                className={`w-full flex items-center justify-between py-2.5 text-sm font-bold text-red-600 bg-red-50/60 hover:bg-red-50 border border-red-100 rounded-xl transition-all duration-200 ${
                  isSidebarOpen ? "px-4" : "justify-center px-0"
                }`}
              >
                {isSidebarOpen ? (
                  <>
                    <span className="text-sm font-semibold">Sign Out</span>
                    <span className="text-xs opacity-60">→</span>
                  </>
                ) : (
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
              </button>

              <div className={`text-[11px] text-gray-400 font-semibold flex items-center px-1 ${
                isSidebarOpen ? "justify-between" : "justify-center"
              }`}>
                {isSidebarOpen && <span>v1.0.0 • Active</span>}
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
              </div>
            </div>
          </aside>

          {/* AREA PANEL KONTEN UTAMA */}
          <main className={`flex-1 p-8 min-h-screen bg-[#FAF9F6] transition-all duration-300 ${
            isSidebarOpen ? "ml-64" : "ml-20"
          }`}>
            <div className="max-w-full w-full">
              {children}
            </div>
          </main>

        </div>
      </body>
    </html>
  );
}