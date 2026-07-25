import { apiFetch, buildQuery } from "./client";

/**
 * Client katalog paket/plan/promosi. Tipe dan endpoint disalin dari
 * `app/lib/api.ts` versi lama (sudah benar, cocok kontrak backend
 * `internal/catalog`), dipindahkan ke sini mengikuti konvensi satu file per
 * domain di `app/lib/api/*`.
 */

export type CatalogPackage = {
  id: number;
  code: string;
  name: string;
  level_order?: number;
  description?: string;
  active: boolean;
};

export type CatalogPlan = {
  id: number;
  code: string;
  name: string;
  tenure_months: number;
  duration_days: number;
  price: string;
  currency: string;
  package?: { id: number; code: string; name: string };
};

export type CatalogPromotion = {
  id: number;
  code: string;
  name: string;
  description?: string;
  discount_type?: string;
  discount_value?: string;
};

export async function listCatalogPackages(): Promise<CatalogPackage[]> {
  const result = await apiFetch<{ items: CatalogPackage[] }>(
    "/catalog/packages?limit=100&active=true",
  );
  return result.items;
}

export async function listCatalogPlans(
  packageId?: number,
): Promise<CatalogPlan[]> {
  const query = buildQuery({ limit: 100, active: true, package_id: packageId });
  const result = await apiFetch<{ items: CatalogPlan[] }>(
    `/catalog/plans${query}`,
  );
  return result.items;
}

export async function listEligiblePromotions(
  planId: number,
): Promise<CatalogPromotion[]> {
  const result = await apiFetch<CatalogPromotion[]>(
    `/catalog/plans/${planId}/eligible-promotions`,
  );
  return Array.isArray(result) ? result : [];
}
