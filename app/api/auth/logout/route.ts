import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  backendUrl,
} from "@/app/lib/auth/config";

/**
 * POST /api/auth/logout
 *
 * Mencabut sesi di backend lalu menghapus cookie refresh token.
 * Cookie tetap dihapus walau panggilan backend gagal — dari sudut pandang
 * pengguna, logout tidak boleh bisa gagal.
 */
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  if (refreshToken) {
    try {
      await fetch(backendUrl("/auth/logout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: "no-store",
      });
    } catch {
      // Diabaikan dengan sengaja: cookie tetap dibersihkan di bawah.
    }
  }

  const response = NextResponse.json({ status: "logged_out" });
  response.cookies.delete({
    name: REFRESH_COOKIE_NAME,
    path: REFRESH_COOKIE_PATH,
  });

  return response;
}
