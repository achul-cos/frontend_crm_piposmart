/**
 * Konfigurasi auth sisi server.
 *
 * Modul ini HANYA boleh diimpor dari Route Handler (`app/api/**`) atau `proxy.ts`.
 * `BACKEND_API_URL` sengaja tidak memakai prefix `NEXT_PUBLIC_` supaya tidak
 * ikut terbundel ke browser.
 */

export const REFRESH_COOKIE_NAME =
  process.env.AUTH_REFRESH_COOKIE || "piposmart_rt";

/**
 * Path cookie harus `/`, bukan `/api/auth`.
 *
 * `proxy.ts` menjaga rute `/menu/*` dan `/` dengan cara memeriksa keberadaan
 * cookie ini. Kalau path dipersempit ke `/api/auth`, browser tidak akan
 * menyertakan cookie pada navigasi ke `/menu/*` sehingga guard selalu
 * menganggap pengguna belum login. Keamanan tetap terjaga oleh `httpOnly`
 * (JavaScript tidak bisa membacanya) dan `sameSite: lax`.
 */
export const REFRESH_COOKIE_PATH = "/";

export function backendUrl(path: string): string {
  const base = process.env.BACKEND_API_URL;

  if (!base) {
    throw new Error(
      "BACKEND_API_URL belum diset. Salin .env.example menjadi .env.local.",
    );
  }

  return `${base.replace(/\/$/, "")}${path}`;
}

/**
 * Atribut cookie refresh token.
 *
 * `httpOnly` adalah inti dari keputusan arsitektur Sprint FE-01: refresh token
 * tidak pernah dapat dibaca JavaScript di browser, sehingga tidak bisa dicuri
 * lewat XSS. `sameSite: lax` cukup karena seluruh pemanggil berada pada origin
 * yang sama (Route Handler Next.js).
 */
export function refreshCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: REFRESH_COOKIE_PATH,
    // Catatan: cookie ini tidak pernah dibaca JavaScript browser; satu-satunya
    // pembacanya adalah Route Handler auth dan proxy.ts, keduanya di server.
    maxAge: maxAgeSeconds,
  };
}

/** JWT_REFRESH_TTL backend = 168h. */
export const REFRESH_TOKEN_MAX_AGE = 168 * 60 * 60;
