import { apiFetch, buildQuery, type QueryParams } from "./client";
import type { PaginatedList } from "./types";

export type Owner = {
  id: number;
  code: string;
  name: string;
  phone: string;
  email?: string;
  brand_name?: string;
  province?: string;
  city?: string;
  address?: string;
  status: string;
  outlet_count: number;
  created_at: string;
  updated_at: string;
};

export type Outlet = {
  id: number;
  owner_id: number;
  code?: string;
  name: string;
  phone?: string;
  province?: string;
  city?: string;
  address?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

/**
 * Parameter sesuai `internal/customer/handler.go` (`listOwners`):
 * page, limit, q, code, name, phone, brand_name, province, city, sort.
 */
export type ListOwnersParams = {
  page?: number;
  limit?: number;
  q?: string;
  code?: string;
  name?: string;
  phone?: string;
  brand_name?: string;
  province?: string;
  city?: string;
  sort?: string;
};

export function listOwners(
  params: ListOwnersParams = {},
): Promise<PaginatedList<Owner>> {
  return apiFetch<PaginatedList<Owner>>(
    `/owners${buildQuery(params as QueryParams)}`,
  );
}

export function getOwner(ownerId: number): Promise<Owner> {
  return apiFetch<Owner>(`/owners/${ownerId}`);
}

export function listOutlets(
  ownerId: number,
  params: { page?: number; limit?: number } = {},
): Promise<PaginatedList<Outlet>> {
  return apiFetch<PaginatedList<Outlet>>(
    `/owners/${ownerId}/outlets${buildQuery(params as QueryParams)}`,
  );
}

export type CreateOwnerPayload = Partial<
  Pick<
    Owner,
    | "code"
    | "name"
    | "phone"
    | "email"
    | "brand_name"
    | "province"
    | "city"
    | "address"
  >
>;

export function createOwner(payload: CreateOwnerPayload): Promise<Owner> {
  return apiFetch<Owner>("/owners", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOwner(
  ownerId: number,
  payload: CreateOwnerPayload,
): Promise<Owner> {
  return apiFetch<Owner>(`/owners/${ownerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function restoreOwner(ownerId: number): Promise<Owner> {
  return apiFetch<Owner>(`/owners/${ownerId}/restore`, { method: "PATCH" });
}

/** Backend membalas `{status: "force_deleted"}`, bukan body kosong. */
export function hardDeleteOwner(ownerId: number): Promise<{ status: string }> {
  return apiFetch(`/owners/${ownerId}/force`, { method: "DELETE" });
}

/** Backend membalas `{status: "deleted"}`, bukan body kosong. */
export function softDeleteOwner(ownerId: number): Promise<{ status: string }> {
  return apiFetch(`/owners/${ownerId}`, { method: "DELETE" });
}

export type CreateOutletPayload = {
  code: string;
  name: string;
  phone?: string;
  address?: string;
};

export function bulkCreateOutlets(
  ownerId: number,
  items: CreateOutletPayload[],
): Promise<unknown> {
  return apiFetch(`/owners/${ownerId}/outlets/bulk`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export function bulkForceDeleteOutlets(
  ownerId: number,
  ids: number[],
): Promise<unknown> {
  return apiFetch(`/owners/${ownerId}/outlets/bulk/force`, {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}
