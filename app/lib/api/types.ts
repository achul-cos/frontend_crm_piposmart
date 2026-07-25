/**
 * Tipe amplop (envelope) response backend.
 *
 * Bentuknya diverifikasi langsung dari
 * `backend_crm_piposmart/internal/platform/httpx/response.go`.
 */

export type ResponseMeta = {
  request_id: string;
};

export type SuccessEnvelope<T> = {
  data: T;
  meta: ResponseMeta;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
  request_id: string;
};

export type ErrorEnvelope = {
  error: ApiErrorBody;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

export type PaginatedList<T> = {
  items: T[];
  pagination: PaginationMeta;
};

/** Ringkasan user yang dipakai pada relasi lead/closing. */
export type UserSummary = {
  id: number;
  name: string;
  role: string;
};

export type AuthUser = {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  must_change_password: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
};

/** Payload yang dikembalikan Route Handler `/api/auth/login` dan `/api/auth/refresh`. */
export type SessionPayload = {
  access_token: string;
  /** Umur access token dalam detik (backend: 899). */
  expires_in: number;
  user: AuthUser;
};
