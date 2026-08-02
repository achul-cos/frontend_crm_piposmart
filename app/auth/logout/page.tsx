"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearStoredAuth } from "@/app/lib/api";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    clearStoredAuth();

    router.replace("/auth/login");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F7F9] p-4 font-sans">
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl">
          👋
        </div>
        <p className="text-sm font-black text-gray-900">Sedang logout...</p>
        <p className="mt-1 text-xs font-medium text-gray-400">
          Menghapus sesi dan mengarahkan kembali ke halaman login.
        </p>
      </div>
    </main>
  );
}
