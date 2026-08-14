"use client";

import { useMutation, useQuery, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";
import {
  assignPartnerPic,
  createPartner,
  createPartnerInteraction,
  createPartnerReferral,
  createPartnerType,
  createPartnerTypeCommissionRule,
  deactivatePartner,
  deactivatePartnerTypeCommissionRule,
  deletePartnerType,
  getActivePartnerAssignment,
  getCatalogPackages,
  getCatalogPlans,
  getLeads,
  getPartner,
  getPartnerType,
  getPartnerTypeCommissionRule,
  getProfile,
  getSalesList,
  listPartnerAssignments,
  listPartnerCommissions,
  listPartnerInteractions,
  listPartnerReferrals,
  listPartnerTypeCommissionRules,
  listPartnerTypes,
  listPartners,
  releasePartnerPic,
  syncPartnerCommissions,
  updatePartner,
  updatePartnerType,
  type AssignPartnerPicPayload,
  type BackendLead,
  type CatalogPackage,
  type CatalogPlan,
  type CreatePartnerCommissionRulePayload,
  type CreatePartnerInteractionPayload,
  type CreatePartnerPayload,
  type CreatePartnerReferralPayload,
  type CreatePartnerTypePayload,
  type PartnerAssignmentItem,
  type PartnerAssignmentListData,
  type PartnerCommissionListData,
  type PartnerCommissionListParams,
  type PartnerCommissionRuleItem,
  type PartnerCommissionRuleListParams,
  type PartnerInteractionItem,
  type PartnerInteractionListData,
  type PartnerInteractionListParams,
  type PartnerItem,
  type PartnerListData,
  type PartnerListParams,
  type PartnerReferralItem,
  type PartnerReferralListData,
  type PartnerTypeItem,
  type PartnerTypeListData,
  type SyncPartnerCommissionsData,
  type UpdatePartnerPayload,
  type UpdatePartnerTypePayload,
  type UserResponse,
} from "@/app/lib/api";

// Query key factory for the "kelolaan-mitra" (partners / partner types) domain.
export const mitraKeys = {
  all: ["mitra"] as const,
  profile: () => [...mitraKeys.all, "profile"] as const,
  salesList: () => [...mitraKeys.all, "sales-list"] as const,
  leads: () => [...mitraKeys.all, "leads"] as const,
  catalogPackages: () => [...mitraKeys.all, "catalog", "packages"] as const,
  catalogPlans: () => [...mitraKeys.all, "catalog", "plans"] as const,
  partners: () => [...mitraKeys.all, "partners"] as const,
  partnerList: (params: PartnerListParams) => [...mitraKeys.partners(), "list", params] as const,
  partnerDetail: (id: number) => [...mitraKeys.partners(), "detail", id] as const,
  partnerAssignmentActive: (id: number) => [...mitraKeys.partners(), id, "assignment-active"] as const,
  partnerAssignments: (id: number) => [...mitraKeys.partners(), id, "assignments"] as const,
  partnerInteractions: (id: number, params: PartnerInteractionListParams) =>
    [...mitraKeys.partners(), id, "interactions", params] as const,
  partnerReferrals: (id: number) => [...mitraKeys.partners(), id, "referrals"] as const,
  partnerCommissions: (id: number, params: PartnerCommissionListParams) =>
    [...mitraKeys.partners(), id, "commissions", params] as const,
  types: () => [...mitraKeys.all, "types"] as const,
  typeList: () => [...mitraKeys.types(), "list"] as const,
  typeDetail: (id: number) => [...mitraKeys.types(), "detail", id] as const,
  typeRules: (id: number, params: PartnerCommissionRuleListParams = {}) =>
    [...mitraKeys.types(), id, "rules", params] as const,
  typeRuleDetail: (typeId: number, ruleId: number) => [...mitraKeys.types(), typeId, "rules", ruleId] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useMitraProfileQuery(enabled = true) {
  return useQuery<UserResponse>({
    queryKey: mitraKeys.profile(),
    queryFn: () => getProfile(),
    enabled,
  });
}

export function useMitraSalesListQuery(enabled = true) {
  return useQuery<UserResponse[]>({
    queryKey: mitraKeys.salesList(),
    queryFn: () => getSalesList(),
    enabled,
  });
}

export function useMitraLeadsQuery(enabled = true) {
  return useQuery<BackendLead[]>({
    queryKey: mitraKeys.leads(),
    queryFn: () => getLeads(),
    enabled,
  });
}

export function useCatalogPackagesQuery(enabled = true) {
  return useQuery<CatalogPackage[]>({
    queryKey: mitraKeys.catalogPackages(),
    queryFn: () => getCatalogPackages(),
    enabled,
  });
}

export function useCatalogPlansQuery(enabled = true) {
  return useQuery<CatalogPlan[]>({
    queryKey: mitraKeys.catalogPlans(),
    queryFn: () => getCatalogPlans(),
    enabled,
  });
}

export function usePartnerListQuery(params: PartnerListParams, enabled = true) {
  return useQuery<PartnerListData>({
    queryKey: mitraKeys.partnerList(params),
    queryFn: () => listPartners(params),
    enabled,
  });
}

export function usePartnerDetailQuery(partnerId: number, enabled = true) {
  return useQuery<PartnerItem>({
    queryKey: mitraKeys.partnerDetail(partnerId),
    queryFn: () => getPartner(partnerId),
    enabled: enabled && Number.isFinite(partnerId) && partnerId > 0,
  });
}

export function usePartnerActiveAssignmentQuery(partnerId: number, enabled = true) {
  return useQuery<PartnerAssignmentItem | null>({
    queryKey: mitraKeys.partnerAssignmentActive(partnerId),
    queryFn: () => getActivePartnerAssignment(partnerId),
    enabled: enabled && Number.isFinite(partnerId) && partnerId > 0,
  });
}

export function usePartnerAssignmentsQuery(partnerId: number, enabled = true) {
  return useQuery<PartnerAssignmentListData>({
    queryKey: mitraKeys.partnerAssignments(partnerId),
    queryFn: () => listPartnerAssignments(partnerId),
    enabled: enabled && Number.isFinite(partnerId) && partnerId > 0,
  });
}

export function usePartnerInteractionsQuery(
  partnerId: number,
  params: PartnerInteractionListParams = {},
  enabled = true,
) {
  return useQuery<PartnerInteractionListData>({
    queryKey: mitraKeys.partnerInteractions(partnerId, params),
    queryFn: () => listPartnerInteractions(partnerId, params),
    enabled: enabled && Number.isFinite(partnerId) && partnerId > 0,
  });
}

export function usePartnerReferralsQuery(partnerId: number, enabled = true) {
  return useQuery<PartnerReferralListData>({
    queryKey: mitraKeys.partnerReferrals(partnerId),
    queryFn: () => listPartnerReferrals(partnerId),
    enabled: enabled && Number.isFinite(partnerId) && partnerId > 0,
  });
}

export function usePartnerCommissionsQuery(
  partnerId: number,
  params: PartnerCommissionListParams = {},
  enabled = true,
) {
  return useQuery<PartnerCommissionListData>({
    queryKey: mitraKeys.partnerCommissions(partnerId, params),
    queryFn: () => listPartnerCommissions(partnerId, params),
    enabled: enabled && Number.isFinite(partnerId) && partnerId > 0,
  });
}

export function usePartnerTypeListQuery(enabled = true) {
  return useQuery<PartnerTypeListData>({
    queryKey: mitraKeys.typeList(),
    queryFn: () => listPartnerTypes(),
    enabled,
  });
}

export function usePartnerTypeDetailQuery(typeId: number | null, enabled = true) {
  return useQuery<PartnerTypeItem>({
    queryKey: mitraKeys.typeDetail(typeId ?? 0),
    queryFn: () => getPartnerType(typeId as number),
    enabled: enabled && Boolean(typeId),
  });
}

export function usePartnerTypeRulesQuery(
  typeId: number | null,
  params: PartnerCommissionRuleListParams = {},
  enabled = true,
) {
  return useQuery<{ items: PartnerCommissionRuleItem[] }>({
    queryKey: mitraKeys.typeRules(typeId ?? 0, params),
    queryFn: () => listPartnerTypeCommissionRules(typeId as number, params),
    enabled: enabled && Boolean(typeId),
  });
}

// Rules list with each rule "hydrated" via the single-rule detail endpoint (used by
// jenis-mitra pages that display tier breakdowns fetched per-rule).
export function usePartnerTypeRulesDetailedQuery(typeId: number | null, enabled = true) {
  return useQuery<PartnerCommissionRuleItem[]>({
    queryKey: [...mitraKeys.typeRules(typeId ?? 0), "detailed"] as const,
    queryFn: async () => {
      const ruleList = await listPartnerTypeCommissionRules(typeId as number);
      const detailed = await Promise.all(
        ruleList.items.map(async (rule) => {
          try {
            return await getPartnerTypeCommissionRule(typeId as number, rule.id);
          } catch {
            return rule;
          }
        }),
      );
      return detailed;
    },
    enabled: enabled && Boolean(typeId),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

type MutOpts<TData, TVars> = Omit<UseMutationOptions<TData, unknown, TVars>, "mutationFn">;

export function useCreatePartnerMutation(options?: MutOpts<PartnerItem, CreatePartnerPayload>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePartnerPayload) => createPartner(payload),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: mitraKeys.partners() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useUpdatePartnerMutation(
  options?: MutOpts<PartnerItem, { partnerId: number; payload: UpdatePartnerPayload }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ partnerId, payload }: { partnerId: number; payload: UpdatePartnerPayload }) =>
      updatePartner(partnerId, payload),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: mitraKeys.partners() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useDeactivatePartnerMutation(options?: MutOpts<void, number>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partnerId: number) => deactivatePartner(partnerId),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: mitraKeys.partners() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useCreatePartnerTypeMutation(options?: MutOpts<PartnerTypeItem, CreatePartnerTypePayload>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePartnerTypePayload) => createPartnerType(payload),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: mitraKeys.types() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useUpdatePartnerTypeMutation(
  options?: MutOpts<PartnerTypeItem, { typeId: number; payload: UpdatePartnerTypePayload }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ typeId, payload }: { typeId: number; payload: UpdatePartnerTypePayload }) =>
      updatePartnerType(typeId, payload),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: mitraKeys.types() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useDeletePartnerTypeMutation(options?: MutOpts<void, number>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (typeId: number) => deletePartnerType(typeId),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: mitraKeys.types() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useCreatePartnerTypeCommissionRuleMutation(
  options?: MutOpts<
    PartnerCommissionRuleItem,
    { typeId: number; payload: CreatePartnerCommissionRulePayload }
  >,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId,
      payload,
    }: {
      typeId: number;
      payload: CreatePartnerCommissionRulePayload;
    }) => createPartnerTypeCommissionRule(typeId, payload),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: mitraKeys.typeDetail(variables.typeId) });
      queryClient.invalidateQueries({ queryKey: [...mitraKeys.types(), variables.typeId, "rules"] });
      options?.onSuccess?.(data, variables, ...rest);
    },
    ...options,
  });
}

export function useDeactivatePartnerTypeCommissionRuleMutation(
  options?: MutOpts<PartnerCommissionRuleItem, { typeId: number; ruleId: number }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ typeId, ruleId }: { typeId: number; ruleId: number }) =>
      deactivatePartnerTypeCommissionRule(typeId, ruleId),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: mitraKeys.typeDetail(variables.typeId) });
      queryClient.invalidateQueries({ queryKey: [...mitraKeys.types(), variables.typeId, "rules"] });
      options?.onSuccess?.(data, variables, ...rest);
    },
    ...options,
  });
}

export function useAssignPartnerPicMutation(
  options?: MutOpts<PartnerAssignmentItem, { partnerId: number; payload: AssignPartnerPicPayload }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ partnerId, payload }: { partnerId: number; payload: AssignPartnerPicPayload }) =>
      assignPartnerPic(partnerId, payload),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: mitraKeys.partnerAssignmentActive(variables.partnerId) });
      queryClient.invalidateQueries({ queryKey: mitraKeys.partnerAssignments(variables.partnerId) });
      options?.onSuccess?.(data, variables, ...rest);
    },
    ...options,
  });
}

export function useReleasePartnerPicMutation(options?: MutOpts<void, number>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partnerId: number) => releasePartnerPic(partnerId),
    onSuccess: (data, partnerId, ...rest) => {
      queryClient.invalidateQueries({ queryKey: mitraKeys.partnerAssignmentActive(partnerId) });
      queryClient.invalidateQueries({ queryKey: mitraKeys.partnerAssignments(partnerId) });
      options?.onSuccess?.(data, partnerId, ...rest);
    },
    ...options,
  });
}

export function useCreatePartnerInteractionMutation(
  options?: MutOpts<PartnerInteractionItem, { partnerId: number; payload: CreatePartnerInteractionPayload }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      partnerId,
      payload,
    }: {
      partnerId: number;
      payload: CreatePartnerInteractionPayload;
    }) => createPartnerInteraction(partnerId, payload),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: [...mitraKeys.partners(), variables.partnerId, "interactions"] });
      options?.onSuccess?.(data, variables, ...rest);
    },
    ...options,
  });
}

export function useCreatePartnerReferralMutation(
  options?: MutOpts<PartnerReferralItem, { partnerId: number; payload: CreatePartnerReferralPayload }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      partnerId,
      payload,
    }: {
      partnerId: number;
      payload: CreatePartnerReferralPayload;
    }) => createPartnerReferral(partnerId, payload),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: mitraKeys.partnerReferrals(variables.partnerId) });
      options?.onSuccess?.(data, variables, ...rest);
    },
    ...options,
  });
}

export function useSyncPartnerCommissionsMutation(
  options?: MutOpts<SyncPartnerCommissionsData, number>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partnerId: number) => syncPartnerCommissions(partnerId),
    onSuccess: (data, partnerId, ...rest) => {
      queryClient.invalidateQueries({ queryKey: [...mitraKeys.partners(), partnerId, "commissions"] });
      options?.onSuccess?.(data, partnerId, ...rest);
    },
    ...options,
  });
}
