import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_MAX_AGE,
  backendUrl,
  refreshCookieOptions,
} from "@/app/lib/auth/config";
import type { ErrorEnvelope, SessionPayload } from "@/app/lib/api/types";

/**
 * POST /api/auth/refresh
 *
 * Menukar refresh token (dari cookie httpOnly) dengan access token baru.
 * Backend melakukan rotasi refresh token pada setiap pemakaian, sehingga
 * cookie WAJIB ditimpa dengan token hasil rotasi — kalau tidak, refresh
 * berikutnya akan memakai token yang sudah dicabut.
 */
export async function POST() {
  // Next.js 16: cookies() bersifat async.
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      {
        error: {
          code: "NO_SESSION",
          message: "Tidak ada sesi aktif.",
          request_id: "",
        },
      } satisfies ErrorEnvelope,
      { status: 401 },
    );
  }

  const upstream = await fetch(backendUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });

  const payload = await upstream.json();

  if (!upstream.ok) {
    // Refresh token tidak berlaku lagi — bersihkan cookie supaya proxy.ts
    // langsung mengarahkan pengguna ke halaman login.
    const failure = NextResponse.json(payload, { status: upstream.status });
    failure.cookies.delete({
      name: REFRESH_COOKIE_NAME,
      path: REFRESH_COOKIE_PATH,
    });
    return failure;
  }

  const { access_token, refresh_token, expires_in, user } = payload.data ?? {};
  const session: SessionPayload = { access_token, expires_in, user };
  const response = NextResponse.json(session);

  if (refresh_token) {
    response.cookies.set(
      REFRESH_COOKIE_NAME,
      refresh_token,
      refreshCookieOptions(REFRESH_TOKEN_MAX_AGE),
    );
  }

  return response;
}
