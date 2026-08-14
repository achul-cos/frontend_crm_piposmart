"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listGlobalOutlets,
  listOutletSubscriptionStatuses,
  getGlobalOutlet,
  createOutletForOwner,
  updateOutletForOwner,
  restoreOutletForOwner,
  forceDeleteOutletForOwner,
  bulkUpdateOutletsForOwner,
  bulkTrashOutletsForOwner,
  bulkForceDeleteOutletsForOwner,
  listSubscriptionsByOutlet,
  fetchOwnerDetail,
  type OutletOverviewItem,
  type OutletScope,
  type ListGlobalOutletsParams,
  type ListOutletSubscriptionStatusesParams,
  type CreateOutletPayload,
} from "@/app/lib/api";

export const outletKeys = {
  all: ["outlets"] as const,
  overviewLists: () => [...outletKeys.all, "overview-list"] as const,
  overviewList: (scope: OutletScope, params: ListGlobalOutletsParams) =>
    [...outletKeys.overviewLists(), scope, params] as const,
  subscriptionLists: () => [...outletKeys.all, "subscription-list"] as const,
  subscriptionList: (params: ListOutletSubscriptionStatusesParams) =>
    [...outletKeys.subscriptionLists(), params] as const,
  detail: (id: number) => [...outletKeys.all, "detail", id] as const,
  subscriptionsByOutlet: (id: number, params: { page?: number; limit?: number }) =>
    [...outletKeys.all, "subscriptions-by-outlet", id, params] as const,
};

// Owner detail lookup used only to prefill OutletFormModal on edit — kept
// under its own key namespace (not outletKeys.all) since it's owner data,
// not outlet data, and shouldn't be invalidated by outlet mutations.
const ownerDetailForOutletFormKey = (ownerId: number | null | undefined) =>
  ["owners", "detail-for-outlet-form", ownerId] as const;

export function useGlobalOutletsQuery(
  params: ListGlobalOutletsParams,
  scope: OutletScope,
  enabled = true,
) {
  return useQuery({
    queryKey: outletKeys.overviewList(scope, params),
    queryFn: () => listGlobalOutlets(params, scope),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useOutletSubscriptionStatusesQuery(
  params: ListOutletSubscriptionStatusesParams,
  enabled = true,
) {
  return useQuery({
    queryKey: outletKeys.subscriptionList(params),
    queryFn: () => listOutletSubscriptionStatuses(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useGlobalOutletQuery(outletId: number, enabled = true) {
  return useQuery({
    queryKey: outletKeys.detail(outletId),
    queryFn: () => getGlobalOutlet(outletId),
    enabled: enabled && Boolean(outletId),
  });
}

export function useSubscriptionsByOutletQuery(
  outletId: number,
  params: { page?: number; limit?: number } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: outletKeys.subscriptionsByOutlet(outletId, params),
    queryFn: () => listSubscriptionsByOutlet(outletId, params),
    enabled: enabled && Boolean(outletId),
  });
}

export function useOwnerDetailForOutletFormQuery(
  ownerId: number | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ownerDetailForOutletFormKey(ownerId),
    queryFn: () => fetchOwnerDetail(ownerId as number),
    enabled: enabled && Boolean(ownerId),
  });
}

export function useCreateOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ownerId, payload }: { ownerId: number; payload: CreateOutletPayload }) =>
      createOutletForOwner(ownerId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: outletKeys.all }),
  });
}

export function useUpdateOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ownerId,
      outletId,
      payload,
    }: {
      ownerId: number;
      outletId: number;
      payload: Partial<CreateOutletPayload>;
    }) => updateOutletForOwner(ownerId, outletId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: outletKeys.all }),
  });
}

export function useRestoreOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ownerId, outletId }: { ownerId: number; outletId: number }) =>
      restoreOutletForOwner(ownerId, outletId),
    onSuccess: () => qc.invalidateQueries({ queryKey: outletKeys.all }),
  });
}

export function useForceDeleteOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ownerId, outletId }: { ownerId: number; outletId: number }) =>
      forceDeleteOutletForOwner(ownerId, outletId),
    onSuccess: () => qc.invalidateQueries({ queryKey: outletKeys.all }),
  });
}

// Bulk mutation backend hanya expose endpoint owner-scoped
// (`/owners/:owner_id/outlets/bulk*`) — baris terpilih di tabel global bisa
// lintas-owner, jadi dikelompokkan per owner_id lebih dulu di sini, lalu
// dieksekusi satu request per grup. Hasil diagregasi (sukses/gagal) supaya
// kegagalan sebagian owner tidak menyembunyikan sukses sebagian yang lain.
async function runBulkByOwner(
  items: OutletOverviewItem[],
  action: (ownerId: number, ids: number[]) => Promise<unknown>,
): Promise<{ successCount: number; failCount: number }> {
  const groups = new Map<number, number[]>();
  for (const item of items) {
    const ownerId = item.owner.id;
    if (!ownerId) continue;
    if (!groups.has(ownerId)) groups.set(ownerId, []);
    groups.get(ownerId)!.push(item.id);
  }
  let successCount = 0;
  for (const [ownerId, ids] of groups) {
    try {
      await action(ownerId, ids);
      successCount += ids.length;
    } catch {
      // Kegagalan satu grup owner tidak menghentikan grup lain.
    }
  }
  return { successCount, failCount: items.length - successCount };
}

export interface BulkEditOutletFields {
  phone?: string;
  province?: string;
  city?: string;
  address?: string;
}

export function useBulkUpdateOutletsByOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ items, fields }: { items: OutletOverviewItem[]; fields: BulkEditOutletFields }) =>
      runBulkByOwner(items, (ownerId, ids) =>
        bulkUpdateOutletsForOwner(
          ownerId,
          ids.map((id) => ({ id, ...fields })),
        ),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: outletKeys.all }),
  });
}

export function useBulkTrashOutletsByOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: OutletOverviewItem[]) =>
      runBulkByOwner(items, (ownerId, ids) => bulkTrashOutletsForOwner(ownerId, ids)),
    onSuccess: () => qc.invalidateQueries({ queryKey: outletKeys.all }),
  });
}

export function useBulkForceDeleteOutletsByOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: OutletOverviewItem[]) =>
      runBulkByOwner(items, (ownerId, ids) => bulkForceDeleteOutletsForOwner(ownerId, ids)),
    onSuccess: () => qc.invalidateQueries({ queryKey: outletKeys.all }),
  });
}
