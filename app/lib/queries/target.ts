"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetchJson } from "@/app/lib/api";

// The backend endpoints below (`/kpi/*`, `/sales-targets*`, `/kpi-definitions*`) have no
// typed wrappers in app/lib/api.ts yet, so the thin fetch helpers stay local to this module
// (mirroring what app/menu/target/page.tsx and app/menu/target/form/page.tsx used to define
// inline) and are exported for both pages to share as their query/mutation fns.

export interface KpiDefinitionItem {
  id: number;
  metric_code?: string;
  weight?: string;
  threshold_achieved?: string;
  threshold_near?: string;
  is_active?: boolean;
}

export interface KpiJobItem {
  id?: number;
  status?: string;
  attempts?: number;
  max_attempts?: number;
  last_error?: string;
}

export interface KpiRankingItem {
  id?: number;
  sales_id?: number;
  sales_name?: string;
  sales_code?: string;
  name?: string;
  rank_position?: number;
  total_score?: string;
  classification?: string;
  period_year?: number;
  period_month?: number;
}

export interface SalesTargetItem {
  id?: number;
  sales_id?: number;
  sales_name?: string;
  metric_code?: string;
  target_value?: string;
  period_month?: number;
  period_year?: number;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authFetchJson<T>(path, options);
}

function unwrapList<T>(response: { data?: T[] | { items?: T[] } }) {
  if (Array.isArray(response.data)) return response.data;
  return response.data?.items || [];
}

export async function getKpiRanking(periodYear: number, periodMonth: number) {
  const response = await apiFetch<{
    data?: KpiRankingItem[] | { items?: KpiRankingItem[] };
  }>(`/kpi/ranking?period_year=${periodYear}&period_month=${periodMonth}`);

  return unwrapList(response);
}

export async function getKpiResults(periodYear: number, periodMonth: number) {
  const response = await apiFetch<{
    data?: KpiRankingItem[] | { items?: KpiRankingItem[] };
  }>(`/kpi/results?period_year=${periodYear}&period_month=${periodMonth}`);

  return unwrapList(response);
}

// Mirrors the original page's fallback: try the ranking endpoint, and if it fails fall back
// to /kpi/results so the ranking table still has something to render.
async function getKpiRankingWithFallback(periodYear: number, periodMonth: number) {
  try {
    return await getKpiRanking(periodYear, periodMonth);
  } catch {
    return getKpiResults(periodYear, periodMonth);
  }
}

export async function getSalesTargets(periodYear: number, periodMonth: number) {
  const response = await apiFetch<{
    data?: SalesTargetItem[] | { items?: SalesTargetItem[] };
  }>(`/sales-targets?period_year=${periodYear}&period_month=${periodMonth}&all=true`);

  return unwrapList(response);
}

export async function getKpiDefinitions(periodYear: number, periodMonth: number) {
  const response = await apiFetch<{
    data?: KpiDefinitionItem[] | { items?: KpiDefinitionItem[] };
  }>(`/kpi-definitions?period_year=${periodYear}&period_month=${periodMonth}`);

  return unwrapList(response);
}

export async function getKpiJob(jobId: number) {
  const response = await apiFetch<{ data?: KpiJobItem }>(`/kpi/jobs/${jobId}`);
  return response.data;
}

export async function bulkSetTarget(payload: {
  periodYear: number;
  periodMonth: number;
  metricCode: string;
  targetValue: string;
}) {
  return apiFetch<{
    data?: {
      eligible_sales?: number;
      created?: number;
      skipped?: number;
    };
  }>("/sales-targets/bulk", {
    method: "POST",
    body: JSON.stringify({
      period_year: payload.periodYear,
      period_month: payload.periodMonth,
      metric_code: payload.metricCode,
      target_value: payload.targetValue,
    }),
  });
}

export async function overrideTarget(
  salesId: number,
  payload: {
    periodYear: number;
    periodMonth: number;
    metricCode: string;
    targetValue: string;
  }
) {
  return apiFetch<{ data?: SalesTargetItem }>(`/sales-targets/${salesId}`, {
    method: "PUT",
    body: JSON.stringify({
      period_year: payload.periodYear,
      period_month: payload.periodMonth,
      metric_code: payload.metricCode,
      target_value: payload.targetValue,
    }),
  });
}

export async function createKpiDefinition(payload: {
  periodYear: number;
  periodMonth: number;
  metricCode: string;
  weight: string;
  thresholdAchieved: string;
  thresholdNear: string;
}) {
  return apiFetch<{ data?: KpiDefinitionItem }>("/kpi-definitions", {
    method: "POST",
    body: JSON.stringify({
      period_year: payload.periodYear,
      period_month: payload.periodMonth,
      metric_code: payload.metricCode,
      weight: payload.weight,
      threshold_achieved: payload.thresholdAchieved,
      threshold_near: payload.thresholdNear,
    }),
  });
}

export async function deactivateKpiDefinition(id: number) {
  return apiFetch<{ data?: KpiDefinitionItem }>(`/kpi-definitions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      is_active: false,
    }),
  });
}

export async function triggerRecompute(payload: { periodYear: number; periodMonth: number }) {
  return apiFetch<{ data?: KpiJobItem }>("/kpi/recompute", {
    method: "POST",
    body: JSON.stringify({
      period_year: payload.periodYear,
      period_month: payload.periodMonth,
    }),
  });
}

export const targetKeys = {
  all: ["target"] as const,
  ranking: (periodYear: number, periodMonth: number) =>
    [...targetKeys.all, "ranking", periodYear, periodMonth] as const,
  salesTargets: (periodYear: number, periodMonth: number) =>
    [...targetKeys.all, "sales-targets", periodYear, periodMonth] as const,
  definitions: (periodYear: number, periodMonth: number) =>
    [...targetKeys.all, "kpi-definitions", periodYear, periodMonth] as const,
};

export function useKpiRankingQuery(periodYear: number, periodMonth: number, enabled = true) {
  return useQuery<KpiRankingItem[]>({
    queryKey: targetKeys.ranking(periodYear, periodMonth),
    queryFn: () => getKpiRankingWithFallback(periodYear, periodMonth),
    enabled,
  });
}

export function useSalesTargetsQuery(periodYear: number, periodMonth: number, enabled = true) {
  return useQuery<SalesTargetItem[]>({
    queryKey: targetKeys.salesTargets(periodYear, periodMonth),
    queryFn: () => getSalesTargets(periodYear, periodMonth),
    enabled,
  });
}

export function useKpiDefinitionsQuery(periodYear: number, periodMonth: number, enabled = true) {
  return useQuery<KpiDefinitionItem[]>({
    queryKey: targetKeys.definitions(periodYear, periodMonth),
    queryFn: () => getKpiDefinitions(periodYear, periodMonth),
    enabled,
  });
}

export function useBulkSetTargetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bulkSetTarget,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: targetKeys.all });
    },
  });
}

export function useOverrideTargetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      salesId: number;
      payload: { periodYear: number; periodMonth: number; metricCode: string; targetValue: string };
    }) => overrideTarget(vars.salesId, vars.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: targetKeys.all });
    },
  });
}

export function useCreateKpiDefinitionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createKpiDefinition,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: targetKeys.all });
    },
  });
}

export function useDeactivateKpiDefinitionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deactivateKpiDefinition(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: targetKeys.all });
    },
  });
}

export function useTriggerRecomputeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerRecompute,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: targetKeys.all });
    },
  });
}

export function useCheckKpiJobMutation() {
  return useMutation({
    mutationFn: (jobId: number) => getKpiJob(jobId),
  });
}
