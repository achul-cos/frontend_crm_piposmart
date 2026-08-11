"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchClosings,
  getSalesList,
  getClosingById,
  type ClosingListParams,
  type ClosingItem,
  type UserResponse,
  type ApiPagination,
} from "@/app/lib/api";

export const closingKeys = {
  all: ["closing"] as const,
  list: (params: ClosingListParams) => [...closingKeys.all, "list", params] as const,
  salesList: () => [...closingKeys.all, "sales-list"] as const,
  detail: (id: number) => [...closingKeys.all, "detail", id] as const,
};

export function useClosingListQuery(params: ClosingListParams, enabled = true) {
  return useQuery<{ items: ClosingItem[]; pagination: ApiPagination }>({
    queryKey: closingKeys.list(params),
    queryFn: () => fetchClosings(params),
    enabled,
  });
}

export function useClosingDetailQuery(id: number, enabled = true) {
  return useQuery<ClosingItem>({
    queryKey: closingKeys.detail(id),
    queryFn: () => getClosingById(id),
    enabled,
  });
}

export function useClosingSalesListQuery(enabled = true) {
  return useQuery<UserResponse[]>({
    queryKey: closingKeys.salesList(),
    queryFn: () =>
      getSalesList().catch((err) => {
        console.warn("Failed to fetch sales list, user might not have permission:", err);
        return [];
      }),
    enabled,
  });
}
