"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchCustomerInteractions,
  getSalesList,
  type InteractionListParams,
  type InteractionItem,
  type UserResponse,
  type ApiPagination,
} from "@/app/lib/api";

export const interactKeys = {
  all: ["interact"] as const,
  list: (params: InteractionListParams) => [...interactKeys.all, "list", params] as const,
  salesList: () => [...interactKeys.all, "sales-list"] as const,
};

export function useInteractionListQuery(params: InteractionListParams, enabled = true) {
  return useQuery<{ items: InteractionItem[]; pagination: ApiPagination }>({
    queryKey: interactKeys.list(params),
    queryFn: () => fetchCustomerInteractions(params),
    enabled,
  });
}

export function useInteractSalesListQuery(enabled = true) {
  return useQuery<UserResponse[]>({
    queryKey: interactKeys.salesList(),
    queryFn: () =>
      getSalesList().catch((err) => {
        console.warn("Failed to fetch sales list, user might not have permission:", err);
        return [];
      }),
    enabled,
  });
}
