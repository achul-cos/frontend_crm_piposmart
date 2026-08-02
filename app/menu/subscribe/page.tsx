"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import AnalyticsTab from "./AnalyticsTab";
import { authFetchJson, getEligiblePromotions, type CatalogPromotion } from "@/app/lib/api";

type ApiMeta = {
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
};

type ApiResponse<T> = {
  data?: T;
  meta?: ApiMeta;
  error?: {
    code?: string;
    message?: string;
  };
};

type Owner = {
  id?: number;
  code?: string;
  name?: string;
  kode_owner?: string;
  nama_owner?: string;
};

type Plan = {
  id?: number;
  code?: string;
  name?: string;
};

type Closing = {
  id?: number;
  code?: string;
};

type SubscriptionOrderItem = {
  id: number;
  code?: string;
  owner?: Owner;
  closing?: Closing;
  plan?: Plan;
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
  additional_charge?: string;
  final_amount?: string;
  status?: string;
  purchased_at?: string;
  subscription_start_date?: string;
  external_reference?: string;
  note?: string;
};

type SubscriptionItem = {
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

type ReconciliationItem = {
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
  confirmed_at?: string;
  created_at?: string;
};

type ReconciliationIssueItem = {
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

type WalletItem = {
  id: number;
  owner_id?: number;
  owner?: Owner;
  balance?: string;
  status?: string;
};

type SubscriptionOrderDetailResponse = {
  order?: SubscriptionOrderItem;
  subscription?: SubscriptionItem;
  reconciliation?: ReconciliationItem;
  issue?: ReconciliationIssueItem;
};

type SubscriptionDetailResponse = {
  subscription?: SubscriptionItem;
  order?: SubscriptionOrderItem;
};

type CreateOrderForm = {
  ownerId: string;
  planId: string;
  closingId: string;
  externalReference: string;
  idempotencyKey: string;
  purchasedAt: string;
  subscriptionStartDate: string;
  note: string;
  promotionIds: number[];
};

type ReconcileForm = {
  orderId: string;
  action: "CONFIRM" | "REJECT" | "PARTIAL_CONFIRM";
  closingId: string;
  note: string;
  adminFinalAmount: string;
  adminTenureMonths: string;
};

const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400";

const selectClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400";

const textareaClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100";

const getTodayDate = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

const getTodayDatetimeLocal = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
};

const emptyCreateOrderForm: CreateOrderForm = {
  ownerId: "",
  planId: "",
  closingId: "",
  externalReference: "",
  idempotencyKey: "",
  purchasedAt: getTodayDatetimeLocal(),
  subscriptionStartDate: getTodayDate(),
  note: "",
  promotionIds: [],
};

const emptyReconcileForm: ReconcileForm = {
  orderId: "",
  action: "CONFIRM",
  closingId: "",
  note: "",
  adminFinalAmount: "",
  adminTenureMonths: "",
};

const formatRupiah = (value: string | number | undefined) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatTanggal = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatTanggalPendek = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getOwnerName = (owner?: Owner) => {
  if (!owner) return "-";
  return owner.name || owner.nama_owner || "-";
};

const getOwnerCode = (owner?: Owner) => {
  if (!owner) return "-";
  return owner.code || owner.kode_owner || "-";
};

const normalizeList = <T,>(payload: unknown): T[] => {
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

const getStatusClass = (status?: string) => {
  const normalized = String(status || "").toUpperCase();

  if (
    ["ACTIVE", "PAID", "CONFIRMED", "RECONCILED", "PARTIAL_CONFIRM"].includes(
      normalized,
    )
  ) {
    return "border-green-100 bg-green-50 text-green-700";
  }

  if (["PENDING", "PENDING_RECONCILIATION", "OPEN"].includes(normalized)) {
    return "border-yellow-100 bg-yellow-50 text-yellow-700";
  }

  if (["REJECTED", "CANCELED", "EXPIRED"].includes(normalized)) {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-600";
};

const toIsoFromDatetimeLocal = (value: string) => {
  if (!value) return new Date().toISOString();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();

  return date.toISOString();
};

function ModalShell({
  open,
  title,
  subtitle,
  label = "Subscribe",
  maxWidth = "max-w-3xl",
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  label?: string;
  maxWidth?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center overflow-y-auto p-4 md:p-6">
        <div
          className={`w-full ${maxWidth} overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#fff_0%,#fff8f5_55%,#fee2e2_100%)] px-5 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                  {label}
                </p>

                <h2 className="mt-2 text-lg font-black text-slate-950 md:text-xl">
                  {title}
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  {subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-5 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  usePageTitle("Subscribe");

  const [orders, setOrders] = useState<SubscriptionOrderItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>(
    [],
  );
  const [issues, setIssues] = useState<ReconciliationIssueItem[]>([]);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [activeTab, setActiveTab] = useState<
    "orders" | "subscriptions" | "reconciliations" | "issues" | "analytics"
  >("orders");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [purchasedFrom, setPurchasedFrom] = useState("");
  const [purchasedTo, setPurchasedTo] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateOrderForm>(emptyCreateOrderForm);
  const [reconcileForm, setReconcileForm] =
    useState<ReconcileForm>(emptyReconcileForm);

  // Sprint 15a — daftar promotion yang eligible untuk plan yang dipilih di form create order.
  const [eligiblePromotions, setEligiblePromotions] = useState<
    CatalogPromotion[]
  >([]);
  const [eligiblePromotionsLoading, setEligiblePromotionsLoading] =
    useState(false);

  useEffect(() => {
    const planIdNumber = Number(createForm.planId);

    if (!createForm.planId || Number.isNaN(planIdNumber)) {
      const timer = window.setTimeout(() => {
        setEligiblePromotions([]);
        setEligiblePromotionsLoading(false);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setEligiblePromotionsLoading(true);

      getEligiblePromotions(planIdNumber)
        .then((result) => {
          if (!cancelled) setEligiblePromotions(result);
        })
        .catch(() => {
          if (!cancelled) setEligiblePromotions([]);
        })
        .finally(() => {
          if (!cancelled) setEligiblePromotionsLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [createForm.planId]);

  const [selectedOrderDetail, setSelectedOrderDetail] =
    useState<SubscriptionOrderDetailResponse | null>(null);
  const [selectedSubscriptionDetail, setSelectedSubscriptionDetail] =
    useState<SubscriptionDetailResponse | null>(null);

  const [detailTitle, setDetailTitle] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsMounted(true);
      setUserRole(localStorage.getItem("piposmart_user_role") || "");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const normalizedRole = userRole.toLowerCase();
  const isAdmin = isMounted && normalizedRole === "admin";
  const isSupervisor = isMounted && normalizedRole === "supervisor";
  const canReconcile = isAdmin || isSupervisor;

  const authFetch = async <T,>(path: string, options: RequestInit = {}) => {
    return authFetchJson<ApiResponse<T>>(path, options);
  };

  const buildQuery = (params: Record<string, string>) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== "Semua") query.set(key, value);
    });

    const text = query.toString();
    return text ? `?${text}` : "";
  };

  const loadSubscriptionData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const orderQuery = buildQuery({
        q: debouncedSearch,
        status: statusFilter,
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
      ] = await Promise.allSettled([
        authFetch<
          | SubscriptionOrderItem[]
          | { items?: SubscriptionOrderItem[]; rows?: SubscriptionOrderItem[] }
        >(`/subscription-orders${orderQuery}`),
        authFetch<
          | SubscriptionItem[]
          | { items?: SubscriptionItem[]; rows?: SubscriptionItem[] }
        >(`/subscriptions${subscriptionQuery}`),
        authFetch<
          | ReconciliationItem[]
          | { items?: ReconciliationItem[]; rows?: ReconciliationItem[] }
        >(`/reconciliations${reconciliationQuery}`),
        authFetch<
          | ReconciliationIssueItem[]
          | { items?: ReconciliationIssueItem[]; rows?: ReconciliationIssueItem[] }
        >(`/reconciliation-issues${issueQuery}`),
        authFetch<WalletItem[] | { items?: WalletItem[]; rows?: WalletItem[] }>(
          `/wallets${walletQuery}`,
        ),
        authFetch<Owner[] | { items?: Owner[]; rows?: Owner[] }>(
          `/owners${ownersQuery}`,
        ),
      ]);

      if (orderResult.status === "fulfilled") {
        setOrders(normalizeList<SubscriptionOrderItem>(orderResult.value.data));
      } else {
        setOrders([]);
      }

      if (subscriptionResult.status === "fulfilled") {
        setSubscriptions(
          normalizeList<SubscriptionItem>(subscriptionResult.value.data),
        );
      } else {
        setSubscriptions([]);
      }

      if (reconciliationResult.status === "fulfilled") {
        setReconciliations(
          normalizeList<ReconciliationItem>(reconciliationResult.value.data),
        );
      } else {
        setReconciliations([]);
      }

      if (issueResult.status === "fulfilled") {
        setIssues(
          normalizeList<ReconciliationIssueItem>(issueResult.value.data),
        );
      } else {
        setIssues([]);
      }

      if (walletResult.status === "fulfilled") {
        setWallets(normalizeList<WalletItem>(walletResult.value.data));
      } else {
        setWallets([]);
      }

      if (ownerResult.status === "fulfilled") {
        setOwners(normalizeList<Owner>(ownerResult.value.data));
      } else {
        setOwners([]);
      }

      const firstError = [
        orderResult,
        subscriptionResult,
        reconciliationResult,
        issueResult,
        walletResult,
        ownerResult,
      ].find((result) => result.status === "rejected") as
        | PromiseRejectedResult
        | undefined;

      if (firstError) {
        setErrorMessage(
          firstError.reason instanceof Error
            ? firstError.reason.message
            : "Sebagian data subscription gagal dimuat.",
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data subscription.",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, purchasedFrom, purchasedTo]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 450);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSubscriptionData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSubscriptionData, reloadKey]);

  const summary = useMemo(() => {
    const totalOrderAmount = orders.reduce(
      (total, item) => total + Number(item.final_amount || 0),
      0,
    );

    const activeSubscriptions = subscriptions.filter(
      (item) => String(item.status || "").toUpperCase() === "ACTIVE",
    );

    const confirmedReconciliations = reconciliations.filter(
      (item) => String(item.status || "").toUpperCase() === "CONFIRMED",
    );

    return {
      totalOrderAmount,
      activeSubscriptions: activeSubscriptions.length,
      confirmedReconciliations: confirmedReconciliations.length,
      openIssues: issues.filter(
        (item) => String(item.status || "").toUpperCase() === "OPEN",
      ).length,
    };
  }, [orders, subscriptions, reconciliations, issues]);

  const planOptions = useMemo(() => {
    const fromOrders = orders
      .map((item) => item.plan)
      .filter((item): item is Plan => Boolean(item?.id));

    const unique = new Map<number, Plan>();

    fromOrders.forEach((plan) => {
      if (plan.id) unique.set(plan.id, plan);
    });

    return Array.from(unique.values());
  }, [orders]);

  const ownerOptions = useMemo(() => {
    const walletByOwnerId = new Map<number, WalletItem>();

    wallets.forEach((wallet) => {
      const ownerId = wallet.owner?.id || wallet.owner_id;

      if (ownerId) {
        walletByOwnerId.set(ownerId, wallet);
      }
    });

    const ownerMap = new Map<
      number,
      { ownerId: number; ownerCode: string; ownerName: string; balance?: string }
    >();

    owners.forEach((owner) => {
      if (!owner.id) return;

      const wallet = walletByOwnerId.get(owner.id);

      ownerMap.set(owner.id, {
        ownerId: owner.id,
        ownerCode: getOwnerCode(owner),
        ownerName: getOwnerName(owner),
        balance: wallet?.balance,
      });
    });

    wallets.forEach((wallet) => {
      const ownerId = wallet.owner?.id || wallet.owner_id || wallet.id;

      if (!ownerId || ownerMap.has(ownerId)) return;

      ownerMap.set(ownerId, {
        ownerId,
        ownerCode: getOwnerCode(wallet.owner),
        ownerName: getOwnerName(wallet.owner),
        balance: wallet.balance,
      });
    });

    return Array.from(ownerMap.values());
  }, [owners, wallets]);

  const handleCreateOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdmin) {
      alert("Hanya Admin yang bisa membuat subscription order.");
      return;
    }

    if (!createForm.ownerId) {
      alert("Owner wajib dipilih.");
      return;
    }

    if (!createForm.planId) {
      alert("Plan ID wajib diisi.");
      return;
    }

    if (!createForm.externalReference && !createForm.idempotencyKey) {
      alert("External reference atau idempotency key wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      await authFetch(`/owners/${createForm.ownerId}/subscription-orders`, {
        method: "POST",
        body: JSON.stringify({
          plan_id: Number(createForm.planId),
          closing_id: createForm.closingId
            ? Number(createForm.closingId)
            : undefined,
          external_reference: createForm.externalReference || undefined,
          idempotency_key:
            createForm.idempotencyKey ||
            `subscription-order-${createForm.ownerId}-${Date.now()}`,
          purchased_at: toIsoFromDatetimeLocal(createForm.purchasedAt),
          subscription_start_date: createForm.subscriptionStartDate,
          note: createForm.note || undefined,
          promotion_ids: createForm.promotionIds.length
            ? createForm.promotionIds
            : undefined,
        }),
      });

      setIsCreateOpen(false);
      setCreateForm(emptyCreateOrderForm);
      setEligiblePromotions([]);
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal membuat subscription order.",
      );
    } finally {
      setLoading(false);
    }
  };

  const openReconcileModal = (order: SubscriptionOrderItem) => {
    setReconcileForm({
      orderId: String(order.id),
      action: "CONFIRM",
      closingId: order.closing?.id ? String(order.closing.id) : "",
      note: "",
      adminFinalAmount: "",
      adminTenureMonths: "",
    });
    setIsReconcileOpen(true);
  };

  const handleReconcile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canReconcile) {
      alert("Hanya Admin/Supervisor yang bisa melakukan reconciliation.");
      return;
    }

    if (!reconcileForm.orderId) {
      alert("Order wajib dipilih.");
      return;
    }

    if (reconcileForm.action === "CONFIRM" && !reconcileForm.closingId) {
      alert("Closing ID wajib diisi untuk confirm reconciliation.");
      return;
    }

    if (reconcileForm.action === "PARTIAL_CONFIRM" && !reconcileForm.adminFinalAmount) {
      alert("Admin Final Amount wajib diisi untuk partial confirm reconciliation.");
      return;
    }

    setLoading(true);

    try {
      await authFetch(`/subscription-orders/${reconcileForm.orderId}/reconcile`, {
        method: "POST",
        body: JSON.stringify({
          action: reconcileForm.action,
          closing_id: reconcileForm.closingId
            ? Number(reconcileForm.closingId)
            : undefined,
          note: reconcileForm.note || undefined,
          admin_final_amount:
            reconcileForm.action === "PARTIAL_CONFIRM"
              ? reconcileForm.adminFinalAmount
              : undefined,
          admin_tenure_months:
            reconcileForm.action === "PARTIAL_CONFIRM" && reconcileForm.adminTenureMonths
              ? Number(reconcileForm.adminTenureMonths)
              : undefined,
        }),
      });

      setIsReconcileOpen(false);
      setReconcileForm(emptyReconcileForm);
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal melakukan reconciliation.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOrderDetail = async (order: SubscriptionOrderItem) => {
    setLoading(true);

    try {
      const response = await authFetch<
        SubscriptionOrderDetailResponse | SubscriptionOrderItem
      >(`/subscription-orders/${order.id}`);
      const data = response.data as
        | SubscriptionOrderDetailResponse
        | SubscriptionOrderItem
        | undefined;
      const detail =
        data && "order" in data ? data : { order: data as SubscriptionOrderItem };

      setSelectedOrderDetail(detail);
      setSelectedSubscriptionDetail(null);
      setDetailTitle(`Detail Order ${order.code || order.id}`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengambil detail subscription order.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubscriptionDetail = async (
    subscription: SubscriptionItem,
  ) => {
    setLoading(true);

    try {
      const response = await authFetch<
        SubscriptionDetailResponse | SubscriptionItem
      >(`/subscriptions/${subscription.id}`);
      const data = response.data as
        | SubscriptionDetailResponse
        | SubscriptionItem
        | undefined;
      const detail =
        data && "subscription" in data
          ? data
          : { subscription: data as SubscriptionItem };

      setSelectedSubscriptionDetail(detail);
      setSelectedOrderDetail(null);
      setDetailTitle(`Detail Subscription ${subscription.code || subscription.id}`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengambil detail subscription.",
      );
    } finally {
      setLoading(false);
    }
  };

  const closeDetailModal = () => {
    setSelectedOrderDetail(null);
    setSelectedSubscriptionDetail(null);
  };

  const statusOptions = [
    "PENDING_RECONCILIATION",
    "PAID",
    "RECONCILED",
    "REJECTED",
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-[#C92C1E]">Subscribe</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Manajemen Subscribe
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Kelola pembelian paket dari saldo wallet, subscription aktif,
              reconciliation, dan issue queue tanpa double counting revenue.
            </p>
          </div>

          {isMounted && isAdmin && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700"
            >
              + Buat Order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
          <div className="relative z-10">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">
              Total Order
            </p>
            <h2 className="text-3xl font-black">
              {formatRupiah(summary.totalOrderAmount)}
            </h2>
            <p className="mt-1 text-xs font-medium text-red-100/80">
              Pembelian paket dari wallet
            </p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-colors hover:border-[#C92C1E]">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Subscription Aktif
          </p>
          <h2 className="text-3xl font-black text-gray-900">
            {summary.activeSubscriptions}
          </h2>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Owner aktif berlangganan
          </p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-colors hover:border-[#C92C1E]">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Reconciliation Confirmed
          </p>
          <h2 className="text-3xl font-black text-gray-900">
            {summary.confirmedReconciliations}
          </h2>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Order sudah dipertemukan dengan closing
          </p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-colors hover:border-[#C92C1E]">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Open Issue
          </p>
          <h2 className="text-3xl font-black text-gray-900">
            {summary.openIssues}
          </h2>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Hanging order / manual review
          </p>
        </div>
      </div>

      <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="flex text-sm font-bold">
          {[
            { key: "orders", label: "Subscription Order" },
            { key: "subscriptions", label: "Subscription Aktif" },
            { key: "reconciliations", label: "Reconciliation" },
            { key: "issues", label: "Issue Queue" },
            { key: "analytics", label: "Analitik" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key as typeof activeTab)}
              className={`rounded-lg px-5 py-2.5 transition-all ${
                activeTab === item.key
                  ? "bg-white text-[#C92C1E] shadow-sm"
                  : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "analytics" ? (
        <AnalyticsTab />
      ) : (
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-4">
          <div>
            <h2 className="text-sm font-black text-gray-900">
              Filter Subscription
            </h2>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Pencarian, status, dan tanggal otomatis diterapkan tanpa tombol
              terapkan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari order / owner"
              className="min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
            >
              <option value="Semua">Semua Status</option>
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={purchasedFrom}
              onChange={(event) => setPurchasedFrom(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
            />

            <input
              type="date"
              value={purchasedTo}
              onChange={(event) => setPurchasedTo(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mx-4 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
            {errorMessage}
          </div>
        )}

        <p className="px-4 pt-4 text-[11px] font-bold text-gray-400">
          Klik baris order atau subscription untuk membuka detail. Reconciliation
          dapat dilakukan Admin/Supervisor.
        </p>

        <div className="h-2" />

        {activeTab === "orders" && (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="p-3 font-black">Order</th>
                  <th className="p-3 font-black">Owner</th>
                  <th className="p-3 font-black">Plan</th>
                  <th className="p-3 font-black">Status</th>
                  <th className="p-3 font-black">Purchased</th>
                  <th className="p-3 text-right font-black">Amount</th>
                  {canReconcile && (
                    <th className="p-3 text-center font-black">Reconcile</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canReconcile ? 7 : 6}
                      className="p-8 text-center font-bold text-gray-400"
                    >
                      Data subscription order tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => handleOpenOrderDetail(order)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">
                          {order.code || `ORDER-${order.id}`}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          Closing: {order.closing?.code || order.closing?.id || "-"}
                        </p>
                      </td>

                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">
                          {getOwnerName(order.owner)}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          {getOwnerCode(order.owner)}
                        </p>
                      </td>

                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">
                          {order.plan?.name || "-"}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          {order.duration_days || 0} hari
                        </p>
                      </td>

                      <td className="p-3 align-top">
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black ${getStatusClass(
                            order.status,
                          )}`}
                        >
                          {order.status || "-"}
                        </span>
                      </td>

                      <td className="p-3 align-top font-bold text-gray-600">
                        <p>{formatTanggal(order.purchased_at)}</p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          Start:{" "}
                          {formatTanggalPendek(order.subscription_start_date)}
                        </p>
                      </td>

                      <td className="p-3 text-right align-top">
                        <span className="inline-flex min-w-[130px] justify-end rounded-2xl border border-red-100 bg-red-50 px-4 py-3 font-black text-[#C92C1E]">
                          {formatRupiah(order.final_amount)}
                        </span>
                      </td>

                      {canReconcile && (
                        <td className="p-3 text-center align-top">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openReconcileModal(order);
                            }}
                            className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-black text-[#C92C1E] transition hover:bg-red-100"
                          >
                            Reconcile
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "subscriptions" && (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="p-3 font-black">Subscription</th>
                  <th className="p-3 font-black">Owner</th>
                  <th className="p-3 font-black">Plan</th>
                  <th className="p-3 font-black">Status</th>
                  <th className="p-3 font-black">Periode</th>
                  <th className="p-3 text-right font-black">Durasi</th>
                  <th className="p-3 text-center font-black">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center font-bold text-gray-400"
                    >
                      Data subscription tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((subscription) => (
                    <tr
                      key={subscription.id}
                      onClick={() => handleOpenSubscriptionDetail(subscription)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="p-3 align-top">
                        <Link
                          href={`/menu/subscribe/${subscription.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="font-black text-gray-900 transition-colors hover:text-[#C92C1E]"
                        >
                          {subscription.code || `SUB-${subscription.id}`}
                        </Link>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          Order:{" "}
                          {subscription.order?.code ||
                            subscription.order?.id ||
                            "-"}
                        </p>
                      </td>

                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">
                          {getOwnerName(subscription.owner)}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          {getOwnerCode(subscription.owner)}
                        </p>
                      </td>

                      <td className="p-3 align-top font-bold text-gray-700">
                        {subscription.plan?.name || "-"}
                      </td>

                      <td className="p-3 align-top">
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black ${getStatusClass(
                            subscription.status,
                          )}`}
                        >
                          {subscription.status || "-"}
                        </span>
                      </td>

                      <td className="p-3 align-top font-bold text-gray-600">
                        {formatTanggalPendek(subscription.active_from)} -{" "}
                        {formatTanggalPendek(subscription.active_until)}
                      </td>

                      <td className="p-3 text-right align-top font-black text-[#C92C1E]">
                        {subscription.total_duration_days || 0} hari
                      </td>

                      <td
                        className="p-3 text-center align-top"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Link
                          href={`/menu/subscribe/${subscription.id}`}
                          className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "reconciliations" && (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="p-3 font-black">Reconciliation</th>
                  <th className="p-3 font-black">Owner</th>
                  <th className="p-3 font-black">Order</th>
                  <th className="p-3 font-black">Closing</th>
                  <th className="p-3 font-black">Status</th>
                  <th className="p-3 text-right font-black">Selisih</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {reconciliations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center font-bold text-gray-400"
                    >
                      Data reconciliation tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  reconciliations.map((reconciliation) => (
                    <tr
                      key={reconciliation.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">
                          {reconciliation.code || `REC-${reconciliation.id}`}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          {reconciliation.match_type || "-"} •{" "}
                          {formatTanggal(
                            reconciliation.confirmed_at ||
                              reconciliation.created_at,
                          )}
                        </p>
                      </td>

                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">
                          {getOwnerName(reconciliation.owner)}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          {getOwnerCode(reconciliation.owner)}
                        </p>
                      </td>

                      <td className="p-3 align-top font-bold text-gray-700">
                        {reconciliation.order?.code ||
                          reconciliation.order?.id ||
                          "-"}
                      </td>

                      <td className="p-3 align-top font-bold text-gray-700">
                        {reconciliation.closing?.code ||
                          reconciliation.closing?.id ||
                          "-"}
                      </td>

                      <td className="p-3 align-top">
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black ${getStatusClass(
                            reconciliation.status,
                          )}`}
                        >
                          {reconciliation.status || "-"}
                        </span>
                      </td>

                      <td className="p-3 text-right align-top font-black text-[#C92C1E]">
                        {formatRupiah(reconciliation.amount_difference)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "issues" && (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="p-3 font-black">Issue</th>
                  <th className="p-3 font-black">Owner</th>
                  <th className="p-3 font-black">Order</th>
                  <th className="p-3 font-black">Type</th>
                  <th className="p-3 font-black">Status</th>
                  <th className="p-3 font-black">Detected</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {issues.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center font-bold text-gray-400"
                    >
                      Data issue tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <tr
                      key={issue.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">
                          {issue.code || `ISSUE-${issue.id}`}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[11px] font-bold text-gray-400">
                          {issue.description || "-"}
                        </p>
                      </td>

                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">
                          {getOwnerName(issue.owner)}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          {getOwnerCode(issue.owner)}
                        </p>
                      </td>

                      <td className="p-3 align-top font-bold text-gray-700">
                        {issue.order?.code || issue.order?.id || "-"}
                      </td>

                      <td className="p-3 align-top font-bold text-gray-700">
                        {issue.issue_type || "-"}
                      </td>

                      <td className="p-3 align-top">
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black ${getStatusClass(
                            issue.status,
                          )}`}
                        >
                          {issue.status || "-"}
                        </span>
                      </td>

                      <td className="p-3 align-top font-bold text-gray-600">
                        {formatTanggal(issue.detected_at || issue.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      <ModalShell
        open={Boolean(selectedOrderDetail || selectedSubscriptionDetail)}
        title={detailTitle || "Detail Subscribe"}
        subtitle="Detail subscription order, subscription aktif, reconciliation, dan issue queue."
        maxWidth="max-w-3xl"
        onClose={closeDetailModal}
      >
        <div className="space-y-5">
          {selectedOrderDetail?.order && (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Subscription Order
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                <InfoItem
                  label="Kode Order"
                  value={
                    selectedOrderDetail.order.code ||
                    `ORD-${selectedOrderDetail.order.id}`
                  }
                />
                <InfoItem
                  label="Owner"
                  value={`${getOwnerCode(
                    selectedOrderDetail.order.owner,
                  )} — ${getOwnerName(selectedOrderDetail.order.owner)}`}
                />
                <InfoItem
                  label="Plan"
                  value={
                    selectedOrderDetail.order.plan?.name ||
                    selectedOrderDetail.order.plan?.code ||
                    "-"
                  }
                />
                <InfoItem
                  label="Status"
                  value={selectedOrderDetail.order.status || "-"}
                />
                <InfoItem
                  label="Purchased At"
                  value={formatTanggal(selectedOrderDetail.order.purchased_at)}
                />
                <InfoItem
                  label="Start Date"
                  value={formatTanggalPendek(
                    selectedOrderDetail.order.subscription_start_date,
                  )}
                />
                <InfoItem
                  label="Duration"
                  value={`${selectedOrderDetail.order.duration_days || 0} hari`}
                />
                <InfoItem
                  label="Final Amount"
                  value={formatRupiah(selectedOrderDetail.order.final_amount)}
                />
                <InfoItem
                  label="External Ref"
                  value={selectedOrderDetail.order.external_reference || "-"}
                />
                <InfoItem
                  label="Closing"
                  value={
                    selectedOrderDetail.order.closing?.code ||
                    String(selectedOrderDetail.order.closing?.id || "-")
                  }
                />
                <InfoItem
                  label="Promotion"
                  value={
                    selectedOrderDetail.order.promotions &&
                    selectedOrderDetail.order.promotions.length > 0
                      ? selectedOrderDetail.order.promotions
                          .map((promotion) => promotion.name || promotion.code)
                          .join(", ")
                      : selectedOrderDetail.order.promotion?.name ||
                        selectedOrderDetail.order.promotion?.code ||
                        "-"
                  }
                />
              </div>

              {selectedOrderDetail.order.balance_shortfall_amount && (
                <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black text-amber-700">
                  Order melebihi saldo owner sebesar{" "}
                  {formatRupiah(selectedOrderDetail.order.balance_shortfall_amount)}
                </p>
              )}
            </div>
          )}

          {selectedOrderDetail?.reconciliation && (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Reconciliation
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                <InfoItem
                  label="Kode"
                  value={
                    selectedOrderDetail.reconciliation.code ||
                    `REC-${selectedOrderDetail.reconciliation.id}`
                  }
                />
                <InfoItem
                  label="Status"
                  value={selectedOrderDetail.reconciliation.status || "-"}
                />
                <InfoItem
                  label="Match Type"
                  value={selectedOrderDetail.reconciliation.match_type || "-"}
                />
                <InfoItem
                  label="Amount Difference"
                  value={formatRupiah(
                    selectedOrderDetail.reconciliation.amount_difference,
                  )}
                />
              </div>
            </div>
          )}

          {selectedOrderDetail?.issue && (
            <div className="rounded-[28px] border border-red-100 bg-red-50/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                Issue
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                <InfoItem
                  label="Kode"
                  value={
                    selectedOrderDetail.issue.code ||
                    `ISSUE-${selectedOrderDetail.issue.id}`
                  }
                />
                <InfoItem
                  label="Type"
                  value={selectedOrderDetail.issue.issue_type || "-"}
                />
                <InfoItem
                  label="Status"
                  value={selectedOrderDetail.issue.status || "-"}
                />
                <InfoItem
                  label="Detected"
                  value={formatTanggal(
                    selectedOrderDetail.issue.detected_at ||
                      selectedOrderDetail.issue.created_at,
                  )}
                />
              </div>

              {selectedOrderDetail.issue.description && (
                <p className="mt-3 rounded-2xl border border-red-100 bg-white p-3 text-xs font-bold text-gray-600">
                  {selectedOrderDetail.issue.description}
                </p>
              )}
            </div>
          )}

          {selectedSubscriptionDetail?.subscription && (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Subscription
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                <InfoItem
                  label="Kode Subscription"
                  value={
                    selectedSubscriptionDetail.subscription.code ||
                    `SUB-${selectedSubscriptionDetail.subscription.id}`
                  }
                />
                <InfoItem
                  label="Owner"
                  value={`${getOwnerCode(
                    selectedSubscriptionDetail.subscription.owner,
                  )} — ${getOwnerName(
                    selectedSubscriptionDetail.subscription.owner,
                  )}`}
                />
                <InfoItem
                  label="Plan"
                  value={
                    selectedSubscriptionDetail.subscription.plan?.name ||
                    selectedSubscriptionDetail.subscription.plan?.code ||
                    "-"
                  }
                />
                <InfoItem
                  label="Status"
                  value={selectedSubscriptionDetail.subscription.status || "-"}
                />
                <InfoItem
                  label="Active From"
                  value={formatTanggalPendek(
                    selectedSubscriptionDetail.subscription.active_from,
                  )}
                />
                <InfoItem
                  label="Active Until"
                  value={formatTanggalPendek(
                    selectedSubscriptionDetail.subscription.active_until,
                  )}
                />
                <InfoItem
                  label="Duration"
                  value={`${
                    selectedSubscriptionDetail.subscription.total_duration_days ||
                    0
                  } hari`}
                />
                <InfoItem
                  label="Order"
                  value={
                    selectedSubscriptionDetail.subscription.order?.code ||
                    String(
                      selectedSubscriptionDetail.subscription.order?.id || "-",
                    )
                  }
                />
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={closeDetailModal}
              className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
            >
              Tutup
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={isCreateOpen && isMounted && isAdmin}
        title="Buat Subscription Order"
        subtitle="Admin membuat pembelian paket dari saldo wallet owner."
        maxWidth="max-w-2xl"
        onClose={() => setIsCreateOpen(false)}
      >
        <form
          onSubmit={handleCreateOrder}
          autoComplete="off"
          className="space-y-5"
        >
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              Owner
            </p>

            <div className="mt-4">
              <label className="block space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Pilih Owner
                </span>

                <select
                  value={createForm.ownerId}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      ownerId: event.target.value,
                    }))
                  }
                  className={selectClass}
                >
                  <option value="">Pilih Owner</option>
                  {ownerOptions.map((owner) => (
                    <option key={owner.ownerId} value={owner.ownerId}>
                      {owner.ownerCode} — {owner.ownerName} — saldo{" "}
                      {formatRupiah(owner.balance)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              Detail Order
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Plan ID
                </span>

                <input
                  value={createForm.planId}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      planId: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="Contoh: 1"
                  list="subscription-plan-options"
                  className={inputClass}
                />

                <datalist id="subscription-plan-options">
                  {planOptions.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name || plan.code || `Plan ${plan.id}`}
                    </option>
                  ))}
                </datalist>

                <p className="text-[10px] font-bold text-gray-400">
                  Plan ID mengikuti master plan backend.
                </p>
              </label>

              <div className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Promotion (opsional, bisa lebih dari satu)
                </span>

                {!createForm.planId ? (
                  <p className="text-[11px] font-bold text-gray-400">
                    Isi Plan ID terlebih dahulu untuk melihat promotion yang eligible.
                  </p>
                ) : eligiblePromotionsLoading ? (
                  <p className="text-[11px] font-bold text-gray-400">
                    Memuat promotion...
                  </p>
                ) : eligiblePromotions.length === 0 ? (
                  <p className="text-[11px] font-bold text-gray-400">
                    Tidak ada promotion eligible untuk plan ini.
                  </p>
                ) : (
                  <div className="space-y-2 rounded-2xl border border-gray-200 bg-[#FAFAFA] p-3">
                    {eligiblePromotions.map((promotion) => (
                      <label
                        key={promotion.id}
                        className="flex items-start gap-3"
                      >
                        <input
                          type="checkbox"
                          checked={createForm.promotionIds.includes(promotion.id)}
                          onChange={(event) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              promotionIds: event.target.checked
                                ? [...prev.promotionIds, promotion.id]
                                : prev.promotionIds.filter(
                                    (id) => id !== promotion.id,
                                  ),
                            }))
                          }
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                        />
                        <span className="text-xs font-bold text-gray-700">
                          {promotion.name || promotion.code}
                          {promotion.charge_type
                            ? ` (${promotion.charge_type})`
                            : ""}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Closing ID
                </span>

                <input
                  value={createForm.closingId}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      closingId: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="Opsional untuk auto reconciliation"
                  className={inputClass}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Purchased At
                </span>

                <input
                  type="datetime-local"
                  value={createForm.purchasedAt}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      purchasedAt: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Subscription Start
                </span>

                <input
                  type="date"
                  value={createForm.subscriptionStartDate}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      subscriptionStartDate: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  External Reference
                </span>

                <input
                  value={createForm.externalReference}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      externalReference: event.target.value,
                    }))
                  }
                  placeholder="Contoh: SUB-ORDER-001"
                  className={inputClass}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Idempotency Key
                </span>

                <input
                  value={createForm.idempotencyKey}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      idempotencyKey: event.target.value,
                    }))
                  }
                  placeholder="Boleh kosong jika external reference unik"
                  className={inputClass}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Catatan
                </span>

                <textarea
                  value={createForm.note}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Catatan subscription order"
                  className={textareaClass}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {loading ? "Menyimpan..." : "Simpan Order"}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={isReconcileOpen && canReconcile}
        title="Manual Reconciliation"
        subtitle="Hubungkan order subscription dengan closing."
        maxWidth="max-w-xl"
        onClose={() => setIsReconcileOpen(false)}
      >
        <form onSubmit={handleReconcile} autoComplete="off" className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              Data Reconciliation
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Order ID
                </span>

                <input
                  value={reconcileForm.orderId}
                  readOnly
                  className={`${inputClass} cursor-not-allowed`}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Action
                </span>

                <select
                  value={reconcileForm.action}
                  onChange={(event) =>
                    setReconcileForm((prev) => ({
                      ...prev,
                      action: event.target.value as ReconcileForm["action"],
                    }))
                  }
                  className={selectClass}
                >
                  <option value="CONFIRM">CONFIRM</option>
                  <option value="REJECT">REJECT</option>
                  <option value="PARTIAL_CONFIRM">PARTIAL_CONFIRM</option>
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Closing ID
                </span>

                <input
                  value={reconcileForm.closingId}
                  onChange={(event) =>
                    setReconcileForm((prev) => ({
                      ...prev,
                      closingId: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="Wajib untuk CONFIRM"
                  className={inputClass}
                />
              </label>

              {reconcileForm.action === "PARTIAL_CONFIRM" && (
                <>
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                      Admin Final Amount
                    </span>

                    <input
                      value={reconcileForm.adminFinalAmount}
                      onChange={(event) =>
                        setReconcileForm((prev) => ({
                          ...prev,
                          adminFinalAmount: event.target.value.replace(
                            /[^0-9.]/g,
                            "",
                          ),
                        }))
                      }
                      placeholder="Wajib untuk PARTIAL_CONFIRM"
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                      Admin Tenure Months (opsional)
                    </span>

                    <input
                      value={reconcileForm.adminTenureMonths}
                      onChange={(event) =>
                        setReconcileForm((prev) => ({
                          ...prev,
                          adminTenureMonths: event.target.value.replace(
                            /\D/g,
                            "",
                          ),
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                </>
              )}

              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Catatan
                </span>

                <textarea
                  value={reconcileForm.note}
                  onChange={(event) =>
                    setReconcileForm((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Catatan reconciliation"
                  className={textareaClass}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsReconcileOpen(false)}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {loading ? "Menyimpan..." : "Simpan Reconciliation"}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-[#FAFAFA] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="mt-1 break-words text-xs font-black text-gray-900">
        {value}
      </p>
    </div>
  );
}


