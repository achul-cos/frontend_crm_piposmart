"use client";

// React Query layer for app/menu/paket-langganan (packages/plans/promotions catalog).
// Wraps the existing packageApi/planApi/promotionApi CRUD objects in app/lib/api.ts —
// this file owns no fetch logic of its own, only caching + invalidation.

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { packageApi, planApi, promotionApi } from "@/app/lib/api";

export type CatalogListParams = Record<string, unknown>;

export const catalogKeys = {
  all: ["catalog"] as const,
  packages: (params: CatalogListParams) => [...catalogKeys.all, "packages", params] as const,
  plans: (params: CatalogListParams) => [...catalogKeys.all, "plans", params] as const,
  promotions: (params: CatalogListParams) => [...catalogKeys.all, "promotions", params] as const,
};

export function usePackagesQuery(params: CatalogListParams, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.packages(params),
    queryFn: () => packageApi.list(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function usePlansQuery(params: CatalogListParams, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.plans(params),
    queryFn: () => planApi.list(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function usePromotionsQuery(params: CatalogListParams, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.promotions(params),
    queryFn: () => promotionApi.list(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useInvalidateCatalog() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: catalogKeys.all });
}
