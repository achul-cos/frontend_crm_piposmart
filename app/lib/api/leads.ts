import { apiFetch, buildQuery, type QueryParams } from "./client";
import type { PaginatedList, UserSummary } from "./types";

/**
 * Bentuk response `/leads`, disalin dari `internal/lead/types.go`
 * (`LeadResponse`) pada backend.
 */
export type LeadOwner = {
  available: boolean;
  id?: number;
  code?: string;
  name?: string;
  phone?: string;
  brand_name?: string;
  province?: string;
  city?: string;
  message?: string;
};

export type Lead = {
  id: number;
  code: string;
  owner: LeadOwner;
  outlet_id?: number;
  current_owner?: UserSummary;
  current_owner_role: string;
  supervisor?: UserSummary;
  active_sales?: UserSummary;
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
};

/**
 * Parameter yang benar-benar dibaca backend di
 * `internal/lead/handler.go` (`listLeads`). Nama field sengaja dibiarkan
 * snake_case agar cocok satu-satu dengan `c.Query(...)` di sana.
 */
export type ListLeadsParams = {
  page?: number;
  limit?: number;
  q?: string;
  ownership?: string;
  stage?: string;
  status?: string;
  score?: number;
  supervisor_id?: number;
  sales_id?: number;
  follow_up_from?: string;
  follow_up_to?: string;
  sort?: string;
};

export function listLeads(
  params: ListLeadsParams = {},
): Promise<PaginatedList<Lead>> {
  return apiFetch<PaginatedList<Lead>>(
    `/leads${buildQuery(params as QueryParams)}`,
  );
}

export function getLead(leadId: number): Promise<Lead> {
  return apiFetch<Lead>(`/leads/${leadId}`);
}

export type CreateLeadPayload = {
  owner_id?: number;
  outlet_id?: number;
  source_type: string;
  source_reference?: string;
};

export function createLead(payload: CreateLeadPayload): Promise<Lead> {
  return apiFetch<Lead>("/leads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Backend membalas `LeadResponse` penuh (lead dengan supervisor terbaru). */
export function assignSupervisor(
  leadId: number,
  supervisorId: number,
): Promise<Lead> {
  return apiFetch<Lead>(`/leads/${leadId}/assign-supervisor`, {
    method: "POST",
    body: JSON.stringify({ supervisor_id: supervisorId }),
  });
}

/**
 * Riwayat interaksi/training/closing sebuah lead — dipakai sebagai daftar
 * riwayat lengkap (bukan tabel berpaginasi), jadi unwrap ke array polos
 * seperti pola `app/lib/api.ts` versi lama, bukan `PaginatedList`.
 */
export type InteractionItem = {
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
};

export type TrainingItem = {
  id: number;
  training_type: string;
  status: string;
  scheduled_at: string;
  completed_at?: string | null;
  location?: string;
  note?: string;
  sales?: { id: number; name: string; role?: string } | null;
  created_at: string;
};

export type ClosingItem = {
  id: number;
  code?: string;
  status: string;
  plan?: { id: number; code?: string; name: string } | null;
  package?: { id: number; code?: string; name: string } | null;
  package_snapshot?: unknown;
  plan_snapshot?: unknown;
  promotion?: unknown;
  promotion_snapshot?: unknown;
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
};

export async function listLeadInteractions(
  leadId: number,
): Promise<InteractionItem[]> {
  const result = await apiFetch<{ items: InteractionItem[] }>(
    `/leads/${leadId}/interactions?limit=100`,
  );
  return result.items;
}

export async function listLeadTrainings(
  leadId: number,
): Promise<TrainingItem[]> {
  const result = await apiFetch<{ items: TrainingItem[] }>(
    `/leads/${leadId}/trainings?limit=100`,
  );
  return result.items;
}

export async function listLeadClosings(
  leadId: number,
): Promise<ClosingItem[]> {
  const result = await apiFetch<{ items: ClosingItem[] }>(
    `/closings?lead_id=${leadId}&limit=100`,
  );
  return result.items;
}

/**
 * Hack sisi-klien yang dipertahankan apa adanya dari `app/lib/api.ts` lama:
 * backend belum punya endpoint `/api/v1/supervisors`, jadi supervisor
 * diturunkan dari daftar lead yang sudah pernah di-assign ke seorang
 * supervisor (`lead.supervisor` / `lead.current_owner` saat rolenya
 * SUPERVISOR). Fallback ke satu entri dummy bila tidak ada satu pun
 * ditemukan, supaya UI picker tidak kosong total.
 *
 * TODO: ganti dengan panggilan ke endpoint supervisor asli begitu backend
 * menyediakannya (di luar scope FE-02 — bukan gap frontend).
 */
export async function getSupervisorList(): Promise<UserSummary[]> {
  try {
    const { items: leads } = await listLeads({ limit: 1000 });
    const discovered: UserSummary[] = [];
    const seenIds = new Set<number>();

    for (const lead of leads) {
      const candidates = [lead.current_owner, lead.supervisor];

      for (const candidate of candidates) {
        if (
          candidate &&
          candidate.role === "SUPERVISOR" &&
          !seenIds.has(candidate.id)
        ) {
          seenIds.add(candidate.id);
          discovered.push(candidate);
        }
      }
    }

    if (discovered.length > 0) {
      return discovered;
    }

    return [
      { id: 99, name: "Budi (Supervisor Dummy)", role: "SUPERVISOR" },
    ];
  } catch (error) {
    console.error("Gagal mengekstrak data supervisor dari leads", error);
    return [];
  }
}
