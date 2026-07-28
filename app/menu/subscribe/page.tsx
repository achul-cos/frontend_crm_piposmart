"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

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
};

type ReconcileForm = {
  orderId: string;
  action: "CONFIRM" | "REJECT";
  closingId: string;
  note: string;
};

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
};

const emptyReconcileForm: ReconcileForm = {
  orderId: "",
  action: "CONFIRM",
  closingId: "",
  note: "",
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
    const data = payload as any;

    if (Array.isArray(data.items)) return data.items as T[];
    if (Array.isArray(data.rows)) return data.rows as T[];
    if (Array.isArray(data.data)) return data.data as T[];
  }

  return [];
};

const getStatusClass = (status?: string) => {
  const normalized = String(status || "").toUpperCase();

  if (["ACTIVE", "PAID", "CONFIRMED", "RECONCILED"].includes(normalized)) {
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

export default function SubscriptionPage() {
  usePageTitle("Subscribe");
  const [orders, setOrders] = useState<SubscriptionOrderItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>([]);
  const [issues, setIssues] = useState<ReconciliationIssueItem[]>([]);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "subscriptions" | "reconciliations" | "issues">("orders");
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
  const [createForm, setCreateForm] = useState<CreateOrderForm>(emptyCreateOrderForm);
  const [reconcileForm, setReconcileForm] = useState<ReconcileForm>(emptyReconcileForm);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<SubscriptionOrderDetailResponse | null>(null);
  const [selectedSubscriptionDetail, setSelectedSubscriptionDetail] = useState<SubscriptionDetailResponse | null>(null);
  const [detailTitle, setDetailTitle] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [userRole, setUserRole] = useState("");

  const apiUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
      : "http://localhost:8080";

  useEffect(() => {
    setIsMounted(true);
    setUserRole(localStorage.getItem("piposmart_user_role") || "");
  }, []);

  const normalizedRole = userRole.toLowerCase();
  const isAdmin = isMounted && normalizedRole === "admin";
  const isSupervisor = isMounted && normalizedRole === "supervisor";
  const canReconcile = isAdmin || isSupervisor;

  const authFetch = async <T,>(path: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("piposmart_access_token");

    const response = await fetch(`${apiUrl}/api/v1${path}`, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const json = (await response.json().catch(() => ({}))) as ApiResponse<T>;

    if (!response.ok) {
      throw new Error(json.error?.message || `Request gagal (${response.status})`);
    }

    return json;
  };

  const buildQuery = (params: Record<string, string>) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== "Semua") query.set(key, value);
    });

    const text = query.toString();
    return text ? `?${text}` : "";
  };

  const loadSubscriptionData = async () => {
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

      const [orderResult, subscriptionResult, reconciliationResult, issueResult, walletResult, ownerResult] =
        await Promise.allSettled([
          authFetch<SubscriptionOrderItem[] | { items?: SubscriptionOrderItem[]; rows?: SubscriptionOrderItem[] }>(
            `/subscription-orders${orderQuery}`,
          ),
          authFetch<SubscriptionItem[] | { items?: SubscriptionItem[]; rows?: SubscriptionItem[] }>(
            `/subscriptions${subscriptionQuery}`,
          ),
          authFetch<ReconciliationItem[] | { items?: ReconciliationItem[]; rows?: ReconciliationItem[] }>(
            `/reconciliations${reconciliationQuery}`,
          ),
          authFetch<ReconciliationIssueItem[] | { items?: ReconciliationIssueItem[]; rows?: ReconciliationIssueItem[] }>(
            `/reconciliation-issues${issueQuery}`,
          ),
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
        setSubscriptions(normalizeList<SubscriptionItem>(subscriptionResult.value.data));
      } else {
        setSubscriptions([]);
      }

      if (reconciliationResult.status === "fulfilled") {
        setReconciliations(normalizeList<ReconciliationItem>(reconciliationResult.value.data));
      } else {
        setReconciliations([]);
      }

      if (issueResult.status === "fulfilled") {
        setIssues(normalizeList<ReconciliationIssueItem>(issueResult.value.data));
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

      const firstError = [orderResult, subscriptionResult, reconciliationResult, issueResult, walletResult, ownerResult].find(
        (result) => result.status === "rejected",
      ) as PromiseRejectedResult | undefined;

      if (firstError) {
        setErrorMessage(firstError.reason instanceof Error ? firstError.reason.message : "Sebagian data subscription gagal dimuat.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mengambil data subscription.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 450);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadSubscriptionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, purchasedFrom, purchasedTo, reloadKey]);

  const summary = useMemo(() => {
    const totalOrderAmount = orders.reduce((total, item) => total + Number(item.final_amount || 0), 0);
    const activeSubscriptions = subscriptions.filter((item) => String(item.status || "").toUpperCase() === "ACTIVE");
    const confirmedReconciliations = reconciliations.filter(
      (item) => String(item.status || "").toUpperCase() === "CONFIRMED",
    );

    return {
      totalOrderAmount,
      activeSubscriptions: activeSubscriptions.length,
      confirmedReconciliations: confirmedReconciliations.length,
      openIssues: issues.filter((item) => String(item.status || "").toUpperCase() === "OPEN").length,
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

  const handleCreateOrder = async (event: React.FormEvent) => {
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
          closing_id: createForm.closingId ? Number(createForm.closingId) : undefined,
          external_reference: createForm.externalReference || undefined,
          idempotency_key:
            createForm.idempotencyKey ||
            `subscription-order-${createForm.ownerId}-${Date.now()}`,
          purchased_at: toIsoFromDatetimeLocal(createForm.purchasedAt),
          subscription_start_date: createForm.subscriptionStartDate,
          note: createForm.note || undefined,
        }),
      });

      setIsCreateOpen(false);
      setCreateForm(emptyCreateOrderForm);
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal membuat subscription order.");
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
    });
    setIsReconcileOpen(true);
  };

  const handleReconcile = async (event: React.FormEvent) => {
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

    setLoading(true);

    try {
      await authFetch(`/subscription-orders/${reconcileForm.orderId}/reconcile`, {
        method: "POST",
        body: JSON.stringify({
          action: reconcileForm.action,
          closing_id: reconcileForm.closingId ? Number(reconcileForm.closingId) : undefined,
          note: reconcileForm.note || undefined,
        }),
      });

      setIsReconcileOpen(false);
      setReconcileForm(emptyReconcileForm);
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal melakukan reconciliation.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOrderDetail = async (order: SubscriptionOrderItem) => {
    setLoading(true);

    try {
      const response = await authFetch<SubscriptionOrderDetailResponse | SubscriptionOrderItem>(
        `/subscription-orders/${order.id}`,
      );
      const data = response.data as SubscriptionOrderDetailResponse | SubscriptionOrderItem | undefined;
      const detail = data && "order" in data ? data : { order: data as SubscriptionOrderItem };

      setSelectedOrderDetail(detail);
      setSelectedSubscriptionDetail(null);
      setDetailTitle(`Detail Order ${order.code || order.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal mengambil detail subscription order.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubscriptionDetail = async (subscription: SubscriptionItem) => {
    setLoading(true);

    try {
      const response = await authFetch<SubscriptionDetailResponse | SubscriptionItem>(
        `/subscriptions/${subscription.id}`,
      );
      const data = response.data as SubscriptionDetailResponse | SubscriptionItem | undefined;
      const detail = data && "subscription" in data ? data : { subscription: data as SubscriptionItem };

      setSelectedSubscriptionDetail(detail);
      setSelectedOrderDetail(null);
      setDetailTitle(`Detail Subscription ${subscription.code || subscription.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal mengambil detail subscription.");
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = ["PENDING_RECONCILIATION", "PAID", "RECONCILED", "REJECTED"];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#C92C1E]">Subscribe</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Manajemen Subscribe</h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola pembelian paket dari saldo wallet, subscription aktif, reconciliation, dan issue queue tanpa double counting revenue.
            </p>
          </div>

          {isMounted && isAdmin && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-red-700 shadow-sm shadow-red-200"
            >
              + Buat Order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#C92C1E] to-[#A82216] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">Total Order</p>
            <h2 className="text-3xl font-black">{formatRupiah(summary.totalOrderAmount)}</h2>
            <p className="mt-1 text-xs font-medium text-red-100/80">Pembelian paket dari wallet</p>
          </div>
          <svg className="absolute -bottom-4 -right-4 w-28 h-28 text-white opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3v-6m-3 6v-9m-2 9V7a2 2 0 012-2h6a2 2 0 012 2v13a2 2 0 01-2 2H8a2 2 0 01-2-2z" />
          </svg>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-[#C92C1E] transition-colors">
          <div className="relative z-10">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Subscription Aktif</p>
            <h2 className="text-3xl font-black text-gray-900">{summary.activeSubscriptions}</h2>
            <p className="mt-1 text-xs font-medium text-gray-400">Owner aktif berlangganan</p>
          </div>
          <div className="absolute top-0 right-0 p-5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-[#C92C1E] transition-colors">
          <div className="relative z-10">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Reconciliation Confirmed</p>
            <h2 className="text-3xl font-black text-gray-900">{summary.confirmedReconciliations}</h2>
            <p className="mt-1 text-xs font-medium text-gray-400">Order sudah dipertemukan dengan closing</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-[#C92C1E] transition-colors">
          <div className="relative z-10">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Open Issue</p>
            <h2 className="text-3xl font-black text-gray-900">{summary.openIssues}</h2>
            <p className="mt-1 text-xs font-medium text-gray-400">Hanging order / manual review</p>
          </div>
          <div className="absolute top-0 right-0 p-5">
            <span className="flex h-3 w-3 relative">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="flex text-sm font-bold">
          {[
            { key: "orders", label: "Subscription Order" },
            { key: "subscriptions", label: "Subscription Aktif" },
            { key: "reconciliations", label: "Reconciliation" },
            { key: "issues", label: "Issue Queue" },
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

      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
          <div>
            <h2 className="text-sm font-black text-gray-900">Filter Subscription</h2>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Pencarian, status, dan tanggal otomatis diterapkan tanpa tombol terapkan.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari order / owner"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] min-w-[200px] text-gray-700"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] text-gray-700"
            >
              <option value="Semua">Semua Status</option>
              {statusOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <input
              type="date"
              value={purchasedFrom}
              onChange={(event) => setPurchasedFrom(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] text-gray-700"
            />

            <input
              type="date"
              value={purchasedTo}
              onChange={(event) => setPurchasedTo(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] text-gray-700"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mx-4 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
            {errorMessage}
          </div>
        )}

        <p className="px-4 pt-4 text-[11px] font-bold text-gray-400">
          Klik baris order atau subscription untuk membuka detail. Reconciliation dapat dilakukan Admin/Supervisor.
        </p>
        <div className="h-2" />

        {activeTab === "orders" && (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-y border-gray-200">
                <tr>
                  <th className="p-3 font-black">Order</th>
                  <th className="p-3 font-black">Owner</th>
                  <th className="p-3 font-black">Plan</th>
                  <th className="p-3 font-black">Status</th>
                  <th className="p-3 font-black">Purchased</th>
                  <th className="p-3 text-right font-black">Amount</th>
                  {canReconcile && <th className="p-3 text-center font-black">Reconcile</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={canReconcile ? 7 : 6} className="p-8 text-center font-bold text-gray-400">
                      Data subscription order tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => handleOpenOrderDetail(order)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      title="Klik baris untuk melihat detail order"
                    >
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{order.code || `ORDER-${order.id}`}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          Closing: {order.closing?.code || order.closing?.id || "-"}
                        </p>
                      </td>
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{getOwnerName(order.owner)}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">{getOwnerCode(order.owner)}</p>
                      </td>
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{order.plan?.name || "-"}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          {order.duration_days || 0} hari
                        </p>
                      </td>
                      <td className="p-3 align-top">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${getStatusClass(order.status)}`}>
                          {order.status || "-"}
                        </span>
                      </td>
                      <td className="p-3 align-top font-bold text-gray-600">
                        <p>{formatTanggal(order.purchased_at)}</p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          Start: {formatTanggalPendek(order.subscription_start_date)}
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
              <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-y border-gray-200">
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
                    <td colSpan={7} className="p-8 text-center font-bold text-gray-400">
                      Data subscription tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((subscription) => (
                    <tr
                      key={subscription.id}
                      onClick={() => handleOpenSubscriptionDetail(subscription)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      title="Klik baris untuk melihat detail subscription"
                    >
                      <td className="p-3 align-top">
                        <Link
                          href={`/menu/subscribe/${subscription.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="font-black text-gray-900 hover:text-[#C92C1E] transition-colors"
                        >
                          {subscription.code || `SUB-${subscription.id}`}
                        </Link>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          Order: {subscription.order?.code || subscription.order?.id || "-"}
                        </p>
                      </td>
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{getOwnerName(subscription.owner)}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">{getOwnerCode(subscription.owner)}</p>
                      </td>
                      <td className="p-3 align-top font-bold text-gray-700">
                        {subscription.plan?.name || "-"}
                      </td>
                      <td className="p-3 align-top">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${getStatusClass(subscription.status)}`}>
                          {subscription.status || "-"}
                        </span>
                      </td>
                      <td className="p-3 align-top font-bold text-gray-600">
                        {formatTanggalPendek(subscription.active_from)} - {formatTanggalPendek(subscription.active_until)}
                      </td>
                      <td className="p-3 text-right align-top font-black text-[#C92C1E]">
                        {subscription.total_duration_days || 0} hari
                      </td>
                      <td
                        className="p-3 align-top text-center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/menu/subscribe/${subscription.id}`}
                            className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                            title="Lihat Detail Subscribe"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                        </div>
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
              <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-y border-gray-200">
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
                    <td colSpan={6} className="p-8 text-center font-bold text-gray-400">
                      Data reconciliation tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  reconciliations.map((reconciliation) => (
                    <tr key={reconciliation.id} className="transition-colors hover:bg-gray-50">
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{reconciliation.code || `REC-${reconciliation.id}`}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          {reconciliation.match_type || "-"} • {formatTanggal(reconciliation.confirmed_at || reconciliation.created_at)}
                        </p>
                      </td>
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{getOwnerName(reconciliation.owner)}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">{getOwnerCode(reconciliation.owner)}</p>
                      </td>
                      <td className="p-3 align-top font-bold text-gray-700">
                        {reconciliation.order?.code || reconciliation.order?.id || "-"}
                      </td>
                      <td className="p-3 align-top font-bold text-gray-700">
                        {reconciliation.closing?.code || reconciliation.closing?.id || "-"}
                      </td>
                      <td className="p-3 align-top">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${getStatusClass(reconciliation.status)}`}>
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
              <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-y border-gray-200">
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
                    <td colSpan={6} className="p-8 text-center font-bold text-gray-400">
                      Data issue tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <tr key={issue.id} className="transition-colors hover:bg-gray-50">
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{issue.code || `ISSUE-${issue.id}`}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] font-bold text-gray-400">
                          {issue.description || "-"}
                        </p>
                      </td>
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{getOwnerName(issue.owner)}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">{getOwnerCode(issue.owner)}</p>
                      </td>
                      <td className="p-3 align-top font-bold text-gray-700">
                        {issue.order?.code || issue.order?.id || "-"}
                      </td>
                      <td className="p-3 align-top font-bold text-gray-700">{issue.issue_type || "-"}</td>
                      <td className="p-3 align-top">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${getStatusClass(issue.status)}`}>
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

      {(selectedOrderDetail || selectedSubscriptionDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-3xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 bg-[#C92C1E] p-5 text-white">
              <div>
                <h2 className="text-xl font-black">{detailTitle}</h2>
                <p className="mt-1 text-xs font-medium text-white/80">
                  Detail data dari endpoint Sprint 10.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderDetail(null);
                  setSelectedSubscriptionDetail(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg font-black"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              {selectedOrderDetail?.order && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="text-sm font-black text-gray-900">Subscription Order</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                    <InfoItem label="Kode Order" value={selectedOrderDetail.order.code || `ORD-${selectedOrderDetail.order.id}`} />
                    <InfoItem label="Owner" value={`${getOwnerCode(selectedOrderDetail.order.owner)} — ${getOwnerName(selectedOrderDetail.order.owner)}`} />
                    <InfoItem label="Plan" value={selectedOrderDetail.order.plan?.name || selectedOrderDetail.order.plan?.code || "-"} />
                    <InfoItem label="Status" value={selectedOrderDetail.order.status || "-"} />
                    <InfoItem label="Purchased At" value={formatTanggal(selectedOrderDetail.order.purchased_at)} />
                    <InfoItem label="Start Date" value={formatTanggalPendek(selectedOrderDetail.order.subscription_start_date)} />
                    <InfoItem label="Duration" value={`${selectedOrderDetail.order.duration_days || 0} hari`} />
                    <InfoItem label="Final Amount" value={formatRupiah(selectedOrderDetail.order.final_amount)} />
                    <InfoItem label="External Ref" value={selectedOrderDetail.order.external_reference || "-"} />
                    <InfoItem label="Closing" value={selectedOrderDetail.order.closing?.code || String(selectedOrderDetail.order.closing?.id || "-")} />
                  </div>
                </div>
              )}

              {selectedOrderDetail?.reconciliation && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="text-sm font-black text-gray-900">Reconciliation</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                    <InfoItem label="Kode" value={selectedOrderDetail.reconciliation.code || `REC-${selectedOrderDetail.reconciliation.id}`} />
                    <InfoItem label="Status" value={selectedOrderDetail.reconciliation.status || "-"} />
                    <InfoItem label="Match Type" value={selectedOrderDetail.reconciliation.match_type || "-"} />
                    <InfoItem label="Amount Difference" value={formatRupiah(selectedOrderDetail.reconciliation.amount_difference)} />
                  </div>
                </div>
              )}

              {selectedOrderDetail?.issue && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <h3 className="text-sm font-black text-[#C92C1E]">Issue</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                    <InfoItem label="Kode" value={selectedOrderDetail.issue.code || `ISSUE-${selectedOrderDetail.issue.id}`} />
                    <InfoItem label="Type" value={selectedOrderDetail.issue.issue_type || "-"} />
                    <InfoItem label="Status" value={selectedOrderDetail.issue.status || "-"} />
                    <InfoItem label="Detected" value={formatTanggal(selectedOrderDetail.issue.detected_at || selectedOrderDetail.issue.created_at)} />
                  </div>
                  {selectedOrderDetail.issue.description && (
                    <p className="mt-3 rounded-2xl border border-red-100 bg-white p-3 text-xs font-bold text-gray-600">
                      {selectedOrderDetail.issue.description}
                    </p>
                  )}
                </div>
              )}

              {selectedSubscriptionDetail?.subscription && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="text-sm font-black text-gray-900">Subscription</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                    <InfoItem label="Kode Subscription" value={selectedSubscriptionDetail.subscription.code || `SUB-${selectedSubscriptionDetail.subscription.id}`} />
                    <InfoItem label="Owner" value={`${getOwnerCode(selectedSubscriptionDetail.subscription.owner)} — ${getOwnerName(selectedSubscriptionDetail.subscription.owner)}`} />
                    <InfoItem label="Plan" value={selectedSubscriptionDetail.subscription.plan?.name || selectedSubscriptionDetail.subscription.plan?.code || "-"} />
                    <InfoItem label="Status" value={selectedSubscriptionDetail.subscription.status || "-"} />
                    <InfoItem label="Active From" value={formatTanggalPendek(selectedSubscriptionDetail.subscription.active_from)} />
                    <InfoItem label="Active Until" value={formatTanggalPendek(selectedSubscriptionDetail.subscription.active_until)} />
                    <InfoItem label="Duration" value={`${selectedSubscriptionDetail.subscription.total_duration_days || 0} hari`} />
                    <InfoItem label="Order" value={selectedSubscriptionDetail.subscription.order?.code || String(selectedSubscriptionDetail.subscription.order?.id || "-")} />
                  </div>
                </div>
              )}

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderDetail(null);
                    setSelectedSubscriptionDetail(null);
                  }}
                  className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white transition hover:bg-[#A82216]"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && isMounted && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="bg-[#C92C1E] p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">Buat Subscription Order</h2>
                  <p className="mt-1 text-xs font-medium text-white/80">
                    Admin membuat pembelian paket dari saldo wallet owner.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg font-black"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4 p-5">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Owner
                </span>
                <select
                  value={createForm.ownerId}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, ownerId: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                >
                  <option value="">Pilih Owner</option>
                  {ownerOptions.map((owner) => (
                    <option key={owner.ownerId} value={owner.ownerId}>
                      {owner.ownerCode} — {owner.ownerName} — saldo {formatRupiah(owner.balance)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Plan ID
                  </span>
                  <input
                    value={createForm.planId}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, planId: event.target.value.replace(/\D/g, "") }))}
                    placeholder="Contoh: 1"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    list="subscription-plan-options"
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

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Closing ID
                  </span>
                  <input
                    value={createForm.closingId}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, closingId: event.target.value.replace(/\D/g, "") }))}
                    placeholder="Opsional untuk auto reconciliation"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Purchased At
                  </span>
                  <input
                    type="datetime-local"
                    value={createForm.purchasedAt}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, purchasedAt: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Subscription Start
                  </span>
                  <input
                    type="date"
                    value={createForm.subscriptionStartDate}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, subscriptionStartDate: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    External Reference
                  </span>
                  <input
                    value={createForm.externalReference}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, externalReference: event.target.value }))}
                    placeholder="Contoh: SUB-ORDER-001"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Idempotency Key
                  </span>
                  <input
                    value={createForm.idempotencyKey}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, idempotencyKey: event.target.value }))}
                    placeholder="Boleh kosong jika external reference unik"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Catatan
                  </span>
                  <textarea
                    value={createForm.note}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, note: event.target.value }))}
                    rows={3}
                    placeholder="Catatan subscription order"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-xs font-black text-gray-500 transition hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white transition hover:bg-[#A82216] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {loading ? "Menyimpan..." : "Simpan Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isReconcileOpen && canReconcile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="bg-[#C92C1E] p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">Manual Reconciliation</h2>
                  <p className="mt-1 text-xs font-medium text-white/80">
                    Hubungkan order subscription dengan closing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReconcileOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg font-black"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleReconcile} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Order ID
                  </span>
                  <input
                    value={reconcileForm.orderId}
                    readOnly
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500 outline-none"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
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
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  >
                    <option value="CONFIRM">CONFIRM</option>
                    <option value="REJECT">REJECT</option>
                  </select>
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
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
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Catatan
                  </span>
                  <textarea
                    value={reconcileForm.note}
                    onChange={(event) => setReconcileForm((prev) => ({ ...prev, note: event.target.value }))}
                    rows={3}
                    placeholder="Catatan reconciliation"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsReconcileOpen(false)}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-xs font-black text-gray-500 transition hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white transition hover:bg-[#A82216] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {loading ? "Menyimpan..." : "Simpan Reconciliation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 break-words text-xs font-black text-gray-900">{value}</p>
    </div>
  );
}
