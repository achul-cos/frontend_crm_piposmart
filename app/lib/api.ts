const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ─── Auth helpers ───────────────────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("piposmart_access_token") || ""
      : "";

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function handleResponse<T = unknown>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const code = body?.error?.code || "UNKNOWN";
    const message = body?.error?.message || `Request gagal (${res.status})`;

    if (res.status === 401 && typeof window !== "undefined") {
      // Token expired / invalid — redirect ke login
      window.location.href = "/auth/login";
    }

    throw new Error(`[${code}] ${message}`);
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
  start_date?: string;
  end_date?: string;
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
  status: string;
  outlet_count?: number;
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
  address?: string;
  status?: string;
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
  items: { code: string; name: string; phone?: string; province?: string; city?: string; address?: string }[],
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
  type: string;           // "chat", "call", "visit", "email"
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
  discount_amount: string;
  unique_transfer_code?: number;
  closed_at?: string;
  interaction_type: string;
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
  const res = await fetch(`${API_BASE_URL}/api/v1/leads?limit=100000`, {
    headers,
  });
  const data = await handleResponse<{ data: LeadListResponse }>(res);
  return data.data?.items || [];
}

export async function getLeadsWithTotal(): Promise<{ items: BackendLead[], total: number }> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/v1/leads?limit=100000`, {
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
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/${leadId}/closings`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ data: any }>(res);
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

export interface TrainingItem {
  id: number;
  training_type: string;
  status: string;
  scheduled_at: string;
  completed_at?: string | null;
  canceled_at?: string | null;
  rescheduled_at?: string | null;
  location?: string;
  meeting_url?: string;
  trainer_name?: string;
  participant_name?: string;
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

export interface ClosingItem {
  id: number;
  code?: string;
  status: string;
  plan?: { id: number; code?: string; name: string } | null;
  package?: { id: number; code?: string; name: string } | null;
  package_snapshot?: any;
  plan_snapshot?: any;
  promotion?: any;
  promotion_snapshot?: any;
  tenure_months?: number;
  duration_days?: number;
  base_price?: string;
  discount_amount?: string;
  additional_charge?: string;
  unique_transfer_code?: number;
  final_amount: string;
  currency: string;
  closed_at: string;
  sales?: { id: number; name: string } | null;
}

export async function getLeadClosings(leadId: number): Promise<ClosingItem[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/closings?lead_id=${leadId}&limit=100`,
    { headers: getAuthHeaders() }
  );
  const data = await handleResponse<{ data: { items: ClosingItem[] } }>(res);
  return data.data?.items || [];
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

// TODO: Replace with real backend call to /api/v1/supervisors once created by the backend team
// WORKAROUND: Extract real supervisors directly from the current leads data to bypass backend limitations.
export async function getSupervisorList(): Promise<UserResponse[]> {
  try {
    const leads = await getLeads();
    const discoveredSupervisors: UserResponse[] = [];
    const seenIds = new Set<number>();

    leads.forEach(lead => {
      // Periksa current_owner jika dia adalah SUPERVISOR
      if (lead.current_owner && (lead.current_owner.role === "SUPERVISOR" || lead.current_owner_role === "SUPERVISOR") && !seenIds.has(lead.current_owner.id)) {
        seenIds.add(lead.current_owner.id);
        discoveredSupervisors.push({
          id: lead.current_owner.id,
          code: "",
          name: lead.current_owner.name,
          email: "",
          phone: "",
          role: "SUPERVISOR",
          status: "active",
          is_active: true
        });
      }
      // Periksa field supervisor
      if (lead.supervisor && !seenIds.has(lead.supervisor.id)) {
        seenIds.add(lead.supervisor.id);
        discoveredSupervisors.push({
          id: lead.supervisor.id,
          code: "",
          name: lead.supervisor.name,
          email: "",
          phone: "",
          role: "SUPERVISOR",
          status: "active",
          is_active: true
        });
      }
    });

    // Jika berhasil menemukan supervisor asli dari data nasabah, kembalikan data tersebut.
    if (discoveredSupervisors.length > 0) {
      return discoveredSupervisors;
    }

    // Fallback dummy
    return [
      {
        id: 99,
        code: "SUP-01",
        name: "Budi (Supervisor Dummy)",
        email: "budi.dummy@example.com",
        phone: "081234567890",
        role: "SUPERVISOR",
        status: "active",
        is_active: true,
      }
    ];
  } catch (err) {
    console.error("Gagal mengekstrak data supervisor dari leads", err);
    return [];
  }
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
  raw_payload: any;
  status: string;
  validation_errors?: string[] | Record<string, string>;
  commit_error?: string;
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

export async function uploadImportFile(file: File, profile: string = "OWNER_OUTLET"): Promise<ImportBatchResponse> {
  const token = typeof window !== "undefined" ? localStorage.getItem("piposmart_access_token") || "" : "";
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("profile", profile);

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
  const token = typeof window !== "undefined" ? localStorage.getItem("piposmart_access_token") || "" : "";
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
  address?: string | null;
  bank_account_masked?: string | null;
  status: "ACTIVE" | "INACTIVE";
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
  status?: "ACTIVE" | "INACTIVE";
}

export interface UpdatePartnerPayload {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  bank_account?: string;
  status?: "ACTIVE" | "INACTIVE";
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

export async function listPartners(
  params: PartnerListParams = {},
): Promise<PartnerListData> {
  const qs = buildQueryString({
    search: params.search,
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

  await handleResponse(res);
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
  package_id?: number | null;
  package_code?: string | null;
  package_name?: string | null;
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
  package_id?: number;
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
  package_id?: number;
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
): Promise<PartnerCommissionRuleListData> {
  const qs = buildQueryString({
    package_id: params.package_id,
    active_only: params.active_only === undefined ? undefined : String(params.active_only),
  });

  const res = await fetch(`${API_BASE_URL}/api/v1/partner-types/${partnerTypeId}/commission-rules${qs}`, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(),
  });

  const data = await handleResponse<ApiEnvelope<PartnerCommissionRuleListData>>(res);
  return data.data;
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
}

export interface OutletWalletBrief {
  id: number;
  account_code: string;
  currency: string;
  balance: string;
  ledger_balance: string;
  status: string;
  created_at: string;
  updated_at: string;
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
  wallet: OutletWalletBrief;
  code: string;
  name: string;
  phone?: string;
  province?: string;
  city?: string;
  address?: string;
  status: string;
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
  month?: string;
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
  wallet: OutletWalletBrief;
  code: string;
  name: string;
  phone?: string;
  province?: string;
  city?: string;
  address?: string;
  status: string;
  subscription_summary: OutletSubscriptionSummary;
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
  code: string;
  name: string;
  phone?: string;
  province?: string;
  city?: string;
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
  status?: string;
  paid_at?: string;
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



