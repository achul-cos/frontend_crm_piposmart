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
  owner_id: number;
  code: string;
  name: string;
  phone: string;
  province?: string;
  city?: string;
  address?: string;
  status: string;
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
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const qs = query.toString();
  const url = `${API_BASE_URL}/api/v1/owners${qs ? `?${qs}` : ""}`;

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
    id?: number;
    code: string;
    name: string;
    phone: string;
    brand_name: string;
    province: string;
    city: string;
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
  const res = await fetch(`${API_BASE_URL}/api/v1/leads?limit=1000`, {
    headers,
  });
  const data = await handleResponse<{ data: LeadListResponse }>(res);
  return data.data?.items || [];
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
  follow_up_at?: string | null;
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
  location?: string;
  note?: string;
  sales?: { id: number; name: string; role?: string } | null;
  created_at: string;
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
  const data = await handleResponse<{ data: CatalogPromotion[] }>(res);
  return Array.isArray(data.data) ? data.data : [];
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

export interface ImportBatchResponse {
  id: number;
  code: string;
  profile: string;
  original_filename: string;
  status: string; // 'UPLOADED' | 'VALIDATING' | 'VALIDATED' | 'VALIDATION_FAILED'
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
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

export async function commitImportBatch(id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/${id}/commit`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  return handleResponse<{ message: string }>(res);
}

export async function bulkReleaseLeads(leadIds: number[], reason: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/leads/bulk/release`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ lead_ids: leadIds, reason }),
  });
  return handleResponse(res);
}
