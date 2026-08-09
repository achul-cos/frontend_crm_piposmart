"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetchJson } from "@/app/lib/api";

type ApiListResponse<T> = {
  data?:
    | T[]
    | {
        items?: T[];
        pagination?: {
          page?: number;
          limit?: number;
          total?: number;
        };
      };
};

type ApiSingleResponse<T> = {
  data?: T;
};

export type PartnerType = {
  id?: number;
  code?: string;
  name?: string;
  commission_mode?: string;
  commission_value?: string;
};

export type Partner = {
  id: number;
  code?: string;
  name?: string;
  status?: string;
  phone?: string;
  partner_type?: PartnerType;
  partner_type_id?: number;
};

export type PartnerCommission = {
  id: number;
  code?: string;
  partner_id?: number;
  partner_code?: string;
  referral_id?: number;
  closing_id?: number;
  closing_code?: string;
  commission_mode?: "PERCENTAGE" | "FIXED" | "TIER" | string;
  commission_value?: string;
  base_amount?: string;
  commission_amount?: string;
  currency?: string;
  status?: "PENDING" | "APPROVED" | "PAID" | "CANCELLED" | string;
  commission_rule_id?: number | null;
  tier_ordinal?: number | null;
  approved_at?: string | null;
  paid_at?: string | null;
  cancelled_at?: string | null;
  note?: string;
  approved_by?: {
    id?: number;
    name?: string;
  };
  paid_by?: {
    id?: number;
    name?: string;
  };
};

export type SyncCommissionResponse = {
  created?: number;
  items?: PartnerCommission[];
};

export type PartnerPayout = {
  id: number;
  code?: string;
  partner_id?: number;
  total_amount?: string;
  currency?: string;
  status?: "PENDING" | "PAID" | "CANCELLED" | string;
  paid_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string;
};

function getListItems<T>(response: ApiListResponse<T>): T[] {
  if (Array.isArray(response.data)) return response.data;
  return response.data?.items || [];
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authFetchJson<T>(path, options);
}

async function listPartnersFn() {
  const response = await apiFetch<ApiListResponse<Partner>>("/partners?page=1&limit=100");
  return getListItems(response);
}

async function listCommissionsFn(partnerId: number) {
  const response = await apiFetch<ApiListResponse<PartnerCommission>>(
    `/partners/${partnerId}/commissions?page=1&limit=100`,
  );
  return getListItems(response);
}

async function listPayoutsFn(partnerId: number) {
  try {
    const response = await apiFetch<ApiListResponse<PartnerPayout>>(
      `/partners/${partnerId}/payouts?page=1&limit=50`,
    );
    return getListItems(response);
  } catch {
    return [];
  }
}

async function syncPartnerCommissionsFn(partnerId: number) {
  const response = await apiFetch<ApiSingleResponse<SyncCommissionResponse>>(
    `/partners/${partnerId}/commissions/sync`,
    { method: "POST" },
  );
  return response.data || { created: 0, items: [] };
}

async function approveCommissionFn(partnerId: number, commissionId: number) {
  const response = await apiFetch<ApiSingleResponse<PartnerCommission>>(
    `/partners/${partnerId}/commissions/${commissionId}/approve`,
    { method: "PATCH" },
  );
  return response.data;
}

async function payCommissionFn(partnerId: number, commissionId: number) {
  const response = await apiFetch<ApiSingleResponse<PartnerCommission>>(
    `/partners/${partnerId}/commissions/${commissionId}/pay`,
    { method: "PATCH" },
  );
  return response.data;
}

async function cancelCommissionFn(partnerId: number, commissionId: number, note: string) {
  const response = await apiFetch<ApiSingleResponse<PartnerCommission>>(
    `/partners/${partnerId}/commissions/${commissionId}/cancel`,
    { method: "PATCH", body: JSON.stringify({ note }) },
  );
  return response.data;
}

async function createPayoutFn(partnerId: number) {
  const response = await apiFetch<ApiSingleResponse<PartnerPayout>>(`/partners/${partnerId}/payouts`, {
    method: "POST",
  });
  return response.data;
}

async function payPayoutFn(partnerId: number, payoutId: number) {
  const response = await apiFetch<ApiSingleResponse<PartnerPayout>>(
    `/partners/${partnerId}/payouts/${payoutId}/pay`,
    { method: "PATCH" },
  );
  return response.data;
}

async function cancelPayoutFn(partnerId: number, payoutId: number) {
  const response = await apiFetch<ApiSingleResponse<PartnerPayout>>(
    `/partners/${partnerId}/payouts/${payoutId}/cancel`,
    { method: "PATCH" },
  );
  return response.data;
}

export const komisiKeys = {
  all: ["komisi"] as const,
  partners: () => [...komisiKeys.all, "partners"] as const,
  commissions: (partnerId: number | null) => [...komisiKeys.all, "commissions", partnerId] as const,
  payouts: (partnerId: number | null) => [...komisiKeys.all, "payouts", partnerId] as const,
};

export function usePartnersQuery() {
  return useQuery({
    queryKey: komisiKeys.partners(),
    queryFn: listPartnersFn,
  });
}

export function usePartnerCommissionsQuery(partnerId: number | null) {
  return useQuery({
    queryKey: komisiKeys.commissions(partnerId),
    queryFn: () => listCommissionsFn(partnerId as number),
    enabled: partnerId != null,
  });
}

export function usePartnerPayoutsQuery(partnerId: number | null) {
  return useQuery({
    queryKey: komisiKeys.payouts(partnerId),
    queryFn: () => listPayoutsFn(partnerId as number),
    enabled: partnerId != null,
  });
}

function useInvalidatePartnerDetail(partnerId: number | null) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: komisiKeys.commissions(partnerId) });
    void queryClient.invalidateQueries({ queryKey: komisiKeys.payouts(partnerId) });
  };
}

export function useSyncPartnerCommissions(partnerId: number | null) {
  const invalidate = useInvalidatePartnerDetail(partnerId);
  return useMutation({
    mutationFn: () => syncPartnerCommissionsFn(partnerId as number),
    onSuccess: invalidate,
  });
}

export function useApproveCommission(partnerId: number | null) {
  const invalidate = useInvalidatePartnerDetail(partnerId);
  return useMutation({
    mutationFn: (commissionId: number) => approveCommissionFn(partnerId as number, commissionId),
    onSuccess: invalidate,
  });
}

export function usePayCommission(partnerId: number | null) {
  const invalidate = useInvalidatePartnerDetail(partnerId);
  return useMutation({
    mutationFn: (commissionId: number) => payCommissionFn(partnerId as number, commissionId),
    onSuccess: invalidate,
  });
}

export function useCancelCommission(partnerId: number | null) {
  const invalidate = useInvalidatePartnerDetail(partnerId);
  return useMutation({
    mutationFn: ({ commissionId, note }: { commissionId: number; note: string }) =>
      cancelCommissionFn(partnerId as number, commissionId, note),
    onSuccess: invalidate,
  });
}

export function useCreatePayout(partnerId: number | null) {
  const invalidate = useInvalidatePartnerDetail(partnerId);
  return useMutation({
    mutationFn: () => createPayoutFn(partnerId as number),
    onSuccess: invalidate,
  });
}

export function usePayPayout(partnerId: number | null) {
  const invalidate = useInvalidatePartnerDetail(partnerId);
  return useMutation({
    mutationFn: (payoutId: number) => payPayoutFn(partnerId as number, payoutId),
    onSuccess: invalidate,
  });
}

export function useCancelPayout(partnerId: number | null) {
  const invalidate = useInvalidatePartnerDetail(partnerId);
  return useMutation({
    mutationFn: (payoutId: number) => cancelPayoutFn(partnerId as number, payoutId),
    onSuccess: invalidate,
  });
}
