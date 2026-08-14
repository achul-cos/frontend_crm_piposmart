"use client";

// React Query layer for app/menu/subscribe/**. Replaces the old sessionCache-based
// `loadSubscriptionData` orchestration in page.tsx with a key-factory + hooks approach.
// Domain types that used to live inline in page.tsx are centralized here so the query
// layer and the UI share one source of truth.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authFetchJson,
  getEligiblePromotions,
  getGlobalOutlet,
  getSubscriptionDetail,
  type CatalogPromotion,
  type OutletDetail,
  type SubscriptionDetailData,
} from "@/app/lib/api";

// ─── Shared response/domain types ──────────────────────────────────────────

export type ApiMeta = {
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
};

export type ApiResponse<T> = {
  data?: T;
  meta?: ApiMeta;
  error?: {
    code?: string;
    message?: string;
  };
};

export type Owner = {
  id?: number;
  code?: string;
  name?: string;
  kode_owner?: string;
  nama_owner?: string;
};

export type Plan = {
  id?: number;
  code?: string;
  name?: string;
};

export type Closing = {
  id?: number;
  code?: string;
};

export type EntityRef = {
  id?: number;
  code?: string;
  name?: string;
};

export type UserBrief = {
  id?: number;
  name?: string;
  role?: string;
};

export type PackageSnapshot = {
  id?: number;
  code?: string;
  name?: string;
  level_order?: number;
};

export type PlanSnapshot = {
  id?: number;
  code?: string;
  name?: string;
  tenure_months?: number;
  duration_days?: number;
  price?: string;
  currency?: string;
};

export type UpgradeContext = {
  effective_start_date?: string;
  original_end_date?: string;
  remaining_days?: number;
  daily_price?: string;
  previous_package?: PackageSnapshot | null;
  previous_plan?: PlanSnapshot | null;
};

export type SubscriptionOrderItem = {
  id: number;
  code?: string;
  owner?: Owner;
  closing?: Closing;
  sales?: UserBrief;
  supervisor?: UserBrief;
  plan?: Plan;
  package?: EntityRef;
  promotion?: {
    id?: number;
    code?: string;
    name?: string;
  };
  // Sprint 15a — order bisa memakai lebih dari satu promotion sekaligus;
  // `promotion` singular dipertahankan untuk kompatibilitas data lama.
  promotions?: {
    id?: number;
    code?: string;
    name?: string;
  }[];
  balance_shortfall_amount?: string | null;
  wallet_transaction_id?: number;
  tenure_months?: number;
  duration_days?: number;
  base_price?: string;
  discount_amount?: string;
  additional_charge?: string;
  final_amount?: string;
  currency?: string;
  order_type?: "NEW" | "UPGRADE" | string;
  source_subscription?: EntityRef | null;
  upgrade?: UpgradeContext | null;
  status?: string;
  purchased_at?: string;
  subscription_start_date?: string;
  external_reference?: string;
  note?: string;
};

export type SubscriptionItem = {
  id: number;
  code?: string;
  owner?: Owner;
  order?: {
    id?: number;
    code?: string;
  };
  plan?: Plan;
  status?: string;
  active_from?: string;
  active_until?: string;
  total_duration_days?: number;
};

export type ReconciliationItem = {
  id: number;
  code?: string;
  order?: {
    id?: number;
    code?: string;
  };
  closing?: {
    id?: number;
    code?: string;
  };
  owner?: Owner;
  status?: string;
  match_type?: string;
  amount_difference?: string;
  admin_tenure_months?: number;
  admin_final_amount?: string;
  note?: string;
  reason?: string;
  confirmed_at?: string;
  created_at?: string;
};

export type SubscriptionPeriodItem = {
  id: number;
  period_index?: number;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  status?: string;
};

export type ReconciliationIssueItem = {
  id: number;
  code?: string;
  order?: {
    id?: number;
    code?: string;
  };
  owner?: Owner;
  issue_type?: string;
  status?: string;
  description?: string;
  detected_at?: string;
  created_at?: string;
};

export type WalletItem = {
  id: number;
  owner_id?: number;
  owner?: Owner;
  balance?: string;
  status?: string;
};

export type SubscriptionOrderDetailResponse = {
  order?: SubscriptionOrderItem;
  subscription?: SubscriptionItem;
  period?: SubscriptionPeriodItem;
  reconciliation?: ReconciliationItem;
  issue?: ReconciliationIssueItem;
};

export type SubscriptionDetailResponse = {
  subscription?: SubscriptionItem;
  order?: SubscriptionOrderItem;
};

export const normalizeList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];

  if (payload && typeof payload === "object") {
    const data = payload as {
      items?: unknown;
      rows?: unknown;
      data?: unknown;
    };

    if (Array.isArray(data.items)) return data.items as T[];
    if (Array.isArray(data.rows)) return data.rows as T[];
    if (Array.isArray(data.data)) return data.data as T[];
  }

  return [];
};

const buildQuery = (params: Record<string, string>) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "Semua") query.set(key, value);
  });

  const text = query.toString();
  return text ? `?${text}` : "";
};

async function fetchJson<T>(path: string, options: RequestInit = {}) {
  return authFetchJson<ApiResponse<T>>(path, options);
}

// ─── Query key factory ──────────────────────────────────────────────────────

export type SubscriptionListFilters = {
  debouncedSearch: string;
  statusFilter: string;
  orderTypeFilter: string;
  purchasedFrom: string;
  purchasedTo: string;
};

export const subscribeKeys = {
  all: ["subscribe"] as const,
  list: (filters: SubscriptionListFilters) =>
    [...subscribeKeys.all, "list", filters] as const,
  orderDetail: (orderId: number) =>
    [...subscribeKeys.all, "order-detail", orderId] as const,
  subscriptionDetail: (subscriptionId: number) =>
    [...subscribeKeys.all, "subscription-detail", subscriptionId] as const,
  eligiblePromotions: (planId: number | null) =>
    [...subscribeKeys.all, "eligible-promotions", planId] as const,
  detailPage: (subscriptionId: number) =>
    [...subscribeKeys.all, "detail-page", subscriptionId] as const,
  outlet: (outletId: number) =>
    [...subscribeKeys.all, "outlet", outletId] as const,
};

// ─── List page: combined Promise.allSettled fetch (orders/subscriptions/... ) ──

export type SubscriptionListData = {
  catalogPlans: Plan[];
  orders: SubscriptionOrderItem[];
  subscriptions: SubscriptionItem[];
  reconciliations: ReconciliationItem[];
  issues: ReconciliationIssueItem[];
  wallets: WalletItem[];
  owners: Owner[];
  errorMessage: string;
};

async function fetchSubscriptionListData(
  filters: SubscriptionListFilters,
): Promise<SubscriptionListData> {
  const { debouncedSearch, statusFilter, orderTypeFilter, purchasedFrom, purchasedTo } =
    filters;

  const orderQuery = buildQuery({
    q: debouncedSearch,
    status: statusFilter,
    order_type: orderTypeFilter === "Semua" ? "" : orderTypeFilter,
    purchased_from: purchasedFrom,
    purchased_to: purchasedTo,
    sort: "-purchased_at",
    page: "1",
    limit: "100",
  });

  const subscriptionQuery = buildQuery({
    q: debouncedSearch,
    sort: "-active_from",
    page: "1",
    limit: "100",
  });

  const reconciliationQuery = buildQuery({
    q: debouncedSearch,
    sort: "-created_at",
    page: "1",
    limit: "100",
  });

  const issueQuery = buildQuery({
    q: debouncedSearch,
    status: "OPEN",
    sort: "-detected_at",
    page: "1",
    limit: "100",
  });

  const walletQuery = buildQuery({
    q: debouncedSearch,
    status: "ACTIVE",
    sort: "-balance",
    page: "1",
    limit: "100",
  });

  const ownersQuery = buildQuery({
    q: debouncedSearch,
    status: "ACTIVE",
    sort: "-created_at",
    page: "1",
    limit: "100",
  });

  const [
    orderResult,
    subscriptionResult,
    reconciliationResult,
    issueResult,
    walletResult,
    ownerResult,
    catalogPlanResult,
  ] = await Promise.allSettled([
    fetchJson<
      SubscriptionOrderItem[] | { items?: SubscriptionOrderItem[]; rows?: SubscriptionOrderItem[] }
    >(`/subscription-orders${orderQuery}`),
    fetchJson<
      SubscriptionItem[] | { items?: SubscriptionItem[]; rows?: SubscriptionItem[] }
    >(`/subscriptions${subscriptionQuery}`),
    fetchJson<
      ReconciliationItem[] | { items?: ReconciliationItem[]; rows?: ReconciliationItem[] }
    >(`/reconciliations${reconciliationQuery}`),
    fetchJson<
      | ReconciliationIssueItem[]
      | { items?: ReconciliationIssueItem[]; rows?: ReconciliationIssueItem[] }
    >(`/reconciliation-issues${issueQuery}`),
    fetchJson<WalletItem[] | { items?: WalletItem[]; rows?: WalletItem[] }>(
      `/wallets${walletQuery}`,
    ),
    fetchJson<Owner[] | { items?: Owner[]; rows?: Owner[] }>(`/owners${ownersQuery}`),
    fetchJson<Plan[] | { items?: Plan[]; rows?: Plan[] }>(`/catalog/plans/all`),
  ]);

  const catalogPlans =
    catalogPlanResult.status === "fulfilled"
      ? normalizeList<Plan>(catalogPlanResult.value.data)
      : [];
  const orders =
    orderResult.status === "fulfilled"
      ? normalizeList<SubscriptionOrderItem>(orderResult.value.data)
      : [];
  const subscriptions =
    subscriptionResult.status === "fulfilled"
      ? normalizeList<SubscriptionItem>(subscriptionResult.value.data)
      : [];
  const reconciliations =
    reconciliationResult.status === "fulfilled"
      ? normalizeList<ReconciliationItem>(reconciliationResult.value.data)
      : [];
  const issues =
    issueResult.status === "fulfilled"
      ? normalizeList<ReconciliationIssueItem>(issueResult.value.data)
      : [];
  const wallets =
    walletResult.status === "fulfilled"
      ? normalizeList<WalletItem>(walletResult.value.data)
      : [];
  const owners =
    ownerResult.status === "fulfilled" ? normalizeList<Owner>(ownerResult.value.data) : [];

  const firstError = [
    orderResult,
    subscriptionResult,
    reconciliationResult,
    issueResult,
    walletResult,
    ownerResult,
  ].find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;

  const errorMessage = firstError
    ? firstError.reason instanceof Error
      ? firstError.reason.message
      : "Sebagian data subscription gagal dimuat."
    : "";

  return {
    catalogPlans,
    orders,
    subscriptions,
    reconciliations,
    issues,
    wallets,
    owners,
    errorMessage,
  };
}

export function useSubscriptionListQuery(filters: SubscriptionListFilters) {
  return useQuery({
    queryKey: subscribeKeys.list(filters),
    queryFn: () => fetchSubscriptionListData(filters),
    placeholderData: keepPreviousData,
  });
}

export type SubscriptionTabKey =
  | "orders"
  | "subscriptions"
  | "reconciliations"
  | "issues";

export type SubscriptionPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SubscriptionSummaryData = {
  totalOrderAmount: number;
  activeSubscriptions: number;
  confirmedReconciliations: number;
  openIssues: number;
};

export type SubscriptionReferenceData = {
  catalogPlans: Plan[];
  wallets: WalletItem[];
  owners: Owner[];
};

export type SubscriptionPageQueryData = {
  orders: SubscriptionOrderItem[];
  subscriptions: SubscriptionItem[];
  reconciliations: ReconciliationItem[];
  issues: ReconciliationIssueItem[];
  pagination: SubscriptionPagination;
  errorMessage: string;
};

function extractPagination(payload: unknown, fallbackLimit = 10): SubscriptionPagination {
  if (payload && typeof payload === "object") {
    const envelope = payload as {
      meta?: ApiMeta;
      data?: {
        meta?: ApiMeta;
        pagination?: ApiMeta;
      };
    };

    const raw =
      envelope.meta ||
      envelope.data?.pagination ||
      envelope.data?.meta || {};

    const page = Number(raw.page || 1);
    const limit = Number(raw.limit || fallbackLimit);
    const total = Number(raw.total || 0);
    const totalPages =
      Number(raw.total_pages || 0) || Math.max(1, Math.ceil(total / Math.max(limit, 1)));

    return { page, limit, total, totalPages };
  }

  return {
    page: 1,
    limit: fallbackLimit,
    total: 0,
    totalPages: 1,
  };
}

export const subscribePageKeys = {
  reference: () => [...subscribeKeys.all, "reference"] as const,
  summary: () => [...subscribeKeys.all, "summary"] as const,
  pagedList: (
    activeTab: SubscriptionTabKey,
    filters: SubscriptionListFilters,
    page: number,
    limit: number,
  ) =>
    [...subscribeKeys.all, "paged-list", activeTab, filters, page, limit] as const,
};

async function fetchSubscriptionReferenceData(): Promise<SubscriptionReferenceData> {
  const [walletResult, ownerResult, catalogPlanResult] = await Promise.allSettled([
    fetchJson<WalletItem[] | { items?: WalletItem[]; rows?: WalletItem[] }>(
      "/wallets/all?status=ACTIVE&sort=-balance",
    ),
    fetchJson<Owner[] | { items?: Owner[]; rows?: Owner[] }>(
      "/owners/all?status=ACTIVE&sort=-created_at",
    ),
    fetchJson<Plan[] | { items?: Plan[]; rows?: Plan[] }>("/catalog/plans/all"),
  ]);

  return {
    catalogPlans:
      catalogPlanResult.status === "fulfilled"
        ? normalizeList<Plan>(catalogPlanResult.value.data)
        : [],
    wallets:
      walletResult.status === "fulfilled"
        ? normalizeList<WalletItem>(walletResult.value.data)
        : [],
    owners:
      ownerResult.status === "fulfilled"
        ? normalizeList<Owner>(ownerResult.value.data)
        : [],
  };
}

async function fetchSubscriptionSummaryData(): Promise<SubscriptionSummaryData> {
  const [orderResult, subscriptionResult, reconciliationResult, issueResult] =
    await Promise.allSettled([
      fetchJson<
        SubscriptionOrderItem[] | { items?: SubscriptionOrderItem[]; rows?: SubscriptionOrderItem[] }
      >("/subscription-orders/all?sort=-purchased_at"),
      fetchJson<
        SubscriptionItem[] | { items?: SubscriptionItem[]; rows?: SubscriptionItem[] }
      >("/subscriptions/all?sort=-active_from"),
      fetchJson<
        ReconciliationItem[] | { items?: ReconciliationItem[]; rows?: ReconciliationItem[] }
      >("/reconciliations/all?sort=-created_at"),
      fetchJson<
        ReconciliationIssueItem[] | { items?: ReconciliationIssueItem[]; rows?: ReconciliationIssueItem[] }
      >("/reconciliation-issues/all?sort=-detected_at"),
    ]);

  const orders =
    orderResult.status === "fulfilled"
      ? normalizeList<SubscriptionOrderItem>(orderResult.value.data)
      : [];
  const subscriptions =
    subscriptionResult.status === "fulfilled"
      ? normalizeList<SubscriptionItem>(subscriptionResult.value.data)
      : [];
  const reconciliations =
    reconciliationResult.status === "fulfilled"
      ? normalizeList<ReconciliationItem>(reconciliationResult.value.data)
      : [];
  const issues =
    issueResult.status === "fulfilled"
      ? normalizeList<ReconciliationIssueItem>(issueResult.value.data)
      : [];

  return {
    totalOrderAmount: orders.reduce(
      (total, item) => total + Number(item.final_amount || 0),
      0,
    ),
    activeSubscriptions: subscriptions.filter(
      (item) => String(item.status || "").toUpperCase() === "ACTIVE",
    ).length,
    confirmedReconciliations: reconciliations.filter((item) =>
      ["CONFIRMED", "PARTIAL_CONFIRM"].includes(
        String(item.status || "").toUpperCase(),
      ),
    ).length,
    openIssues: issues.filter(
      (item) => String(item.status || "").toUpperCase() === "OPEN",
    ).length,
  };
}

async function fetchSubscriptionPageData(params: {
  activeTab: SubscriptionTabKey;
  filters: SubscriptionListFilters;
  page: number;
  limit: number;
}): Promise<SubscriptionPageQueryData> {
  const { activeTab, filters, page, limit } = params;
  const { debouncedSearch, statusFilter, orderTypeFilter, purchasedFrom, purchasedTo } =
    filters;

  if (activeTab === "orders") {
    const query = buildQuery({
      q: debouncedSearch,
      status: statusFilter,
      order_type: orderTypeFilter === "Semua" ? "" : orderTypeFilter,
      purchased_from: purchasedFrom,
      purchased_to: purchasedTo,
      sort: "-purchased_at",
      page: String(page),
      limit: String(limit),
    });
    const response = await fetchJson<
      | SubscriptionOrderItem[]
      | {
          items?: SubscriptionOrderItem[];
          rows?: SubscriptionOrderItem[];
          pagination?: ApiMeta;
          meta?: ApiMeta;
        }
    >(`/subscription-orders${query}`);

    return {
      orders: normalizeList<SubscriptionOrderItem>(response.data),
      subscriptions: [],
      reconciliations: [],
      issues: [],
      pagination: extractPagination(response, limit),
      errorMessage: "",
    };
  }

  if (activeTab === "subscriptions") {
    const query = buildQuery({
      q: debouncedSearch,
      status: statusFilter,
      active_from: purchasedFrom,
      active_to: purchasedTo,
      sort: "-active_from",
      page: String(page),
      limit: String(limit),
    });
    const response = await fetchJson<
      | SubscriptionItem[]
      | {
          items?: SubscriptionItem[];
          rows?: SubscriptionItem[];
          pagination?: ApiMeta;
          meta?: ApiMeta;
        }
    >(`/subscriptions${query}`);

    return {
      orders: [],
      subscriptions: normalizeList<SubscriptionItem>(response.data),
      reconciliations: [],
      issues: [],
      pagination: extractPagination(response, limit),
      errorMessage: "",
    };
  }

  if (activeTab === "reconciliations") {
    const query = buildQuery({
      q: debouncedSearch,
      status: statusFilter,
      sort: "-created_at",
      page: String(page),
      limit: String(limit),
    });
    const response = await fetchJson<
      | ReconciliationItem[]
      | {
          items?: ReconciliationItem[];
          rows?: ReconciliationItem[];
          pagination?: ApiMeta;
          meta?: ApiMeta;
        }
    >(`/reconciliations${query}`);

    return {
      orders: [],
      subscriptions: [],
      reconciliations: normalizeList<ReconciliationItem>(response.data),
      issues: [],
      pagination: extractPagination(response, limit),
      errorMessage: "",
    };
  }

  const query = buildQuery({
    q: debouncedSearch,
    status: statusFilter,
    sort: "-detected_at",
    page: String(page),
    limit: String(limit),
  });
  const response = await fetchJson<
    | ReconciliationIssueItem[]
    | {
        items?: ReconciliationIssueItem[];
        rows?: ReconciliationIssueItem[];
        pagination?: ApiMeta;
        meta?: ApiMeta;
      }
  >(`/reconciliation-issues${query}`);

  return {
    orders: [],
    subscriptions: [],
    reconciliations: [],
    issues: normalizeList<ReconciliationIssueItem>(response.data),
    pagination: extractPagination(response, limit),
    errorMessage: "",
  };
}

export function useSubscriptionReferenceDataQuery() {
  return useQuery({
    queryKey: subscribePageKeys.reference(),
    queryFn: fetchSubscriptionReferenceData,
    staleTime: 60_000,
  });
}

export function useSubscriptionSummaryQuery() {
  return useQuery({
    queryKey: subscribePageKeys.summary(),
    queryFn: fetchSubscriptionSummaryData,
    staleTime: 60_000,
  });
}

export function useSubscriptionPageQuery(params: {
  activeTab: SubscriptionTabKey;
  filters: SubscriptionListFilters;
  page: number;
  limit: number;
}) {
  return useQuery({
    queryKey: subscribePageKeys.pagedList(
      params.activeTab,
      params.filters,
      params.page,
      params.limit,
    ),
    queryFn: () => fetchSubscriptionPageData(params),
    placeholderData: keepPreviousData,
  });
}

// ─── Order / subscription detail (opened from a table row click) ──────────

async function fetchSubscriptionOrderDetail(
  orderId: number,
): Promise<SubscriptionOrderDetailResponse> {
  const response = await fetchJson<
    SubscriptionOrderDetailResponse | SubscriptionOrderItem
  >(`/subscription-orders/${orderId}`);
  const data = response.data;

  return data && typeof data === "object" && "order" in data
    ? (data as SubscriptionOrderDetailResponse)
    : { order: data as SubscriptionOrderItem };
}

export function useSubscriptionOrderDetailQuery(orderId: number | null) {
  return useQuery({
    queryKey: subscribeKeys.orderDetail(orderId ?? -1),
    queryFn: () => fetchSubscriptionOrderDetail(orderId as number),
    enabled: orderId != null,
  });
}

async function fetchSubscriptionDetailForModal(
  subscriptionId: number,
): Promise<SubscriptionDetailResponse> {
  const response = await fetchJson<
    SubscriptionDetailResponse | SubscriptionItem
  >(`/subscriptions/${subscriptionId}`);
  const data = response.data;

  return data && typeof data === "object" && "subscription" in data
    ? (data as SubscriptionDetailResponse)
    : { subscription: data as SubscriptionItem };
}

export function useSubscriptionDetailModalQuery(subscriptionId: number | null) {
  return useQuery({
    queryKey: subscribeKeys.subscriptionDetail(subscriptionId ?? -1),
    queryFn: () => fetchSubscriptionDetailForModal(subscriptionId as number),
    enabled: subscriptionId != null,
  });
}

// ─── Eligible promotions for the create-order form ─────────────────────────

export function useEligiblePromotionsQuery(planId: number | null) {
  return useQuery<CatalogPromotion[]>({
    queryKey: subscribeKeys.eligiblePromotions(planId),
    queryFn: () => getEligiblePromotions(planId as number),
    enabled: planId != null && !Number.isNaN(planId),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export type CreateSubscriptionOrderPayload = {
  plan_id: number;
  closing_id?: number;
  external_reference?: string;
  idempotency_key: string;
  purchased_at: string;
  subscription_start_date: string;
  note?: string;
  promotion_ids?: number[];
};

export function useCreateSubscriptionOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ownerId,
      body,
    }: {
      ownerId: string;
      body: CreateSubscriptionOrderPayload;
    }) =>
      fetchJson(`/owners/${ownerId}/subscription-orders`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscribeKeys.all });
    },
  });
}

export type UpgradeSubscriptionOrderPayload = {
  plan_id: number;
  closing_id?: number;
  external_reference?: string;
  idempotency_key: string;
  purchased_at: string;
  effective_start_date: string;
  note?: string;
};

export function useUpgradeSubscriptionOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      body,
    }: {
      subscriptionId: number;
      body: UpgradeSubscriptionOrderPayload;
    }) =>
      fetchJson(`/subscriptions/${subscriptionId}/upgrades`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscribeKeys.all });
    },
  });
}

export type ReconcileSubscriptionOrderPayload = {
  action: "CONFIRM" | "REJECT" | "PARTIAL_CONFIRM";
  closing_id?: number;
  note?: string;
  admin_final_amount?: string;
  admin_tenure_months?: number;
};

export function useReconcileSubscriptionOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      body,
    }: {
      orderId: string;
      body: ReconcileSubscriptionOrderPayload;
    }) =>
      fetchJson(`/subscription-orders/${orderId}/reconcile`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscribeKeys.all });
    },
  });
}

// ─── [id]/page.tsx detail page ──────────────────────────────────────────────

export function useSubscriptionDetailPageQuery(subscriptionId: number | null) {
  return useQuery<SubscriptionDetailData>({
    queryKey: subscribeKeys.detailPage(subscriptionId ?? -1),
    queryFn: () => getSubscriptionDetail(subscriptionId as number),
    enabled: subscriptionId != null && !Number.isNaN(subscriptionId),
  });
}

export function useGlobalOutletQuery(outletId: number | null) {
  return useQuery<OutletDetail>({
    queryKey: subscribeKeys.outlet(outletId ?? -1),
    queryFn: () => getGlobalOutlet(outletId as number),
    enabled: outletId != null,
  });
}
