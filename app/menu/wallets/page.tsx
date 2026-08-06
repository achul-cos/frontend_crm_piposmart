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
import {
  createTransfer,
  listOwnerTransfers,
  listTransfers,
  getTransferSuggestions,
  confirmTransferMatch,
  rejectTransferMatch,
  authFetchJson,
  type TransferItem,
  type TransferMatchSuggestion,
} from "@/app/lib/api";

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

// Sprint 15a — status jadi lifecycle nyata: PENDING (menunggu transfer,
// belum masuk balance) -> ACCEPTED (balance credit) | REJECTED | EXPIRED
// (24 jam sesi PENDING lewat, auto oleh worker). "PAID" (nilai lama) tidak
// lagi dipakai backend, dibiarkan untuk data historis lama.
type PaymentStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "PAID";

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
  status?: PaymentStatus;
  paid_at?: string;
  session_expires_at?: string;
  transfer_date_override?: string;
  effective_transfer_date?: string;
  unique_code?: string;
  created_at?: string;
  note?: string;
};

function getPaymentStatusLabel(status?: string): string {
  switch (status) {
    case "ACCEPTED":
    case "PAID":
    case "ACC":
      return "ACC";
    case "PENDING":
      return "PENDING";
    case "REJECTED":
    case "REJECT":
      return "REJECT";
    case "EXPIRED":
    case "EXP":
      return "EXP";
    default:
      return status || "-";
  }
}

function getPaymentStatusBadgeClass(status?: string): string {
  const norm = getPaymentStatusLabel(status);
  switch (norm) {
    case "ACC":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "REJECT":
      return "border-red-200 bg-red-50 text-red-700";
    case "EXP":
      return "border-gray-200 bg-gray-100 text-gray-500";
    default:
      return "border-gray-200 bg-gray-100 text-gray-500";
  }
}

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

type WalletDetailResponse =
  | WalletItem
  | {
    wallet?: WalletItem;
    transactions?: LedgerItem[];
  };

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-400";

const selectClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-400";

const textareaClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100";

const getTodayDatetimeLocal = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
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
  if (type === "topup") {
    return "Mencatat pembayaran top up dan menambah saldo wallet owner.";
  }

  if (type === "debit") {
    return "Mencatat saldo terpakai dan mengurangi saldo wallet owner.";
  }

  if (type === "adjustment") {
    return "Koreksi saldo wallet, bisa CREDIT atau DEBIT.";
  }

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
    const data = payload as {
      items?: unknown;
      rows?: unknown;
      data?: unknown;
    };

    if (Array.isArray(data.items)) return data.items as T[];
    if (Array.isArray(data.rows)) return data.rows as T[];
    return data.data as T[];
  }

  return [];
};

function ModalShell({
  open,
  title,
  subtitle,
  label = "TOPUP",
  maxWidth = "max-w-2xl",
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
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div
        className={`w-full ${maxWidth} min-h-[460px] max-h-[85vh] flex flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl transition-all`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b border-slate-100 bg-[linear-gradient(135deg,#fff_0%,#fff8f5_55%,#fee2e2_100%)] px-6 py-5 md:px-8 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                {label}
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 md:text-2xl">
                {title}
              </h2>

              <p className="mt-1.5 text-xs font-medium text-slate-500 md:text-sm">
                {subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-500 transition hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function WalletsPage() {
  usePageTitle("Topup");

  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [owners, setOwners] = useState<WalletOwner[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [ledgers, setLedgers] = useState<LedgerItem[]>([]);
  const [activeTab, setActiveTab] = useState<
    "payments" | "wallets" | "ledger" | "analytics" | "transfer"
  >("payments");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paidFrom, setPaidFrom] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [channelFilter, setChannelFilter] = useState("Semua");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const [walletActionType, setWalletActionType] =
    useState<WalletActionType>("topup");
  const [walletActionForm, setWalletActionForm] = useState<WalletActionForm>(
    getEmptyWalletActionForm(),
  );
  const [isWalletActionOpen, setIsWalletActionOpen] = useState(false);
  const [selectedPaymentDetail, setSelectedPaymentDetail] =
    useState<PaymentDetailResponse | null>(null);
  const [selectedWalletDetail, setSelectedWalletDetail] =
    useState<WalletItem | null>(null);
  const [selectedOwnerLedger, setSelectedOwnerLedger] = useState<LedgerItem[]>(
    [],
  );

  // Sprint 15a — modal Accept/Reject/Koreksi Tanggal Transfer untuk Top Up.
  const [topupActionModal, setTopupActionModal] = useState<{
    payment: PaymentItem;
    mode: "accept" | "reject" | "transfer_date";
  } | null>(null);
  const [topupActionForm, setTopupActionForm] = useState({
    uniqueCode: "",
    transferDateOverride: "",
    note: "",
  });
  const [topupActionSaving, setTopupActionSaving] = useState(false);
  const [topupActionError, setTopupActionError] = useState("");

  // Sprint 15a — tab Transfer: bukti transfer bank owner dicocokkan ke Top Up PENDING.
  const [transferOwnerId, setTransferOwnerId] = useState("");
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [transferSuggestions, setTransferSuggestions] = useState<
    TransferMatchSuggestion[]
  >([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [isCreateTransferOpen, setIsCreateTransferOpen] = useState(false);
  const [createTransferForm, setCreateTransferForm] = useState({
    amount: "",
    transferDate: "",
    proofUrl: "",
    note: "",
  });
  const [creatingTransfer, setCreatingTransfer] = useState(false);
  const [createTransferError, setCreateTransferError] = useState("");
  const [matchActionLoadingId, setMatchActionLoadingId] = useState<
    number | null
  >(null);
  const [detailTitle, setDetailTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isMounted, setIsMounted] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsMounted(true);
      setUserRole(localStorage.getItem("piposmart_user_role") || "");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const isAdmin = isMounted && userRole.toLowerCase() === "admin";

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

  const loadTopUpData = useCallback(async () => {
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

      const [paymentResult, walletResult, ledgerResult, ownerResult] =
        await Promise.allSettled([
          authFetch<
            PaymentItem[] | { items?: PaymentItem[]; rows?: PaymentItem[] }
          >(`/wallet-payments${paymentQuery}`),
          authFetch<
            WalletItem[] | { items?: WalletItem[]; rows?: WalletItem[] }
          >(`/wallets${walletQuery}`),
          authFetch<
            LedgerItem[] | { items?: LedgerItem[]; rows?: LedgerItem[] }
          >(`/wallet-transactions${ledgerQuery}`),
          authFetch<
            WalletOwner[] | { items?: WalletOwner[]; rows?: WalletOwner[] }
          >(`/owners${ownersQuery}`),
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

      const firstError = [
        paymentResult,
        walletResult,
        ledgerResult,
        ownerResult,
      ].find((result) => result.status === "rejected") as
        | PromiseRejectedResult
        | undefined;

      if (firstError) {
        setErrorMessage(
          firstError.reason instanceof Error
            ? firstError.reason.message
            : "Sebagian data top up gagal dimuat.",
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mengambil data top up.",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, channelFilter, paidFrom, paidTo]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 450);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTopUpData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadTopUpData, reloadKey]);

  const loadTransferData = useCallback(async (ownerId: string) => {
    setTransferLoading(true);
    setTransferError("");

    try {
      const [listResult, suggestionResult] = await Promise.allSettled(
        ownerId
          ? [
              listOwnerTransfers(Number(ownerId), { all: true }),
              getTransferSuggestions(Number(ownerId)),
            ]
          : [listTransfers({ all: true }), Promise.resolve([] as TransferMatchSuggestion[])],
      );

      if (listResult.status === "fulfilled") {
        setTransferItems(listResult.value.items || []);
      } else {
        setTransferItems([]);
      }

      if (suggestionResult.status === "fulfilled") {
        setTransferSuggestions(suggestionResult.value || []);
      } else {
        setTransferSuggestions([]);
      }

      const firstError = [listResult, suggestionResult].find(
        (result) => result.status === "rejected",
      ) as PromiseRejectedResult | undefined;

      if (firstError) {
        setTransferError(
          firstError.reason instanceof Error
            ? firstError.reason.message
            : "Sebagian data transfer gagal dimuat.",
        );
      }
    } catch (error) {
      setTransferError(
        error instanceof Error ? error.message : "Gagal mengambil data transfer.",
      );
    } finally {
      setTransferLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "transfer") return;

    const timer = window.setTimeout(() => {
      void loadTransferData(transferOwnerId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeTab, loadTransferData, transferOwnerId]);

  const handleCreateTransferSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!transferOwnerId) {
      setCreateTransferError("Pilih owner terlebih dahulu.");
      return;
    }

    if (!createTransferForm.amount || !createTransferForm.transferDate) {
      setCreateTransferError("Nominal dan tanggal transfer wajib diisi.");
      return;
    }

    setCreatingTransfer(true);
    setCreateTransferError("");

    try {
      await createTransfer(Number(transferOwnerId), {
        amount: createTransferForm.amount,
        transfer_date: new Date(createTransferForm.transferDate).toISOString(),
        proof_url: createTransferForm.proofUrl || undefined,
        note: createTransferForm.note || undefined,
      });

      setIsCreateTransferOpen(false);
      setCreateTransferForm({
        amount: "",
        transferDate: "",
        proofUrl: "",
        note: "",
      });
      await loadTransferData(transferOwnerId);
    } catch (error) {
      setCreateTransferError(
        error instanceof Error ? error.message : "Gagal membuat transfer.",
      );
    } finally {
      setCreatingTransfer(false);
    }
  };

  const handleConfirmMatch = async (suggestion: TransferMatchSuggestion) => {
    setMatchActionLoadingId(suggestion.transfer.id);
    setTransferError("");

    try {
      await confirmTransferMatch(suggestion.transfer.id, {
        wallet_payment_id: suggestion.wallet_payment_id,
        unique_code: suggestion.unique_code,
      });
      await loadTransferData(transferOwnerId);
    } catch (error) {
      setTransferError(
        error instanceof Error ? error.message : "Gagal mengonfirmasi kecocokan transfer.",
      );
    } finally {
      setMatchActionLoadingId(null);
    }
  };

  const handleRejectMatch = async (suggestion: TransferMatchSuggestion) => {
    setMatchActionLoadingId(suggestion.transfer.id);
    setTransferError("");

    try {
      await rejectTransferMatch(suggestion.transfer.id);
      await loadTransferData(transferOwnerId);
    } catch (error) {
      setTransferError(
        error instanceof Error ? error.message : "Gagal menolak kecocokan transfer.",
      );
    } finally {
      setMatchActionLoadingId(null);
    }
  };

  const summary = useMemo(() => {
    const totalTopUp = payments.reduce(
      (total, item) => total + Number(item.amount || 0),
      0,
    );
    const totalWalletBalance = wallets.reduce(
      (total, item) => total + Number(item.balance || 0),
      0,
    );
    const paidPayments = payments.filter(
      (item) => (item.status || "").toUpperCase() === "PAID",
    );

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

  const handleCreateWalletAction = async (event: FormEvent<HTMLFormElement>) => {
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

    if (
      !walletActionForm.sourceReference &&
      !walletActionForm.externalReference &&
      !walletActionForm.idempotencyKey
    ) {
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
            external_reference:
              walletActionForm.externalReference ||
              walletActionForm.sourceReference ||
              undefined,
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
            source_reference:
              walletActionForm.sourceReference ||
              walletActionForm.externalReference ||
              undefined,
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
            source_reference:
              walletActionForm.sourceReference ||
              walletActionForm.externalReference ||
              undefined,
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
            source_reference:
              walletActionForm.sourceReference ||
              walletActionForm.externalReference ||
              undefined,
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
      alert(
        error instanceof Error
          ? error.message
          : `Gagal menyimpan ${walletActionLabel[walletActionType]}.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentDetail = async (payment: PaymentItem) => {
    setLoading(true);

    try {
      const response = await authFetch<PaymentDetailResponse | PaymentItem>(
        `/wallet-payments/${payment.id}`,
      );
      const data = response.data as PaymentDetailResponse | PaymentItem | undefined;
      const detail =
        data && "payment" in data ? data : { payment: data as PaymentItem };

      setSelectedPaymentDetail(detail);
      setSelectedWalletDetail(null);
      setSelectedOwnerLedger([]);
      setDetailTitle(`Detail Payment ${payment.code || payment.id}`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengambil detail payment.",
      );
    } finally {
      setLoading(false);
    }
  };

  const openTopupAction = (
    payment: PaymentItem,
    mode: "accept" | "reject" | "transfer_date",
  ) => {
    setTopupActionModal({ payment, mode });
    setTopupActionForm({
      uniqueCode: payment.unique_code || "",
      transferDateOverride: "",
      note: "",
    });
    setTopupActionError("");
  };

  const closeTopupAction = () => {
    setTopupActionModal(null);
    setTopupActionError("");
  };

  const handleTopupActionSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!topupActionModal) return;

    setTopupActionSaving(true);
    setTopupActionError("");

    try {
      const { payment, mode } = topupActionModal;

      if (mode === "accept") {
        await authFetch(`/wallet-payments/${payment.id}/accept`, {
          method: "PATCH",
          body: JSON.stringify({
            unique_code: topupActionForm.uniqueCode || undefined,
            transfer_date_override: topupActionForm.transferDateOverride
              ? toIsoFromDatetimeLocal(topupActionForm.transferDateOverride)
              : undefined,
          }),
        });
      } else if (mode === "reject") {
        await authFetch(`/wallet-payments/${payment.id}/reject`, {
          method: "PATCH",
          body: JSON.stringify({ note: topupActionForm.note || undefined }),
        });
      } else {
        if (!topupActionForm.transferDateOverride) {
          setTopupActionError("Tanggal transfer wajib diisi.");
          setTopupActionSaving(false);
          return;
        }
        await authFetch(`/wallet-payments/${payment.id}/transfer-date`, {
          method: "PATCH",
          body: JSON.stringify({
            transfer_date: toIsoFromDatetimeLocal(
              topupActionForm.transferDateOverride,
            ),
          }),
        });
      }

      closeTopupAction();
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      setTopupActionError(
        error instanceof Error ? error.message : "Gagal memproses top up.",
      );
    } finally {
      setTopupActionSaving(false);
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
      const detailWallet =
        walletData && "wallet" in walletData
          ? walletData.wallet
          : (walletData as WalletItem);

      setSelectedWalletDetail(detailWallet || wallet);
      setSelectedOwnerLedger(normalizeList<LedgerItem>(ledgerResponse.data));
      setSelectedPaymentDetail(null);
      setDetailTitle(
        `Detail Wallet ${wallet.account_code || wallet.code || wallet.id}`,
      );
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Gagal mengambil detail wallet.",
      );
    } finally {
      setLoading(false);
    }
  };

  const closeDetailModal = () => {
    setSelectedPaymentDetail(null);
    setSelectedWalletDetail(null);
    setSelectedOwnerLedger([]);
  };

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
              <span className="text-[#C92C1E]">Topup</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Manajemen Topup
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Kelola saldo wallet owner, top up, debit, adjustment, refund,
              payment, dan ledger aplikasi Piposmart.
            </p>
          </div>

          {isMounted && isAdmin && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleOpenWalletAction("topup")}
                className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216]"
              >
                + Top Up
              </button>

              <button
                type="button"
                onClick={() => handleOpenWalletAction("debit")}
                className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-xs font-black text-[#C92C1E] shadow-sm transition hover:bg-red-100"
              >
                + Debit
              </button>

              <button
                type="button"
                onClick={() => handleOpenWalletAction("adjustment")}
                className="rounded-2xl border border-red-100 bg-white px-5 py-3 text-xs font-black text-[#C92C1E] shadow-sm transition hover:bg-red-50"
              >
                + Adjustment
              </button>

              <button
                type="button"
                onClick={() => handleOpenWalletAction("refund")}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-xs font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                + Refund
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
          <div className="relative z-10">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">
              Revenue Top Up
            </p>
            <h2 className="text-3xl font-black">
              {formatRupiah(summary.totalTopUp)}
            </h2>
            <p className="mt-1 text-xs font-medium text-red-100/80">
              Berdasarkan paid_at
            </p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-colors hover:border-[#C92C1E]">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Payment PAID
          </p>
          <h2 className="text-3xl font-black text-gray-900">
            {summary.paidCount}
          </h2>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Dari {summary.totalPayments} payment
          </p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-colors hover:border-[#C92C1E]">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Total Saldo Wallet
          </p>
          <h2 className="text-3xl font-black text-gray-900">
            {formatRupiah(summary.totalWalletBalance)}
          </h2>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Saldo aktif owner
          </p>
        </div>


      </div>

      <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="flex text-sm font-bold">
          {[
            { key: "payments", label: "Riwayat Top Up" },
            { key: "wallets", label: "Saldo Wallet" },
            { key: "transfer", label: "Transfer" },
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
        <section className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-4">
            <div>
              <h2 className="text-sm font-black text-gray-900">
                Filter Data Wallets
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-400">
                Pencarian, channel, dan tanggal otomatis diterapkan tanpa tombol
                terapkan.
              </p>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari payment / owner..."
                className="min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
              />

              <select
                value={channelFilter}
                onChange={(event) => setChannelFilter(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
              >
                <option value="Semua">Semua Channel</option>
                {channelOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={paidFrom}
                onChange={(event) => setPaidFrom(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
              />

              <input
                type="date"
                value={paidTo}
                onChange={(event) => setPaidTo(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
              />
            </div>
          </div>

          <div className="px-4 pt-4">
            {errorMessage && (
              <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                {errorMessage}
              </div>
            )}

            <p className="text-[11px] font-bold text-gray-400">
              Klik tombol detail atau baris data untuk membuka detail. Tombol mutasi
              tetap khusus Admin.
            </p>
          </div>

          {activeTab === "payments" && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm text-gray-600">
                <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-4 font-black">No / Ref</th>
                    <th className="px-4 py-4 font-black">Owner</th>
                    <th className="px-4 py-4 font-black">Channel</th>
                    <th className="px-4 py-4 font-black">Status</th>
                    <th className="px-4 py-4 font-black">Paid At</th>
                    <th className="px-4 py-4 text-right font-black">Amount</th>
                    <th className="px-4 py-4 text-center font-black">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                        Data top up tidak ditemukan.
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr
                        key={payment.id}
                        onClick={() => handleOpenPaymentDetail(payment)}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 align-top">
                          <Link
                            href={`/menu/wallets/payments/${payment.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="font-black text-gray-900 transition-colors hover:text-[#C92C1E]"
                          >
                            #{payment.id}
                          </Link>
                          {payment.external_reference ? (
                            <p className="mt-1 text-[11px] font-bold text-gray-400">
                              {payment.external_reference}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <p className="font-black text-gray-900">
                            {getOwnerName(payment.owner)}
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-gray-400">
                            {getOwnerCode(payment.owner)}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top font-medium text-gray-600">
                          {payment.payment_channel || payment.channel || "-"}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${getPaymentStatusBadgeClass(payment.status)}`}
                          >
                            {getPaymentStatusLabel(payment.status)}
                          </span>
                          {payment.status === "PENDING" && payment.session_expires_at ? (
                            <p className="mt-1 text-[10px] font-bold text-amber-600">
                              Exp: {formatTanggal(payment.session_expires_at)}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-4 py-4 align-top font-medium text-gray-600">
                          {formatTanggal(payment.paid_at || payment.created_at)}
                        </td>

                        <td className="px-4 py-4 text-right align-top font-black text-[#C92C1E]">
                          {formatRupiah(payment.amount)}
                        </td>

                        <td
                          className="px-4 py-4 text-center align-top"
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            <Link
                              href={`/menu/wallets/payments/${payment.id}`}
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                            >
                              Detail
                            </Link>
                            {payment.status === "PENDING" && isAdmin ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openTopupAction(payment, "accept");
                                  }}
                                  className="inline-flex rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-100"
                                >
                                  Terima
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openTopupAction(payment, "reject");
                                  }}
                                  className="inline-flex rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition-colors hover:bg-red-100"
                                >
                                  Tolak
                                </button>
                              </>
                            ) : null}
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openTopupAction(payment, "transfer_date");
                                }}
                                className="inline-flex rounded-lg bg-gray-100 px-3 py-2 text-xs font-black text-gray-600 transition-colors hover:bg-gray-200"
                              >
                                Koreksi Tanggal
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "wallets" && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm text-gray-600">
                <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-4 font-black">Owner</th>
                    <th className="px-4 py-4 font-black">Status</th>
                    <th className="px-4 py-4 text-right font-black">Balance</th>
                    <th className="px-4 py-4 text-center font-black">Mutasi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {wallets.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                        Data wallet tidak ditemukan.
                      </td>
                    </tr>
                  ) : (
                    wallets.map((wallet) => (
                      <tr
                        key={wallet.id}
                        onClick={() => handleOpenWalletDetail(wallet)}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 align-top">
                          <p className="font-black text-gray-900">
                            {getOwnerName(wallet.owner)}
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-gray-400">
                            {getOwnerCode(wallet.owner)}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-emerald-700">
                            {wallet.status || "-"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right align-top font-black text-gray-900">
                          {formatRupiah(wallet.balance)}
                        </td>

                        <td
                          className="px-4 py-4 text-center align-top"
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <div className="flex flex-wrap justify-center gap-2">
                            {isMounted && isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleOpenWalletAction(
                                      "debit",
                                      String(wallet.owner?.id || wallet.owner_id || ""),
                                    );
                                  }}
                                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-[#C92C1E] transition-colors hover:bg-red-100"
                                >
                                  Debit
                                </button>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleOpenWalletAction(
                                      "adjustment",
                                      String(wallet.owner?.id || wallet.owner_id || ""),
                                    );
                                  }}
                                  className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-black text-orange-600 transition-colors hover:bg-orange-100"
                                >
                                  Adjustment
                                </button>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleOpenWalletAction(
                                      "refund",
                                      String(wallet.owner?.id || wallet.owner_id || ""),
                                    );
                                  }}
                                  className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-black text-gray-500 transition-colors hover:bg-gray-100"
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


          {activeTab === "transfer" && (
            <div className="mt-4 space-y-6">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">
                    Owner
                  </label>
                  <select
                    value={transferOwnerId}
                    onChange={(event) => setTransferOwnerId(event.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C92C1E]/20"
                  >
                    <option value="">Pilih owner...</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {getOwnerName(owner)} ({getOwnerCode(owner)})
                      </option>
                    ))}
                  </select>
                </div>

                {isMounted && isAdmin && (
                  <button
                    type="button"
                    disabled={!transferOwnerId}
                    onClick={() => {
                      setCreateTransferError("");
                      setIsCreateTransferOpen(true);
                    }}
                    className="rounded-xl bg-[#C92C1E] px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-[#A82216] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    + Catat Transfer
                  </button>
                )}
              </div>

              {transferError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                  {transferError}
                </p>
              )}

              {!transferOwnerId ? (
                <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm font-bold text-gray-500">
                  Pilih owner untuk melihat riwayat transfer dan saran kecocokan.
                </p>
              ) : transferLoading ? (
                <p className="px-4 py-6 text-center text-sm font-bold text-gray-500">
                  Memuat data transfer...
                </p>
              ) : (
                <>
                  <div>
                    <h3 className="mb-3 text-sm font-black text-gray-900">
                      Saran Kecocokan
                    </h3>
                    {transferSuggestions.length === 0 ? (
                      <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-xs font-bold text-gray-500">
                        Tidak ada saran kecocokan untuk owner ini.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {transferSuggestions.map((suggestion) => (
                          <div
                            key={`${suggestion.transfer.id}-${suggestion.wallet_payment_id}`}
                            className={`rounded-2xl border p-4 ${suggestion.amount_mismatch
                                ? "border-red-300 bg-red-50"
                                : "border-gray-200 bg-white"
                              }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-gray-900">
                                  Transfer {formatRupiah(suggestion.transfer.amount)} →{" "}
                                  {suggestion.wallet_payment_code} (
                                  {formatRupiah(suggestion.wallet_payment_amount)})
                                </p>
                                <p className="mt-1 text-[11px] font-bold text-gray-400">
                                  Tanggal transfer: {formatTanggal(suggestion.transfer.transfer_date)}
                                  {suggestion.unique_code
                                    ? ` · Kode unik: ${suggestion.unique_code}`
                                    : ""}
                                </p>
                                {suggestion.amount_mismatch && (
                                  <span className="mt-2 inline-flex rounded-full border border-red-300 bg-red-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-red-700">
                                    Nominal Tidak Cocok — Periksa Manual
                                  </span>
                                )}
                              </div>

                              {isMounted && isAdmin && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    disabled={matchActionLoadingId === suggestion.transfer.id}
                                    onClick={() => handleConfirmMatch(suggestion)}
                                    className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                                  >
                                    Confirm Match
                                  </button>
                                  <button
                                    type="button"
                                    disabled={matchActionLoadingId === suggestion.transfer.id}
                                    onClick={() => handleRejectMatch(suggestion)}
                                    className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-black text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50"
                                  >
                                    Reject Match
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <h3 className="mb-3 text-sm font-black text-gray-900">
                      Riwayat Transfer
                    </h3>
                    <table className="w-full min-w-[820px] text-left text-sm text-gray-600">
                      <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                        <tr>
                          <th className="px-4 py-4 font-black">Tanggal Transfer</th>
                          <th className="px-4 py-4 text-right font-black">Nominal</th>
                          <th className="px-4 py-4 font-black">Status</th>
                          <th className="px-4 py-4 font-black">Sumber</th>
                          <th className="px-4 py-4 font-black">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {transferItems.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                              Belum ada transfer tercatat.
                            </td>
                          </tr>
                        ) : (
                          transferItems.map((transfer) => (
                            <tr key={transfer.id} className="transition-colors hover:bg-gray-50">
                              <td className="px-4 py-4 align-top font-medium text-gray-600">
                                {formatTanggal(transfer.transfer_date)}
                              </td>
                              <td className="px-4 py-4 text-right align-top font-black text-gray-900">
                                {formatRupiah(transfer.amount)}
                              </td>
                              <td className="px-4 py-4 align-top">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${transfer.match_status === "MATCHED"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : transfer.match_status === "SUGGESTED"
                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                        : transfer.match_status === "REJECTED_MATCH"
                                          ? "border-red-200 bg-red-50 text-red-700"
                                          : "border-gray-200 bg-gray-100 text-gray-500"
                                    }`}
                                >
                                  {transfer.match_status}
                                </span>
                              </td>
                              <td className="px-4 py-4 align-top font-medium text-gray-600">
                                {transfer.source}
                              </td>
                              <td className="px-4 py-4 align-top font-medium text-gray-600">
                                {transfer.note || "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}

      <ModalShell
        open={isCreateTransferOpen}
        title="Catat Transfer Baru"
        subtitle="Input bukti transfer bank owner untuk dicocokkan dengan Top Up PENDING."
        onClose={() => setIsCreateTransferOpen(false)}
      >
        <form onSubmit={handleCreateTransferSubmit} className="space-y-4">
          {createTransferError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
              {createTransferError}
            </p>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">
              Nominal
            </label>
            <input
              type="number"
              min="0"
              value={createTransferForm.amount}
              onChange={(event) =>
                setCreateTransferForm((current) => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C92C1E]/20"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">
              Tanggal Transfer
            </label>
            <input
              type="datetime-local"
              value={createTransferForm.transferDate}
              onChange={(event) =>
                setCreateTransferForm((current) => ({
                  ...current,
                  transferDate: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C92C1E]/20"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">
              URL Bukti Transfer (opsional)
            </label>
            <input
              type="text"
              value={createTransferForm.proofUrl}
              onChange={(event) =>
                setCreateTransferForm((current) => ({
                  ...current,
                  proofUrl: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C92C1E]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-gray-500">
              Catatan (opsional)
            </label>
            <textarea
              value={createTransferForm.note}
              onChange={(event) =>
                setCreateTransferForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C92C1E]/20"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateTransferOpen(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-500 transition hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={creatingTransfer}
              className="rounded-xl bg-[#C92C1E] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#A82216] disabled:opacity-50"
            >
              {creatingTransfer ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={isWalletActionOpen}
        title={walletActionLabel[walletActionType]}
        subtitle={getWalletActionDescription(walletActionType)}
        onClose={() => setIsWalletActionOpen(false)}
      >
        <form
          onSubmit={handleCreateWalletAction}
          autoComplete="off"
          className="space-y-5"
        >
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              Owner
            </p>

            <div className="mt-4">
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Pilih Owner
                </span>

                <select
                  value={walletActionForm.ownerId}
                  onChange={(event) =>
                    setWalletActionForm((prev) => ({
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
              Detail Mutasi
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Nominal
                </span>

                <input
                  value={formatNumberInput(walletActionForm.amount)}
                  onChange={(event) =>
                    setWalletActionForm((prev) => ({
                      ...prev,
                      amount: parseRupiahInput(event.target.value),
                    }))
                  }
                  placeholder="Contoh: 1.000.000"
                  className={inputClass}
                />
              </label>

              {walletActionType === "topup" && (
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Channel
                  </span>

                  <select
                    value={walletActionForm.paymentChannel}
                    onChange={(event) =>
                      setWalletActionForm((prev) => ({
                        ...prev,
                        paymentChannel: event.target.value,
                      }))
                    }
                    className={selectClass}
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
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Direction
                  </span>

                  <select
                    value={walletActionForm.direction}
                    onChange={(event) =>
                      setWalletActionForm((prev) => ({
                        ...prev,
                        direction: event.target.value as "CREDIT" | "DEBIT",
                      }))
                    }
                    className={selectClass}
                  >
                    <option value="CREDIT">CREDIT</option>
                    <option value="DEBIT">DEBIT</option>
                  </select>
                </label>
              )}

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Source / External Reference
                </span>

                <input
                  value={
                    walletActionForm.sourceReference ||
                    walletActionForm.externalReference
                  }
                  onChange={(event) =>
                    setWalletActionForm((prev) => ({
                      ...prev,
                      sourceReference: event.target.value,
                      externalReference: event.target.value,
                    }))
                  }
                  placeholder="Contoh: MANUAL-WALLET-001"
                  className={inputClass}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Idempotency Key
                </span>

                <input
                  value={walletActionForm.idempotencyKey}
                  onChange={(event) =>
                    setWalletActionForm((prev) => ({
                      ...prev,
                      idempotencyKey: event.target.value,
                    }))
                  }
                  placeholder="Boleh kosong jika reference unik"
                  className={inputClass}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  {walletActionType === "topup" ? "Paid At" : "Occurred At"}
                </span>

                <input
                  type="datetime-local"
                  value={
                    walletActionType === "topup"
                      ? walletActionForm.paidAt
                      : walletActionForm.occurredAt
                  }
                  onChange={(event) =>
                    setWalletActionForm((prev) => ({
                      ...prev,
                      paidAt:
                        walletActionType === "topup"
                          ? event.target.value
                          : prev.paidAt,
                      occurredAt:
                        walletActionType !== "topup"
                          ? event.target.value
                          : prev.occurredAt,
                    }))
                  }
                  className={inputClass}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Catatan
                </span>

                <textarea
                  value={walletActionForm.note}
                  onChange={(event) =>
                    setWalletActionForm((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder={`Catatan ${walletActionLabel[walletActionType]}`}
                  className={textareaClass}
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-red-100 bg-red-50/70 px-4 py-3 text-xs font-bold leading-5 text-[#C92C1E]">
            Mutasi wallet hanya boleh dilakukan Admin. Debit, adjustment DEBIT,
            dan refund akan ditolak backend jika saldo tidak cukup.
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsWalletActionOpen(false)}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {loading
                ? "Menyimpan..."
                : `Simpan ${walletActionLabel[walletActionType]}`}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={Boolean(selectedPaymentDetail || selectedWalletDetail)}
        title={detailTitle || "Detail Wallet"}
        subtitle="Detail payment, wallet, dan ledger mengikuti tampilan popup Komisi."
        maxWidth="max-w-3xl"
        onClose={closeDetailModal}
      >
        <div className="space-y-5">
          {selectedPaymentDetail?.payment && (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Detail Payment Top Up
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                <InfoItem
                  label="Owner"
                  value={`${getOwnerCode(
                    selectedPaymentDetail.payment.owner,
                  )} — ${getOwnerName(selectedPaymentDetail.payment.owner)}`}
                />
                <InfoItem
                  label="Channel"
                  value={
                    selectedPaymentDetail.payment.payment_channel ||
                    selectedPaymentDetail.payment.channel ||
                    "-"
                  }
                />
                <InfoItem
                  label="Status Top Up"
                  value={getPaymentStatusLabel(selectedPaymentDetail.payment.status)}
                />
                <InfoItem
                  label="Awal Pembelian"
                  value={formatRupiah(selectedPaymentDetail.payment.amount)}
                />
                <InfoItem
                  label="Paid At"
                  value={formatTanggal(
                    selectedPaymentDetail.payment.paid_at ||
                    selectedPaymentDetail.payment.created_at,
                  )}
                />
                {selectedPaymentDetail.payment.unique_code ? (
                  <InfoItem
                    label="Kode Unik"
                    value={selectedPaymentDetail.payment.unique_code}
                  />
                ) : null}
                {selectedPaymentDetail.payment.session_expires_at ? (
                  <InfoItem
                    label="Sesi Kadaluarsa"
                    value={formatTanggal(
                      selectedPaymentDetail.payment.session_expires_at,
                    )}
                  />
                ) : null}
                {selectedPaymentDetail.payment.effective_transfer_date ? (
                  <InfoItem
                    label="Tanggal Transfer Efektif"
                    value={formatTanggal(
                      selectedPaymentDetail.payment.effective_transfer_date,
                    )}
                  />
                ) : null}
              </div>
            </div>
          )}

          {selectedWalletDetail && (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Wallet
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                <InfoItem
                  label="Owner"
                  value={`${getOwnerCode(
                    selectedWalletDetail.owner,
                  )} — ${getOwnerName(selectedWalletDetail.owner)}`}
                />
                <InfoItem label="Status" value={selectedWalletDetail.status || "-"} />
                <InfoItem
                  label="Balance"
                  value={formatRupiah(selectedWalletDetail.balance)}
                />
                <InfoItem
                  label="Currency"
                  value={selectedWalletDetail.currency || "IDR"}
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
        open={Boolean(topupActionModal)}
        title={
          topupActionModal?.mode === "accept"
            ? "Terima Top Up"
            : topupActionModal?.mode === "reject"
              ? "Tolak Top Up"
              : "Koreksi Tanggal Transfer"
        }
        subtitle={
          topupActionModal?.mode === "accept"
            ? "Balance owner akan bertambah sebesar nominal top up yang diminta (nominal genap), selisih dicatat sebagai kode unik."
            : topupActionModal?.mode === "reject"
              ? "Top up PENDING tidak pernah menyentuh balance, jadi menolak tidak butuh pembalikan apapun."
              : "Ubah tanggal transfer efektif berdasarkan bukti/struk, terpisah dari kapan sistem mencatat top up."
        }
        maxWidth="max-w-xl"
        onClose={closeTopupAction}
      >
        {topupActionModal ? (
          <form onSubmit={handleTopupActionSubmit} className="flex min-h-[300px] flex-col justify-between space-y-6">
            {topupActionError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {topupActionError}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700">
              {topupActionModal.payment.code || `PAY-${topupActionModal.payment.id}`} —{" "}
              {formatRupiah(topupActionModal.payment.amount)}
            </div>

            {topupActionModal.mode === "accept" ? (
              <>
                <label className="block space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-600">
                    Kode Unik (opsional)
                  </span>
                  <input
                    value={topupActionForm.uniqueCode}
                    onChange={(event) =>
                      setTopupActionForm((current) => ({
                        ...current,
                        uniqueCode: event.target.value,
                      }))
                    }
                    placeholder="Contoh: 123 (selisih transfer manual)"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#C92C1E]"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-600">
                    Tanggal Transfer (opsional, dari bukti/struk)
                  </span>
                  <input
                    type="datetime-local"
                    value={topupActionForm.transferDateOverride}
                    onChange={(event) =>
                      setTopupActionForm((current) => ({
                        ...current,
                        transferDateOverride: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#C92C1E]"
                  />
                </label>
              </>
            ) : null}

            {topupActionModal.mode === "reject" ? (
              <label className="block space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-600">
                  Catatan (opsional)
                </span>
                <textarea
                  value={topupActionForm.note}
                  onChange={(event) =>
                    setTopupActionForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Alasan penolakan"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#C92C1E]"
                />
              </label>
            ) : null}

            {topupActionModal.mode === "transfer_date" ? (
              <label className="block space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-600">
                  Tanggal Transfer (wajib)
                </span>
                <input
                  type="datetime-local"
                  value={topupActionForm.transferDateOverride}
                  onChange={(event) =>
                    setTopupActionForm((current) => ({
                      ...current,
                      transferDateOverride: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#C92C1E]"
                />
              </label>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeTopupAction}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={topupActionSaving}
                className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {topupActionSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        ) : null}
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
