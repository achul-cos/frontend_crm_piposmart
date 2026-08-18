"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import AnalyticsTabSkeleton from "@/app/components/skeleton/AnalyticsTabSkeleton";
import ColumnVisibilityControl from "@/app/components/table/ColumnVisibilityControl";
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";
import ScreenPortal from "@/app/components/ui/ScreenPortal";
import ReportExportButton from "@/app/components/export/ReportExportButton";

const AnalyticsTab = dynamic(() => import("./AnalyticsTab"), {
  ssr: false,
  loading: () => <AnalyticsTabSkeleton sections={2} />,
});
import {
  authFetchJson,
  getEligiblePromotions,
  type CatalogPromotion,
  type BackendOwner,
} from "@/app/lib/api";
import OwnerSearchPicker from "@/app/components/OwnerSearchPicker";
import {
  useSubscriptionPageQuery,
  useSubscriptionReferenceDataQuery,
  useSubscriptionSummaryQuery,
  type SubscriptionTabKey,
} from "@/app/lib/queries/subscribe";

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

type EntityRef = {
  id?: number;
  code?: string;
  name?: string;
};

type UserBrief = {
  id?: number;
  name?: string;
  role?: string;
};

type PackageSnapshot = {
  id?: number;
  code?: string;
  name?: string;
  level_order?: number;
};

type PlanSnapshot = {
  id?: number;
  code?: string;
  name?: string;
  tenure_months?: number;
  duration_days?: number;
  price?: string;
  currency?: string;
};

type UpgradeContext = {
  effective_start_date?: string;
  original_end_date?: string;
  remaining_days?: number;
  daily_price?: string;
  previous_package?: PackageSnapshot | null;
  previous_plan?: PlanSnapshot | null;
};

type SubscriptionOrderItem = {
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
  // Sprint 15a â€” order bisa memakai lebih dari satu promotion sekaligus;
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
  admin_tenure_months?: number;
  admin_final_amount?: string;
  note?: string;
  reason?: string;
  confirmed_at?: string;
  created_at?: string;
};

type SubscriptionPeriodItem = {
  id: number;
  period_index?: number;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  status?: string;
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
  period?: SubscriptionPeriodItem;
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

type UpgradeOrderForm = {
  planId: string;
  closingId: string;
  externalReference: string;
  idempotencyKey: string;
  purchasedAt: string;
  effectiveStartDate: string;
  note: string;
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
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-400";

const selectClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-400";

const textareaClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100";

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

const emptyUpgradeOrderForm: UpgradeOrderForm = {
  planId: "",
  closingId: "",
  externalReference: "",
  idempotencyKey: "",
  purchasedAt: getTodayDatetimeLocal(),
  effectiveStartDate: getTodayDate(),
  note: "",
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

const getOrderTypeLabel = (orderType?: string) => {
  if (orderType === "UPGRADE") return "Upgrade";
  if (orderType === "NEW") return "Baru";
  return orderType || "-";
};

const getOrderTypeClass = (orderType?: string) => {
  if (orderType === "UPGRADE") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
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
    <ScreenPortal>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 md:p-6" onClick={onClose}>
        <div className="flex min-h-full items-center justify-center">
          <div
            className={`app-modal-panel w-full ${maxWidth || "max-w-3xl xl:max-w-4xl"} min-h-[460px] rounded-[32px] shadow-2xl transition-all`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-modal-header px-5 py-4 md:px-6">
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
                className="app-modal-close rounded-2xl px-4 py-2 text-xs font-black transition"
              >
                Tutup
              </button>
            </div>
          </div>

          <div className="app-modal-body flex-1 min-h-0 space-y-4 p-5 md:p-6">
            {children}
          </div>
          </div>
        </div>
      </div>
    </ScreenPortal>
  );
}

export default function SubscriptionPage() {
  usePageTitle("Subscribe");

  const [activeTab, setActiveTab] = useState<
    "orders" | "subscriptions" | "reconciliations" | "issues" | "analytics"
  >("orders");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<number[]>([]);
  const [selectedReconciliationIds, setSelectedReconciliationIds] = useState<number[]>([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [orderTypeFilter, setOrderTypeFilter] = useState("Semua");
  const [purchasedFrom, setPurchasedFrom] = useState("");
  const [purchasedTo, setPurchasedTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const subscriptionListFilters = useMemo(
    () => ({ debouncedSearch, statusFilter, orderTypeFilter, purchasedFrom, purchasedTo }),
    [debouncedSearch, statusFilter, orderTypeFilter, purchasedFrom, purchasedTo],
  );
  const activeDataTab = activeTab === "analytics" ? "orders" : (activeTab as SubscriptionTabKey);
  const pageQuery = useSubscriptionPageQuery({
    activeTab: activeDataTab,
    filters: subscriptionListFilters,
    page,
    limit,
  });
  const referenceQuery = useSubscriptionReferenceDataQuery();
  const summaryQuery = useSubscriptionSummaryQuery();
  const orders = pageQuery.data?.orders ?? [];
  const subscriptions = pageQuery.data?.subscriptions ?? [];
  const reconciliations = pageQuery.data?.reconciliations ?? [];
  const issues = pageQuery.data?.issues ?? [];
  const wallets = referenceQuery.data?.wallets ?? [];
  const owners = referenceQuery.data?.owners ?? [];
  const catalogPlans = referenceQuery.data?.catalogPlans ?? [];
  const loading = pageQuery.isLoading || referenceQuery.isLoading;
  const errorMessage =
    pageQuery.data?.errorMessage ||
    (pageQuery.error instanceof Error ? pageQuery.error.message : "") ||
    (referenceQuery.error instanceof Error ? referenceQuery.error.message : "");
  const reloadSubscriptionData = () => {
    void pageQuery.refetch();
    void referenceQuery.refetch();
    void summaryQuery.refetch();
  };
  // Separate from `loading` (the list query) — tracks in-flight submit state for the
  // upgrade/create/reconcile mutation handlers below.
  const [isSubmitting, setLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateOrderForm>(emptyCreateOrderForm);
  const [selectedOwner, setSelectedOwner] = useState<BackendOwner | null>(null);

  useEffect(() => {
    if (isCreateOpen) {
      if (createForm.ownerId) {
        const found = owners.find((o) => o.id === Number(createForm.ownerId));
        if (found && found.id) {
          setSelectedOwner({
            id: found.id,
            code: found.code || found.kode_owner || "",
            name: found.name || found.nama_owner || "",
            phone: "",
            brand_name: "",
            status: "ACTIVE",
          });
          return;
        }
      }
      setSelectedOwner(null);
    }
  }, [isCreateOpen, createForm.ownerId, owners]);

  const [reconcileForm, setReconcileForm] =
    useState<ReconcileForm>(emptyReconcileForm);

  // Upgrade State
  const [upgradeMode, setUpgradeMode] = useState(false);
  const [selectedUpgradeSub, setSelectedUpgradeSub] = useState<SubscriptionItem | null>(null);
  const [upgradeForm, setUpgradeForm] = useState<UpgradeOrderForm>(emptyUpgradeOrderForm);

  // Sprint 15a â€” daftar promotion yang eligible untuk plan yang dipilih di form create order.
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 450);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearch, statusFilter, orderTypeFilter, purchasedFrom, purchasedTo]);

  useEffect(() => {
    setStatusFilter("Semua");
    if (activeTab !== "orders") {
      setOrderTypeFilter("Semua");
    }
  }, [activeTab]);

  const summary = useMemo(
    () =>
      summaryQuery.data ?? {
        totalOrderAmount: 0,
        activeSubscriptions: 0,
        confirmedReconciliations: 0,
        openIssues: 0,
      },
    [summaryQuery.data],
  );

  const planOptions = useMemo(() => {
    const unique = new Map<number, Plan>();

    catalogPlans.forEach((plan) => {
      if (plan.id) unique.set(plan.id, plan);
    });

    orders.forEach((item) => {
      if (item.plan?.id) unique.set(item.plan.id, item.plan);
    });

    return Array.from(unique.values());
  }, [catalogPlans, orders]);

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

  const handleOpenUpgrade = (sub: SubscriptionItem) => {
    setSelectedUpgradeSub(sub);
    setUpgradeForm({
      ...emptyUpgradeOrderForm,
      idempotencyKey: `sub-upgrade-${sub.id}-${Date.now()}`,
    });
    setUpgradeMode(true);
  };

  const handleUpgradeOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) {
      alert("Hanya Admin yang bisa melakukan upgrade subscription.");
      return;
    }
    if (!selectedUpgradeSub?.id) return;
    if (!upgradeForm.planId) {
      alert("Plan Tujuan wajib dipilih.");
      return;
    }

    setLoading(true);
    try {
      await authFetch(`/subscriptions/${selectedUpgradeSub.id}/upgrades`, {
        method: "POST",
        body: JSON.stringify({
          plan_id: Number(upgradeForm.planId),
          closing_id: upgradeForm.closingId ? Number(upgradeForm.closingId) : undefined,
          external_reference: upgradeForm.externalReference || undefined,
          idempotency_key: upgradeForm.idempotencyKey,
          purchased_at: toIsoFromDatetimeLocal(upgradeForm.purchasedAt),
          effective_start_date: upgradeForm.effectiveStartDate,
          note: upgradeForm.note || undefined,
        }),
      });

      setUpgradeMode(false);
      setSelectedUpgradeSub(null);
      setUpgradeForm(emptyUpgradeOrderForm);
      reloadSubscriptionData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal melakukan upgrade.");
    } finally {
      setLoading(false);
    }
  };

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
      reloadSubscriptionData();
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
      reloadSubscriptionData();
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

  const statusOptions = useMemo(() => {
    switch (activeTab) {
      case "orders":
        return ["PENDING_RECONCILIATION", "PAID", "RECONCILED", "REJECTED"];
      case "subscriptions":
        return ["ACTIVE", "EXPIRED", "CANCELED"];
      case "reconciliations":
        return ["CONFIRMED", "PARTIAL_CONFIRM", "REJECTED"];
      case "issues":
        return ["OPEN", "RESOLVED"];
      default:
        return [];
    }
  }, [activeTab]);

  const pagination = pageQuery.data?.pagination ?? {
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
  };
  const totalItems = pagination.total;
  const totalPages = Math.max(1, pagination.totalPages || Math.ceil(totalItems / limit) || 1);
  const pageStart = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const pageEnd = totalItems === 0 ? 0 : Math.min(page * limit, totalItems);
  const activeItemCount =
    activeTab === "orders"
      ? orders.length
      : activeTab === "subscriptions"
        ? subscriptions.length
        : activeTab === "reconciliations"
          ? reconciliations.length
          : issues.length;

  if (upgradeMode && selectedUpgradeSub) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
                <span>Menu</span>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-500">Subscribe</span>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[#C92C1E]">Upgrade</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900">
                Upgrade Paket Langganan
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Lakukan upgrade paket berlangganan untuk sisa masa aktif dari langganan {selectedUpgradeSub.code || selectedUpgradeSub.id}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setUpgradeMode(false);
                  setSelectedUpgradeSub(null);
                }}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
              >
                Kembali
              </button>
            </div>
          </div>

          <div className="p-5 md:p-6 bg-gray-50">
            <form onSubmit={handleUpgradeOrder} className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm max-w-4xl mx-auto">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
                    Paket Tujuan (Plan) <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={selectClass}
                    value={upgradeForm.planId}
                    onChange={(e) => setUpgradeForm({ ...upgradeForm, planId: e.target.value })}
                    required
                  >
                    <option value="">Pilih paket tujuan...</option>
                    {planOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
                    Nama Owner (Akun)
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    value={getOwnerName(selectedUpgradeSub.owner)}
                    disabled
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Pemilik subscription yang akan di-upgrade.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
                    Waktu Pembelian <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={upgradeForm.purchasedAt}
                    onChange={(e) => setUpgradeForm({ ...upgradeForm, purchasedAt: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
                    Tanggal Mulai Efektif <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className={inputClass}
                    value={upgradeForm.effectiveStartDate}
                    onChange={(e) => setUpgradeForm({ ...upgradeForm, effectiveStartDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
                  Referensi Eksternal
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Contoh: INV-UPG-001"
                  value={upgradeForm.externalReference}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, externalReference: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">
                  Catatan Admin
                </label>
                <textarea
                  className={textareaClass}
                  placeholder="Opsional..."
                  rows={2}
                  value={upgradeForm.note}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, note: e.target.value })}
                />
              </div>
              
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl border border-red-100 bg-[#C92C1E] px-6 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {isSubmitting ? "Memproses..." : "Proses Upgrade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

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
        </div>
      </div>

      <QuickInfoCardGrid>
        <QuickInfoCard
          label="Total Order"
          value={formatRupiah(summary.totalOrderAmount)}
          description="Pembelian paket yang dibayar melalui wallet."
          tone="accent"
          silhouette="check-square"
        />
        <QuickInfoCard
          label="Subscription Aktif"
          value={summary.activeSubscriptions}
          description="Owner yang sedang aktif berlangganan."
          tone="emerald"
        />
        <QuickInfoCard
          label="Reconciliation Confirmed"
          value={summary.confirmedReconciliations}
          description="Order yang sudah dipertemukan dengan closing."
          tone="sky"
        />
        <QuickInfoCard
          label="Open Issue"
          value={summary.openIssues}
          description="Antrian issue yang masih butuh review manual."
          tone="rose"
        />
      </QuickInfoCardGrid>

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
              className={`rounded-lg px-5 py-2.5 transition-all ${activeTab === item.key
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
          <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {activeTab === "orders" ? "Daftar Subscription Order" : 
                 activeTab === "subscriptions" ? "Daftar Subscription Aktif" : 
                 activeTab === "reconciliations" ? "Daftar Reconciliation" : 
                 "Daftar Issue Queue"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Pencarian, status, dan tanggal otomatis diterapkan.
              </p>
            </div>
            
            <div className="flex w-full flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-2">
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
              <div className="flex items-center gap-2">
                {activeTab === "subscriptions" ? (
                  <ReportExportButton
                    reportKey="subscriptions"
                    filters={{
                      q: debouncedSearch || undefined,
                      status: statusFilter !== "Semua" ? statusFilter : undefined,
                      date_from: purchasedFrom || undefined,
                      date_to: purchasedTo || undefined,
                    }}
                    label="Export Subscription"
                    loadingLabel="Menyiapkan Export..."
                    successMessage="File subscription sedang diunduh."
                    className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200 active:scale-[0.98]"
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-b border-gray-50 px-6 py-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex flex-col gap-1.5 w-full md:w-auto">
                <span className="text-xs font-semibold text-black">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                >
                  <option value="Semua">Semua Status</option>
                  {statusOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {activeTab === "orders" && (
                <div className="flex flex-col gap-1.5 w-full md:w-auto">
                  <span className="text-xs font-semibold text-black">Tipe Order</span>
                  <select
                    value={orderTypeFilter}
                    onChange={(event) => setOrderTypeFilter(event.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                  >
                    <option value="Semua">Semua Tipe Order</option>
                    <option value="NEW">Baru (NEW)</option>
                    <option value="UPGRADE">Upgrade (UPGRADE)</option>
                  </select>
                </div>
              )}

              {(activeTab === "orders" || activeTab === "subscriptions") && (
                <>
                  <div className="flex flex-col gap-1.5 w-full md:w-auto">
                    <span className="text-xs font-semibold text-black">Tanggal Mulai</span>
                    <input
                      type="date"
                      value={purchasedFrom}
                      onChange={(event) => setPurchasedFrom(event.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 w-full md:w-auto">
                    <span className="text-xs font-semibold text-black">Tanggal Akhir</span>
                    <input
                      type="date"
                      value={purchasedTo}
                      onChange={(event) => setPurchasedTo(event.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-b border-gray-50 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder={
                    activeTab === "orders"
                      ? "Cari order / owner..."
                      : activeTab === "subscriptions"
                        ? "Cari subscription / owner..."
                        : activeTab === "reconciliations"
                          ? "Cari reconciliation / owner..."
                          : "Cari issue / owner..."
                  }
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                />
              </div>
              <ColumnVisibilityControl
                tableId={`${activeTab}-table`}
                storageKey={`column-visibility:subscribe-${activeTab}`}
                buttonLabel="Kolom"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-50">
            {errorMessage && (
              <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                {errorMessage}
              </div>
            )}
          </div>

          {activeTab === "orders" && (
            <div className="relative w-full">
              <div className="flex flex-col">
                <div className="overflow-x-auto">
                  <table id="orders-table" data-column-visibility-manual="true" className="w-full min-w-[1120px] text-left text-xs">
                    <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="w-12 px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds(orders.map(o => o.id));
                              } else {
                                setSelectedOrderIds([]);
                              }
                            }}
                            className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                          />
                        </th>
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
                            colSpan={canReconcile ? 8 : 7}
                            className="px-6 py-10 text-center text-gray-500"
                          >
                            Data pesanan tidak ditemukan.
                          </td>
                        </tr>
                      ) : (
                        orders.map((order) => (
                          <tr
                            key={order.id}
                            className={`transition-colors hover:bg-gray-50 ${selectedOrderIds.includes(order.id) ? "bg-red-50/50" : ""}`}
                          >
                            <td className="w-12 px-4 py-4 text-center align-top">
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.includes(order.id)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSelectedOrderIds(prev =>
                                    checked ? [...prev, order.id] : prev.filter(id => id !== order.id)
                                  );
                                }}
                                className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                              />
                            </td>
                            <td 
                              className="p-3 align-top cursor-pointer"
                              onClick={() => {
                                handleOpenOrderDetail(order);
                              }}
                            >
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
                                  title="Reconcile"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openReconcileModal(order);
                                  }}
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-red-100 bg-red-50 text-[#C92C1E] transition hover:bg-red-100"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "subscriptions" && (
            <div className="relative w-full">
              <div className="flex flex-col">
                <div className="overflow-x-auto">
                  <table id="subscriptions-table" data-column-visibility-manual="true" className="w-full min-w-[900px] text-left text-xs">
                    <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="w-12 px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={subscriptions.length > 0 && selectedSubscriptionIds.length === subscriptions.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSubscriptionIds(subscriptions.map(s => s.id));
                          } else {
                            setSelectedSubscriptionIds([]);
                          }
                        }}
                        className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                      />
                    </th>
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
                        colSpan={8}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        Data langganan tidak ditemukan.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((subscription) => (
                      <tr
                        key={subscription.id}
                        className={`transition-colors hover:bg-gray-50 ${selectedSubscriptionIds.includes(subscription.id) ? "bg-red-50/50" : ""}`}
                      >
                        <td className="w-12 px-4 py-4 text-center align-top">
                          <input
                            type="checkbox"
                            checked={selectedSubscriptionIds.includes(subscription.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedSubscriptionIds(prev =>
                                checked ? [...prev, subscription.id] : prev.filter(id => id !== subscription.id)
                              );
                            }}
                            className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                          />
                        </td>
                        <td 
                          className="p-3 align-top cursor-pointer"
                          onClick={() => {
                            handleOpenSubscriptionDetail(subscription);
                          }}
                        >
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
                          <div className="flex flex-row gap-2 items-center justify-center">
                            <Link
                              href={`/menu/subscribe/${subscription.id}`}
                              title="Detail"
                              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </Link>
                            {String(subscription.status || "").toUpperCase() === "ACTIVE" && isAdmin && (
                              <button
                                type="button"
                                title="Upgrade"
                                onClick={() => handleOpenUpgrade(subscription)}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-700"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reconciliations" && (
            <div className="relative w-full">
              <div className="flex flex-col">
                <div className="overflow-x-auto">
                  <table id="reconciliations-table" data-column-visibility-manual="true" className="w-full min-w-[920px] text-left text-xs">
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
                            {reconciliation.match_type || "-"} â€¢{" "}
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
              </div>
            </div>
          )}

          {activeTab === "issues" && (
            <div className="relative w-full">
              <div className="flex flex-col">
                <div className="overflow-x-auto">
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
              </div>
            </div>
          )}

          {true && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="text-xs font-medium text-gray-500">
                  Menampilkan{" "}
                  <span className="font-bold text-gray-900">{pageStart}</span>{" "}
                  hingga{" "}
                  <span className="font-bold text-gray-900">{pageEnd}</span>{" "}
                  dari{" "}
                  <span className="font-bold text-gray-900">{totalItems}</span>{" "}
                  data
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-[#C92C1E] focus:outline-none"
                  >
                    {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </div>
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
                  )} â€” ${getOwnerName(selectedOrderDetail.order.owner)}`}
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
                  label="Jenis Order"
                  value={getOrderTypeLabel(selectedOrderDetail.order.order_type)}
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
                  label="Sales"
                  value={selectedOrderDetail.order.sales?.name || "-"}
                />
                <InfoItem
                  label="Supervisor"
                  value={selectedOrderDetail.order.supervisor?.name || "-"}
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
                  Order melebihi saldo aplikasi sebesar{" "}
                  {formatRupiah(selectedOrderDetail.order.balance_shortfall_amount)}
                </p>
              )}
            </div>
          )}

          {selectedOrderDetail?.order?.order_type === "UPGRADE" &&
            selectedOrderDetail.order.upgrade && (
              <div className="rounded-[28px] border border-amber-200 bg-amber-50/70 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">
                  Histori Upgrade
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                  <InfoItem
                    label="Subscription Sumber"
                    value={
                      selectedOrderDetail.order.source_subscription?.code ||
                      `SUB-${selectedOrderDetail.order.source_subscription?.id || "-"}`
                    }
                  />
                  <InfoItem
                    label="Paket Sebelumnya"
                    value={
                      selectedOrderDetail.order.upgrade.previous_package?.name ||
                      selectedOrderDetail.order.upgrade.previous_package?.code ||
                      "-"
                    }
                  />
                  <InfoItem
                    label="Plan Sebelumnya"
                    value={
                      selectedOrderDetail.order.upgrade.previous_plan?.name ||
                      selectedOrderDetail.order.upgrade.previous_plan?.code ||
                      "-"
                    }
                  />
                  <InfoItem
                    label="Mulai Efektif Upgrade"
                    value={formatTanggalPendek(
                      selectedOrderDetail.order.upgrade.effective_start_date,
                    )}
                  />
                  <InfoItem
                    label="Akhir Masa Aktif Lama"
                    value={formatTanggalPendek(
                      selectedOrderDetail.order.upgrade.original_end_date,
                    )}
                  />
                  <InfoItem
                    label="Sisa Hari yang Ditagihkan"
                    value={`${selectedOrderDetail.order.upgrade.remaining_days || 0} hari`}
                  />
                  <InfoItem
                    label="Harga Harian Prorata"
                    value={formatRupiah(
                      selectedOrderDetail.order.upgrade.daily_price,
                    )}
                  />
                  <InfoItem
                    label="Nominal Upgrade"
                    value={formatRupiah(selectedOrderDetail.order.final_amount)}
                  />
                </div>
              </div>
            )}

          {selectedOrderDetail?.subscription && (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Subscription Hasil Order
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                <InfoItem
                  label="Kode Subscription"
                  value={
                    selectedOrderDetail.subscription.code ||
                    `SUB-${selectedOrderDetail.subscription.id}`
                  }
                />
                <InfoItem
                  label="Status Subscription"
                  value={selectedOrderDetail.subscription.status || "-"}
                />
                <InfoItem
                  label="Active From"
                  value={formatTanggalPendek(
                    selectedOrderDetail.subscription.active_from,
                  )}
                />
                <InfoItem
                  label="Active Until"
                  value={formatTanggalPendek(
                    selectedOrderDetail.subscription.active_until,
                  )}
                />
              </div>

              {selectedOrderDetail.period && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Period Pertama
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                    <InfoItem
                      label="Start Date"
                      value={formatTanggalPendek(
                        selectedOrderDetail.period.start_date,
                      )}
                    />
                    <InfoItem
                      label="End Date"
                      value={formatTanggalPendek(
                        selectedOrderDetail.period.end_date,
                      )}
                    />
                    <InfoItem
                      label="Durasi"
                      value={`${selectedOrderDetail.period.duration_days || 0} hari`}
                    />
                    <InfoItem
                      label="Status Period"
                      value={selectedOrderDetail.period.status || "-"}
                    />
                  </div>
                </div>
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
                <InfoItem
                  label="Admin Final Amount"
                  value={formatRupiah(
                    selectedOrderDetail.reconciliation.admin_final_amount,
                  )}
                />
                <InfoItem
                  label="Admin Tenure"
                  value={
                    selectedOrderDetail.reconciliation.admin_tenure_months
                      ? `${selectedOrderDetail.reconciliation.admin_tenure_months} bulan`
                      : "-"
                  }
                />
              </div>

              {selectedOrderDetail.reconciliation.note && (
                <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
                  {selectedOrderDetail.reconciliation.note}
                </p>
              )}
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
                  )} â€” ${getOwnerName(
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
                  value={`${selectedSubscriptionDetail.subscription.total_duration_days ||
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

                <OwnerSearchPicker
                  value={selectedOwner}
                  onChange={(owner) => {
                    setSelectedOwner(owner);
                    setCreateForm((prev) => ({
                      ...prev,
                      ownerId: owner ? String(owner.id) : "",
                    }));
                  }}
                />
              </label>

              {selectedOwner && (() => {
                const matchedOwnerOption = ownerOptions.find(o => o.ownerId === selectedOwner.id);
                if (matchedOwnerOption) {
                  return (
                    <p className="mt-2.5 text-xs font-bold text-slate-600">
                      Saldo Saat Ini: <span className="text-[#C92C1E]">{formatRupiah(matchedOwnerOption.balance)}</span>
                    </p>
                  );
                }
                return null;
              })()}
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
              disabled={isSubmitting}
              className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Order"}
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
              disabled={isSubmitting}
              className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Reconciliation"}
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
