"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchTrainings,
  getTrainingById,
  getSalesList,
  type TrainingListParams,
  type TrainingItem,
  type UserResponse,
  type ApiPagination,
} from "@/app/lib/api";

export const trainingKeys = {
  all: ["training"] as const,
  list: (params: TrainingListParams) => [...trainingKeys.all, "list", params] as const,
  detail: (id: number) => [...trainingKeys.all, "detail", id] as const,
  salesList: () => [...trainingKeys.all, "sales-list"] as const,
};

export function useTrainingListQuery(params: TrainingListParams, enabled = true) {
  return useQuery<{ items: TrainingItem[]; pagination: ApiPagination }>({
    queryKey: trainingKeys.list(params),
    queryFn: () => fetchTrainings(params),
    enabled,
  });
}

export function useTrainingDetailQuery(id: number, enabled = true) {
  return useQuery<TrainingItem>({
    queryKey: trainingKeys.detail(id),
    queryFn: () => getTrainingById(id),
    enabled,
  });
}

export function useTrainingSalesListQuery(enabled = true) {
  return useQuery<UserResponse[]>({
    queryKey: trainingKeys.salesList(),
    queryFn: () =>
      getSalesList().catch((err) => {
        console.warn("Failed to fetch sales list, user might not have permission:", err);
        return [];
      }),
    enabled,
  });
}
