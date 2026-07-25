import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { REFRESH_COOKIE_NAME } from "@/app/lib/auth/config";

/**
 * Guard rute sisi server.
 *
 * Sejak Next.js 16 berkas ini bernama `proxy.ts` (sebelumnya `middleware.ts`).
 *
 * Menggantikan guard lama di `app/layout.tsx` yang memakai `useEffect` +
 * `localStorage`. Guard lama berjalan setelah render, sehingga konten
 * terproteksi sempat terlihat sekilas, dan cukup satu perintah di console
 * untuk melewatinya. Pemeriksaan di sini terjadi sebelum satu byte pun
 * dikirim ke browser.
 *
 * Ini pemeriksaan optimistik: cukup memastikan cookie sesi ada. Otorisasi
 * yang sebenarnya tetap dilakukan backend pada setiap panggilan API.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(REFRESH_COOKIE_NAME)?.value);
  const isAuthRoute = pathname.startsWith("/auth");

  if (!hasSession && !isAuthRoute) {
    const loginUrl = new URL("/auth/login", request.url);

    // Simpan tujuan awal supaya pengguna dikembalikan ke sana setelah login.
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }

    return NextResponse.redirect(loginUrl);
  }

  // Sudah punya sesi tapi membuka halaman login — langsung ke dashboard.
  if (hasSession && pathname === "/auth/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Kecualikan Route Handler auth (BFF-nya sendiri), aset internal Next,
   * dan berkas statis.
   */
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
