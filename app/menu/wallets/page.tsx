"use client";

import { useEffect, useMemo, useState } from "react";

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

type WalletOwner = {
  id?: number;
  code?: string;
  name?: string;
  kode_owner?: string;
  nama_owner?: string;
};

type WalletItem = {
  id: number;
  owner_id?: number;
  owner?: WalletOwner;
  account_code?: string;
  code?: string;
  currency?: string;
  balance?: string;
  ledger_balance?: string;
  status?: string;
};

type PaymentItem = {
  id: number;
  owner_id?: number;
  owner?: WalletOwner;
  code?: string;
  payment_type?: string;
  payment_channel?: string;
  channel?: string;
  external_reference?: string;
  amount?: string;
  currency?: string;
  status?: string;
  paid_at?: string;
  created_at?: string;
  note?: string;
};

type LedgerItem = {
  id: number;
  owner_id?: number;
  owner?: WalletOwner;
  code?: string;
  transaction_type?: string;
  direction?: string;
  source_type?: string;
  source_reference?: string;
  external_reference?: string;
  amount?: string;
  balance_after?: string;
  occurred_at?: string;
  created_at?: string;
  note?: string;
};

type TopUpForm = {
  ownerId: string;
  amount: string;
  paymentChannel: string;
  externalReference: string;
  idempotencyKey: string;
  paidAt: string;
  note: string;
};

type WalletActionType = "topup" | "debit" | "adjustment" | "refund";

type WalletActionForm = {
  ownerId: string;
  amount: string;
  paymentChannel: string;
  direction: "CREDIT" | "DEBIT";
  sourceReference: string;
  externalReference: string;
  idempotencyKey: string;
  occurredAt: string;
  paidAt: string;
  note: string;
};

type PaymentDetailResponse = {
  payment?: PaymentItem;
  transaction?: LedgerItem;
  wallet?: WalletItem;
};

type WalletDetailResponse = WalletItem | {
  wallet?: WalletItem;
  transactions?: LedgerItem[];
};

const getTodayDatetimeLocal = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
};

const emptyTopUpForm: TopUpForm = {
  ownerId: "",
  amount: "",
  paymentChannel: "MANUAL",
  externalReference: "",
  idempotencyKey: "",
  paidAt: getTodayDatetimeLocal(),
  note: "",
};

const getEmptyWalletActionForm = (ownerId = ""): WalletActionForm => ({
  ownerId,
  amount: "",
  paymentChannel: "MANUAL",
  direction: "CREDIT",
  sourceReference: "",
  externalReference: "",
  idempotencyKey: "",
  occurredAt: getTodayDatetimeLocal(),
  paidAt: getTodayDatetimeLocal(),
  note: "",
});

const walletActionLabel: Record<WalletActionType, string> = {
  topup: "Top Up",
  debit: "Debit",
  adjustment: "Adjustment",
  refund: "Refund",
};

const getWalletActionDescription = (type: WalletActionType) => {
  if (type === "topup") return "Mencatat pembayaran top up dan menambah saldo wallet owner.";
  if (type === "debit") return "Mencatat saldo terpakai dan mengurangi saldo wallet owner.";
  if (type === "adjustment") return "Koreksi saldo wallet, bisa CREDIT atau DEBIT.";
  return "Mencatat refund saldo keluar dari wallet owner.";
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

const parseRupiahInput = (value: string) => {
  return String(value || "").replace(/\D/g, "");
};

const formatNumberInput = (value: string) => {
  const number = Number(parseRupiahInput(value));
  if (!number) return "";

  return new Intl.NumberFormat("id-ID").format(number);
};

const toDecimalString = (value: string) => {
  const number = parseRupiahInput(value);
  if (!number) return "0.00";

  return `${number}.00`;
};

const toIsoFromDatetimeLocal = (value: string) => {
  if (!value) return new Date().toISOString();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();

  return date.toISOString();
};

const getOwnerName = (owner?: WalletOwner) => {
  if (!owner) return "-";

  return owner.name || owner.nama_owner || "-";
};

const getOwnerCode = (owner?: WalletOwner) => {
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

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [owners, setOwners] = useState<WalletOwner[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [ledgers, setLedgers] = useState<LedgerItem[]>([]);
  const [activeTab, setActiveTab] = useState<"payments" | "wallets" | "ledger">("payments");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paidFrom, setPaidFrom] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [channelFilter, setChannelFilter] = useState("Semua");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<TopUpForm>(emptyTopUpForm);
  const [walletActionType, setWalletActionType] = useState<WalletActionType>("topup");
  const [walletActionForm, setWalletActionForm] = useState<WalletActionForm>(getEmptyWalletActionForm());
  const [isWalletActionOpen, setIsWalletActionOpen] = useState(false);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<PaymentDetailResponse | null>(null);
  const [selectedWalletDetail, setSelectedWalletDetail] = useState<WalletItem | null>(null);
  const [selectedOwnerLedger, setSelectedOwnerLedger] = useState<LedgerItem[]>([]);
  const [detailTitle, setDetailTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const apiUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
      : "http://localhost:8080";

  const [isMounted, setIsMounted] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    setIsMounted(true);
    setUserRole(localStorage.getItem("piposmart_user_role") || "");
  }, []);

  const isAdmin = isMounted && userRole.toLowerCase() === "admin";

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

  const loadTopUpData = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const paymentQuery = buildQuery({
        q: debouncedSearch,
        payment_type: "TOPUP",
        channel: channelFilter,
        paid_from: paidFrom,
        paid_to: paidTo,
        sort: "-paid_at",
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

      const ledgerQuery = buildQuery({
        q: debouncedSearch,
        sort: "-occurred_at",
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

      const [paymentResult, walletResult, ledgerResult, ownerResult] = await Promise.allSettled([
        authFetch<PaymentItem[] | { items?: PaymentItem[]; rows?: PaymentItem[] }>(
          `/wallet-payments${paymentQuery}`,
        ),
        authFetch<WalletItem[] | { items?: WalletItem[]; rows?: WalletItem[] }>(
          `/wallets${walletQuery}`,
        ),
        authFetch<LedgerItem[] | { items?: LedgerItem[]; rows?: LedgerItem[] }>(
          `/wallet-transactions${ledgerQuery}`,
        ),
        authFetch<WalletOwner[] | { items?: WalletOwner[]; rows?: WalletOwner[] }>(
          `/owners${ownersQuery}`,
        ),
      ]);

      if (paymentResult.status === "fulfilled") {
        setPayments(normalizeList<PaymentItem>(paymentResult.value.data));
      } else {
        setPayments([]);
      }

      if (walletResult.status === "fulfilled") {
        setWallets(normalizeList<WalletItem>(walletResult.value.data));
      } else {
        setWallets([]);
      }

      if (ledgerResult.status === "fulfilled") {
        setLedgers(normalizeList<LedgerItem>(ledgerResult.value.data));
      } else {
        setLedgers([]);
      }

      if (ownerResult.status === "fulfilled") {
        setOwners(normalizeList<WalletOwner>(ownerResult.value.data));
      } else {
        setOwners([]);
      }

      const firstError = [paymentResult, walletResult, ledgerResult, ownerResult].find(
        (result) => result.status === "rejected",
      ) as PromiseRejectedResult | undefined;

      if (firstError) {
        setErrorMessage(firstError.reason instanceof Error ? firstError.reason.message : "Sebagian data top up gagal dimuat.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mengambil data top up.");
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
    loadTopUpData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, channelFilter, paidFrom, paidTo, reloadKey]);

  const summary = useMemo(() => {
    const totalTopUp = payments.reduce((total, item) => total + Number(item.amount || 0), 0);
    const totalWalletBalance = wallets.reduce((total, item) => total + Number(item.balance || 0), 0);
    const paidPayments = payments.filter((item) => (item.status || "").toUpperCase() === "PAID");

    return {
      totalTopUp,
      totalWalletBalance,
      paidCount: paidPayments.length,
      totalPayments: payments.length,
      totalLedger: ledgers.length,
    };
  }, [payments, wallets, ledgers]);

  const channelOptions = useMemo(() => {
    const channels = payments
      .map((item) => item.payment_channel || item.channel || "")
      .filter(Boolean);

    return Array.from(new Set(["MANUAL", "MIDTRANS", ...channels]));
  }, [payments]);

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

  const handleOpenWalletAction = (type: WalletActionType, ownerId = "") => {
    setWalletActionType(type);
    setWalletActionForm(getEmptyWalletActionForm(ownerId));
    setIsWalletActionOpen(true);
  };

  const handleCreateWalletAction = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isAdmin) {
      alert("Hanya Admin yang bisa melakukan mutasi wallet.");
      return;
    }

    if (!walletActionForm.ownerId) {
      alert("Owner wajib dipilih.");
      return;
    }

    if (!parseRupiahInput(walletActionForm.amount)) {
      alert("Nominal wajib diisi.");
      return;
    }

    if (!walletActionForm.sourceReference && !walletActionForm.externalReference && !walletActionForm.idempotencyKey) {
      alert("Source reference, external reference, atau idempotency key wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      if (walletActionType === "topup") {
        await authFetch(`/owners/${walletActionForm.ownerId}/wallet/topups`, {
          method: "POST",
          body: JSON.stringify({
            amount: toDecimalString(walletActionForm.amount),
            payment_channel: walletActionForm.paymentChannel,
            external_reference: walletActionForm.externalReference || walletActionForm.sourceReference || undefined,
            idempotency_key:
              walletActionForm.idempotencyKey ||
              `topup-${walletActionForm.ownerId}-${Date.now()}`,
            paid_at: toIsoFromDatetimeLocal(walletActionForm.paidAt),
            note: walletActionForm.note || undefined,
          }),
        });
      }

      if (walletActionType === "debit") {
        await authFetch(`/owners/${walletActionForm.ownerId}/wallet/debits`, {
          method: "POST",
          body: JSON.stringify({
            amount: toDecimalString(walletActionForm.amount),
            source_reference: walletActionForm.sourceReference || walletActionForm.externalReference || undefined,
            idempotency_key:
              walletActionForm.idempotencyKey ||
              `debit-${walletActionForm.ownerId}-${Date.now()}`,
            occurred_at: toIsoFromDatetimeLocal(walletActionForm.occurredAt),
            note: walletActionForm.note || undefined,
          }),
        });
      }

      if (walletActionType === "adjustment") {
        await authFetch(`/owners/${walletActionForm.ownerId}/wallet/adjustments`, {
          method: "POST",
          body: JSON.stringify({
            amount: toDecimalString(walletActionForm.amount),
            direction: walletActionForm.direction,
            source_reference: walletActionForm.sourceReference || walletActionForm.externalReference || undefined,
            idempotency_key:
              walletActionForm.idempotencyKey ||
              `adjustment-${walletActionForm.ownerId}-${Date.now()}`,
            occurred_at: toIsoFromDatetimeLocal(walletActionForm.occurredAt),
            note: walletActionForm.note || undefined,
          }),
        });
      }

      if (walletActionType === "refund") {
        await authFetch(`/owners/${walletActionForm.ownerId}/wallet/refunds`, {
          method: "POST",
          body: JSON.stringify({
            amount: toDecimalString(walletActionForm.amount),
            source_reference: walletActionForm.sourceReference || walletActionForm.externalReference || undefined,
            idempotency_key:
              walletActionForm.idempotencyKey ||
              `refund-${walletActionForm.ownerId}-${Date.now()}`,
            occurred_at: toIsoFromDatetimeLocal(walletActionForm.occurredAt),
            note: walletActionForm.note || undefined,
          }),
        });
      }

      setIsWalletActionOpen(false);
      setWalletActionForm(getEmptyWalletActionForm());
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      alert(error instanceof Error ? error.message : `Gagal menyimpan ${walletActionLabel[walletActionType]}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentDetail = async (payment: PaymentItem) => {
    setLoading(true);

    try {
      const response = await authFetch<PaymentDetailResponse | PaymentItem>(`/wallet-payments/${payment.id}`);
      const data = response.data as PaymentDetailResponse | PaymentItem | undefined;
      const detail = data && "payment" in data ? data : { payment: data as PaymentItem };

      setSelectedPaymentDetail(detail);
      setSelectedWalletDetail(null);
      setSelectedOwnerLedger([]);
      setDetailTitle(`Detail Payment ${payment.code || payment.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal mengambil detail payment.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWalletDetail = async (wallet: WalletItem) => {
    const ownerId = wallet.owner?.id || wallet.owner_id;

    if (!ownerId) {
      alert("Owner ID wallet tidak ditemukan.");
      return;
    }

    setLoading(true);

    try {
      const [walletResponse, ledgerResponse] = await Promise.all([
        authFetch<WalletDetailResponse>(`/owners/${ownerId}/wallet`),
        authFetch<LedgerItem[] | { items?: LedgerItem[]; rows?: LedgerItem[] }>(
          `/owners/${ownerId}/wallet/transactions?sort=-occurred_at&page=1&limit=100`,
        ),
      ]);

      const walletData = walletResponse.data as WalletDetailResponse | undefined;
      const detailWallet = walletData && "wallet" in walletData ? walletData.wallet : walletData as WalletItem;

      setSelectedWalletDetail(detailWallet || wallet);
      setSelectedOwnerLedger(normalizeList<LedgerItem>(ledgerResponse.data));
      setSelectedPaymentDetail(null);
      setDetailTitle(`Detail Wallet ${wallet.account_code || wallet.code || wallet.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal mengambil detail wallet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-hidden font-sans text-[#1C1C1E]">
      <section className="overflow-hidden rounded-3xl border border-red-100 bg-white shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-[80px] bg-red-50" />

          <div className="relative z-10 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                Sprint 09 Wallet Ledger
              </div>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-gray-950 md:text-3xl">
                Wallets
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-gray-500">
                Kelola saldo wallet owner, top up, debit, adjustment, refund, payment, dan ledger aplikasi Piposmart.
              </p>
            </div>

            {isMounted && isAdmin && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWalletActionType("topup");
                    setWalletActionForm(getEmptyWalletActionForm());
                    setIsWalletActionOpen(true);
                  }}
                  className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216]"
                  title="Tambah top up"
                >
                  + Top Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWalletActionType("debit");
                    setWalletActionForm(getEmptyWalletActionForm());
                    setIsWalletActionOpen(true);
                  }}
                  className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-xs font-black text-[#C92C1E] shadow-sm transition hover:bg-red-100"
                  title="Tambah debit"
                >
                  + Debit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWalletActionType("adjustment");
                    setWalletActionForm(getEmptyWalletActionForm());
                    setIsWalletActionOpen(true);
                  }}
                  className="rounded-2xl border border-red-100 bg-white px-5 py-3 text-xs font-black text-[#C92C1E] shadow-sm transition hover:bg-red-50"
                  title="Tambah adjustment"
                >
                  + Adjustment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWalletActionType("refund");
                    setWalletActionForm(getEmptyWalletActionForm());
                    setIsWalletActionOpen(true);
                  }}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-xs font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
                  title="Tambah refund"
                >
                  + Refund
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Revenue Top Up</p>
          <p className="mt-3 text-2xl font-black text-gray-950">{formatRupiah(summary.totalTopUp)}</p>
          <p className="mt-1 text-xs font-medium text-gray-400">Berdasarkan paid_at</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Payment PAID</p>
          <p className="mt-3 text-3xl font-black text-gray-950">{summary.paidCount}</p>
          <p className="mt-1 text-xs font-medium text-gray-400">Dari {summary.totalPayments} payment</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Saldo Wallet</p>
          <p className="mt-3 text-2xl font-black text-gray-950">{formatRupiah(summary.totalWalletBalance)}</p>
          <p className="mt-1 text-xs font-medium text-gray-400">Saldo aktif owner</p>
        </div>

        <div className="rounded-3xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">Total Ledger</p>
          <p className="mt-3 text-3xl font-black text-[#C92C1E]">{summary.totalLedger}</p>
          <p className="mt-1 text-xs font-medium text-red-400">Credit, debit, adjustment, refund</p>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-black text-gray-900">Filter Data Wallets</h2>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Pencarian, channel, dan tanggal otomatis diterapkan tanpa tombol terapkan.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-4 xl:w-[840px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari payment / owner..."
              className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
            />

            <select
              value={channelFilter}
              onChange={(event) => setChannelFilter(event.target.value)}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
            >
              <option value="Semua">Semua Channel</option>
              {channelOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <input
              type="date"
              value={paidFrom}
              onChange={(event) => setPaidFrom(event.target.value)}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
            />

            <input
              type="date"
              value={paidTo}
              onChange={(event) => setPaidTo(event.target.value)}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
            />


          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { key: "payments", label: "Riwayat Top Up" },
            { key: "wallets", label: "Saldo Wallet" },
            { key: "ledger", label: "Ledger" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key as typeof activeTab)}
              className={`rounded-2xl border px-4 py-2 text-xs font-black transition ${
                activeTab === item.key
                  ? "border-red-100 bg-red-50 text-[#C92C1E]"
                  : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-[11px] font-bold text-gray-400">
          Klik baris payment atau wallet untuk membuka detail. Tombol mutasi tetap khusus Admin.
        </p>

        {activeTab === "payments" && (
          <div className="mt-5 w-full overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-[#C92C1E] text-white">
                <tr>
                  <th className="p-3 font-black">Payment</th>
                  <th className="p-3 font-black">Owner</th>
                  <th className="p-3 font-black">Channel</th>
                  <th className="p-3 font-black">Status</th>
                  <th className="p-3 font-black">Paid At</th>
                  <th className="p-3 text-right font-black">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center font-bold text-gray-400">
                      Data top up tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr
                      key={payment.id}
                      onClick={() => handleOpenPaymentDetail(payment)}
                      className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-red-50/40"
                      title="Klik baris untuk melihat detail payment"
                    >
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{payment.code || `PAY-${payment.id}`}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          {payment.external_reference || "-"}
                        </p>
                      </td>
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{getOwnerName(payment.owner)}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">{getOwnerCode(payment.owner)}</p>
                      </td>
                      <td className="p-3 align-top font-bold text-gray-600">
                        {payment.payment_channel || payment.channel || "-"}
                      </td>
                      <td className="p-3 align-top">
                        <span className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-[10px] font-black text-green-700">
                          {payment.status || "-"}
                        </span>
                      </td>
                      <td className="p-3 align-top font-bold text-gray-600">
                        {formatTanggal(payment.paid_at || payment.created_at)}
                      </td>
                      <td className="p-3 text-right align-top">
                        <span className="inline-flex min-w-[130px] justify-end rounded-2xl border border-red-100 bg-red-50 px-4 py-3 font-black text-[#C92C1E]">
                          {formatRupiah(payment.amount)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "wallets" && (
          <div className="mt-5 w-full overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="bg-[#C92C1E] text-white">
                <tr>
                  <th className="p-3 font-black">Wallet</th>
                  <th className="p-3 font-black">Owner</th>
                  <th className="p-3 font-black">Status</th>
                  <th className="p-3 text-right font-black">Balance</th>
                  <th className="p-3 text-right font-black">Ledger Balance</th>
                  <th className="p-3 text-center font-black">Mutasi</th>
                </tr>
              </thead>
              <tbody>
                {wallets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center font-bold text-gray-400">
                      Data wallet tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  wallets.map((wallet) => (
                    <tr
                      key={wallet.id}
                      onClick={() => handleOpenWalletDetail(wallet)}
                      className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-red-50/40"
                      title="Klik baris untuk melihat detail wallet"
                    >
                      <td className="p-3 align-top font-black text-gray-900">
                        {wallet.account_code || wallet.code || `WALLET-${wallet.id}`}
                      </td>
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{getOwnerName(wallet.owner)}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">{getOwnerCode(wallet.owner)}</p>
                      </td>
                      <td className="p-3 align-top">
                        <span className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-[10px] font-black text-green-700">
                          {wallet.status || "-"}
                        </span>
                      </td>
                      <td className="p-3 text-right align-top font-black text-gray-900">
                        {formatRupiah(wallet.balance)}
                      </td>
                      <td className="p-3 text-right align-top font-black text-[#C92C1E]">
                        {formatRupiah(wallet.ledger_balance)}
                      </td>
                      <td className="p-3 text-center align-top">
                        <div className="flex flex-wrap justify-center gap-1">
                          {isMounted && isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenWalletAction("debit", String(wallet.owner?.id || wallet.owner_id || ""));
                                }}
                                className="rounded-xl border border-red-100 bg-red-50 px-2.5 py-2 text-[10px] font-black text-[#C92C1E] transition hover:bg-red-100"
                              >
                                Debit
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenWalletAction("adjustment", String(wallet.owner?.id || wallet.owner_id || ""));
                                }}
                                className="rounded-xl border border-orange-100 bg-orange-50 px-2.5 py-2 text-[10px] font-black text-orange-700 transition hover:bg-orange-100"
                              >
                                Adj
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleOpenWalletAction("refund", String(wallet.owner?.id || wallet.owner_id || ""));
                                }}
                                className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-[10px] font-black text-gray-600 transition hover:bg-gray-50"
                              >
                                Refund
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "ledger" && (
          <div className="mt-5 w-full overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-[#C92C1E] text-white">
                <tr>
                  <th className="p-3 font-black">Ledger</th>
                  <th className="p-3 font-black">Owner</th>
                  <th className="p-3 font-black">Type</th>
                  <th className="p-3 font-black">Direction</th>
                  <th className="p-3 font-black">Occurred At</th>
                  <th className="p-3 text-right font-black">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledgers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center font-bold text-gray-400">
                      Data ledger tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  ledgers.map((ledger) => (
                    <tr key={ledger.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{ledger.code || `TRX-${ledger.id}`}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          {ledger.source_reference || ledger.external_reference || "-"}
                        </p>
                      </td>
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{getOwnerName(ledger.owner)}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">{getOwnerCode(ledger.owner)}</p>
                      </td>
                      <td className="p-3 align-top font-bold text-gray-600">{ledger.transaction_type || "-"}</td>
                      <td className="p-3 align-top">
                        <span className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-[10px] font-black text-green-700">
                          {ledger.direction || "-"}
                        </span>
                      </td>
                      <td className="p-3 align-top font-bold text-gray-600">
                        {formatTanggal(ledger.occurred_at || ledger.created_at)}
                      </td>
                      <td className="p-3 text-right align-top font-black text-[#C92C1E]">
                        {formatRupiah(ledger.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isWalletActionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="bg-[#C92C1E] p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">{walletActionLabel[walletActionType]}</h2>
                  <p className="mt-1 text-xs font-medium text-white/80">
                    {getWalletActionDescription(walletActionType)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWalletActionOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg font-black"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateWalletAction} className="space-y-4 p-5">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Owner
                </span>
                <select
                  value={walletActionForm.ownerId}
                  onChange={(event) => setWalletActionForm((prev) => ({ ...prev, ownerId: event.target.value }))}
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
                    Nominal
                  </span>
                  <input
                    value={formatNumberInput(walletActionForm.amount)}
                    onChange={(event) =>
                      setWalletActionForm((prev) => ({ ...prev, amount: parseRupiahInput(event.target.value) }))
                    }
                    placeholder="Contoh: 1.000.000"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>

                {walletActionType === "topup" && (
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Channel
                    </span>
                    <select
                      value={walletActionForm.paymentChannel}
                      onChange={(event) =>
                        setWalletActionForm((prev) => ({ ...prev, paymentChannel: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    >
                      <option value="MANUAL">MANUAL</option>
                      <option value="MIDTRANS">MIDTRANS</option>
                      <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                      <option value="QRIS">QRIS</option>
                      <option value="VA">VA</option>
                    </select>
                  </label>
                )}

                {walletActionType === "adjustment" && (
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Direction
                    </span>
                    <select
                      value={walletActionForm.direction}
                      onChange={(event) =>
                        setWalletActionForm((prev) => ({ ...prev, direction: event.target.value as "CREDIT" | "DEBIT" }))
                      }
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    >
                      <option value="CREDIT">CREDIT</option>
                      <option value="DEBIT">DEBIT</option>
                    </select>
                  </label>
                )}

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Source / External Reference
                  </span>
                  <input
                    value={walletActionForm.sourceReference || walletActionForm.externalReference}
                    onChange={(event) =>
                      setWalletActionForm((prev) => ({ ...prev, sourceReference: event.target.value, externalReference: event.target.value }))
                    }
                    placeholder="Contoh: MANUAL-WALLET-001"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Idempotency Key
                  </span>
                  <input
                    value={walletActionForm.idempotencyKey}
                    onChange={(event) =>
                      setWalletActionForm((prev) => ({ ...prev, idempotencyKey: event.target.value }))
                    }
                    placeholder="Boleh kosong jika reference unik"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {walletActionType === "topup" ? "Paid At" : "Occurred At"}
                  </span>
                  <input
                    type="datetime-local"
                    value={walletActionType === "topup" ? walletActionForm.paidAt : walletActionForm.occurredAt}
                    onChange={(event) =>
                      setWalletActionForm((prev) => ({
                        ...prev,
                        paidAt: walletActionType === "topup" ? event.target.value : prev.paidAt,
                        occurredAt: walletActionType !== "topup" ? event.target.value : prev.occurredAt,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Catatan
                  </span>
                  <textarea
                    value={walletActionForm.note}
                    onChange={(event) =>
                      setWalletActionForm((prev) => ({ ...prev, note: event.target.value }))
                    }
                    rows={3}
                    placeholder={`Catatan ${walletActionLabel[walletActionType]}`}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-[#C92C1E]">
                Mutasi wallet hanya boleh dilakukan Admin. Debit, adjustment DEBIT, dan refund akan ditolak backend jika saldo tidak cukup.
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsWalletActionOpen(false)}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-xs font-black text-gray-500 transition hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white transition hover:bg-[#A82216] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {loading ? "Menyimpan..." : `Simpan ${walletActionLabel[walletActionType]}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(selectedPaymentDetail || selectedWalletDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-3xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 bg-[#C92C1E] p-5 text-white">
              <div>
                <h2 className="text-xl font-black">{detailTitle}</h2>
                <p className="mt-1 text-xs font-medium text-white/80">
                  Detail data dari endpoint Sprint 09.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPaymentDetail(null);
                  setSelectedWalletDetail(null);
                  setSelectedOwnerLedger([]);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg font-black"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              {selectedPaymentDetail?.payment && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="text-sm font-black text-gray-900">Payment</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                    <InfoItem label="Kode" value={selectedPaymentDetail.payment.code || `PAY-${selectedPaymentDetail.payment.id}`} />
                    <InfoItem label="Owner" value={`${getOwnerCode(selectedPaymentDetail.payment.owner)} — ${getOwnerName(selectedPaymentDetail.payment.owner)}`} />
                    <InfoItem label="Channel" value={selectedPaymentDetail.payment.payment_channel || selectedPaymentDetail.payment.channel || "-"} />
                    <InfoItem label="Status Pembayaran" value={selectedPaymentDetail.payment.status || "-"} />
                    <InfoItem label="Paid At" value={formatTanggal(selectedPaymentDetail.payment.paid_at || selectedPaymentDetail.payment.created_at)} />
                    <InfoItem label="Amount" value={formatRupiah(selectedPaymentDetail.payment.amount)} />
                  </div>
                </div>
              )}

              {selectedWalletDetail && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="text-sm font-black text-gray-900">Wallet</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                    <InfoItem label="Account Code" value={selectedWalletDetail.account_code || selectedWalletDetail.code || `WALLET-${selectedWalletDetail.id}`} />
                    <InfoItem label="Owner" value={`${getOwnerCode(selectedWalletDetail.owner)} — ${getOwnerName(selectedWalletDetail.owner)}`} />
                    <InfoItem label="Status" value={selectedWalletDetail.status || "-"} />
                    <InfoItem label="Balance" value={formatRupiah(selectedWalletDetail.balance)} />
                    <InfoItem label="Ledger Balance" value={formatRupiah(selectedWalletDetail.ledger_balance)} />
                    <InfoItem label="Currency" value={selectedWalletDetail.currency || "IDR"} />
                  </div>
                </div>
              )}

              {selectedOwnerLedger.length > 0 && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="text-sm font-black text-gray-900">Owner Ledger</h3>
                  <div className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">
                    {selectedOwnerLedger.map((item) => {
                      const isCredit = (item.direction || item.transaction_type || "").toUpperCase() === "CREDIT";

                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                              <p className="break-words text-xs font-black text-gray-900">
                                {item.code || `TRX-${item.id}`}
                              </p>
                              <p className="mt-1 text-[11px] font-bold text-gray-400">
                                {formatTanggal(item.occurred_at || item.created_at)}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-black text-gray-600">
                                {item.transaction_type || "-"}
                              </span>
                              <span
                                className={`rounded-full border px-3 py-1 text-[10px] font-black ${
                                  isCredit
                                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                    : "border-red-100 bg-red-50 text-[#C92C1E]"
                                }`}
                              >
                                {item.direction || "-"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                Amount
                              </p>
                              <p className={`mt-1 text-sm font-black ${isCredit ? "text-emerald-700" : "text-[#C92C1E]"}`}>
                                {formatRupiah(item.amount)}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                Balance After
                              </p>
                              <p className="mt-1 text-sm font-black text-gray-900">
                                {formatRupiah(item.balance_after)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentDetail(null);
                    setSelectedWalletDetail(null);
                    setSelectedOwnerLedger([]);
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