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
