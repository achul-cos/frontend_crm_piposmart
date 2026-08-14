"use client";

// React Query hooks for app/menu/wallets/**. Replaces the old getCached/setCached
// (app/lib/sessionCache.ts) plumbing that used to live inline in
// app/menu/wallets/page.tsx. Domain types that page.tsx and this file both need
// (WalletOwner, WalletItem, PaymentItem, LedgerItem, ...) live here so page.tsx
// can import them instead of re-declaring, avoiding drift/circular imports.

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  authFetchJson,
  createTransfer,
  getTransferSuggestions,
  getWalletPaymentDetail,
  listOwnerTransfers,
  listTransfers,
  confirmTransferMatch,
  rejectTransferMatch,
  type CreateTransferPayload,
  type TransferItem,
  type TransferMatchSuggestion,
  type WalletPaymentDetailData,
} from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Shared domain types (moved from app/menu/wallets/page.tsx)
// ---------------------------------------------------------------------------

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

export type WalletOwner = {
  id?: number;
  code?: string;
  name?: string;
  kode_owner?: string;
  nama_owner?: string;
};

export type WalletItem = {
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
export type PaymentStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "PAID";

export type PaymentItem = {
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

export type LedgerItem = {
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
    return data.data as T[];
  }

  return [];
};

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

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const walletsKeys = {
  all: ["wallets"] as const,
  topUp: (filters: TopUpFilters) => ["wallets", "topup", filters] as const,
  transfers: (ownerId: string) => ["wallets", "transfers", ownerId] as const,
  transfersAll: ["wallets", "transfers"] as const,
  paymentDetail: (paymentId: number) =>
    ["wallets", "payment-detail", paymentId] as const,
};

// ---------------------------------------------------------------------------
// Top up tab (payments / wallets / ledger / owners), combined into one query
// ---------------------------------------------------------------------------

export interface TopUpFilters {
  debouncedSearch: string;
  channelFilter: string;
  paidFrom: string;
  paidTo: string;
}

export interface TopUpData {
  payments: PaymentItem[];
  wallets: WalletItem[];
  ledgers: LedgerItem[];
  owners: WalletOwner[];
  errorMessage: string;
}

async function fetchTopUpData(filters: TopUpFilters): Promise<TopUpData> {
  const { debouncedSearch, channelFilter, paidFrom, paidTo } = filters;

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

  const payments =
    paymentResult.status === "fulfilled"
      ? normalizeList<PaymentItem>(paymentResult.value.data)
      : [];
  const wallets =
    walletResult.status === "fulfilled"
      ? normalizeList<WalletItem>(walletResult.value.data)
      : [];
  const ledgers =
    ledgerResult.status === "fulfilled"
      ? normalizeList<LedgerItem>(ledgerResult.value.data)
      : [];
  const owners =
    ownerResult.status === "fulfilled"
      ? normalizeList<WalletOwner>(ownerResult.value.data)
      : [];

  const firstError = [paymentResult, walletResult, ledgerResult, ownerResult].find(
    (result) => result.status === "rejected",
  ) as PromiseRejectedResult | undefined;

  const errorMessage = firstError
    ? firstError.reason instanceof Error
      ? firstError.reason.message
      : "Sebagian data top up gagal dimuat."
    : "";

  return { payments, wallets, ledgers, owners, errorMessage };
}

export function useTopUpDataQuery(filters: TopUpFilters) {
  return useQuery({
    queryKey: walletsKeys.topUp(filters),
    queryFn: () => fetchTopUpData(filters),
    placeholderData: keepPreviousData,
  });
}

// ---------------------------------------------------------------------------
// Transfer tab
// ---------------------------------------------------------------------------

export interface TransferData {
  items: TransferItem[];
  suggestions: TransferMatchSuggestion[];
  errorMessage: string;
}

async function fetchTransferData(ownerId: string): Promise<TransferData> {
  const [listResult, suggestionResult] = await Promise.allSettled(
    ownerId
      ? [
          listOwnerTransfers(Number(ownerId), { all: true }),
          getTransferSuggestions(Number(ownerId)),
        ]
      : [listTransfers({ all: true }), Promise.resolve([] as TransferMatchSuggestion[])],
  );

  const items =
    listResult.status === "fulfilled" ? listResult.value.items || [] : [];
  const suggestions =
    suggestionResult.status === "fulfilled" ? suggestionResult.value || [] : [];

  const firstError = [listResult, suggestionResult].find(
    (result) => result.status === "rejected",
  ) as PromiseRejectedResult | undefined;

  const errorMessage = firstError
    ? firstError.reason instanceof Error
      ? firstError.reason.message
      : "Sebagian data transfer gagal dimuat."
    : "";

  return { items, suggestions, errorMessage };
}

export function useTransferDataQuery(ownerId: string, enabled: boolean) {
  return useQuery({
    queryKey: walletsKeys.transfers(ownerId),
    queryFn: () => fetchTransferData(ownerId),
    enabled,
    placeholderData: keepPreviousData,
  });
}

// ---------------------------------------------------------------------------
// Payment detail (used by app/menu/wallets/payments/[id]/page.tsx)
// ---------------------------------------------------------------------------

export function usePaymentDetailQuery(paymentId: number, enabled: boolean) {
  return useQuery<WalletPaymentDetailData>({
    queryKey: walletsKeys.paymentDetail(paymentId),
    queryFn: () => getWalletPaymentDetail(paymentId),
    enabled,
  });
}

// ---------------------------------------------------------------------------
// Wallet mutations: topup / debit / adjustment / refund
// ---------------------------------------------------------------------------

export type WalletActionType = "topup" | "debit" | "adjustment" | "refund";

const walletActionPath: Record<WalletActionType, string> = {
  topup: "topups",
  debit: "debits",
  adjustment: "adjustments",
  refund: "refunds",
};

export interface WalletActionInput {
  type: WalletActionType;
  ownerId: string;
  body: Record<string, unknown>;
}

export function useWalletActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, ownerId, body }: WalletActionInput) => {
      return authFetch(`/owners/${ownerId}/wallet/${walletActionPath[type]}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletsKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Wallet payment (top up) actions: accept / reject / correct transfer date
// ---------------------------------------------------------------------------

export interface TopupActionInput {
  paymentId: number;
  mode: "accept" | "reject" | "transfer_date";
  uniqueCode?: string;
  /** ISO string, already converted from datetime-local by the caller. */
  transferDateOverride?: string;
  note?: string;
}

export function useTopupActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TopupActionInput) => {
      if (input.mode === "accept") {
        return authFetch(`/wallet-payments/${input.paymentId}/accept`, {
          method: "PATCH",
          body: JSON.stringify({
            unique_code: input.uniqueCode || undefined,
            transfer_date_override: input.transferDateOverride || undefined,
          }),
        });
      }

      if (input.mode === "reject") {
        return authFetch(`/wallet-payments/${input.paymentId}/reject`, {
          method: "PATCH",
          body: JSON.stringify({ note: input.note || undefined }),
        });
      }

      return authFetch(`/wallet-payments/${input.paymentId}/transfer-date`, {
        method: "PATCH",
        body: JSON.stringify({ transfer_date: input.transferDateOverride }),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: walletsKeys.all });
      queryClient.invalidateQueries({
        queryKey: walletsKeys.paymentDetail(variables.paymentId),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Transfer mutations
// ---------------------------------------------------------------------------

export function useCreateTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ownerId,
      payload,
    }: {
      ownerId: number;
      payload: CreateTransferPayload;
    }) => createTransfer(ownerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletsKeys.transfersAll });
    },
  });
}

export function useConfirmTransferMatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (suggestion: TransferMatchSuggestion) =>
      confirmTransferMatch(suggestion.transfer.id, {
        wallet_payment_id: suggestion.wallet_payment_id,
        unique_code: suggestion.unique_code,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletsKeys.transfersAll });
      queryClient.invalidateQueries({ queryKey: walletsKeys.all });
    },
  });
}

export function useRejectTransferMatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (suggestion: TransferMatchSuggestion) =>
      rejectTransferMatch(suggestion.transfer.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletsKeys.transfersAll });
    },
  });
}
