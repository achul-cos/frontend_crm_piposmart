import { clearPersistedQueryCache } from "@/app/lib/queryPersistence";
import { frontendEnv } from "@/app/lib/env";

const API_BASE_URL = frontendEnv.apiBaseUrl;
const ACCESS_TOKEN_KEY = "piposmart_access_token";
const REFRESH_TOKEN_KEY = "piposmart_refresh_token";
const LEGACY_ACCESS_TOKEN_KEY = "piposmart_token";
const nativeFetch: typeof globalThis.fetch = (input, init) =>
  globalThis.fetch(input, init);
let refreshTokenPromise: Promise<string | null> | null = null;
const responseContextMap = new WeakMap<Response, ApiRequestContext>();

export type AppRole = "ADMIN" | "SUPERVISOR" | "SALES" | "UNKNOWN";

export interface ApiRequestContext {
  method: string;
  endpoint: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
  status: number;
  method?: string;
  endpoint?: string;
}

export class ApiError extends Error {
  code: string;
  requestId?: string;
  details?: unknown;
  status: number;
  method?: string;
  endpoint?: string;

  constructor(payload: ApiErrorPayload) {
    super(
      `[${payload.code}] ${payload.message}${
        payload.requestId ? ` (ref: ${payload.requestId})` : ""
      }`,
    );
    this.name = "ApiError";
    this.code = payload.code;
    this.requestId = payload.requestId;
    this.details = payload.details;
    this.status = payload.status;
    this.method = payload.method;
    this.endpoint = payload.endpoint;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getApiErrorTechnicalDetails(error: unknown): string {
  if (error instanceof ApiError) {
    const lines = [
      `status: ${error.status}`,
      error.code ? `code: ${error.code}` : null,
      error.requestId ? `request_id: ${error.requestId}` : null,
      error.method || error.endpoint
        ? `endpoint: ${error.method || "GET"} ${error.endpoint || "-"}`
        : null,
      error.details !== undefined
        ? `details: ${
            typeof error.details === "string"
              ? error.details
              : JSON.stringify(error.details, null, 2)
          }`
        : null,
    ].filter(Boolean);

    return lines.join("\n");
  }

  if (error instanceof Error) return error.message;
  return String(error);
}

export interface StoredUserSession {
  isAuthenticated: boolean;
  accessToken: string;
  refreshToken: string;
  name: string;
  username: string;
  role: AppRole;
  rawRole: string;
}

// ─── Auth helpers ───────────────────────────────────────────────────────────

export function getStoredAccessToken(): string {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY) ||
    ""
  );
}

export function normalizeAppRole(role?: string | null): AppRole {
  const value = String(role || "").trim().toUpperCase();

  if (value.includes("ADMIN")) return "ADMIN";
  if (value.includes("SUPERVISOR")) return "SUPERVISOR";
  if (value.includes("SALES")) return "SALES";

  return "UNKNOWN";
}

export function getRoleLabel(role?: string | null): string {
  const normalized = normalizeAppRole(role);

  if (normalized === "ADMIN") return "Admin";
  if (normalized === "SUPERVISOR") return "Supervisor";
  if (normalized === "SALES") return "Sales";

  return "Unknown";
}

export function isAdminRole(role?: string | null): boolean {
  return normalizeAppRole(role) === "ADMIN";
}

export function isSupervisorRole(role?: string | null): boolean {
  return normalizeAppRole(role) === "SUPERVISOR";
}

export function isSalesRole(role?: string | null): boolean {
  return normalizeAppRole(role) === "SALES";
}

export function readStoredUserSession(): StoredUserSession {
  if (typeof window === "undefined") {
    return {
      isAuthenticated: false,
      accessToken: "",
      refreshToken: "",
      name: "User",
      username: "",
      role: "UNKNOWN",
      rawRole: "",
    };
  }

  const accessToken = getStoredAccessToken();
  const refreshToken = getStoredRefreshToken();
  const rawRole = localStorage.getItem("piposmart_user_role") || "";

  return {
    isAuthenticated: accessToken.trim() !== "",
    accessToken,
    refreshToken,
    name: localStorage.getItem("piposmart_user_name") || "User",
    username:
      localStorage.getItem("piposmart_user_username") ||
      localStorage.getItem("piposmart_user_email") ||
      "",
    role: normalizeAppRole(rawRole),
    rawRole,
  };
}

function getStoredRefreshToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

function updateStoredUserProfile(user: Record<string, unknown> | undefined) {
  if (typeof window === "undefined" || !user) return;

  const name =
    typeof user.name === "string"
      ? user.name
      : typeof user.full_name === "string"
        ? user.full_name
        : "";
  const username =
    typeof user.email === "string"
      ? user.email
      : typeof user.username === "string"
        ? user.username
        : "";
  const roleSource =
    typeof user.role === "string"
      ? user.role
      : typeof user.role_name === "string"
        ? user.role_name
        : "";
  const role = normalizeAppRole(roleSource);

  if (name) localStorage.setItem("piposmart_user_name", name);
  if (username) localStorage.setItem("piposmart_user_username", username);
  if (username) localStorage.setItem("piposmart_user_email", username);
  if (role !== "UNKNOWN") localStorage.setItem("piposmart_user_role", role);

  if (name || username || role !== "UNKNOWN") {
    localStorage.setItem(
      "piposmart_user",
      JSON.stringify({
        name: name || localStorage.getItem("piposmart_user_name") || "User",
        username:
          username || localStorage.getItem("piposmart_user_username") || "",
        role:
          role !== "UNKNOWN"
            ? role
            : localStorage.getItem("piposmart_user_role") || "",
      }),
    );
  }
}

export function storeAuthSession(payload?: {
  access_token?: string;
  refresh_token?: string;
  user?: Record<string, unknown>;
}) {
  if (typeof window === "undefined" || !payload) return;

  if (payload.access_token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, payload.access_token);
  }

  if (payload.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh_token);
  }

  updateStoredUserProfile(payload.user);

  window.dispatchEvent(new Event("piposmart-auth-change"));
}

export function clearStoredAuth(options: { redirectToLogin?: boolean } = {}) {
  if (typeof window === "undefined") return;

  clearPersistedQueryCache();
  localStorage.removeItem("piposmart_is_logged_in");
  localStorage.removeItem("piposmart_user_name");
  localStorage.removeItem("piposmart_user_role");
  localStorage.removeItem("piposmart_user_username");
  localStorage.removeItem("piposmart_user_email");
  localStorage.removeItem("piposmart_user");
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  localStorage.removeItem("isLoggedIn");

  window.dispatchEvent(new Event("piposmart-auth-change"));

  if (options.redirectToLogin && !window.location.pathname.startsWith("/auth/login")) {
    window.location.href = "/auth/login";
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredAccessToken();

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function rotateRefreshToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  const response = await nativeFetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: {
          access_token?: string;
          refresh_token?: string;
          user?: Record<string, unknown>;
        };
      }
    | null;

  if (!response.ok || !payload?.data?.access_token) {
    clearStoredAuth();
    return null;
  }

  storeAuthSession(payload.data);
  return payload.data.access_token || null;
}

async function ensureFreshAccessToken(): Promise<string | null> {
  if (!refreshTokenPromise) {
    refreshTokenPromise = rotateRefreshToken().finally(() => {
      refreshTokenPromise = null;
    });
  }

  return refreshTokenPromise;
}

function shouldBypassRefresh(url: string) {
  return (
    url.includes("/api/v1/auth/login") ||
    url.includes("/api/v1/auth/refresh") ||
    url.includes("/api/v1/auth/logout")
  );
}

function normalizeEndpoint(url: string) {
  if (url.startsWith(API_BASE_URL)) {
    return url.slice(API_BASE_URL.length) || "/";
  }

  try {
    const parsed = new URL(url, API_BASE_URL);
    if (parsed.origin === new URL(API_BASE_URL).origin) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // ignore parse errors and fall back to raw url
  }

  return url;
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const execute = async (tokenOverride?: string) => {
    const headers = new Headers(init.headers || {});

    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = tokenOverride || getStoredAccessToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await nativeFetch(input, {
      ...init,
      credentials: init.credentials || "include",
      headers,
    });

    responseContextMap.set(response, {
      method: String(init.method || "GET").toUpperCase(),
      endpoint: normalizeEndpoint(url),
    });

    return response;
  };

  let response = await execute();

  if (response.status !== 401 || shouldBypassRefresh(url)) {
    return response;
  }

  const refreshedToken = await ensureFreshAccessToken();
  if (!refreshedToken) {
    clearStoredAuth({ redirectToLogin: true });
    return response;
  }

  response = await execute(refreshedToken);

  if (response.status === 401) {
    clearStoredAuth({ redirectToLogin: true });
  }

  return response;
}

export async function authFetchJson<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await authFetch(`${API_BASE_URL}/api/v1${path}`, options);
  return handleResponse<T>(response);
}

async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return authFetch(input, init);
}

async function handleResponse<T = unknown>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const code = body?.error?.code || "UNKNOWN";
    const message = body?.error?.message || `Request gagal (${res.status})`;
    const requestId = body?.error?.request_id;
    const details = body?.error?.details;
    const requestContext = responseContextMap.get(res);
    const apiError = new ApiError({
      code,
      message,
      requestId,
      details,
      status: res.status,
      method: requestContext?.method,
      endpoint: requestContext?.endpoint,
    });

    const logPayload = {
      code,
      message,
      status: res.status,
      request_id: requestId,
      method: requestContext?.method,
      endpoint: requestContext?.endpoint,
      details,
    };

    if (frontendEnv.enableApiErrorDebug) {
      if (res.status >= 500) {
        console.error("[api] server error", logPayload);
      } else {
        console.warn("[api] request error", logPayload);
      }
    }

    throw apiError;
  }

  return body as T;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OwnerListParams {
  q?: string;
  code?: string;
  name?: string;
  phone?: string;
  brand_name?: string;
  province?: string;
  city?: string;
  page?: number;
  limit?: number;
  sort?: string;
  status?: string;
  subscription_status?: string;
  start_date?: string;
  end_date?: string;
  created_from?: string;
  created_to?: string;
  scope?: "active" | "trash" | "unscoped";
}

export interface BackendOwner {
  id: number;
  code: string;
  name: string;
  phone: string;
  email?: string;
  brand_name: string;
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  sub_district?: string;
  status: string;
  subscription_status?: string;
  subscribed_outlet_count?: number;
  outlet_count?: number;
  wallet_balance?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BackendOutlet {
  id: number;
  owner_id?: number | null;
  code?: string;
  name: string;
  phone: string;
  province?: string;
  city?: string;
  district?: string;
  sub_district?: string;
  address?: string;
  status?: string;
  entered_by_user_id?: number;
  entered_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OwnerOutletListResponse {
  data: {
    items: BackendOutlet[];
  };
}

export interface OwnerPagination {
  page: number;
  limit: number;
  total: number;
}

export interface OwnerListResponse {
  data: {
    items: BackendOwner[];
    pagination: OwnerPagination;
  };
  meta: { request_id: string };
}

export interface OwnerDetailResponse {
  data: BackendOwner;
  meta: { request_id: string };
}

export interface BulkDeleteResponse {
  data: { ids: number[]; affected: number };
  meta: { request_id: string };
}

// ─── Owner API ──────────────────────────────────────────────────────────────

export async function fetchOwners(
  params: OwnerListParams = {},
): Promise<OwnerListResponse> {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && key !== "scope") {
      query.set(key, String(value));
    }
  });

  const qs = query.toString();
  let basePath = "/api/v1/owners";
  if (params.scope === "trash") basePath = "/api/v1/owners/trash";
  else if (params.scope === "unscoped") basePath = "/api/v1/owners/unscoped";

  const url = `${API_BASE_URL}${basePath}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<OwnerListResponse>(res);
  return data;
}

export async function fetchOwnerDetail(
  ownerId: number,
): Promise<OwnerDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const responseData = await handleResponse<OwnerDetailResponse>(res);
  return responseData;
}

// Sprint 15a — GET /owners/:id/overview: wallet balance rolled up at the Owner
// level (an owner has exactly one wallet shared across all its outlets),
// plus lifetime transfer/topup/spent totals and derived status badges.
export interface OwnerOverviewBalance {
  wallet: {
    id: number;
    account_code: string;
    currency: string;
    balance: string;
    ledger_balance: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
  total_transferred: string;
  total_topup: string;
  total_spent: string;
}

export interface OwnerOverviewStatus {
  age_status: "NEW" | "OLD";
  subscription_status: "BERLANGGANAN" | "NOT_SUBSCRIBE";
  subscribed_outlet_count: number;
  outlet_count: number;
}

export interface OwnerOverview {
  id: number;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  brand_name?: string;
  province?: string;
  city?: string;
  address?: string;
  status: string;
  balance: OwnerOverviewBalance;
  owner_status: OwnerOverviewStatus;
  created_at: string;
  updated_at: string;
}

export async function getOwnerOverview(ownerId: number): Promise<OwnerOverview> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/overview`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<OwnerOverview>>(res);
  return data.data;
}

export async function fetchOwnerOutlets(
  ownerId: number,
): Promise<BackendOutlet[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<OwnerOutletListResponse>(res);
  return data.data?.items || [];
}

export async function createOwner(
  data: Partial<BackendOwner>,
): Promise<OwnerDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const responseData = await handleResponse<OwnerDetailResponse>(res);
  return responseData;
}

export async function updateOwner(
  ownerId: number,
  data: Partial<BackendOwner>,
): Promise<OwnerDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const responseData = await handleResponse<OwnerDetailResponse>(res);
  return responseData;
}

export async function bulkCreateOwnerOutlets(
  ownerId: number,
  items: { code: string; name: string; phone?: string; province?: string; city?: string; district?: string; sub_district?: string; address?: string }[],
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets/bulk`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ items }),
  });
  return handleResponse(res);
}
export async function bulkUpdateOwnerOutlets(
  ownerId: number,
  items: { id: number; code?: string; name?: string; phone?: string; province?: string; city?: string; address?: string }[],
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets/bulk`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ items }),
  });
  return handleResponse(res);
}

export async function bulkSoftDeleteOwnerOutlets(
  ownerId: number,
  ids: number[],
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets/bulk`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });
  return handleResponse(res);
}
export async function bulkForceDeleteOutlets(
  ownerId: number,
  ids: number[],
) {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets/bulk/force`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });
  return handleResponse(res);
}

export async function softDeleteOwner(ownerId: number): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  return handleResponse(res);
}

export async function restoreOwner(
  ownerId: number,
): Promise<OwnerDetailResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/owners/${ownerId}/restore`,
    {
      method: "PATCH",
      credentials: "include",
      headers: getAuthHeaders(),
    }
  );

  const responseData = await handleResponse<OwnerDetailResponse>(res);
  return responseData;
}

export async function hardDeleteOwner(ownerId: number): Promise<unknown> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/owners/${ownerId}/force`,
    {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    },
  );

  return handleResponse(res);
}

export async function bulkSoftDeleteOwners(
  ids: number[],
): Promise<BulkDeleteResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/bulk`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });

  return handleResponse<BulkDeleteResponse>(res);
}

export async function bulkForceDeleteOwners(
  ids: number[],
): Promise<BulkDeleteResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/bulk/force`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });

  return handleResponse<BulkDeleteResponse>(res);
}

export async function bulkUpdateOwners(
  items: { id: number;[key: string]: unknown }[],
): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/bulk`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ items }),
  });

  return handleResponse(res);
}

// ─── Legacy exports (kept for backward compatibility) ───────────────────────

export const fetchCustomers = fetchOwners;
export const deleteCustomer = softDeleteOwner;
export const deleteForceCustomer = hardDeleteOwner;
export const restoreCustomer = restoreOwner;

// ─── Lead API ───────────────────────────────────────────────────────────────

export interface BackendLead {
  id: number;
  code: string;
  owner: {
    available?: boolean;
    id?: number;
    code: string;
    name: string;
    phone: string;
    brand_name: string;
    province: string;
    city: string;
    message?: string;
  };
  outlet_id?: number;
  outlet?: {
    id?: number;
    code?: string;
    name?: string;
    phone?: string;
  };
  current_owner?: {
    id: number;
    name: string;
    role: string;
  };
  current_owner_role: string;
  supervisor?: {
    id: number;
    name: string;
    role: string;
  };
  active_sales?: {
    id: number;
    name: string;
    role: string;
  };
  source_type: string;
  source_reference?: string;
  stage: string;
  status: string;
  current_score?: number;
  last_interaction_at?: string;
  next_follow_up_at?: string;
  invalidated_at?: string;
  assigned_at?: string;
  previous_pic?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadListResponse {
  items: BackendLead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface CreateInteractionRequest {
  interaction_at: string; // ISO8601
  type?: string;          // deprecated compatibility field
  call_status?: string;
  chat_status?: string;
  note?: string;
  remark_score?: number;  // 0, 1, 2 (3 is handled by createLeadClosing)
  remark_reason_id?: number;
  follow_up_at?: string;  // ISO8601
  customer_response?: string;
  is_valid_interaction?: boolean;
}

export interface CreateClosingRequest {
  plan_id: number;
  promotion_id?: number | null;
  // Sprint 15a — closing bisa memakai lebih dari satu promotion sekaligus
  // (semua harus eligible untuk plan_id yang sama, atau seluruh request
  // ditolak). Kirim promotion_ids kalau form pakai multi-select; promotion_id
  // tetap didukung backend untuk kompatibilitas single-promotion lama.
  promotion_ids?: number[];
  discount_amount: string;
  unique_transfer_code?: number;
  closed_at?: string;
  interaction_type?: string;
  call_status?: string;
  chat_status?: string;
  contact_name: string;
  contact_phone: string;
  customer_response: string;
  note: string;
}

export interface ScheduleTrainingRequest {
  training_type: string;
  scheduled_at: string;
  location?: string;
  meeting_url?: string;
  trainer_name?: string;
  participant_name?: string;
  note?: string;
}

export async function getLeads(): Promise<BackendLead[]> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/all`, {
    headers,
  });
  const data = await handleResponse<{ data: LeadListResponse }>(res);
  return data.data?.items || [];
}

export interface LeadListParams {
  page?: number;
  limit?: number;
  q?: string;
  ownership?: string;
  stage?: string;
  status?: string;
  sort?: string;
  score?: number | string;
  supervisor_id?: number | string;
  sales_id?: number | string;
  follow_up_from?: string;
  follow_up_to?: string;
  all?: boolean;
}

export async function getLeadsWithTotal(params: LeadListParams = {}): Promise<{ items: BackendLead[], total: number }> {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const qs = query.toString();
  const url = `${API_BASE_URL}/api/v1/leads${qs ? `?${qs}` : ""}`;

  const headers = getAuthHeaders();
  const res = await fetch(url, {
    headers,
  });
  const data = await handleResponse<{ data: LeadListResponse }>(res);
  return { 
    items: data.data?.items || [], 
    total: data.data?.pagination?.total || 0 
  };
}

export async function getLead(leadId: number): Promise<BackendLead> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}`, {
    headers,
  });
  const data = await handleResponse<{ data: BackendLead }>(res);
  return data.data;
}

export async function findRelatedLead(params: {
  ownerId?: number | null;
  outletId?: number | null;
}): Promise<BackendLead | null> {
  const leads = await getLeads();

  if (params.outletId) {
    const outletLead = leads.find((lead) => lead.outlet_id === params.outletId);
    if (outletLead) return outletLead;
  }

  if (params.ownerId) {
    const ownerLead = leads.find((lead) => lead.owner?.id === params.ownerId);
    if (ownerLead) return ownerLead;
  }

  return null;
}

export interface CreateLeadRequest {
  owner_id?: number;
  source_type: string;
  source_reference?: string;
  supervisor_id?: number;
  sales_id?: number;
  initial_score?: number;
  owner_code?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_brand_name?: string;
  owner_province?: string;
  owner_city?: string;
}

export async function createLead(payload: CreateLeadRequest): Promise<BackendLead> {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ data: BackendLead }>(res);
  return data.data;
}

export async function createLeadClosing(
  leadId: number,
  payload: CreateClosingRequest
): Promise<ClosingItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}/closings`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ data: ClosingItem }>(res);
  return data.data;
}

export async function createInteraction(leadId: number, data: CreateInteractionRequest) {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}/interactions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export interface InteractionItem {
  id: number;
  type: string;
  call_status?: string;
  chat_status?: string;
  interaction_at: string;
  remark_score?: number | null;
  remark_label?: string;
  remark_code?: string;
  note?: string;
  contact_name?: string;
  contact_phone?: string;
  duration_seconds?: number | null;
  customer_response?: string;
  follow_up_at?: string | null;
  follow_up_note?: string;
  stage_before?: string;
  stage_after?: string;
  status_before?: string;
  status_after?: string;
  score_before?: number | null;
  score_after?: number | null;
  sales?: { id: number; name: string; role?: string } | null;
  supervisor?: { id: number; name: string; role?: string } | null;
  created_by?: { id: number; name: string; role?: string } | null;
  created_at: string;
}

export interface InteractionListParams {
  type?: string;
  score?: number;
  sales_id?: number;
  interaction_from?: string;
  interaction_to?: string;
  follow_up_from?: string;
  follow_up_to?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export async function fetchCustomerInteractions(
  params: InteractionListParams = {},
): Promise<{ items: InteractionItem[]; pagination: ApiPagination }> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const res = await fetch(`${API_BASE_URL}/api/v1/customer-interactions?${query.toString()}`, { headers: getAuthHeaders() });
  const data = await handleResponse<{
    data: { items: InteractionItem[]; pagination: ApiPagination };
  }>(res);
  return data.data;
}

export interface TrainingItem {
  id: number;
  training_type: string;
  status: string;
  scheduled_at: string;
  completed_at?: string | null;
  canceled_at?: string | null;
  rescheduled_at?: string | null;
  lead_id?: number | null;
  lead_code?: string;
  owner_id?: number | null;
  owner_code?: string;
  owner_name?: string;
  location?: string;
  meeting_url?: string;
  note?: string;
  result_note?: string;
  cancel_reason?: string;
  sales?: { id: number; name: string; role?: string } | null;
  supervisor?: { id: number; name: string; role?: string } | null;
  created_by?: { id: number; name: string; role?: string } | null;
  updated_by?: { id: number; name: string; role?: string } | null;
  created_at: string;
  updated_at: string;
}


export interface TrainingListParams {
  q?: string;
  status?: string;
  training_type?: string;
  sales_id?: number;
  scheduled_from?: string;
  scheduled_to?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export async function fetchTrainings(
  params: TrainingListParams = {},
): Promise<{ items: TrainingItem[]; pagination: ApiPagination }> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const res = await fetch(`${API_BASE_URL}/api/v1/trainings?${query.toString()}`, { headers: getAuthHeaders() });
  const data = await handleResponse<{
    data: { items: TrainingItem[]; pagination: ApiPagination };
  }>(res);
  return data.data;
}

export async function getTrainingById(id: number): Promise<TrainingItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/trainings/${id}`, { headers: getAuthHeaders() });
  const data = await handleResponse<{ data: TrainingItem }>(res);
  return data.data;
}

export async function getInteractionById(id: number): Promise<InteractionItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/customer-interactions/${id}`, { headers: getAuthHeaders() });
  const data = await handleResponse<{ data: InteractionItem }>(res);
  return data.data;
}


export async function getLeadInteractions(leadId: number): Promise<InteractionItem[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/leads/${leadId}/interactions?limit=100`,
    { headers: getAuthHeaders() }
  );
  const data = await handleResponse<{ data: { items: InteractionItem[] } }>(res);
  return data.data?.items || [];
}

export async function getLeadTrainings(leadId: number): Promise<TrainingItem[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/leads/${leadId}/trainings?limit=100`,
    { headers: getAuthHeaders() }
  );
  const data = await handleResponse<{ data: { items: TrainingItem[] } }>(res);
  return data.data?.items || [];
}

export interface StageHistoryItem {
  id: number;
  lead_id?: number;
  owner_id?: number;
  from_stage?: string;
  to_stage: string;
  from_status?: string;
  to_status: string;
  from_score?: number | null;
  to_score?: number | null;
  changed_by?: { id: number; name: string; role?: string } | null;
  source_type: string;
  source_id?: number | null;
  reason?: string;
  created_at: string;
}

export async function getLeadStageHistory(leadId: number): Promise<StageHistoryItem[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/leads/${leadId}/stage-history`,
    { headers: getAuthHeaders() }
  );
  const data = await handleResponse<{ data: { items: StageHistoryItem[] } }>(res);
  return data.data?.items || [];
}

export interface ClosingSnapshotValue {
  id?: number;
  code?: string;
  name?: string;
  package_name?: string;
  plan_name?: string;
  tenure_months?: number;
  duration_days?: number;
  [key: string]: unknown;
}

export interface ClosingItem {
  id: number;
  code?: string;
  status: string;
  owner?: { id: number; code?: string; name: string } | null;
  lead?: { id: number; code?: string; name: string } | null;
  plan?: { id: number; code?: string; name: string } | null;
  package?: { id: number; code?: string; name: string } | null;
  package_snapshot?: ClosingSnapshotValue | null;
  plan_snapshot?: ClosingSnapshotValue | null;
  promotion?: ClosingSnapshotValue | null;
  promotion_snapshot?: ClosingSnapshotValue | null;
  tenure_months?: number;
  duration_days?: number;
  base_price?: string;
  discount_amount?: string;
  additional_charge?: string;
  unique_transfer_code?: number;
  final_amount: string;
  currency: string;
  closed_at: string;
  sales?: { id: number; name: string; role?: string } | null;
  supervisor?: { id: number; name: string; role?: string } | null;
  outlet_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClosingListParams {
  q?: string;
  status?: string;
  sales_id?: number;
  closed_from?: string;
  closed_to?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export async function fetchClosings(
  params: ClosingListParams = {},
): Promise<{ items: ClosingItem[]; pagination: ApiPagination }> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const res = await fetch(`${API_BASE_URL}/api/v1/closings?${query.toString()}`, { headers: getAuthHeaders() });
  const data = await handleResponse<{
    data: { items: ClosingItem[]; pagination: ApiPagination };
  }>(res);
  return data.data;
}

export async function getLeadClosings(leadId: number): Promise<ClosingItem[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/closings?lead_id=${leadId}&limit=100`,
    { headers: getAuthHeaders() }
  );
  const data = await handleResponse<{ data: { items: ClosingItem[] } }>(res);
  return data.data?.items || [];
}

export async function getClosingById(id: number): Promise<ClosingItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/closings/${id}`, { headers: getAuthHeaders() });
  const data = await handleResponse<{ data: ClosingItem }>(res);
  return data.data;
}


// ──────────────── Catalog (Packages / Plans / Promotions) ────────────────

export interface CatalogPackage {
  id: number;
  code: string;
  name: string;
  level_order?: number;
  description?: string;
  active: boolean;
}

export interface CatalogPlan {
  id: number;
  code: string;
  name: string;
  tenure_months: number;
  duration_days: number;
  price: string;
  currency: string;
  package?: { id: number; code: string; name: string };
}

export interface CatalogPromotion {
  id: number;
  code: string;
  name: string;
  description?: string;
  discount_type?: string;
  discount_value?: string;
  promotion_type?: string;
  charge_type?: "FREE" | "PAID";
  additional_charge?: string;
  priority?: number;
  active?: boolean;
  effective_from?: string;
  effective_to?: string;
}

export async function getCatalogPackages(): Promise<CatalogPackage[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/packages?limit=100&active=true`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ data: { items: CatalogPackage[] } }>(res);
  return data.data?.items || [];
}

export async function getCatalogPlans(packageId?: number): Promise<CatalogPlan[]> {
  const url = packageId
    ? `${API_BASE_URL}/api/v1/catalog/plans?limit=100&package_id=${packageId}&active=true`
    : `${API_BASE_URL}/api/v1/catalog/plans?limit=100&active=true`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const data = await handleResponse<{ data: { items: CatalogPlan[] } }>(res);
  return data.data?.items || [];
}

export async function getEligiblePromotions(planId: number): Promise<CatalogPromotion[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/catalog/plans/${planId}/eligible-promotions`,
    { headers: getAuthHeaders() }
  );
  const data = await handleResponse<
    { data: CatalogPromotion[] } | { data: { items?: CatalogPromotion[]; recommended?: CatalogPromotion | null } }
  >(res);
  const inner = (data as { data: unknown }).data;
  if (Array.isArray(inner)) return inner as CatalogPromotion[];
  if (inner && typeof inner === "object" && Array.isArray((inner as { items?: CatalogPromotion[] }).items)) {
    return (inner as { items: CatalogPromotion[] }).items;
  }
  return [];
}

// ──────────────── Katalog: manajemen penuh Package/Plan/Promotion ─────────
//
// Dibangun terpisah dari getCatalogPackages/getCatalogPlans/getEligiblePromotions
// di atas (yang tetap dipertahankan — masih dipakai `data-kelolaan/call` dan
// `kelolaan-mitra/jenis-mitra`) karena kebutuhannya beda: halaman Katalog
// butuh CRUD penuh + trash + bulk untuk KETIGA entitas, bukan cuma daftar
// read-only untuk dropdown. Backend (`internal/catalog/`) simetris persis
// untuk ketiganya (list/trash/unscoped/create/get/update/delete/restore/
// force/bulk×3) — dipakai satu factory generik `makeCatalogCrud` alih-alih
// menyalin 9 fungsi × 3 entitas.

export interface CatalogListMeta {
  page: number;
  limit: number;
  total: number;
}

export type CatalogScope = "ACTIVE" | "DELETED" | "ALL";

function buildCatalogQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      sp.set(key, String(value));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function makeCatalogCrud<TItem, TCreate, TUpdate extends Record<string, unknown>>(
  resourcePath: "packages" | "plans" | "promotions",
) {
  const base = `${API_BASE_URL}/api/v1/catalog/${resourcePath}`;

  return {
    list: async (
      params: Record<string, unknown> & { scope?: CatalogScope } = {},
    ): Promise<{ items: TItem[]; pagination: CatalogListMeta }> => {
      const { scope, ...rest } = params;
      const suffix = scope === "DELETED" ? "/trash" : scope === "ALL" ? "/unscoped" : "";
      const res = await fetch(`${base}${suffix}${buildCatalogQuery(rest)}`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const data = await handleResponse<{ data: { items: TItem[]; pagination: CatalogListMeta } }>(res);
      return data.data;
    },
    get: async (id: number): Promise<TItem> => {
      const res = await fetch(`${base}/${id}`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const data = await handleResponse<{ data: TItem }>(res);
      return data.data;
    },
    create: async (payload: TCreate): Promise<TItem> => {
      const res = await fetch(base, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse<{ data: TItem }>(res);
      return data.data;
    },
    update: async (id: number, payload: TUpdate): Promise<TItem> => {
      const res = await fetch(`${base}/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleResponse<{ data: TItem }>(res);
      return data.data;
    },
    remove: async (id: number): Promise<unknown> => {
      const res = await fetch(`${base}/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      return handleResponse(res);
    },
    restore: async (id: number): Promise<unknown> => {
      const res = await fetch(`${base}/${id}/restore`, {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      return handleResponse(res);
    },
    forceRemove: async (id: number): Promise<unknown> => {
      const res = await fetch(`${base}/${id}/force`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      return handleResponse(res);
    },
    bulkRemove: async (ids: number[]): Promise<unknown> => {
      const res = await fetch(`${base}/bulk`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids }),
      });
      return handleResponse(res);
    },
    bulkRestore: async (ids: number[]): Promise<unknown> => {
      const res = await fetch(`${base}/bulk/restore`, {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids }),
      });
      return handleResponse(res);
    },
    bulkForceRemove: async (ids: number[]): Promise<unknown> => {
      const res = await fetch(`${base}/bulk/force`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids }),
      });
      return handleResponse(res);
    },
  };
}

// --- Package ---

export interface CatalogPackageItem {
  id: number;
  code: string;
  name: string;
  level_order: number;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePackagePayload {
  code: string;
  name: string;
  level_order: number;
  description?: string;
  active?: boolean;
}

export type UpdatePackagePayload = Partial<CreatePackagePayload>;

export const packageApi = makeCatalogCrud<CatalogPackageItem, CreatePackagePayload, UpdatePackagePayload>(
  "packages",
);

// --- Plan ---

export interface CatalogPlanItem {
  id: number;
  package: { id: number; code: string; name: string };
  code: string;
  name: string;
  tenure_months: number;
  duration_days: number;
  price: string;
  currency: string;
  effective_from: string;
  effective_to?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanPayload {
  package_id: number;
  code: string;
  name: string;
  tenure_months: number;
  price: string;
  currency?: string;
  effective_from: string;
  effective_to?: string;
  active?: boolean;
}

export type UpdatePlanPayload = Partial<CreatePlanPayload>;

export const planApi = makeCatalogCrud<CatalogPlanItem, CreatePlanPayload, UpdatePlanPayload>("plans");

// --- Promotion + Benefit ---

export interface CatalogBenefitItem {
  id: number;
  promotion_id: number;
  benefit_type: string;
  package?: { id: number; code: string; name: string };
  duration_days?: number;
  quantity?: number;
  description?: string;
  metadata_json?: unknown;
  created_at: string;
}

export interface CatalogPromotionItem {
  id: number;
  code: string;
  name: string;
  promotion_type: string;
  charge_type: "FREE" | "PAID";
  additional_charge: string;
  priority: number;
  description?: string;
  effective_from: string;
  effective_to?: string;
  active: boolean;
  benefits?: CatalogBenefitItem[];
  plan_ids?: number[];
  created_at: string;
  updated_at: string;
}

export interface CreatePromotionPayload {
  code: string;
  name: string;
  promotion_type: string;
  charge_type: "FREE" | "PAID";
  additional_charge?: string;
  priority?: number;
  description?: string;
  effective_from: string;
  effective_to?: string;
  active?: boolean;
}

export type UpdatePromotionPayload = Partial<CreatePromotionPayload>;

export const promotionApi = makeCatalogCrud<
  CatalogPromotionItem,
  CreatePromotionPayload,
  UpdatePromotionPayload
>("promotions");

export interface CreateBenefitPayload {
  benefit_type: string;
  package_id?: number;
  duration_days?: number;
  quantity?: number;
  description?: string;
}

export async function listPromotionBenefits(promotionId: number): Promise<CatalogBenefitItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/promotions/${promotionId}/benefits`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ data: { items: CatalogBenefitItem[] } } | { data: CatalogBenefitItem[] }>(res);
  const inner = (data as { data: unknown }).data;
  if (Array.isArray(inner)) return inner as CatalogBenefitItem[];
  return (inner as { items: CatalogBenefitItem[] })?.items || [];
}

export async function createPromotionBenefit(
  promotionId: number,
  payload: CreateBenefitPayload,
): Promise<CatalogBenefitItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/promotions/${promotionId}/benefits`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ data: CatalogBenefitItem }>(res);
  return data.data;
}

export async function deletePromotionBenefit(promotionId: number, benefitId: number): Promise<unknown> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/catalog/promotions/${promotionId}/benefits/${benefitId}`,
    { method: "DELETE", credentials: "include", headers: getAuthHeaders() },
  );
  return handleResponse(res);
}

export async function setPromotionEligiblePlans(promotionId: number, planIds: number[]): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/promotions/${promotionId}/eligible-plans`, {
    method: "PUT",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ plan_ids: planIds }),
  });
  return handleResponse(res);
}

export async function getPromotionEligiblePlans(promotionId: number): Promise<CatalogPlanItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/catalog/promotions/${promotionId}/eligible-plans`, {
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ data: { items: CatalogPlanItem[] } }>(res);
  return data.data?.items || [];
}

export async function scheduleTraining(leadId: number, data: ScheduleTrainingRequest) {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}/trainings`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function assignSalesToLead(leadId: number, salesId: number) {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}/assign-sales`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sales_id: salesId }),
  });
  return handleResponse(res);
}

export async function bulkAssignSalesToLeads(leadIds: number[], salesId: number) {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/bulk/assign-sales`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ lead_ids: leadIds, sales_id: salesId }),
  });
  return handleResponse(res);
}

export async function assignSupervisorToLead(leadId: number, supervisorId: number) {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}/assign-supervisor`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ supervisor_id: supervisorId }),
  });
  return handleResponse(res);
}

export async function bulkAssignSupervisorToLeads(leadIds: number[], supervisorId: number) {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/bulk/assign-supervisor`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ lead_ids: leadIds, supervisor_id: supervisorId }),
  });
  return handleResponse(res);
}

// ─── Identity (Sales) API ─────────────────────────────────────────────────────

export interface UserResponse {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  role_code?: string;
  status: string;
  is_active: boolean;
}

export interface SalesListResponse {
  items: UserResponse[];
  total: number;
}

export async function getSalesList(): Promise<UserResponse[]> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/v1/sales?status=active`, {
    headers,
  });
  const data = await handleResponse<{ data: SalesListResponse }>(res);
  return data.data?.items || [];
}

// getSupervisorList fetches real supervisor accounts from the backend.
export async function getSupervisorList(): Promise<UserResponse[]> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/v1/supervisors?status=active`, {
    headers,
  });
  const data = await handleResponse<{ data: SalesListResponse }>(res);
  return data.data?.items || [];
}


// ─── Lead Actions ─────────────────────────────────────────────────────────────

export async function releaseLead(leadId: number, reason: string = "") {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}/release`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(res);
}

export async function markInvalidLead(leadId: number, reason: string = "") {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}/mark-invalid`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(res);
}

export interface UserSummary {
  id: number;
  name: string;
  role: string;
}

export interface AssignmentHistoryItem {
  id: number;
  lead_id: number;
  owner_id?: number;
  from_user?: UserSummary;
  to_user?: UserSummary;
  supervisor?: UserSummary;
  assigned_by?: UserSummary;
  action: string;
  reason?: string;
  score?: number;
  active: boolean;
  started_at: string;
  ended_at?: string;
  created_at: string;
}

export async function getAssignmentHistory(leadId: number): Promise<AssignmentHistoryItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}/assignment-history`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ data: { items: AssignmentHistoryItem[] } }>(res);
  return data.data?.items || [];
}

export async function getProfile(): Promise<UserResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: getAuthHeaders(),
  });
  const responseData = await handleResponse<UserResponse>(res);
  return responseData;
}


// -----------------------------------------------------------------------------
// IMPORTS API
// -----------------------------------------------------------------------------

export interface ImportRowError {
  id: number;
  batch_id: number;
  row_index: number;
  raw_payload: Record<string, unknown> | null;
  status: string;
  validation_errors?: string[] | Record<string, string>;
  commit_error?: string;
  owner_id?: number | null;
  outlet_id?: number | null;
  lead_id?: number | null;
}

export interface ImportRowListResponse {
  items: ImportRowError[];
  pagination?: ApiPagination;
  meta?: ApiPagination;
}

export interface ImportBatchFileResponse {
  original_filename: string;
  sha256: string;
  view_path: string;
  download_path: string;
}

export interface ImportBatchActorResponse {
  id: number;
  name: string;
}

export interface ImportBatchResponse {
  id: number;
  code: string;
  profile: string;
  sheet_name?: string;
  target_sales_user_id?: number;
  original_filename: string;
  file?: ImportBatchFileResponse;
  status: string; // 'UPLOADED' | 'VALIDATING' | 'VALIDATED' | 'VALIDATION_FAILED' | 'COMMITTING' | 'COMMITTED' | 'COMMIT_FAILED'
  progress_percentage?: number;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  committed_rows?: number;
  error_message?: string | null;
  uploaded_by?: ImportBatchActorResponse;
  committed_by?: ImportBatchActorResponse | null;
  uploaded_at?: string;
  validated_at?: string | null;
  committed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ImportBatchListResponse {
  items: ImportBatchResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export async function uploadImportFile(
  file: File,
  profile: string = "OWNER_OUTLET",
  sheetName?: string,
  targetSalesUserId?: number
): Promise<ImportBatchResponse> {
  const token = getStoredAccessToken();
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("profile", profile);
  if (sheetName) {
    formData.append("sheet_name", sheetName);
  }
  if (targetSalesUserId) {
    formData.append("target_sales_user_id", String(targetSalesUserId));
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/imports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const json = await handleResponse<{ data: ImportBatchResponse }>(res);
  return json.data;
}

export async function getImportBatch(id: number): Promise<ImportBatchResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/${id}`, {
    headers: getAuthHeaders(),
  });
  const json = await handleResponse<{ data: ImportBatchResponse }>(res);
  return json.data;
}

export async function getImportBatches(params?: { profile?: string, status?: string, page?: number, limit?: number }): Promise<ImportBatchListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.profile) queryParams.append('profile', params.profile);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  const qs = queryParams.toString();
  const url = `${API_BASE_URL}/api/v1/imports${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const json = await handleResponse<{ data: ImportBatchListResponse }>(res);
  return json.data;
}

export async function commitImportBatch(id: number): Promise<ImportBatchResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/${id}/commit`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const json = await handleResponse<{ data: ImportBatchResponse }>(res);
  return json.data;
}

export async function downloadImportErrors(batchId: number): Promise<void> {
  const token = getStoredAccessToken();
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/${batchId}/rejected-rows/export`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  
  if (!res.ok) {
    throw new Error("Gagal mengunduh file error");
  }
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `piposmart_import_errors_${batchId}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

export async function getImportErrorRows(batchId: number, page = 1, limit = 50): Promise<ImportRowListResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/${batchId}/rows?status=INVALID&page=${page}&limit=${limit}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  const json = await handleResponse<{ data: ImportRowListResponse }>(res);
  return {
    ...json.data,
    pagination: json.data.pagination ?? json.data.meta,
    meta: json.data.meta ?? json.data.pagination,
  };
}

export async function getImportValidRows(batchId: number, page = 1, limit = 100000): Promise<ImportRowListResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/${batchId}/rows?status=VALID&page=${page}&limit=${limit}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  const json = await handleResponse<{ data: ImportRowListResponse }>(res);
  return {
    ...json.data,
    pagination: json.data.pagination ?? json.data.meta,
    meta: json.data.meta ?? json.data.pagination,
  };
}

export async function getImportRowsByStatus(
  batchId: number,
  status: string,
  page = 1,
  limit = 50
): Promise<ImportRowListResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/${batchId}/rows?status=${status}&page=${page}&limit=${limit}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  const json = await handleResponse<{ data: ImportRowListResponse }>(res);
  return {
    ...json.data,
    pagination: json.data.pagination ?? json.data.meta,
    meta: json.data.meta ?? json.data.pagination,
  };
}

export interface RelinkImportRowPayload {
  owner_id?: number;
  outlet_id?: number;
  lead_id?: number;
}

export async function relinkImportRow(
  batchId: number,
  rowId: number,
  payload: RelinkImportRowPayload
): Promise<ImportRowError> {
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/${batchId}/rows/${rowId}/relink`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await handleResponse<{ data: ImportRowError }>(res);
  return json.data;
}

export interface ImportSummaryResponse {
  total_batches: number;
  by_status: Record<string, number>;
  needs_attention: number;
}

export async function getImportSummary(): Promise<ImportSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/summary`, {
    headers: getAuthHeaders(),
  });
  const json = await handleResponse<{ data: ImportSummaryResponse }>(res);
  return json.data;
}

export async function bulkReleaseLeads(leadIds: number[], reason: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/bulk/release`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ lead_ids: leadIds, reason }),
  });
  return handleResponse(res);
}

// --- Partner domain API ------------------------------------------------------

interface ApiEnvelope<T> {
  data: T;
  meta: {
    request_id: string;
  };
}

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
}

export interface PartnerTypeItem {
  id: number;
  code: string;
  name: string;
  commission_mode: "PERCENTAGE" | "FIXED";
  commission_value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerItem {
  id: number;
  partner_type: PartnerTypeItem;
  code: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  sub_district?: string | null;
  address?: string | null;
  pic_name?: string | null;
  bank_account_masked?: string | null;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerAssignmentItem {
  id: number;
  partner_id: number;
  user_id: number;
  user_name?: string | null;
  user_role?: string | null;
  assigned_by_id?: number | null;
  assigned_by_name?: string | null;
  assigned_at: string;
  unassigned_at?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerInteractionItem {
  id: number;
  partner_id: number;
  interaction_type: "CALL" | "CHAT";
  interaction_at: string;
  note?: string | null;
  created_at: string;
}

export interface PartnerReferralItem {
  id: number;
  partner_id: number;
  lead_id: number;
  referral_date: string;
  notes?: string | null;
  created_at: string;
}

export interface PartnerTypeListData {
  items: PartnerTypeItem[];
  pagination: ApiPagination;
}

export interface PartnerListData {
  items: PartnerItem[];
  pagination: ApiPagination;
}

export interface PartnerAssignmentListData {
  items: PartnerAssignmentItem[];
  pagination: ApiPagination;
}

export interface PartnerInteractionListData {
  items: PartnerInteractionItem[];
  pagination: ApiPagination;
}

export interface PartnerReferralListData {
  items: PartnerReferralItem[];
  pagination: ApiPagination;
}

export interface PartnerListParams {
  search?: string;
  status?: string;
  trash?: boolean;
  limit?: number;
  offset?: number;
}

export interface PartnerInteractionListParams {
  limit?: number;
  offset?: number;
}

export interface CreatePartnerTypePayload {
  code: string;
  name: string;
  commission_mode: "PERCENTAGE" | "FIXED";
  commission_value: string;
  description?: string;
}

export interface UpdatePartnerTypePayload {
  name?: string;
  commission_mode?: "PERCENTAGE" | "FIXED";
  commission_value?: string;
  description?: string;
}

export interface CreatePartnerPayload {
  partner_type_id: number;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  bank_account?: string;
  status?: "ACTIVE" | "INACTIVE" | "DELETED";
  // Sprint 15a — TUPOKSI referral lead & aktivitas mitra ada di Sales, jadi
  // Sales bisa langsung jadi PIC mitra yang dia buat sendiri (atomic saat create),
  // tanpa perlu Supervisor assign terpisah lewat assignPartnerPic.
  self_assign_pic?: boolean;
}

export interface UpdatePartnerPayload {
  name?: string;
  phone?: string;
  email?: string;
  province?: string;
  city?: string;
  district?: string;
  sub_district?: string;
  address?: string;
  bank_account?: string;
  status?: "ACTIVE" | "INACTIVE" | "DELETED";
}

export interface AssignPartnerPicPayload {
  user_id: number;
  assigned_by_id?: number;
}

export interface CreatePartnerInteractionPayload {
  interaction_type: "CALL" | "CHAT";
  interaction_at?: string;
  note?: string;
}

export interface CreatePartnerReferralPayload {
  lead_id: number;
  referral_date?: string;
  notes?: string;
}

function buildQueryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const value = query.toString();
  return value ? `?${value}` : "";
}

export async function listPartnerTypes(): Promise<PartnerTypeListData> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partner-types`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<PartnerTypeListData>>(res);
  return data.data;
}

export async function createPartnerType(
  payload: CreatePartnerTypePayload,
): Promise<PartnerTypeItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partner-types`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<PartnerTypeItem>>(res);
  return data.data;
}

export async function updatePartnerType(
  id: number,
  payload: UpdatePartnerTypePayload,
): Promise<PartnerTypeItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partner-types/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<PartnerTypeItem>>(res);
  return data.data;
}

export async function deletePartnerType(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partner-types/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  if (res.status !== 204) {
    await handleResponse<never>(res);
  }
}

export async function listPartners(
  params: { search?: string; limit?: number; offset?: number; status?: string; trash?: boolean } = {},
): Promise<PartnerListData> {
  const qs = buildQueryString({
    search: params.search,
    status: params.status,
    trash: params.trash ? "true" : undefined,
    limit: params.limit,
    offset: params.offset,
  });

  const res = await fetch(`${API_BASE_URL}/api/v1/partners${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<PartnerListData>>(res);
  return data.data;
}

export async function getPartner(partnerId: number): Promise<PartnerItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partners/${partnerId}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<PartnerItem>>(res);
  return data.data;
}

export async function createPartner(
  payload: CreatePartnerPayload,
): Promise<PartnerItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partners`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<PartnerItem>>(res);
  return data.data;
}

export async function updatePartner(
  partnerId: number,
  payload: UpdatePartnerPayload,
): Promise<PartnerItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partners/${partnerId}`, {
    method: "PUT",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<PartnerItem>>(res);
  return data.data;
}

export async function deactivatePartner(partnerId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partners/${partnerId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  if (res.status !== 204 && res.status !== 200) {
    await handleResponse(res);
  }
}

export async function restorePartner(partnerId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partners/${partnerId}/restore`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  if (res.status !== 200) {
    await handleResponse(res);
  }
}

export async function permanentDeletePartner(partnerId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partners/${partnerId}/permanent`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  if (res.status !== 204 && res.status !== 200) {
    await handleResponse(res);
  }
}

export async function getActivePartnerAssignment(
  partnerId: number,
): Promise<PartnerAssignmentItem | null> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/partners/${partnerId}/assignments/active`,
    {
      method: "GET",
      credentials: "include",
      headers: getAuthHeaders(),
    },
  );

  if (res.status === 404) {
    return null;
  }

  const data = await handleResponse<ApiEnvelope<PartnerAssignmentItem>>(res);
  return data.data;
}

export async function listPartnerAssignments(
  partnerId: number,
): Promise<PartnerAssignmentListData> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/partners/${partnerId}/assignments`,
    {
      method: "GET",
      credentials: "include",
      headers: getAuthHeaders(),
    },
  );

  const data = await handleResponse<ApiEnvelope<PartnerAssignmentListData>>(res);
  return data.data;
}

export async function assignPartnerPic(
  partnerId: number,
  payload: AssignPartnerPicPayload,
): Promise<PartnerAssignmentItem> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/partners/${partnerId}/assignments`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );

  const data = await handleResponse<ApiEnvelope<PartnerAssignmentItem>>(res);
  return data.data;
}

export async function releasePartnerPic(partnerId: number): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/partners/${partnerId}/assignments/release`,
    {
      method: "DELETE",
      credentials: "include",
      headers: getAuthHeaders(),
    },
  );

  await handleResponse(res);
}

// Sprint 15a — status keaktifan bulanan mitra: apakah PIC sales sudah
// memasukkan data referral lead untuk mitra ini pada bulan tsb.
export interface PartnerActivityStatus {
  partner_id: number;
  month: string; // YYYY-MM
  status: "BELUM_MEMBERIKAN_REFERAL" | "TELAH_MEMBERIKAN_REFERAL";
}

export async function getPartnerActivity(
  partnerId: number,
  month?: string,
): Promise<PartnerActivityStatus> {
  const qs = buildQueryString({ month });
  const res = await fetch(
    `${API_BASE_URL}/api/v1/partners/${partnerId}/activity${qs}`,
    {
      method: "GET",
      credentials: "include",
      headers: getAuthHeaders(),
    },
  );

  const data = await handleResponse<ApiEnvelope<PartnerActivityStatus>>(res);
  return data.data;
}

export async function listPartnerInteractions(
  partnerId: number,
  params: PartnerInteractionListParams = {},
): Promise<PartnerInteractionListData> {
  const qs = buildQueryString({
    limit: params.limit,
    offset: params.offset,
  });

  const res = await fetch(
    `${API_BASE_URL}/api/v1/partners/${partnerId}/interactions${qs}`,
    {
      method: "GET",
      credentials: "include",
      headers: getAuthHeaders(),
    },
  );

  const data = await handleResponse<ApiEnvelope<PartnerInteractionListData>>(res);
  return data.data;
}

export async function createPartnerInteraction(
  partnerId: number,
  payload: CreatePartnerInteractionPayload,
): Promise<PartnerInteractionItem> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/partners/${partnerId}/interactions`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );

  const data = await handleResponse<ApiEnvelope<PartnerInteractionItem>>(res);
  return data.data;
}

export async function listPartnerReferrals(
  partnerId: number,
): Promise<PartnerReferralListData> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/partners/${partnerId}/referrals`,
    {
      method: "GET",
      credentials: "include",
      headers: getAuthHeaders(),
    },
  );

  const data = await handleResponse<ApiEnvelope<PartnerReferralListData>>(res);
  return data.data;
}

export async function createPartnerReferral(
  partnerId: number,
  payload: CreatePartnerReferralPayload,
): Promise<PartnerReferralItem> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/partners/${partnerId}/referrals`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );

  const data = await handleResponse<ApiEnvelope<PartnerReferralItem>>(res);
  return data.data;
}

export type PartnerCommissionRuleMode = "PERCENTAGE" | "FIXED" | "TIER";
export type PartnerCommissionStatus = "PENDING" | "APPROVED" | "PAID" | "CANCELLED";

export interface PartnerUserBrief {
  id: number;
  name: string;
  role?: string;
}

export interface PartnerCommissionTierItem {
  id: number;
  tier_order: number;
  min_closings: number;
  max_closings?: number | null;
  mode: "PERCENTAGE" | "FIXED";
  value: string;
}

export interface PartnerCommissionRuleItem {
  id: number;
  partner_type_id: number;
  // Sprint 15a — commission direscope dari package ke plan (beda tenor plan
  // pada package yang sama boleh punya komisi beda, mis. Business 12 vs 24 bulan).
  plan_id?: number | null;
  plan_code?: string | null;
  plan_name?: string | null;
  mode: PartnerCommissionRuleMode;
  value?: string | null;
  effective_from: string;
  effective_to?: string | null;
  active: boolean;
  created_by?: PartnerUserBrief | null;
  tiers?: PartnerCommissionTierItem[];
  created_at: string;
  updated_at: string;
}

export interface PartnerCommissionRuleListData {
  items: PartnerCommissionRuleItem[];
  pagination: ApiPagination;
}

export interface CreatePartnerCommissionRulePayload {
  plan_id?: number;
  mode: PartnerCommissionRuleMode;
  value?: string;
  effective_from: string;
  effective_to?: string;
  tiers?: Array<{
    tier_order: number;
    min_closings: number;
    max_closings?: number;
    mode: "PERCENTAGE" | "FIXED";
    value: string;
  }>;
}

export interface PartnerCommissionRuleListParams {
  plan_id?: number;
  active_only?: boolean;
}

export interface PartnerCommissionItem {
  id: number;
  code: string;
  partner_id: number;
  partner_code?: string | null;
  partner_name?: string | null;
  referral_id: number;
  closing_id: number;
  closing_code?: string | null;
  commission_mode: string;
  commission_value: string;
  commission_rule_id?: number | null;
  tier_ordinal?: number | null;
  base_amount: string;
  commission_amount: string;
  currency: string;
  status: PartnerCommissionStatus;
  note?: string;
  approved_by?: PartnerUserBrief | null;
  approved_at?: string | null;
  paid_by?: PartnerUserBrief | null;
  paid_at?: string | null;
  active_payout_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerCommissionListData {
  items: PartnerCommissionItem[];
  pagination: ApiPagination;
}

export interface SyncPartnerCommissionsData {
  created: number;
  items: PartnerCommissionItem[];
}

export interface PartnerCommissionListParams {
  status?: PartnerCommissionStatus;
  page?: number;
  limit?: number;
}

export async function approvePartnerCommission(
  partnerId: number,
  commissionId: number,
): Promise<PartnerCommissionItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partners/${partnerId}/commissions/${commissionId}/approve`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<PartnerCommissionItem>>(res);
  return data.data;
}

export async function payPartnerCommission(
  partnerId: number,
  commissionId: number,
): Promise<PartnerCommissionItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partners/${partnerId}/commissions/${commissionId}/pay`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<PartnerCommissionItem>>(res);
  return data.data;
}

export async function cancelPartnerCommission(
  partnerId: number,
  commissionId: number,
): Promise<PartnerCommissionItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partners/${partnerId}/commissions/${commissionId}/cancel`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<PartnerCommissionItem>>(res);
  return data.data;
}
export async function getPartnerType(id: number): Promise<PartnerTypeItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partner-types/${id}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<PartnerTypeItem>>(res);
  return data.data;
}

export async function listPartnerTypeCommissionRules(
  partnerTypeId: number,
  params: PartnerCommissionRuleListParams = {},
): Promise<{ items: PartnerCommissionRuleItem[] }> {
  const qs = buildQueryString({
    plan_id: params.plan_id,
    active_only: params.active_only === undefined ? undefined : String(params.active_only),
  });

  const res = await fetch(`${API_BASE_URL}/api/v1/partner-types/${partnerTypeId}/commission-rules${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<
    ApiEnvelope<PartnerCommissionRuleItem[] | { items?: PartnerCommissionRuleItem[] }>
  >(res);
  const raw = data.data;
  const items = Array.isArray(raw) ? raw : (raw?.items || []);
  return { items };
}

export async function getPartnerTypeCommissionRule(
  partnerTypeId: number,
  ruleId: number,
): Promise<PartnerCommissionRuleItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partner-types/${partnerTypeId}/commission-rules/${ruleId}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<PartnerCommissionRuleItem>>(res);
  return data.data;
}

export async function createPartnerTypeCommissionRule(
  partnerTypeId: number,
  payload: CreatePartnerCommissionRulePayload,
): Promise<PartnerCommissionRuleItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partner-types/${partnerTypeId}/commission-rules`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<PartnerCommissionRuleItem>>(res);
  return data.data;
}

export async function deactivatePartnerTypeCommissionRule(
  partnerTypeId: number,
  ruleId: number,
): Promise<PartnerCommissionRuleItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partner-types/${partnerTypeId}/commission-rules/${ruleId}/deactivate`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<PartnerCommissionRuleItem>>(res);
  return data.data;
}

export async function listPartnerCommissions(
  partnerId: number,
  params: PartnerCommissionListParams = {},
): Promise<PartnerCommissionListData> {
  const qs = buildQueryString({
    status: params.status,
    page: params.page,
    limit: params.limit,
  });

  const res = await fetch(`${API_BASE_URL}/api/v1/partners/${partnerId}/commissions${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<PartnerCommissionListData>>(res);
  return data.data;
}

export async function syncPartnerCommissions(partnerId: number): Promise<SyncPartnerCommissionsData> {
  const res = await fetch(`${API_BASE_URL}/api/v1/partners/${partnerId}/commissions/sync`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<SyncPartnerCommissionsData>>(res);
  return data.data;
}

// ─── Outlet Global API (Modul Kelolaan Outlet) ─────────────────────────────
//
// Endpoint `/api/v1/outlets*` ADA di kode Go (`internal/customer/handler.go`)
// tapi TIDAK terdokumentasi di openapi.yaml backend (basi) — dikonfirmasi
// langsung lewat baca source, bukan spec. Tiga "tabel" (Umum/Langganan/
// Sampah) sebenarnya SATU sumber data (`OutletOverviewItem`/
// `OutletSubscriptionStatusItem`) dengan kolom berbeda ditampilkan, bukan
// tiga endpoint yang tidak berhubungan.

export interface OutletOwnerBrief {
  id?: number;
  code?: string;
  name?: string;
  phone?: string;
  email?: string;
  brand_name?: string;
  message?: string;
  created_at?: string;
}

export interface OutletSubscriptionSummary {
  total_subscriptions: number;
  active_subscriptions: number;
  latest_subscription_status?: string;
  latest_subscription_start?: string;
  latest_subscription_end?: string;
}

// "Tabel Informasi Umum Outlet" — GET /outlets (+ /trash, /unscoped)
export interface OutletOverviewItem {
  id: number;
  owner: OutletOwnerBrief;
  code: string;
  name: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  sub_district?: string;
  address?: string;
  status: string;
  entered_by_user_id?: number;
  entered_by_name?: string;
  subscription_summary: OutletSubscriptionSummary;
  created_at: string;
  updated_at: string;
}

export interface OutletOverviewListData {
  items: OutletOverviewItem[];
  pagination: ApiPagination;
}

export interface ListGlobalOutletsParams {
  q?: string;
  code?: string;
  name?: string;
  phone?: string;
  brand_name?: string;
  province?: string;
  city?: string;
  owner_id?: number;
  page?: number;
  limit?: number;
  sort?: string;
  start_date?: string;
  end_date?: string;
}

export type OutletScope = "active" | "trash" | "unscoped";

export async function listGlobalOutlets(
  params: ListGlobalOutletsParams = {},
  scope: OutletScope = "active",
): Promise<OutletOverviewListData> {
  const suffix = scope === "active" ? "" : `/${scope}`;
  const qs = buildQueryString({ ...params });
  const res = await fetch(`${API_BASE_URL}/api/v1/outlets${suffix}${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<OutletOverviewListData>>(res);
  return data.data;
}

export interface ExportOwnerOutletRow {
  owner_code: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  brand_name: string;
  owner_date: string;
  outlet_code: string;
  outlet_name: string;
  outlet_phone: string;
  outlet_city: string;
  outlet_province: string;
  outlet_address: string;
  row_code: string;
  owner_balance: string;
  outlet_count: number;
}

export type OwnerExportKind = "owner" | "owner-outlet";

export interface OwnerExportFilters extends ListGlobalOutletsParams {
  owner_keyword?: string;
  status?: string;
  subscription_status?: string;
  subscription_month?: string;
  created_from?: string;
  created_to?: string;
  date_from?: string;
  date_to?: string;
}

export async function exportOwnerOutlets(
  params: ListGlobalOutletsParams = {},
): Promise<ExportOwnerOutletRow[]> {
  const qs = buildQueryString({ ...params });
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/export${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<ExportOwnerOutletRow[]>>(res);
  return data.data;
}

export async function downloadOwnerExportFile(
  kind: OwnerExportKind,
  params: OwnerExportFilters = {},
): Promise<{ blob: Blob; disposition: string | null }> {
  const qs = buildQueryString({ ...params });
  const endpoint =
    kind === "owner"
      ? "/api/v1/owners/export/download-owner"
      : "/api/v1/owners/export/download";
  const res = await fetch(`${API_BASE_URL}${endpoint}${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Gagal mengunduh file export");
  }

  return { blob: await res.blob(), disposition: res.headers.get("Content-Disposition") };
}

export async function downloadGlobalOutletExportFile(
  params: OwnerExportFilters = {},
): Promise<{ blob: Blob; disposition: string | null }> {
  const qs = buildQueryString({ ...params });
  const res = await fetch(`${API_BASE_URL}/api/v1/outlets/export/download${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Gagal mengunduh file export outlet");
  }

  return { blob: await res.blob(), disposition: res.headers.get("Content-Disposition") };
}

export type ReportExportKey =
  | "activities"
  | "topups"
  | "closings"
  | "subscriptions"
  | "partners"
  | "targets_kpi"
  | "owners_outlets"
  | "admin_owner_outlet"
  | "admin_new_subscribe"
  | "admin_nasabah_baru_provinsi";

export type ReportExportFormat = "CSV" | "XLSX" | "PDF";

export interface ReportExportFilters {
  date_from?: string;
  date_to?: string;
  created_from?: string;
  created_to?: string;
  status?: string;
  q?: string;
  province?: string;
  city?: string;
  sales_id?: string | number;
  supervisor_id?: string | number;
}

export interface ReportExportItem {
  id: number;
  code: string;
  report_key: ReportExportKey | string;
  format: ReportExportFormat | string;
  status: string;
  filters?: Record<string, string>;
  file_name?: string;
  mime_type?: string;
  row_count: number;
  last_error?: string;
  download_url?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

export async function createReportExport(
  reportKey: ReportExportKey,
  format: ReportExportFormat = "XLSX",
  filters: ReportExportFilters = {},
): Promise<ReportExportItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/reports/exports`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      report_key: reportKey,
      format,
      filters,
    }),
  });

  const data = await handleResponse<ApiEnvelope<ReportExportItem>>(res);
  return data.data;
}

export async function getReportExport(exportId: number): Promise<ReportExportItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/reports/exports/${exportId}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<ReportExportItem>>(res);
  return data.data;
}

export async function waitForReportExport(
  exportId: number,
  options: { intervalMs?: number; maxAttempts?: number } = {},
): Promise<ReportExportItem> {
  const intervalMs = options.intervalMs ?? 1500;
  const maxAttempts = options.maxAttempts ?? 40;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const item = await getReportExport(exportId);

    if (item.status === "COMPLETED") {
      return item;
    }

    if (item.status === "FAILED") {
      throw new Error(item.last_error || "Export report gagal diproses.");
    }

    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new Error("File export belum selesai diproses. Silakan coba lagi beberapa saat.");
}

export async function downloadReportExportFile(
  exportId: number,
): Promise<{ blob: Blob; disposition: string | null }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/reports/exports/${exportId}/download`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Gagal mengunduh file export report");
  }

  return { blob: await res.blob(), disposition: res.headers.get("Content-Disposition") };
}

export interface PackagePlanBrief {
  package_id?: number;
  package_code?: string;
  package_name?: string;
  plan_id?: number;
  plan_code?: string;
  plan_name?: string;
  tenure_months?: number;
}

// "Tabel Langganan Outlet" (+ "Filter Status Langganan Berdasarkan Bulan") —
// GET /outlets/subscription-statuses?month=YYYY-MM&subscription_status=...
export interface OutletSubscriptionStatusItem {
  outlet_id: number;
  outlet_code: string;
  outlet_name: string;
  outlet_phone?: string;
  outlet_province?: string;
  outlet_city?: string;
  outlet_address?: string;
  owner: OutletOwnerBrief;
  subscription_status_code: string;
  subscription_status_label: string;
  due_status_code: string;
  due_status_label: string;
  remaining_days?: number;
  remaining_days_display: string;
  last_subscription_end?: string;
  last_subscription_end_display: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  package_plan: PackagePlanBrief;
  created_at: string;
  updated_at: string;
}

export interface OutletSubscriptionStatusListData {
  reference_month: string;
  reference_month_start: string;
  reference_month_end: string;
  items: OutletSubscriptionStatusItem[];
  pagination: ApiPagination;
}

export interface ListOutletSubscriptionStatusesParams {
  q?: string;
  code?: string;
  name?: string;
  phone?: string;
  brand_name?: string;
  province?: string;
  city?: string;
  owner_id?: number;
  subscription_status?: string;
  status_langganan?: string;
  status_jatuh_tempo?: string;
  month?: string;
  due_date?: string;
  due_date_reference?: string;
  due_date_start?: string;
  due_date_end?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export async function listOutletSubscriptionStatuses(
  params: ListOutletSubscriptionStatusesParams = {},
): Promise<OutletSubscriptionStatusListData> {
  const qs = buildQueryString({ ...params });
  const res = await fetch(`${API_BASE_URL}/api/v1/outlets/subscription-statuses${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<OutletSubscriptionStatusListData>>(res);
  return data.data;
}

// Detail Outlet — GET /outlets/:outlet_id (global, tidak perlu tahu owner_id di URL)
export interface OutletDetail {
  id: number;
  owner: OutletOwnerBrief;
  code: string;
  name: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  sub_district?: string;
  address?: string;
  status: string;
  subscription_summary: OutletSubscriptionSummary;
  entered_by_user_id?: number;
  entered_by_name?: string;
  created_at: string;
  updated_at: string;
}

export async function getGlobalOutlet(outletId: number): Promise<OutletDetail> {
  const res = await fetch(`${API_BASE_URL}/api/v1/outlets/${outletId}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<OutletDetail>>(res);
  return data.data;
}

// Create/Update Outlet — admin-only di backend (`actorCanManageOwners`,
// `internal/customer/service.go`), tetap owner-scoped di URL (backend belum
// punya create/update level-global), tapi dipicu dari halaman Kelolaan
// Outlet lewat OwnerSearchPicker, bukan dari halaman Data Owner.
export interface CreateOutletPayload {
  code?: string;
  name: string;
  phone?: string;
  province?: string;
  city?: string;
  district?: string;
  sub_district?: string;
  address?: string;
}

export async function createOutletForOwner(
  ownerId: number,
  payload: CreateOutletPayload,
): Promise<BackendOutlet> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<BackendOutlet>>(res);
  return data.data;
}

export async function updateOutletForOwner(
  ownerId: number,
  outletId: number,
  payload: Partial<CreateOutletPayload>,
): Promise<BackendOutlet> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets/${outletId}`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<BackendOutlet>>(res);
  return data.data;
}

export async function restoreOutletForOwner(
  ownerId: number,
  outletId: number,
): Promise<BackendOutlet> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets/${outletId}/restore`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<BackendOutlet>>(res);
  return data.data;
}

export async function forceDeleteOutletForOwner(
  ownerId: number,
  outletId: number,
): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets/${outletId}/force`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  return handleResponse(res);
}

// Bulk mutation outlet — backend hanya expose endpoint bulk yang OWNER-SCOPED
// (`/owners/:owner_id/outlets/bulk*`), tidak ada versi lintas-owner. Untuk
// mendukung UX "pilih banyak baris lintas-owner sekaligus" di tabel global,
// caller wajib mengelompokkan ID terpilih per owner_id lebih dulu, lalu
// memanggil fungsi ini satu kali per grup owner.
export interface BulkOutletUpdateItem {
  id: number;
  code?: string;
  name?: string;
  phone?: string;
  province?: string;
  city?: string;
  address?: string;
}

export interface BulkOutletUpdateResult {
  items: BackendOutlet[];
  total: number;
}

export async function bulkUpdateOutletsForOwner(
  ownerId: number,
  items: BulkOutletUpdateItem[],
): Promise<BulkOutletUpdateResult> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets/bulk`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ items }),
  });

  const data = await handleResponse<ApiEnvelope<BulkOutletUpdateResult>>(res);
  return data.data;
}

export interface BulkOutletActionResult {
  ids: number[];
  affected: number;
}

export async function bulkTrashOutletsForOwner(
  ownerId: number,
  ids: number[],
): Promise<BulkOutletActionResult> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets/bulk`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });

  const data = await handleResponse<ApiEnvelope<BulkOutletActionResult>>(res);
  return data.data;
}

export async function bulkForceDeleteOutletsForOwner(
  ownerId: number,
  ids: number[],
): Promise<BulkOutletActionResult> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/outlets/bulk/force`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ids }),
  });

  const data = await handleResponse<ApiEnvelope<BulkOutletActionResult>>(res);
  return data.data;
}

// Riwayat wallet & subscription untuk Detail Outlet — dua-duanya di-scope
// per OWNER di backend (wallet milik akun owner, dipakai bersama semua
// outlet-nya), bukan per-outlet.
export interface WalletTransactionItem {
  id: number;
  code: string;
  transaction_type: string;
  direction: string;
  amount: string;
  balance_before: string;
  balance_after: string;
  currency: string;
  source_type: string;
  source_reference?: string;
  occurred_at: string;
  note?: string;
  created_by?: { id: number; name: string; role?: string };
  created_at: string;
}

export interface WalletTransactionListData {
  items: WalletTransactionItem[];
  pagination: ApiPagination;
}

export interface WalletOwnerBrief {
  id?: number;
  code?: string;
  name?: string;
  kode_owner?: string;
  nama_owner?: string;
}

export interface WalletAccountItem {
  id: number;
  owner_id?: number;
  owner?: WalletOwnerBrief;
  account_code?: string;
  code?: string;
  currency?: string;
  balance?: string;
  ledger_balance?: string;
  status?: string;
}

// Sprint 15a — status is now a real lifecycle: PENDING (menunggu transfer,
// belum masuk balance) -> ACCEPTED (balance credit) | REJECTED | EXPIRED
// (24 jam sesi PENDING lewat, auto oleh worker). "PAID" (nilai lama) tidak
// lagi dipakai backend, tapi dibiarkan di union untuk data historis lama.
export type WalletPaymentStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "PAID";

export interface WalletPaymentItem {
  id: number;
  owner_id?: number;
  owner?: WalletOwnerBrief;
  code?: string;
  payment_type?: string;
  payment_channel?: string;
  channel?: string;
  external_reference?: string;
  amount?: string;
  currency?: string;
  status?: WalletPaymentStatus;
  paid_at?: string;
  session_expires_at?: string;
  transfer_date_override?: string;
  effective_transfer_date?: string;
  unique_code?: string;
  created_at?: string;
  note?: string;
}

export interface WalletLedgerItem {
  id: number;
  owner_id?: number;
  owner?: WalletOwnerBrief;
  code?: string;
  transaction_type?: string;
  direction?: string;
  source_type?: string;
  source_reference?: string;
  external_reference?: string;
  amount?: string;
  balance_after?: string;
  occurred_at?: string;
  created_at?: string;
  note?: string;
}

export interface WalletPaymentDetailData {
  payment?: WalletPaymentItem;
  transaction?: WalletLedgerItem;
  wallet?: WalletAccountItem;
}

export async function listOwnerWalletTransactions(
  ownerId: number,
  params: { page?: number; limit?: number } = {},
): Promise<WalletTransactionListData> {
  const qs = buildQueryString({ ...params });
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/wallet/transactions${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<WalletTransactionListData>>(res);
  return data.data;
}

export async function getWalletPaymentDetail(
  paymentId: number,
): Promise<WalletPaymentDetailData> {
  const res = await fetch(`${API_BASE_URL}/api/v1/wallet-payments/${paymentId}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<WalletPaymentDetailData | WalletPaymentItem>>(res);
  const payload = data.data;

  if (payload && typeof payload === "object" && "payment" in payload) {
    return payload as WalletPaymentDetailData;
  }

  return {
    payment: payload as WalletPaymentItem,
  };
}

// Sprint 15a — Top Up lifecycle actions. Accept credits the wallet (unique_code
// records a manual-transfer residual like Rp 123 on top of a round Rp 34.000
// request — never counted as revenue, just recorded); Reject leaves the
// balance untouched (a PENDING top-up never touched it in the first place).
export interface AcceptTopupPayload {
  unique_code?: string;
  transfer_date_override?: string;
}

export async function acceptTopup(
  paymentId: number,
  payload: AcceptTopupPayload = {},
): Promise<WalletPaymentDetailData> {
  const res = await fetch(`${API_BASE_URL}/api/v1/wallet-payments/${paymentId}/accept`, {
    method: "PATCH",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<WalletPaymentDetailData>>(res);
  return data.data;
}

export async function rejectTopup(
  paymentId: number,
  payload: { note?: string } = {},
): Promise<WalletPaymentItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/wallet-payments/${paymentId}/reject`, {
    method: "PATCH",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<WalletPaymentItem>>(res);
  return data.data;
}

// Admin can correct the transfer date from the payment proof/receipt
// independently of accept — e.g. owner transferred yesterday but the system
// recorded the top-up in real time today.
export async function setTransferDateOverride(
  paymentId: number,
  transferDate: string,
): Promise<WalletPaymentItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/wallet-payments/${paymentId}/transfer-date`, {
    method: "PATCH",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ transfer_date: transferDate }),
  });

  const data = await handleResponse<ApiEnvelope<WalletPaymentItem>>(res);
  return data.data;
}

// Sprint 15a — Transfer module (baru): bukti transfer bank dari owner ke
// perusahaan, dicocokkan (suggest/confirm) ke Top Up yang PENDING.
export interface TransferOwnerRef {
  id: number;
  code?: string;
  name?: string;
}

export type TransferMatchStatus =
  | "UNMATCHED"
  | "SUGGESTED"
  | "MATCHED"
  | "REJECTED_MATCH";

export interface TransferItem {
  id: number;
  owner: TransferOwnerRef;
  amount: string;
  transfer_date: string;
  proof_url?: string;
  note?: string;
  matched_wallet_payment_id?: number;
  match_status: TransferMatchStatus;
  source: "MANUAL_ENTRY" | "ADMIN_DASHBOARD";
  external_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface TransferListData {
  items: TransferItem[];
  pagination: ApiPagination;
}

export interface CreateTransferPayload {
  amount: string;
  transfer_date: string;
  proof_url?: string;
  note?: string;
  external_reference?: string;
}

export interface TransferMatchSuggestion {
  transfer: TransferItem;
  wallet_payment_id: number;
  wallet_payment_code: string;
  wallet_payment_amount: string;
  unique_code?: string;
  amount_mismatch: boolean;
}

export async function createTransfer(
  ownerId: number,
  payload: CreateTransferPayload,
): Promise<TransferItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/transfers`, {
    method: "POST",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<TransferItem>>(res);
  return data.data;
}

export async function listOwnerTransfers(
  ownerId: number,
  params: { match_status?: TransferMatchStatus; page?: number; limit?: number; all?: boolean } = {},
): Promise<TransferListData> {
  const { all, ...rest } = params;
  const qs = buildQueryString({ ...rest, all: all ? "true" : undefined });
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/transfers${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<TransferListData>>(res);
  return data.data;
}

export async function listTransfers(
  params: {
    owner_id?: number;
    match_status?: TransferMatchStatus;
    page?: number;
    limit?: number;
    all?: boolean;
  } = {},
): Promise<TransferListData> {
  const { all, ...rest } = params;
  const qs = buildQueryString({ ...rest, all: all ? "true" : undefined });
  const res = await fetch(`${API_BASE_URL}/api/v1/transfers${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<TransferListData>>(res);
  return data.data;
}

export async function getTransferSuggestions(
  ownerId: number,
): Promise<TransferMatchSuggestion[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/transfers/suggestions`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<{ items: TransferMatchSuggestion[] }>>(res);
  return data.data.items;
}

export async function confirmTransferMatch(
  transferId: number,
  payload: { wallet_payment_id: number; unique_code?: string },
): Promise<TransferItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/transfers/${transferId}/confirm-match`, {
    method: "POST",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<TransferItem>>(res);
  return data.data;
}

export async function rejectTransferMatch(
  transferId: number,
  payload: { note?: string } = {},
): Promise<TransferItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/transfers/${transferId}/reject-match`, {
    method: "POST",
    credentials: "include",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<TransferItem>>(res);
  return data.data;
}

export interface SubscriptionItem {
  id: number;
  code: string;
  owner?: { id: number; code?: string; name?: string };
  outlet_id?: number;
  order?: { id: number; code?: string; name?: string };
  package?: { id: number; code?: string; name?: string };
  plan?: { id: number; code?: string; name?: string };
  status: string;
  active_from: string;
  active_until: string;
  total_duration_days?: number;
  source_type?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionOrderDetailItem {
  id: number;
  code?: string;
  owner?: { id?: number; code?: string; name?: string };
  closing?: { id?: number; code?: string };
  plan?: { id?: number; code?: string; name?: string };
  promotion?: { id?: number; code?: string; name?: string };
  // Sprint 15a — order bisa memakai lebih dari satu promotion sekaligus;
  // `promotion` singular dipertahankan untuk kompatibilitas data lama.
  promotions?: { id?: number; code?: string; name?: string }[];
  balance_shortfall_amount?: string | null;
  wallet_transaction_id?: number;
  tenure_months?: number;
  duration_days?: number;
  base_price?: string;
  additional_charge?: string;
  final_amount?: string;
  status?: string;
  purchased_at?: string;
  subscription_start_date?: string;
  external_reference?: string;
  note?: string;
}

export interface SubscriptionDetailData {
  subscription?: SubscriptionItem;
  order?: SubscriptionOrderDetailItem;
}

export interface SubscriptionListData {
  items: SubscriptionItem[];
  pagination: ApiPagination;
}

export async function listSubscriptionsByOutlet(
  outletId: number,
  params: { page?: number; limit?: number } = {},
): Promise<SubscriptionListData> {
  const qs = buildQueryString({ outlet_id: outletId, ...params });
  const res = await fetch(`${API_BASE_URL}/api/v1/subscriptions${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<SubscriptionListData>>(res);
  return data.data;
}

export async function getSubscriptionDetail(
  subscriptionId: number,
): Promise<SubscriptionDetailData> {
  const res = await fetch(`${API_BASE_URL}/api/v1/subscriptions/${subscriptionId}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<SubscriptionDetailData | SubscriptionItem>>(res);
  const payload = data.data;

  if (payload && typeof payload === "object" && "subscription" in payload) {
    return payload as SubscriptionDetailData;
  }

  return {
    subscription: payload as SubscriptionItem,
  };
}

export interface AnalyticsCatalogItem {
  module: string;
  key: string;
  name: string;
  type: string;
  function: string;
  purpose: string;
  how_to_read: string;
  analysis_goal: string;
  supported_metrics?: string[];
  supported_filters?: string[];
  supported_compare_modes?: string[];
  query_endpoint: string;
  export_endpoint?: string;
  polarity_rule: string;
  export_available: boolean;
  comparison_enabled: boolean;
}

export interface AnalyticsTimeFilterRequest {
  mode: "date_range" | "month_range" | "year_range";
  date_from?: string;
  date_to?: string;
  month_from?: string;
  month_to?: string;
  year_from?: number;
  year_to?: number;
  granularity: "day" | "month" | "year";
}

export interface AnalyticsComparisonSeriesRequest {
  field: string;
  label: string;
  value: string;
}

export interface AnalyticsComparisonRequest {
  enabled: boolean;
  mode?: string;
  baseline_time_filter?: AnalyticsTimeFilterRequest;
  compare_series?: AnalyticsComparisonSeriesRequest[];
}

export interface AnalyticsFilterRequest {
  province?: string[];
  city?: string[];
  sales_id?: number[];
  supervisor_id?: number[];
  owner_id?: number[];
  outlet_id?: number[];
  status?: string[];
}

export interface AnalyticsQueryOptions {
  limit?: number;
  sort?: string;
  include_table?: boolean;
  include_summary?: boolean;
  include_previous_points?: boolean;
}

export interface AnalyticsQueryRequest {
  time_filter: AnalyticsTimeFilterRequest;
  comparison?: AnalyticsComparisonRequest;
  metrics?: string[];
  dimensions?: string[];
  filters?: AnalyticsFilterRequest;
  options?: AnalyticsQueryOptions;
}

export interface AnalyticsDiagramMetadata {
  key: string;
  module: string;
  name: string;
  type: string;
  function: string;
  purpose: string;
  how_to_read: string;
  analysis_goal: string;
}

export interface AnalyticsComparisonSummary {
  enabled: boolean;
  mode?: string;
  baseline_label?: string;
  current_value?: number;
  baseline_value?: number;
  delta?: number;
  delta_percent?: number;
  direction?: string;
  polarity_rule?: string;
  status_value?: number;
}

export interface AnalyticsChartPoint {
  x: unknown;
  y: number;
}

export interface AnalyticsChartSeries {
  key: string;
  label: string;
  points: AnalyticsChartPoint[];
}

export interface AnalyticsInsight {
  summary?: string;
  conclusion?: string;
  recommendation?: string;
}

export interface AnalyticsQueryResult {
  diagram: AnalyticsDiagramMetadata;
  time_filter?: Record<string, unknown>;
  comparison?: AnalyticsComparisonSummary;
  series?: AnalyticsChartSeries[];
  table?: Record<string, unknown>[];
  extra?: Record<string, unknown>;
  insight?: AnalyticsInsight;
}

export async function fetchAnalyticsCatalog(): Promise<AnalyticsCatalogItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/catalog`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<{ items: AnalyticsCatalogItem[] }>>(res);
  return data.data.items || [];
}

export async function fetchAnalyticsCatalogByModule(
  module: string,
): Promise<AnalyticsCatalogItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/catalog/${module}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<{ items: AnalyticsCatalogItem[] }>>(res);
  return data.data.items || [];
}

export async function fetchAnalyticsCatalogDiagram(
  module: string,
  diagram: string,
): Promise<AnalyticsCatalogItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/catalog/${module}/${diagram}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<AnalyticsCatalogItem>>(res);
  return data.data;
}

export async function queryAnalyticsDiagram(
  module: string,
  diagram: string,
  payload: AnalyticsQueryRequest,
): Promise<AnalyticsQueryResult> {
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/${module}/${diagram}/query`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<AnalyticsQueryResult>>(res);
  return data.data;
}

export interface UpdateUserProfilePayload {
  name?: string;
  email?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export async function updateUserProfile(payload: UpdateUserProfilePayload): Promise<UserResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/profile`, {
    method: "PATCH",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<UserResponse>>(res);
  return data.data;
}

export async function changeUserPassword(payload: ChangePasswordPayload): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<{ status: string }>>(res);
  return data.data;
}

// ─── Discussion / Bantuan Forum API ───────────────────────────────────────

export interface BackendDiscussionReply {
  id: number;
  thread_id: number;
  author_id: number;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface BackendDiscussionThread {
  id: number;
  channel: string;
  title: string;
  author_id: number;
  authorName: string;
  authorRole: string;
  content: string;
  tags: string[];
  likes: number;
  isLiked: boolean;
  solved?: boolean;
  createdAt: string;
  replies: BackendDiscussionReply[];
}

export interface CreateDiscussionThreadPayload {
  channel: string;
  title: string;
  content: string;
  tags?: string[];
}

export interface CreateDiscussionReplyPayload {
  content: string;
}

export async function fetchDiscussionThreads(channel?: string, query?: string): Promise<BackendDiscussionThread[]> {
  const params = new URLSearchParams();
  if (channel && channel !== "all") params.set("channel", channel);
  if (query) params.set("query", query);

  const res = await fetch(`${API_BASE_URL}/api/v1/discussions/threads?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<BackendDiscussionThread[]>>(res);
  return data.data || [];
}

export async function createDiscussionThread(payload: CreateDiscussionThreadPayload): Promise<BackendDiscussionThread> {
  const res = await fetch(`${API_BASE_URL}/api/v1/discussions/threads`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<BackendDiscussionThread>>(res);
  return data.data;
}

export async function toggleDiscussionLike(threadId: number): Promise<{ isLiked: boolean; likes: number }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/discussions/threads/${threadId}/like`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<{ isLiked: boolean; likes: number }>>(res);
  return data.data;
}

export async function deleteDiscussionThread(threadId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/discussions/threads/${threadId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  await handleResponse(res);
}

export async function addDiscussionReply(threadId: number, payload: CreateDiscussionReplyPayload): Promise<BackendDiscussionReply> {
  const res = await fetch(`${API_BASE_URL}/api/v1/discussions/threads/${threadId}/replies`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<ApiEnvelope<BackendDiscussionReply>>(res);
  return data.data;
}

export async function deleteDiscussionReply(replyId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/discussions/replies/${replyId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  await handleResponse(res);
}

// ─── Owner Wallet & Subscriptions History API ───

export interface OwnerSubscriptionItem {
  id: number;
  code?: string;
  order_type?: string;
  owner_id?: number;
  outlet_id?: number;
  outlet_name?: string;
  package_name?: string;
  plan_name?: string;
  status: string;
  amount?: string | number;
  total_amount?: string | number;
  purchased_at?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

type ArrayPayload<T> =
  | T[]
  | {
    data?: T[] | { items?: T[] };
    items?: T[];
  };

function normalizeArrayPayload<T>(payload: ArrayPayload<T>): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export async function fetchOwnerWalletTransactions(ownerId: number): Promise<WalletTransactionItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/owners/${ownerId}/wallet/transactions`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<ArrayPayload<WalletTransactionItem>>(res);
  return normalizeArrayPayload(data);
}

export async function fetchOwnerSubscriptions(ownerId: number): Promise<OwnerSubscriptionItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/subscription-orders/all?owner_id=${ownerId}&sort=-purchased_at`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<ArrayPayload<OwnerSubscriptionItem>>(res);
  return normalizeArrayPayload(data);
}







