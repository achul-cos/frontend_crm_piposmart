"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignPartnerPic,
  createPartner,
  createPartnerInteraction,
  createPartnerReferral,
  deactivatePartner,
  getActivePartnerAssignment,
  getCatalogPackages,
  getCatalogPlans,
  getLeads,
  getPartner,
  getPartnerActivity,
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
  type AssignPartnerPicPayload,
  type CreatePartnerInteractionPayload,
  type CreatePartnerPayload,
  type CreatePartnerReferralPayload,
  type PartnerCommissionListParams,
  type PartnerCommissionRuleListParams,
  type PartnerInteractionListParams,
  type PartnerListParams,
  type UpdatePartnerPayload,
} from "@/app/lib/api";

// ─── Query key factories ────────────────────────────────────────────────

export const partnerTypeKeys = {
  all: ["partnerTypes"] as const,
  list: () => [...partnerTypeKeys.all, "list"] as const,
  detail: (id: number) => [...partnerTypeKeys.all, "detail", id] as const,
  commissionRules: (id: number, params: PartnerCommissionRuleListParams = {}) =>
    [...partnerTypeKeys.all, "commissionRules", id, params] as const,
  commissionRule: (typeId: number, ruleId: number) =>
    [...partnerTypeKeys.all, "commissionRule", typeId, ruleId] as const,
};

export const partnerKeys = {
  all: ["partners"] as const,
  list: (params: PartnerListParams) => [...partnerKeys.all, "list", params] as const,
  detail: (id: number) => [...partnerKeys.all, "detail", id] as const,
  activeAssignment: (id: number) => [...partnerKeys.all, "activeAssignment", id] as const,
  assignments: (id: number) => [...partnerKeys.all, "assignments", id] as const,
  interactions: (id: number, params: PartnerInteractionListParams = {}) =>
    [...partnerKeys.all, "interactions", id, params] as const,
  referrals: (id: number) => [...partnerKeys.all, "referrals", id] as const,
  commissions: (id: number, params: PartnerCommissionListParams = {}) =>
    [...partnerKeys.all, "commissions", id, params] as const,
  activity: (id: number, month?: string) => [...partnerKeys.all, "activity", id, month] as const,
};

export const catalogKeys = {
  packages: ["catalogPackages"] as const,
  plans: (packageId?: number) => ["catalogPlans", packageId] as const,
};

export const profileKeys = {
  self: ["profile"] as const,
};

export const leadKeys = {
  all: ["leads"] as const,
};

export const salesUserKeys = {
  all: ["users", "sales"] as const,
};

// ─── Partner types ──────────────────────────────────────────────────────

export function usePartnerTypesQuery(enabled = true) {
  return useQuery({
    queryKey: partnerTypeKeys.list(),
    queryFn: () => listPartnerTypes(),
    enabled,
  });
}

export function usePartnerTypeQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: partnerTypeKeys.detail(id),
    queryFn: () => getPartnerType(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function usePartnerTypeCommissionRulesQuery(
  id: number,
  params: PartnerCommissionRuleListParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: partnerTypeKeys.commissionRules(id, params),
    queryFn: () => listPartnerTypeCommissionRules(id, params),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

// ─── Partners ───────────────────────────────────────────────────────────

export function usePartnersQuery(params: PartnerListParams, enabled = true) {
  return useQuery({
    queryKey: partnerKeys.list(params),
    queryFn: () => listPartners(params),
    enabled,
  });
}

export function usePartnerQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: partnerKeys.detail(id),
    queryFn: () => getPartner(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function useCreatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePartnerPayload) => createPartner(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.all }),
  });
}

export function useUpdatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdatePartnerPayload }) =>
      updatePartner(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: partnerKeys.all });
      qc.invalidateQueries({ queryKey: partnerKeys.detail(variables.id) });
    },
  });
}

export function useDeactivatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deactivatePartner(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.all }),
  });
}

// ─── Partner PIC assignment ─────────────────────────────────────────────

export function useActivePartnerAssignmentQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: partnerKeys.activeAssignment(id),
    queryFn: () => getActivePartnerAssignment(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function usePartnerAssignmentsQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: partnerKeys.assignments(id),
    queryFn: () => listPartnerAssignments(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function useAssignPartnerPic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AssignPartnerPicPayload }) =>
      assignPartnerPic(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: partnerKeys.activeAssignment(variables.id) });
      qc.invalidateQueries({ queryKey: partnerKeys.assignments(variables.id) });
    },
  });
}

export function useReleasePartnerPic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => releasePartnerPic(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: partnerKeys.activeAssignment(id) });
      qc.invalidateQueries({ queryKey: partnerKeys.assignments(id) });
    },
  });
}

// ─── Partner interactions / referrals / commissions / activity ─────────

export function usePartnerInteractionsQuery(
  id: number,
  params: PartnerInteractionListParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: partnerKeys.interactions(id, params),
    queryFn: () => listPartnerInteractions(id, params),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function useCreatePartnerInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreatePartnerInteractionPayload }) =>
      createPartnerInteraction(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: partnerKeys.interactions(variables.id) });
    },
  });
}

export function usePartnerReferralsQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: partnerKeys.referrals(id),
    queryFn: () => listPartnerReferrals(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function useCreatePartnerReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreatePartnerReferralPayload }) =>
      createPartnerReferral(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: partnerKeys.referrals(variables.id) });
    },
  });
}

export function usePartnerCommissionsQuery(
  id: number,
  params: PartnerCommissionListParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: partnerKeys.commissions(id, params),
    queryFn: () => listPartnerCommissions(id, params),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

export function useSyncPartnerCommissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => syncPartnerCommissions(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: partnerKeys.commissions(id) });
    },
  });
}

export function usePartnerActivityQuery(id: number, month: string, enabled = true) {
  return useQuery({
    queryKey: partnerKeys.activity(id, month),
    queryFn: () => getPartnerActivity(id, month),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}

// ─── Partner type commission rule detail (jenis-mitra detail page) ─────

export function usePartnerTypeCommissionRuleQuery(
  typeId: number,
  ruleId: number,
  enabled = true,
) {
  return useQuery({
    queryKey: partnerTypeKeys.commissionRule(typeId, ruleId),
    queryFn: () => getPartnerTypeCommissionRule(typeId, ruleId),
    enabled: enabled && Number.isFinite(typeId) && typeId > 0 && Number.isFinite(ruleId) && ruleId > 0,
  });
}

// ─── Catalog (packages / plans) ─────────────────────────────────────────

export function useCatalogPackagesQuery(enabled = true) {
  return useQuery({
    queryKey: catalogKeys.packages,
    queryFn: () => getCatalogPackages(),
    enabled,
  });
}

export function useCatalogPlansQuery(packageId?: number, enabled = true) {
  return useQuery({
    queryKey: catalogKeys.plans(packageId),
    queryFn: () => getCatalogPlans(packageId),
    enabled,
  });
}

// ─── Jenis Mitra detail page bundle ─────────────────────────────────────
// The jenis-mitra detail page needs the partner type, its commission rules
// (each enriched with a per-rule detail fetch, falling back to the list item
// on failure), and the catalog packages/plans — all as one coherent snapshot.
// Kept as a single query (rather than several independent ones) so the page
// keeps its original "load everything together" semantics.

export function usePartnerTypeDetailBundleQuery(partnerTypeId: number, enabled = true) {
  return useQuery({
    queryKey: [...partnerTypeKeys.detail(partnerTypeId), "bundle"] as const,
    queryFn: async () => {
      const [detail, ruleList, packageList, planList] = await Promise.all([
        getPartnerType(partnerTypeId),
        listPartnerTypeCommissionRules(partnerTypeId),
        getCatalogPackages().catch(() => []),
        getCatalogPlans().catch(() => []),
      ]);

      const detailedRules = await Promise.all(
        (ruleList.items || []).map(async (rule) => {
          try {
            return await getPartnerTypeCommissionRule(partnerTypeId, rule.id);
          } catch {
            return rule;
          }
        }),
      );

      return {
        partnerType: detail,
        rules: detailedRules,
        packages: packageList,
        plans: planList,
      };
    },
    enabled: enabled && Number.isFinite(partnerTypeId) && partnerTypeId > 0,
  });
}

// ─── Shared lookups used by the detail page ─────────────────────────────

export function useProfileQuery(enabled = true) {
  return useQuery({
    queryKey: profileKeys.self,
    queryFn: () => getProfile(),
    enabled,
    retry: false,
  });
}

export function useLeadsQuery(enabled = true) {
  return useQuery({
    queryKey: leadKeys.all,
    queryFn: () => getLeads(),
    enabled,
  });
}

export function useSalesListQuery(enabled = true) {
  return useQuery({
    queryKey: salesUserKeys.all,
    queryFn: () => getSalesList(),
    enabled,
  });
}
