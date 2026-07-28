"use client";

import { useEffect, useState } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

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
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

export default function SettingPage() {
  usePageTitle("Setting");
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("Sales");
  const [username, setUsername] = useState("-");

  useEffect(() => {
    setUserName(localStorage.getItem("piposmart_user_name") || "User");
    setUserRole(localStorage.getItem("piposmart_user_role") || "Sales");
    setUsername(localStorage.getItem("piposmart_user_username") || "-");
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
                Data akun dummy yang sedang aktif.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-black uppercase text-gray-400">Nama</p>
              <p className="mt-1 text-sm font-black text-gray-900">{userName}</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-black uppercase text-gray-400">Username</p>
              <p className="mt-1 text-sm font-black text-gray-900">{username}</p>
            </div>

            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
              <p className="text-[10px] font-black uppercase text-[#C92C1E]">Role</p>
              <p className="mt-1 text-sm font-black text-[#C92C1E]">{userRole}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-gray-900">Preferensi Sistem</p>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Fitur setting tambahan bisa ditambahkan di sini.
          </p>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div>
                <p className="text-xs font-black text-gray-900">Mode Tampilan</p>
                <p className="text-[11px] font-medium text-gray-400">Light mode aktif</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#C92C1E] shadow-sm">
                Light
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div>
                <p className="text-xs font-black text-gray-900">Status Akun</p>
                <p className="text-[11px] font-medium text-gray-400">Sesi login tersimpan lokal</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-green-500" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}