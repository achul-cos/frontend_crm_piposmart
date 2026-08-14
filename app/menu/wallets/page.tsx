"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import ColumnVisibilityControl from "@/app/components/table/ColumnVisibilityControl";
import AnalyticsTabSkeleton from "@/app/components/skeleton/AnalyticsTabSkeleton";
import dynamic from "next/dynamic";
import {
  createTransfer,
  confirmTransferMatch,
  rejectTransferMatch,
  authFetchJson,
  type TransferItem,
  type TransferMatchSuggestion,
  type BackendOwner,
} from "@/app/lib/api";
import { useTopUpDataQuery, useTransferDataQuery } from "@/app/lib/queries/wallets";
import OwnerSearchPicker from "@/app/components/OwnerSearchPicker";

import { RowActionGroup, ViewActionButton } from "@/app/components/table/RowActionButton";
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";
import ScreenPortal from "@/app/components/ui/ScreenPortal";
import ReportExportButton from "@/app/components/export/ReportExportButton";

const AnalyticsTab = dynamic(() => import("./AnalyticsTab"), {
  ssr: false,
  loading: () => <AnalyticsTabSkeleton sections={2} />,
});

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

const EMPTY_PAYMENTS: PaymentItem[] = [];
const EMPTY_WALLETS: WalletItem[] = [];
const EMPTY_LEDGERS: LedgerItem[] = [];
const EMPTY_OWNERS: WalletOwner[] = [];
const EMPTY_TRANSFERS: {
  items: TransferItem[];
  suggestions: TransferMatchSuggestion[];
  errorMessage?: string;
} = {
  items: [],
  suggestions: [],
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
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <ScreenPortal>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 md:p-6" onClick={onClose}>
        <div className="flex min-h-full items-center justify-center">
          <div
            className={`app-modal-panel w-full ${maxWidth} min-h-[460px] rounded-[32px] shadow-2xl transition-all`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-modal-header px-6 py-5 md:px-8 md:py-6">
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

            <div className="app-modal-body flex-1 min-h-0 space-y-6 p-6 md:p-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </ScreenPortal>
  );
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default function WalletsPage() {
  usePageTitle("Topup");

  const [activeTab, setActiveTab] = useState<
    "payments" | "wallets" | "ledger" | "analytics" | "transfer"
  >("payments");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<number[]>([]);
  const [selectedWalletIds, setSelectedWalletIds] = useState<number[]>([]);
  const [paidFrom, setPaidFrom] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [channelFilter, setChannelFilter] = useState("Semua");

  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [isDraggingPayments, setIsDraggingPayments] = useState(false);
  const [dragActionPayments, setDragActionPayments] = useState(false);

  useEffect(() => {
    const handleMouseUp = () => setIsDraggingPayments(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleRowMouseDown = (id: number) => {
    const willSelect = !selectedPaymentIds.includes(id);
    setIsDraggingPayments(true);
    setDragActionPayments(willSelect);
    setSelectedPaymentIds((prev) =>
      willSelect && !prev.includes(id) ? [...prev, id] : !willSelect ? prev.filter((pid) => pid !== id) : prev
    );
  };

  const handleRowMouseEnter = (id: number) => {
    if (isDraggingPayments) {
      setSelectedPaymentIds((prev) => {
        if (dragActionPayments && !prev.includes(id)) return [...prev, id];
        if (!dragActionPayments && prev.includes(id)) return prev.filter((pid) => pid !== id);
        return prev;
      });
    }
  };

  const topUpFilters = useMemo(
    () => ({ debouncedSearch, channelFilter, paidFrom, paidTo }),
    [debouncedSearch, channelFilter, paidFrom, paidTo],
  );
  const topUpQuery = useTopUpDataQuery(topUpFilters);
  const payments = topUpQuery.data?.payments ?? EMPTY_PAYMENTS;
  const wallets = topUpQuery.data?.wallets ?? EMPTY_WALLETS;
  const ledgers = topUpQuery.data?.ledgers ?? EMPTY_LEDGERS;
  const owners = topUpQuery.data?.owners ?? EMPTY_OWNERS;
  const errorMessage = topUpQuery.data?.errorMessage ?? "";
  const reloadTopUpData = () => void topUpQuery.refetch();
  const [loading, setLoading] = useState(false);
  const [paymentPage, setPaymentPage] = useState(1);
  const [walletPage, setWalletPage] = useState(1);

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

  const [transferOwnerId, setTransferOwnerId] = useState("");
  const [transferSearch, setTransferSearch] = useState("");
  const [debouncedTransferSearch, setDebouncedTransferSearch] = useState("");
  const [transferStatusFilter, setTransferStatusFilter] = useState("Semua Status");
  const [transferSourceFilter, setTransferSourceFilter] = useState("Semua Sumber");
  const [transferDateFrom, setTransferDateFrom] = useState("");
  const [transferDateTo, setTransferDateTo] = useState("");
  const [transferPage, setTransferPage] = useState(1);
  const [isCreateTransferOpen, setIsCreateTransferOpen] = useState(false);
  const [createTransferForm, setCreateTransferForm] = useState({
    ownerId: "",
    amount: "",
    transferDate: "",
    proofUrl: "",
    note: "",
  });
  const [selectedOwner, setSelectedOwner] = useState<BackendOwner | null>(null);
  const [selectedTransferOwner, setSelectedTransferOwner] = useState<BackendOwner | null>(null);
  const [selectedTransferFilterOwner, setSelectedTransferFilterOwner] = useState<BackendOwner | null>(null);

  useEffect(() => {
    if (transferOwnerId) {
      const found = owners.find((o) => o.id === Number(transferOwnerId));
      if (found && found.id) {
        setSelectedTransferFilterOwner({
          id: found.id,
          code: found.code || "",
          name: found.name || "",
          phone: "",
          brand_name: "",
          status: "ACTIVE",
        });
        return;
      }
    }
    setSelectedTransferFilterOwner(null);
  }, [transferOwnerId, owners]);

  useEffect(() => {
    if (isWalletActionOpen) {
      if (walletActionForm.ownerId) {
        const found = owners.find((o) => o.id === Number(walletActionForm.ownerId));
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
  }, [isWalletActionOpen, walletActionForm.ownerId, owners]);

  useEffect(() => {
    if (isCreateTransferOpen) {
      if (createTransferForm.ownerId) {
        const found = owners.find((o) => o.id === Number(createTransferForm.ownerId));
        if (found && found.id) {
          setSelectedTransferOwner({
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
      setSelectedTransferOwner(null);
    }
  }, [isCreateTransferOpen, createTransferForm.ownerId, owners]);
  const [creatingTransfer, setCreatingTransfer] = useState(false);
  const [createTransferError, setCreateTransferError] = useState("");
  const [matchActionLoadingId, setMatchActionLoadingId] = useState<number | null>(null);

  const [detailTitle, setDetailTitle] = useState("");

  const [isMounted, setIsMounted] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreActionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPaymentPage(1);
      setWalletPage(1);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [search]);

  const transferQuery = useTransferDataQuery(transferOwnerId, activeTab === "transfer");
  const transferData = transferQuery.data ?? EMPTY_TRANSFERS;
  const transferItems = transferData.items;
  const transferSuggestions = transferData.suggestions;
  const transferLoading = transferQuery.isLoading;
  const [transferActionError, setTransferError] = useState("");
  const transferError = transferActionError || (transferData.errorMessage ?? "");
  const loadTransferData = () => void transferQuery.refetch();
  const [transferPageSize, setTransferPageSize] = useState(10);

  const transferStatusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          transferItems
            .map((item) => item.match_status)
            .filter(Boolean),
        ),
      ),
    [transferItems],
  );

  const transferSourceOptions = useMemo(
    () =>
      Array.from(
        new Set(
          transferItems
            .map((item) => item.source)
            .filter(Boolean),
        ),
      ),
    [transferItems],
  );

  const filteredTransferItems = useMemo(() => {
    const keyword = debouncedTransferSearch.toLowerCase();

    return transferItems.filter((transfer) => {
      const transferDate = transfer.transfer_date ? new Date(transfer.transfer_date) : null;
      const fromDate = transferDateFrom ? new Date(`${transferDateFrom}T00:00:00`) : null;
      const toDate = transferDateTo ? new Date(`${transferDateTo}T23:59:59.999`) : null;

      if (transferOwnerId && String(transfer.owner?.id || "") !== transferOwnerId) {
        return false;
      }

      if (transferStatusFilter !== "Semua Status" && transfer.match_status !== transferStatusFilter) {
        return false;
      }

      if (transferSourceFilter !== "Semua Sumber" && transfer.source !== transferSourceFilter) {
        return false;
      }

      if (fromDate && (!transferDate || transferDate < fromDate)) {
        return false;
      }

      if (toDate && (!transferDate || transferDate > toDate)) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = [
        transfer.owner?.name,
        transfer.owner?.code,
        transfer.match_status,
        transfer.source,
        transfer.note,
        transfer.external_reference,
        transfer.amount,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [
    debouncedTransferSearch,
    transferDateFrom,
    transferDateTo,
    transferItems,
    transferOwnerId,
    transferSourceFilter,
    transferStatusFilter,
  ]);

  const transferTotalItems = filteredTransferItems.length;
  const transferTotalPages = Math.max(
    1,
    Math.ceil(transferTotalItems / transferPageSize),
  );

  const paginatedTransferItems = useMemo(() => {
    const start = (transferPage - 1) * transferPageSize;
    return filteredTransferItems.slice(start, start + transferPageSize);
  }, [filteredTransferItems, transferPage, transferPageSize]);

  const transferPageStart =
    transferTotalItems === 0 ? 0 : (transferPage - 1) * transferPageSize + 1;
  const transferPageEnd =
    transferTotalItems === 0
      ? 0
      : Math.min(transferPage * transferPageSize, transferTotalItems);

  useEffect(() => {
    setTransferPage(1);
  }, [
    activeTab,
    debouncedSearch,
    debouncedTransferSearch,
    transferDateFrom,
    transferDateTo,
    transferOwnerId,
    transferSourceFilter,
    transferStatusFilter,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedTransferSearch(transferSearch.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [transferSearch]);

  useEffect(() => {
    if (transferPage > transferTotalPages) {
      setTransferPage(transferTotalPages);
    }
  }, [transferPage, transferTotalPages]);

  const handleCheckTransferForOwner = (ownerId?: number) => {
    if (ownerId) {
      setTransferOwnerId(String(ownerId));
    }
    setActiveTab("transfer");
  };

  const handleCreateTransferSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!createTransferForm.ownerId) {
      setCreateTransferError("Owner wajib dipilih.");
      return;
    }

    if (!createTransferForm.amount || !createTransferForm.transferDate) {
      setCreateTransferError("Nominal dan tanggal transfer wajib diisi.");
      return;
    }

    setCreatingTransfer(true);
    setCreateTransferError("");

    try {
      await createTransfer(Number(createTransferForm.ownerId), {
        amount: createTransferForm.amount,
        transfer_date: new Date(createTransferForm.transferDate).toISOString(),
        proof_url: createTransferForm.proofUrl || undefined,
        note: createTransferForm.note || undefined,
      });

      setIsCreateTransferOpen(false);
      setCreateTransferForm({
        ownerId: transferOwnerId,
        amount: "",
        transferDate: "",
        proofUrl: "",
        note: "",
      });
      await loadTransferData();
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
      await loadTransferData();
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
      await loadTransferData();
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
      (totalVal, item) => totalVal + Number(item.amount || 0),
      0,
    );
    const totalWalletBalance = wallets.reduce(
      (totalVal, item) => totalVal + Number(item.balance || 0),
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

  const [paymentPageSize, setPaymentPageSize] = useState(10);
  const paymentTotalPages = Math.max(1, Math.ceil(payments.length / paymentPageSize));
  const paginatedPayments = useMemo(() => {
    const start = (paymentPage - 1) * paymentPageSize;
    return payments.slice(start, start + paymentPageSize);
  }, [payments, paymentPage, paymentPageSize]);

  const [walletPageSize, setWalletPageSize] = useState(10);
  const walletTotalPages = Math.max(1, Math.ceil(wallets.length / walletPageSize));
  const paginatedWallets = useMemo(() => {
    const start = (walletPage - 1) * walletPageSize;
    return wallets.slice(start, start + walletPageSize);
  }, [wallets, walletPage, walletPageSize]);

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

  const handleCreateWalletAction = async (event: React.FormEvent<HTMLFormElement>) => {
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
      reloadTopUpData();
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

  const handleTopupActionSubmit = async (event: React.FormEvent) => {
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
      reloadTopUpData();
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
      const walletResponse = await authFetch<WalletDetailResponse>(`/owners/${ownerId}/wallet`);

      const walletData = walletResponse.data as WalletDetailResponse | undefined;
      const detailWallet =
        walletData && "wallet" in walletData
          ? walletData.wallet
          : (walletData as WalletItem);

      setSelectedWalletDetail(detailWallet || wallet);
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
        </div>
      </div>

      <QuickInfoCardGrid columns={3}>
        <QuickInfoCard
          label="Revenue Top Up"
          value={formatRupiah(summary.totalTopUp)}
          description="Akumulasi top up berdasarkan paid_at."
          tone="accent"
          silhouette="wallet"
        />
        <QuickInfoCard
          label="Payment Paid"
          value={summary.paidCount}
          description={`Dari ${summary.totalPayments} payment yang tercatat.`}
          tone="emerald"
        />
        <QuickInfoCard
          label="Total Saldo Wallet"
          value={formatRupiah(summary.totalWalletBalance)}
          description="Saldo aktif wallet milik seluruh owner."
          tone="sky"
        />
      </QuickInfoCardGrid>

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
        <section className="flex flex-col rounded-2xl border border-gray-200/60 bg-white shadow-xs">
          {activeTab !== "transfer" && (
            <div className="flex flex-col">
              <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {activeTab === "payments" ? "Riwayat Top Up" : "Daftar Saldo Wallet"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeTab === "payments" ? "Daftar seluruh riwayat top up aplikasi." : "Daftar saldo aplikasi masing-masing owner."}
                  </p>
                </div>
                
                {/* ACTION BUTTONS */}
                <div className="flex w-full flex-wrap items-center gap-3">
                  {isMounted && isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleOpenWalletAction("topup")}
                      className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#A82216]"
                    >
                      <PlusIcon className="h-4 w-4" /> Top Up
                    </button>
                  )}

                  {activeTab === "payments" && (
                    <div className="flex items-center gap-2">
                      <ReportExportButton
                        reportKey="topups"
                        filters={{
                          q: debouncedSearch || undefined,
                          date_from: paidFrom || undefined,
                          date_to: paidTo || undefined,
                        }}
                        label="Export Top Up"
                        loadingLabel="Menyiapkan Export..."
                        successMessage="File top up sedang diunduh."
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>
                  )}

                  {activeTab === "payments" && selectedPaymentIds.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm">
                        <span className="flex items-center text-[#C92C1E]">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        </span>
                        {selectedPaymentIds.length} terpilih
                      </div>
                      <button
                        onClick={() => {
                          alert("Fitur hapus massal belum tersedia");
                          setSelectedPaymentIds([]);
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-red-100 px-4 py-2.5 text-sm font-bold text-red-700 shadow-sm transition hover:bg-red-200"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Pindahkan ke Sampah
                      </button>
                      <button
                        onClick={() => setSelectedPaymentIds([])}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-700"
                        title="Batal"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </>
                  )}

                  {/* 3-DOTS MORE MENU */}
                  {isMounted && isAdmin && (
                    <div className="relative" ref={moreMenuRef}>
                      <button
                        onClick={() => setIsMoreActionsOpen(!isMoreActionsOpen)}
                        className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 shadow-sm transition-all hover:bg-gray-50"
                        title="Lainnya"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>

                      {isMoreActionsOpen && (
                        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => { setIsMoreActionsOpen(false); handleOpenWalletAction("debit"); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Debit
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsMoreActionsOpen(false); handleOpenWalletAction("adjustment"); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Adjustment
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsMoreActionsOpen(false); handleOpenWalletAction("refund"); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Refund
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-b border-gray-50 px-6 py-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex flex-col gap-1.5 w-full md:w-auto">
                    <span className="text-xs font-semibold text-black">Channel</span>
                    <select
                      value={channelFilter}
                      onChange={(event) => setChannelFilter(event.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                    >
                      <option value="Semua">Semua Channel</option>
                      {channelOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 w-full md:w-auto">
                    <span className="text-xs font-semibold text-black">Tanggal Mulai</span>
                    <input
                      type="date"
                      value={paidFrom}
                      onChange={(event) => setPaidFrom(event.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 w-full md:w-auto">
                    <span className="text-xs font-semibold text-black">Tanggal Akhir</span>
                    <input
                      type="date"
                      value={paidTo}
                      onChange={(event) => setPaidTo(event.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                    />
                  </div>
                </div>
              </div>

              <div className="border-b border-gray-50 px-6 py-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Cari payment / owner..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                    />
                  </div>
                  <ColumnVisibilityControl
                    tableId={activeTab === "payments" ? "payments-table" : "wallets-table"}
                    storageKey={`column-visibility:${activeTab}-table`}
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
            </div>
          )}

          {activeTab === "payments" && (
            <div className="relative w-full">
              <div className="flex flex-col">
                <div className="overflow-x-auto">
                  <table id="payments-table" data-column-visibility-manual="true" className="w-full min-w-[980px] text-left text-sm text-gray-600">
                    <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="w-12 px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={payments.length > 0 && selectedPaymentIds.length === payments.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPaymentIds(payments.map(p => p.id));
                          } else {
                            setSelectedPaymentIds([]);
                          }
                        }}
                        className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                      />
                    </th>
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
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                        Data top up tidak ditemukan.
                      </td>
                    </tr>
                  ) : (
                    paginatedPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className={`transition-colors hover:bg-gray-50 cursor-pointer select-none ${selectedPaymentIds.includes(payment.id) ? "bg-red-50/50" : ""}`}
                        onMouseDown={() => handleRowMouseDown(payment.id)}
                        onMouseEnter={() => handleRowMouseEnter(payment.id)}
                      >
                        <td className="w-12 px-4 py-4 text-center align-top">
                          <input
                            type="checkbox"
                            readOnly
                            checked={selectedPaymentIds.includes(payment.id)}
                            className="pointer-events-none rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                          />
                        </td>
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
                              title="Detail"
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </Link>
                            
                            <button
                              type="button"
                              title="Cek Riwayat Transfer"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleCheckTransferForOwner(payment.owner?.id || payment.owner_id);
                              }}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-purple-50 text-purple-700 transition-colors hover:bg-purple-100"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            </button>

                            {payment.status === "PENDING" && isAdmin ? (
                              <>
                                <button
                                  type="button"
                                  title="Terima"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openTopupAction(payment, "accept");
                                  }}
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                                <button
                                  type="button"
                                  title="Tolak"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openTopupAction(payment, "reject");
                                  }}
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </>
                            ) : null}
                            {isAdmin ? (
                              <button
                                type="button"
                                title="Koreksi Tanggal"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openTopupAction(payment, "transfer_date");
                                }}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
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
          {paymentTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="text-xs font-medium text-gray-500">
                  Menampilkan <span className="font-bold text-gray-900">{(paymentPage - 1) * paymentPageSize + 1}</span> hingga{" "}
                  <span className="font-bold text-gray-900">{Math.min(paymentPage * paymentPageSize, payments.length)}</span> dari{" "}
                  <span className="font-bold text-gray-900">{payments.length}</span> data
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                  <select
                    value={paymentPageSize}
                    onChange={(e) => {
                      setPaymentPageSize(Number(e.target.value));
                      setPaymentPage(1);
                    }}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-[#C92C1E] focus:outline-none"
                  >
                    {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                  disabled={paymentPage === 1}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <span className="text-xs font-bold text-gray-700">Halaman {paymentPage} / {paymentTotalPages}</span>
                <button
                  onClick={() => setPaymentPage((p) => Math.min(paymentTotalPages, p + 1))}
                  disabled={paymentPage === paymentTotalPages}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
            </div>
            </div>
          )}

          {activeTab === "wallets" && (
            <div className="relative w-full">
              <div className="flex flex-col">
                <div className="overflow-x-auto">
                  <table id="wallets-table" data-column-visibility-manual="true" className="w-full min-w-[800px] text-left text-sm text-gray-600">
                    <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="w-12 px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={wallets.length > 0 && selectedWalletIds.length === wallets.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedWalletIds(wallets.map(w => w.id));
                          } else {
                            setSelectedWalletIds([]);
                          }
                        }}
                        className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                      />
                    </th>
                    <th className="px-4 py-4 font-black">Owner</th>
                    <th className="px-4 py-4 font-black">Status</th>
                    <th className="px-4 py-4 text-right font-black">Balance</th>
                    <th className="px-4 py-4 text-center font-black">Mutasi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {wallets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                        Data wallet tidak ditemukan.
                      </td>
                    </tr>
                  ) : (
                    paginatedWallets.map((wallet) => (
                      <tr
                        key={wallet.id}
                        className={`transition-colors hover:bg-gray-50 ${selectedWalletIds.includes(wallet.id) ? "bg-red-50/50" : ""}`}
                      >
                        <td className="w-12 px-4 py-4 text-center align-top">
                          <input
                            type="checkbox"
                            checked={selectedWalletIds.includes(wallet.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedWalletIds(prev =>
                                checked ? [...prev, wallet.id] : prev.filter(id => id !== wallet.id)
                              );
                            }}
                            className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                          />
                        </td>
                        <td 
                          className="px-4 py-4 align-top cursor-pointer"
                          onClick={() => handleOpenWalletDetail(wallet)}
                        >
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
                                  title="Debit Saldo"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleOpenWalletAction(
                                      "debit",
                                      String(wallet.owner?.id || wallet.owner_id || ""),
                                    );
                                  }}
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                </button>

                                <button
                                  type="button"
                                  title="Adjustment"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleOpenWalletAction(
                                      "adjustment",
                                      String(wallet.owner?.id || wallet.owner_id || ""),
                                    );
                                  }}
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-orange-50 text-orange-600 transition-colors hover:bg-orange-100"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>

                                <button
                                  type="button"
                                  title="Refund"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleOpenWalletAction(
                                      "refund",
                                      String(wallet.owner?.id || wallet.owner_id || ""),
                                    );
                                  }}
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
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
              {walletTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
                  <div className="flex items-center gap-4">
                    <div className="text-xs font-medium text-gray-500">
                      Menampilkan <span className="font-bold text-gray-900">{(walletPage - 1) * walletPageSize + 1}</span> hingga{" "}
                      <span className="font-bold text-gray-900">{Math.min(walletPage * walletPageSize, wallets.length)}</span> dari{" "}
                      <span className="font-bold text-gray-900">{wallets.length}</span> data
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                      <select
                        value={walletPageSize}
                        onChange={(e) => {
                          setWalletPageSize(Number(e.target.value));
                          setWalletPage(1);
                        }}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-[#C92C1E] focus:outline-none"
                      >
                        {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setWalletPage((p) => Math.max(1, p - 1))}
                      disabled={walletPage === 1}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Sebelumnya
                    </button>
                    <span className="text-xs font-bold text-gray-700">Halaman {walletPage} / {walletTotalPages}</span>
                    <button
                      onClick={() => setWalletPage((p) => Math.min(walletTotalPages, p + 1))}
                      disabled={walletPage === walletTotalPages}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
          )}

          {activeTab === "transfer" && (
            <div className="flex flex-col">
              {transferError && (
                <div className="px-6 py-4">
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                    {transferError}
                  </p>
                </div>
              )}

              {/* PANEL REKOMENDASI PENCOCOKAN TRANSFER */}
              {transferSuggestions.length > 0 && (
                <div className="mx-6 mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                  <div className="flex items-center gap-2 mb-3 text-amber-800">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="font-extrabold text-sm">Rekomendasi Pencocokan Transfer ({transferSuggestions.length})</h3>
                  </div>
                  <div className="space-y-3">
                    {transferSuggestions.map((sug) => (
                      <div key={sug.transfer.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-amber-100 text-xs shadow-xs">
                        <div>
                          <div className="font-bold text-gray-900">{sug.transfer.owner?.name} — {formatRupiah(sug.transfer.amount)}</div>
                          <div className="text-gray-500 mt-0.5">Ref Transfer: #{sug.transfer.id} | Top Up Payment: #{sug.wallet_payment_id}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmMatch(sug)}
                            disabled={matchActionLoadingId === sug.transfer.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {matchActionLoadingId === sug.transfer.id ? "Memproses..." : "Cocokkan"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectMatch(sug)}
                            disabled={matchActionLoadingId === sug.transfer.id}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors disabled:opacity-50"
                          >
                            Tolak
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {transferLoading ? (
                <p className="px-4 py-6 text-center text-sm font-bold text-gray-500">
                  Memuat data transfer...
                </p>
              ) : (
                <>
                  <div className="flex flex-col">
                    <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          Riwayat Transfer Owner
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                          Cari, filter, dan pantau seluruh transfer owner beserta status pencocokannya.
                        </p>
                      </div>

                      <div className="flex w-full flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          {isMounted && isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setCreateTransferError("");
                                setCreateTransferForm((current) => ({
                                  ...current,
                                  ownerId: transferOwnerId,
                                }));
                                setIsCreateTransferOpen(true);
                              }}
                              className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#A82216] active:scale-[0.98]"
                            >
                              <PlusIcon className="h-4 w-4" />
                              Catat Transfer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-gray-50 px-6 py-4">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="flex flex-col gap-1.5 w-full md:w-64">
                          <span className="text-xs font-semibold text-black">Owner</span>
                          <OwnerSearchPicker
                            value={selectedTransferFilterOwner}
                            onChange={(owner) => {
                              setSelectedTransferFilterOwner(owner);
                              setTransferOwnerId(owner ? String(owner.id) : "");
                            }}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 w-full md:w-auto">
                          <span className="text-xs font-semibold text-black">Status</span>
                          <select
                            value={transferStatusFilter}
                            onChange={(event) => setTransferStatusFilter(event.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                          >
                            <option value="Semua Status">Semua Status</option>
                            {transferStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5 w-full md:w-auto">
                          <span className="text-xs font-semibold text-black">Sumber</span>
                          <select
                            value={transferSourceFilter}
                            onChange={(event) => setTransferSourceFilter(event.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                          >
                            <option value="Semua Sumber">Semua Sumber</option>
                            {transferSourceOptions.map((source) => (
                              <option key={source} value={source}>
                                {source}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 w-full md:w-auto">
                          <span className="text-xs font-semibold text-black">Tanggal Mulai</span>
                          <input
                            type="date"
                            value={transferDateFrom}
                            onChange={(event) => setTransferDateFrom(event.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 w-full md:w-auto">
                          <span className="text-xs font-semibold text-black">Tanggal Akhir</span>
                          <input
                            type="date"
                            value={transferDateTo}
                            onChange={(event) => setTransferDateTo(event.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-gray-50 px-6 py-4">
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-1">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            placeholder="Cari owner, kode, nominal, sumber, catatan..."
                            value={transferSearch}
                            onChange={(event) => setTransferSearch(event.target.value)}
                            className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                          />
                        </div>
                        <ColumnVisibilityControl
                          tableId="wallet-transfer-table"
                          storageKey="column-visibility:wallet-transfer-table"
                          buttonLabel="Kolom"
                        />
                      </div>
                    </div>

                    <div className="relative w-full">
                      <div className="flex flex-col">
                        <div className="overflow-x-auto">
                          <table
                            id="wallet-transfer-table"
                            data-column-visibility-manual="true"
                            className="w-full min-w-[1100px] text-left text-sm text-gray-600"
                          >
                            <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                              <tr>
                                <th className="px-4 py-4 font-black">Owner</th>
                                <th className="px-4 py-4 font-black">Tanggal Transfer</th>
                                <th className="px-4 py-4 text-right font-black">Nominal</th>
                                <th className="px-4 py-4 font-black">Status</th>
                                <th className="px-4 py-4 font-black">Sumber</th>
                                <th className="px-4 py-4 font-black">Catatan</th>
                                <th className="px-4 py-4 text-center font-black">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                              {transferTotalItems === 0 ? (
                                <tr>
                                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                    Tidak ada transfer yang cocok dengan filter saat ini.
                                  </td>
                                </tr>
                              ) : (
                                paginatedTransferItems.map((transfer) => (
                                  <tr key={transfer.id} className="transition-colors hover:bg-gray-50">
                                    <td className="px-4 py-4 align-top">
                                      <div className="font-black text-gray-900">
                                        {transfer.owner?.name || "-"}
                                      </div>
                                      <div className="mt-1 text-[11px] font-bold text-gray-400">
                                        {transfer.owner?.code || "-"}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 align-top font-medium text-gray-600">
                                      <div className="font-bold text-gray-900">
                                        {formatTanggal(transfer.transfer_date)}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-right align-top font-black text-[#C92C1E]">
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
                                    <td className="px-4 py-4 align-top">
                                      <div className="max-w-[420px] whitespace-normal break-words font-medium leading-7 text-gray-600">
                                        {transfer.note || "-"}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-center align-top">
                                      <div className="flex justify-center">
                                        <RowActionGroup>
                                          <ViewActionButton
                                            href={`/menu/wallets/transfers/${transfer.id}`}
                                            title="Lihat Detail Transfer"
                                          />
                                        </RowActionGroup>
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

                    <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-medium text-gray-500">
                          Menampilkan{" "}
                          <span className="font-bold text-gray-900">{transferPageStart}</span>{" "}
                          hingga{" "}
                          <span className="font-bold text-gray-900">{transferPageEnd}</span>{" "}
                          dari{" "}
                          <span className="font-bold text-gray-900">{transferTotalItems}</span>{" "}
                          data
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                          <select
                            value={transferPageSize}
                            onChange={(e) => {
                              setTransferPageSize(Number(e.target.value));
                              setTransferPage(1);
                            }}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-[#C92C1E] focus:outline-none"
                          >
                            {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setTransferPage((prev) => Math.max(1, prev - 1))}
                          disabled={transferPage === 1}
                          className="rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Sebelumnya
                        </button>
                        <span className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-600">
                          {transferPage}/{transferTotalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setTransferPage((prev) => Math.min(transferTotalPages, prev + 1))
                          }
                          disabled={transferPage === transferTotalPages}
                          className="rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Selanjutnya
                        </button>
                      </div>
                    </div>
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
              Owner
            </label>
            <OwnerSearchPicker
              value={selectedTransferOwner}
              onChange={(owner) => {
                setSelectedTransferOwner(owner);
                setCreateTransferForm((current) => ({
                  ...current,
                  ownerId: owner ? String(owner.id) : "",
                }));
              }}
            />
          </div>

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

                <OwnerSearchPicker
                  value={selectedOwner}
                  onChange={(owner) => {
                    setSelectedOwner(owner);
                    setWalletActionForm((prev) => ({
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