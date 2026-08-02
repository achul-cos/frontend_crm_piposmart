"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AnalyticsTab from './AnalyticsTab';
import { authFetchJson } from '@/app/lib/api';

type ApiListResponse<T> = {
  data?:
    | T[]
    | {
        items?: T[];
        pagination?: {
          page?: number;
          limit?: number;
          total?: number;
        };
      };
};

type ApiSingleResponse<T> = {
  data?: T;
};

type PartnerType = {
  id?: number;
  code?: string;
  name?: string;
  commission_mode?: string;
  commission_value?: string;
};

type Partner = {
  id: number;
  code?: string;
  name?: string;
  status?: string;
  phone?: string;
  partner_type?: PartnerType;
  partner_type_id?: number;
};

type PartnerCommission = {
  id: number;
  code?: string;
  partner_id?: number;
  partner_code?: string;
  referral_id?: number;
  closing_id?: number;
  closing_code?: string;
  commission_mode?: "PERCENTAGE" | "FIXED" | "TIER" | string;
  commission_value?: string;
  base_amount?: string;
  commission_amount?: string;
  currency?: string;
  status?: "PENDING" | "APPROVED" | "PAID" | "CANCELLED" | string;
  commission_rule_id?: number | null;
  tier_ordinal?: number | null;
  approved_at?: string | null;
  paid_at?: string | null;
  cancelled_at?: string | null;
  note?: string;
  approved_by?: {
    id?: number;
    name?: string;
  };
  paid_by?: {
    id?: number;
    name?: string;
  };
};

type SyncCommissionResponse = {
  created?: number;
  items?: PartnerCommission[];
};

type PartnerPayout = {
  id: number;
  code?: string;
  partner_id?: number;
  total_amount?: string;
  currency?: string;
  status?: "PENDING" | "PAID" | "CANCELLED" | string;
  paid_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

function getListItems<T>(response: ApiListResponse<T>): T[] {
  if (Array.isArray(response.data)) return response.data;
  return response.data?.items || [];
}

function formatRupiah(value?: string | number | null) {
  const numberValue = Number(value || 0);

  if (Number.isNaN(numberValue)) return "Rp0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusClass(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PENDING") return "bg-amber-50 text-amber-700";
  if (normalized === "APPROVED") return "bg-blue-50 text-blue-700";
  if (normalized === "PAID") return "bg-emerald-50 text-emerald-700";
  if (normalized === "CANCELLED") return "bg-gray-100 text-gray-500";

  return "bg-slate-100 text-slate-600";
}

function getStatusDotClass(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PENDING") return "bg-amber-500";
  if (normalized === "APPROVED") return "bg-blue-500";
  if (normalized === "PAID") return "bg-emerald-500";
  if (normalized === "CANCELLED") return "bg-gray-400";

  return "bg-slate-400";
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authFetchJson<T>(path, options);
}

async function listPartners() {
  const response = await apiFetch<ApiListResponse<Partner>>(
    "/partners?page=1&limit=100",
  );

  return getListItems(response);
}

async function listCommissions(partnerId: number) {
  const response = await apiFetch<ApiListResponse<PartnerCommission>>(
    `/partners/${partnerId}/commissions?page=1&limit=100`,
  );

  return getListItems(response);
}

async function syncPartnerCommissions(partnerId: number) {
  const response = await apiFetch<ApiSingleResponse<SyncCommissionResponse>>(
    `/partners/${partnerId}/commissions/sync`,
    {
      method: "POST",
    },
  );

  return (
    response.data || {
      created: 0,
      items: [],
    }
  );
}

async function approveCommission(partnerId: number, commissionId: number) {
  const response = await apiFetch<ApiSingleResponse<PartnerCommission>>(
    `/partners/${partnerId}/commissions/${commissionId}/approve`,
    {
      method: "PATCH",
    },
  );

  return response.data;
}

async function payCommission(partnerId: number, commissionId: number) {
  const response = await apiFetch<ApiSingleResponse<PartnerCommission>>(
    `/partners/${partnerId}/commissions/${commissionId}/pay`,
    {
      method: "PATCH",
    },
  );

  return response.data;
}

async function cancelCommission(
  partnerId: number,
  commissionId: number,
  note: string,
) {
  const response = await apiFetch<ApiSingleResponse<PartnerCommission>>(
    `/partners/${partnerId}/commissions/${commissionId}/cancel`,
    {
      method: "PATCH",
      body: JSON.stringify({
        note,
      }),
    },
  );

  return response.data;
}

async function listPayouts(partnerId: number) {
  try {
    const response = await apiFetch<ApiListResponse<PartnerPayout>>(
      `/partners/${partnerId}/payouts?page=1&limit=50`,
    );

    return getListItems(response);
  } catch {
    return [];
  }
}

async function createPayout(partnerId: number) {
  const response = await apiFetch<ApiSingleResponse<PartnerPayout>>(
    `/partners/${partnerId}/payouts`,
    {
      method: "POST",
    },
  );

  return response.data;
}

async function payPayout(partnerId: number, payoutId: number) {
  const response = await apiFetch<ApiSingleResponse<PartnerPayout>>(
    `/partners/${partnerId}/payouts/${payoutId}/pay`,
    {
      method: "PATCH",
    },
  );

  return response.data;
}

async function cancelPayout(partnerId: number, payoutId: number) {
  const response = await apiFetch<ApiSingleResponse<PartnerPayout>>(
    `/partners/${partnerId}/payouts/${payoutId}/cancel`,
    {
      method: "PATCH",
    },
  );

  return response.data;
}

export default function KomisiPage() {
  const [activeTab, setActiveTab] = useState<"OPERATIONS" | "ANALYTICS">("OPERATIONS");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(
    null,
  );

  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);

  const [loadingPartners, setLoadingPartners] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [selectedCommission, setSelectedCommission] =
    useState<PartnerCommission | null>(null);

  const selectedPartner = useMemo(
    () => partners.find((item) => item.id === selectedPartnerId) || null,
    [partners, selectedPartnerId],
  );

  const summary = useMemo(() => {
    const total = commissions.length;

    const pending = commissions.filter(
      (item) => String(item.status).toUpperCase() === "PENDING",
    ).length;

    const approved = commissions.filter(
      (item) => String(item.status).toUpperCase() === "APPROVED",
    ).length;

    const paid = commissions.filter(
      (item) => String(item.status).toUpperCase() === "PAID",
    ).length;

    const cancelled = commissions.filter(
      (item) => String(item.status).toUpperCase() === "CANCELLED",
    ).length;

    const payableAmount = commissions
      .filter((item) => String(item.status).toUpperCase() === "APPROVED")
      .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

    const paidAmount = commissions
      .filter((item) => String(item.status).toUpperCase() === "PAID")
      .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

    return {
      total,
      pending,
      approved,
      paid,
      cancelled,
      payableAmount,
      paidAmount,
    };
  }, [commissions]);

  const loadPartners = useCallback(async () => {
    setLoadingPartners(true);
    setPageError("");

    try {
      const items = await listPartners();
      setPartners(items);

      if (!selectedPartnerId && items.length > 0) {
        setSelectedPartnerId(items[0].id);
      }
    } catch (error) {
      setPageError(getErrorMessage(error));
      setPartners([]);
    } finally {
      setLoadingPartners(false);
    }
  }, [selectedPartnerId]);

  const loadPartnerDetail = useCallback(async (partnerId: number) => {
    setLoadingDetail(true);
    setPageError("");

    try {
      const [commissionItems, payoutItems] = await Promise.all([
        listCommissions(partnerId),
        listPayouts(partnerId),
      ]);

      setCommissions(commissionItems);
      setPayouts(payoutItems);
    } catch (error) {
      setPageError(getErrorMessage(error));
      setCommissions([]);
      setPayouts([]);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPartners();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPartners]);

  useEffect(() => {
    if (!selectedPartnerId) return;

    const timer = window.setTimeout(() => {
      void loadPartnerDetail(selectedPartnerId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadPartnerDetail, selectedPartnerId]);

  const handleSync = async () => {
    if (!selectedPartnerId) return;

    setActionLoading("sync");
    setPageError("");
    setPageSuccess("");

    try {
      const result = await syncPartnerCommissions(selectedPartnerId);

      setPageSuccess(
        `Sync komisi berhasil. Komisi baru dibuat: ${result.created || 0}.`,
      );

      await loadPartnerDetail(selectedPartnerId);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setActionLoading("");
    }
  };

  const handleApprove = async (commission: PartnerCommission) => {
    if (!selectedPartnerId) return;

    setActionLoading(`approve-${commission.id}`);
    setPageError("");
    setPageSuccess("");

    try {
      await approveCommission(selectedPartnerId, commission.id);
      setPageSuccess("Komisi berhasil di-approve.");
      await loadPartnerDetail(selectedPartnerId);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setActionLoading("");
    }
  };

  const handlePay = async (commission: PartnerCommission) => {
    if (!selectedPartnerId) return;

    const confirmPay = window.confirm(
      `Bayar komisi ${commission.code || `#${commission.id}`} sebesar ${formatRupiah(
        commission.commission_amount,
      )}?`,
    );

    if (!confirmPay) return;

    setActionLoading(`pay-${commission.id}`);
    setPageError("");
    setPageSuccess("");

    try {
      await payCommission(selectedPartnerId, commission.id);
      setPageSuccess("Komisi berhasil dibayar.");
      await loadPartnerDetail(selectedPartnerId);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setActionLoading("");
    }
  };

  const handleCancel = async (commission: PartnerCommission) => {
    if (!selectedPartnerId) return;

    const note = window.prompt(
      `Masukkan alasan cancel untuk komisi ${
        commission.code || `#${commission.id}`
      }:`,
    );

    if (note === null) return;

    if (!note.trim()) {
      setPageError("Alasan cancel wajib diisi.");
      return;
    }

    setActionLoading(`cancel-${commission.id}`);
    setPageError("");
    setPageSuccess("");

    try {
      await cancelCommission(selectedPartnerId, commission.id, note.trim());
      setPageSuccess("Komisi berhasil dibatalkan.");
      await loadPartnerDetail(selectedPartnerId);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setActionLoading("");
    }
  };

  const handleCreatePayout = async () => {
    setPageError("");
    setPageSuccess("");

    if (!selectedPartnerId) {
      setPageError("Pilih partner terlebih dahulu sebelum membuat payout.");
      return;
    }

    if (summary.approved === 0) {
      setPageError(
        "Belum ada komisi APPROVED. Approve komisi terlebih dahulu sebelum membuat payout.",
      );
      return;
    }

    const confirmCreate = window.confirm(
      `Buat payout untuk ${summary.approved} komisi APPROVED milik ${
        selectedPartner?.name || "partner ini"
      } dengan estimasi total ${formatRupiah(summary.payableAmount)}?`,
    );

    if (!confirmCreate) return;

    setActionLoading("create-payout");

    try {
      await createPayout(selectedPartnerId);
      setPageSuccess("Payout berhasil dibuat.");
      await loadPartnerDetail(selectedPartnerId);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setActionLoading("");
    }
  };

  const handlePayPayout = async (payout: PartnerPayout) => {
    if (!selectedPartnerId) return;

    const confirmPay = window.confirm(
      `Bayar payout ${payout.code || `#${payout.id}`} sebesar ${formatRupiah(
        payout.total_amount,
      )}?`,
    );

    if (!confirmPay) return;

    setActionLoading(`pay-payout-${payout.id}`);
    setPageError("");
    setPageSuccess("");

    try {
      await payPayout(selectedPartnerId, payout.id);
      setPageSuccess("Payout berhasil dibayar.");
      await loadPartnerDetail(selectedPartnerId);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setActionLoading("");
    }
  };

  const handleCancelPayout = async (payout: PartnerPayout) => {
    if (!selectedPartnerId) return;

    const confirmCancel = window.confirm(
      `Batalkan payout ${payout.code || `#${payout.id}`}?`,
    );

    if (!confirmCancel) return;

    setActionLoading(`cancel-payout-${payout.id}`);
    setPageError("");
    setPageSuccess("");

    try {
      await cancelPayout(selectedPartnerId, payout.id);
      setPageSuccess("Payout berhasil dibatalkan.");
      await loadPartnerDetail(selectedPartnerId);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex min-w-0 flex-col gap-4 border-b-2 border-[#C92C1E] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex min-w-0 items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg
                className="h-3 w-3 shrink-0"
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
              <span className="truncate text-[#C92C1E]">Komisi</span>
            </div>

            <h1 className="break-words text-2xl font-black tracking-tight text-gray-900">
              Komisi Partner
            </h1>

            <p className="mt-1 break-words text-sm text-gray-500">
              Kelola komisi partner dari referral yang sudah closing confirmed,
              mulai dari sync, approve, payment, cancel, hingga payout batch.
            </p>
          </div>

          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto">
            <button
              type="button"
              onClick={handleSync}
              disabled={!selectedPartnerId || actionLoading === "sync"}
              className="w-full rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-black text-white shadow-sm shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {actionLoading === "sync" ? "Sync..." : "Sync Komisi"}
            </button>

            <button
              type="button"
              onClick={handleCreatePayout}
              disabled={!selectedPartnerId || actionLoading === "create-payout"}
              title={
                !selectedPartnerId
                  ? "Pilih partner terlebih dahulu."
                  : summary.approved === 0
                    ? "Approve komisi terlebih dahulu sebelum membuat payout."
                    : "Buat payout dari komisi approved."
              }
              className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-[#C92C1E] transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === "create-payout"
                ? "Membuat..."
                : summary.approved === 0
                  ? "Approve Komisi Dulu"
                  : "Buat Payout"}
            </button>
          </div>
        </div>

        {/* Sub Menu / Tab Selection */}
        <div className="mt-2 flex flex-wrap gap-2 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={() => setActiveTab("OPERATIONS")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
              activeTab === "OPERATIONS"
                ? "bg-[#C92C1E] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>Daftar Komisi & Payout</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ANALYTICS")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
              activeTab === "ANALYTICS"
                ? "bg-[#C92C1E] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>Analitik & Health Komisi</span>
          </button>
        </div>
      </div>

      {activeTab === "ANALYTICS" ? (
        <AnalyticsTab />
      ) : (
        <>
          {pageError ? (
            <div className="min-w-0 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {pageError}
            </div>
          ) : null}

          {pageSuccess ? (
            <div className="min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {pageSuccess}
            </div>
          ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">
            Total Komisi
          </p>
          <h2 className="text-3xl font-black">{summary.total}</h2>
        </div>

        <div className="min-w-0 rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Pending
          </p>
          <h2 className="text-3xl font-black text-gray-900">
            {summary.pending}
          </h2>
        </div>

        <div className="min-w-0 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Approved
          </p>
          <h2 className="text-3xl font-black text-gray-900">
            {summary.approved}
          </h2>
          <p className="mt-1 break-words text-xs font-bold text-blue-600">
            {formatRupiah(summary.payableAmount)}
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Paid
          </p>
          <h2 className="text-3xl font-black text-gray-900">{summary.paid}</h2>
          <p className="mt-1 break-words text-xs font-bold text-emerald-600">
            {formatRupiah(summary.paidAmount)}
          </p>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
        <div className="flex min-w-0 flex-col gap-3 border-b border-gray-100 bg-gray-50/50 p-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900">Ledger Komisi</p>
            <p className="mt-1 break-words text-xs font-medium text-gray-400">
              {selectedPartner
                ? `${selectedPartner.name || "-"} · ${
                    selectedPartner.code || `ID #${selectedPartner.id}`
                  }`
                : "Pilih partner terlebih dahulu."}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              selectedPartnerId && void loadPartnerDetail(selectedPartnerId)
            }
            disabled={!selectedPartnerId || loadingDetail}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {loadingDetail ? "Refresh..." : "Refresh"}
          </button>
        </div>

        <div className="min-w-0 p-4">
          {loadingDetail ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
              Memuat data komisi...
            </div>
          ) : !selectedPartnerId ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
              Pilih partner untuk melihat data komisi.
            </div>
          ) : commissions.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
              Belum ada komisi. Klik Sync Komisi untuk menarik closing confirmed
              dari referral partner.
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-4">
              {commissions.map((commission) => {
                const status = String(commission.status || "").toUpperCase();

                return (
                  <div
                    key={commission.id}
                    className="min-w-0 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-red-100 hover:bg-red-50/20"
                  >
                    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedCommission(commission)}
                        className="min-w-0 text-left"
                      >
                        <p className="break-words text-sm font-black text-gray-900 hover:text-[#C92C1E]">
                          {commission.code || `Komisi #${commission.id}`}
                        </p>
                        <p className="mt-1 break-words text-xs font-bold text-gray-400">
                          Closing: {commission.closing_code || "-"}
                        </p>
                      </button>

                      <span
                        className={`inline-flex w-max shrink-0 items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black ${getStatusClass(
                          commission.status,
                        )}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${getStatusDotClass(
                            commission.status,
                          )}`}
                        />
                        {commission.status || "-"}
                      </span>
                    </div>

                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="min-w-0 rounded-2xl bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                          Mode
                        </p>
                        <p className="mt-1 break-words text-sm font-black text-gray-900">
                          {commission.commission_mode || "-"}{" "}
                          {commission.commission_value || ""}
                        </p>
                      </div>

                      <div className="min-w-0 rounded-2xl bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                          Base
                        </p>
                        <p className="mt-1 break-words text-sm font-black text-gray-900">
                          {formatRupiah(commission.base_amount)}
                        </p>
                      </div>

                      <div className="min-w-0 rounded-2xl bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                          Komisi
                        </p>
                        <p className="mt-1 break-words text-sm font-black text-gray-900">
                          {formatRupiah(commission.commission_amount)}
                        </p>
                      </div>

                      <div className="min-w-0 rounded-2xl bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                          Paid At
                        </p>
                        <p className="mt-1 break-words text-sm font-black text-gray-900">
                          {formatDateTime(commission.paid_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:flex sm:justify-end">
                      {status === "PENDING" ? (
                        <button
                          type="button"
                          onClick={() => void handleApprove(commission)}
                          disabled={
                            actionLoading === `approve-${commission.id}`
                          }
                          className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === `approve-${commission.id}`
                            ? "Approve..."
                            : "Approve"}
                        </button>
                      ) : null}

                      {status === "APPROVED" ? (
                        <button
                          type="button"
                          onClick={() => void handlePay(commission)}
                          disabled={actionLoading === `pay-${commission.id}`}
                          className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === `pay-${commission.id}`
                            ? "Pay..."
                            : "Pay"}
                        </button>
                      ) : null}

                      {status === "PENDING" || status === "APPROVED" ? (
                        <button
                          type="button"
                          onClick={() => void handleCancel(commission)}
                          disabled={
                            actionLoading === `cancel-${commission.id}`
                          }
                          className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      ) : null}

                      {status === "PAID" || status === "CANCELLED" ? (
                        <span className="rounded-lg bg-gray-50 px-3 py-2 text-center text-xs font-bold text-gray-400">
                          Selesai
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
        <div className="border-b border-gray-100 bg-gray-50/50 p-4">
          <p className="text-sm font-black text-gray-900">Payout Batch</p>
          <p className="mt-1 break-words text-xs font-medium text-gray-400">
            Payout akan membatch commission berstatus APPROVED untuk partner
            terpilih.
          </p>
        </div>

        <div className="min-w-0 p-4">
          {payouts.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
              Belum ada payout untuk partner ini.
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-4">
              {payouts.map((payout) => {
                const status = String(payout.status || "").toUpperCase();

                return (
                  <div
                    key={payout.id}
                    className="min-w-0 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-black text-gray-900">
                          {payout.code || `PAYOUT-${payout.id}`}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          ID #{payout.id}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-max shrink-0 items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black ${getStatusClass(
                          payout.status,
                        )}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${getStatusDotClass(
                            payout.status,
                          )}`}
                        />
                        {payout.status || "-"}
                      </span>
                    </div>

                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="min-w-0 rounded-2xl bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                          Total
                        </p>
                        <p className="mt-1 break-words text-sm font-black text-gray-900">
                          {formatRupiah(payout.total_amount)}
                        </p>
                      </div>

                      <div className="min-w-0 rounded-2xl bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                          Created
                        </p>
                        <p className="mt-1 break-words text-sm font-black text-gray-900">
                          {formatDateTime(payout.created_at)}
                        </p>
                      </div>

                      <div className="min-w-0 rounded-2xl bg-gray-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                          Paid
                        </p>
                        <p className="mt-1 break-words text-sm font-black text-gray-900">
                          {formatDateTime(payout.paid_at)}
                        </p>
                      </div>
                    </div>

                    {status === "PENDING" ? (
                      <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:flex sm:justify-end">
                        <button
                          type="button"
                          onClick={() => void handlePayPayout(payout)}
                          disabled={
                            actionLoading === `pay-payout-${payout.id}`
                          }
                          className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Pay
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleCancelPayout(payout)}
                          disabled={
                            actionLoading === `cancel-payout-${payout.id}`
                          }
                          className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/70 p-4">
          <p className="text-sm font-black text-gray-900">Daftar Partner</p>
          <p className="mt-1 break-words text-xs font-medium text-gray-400">
            Pilih partner untuk melihat ledger komisi.
          </p>
        </div>

        <div className="min-w-0 p-4">
          {loadingPartners ? (
            <div className="rounded-2xl bg-gray-50 p-5 text-center text-sm font-bold text-gray-500">
              Memuat partner...
            </div>
          ) : partners.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-5 text-center text-sm font-bold text-gray-500">
              Belum ada data partner.
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-3">
              {partners.map((partner) => {
                const active = partner.id === selectedPartnerId;

                return (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className={`min-w-0 rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#C92C1E] bg-red-50 shadow-sm"
                        : "border-gray-100 bg-white hover:border-red-100 hover:bg-red-50/40"
                    }`}
                  >
                    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-black text-gray-900">
                          {partner.name || "-"}
                        </p>
                        <p className="mt-1 break-words text-xs font-bold text-gray-400">
                          {partner.code || `ID #${partner.id}`}
                        </p>
                      </div>

                      <span className="w-max shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#C92C1E]">
                        {partner.status || "ACTIVE"}
                      </span>
                    </div>

                    <div className="mt-3 min-w-0 rounded-xl bg-white/80 px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                        Tipe Komisi
                      </p>
                      <p className="mt-1 break-words text-xs font-black text-gray-800">
                        {partner.partner_type?.name || "-"} ·{" "}
                        {partner.partner_type?.commission_mode || "-"}{" "}
                        {partner.partner_type?.commission_value || ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedCommission ? (
        <div
          className="fixed inset-0 z-50 overflow-x-hidden bg-slate-950/70"
          onClick={() => setSelectedCommission(null)}
        >
          <div className="flex min-h-full w-full max-w-full items-center justify-center overflow-x-hidden p-4 md:p-6">
            <div
              className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#fff_0%,#fff8f5_55%,#fee2e2_100%)] px-5 py-4 md:px-6">
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                      Detail Komisi
                    </p>
                    <h2 className="mt-2 break-words text-lg font-black text-slate-950 md:text-xl">
                      {selectedCommission.code ||
                        `Komisi #${selectedCommission.id}`}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Detail ledger komisi partner.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCommission(null)}
                    className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-3 p-5 md:grid-cols-2 md:p-6">
                {[
                  ["Kode Komisi", selectedCommission.code || "-"],
                  ["Status", selectedCommission.status || "-"],
                  ["Partner Code", selectedCommission.partner_code || "-"],
                  ["Closing Code", selectedCommission.closing_code || "-"],
                  [
                    "Mode",
                    `${selectedCommission.commission_mode || "-"} ${
                      selectedCommission.commission_value || ""
                    }`,
                  ],
                  [
                    "Base Amount",
                    formatRupiah(selectedCommission.base_amount),
                  ],
                  [
                    "Commission Amount",
                    formatRupiah(selectedCommission.commission_amount),
                  ],
                  ["Currency", selectedCommission.currency || "IDR"],
                  [
                    "Commission Rule ID",
                    selectedCommission.commission_rule_id
                      ? String(selectedCommission.commission_rule_id)
                      : "-",
                  ],
                  [
                    "Tier Ordinal",
                    selectedCommission.tier_ordinal
                      ? String(selectedCommission.tier_ordinal)
                      : "-",
                  ],
                  [
                    "Approved At",
                    formatDateTime(selectedCommission.approved_at),
                  ],
                  ["Paid At", formatDateTime(selectedCommission.paid_at)],
                  ["Note", selectedCommission.note || "-"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    <p className="mt-1 break-words text-sm font-black text-gray-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
        </>
      )}
    </div>
  );
}

