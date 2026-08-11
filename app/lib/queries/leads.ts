"use client";

// TanStack Query key factory + hooks for the app/menu/lead/** module. Wraps the existing typed
// fetch functions in app/lib/api.ts — this file owns no fetch logic of its own, only caching,
// invalidation and loading-state plumbing that replaces the old sessionCache/useCachedQuery
// pattern for this module.

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import {
  getLeadsWithTotal,
  getLead,
  createLead,
  createLeadClosing,
  createInteraction,
  getLeadInteractions,
  getLeadTrainings,
  getLeadStageHistory,
  getLeadClosings,
  getAssignmentHistory,
  scheduleTraining,
  assignSalesToLead,
  bulkAssignSalesToLeads,
  assignSupervisorToLead,
  bulkAssignSupervisorToLeads,
  releaseLead,
  markInvalidLead,
  bulkReleaseLeads,
  getSalesList,
  getSupervisorList,
  getProfile,
  fetchOwners,
  createOwner,
  softDeleteOwner,
  bulkSoftDeleteOwners,
  restoreOwner,
  hardDeleteOwner,
  bulkForceDeleteOwners,
  updateOwner,
  type LeadListParams,
  type BackendLead,
  type CreateLeadRequest,
  type CreateInteractionRequest,
  type CreateClosingRequest,
  type ScheduleTrainingRequest,
  type OwnerListParams,
} from "@/app/lib/api";

export const leadKeys = {
  all: ["leads"] as const,
  list: (params: LeadListParams) => [...leadKeys.all, "list", params] as const,
  detail: (id: number | string) => [...leadKeys.all, "detail", id] as const,
  interactions: (id: number | string) => [...leadKeys.all, "interactions", id] as const,
  trainings: (id: number | string) => [...leadKeys.all, "trainings", id] as const,
  stageHistory: (id: number | string) => [...leadKeys.all, "stageHistory", id] as const,
  closings: (id: number | string) => [...leadKeys.all, "closings", id] as const,
  assignmentHistory: (id: number | string) => [...leadKeys.all, "assignmentHistory", id] as const,
};

export const ownerTrashKeys = {
  all: ["owners", "trash"] as const,
  list: (params: OwnerListParams) => [...ownerTrashKeys.all, "list", params] as const,
};

// The main /menu/owner-outlet list. Kept under its own "owners"/"list" branch (sibling to
// ownerTrashKeys' "owners"/"trash" branch) so invalidating ownerKeys.all — the root "owners" key —
// still covers trash too, since React Query invalidation matches by key prefix.
export const ownerKeys = {
  all: ["owners"] as const,
  list: (params: OwnerListParams) => [...ownerKeys.all, "list", params] as const,
};

export const salesKeys = {
  all: ["sales"] as const,
  list: () => [...salesKeys.all, "list"] as const,
};

export const supervisorKeys = {
  all: ["supervisors"] as const,
  list: () => [...supervisorKeys.all, "list"] as const,
};

export const profileKeys = {
  me: ["profile", "me"] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────

export function useLeadsQuery(params: LeadListParams, enabled = true) {
  return useQuery({
    queryKey: leadKeys.list(params),
    queryFn: () => getLeadsWithTotal(params),
    enabled,
  });
}

export function useLeadQuery(id: number | string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: leadKeys.detail(id ?? "unknown"),
    queryFn: () => getLead(Number(id)),
    enabled: enabled && id !== null && id !== undefined,
  });
}

export function useLeadInteractionsQuery(id: number | string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: leadKeys.interactions(id ?? "unknown"),
    queryFn: () => getLeadInteractions(Number(id)),
    enabled: enabled && id !== null && id !== undefined,
  });
}

export function useLeadTrainingsQuery(id: number | string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: leadKeys.trainings(id ?? "unknown"),
    queryFn: () => getLeadTrainings(Number(id)),
    enabled: enabled && id !== null && id !== undefined,
  });
}

export function useLeadStageHistoryQuery(id: number | string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: leadKeys.stageHistory(id ?? "unknown"),
    queryFn: () => getLeadStageHistory(Number(id)),
    enabled: enabled && id !== null && id !== undefined,
  });
}

export function useLeadClosingsQuery(id: number | string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: leadKeys.closings(id ?? "unknown"),
    queryFn: () => getLeadClosings(Number(id)),
    enabled: enabled && id !== null && id !== undefined,
  });
}

export function useLeadAssignmentHistoryQuery(id: number | string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: leadKeys.assignmentHistory(id ?? "unknown"),
    queryFn: () => getAssignmentHistory(Number(id)),
    enabled: enabled && id !== null && id !== undefined,
  });
}

export function useOwnerTrashQuery(params: OwnerListParams, enabled = true) {
  return useQuery({
    queryKey: ownerTrashKeys.list(params),
    queryFn: () => fetchOwners(params),
    enabled,
  });
}

export function useOwnersQuery(params: OwnerListParams, enabled = true) {
  return useQuery({
    queryKey: ownerKeys.list(params),
    queryFn: () => fetchOwners(params),
    enabled,
  });
}

export function useSalesListQuery(enabled = true) {
  return useQuery({
    queryKey: salesKeys.list(),
    queryFn: () => getSalesList(),
    enabled,
  });
}

export function useSupervisorListQuery(enabled = true) {
  return useQuery({
    queryKey: supervisorKeys.list(),
    queryFn: () => getSupervisorList(),
    enabled,
  });
}

export function useProfileQuery(enabled = true) {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: () => getProfile(),
    enabled,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeadRequest) => createLead(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useCreateLeadClosing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, data }: { leadId: number; data: CreateClosingRequest }) =>
      createLeadClosing(leadId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
      qc.invalidateQueries({ queryKey: leadKeys.closings(variables.leadId) });
    },
  });
}

export function useCreateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, data }: { leadId: number; data: CreateInteractionRequest }) =>
      createInteraction(leadId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
      qc.invalidateQueries({ queryKey: leadKeys.interactions(variables.leadId) });
    },
  });
}

export function useScheduleTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, data }: { leadId: number; data: ScheduleTrainingRequest }) =>
      scheduleTraining(leadId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
      qc.invalidateQueries({ queryKey: leadKeys.trainings(variables.leadId) });
    },
  });
}

export function useAssignSalesToLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, salesId }: { leadId: number; salesId: number }) =>
      assignSalesToLead(leadId, salesId),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useBulkAssignSalesToLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadIds, salesId }: { leadIds: number[]; salesId: number }) =>
      bulkAssignSalesToLeads(leadIds, salesId),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useAssignSupervisorToLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, supervisorId }: { leadId: number; supervisorId: number }) =>
      assignSupervisorToLead(leadId, supervisorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useBulkAssignSupervisorToLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadIds, supervisorId }: { leadIds: number[]; supervisorId: number }) =>
      bulkAssignSupervisorToLeads(leadIds, supervisorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useReleaseLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, reason }: { leadId: number; reason?: string }) =>
      releaseLead(leadId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useMarkInvalidLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, reason }: { leadId: number; reason?: string }) =>
      markInvalidLead(leadId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useBulkReleaseLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadIds, reason }: { leadIds: number[]; reason: string }) =>
      bulkReleaseLeads(leadIds, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useCreateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof createOwner>[0]) => createOwner(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ownerKeys.all }),
  });
}

export function useUpdateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ownerId, data }: { ownerId: number; data: Parameters<typeof updateOwner>[1] }) =>
      updateOwner(ownerId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
      qc.invalidateQueries({ queryKey: ownerKeys.all });
    },
  });
}

export function useSoftDeleteOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ownerId: number) => softDeleteOwner(ownerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
      qc.invalidateQueries({ queryKey: ownerKeys.all });
    },
  });
}

export function useBulkSoftDeleteOwners() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ownerIds: number[]) => bulkSoftDeleteOwners(ownerIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
      qc.invalidateQueries({ queryKey: ownerKeys.all });
    },
  });
}

export function useRestoreOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ownerId: number) => restoreOwner(ownerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all });
      qc.invalidateQueries({ queryKey: ownerKeys.all });
    },
  });
}

export function useHardDeleteOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ownerId: number) => hardDeleteOwner(ownerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ownerKeys.all }),
  });
}

export function useBulkForceDeleteOwners() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ownerIds: number[]) => bulkForceDeleteOwners(ownerIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ownerKeys.all }),
  });
}
