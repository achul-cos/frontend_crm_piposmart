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
