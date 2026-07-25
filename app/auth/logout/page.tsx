"use client";

import { useEffect } from "react";

import { useSession } from "@/app/lib/auth/session";

/**
 * Halaman logout.
 *
 * `session.logout()` mencabut sesi di backend, menghapus cookie refresh lewat
 * Route Handler, membersihkan access token di memory, lalu mengarahkan ke
 * halaman login. Penghapusan `localStorage` yang lama tidak diperlukan lagi
 * karena token tidak pernah lagi disimpan di sana — tapi tetap dibersihkan
 * sekali untuk merapikan sisa data dari versi sebelumnya.
 */
export default function LogoutPage() {
  const { logout } = useSession();

  useEffect(() => {
    // Bersihkan sisa key dari implementasi lama (aman bila sudah tidak ada).
    [
      "piposmart_access_token",
      "piposmart_is_logged_in",
      "piposmart_user_name",
      "piposmart_user_role",
      "piposmart_user_username",
      "piposmart_user",
      "piposmart_token",
      "isLoggedIn",
    ].forEach((key) => localStorage.removeItem(key));

    void logout();
  }, [logout]);

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
