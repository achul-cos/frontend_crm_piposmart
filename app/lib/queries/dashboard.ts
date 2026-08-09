"use client";

import { useQuery } from "@tanstack/react-query";
import {
  authFetchJson,
  fetchClosings,
  fetchCustomerInteractions,
  fetchOwners,
  fetchTrainings,
  getLeadsWithTotal,
  getProfile,
  type ClosingItem,
  type InteractionItem,
  type TrainingItem,
  type UserResponse,
} from "@/app/lib/api";
import type { KpiRankingItem, TeamMemberItem } from "@/app/page";
// Note: these two interfaces are declared in app/page.tsx (not moved here to keep this migration
// scoped) and imported type-only, so there is no runtime circular dependency.

const REFRESH_INTERVAL_MS = 15000;

// ─── Profile ────────────────────────────────────────────────────────────────

export function useProfileQuery() {
  return useQuery<UserResponse>({
    queryKey: ["dashboard", "profile"],
    queryFn: () => getProfile(),
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

// ─── Core dashboard counts (owners / leads / closings / interactions / trainings) ──

export interface DashboardCounts {
  ownerTotal: number;
  leadTotal: number;
  closings: ClosingItem[];
  closingTotal: number;
  interactions: InteractionItem[];
  interactionTotal: number;
  trainings: TrainingItem[];
  trainingTotal: number;
}

async function fetchDashboardCounts(): Promise<DashboardCounts> {
  const [ownerResponse, leadResponse, closingResponse, interactionResponse, trainingResponse] =
    await Promise.all([
      fetchOwners({ page: 1, limit: 1 }),
      getLeadsWithTotal({ page: 1, limit: 1 }),
      fetchClosings({ page: 1, limit: 10, sort: "-closed_at" }),
      fetchCustomerInteractions({ page: 1, limit: 10, sort: "-interaction_at" }),
      fetchTrainings({ page: 1, limit: 10, sort: "-scheduled_at" }),
    ]);

  return {
    ownerTotal: ownerResponse.data.pagination.total || 0,
    leadTotal: leadResponse.total || 0,
    closings: closingResponse.items || [],
    closingTotal: closingResponse.pagination?.total || 0,
    interactions: interactionResponse.items || [],
    interactionTotal: interactionResponse.pagination?.total || 0,
    trainings: trainingResponse.items || [],
    trainingTotal: trainingResponse.pagination?.total || 0,
  };
}

export function useDashboardCountsQuery() {
  return useQuery<DashboardCounts>({
    queryKey: ["dashboard", "counts"],
    queryFn: fetchDashboardCounts,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

// ─── Sales team (with /users?role=SALES fallback) ──────────────────────────

async function fetchSalesTeam(): Promise<TeamMemberItem[]> {
  try {
    const salesRes = await authFetchJson<{ data?: TeamMemberItem[] | { items?: TeamMemberItem[] } }>("/sales");
    return Array.isArray(salesRes.data) ? salesRes.data : salesRes.data?.items || [];
  } catch {
    try {
      const userRes = await authFetchJson<{ data?: TeamMemberItem[] | { items?: TeamMemberItem[] } }>("/users?role=SALES");
      return Array.isArray(userRes.data) ? userRes.data : userRes.data?.items || [];
    } catch {
      return [];
    }
  }
}

export function useSalesTeamQuery() {
  return useQuery<TeamMemberItem[]>({
    queryKey: ["dashboard", "salesTeam"],
    queryFn: fetchSalesTeam,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

// ─── Supervisor team (with /users?role=SUPERVISOR fallback) ───────────────

async function fetchSupervisorTeam(): Promise<TeamMemberItem[]> {
  try {
    const spvRes = await authFetchJson<{ data?: TeamMemberItem[] | { items?: TeamMemberItem[] } }>("/supervisors");
    return Array.isArray(spvRes.data) ? spvRes.data : spvRes.data?.items || [];
  } catch {
    try {
      const userRes = await authFetchJson<{ data?: TeamMemberItem[] | { items?: TeamMemberItem[] } }>("/users?role=SUPERVISOR");
      return Array.isArray(userRes.data) ? userRes.data : userRes.data?.items || [];
    } catch {
      return [];
    }
  }
}

export function useSupervisorTeamQuery() {
  return useQuery<TeamMemberItem[]>({
    queryKey: ["dashboard", "supervisorTeam"],
    queryFn: fetchSupervisorTeam,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

// ─── KPI ranking ────────────────────────────────────────────────────────────

async function fetchKpiRanking(year: number, month: number): Promise<KpiRankingItem[]> {
  try {
    const rankRes = await authFetchJson<{ data?: KpiRankingItem[] | { items?: KpiRankingItem[] } }>(
      `/kpi/ranking?period_year=${year}&period_month=${month}`
    );
    let fetchedRankings = Array.isArray(rankRes.data) ? rankRes.data : rankRes.data?.items || [];

    // Memaksa peringkat menjadi berurutan 1, 2, 3, dst di frontend
    // Mengabaikan hasil seri (tie) dari backend
    fetchedRankings = fetchedRankings.map((r, idx) => ({
      ...r,
      rank_position: idx + 1,
    }));

    // Peringkat kini hanya mengandalkan data real dari API backend.
    // Jika kosong, berarti proses KPI belum dijalankan untuk periode ini.
    return fetchedRankings;
  } catch {
    return [];
  }
}

export function useKpiRankingQuery(year: number, month: number) {
  return useQuery<KpiRankingItem[]>({
    queryKey: ["dashboard", "kpiRanking", year, month],
    queryFn: () => fetchKpiRanking(year, month),
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

// ─── Report cards (/reports/dashboard) ─────────────────────────────────────

export interface DashboardReportCard {
  key: string;
  label: string;
  value: string;
  description: string;
}

async function fetchDashboardReportCards(): Promise<DashboardReportCard[]> {
  try {
    const reportRes = await authFetchJson<{ data?: { cards?: DashboardReportCard[] } }>("/reports/dashboard");
    return reportRes?.data?.cards || [];
  } catch {
    return [];
  }
}

export function useDashboardReportCardsQuery() {
  return useQuery<DashboardReportCard[]>({
    queryKey: ["dashboard", "reportCards"],
    queryFn: fetchDashboardReportCards,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

export function getCardVal(cards: DashboardReportCard[], key: string): string {
  return cards.find((c) => c.key === key)?.value || "0";
}
