import type { ErrorEnvelope, SuccessEnvelope } from "./types";

/**
 * Error API bertipe.
 *
 * Membawa `requestId` agar pesan yang tampil di layar bisa langsung
 * dicocokkan dengan log backend (backend menyertakan `request_id` pada
 * setiap response — lihat `internal/platform/httpx/response.go`).
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string;
  readonly details?: unknown;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    requestId: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    this.requestId = params.requestId;
    this.details = params.details;
  }
}

/**
 * `force: true` mewajibkan penukaran refresh token, mengabaikan token yang
 * masih tersimpan. Dipakai setelah menerima 401: token yang ada terlihat
 * masih berlaku menurut jam browser, tapi backend sudah menolaknya.
 */
type TokenProvider = (options?: { force?: boolean }) => Promise<string | null>;

let tokenProvider: TokenProvider = async () => null;

/** Didaftarkan sekali oleh SessionProvider saat aplikasi dijalankan. */
export function registerTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  if (!url) {
    throw new ApiError({
      code: "CONFIG_ERROR",
      message:
        "NEXT_PUBLIC_BACKEND_API_URL belum diset. Salin .env.example menjadi .env.local.",
      status: 0,
      requestId: "",
    });
  }

  return url.replace(/\/$/, "");
}

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

/** Parameter kosong dibuang supaya tidak terkirim sebagai `?q=` yang menyesatkan. */
export function buildQuery(params: QueryParams = {}): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }

  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}

async function parseError(
  response: Response,
): Promise<ApiError> {
  let body: Partial<ErrorEnvelope> = {};

  try {
    body = await response.json();
  } catch {
    // Response tanpa body JSON (mis. 502 dari proxy) — pakai default di bawah.
  }

  return new ApiError({
    code: body.error?.code ?? "UNKNOWN_ERROR",
    message:
      body.error?.message ??
      `Permintaan gagal dengan status ${response.status}.`,
    status: response.status,
    requestId: body.error?.request_id ?? "",
    details: body.error?.details,
  });
}

/**
 * Pemanggil endpoint data backend.
 *
 * Jalur ini menuju backend SECARA LANGSUNG dari browser (CORS backend sudah
 * mengizinkan origin frontend), bukan lewat Route Handler. Yang lewat Route
 * Handler hanya urusan auth, karena hanya di situ refresh token terlibat.
 *
 * Saat menerima 401, satu kali percobaan refresh dilakukan lalu request
 * diulang — menutupi kasus access token kedaluwarsa di tengah pemakaian.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const send = async (token: string | null): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");

    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${baseUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  };

  let response: Response;

  try {
    response = await send(await tokenProvider());
  } catch {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message:
        "Tidak dapat terhubung ke server. Periksa koneksi atau pastikan backend sedang berjalan.",
      status: 0,
      requestId: "",
    });
  }

  if (response.status === 401) {
    const refreshedToken = await tokenProvider({ force: true });

    if (refreshedToken) {
      response = await send(refreshedToken);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  const envelope: SuccessEnvelope<T> = await response.json();
  return envelope.data;
}
