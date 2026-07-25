import { NextResponse } from "next/server";

import {
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_MAX_AGE,
  backendUrl,
  refreshCookieOptions,
} from "@/app/lib/auth/config";
import type { ErrorEnvelope, SessionPayload } from "@/app/lib/api/types";

/**
 * POST /api/auth/login
 *
 * Perantara (BFF) menuju `POST /api/v1/auth/login` backend.
 *
 * Alasan keberadaannya: backend mengembalikan `refresh_token` di body JSON
 * (konfigurasi `AUTH_COOKIE_*` di .env.example backend tidak pernah
 * diimplementasikan). Kalau login dipanggil langsung dari browser, refresh
 * token akan berakhir di localStorage dan terbuka terhadap XSS. Route Handler
 * ini menahan refresh token di server lalu menaruhnya di cookie httpOnly,
 * sehingga yang sampai ke browser hanya access token berumur pendek.
 */
export async function POST(request: Request) {
  let credentials: unknown;

  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Body request bukan JSON yang valid.",
          request_id: "",
        },
      } satisfies ErrorEnvelope,
      { status: 400 },
    );
  }

  const upstream = await fetch(backendUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    cache: "no-store",
  });

  const payload = await upstream.json();

  if (!upstream.ok) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const { access_token, refresh_token, expires_in, user } = payload.data ?? {};

  if (!access_token || !refresh_token) {
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_CONTRACT_ERROR",
          message: "Response login backend tidak memuat token yang diharapkan.",
          request_id: payload?.meta?.request_id ?? "",
        },
      } satisfies ErrorEnvelope,
      { status: 502 },
    );
  }

  const session: SessionPayload = { access_token, expires_in, user };
  const response = NextResponse.json(session);

  response.cookies.set(
    REFRESH_COOKIE_NAME,
    refresh_token,
    refreshCookieOptions(REFRESH_TOKEN_MAX_AGE),
  );

  return response;
}
