"use client";

import { useEffect, useMemo, useState } from "react";
import AnalyticsTab from './AnalyticsTab';
import { useFeedback } from '@/app/components/feedback/FeedbackContext';
import { AnimatedListItem } from '@/app/components/motion/primitives';
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";
import {
  type Partner,
  type PartnerCommission,
  type PartnerPayout,
  usePartnersQuery,
  usePartnerCommissionsQuery,
  usePartnerPayoutsQuery,
  useSyncPartnerCommissions,
  useApproveCommission,
  usePayCommission,
  useCancelCommission,
  useCreatePayout,
  usePayPayout,
  useCancelPayout,
} from '@/app/lib/queries/komisi';

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
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

export default function KomisiPage() {
  const { confirm, withLoading, showSuccess, showError } = useFeedback();
  const [activeTab, setActiveTab] = useState<"OPERATIONS" | "ANALYTICS">("OPERATIONS");
  const [komisiPage, setKomisiPage] = useState(1);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(
    null,
  );

  const [actionLoading, setActionLoading] = useState("");
  const [selectedCommission, setSelectedCommission] =
    useState<PartnerCommission | null>(null);

  const {
    data: partners = [],
    isLoading: loadingPartners,
    error: partnersError,
  } = usePartnersQuery();

  // First partner is auto-selected once the list resolves, if nothing is picked yet.
  useEffect(() => {
    if (!selectedPartnerId && partners.length > 0) {
      setSelectedPartnerId(partners[0].id);
    }
  }, [partners, selectedPartnerId]);

  const {
    data: commissions = [],
    isLoading: loadingCommissions,
    isFetching: fetchingCommissions,
    error: commissionsError,
    refetch: refetchCommissions,
  } = usePartnerCommissionsQuery(selectedPartnerId);
  const {
    data: payouts = [],
    error: payoutsError,
    refetch: refetchPayouts,
  } = usePartnerPayoutsQuery(selectedPartnerId);

  const loadPartnerDetail = (_partnerId: number) => {
    void refetchCommissions();
    void refetchPayouts();
  };

  const loadingDetail = loadingCommissions || fetchingCommissions;
  const detailError = commissionsError || payoutsError;
  const pageError = partnersError
    ? getErrorMessage(partnersError)
    : detailError
      ? getErrorMessage(detailError)
      : "";

  const syncMutation = useSyncPartnerCommissions(selectedPartnerId);
  const approveMutation = useApproveCommission(selectedPartnerId);
  const payMutation = usePayCommission(selectedPartnerId);
  const cancelMutation = useCancelCommission(selectedPartnerId);
  const createPayoutMutation = useCreatePayout(selectedPartnerId);
  const payPayoutMutation = usePayPayout(selectedPartnerId);
  const cancelPayoutMutation = useCancelPayout(selectedPartnerId);

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

  const handleSync = async () => {
    if (!selectedPartnerId) return;

    setActionLoading("sync");

    try {
      const result = await withLoading(
        () => syncMutation.mutateAsync(),
        { label: "Sinkronisasi komisi..." },
      );

      showSuccess({
        title: "Sync komisi berhasil",
        message: `Komisi baru dibuat: ${result.created || 0}.`,
      });
    } catch (error) {
      showError({
        title: "Sync komisi gagal",
        message: "Sistem gagal menarik data closing confirmed menjadi komisi.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau data referral yang belum lengkap.",
        solution: "Periksa koneksi Anda dan coba lagi. Jika masalah berlanjut, hubungi tim support.",
        technicalDetails: getErrorMessage(error),
        onRetry: () => void handleSync(),
      });
    } finally {
      setActionLoading("");
    }
  };

  const handleApprove = async (commission: PartnerCommission) => {
    if (!selectedPartnerId) return;

    setActionLoading(`approve-${commission.id}`);

    try {
      await withLoading(() => approveMutation.mutateAsync(commission.id), {
        label: "Menyetujui komisi...",
      });
      showSuccess({
        title: "Komisi disetujui",
        message: `Komisi ${commission.code || `#${commission.id}`} berhasil di-approve.`,
      });
    } catch (error) {
      showError({
        title: "Approve komisi gagal",
        message: "Sistem gagal menyetujui komisi ini.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau status komisi sudah berubah.",
        solution: "Muat ulang data komisi lalu coba lagi.",
        technicalDetails: getErrorMessage(error),
        onRetry: () => void handleApprove(commission),
      });
    } finally {
      setActionLoading("");
    }
  };

  const handlePay = async (commission: PartnerCommission) => {
    if (!selectedPartnerId) return;

    const confirmed = await confirm({
      title: "Bayar Komisi",
      message: `Bayar komisi ${commission.code || `#${commission.id}`} sebesar ${formatRupiah(
        commission.commission_amount,
      )}?`,
      confirmLabel: "Bayar",
    });

    if (!confirmed) return;

    setActionLoading(`pay-${commission.id}`);

    try {
      await withLoading(() => payMutation.mutateAsync(commission.id), {
        label: "Memproses pembayaran...",
      });
      showSuccess({
        title: "Komisi dibayar",
        message: `Komisi ${commission.code || `#${commission.id}`} berhasil dibayar.`,
      });
    } catch (error) {
      showError({
        title: "Pembayaran komisi gagal",
        message: "Sistem gagal memproses pembayaran komisi ini.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau status komisi sudah berubah sejak halaman dimuat.",
        solution: "Muat ulang data komisi lalu coba lagi.",
        technicalDetails: getErrorMessage(error),
        onRetry: () => void handlePay(commission),
      });
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
      showError({
        title: "Alasan cancel wajib diisi",
        message: "Komisi tidak dapat dibatalkan tanpa alasan.",
        solution: "Ulangi proses cancel dan isi alasan pembatalan.",
      });
      return;
    }

    setActionLoading(`cancel-${commission.id}`);

    try {
      await withLoading(
        () => cancelMutation.mutateAsync({ commissionId: commission.id, note: note.trim() }),
        { label: "Membatalkan komisi..." },
      );
      showSuccess({
        title: "Komisi dibatalkan",
        message: `Komisi ${commission.code || `#${commission.id}`} berhasil dibatalkan.`,
      });
    } catch (error) {
      showError({
        title: "Pembatalan komisi gagal",
        message: "Sistem gagal membatalkan komisi ini.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau status komisi sudah berubah.",
        solution: "Muat ulang data komisi lalu coba lagi.",
        technicalDetails: getErrorMessage(error),
        onRetry: () => void handleCancel(commission),
      });
    } finally {
      setActionLoading("");
    }
  };

  const handleCreatePayout = async () => {
    if (!selectedPartnerId) {
      showError({
        title: "Partner belum dipilih",
        message: "Pilih partner terlebih dahulu sebelum membuat payout.",
      });
      return;
    }

    if (summary.approved === 0) {
      showError({
        title: "Belum ada komisi APPROVED",
        message: "Approve komisi terlebih dahulu sebelum membuat payout.",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Buat Payout",
      message: `Buat payout untuk ${summary.approved} komisi APPROVED milik ${
        selectedPartner?.name || "partner ini"
      } dengan estimasi total ${formatRupiah(summary.payableAmount)}?`,
      confirmLabel: "Buat Payout",
    });

    if (!confirmed) return;

    setActionLoading("create-payout");

    try {
      await withLoading(() => createPayoutMutation.mutateAsync(), {
        label: "Membuat payout...",
      });
      showSuccess({
        title: "Payout dibuat",
        message: "Payout berhasil dibuat dari komisi yang sudah approved.",
      });
    } catch (error) {
      showError({
        title: "Pembuatan payout gagal",
        message: "Sistem gagal membuat payout untuk partner ini.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau tidak ada komisi approved yang tersisa.",
        solution: "Muat ulang data komisi lalu coba lagi.",
        technicalDetails: getErrorMessage(error),
        onRetry: () => void handleCreatePayout(),
      });
    } finally {
      setActionLoading("");
    }
  };

  const handlePayPayout = async (payout: PartnerPayout) => {
    if (!selectedPartnerId) return;

    const confirmed = await confirm({
      title: "Bayar Payout",
      message: `Bayar payout ${payout.code || `#${payout.id}`} sebesar ${formatRupiah(
        payout.total_amount,
      )}?`,
      confirmLabel: "Bayar",
    });

    if (!confirmed) return;

    setActionLoading(`pay-payout-${payout.id}`);

    try {
      await withLoading(() => payPayoutMutation.mutateAsync(payout.id), {
        label: "Memproses pembayaran payout...",
      });
      showSuccess({
        title: "Payout dibayar",
        message: `Payout ${payout.code || `#${payout.id}`} berhasil dibayar.`,
      });
    } catch (error) {
      showError({
        title: "Pembayaran payout gagal",
        message: "Sistem gagal memproses pembayaran payout ini.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau status payout sudah berubah.",
        solution: "Muat ulang data payout lalu coba lagi.",
        technicalDetails: getErrorMessage(error),
        onRetry: () => void handlePayPayout(payout),
      });
    } finally {
      setActionLoading("");
    }
  };

  const handleCancelPayout = async (payout: PartnerPayout) => {
    if (!selectedPartnerId) return;

    const confirmed = await confirm({
      title: "Batalkan Payout",
      message: `Batalkan payout ${payout.code || `#${payout.id}`}?`,
      confirmLabel: "Batalkan",
      danger: true,
    });

    if (!confirmed) return;

    setActionLoading(`cancel-payout-${payout.id}`);

    try {
      await withLoading(() => cancelPayoutMutation.mutateAsync(payout.id), {
        label: "Membatalkan payout...",
      });
      showSuccess({
        title: "Payout dibatalkan",
        message: `Payout ${payout.code || `#${payout.id}`} berhasil dibatalkan.`,
      });
    } catch (error) {
      showError({
        title: "Pembatalan payout gagal",
        message: "Sistem gagal membatalkan payout ini.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau status payout sudah berubah.",
        solution: "Muat ulang data payout lalu coba lagi.",
        technicalDetails: getErrorMessage(error),
        onRetry: () => void handleCancelPayout(payout),
      });
    } finally {
      setActionLoading("");
    }
  };

  const komisiPageSize = 20;
  const komisiTotalItems = commissions.length;
  const komisiTotalPages = Math.max(1, Math.ceil(komisiTotalItems / komisiPageSize));
  const paginatedKomisi = useMemo(() => {
    const start = (komisiPage - 1) * komisiPageSize;
    return commissions.slice(start, start + komisiPageSize);
  }, [commissions, komisiPage]);

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
        </div>
      </div>

      <QuickInfoCardGrid>
        <QuickInfoCard
          label="Total Komisi"
          value={summary.total}
          description="Total ledger komisi partner yang tercatat."
          tone="accent"
          silhouette="percent"
        />
        <QuickInfoCard
          label="Pending"
          value={summary.pending}
          description="Komisi yang belum disetujui atau dibayarkan."
          tone="amber"
        />
        <QuickInfoCard
          label="Approved"
          value={summary.approved}
          description={formatRupiah(summary.payableAmount)}
          tone="sky"
        />
        <QuickInfoCard
          label="Paid"
          value={summary.paid}
          description={formatRupiah(summary.paidAmount)}
          tone="emerald"
        />
      </QuickInfoCardGrid>

      <div className="flex w-max max-w-full overflow-x-auto rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="flex text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("OPERATIONS")}
            className={`rounded-lg px-5 py-2.5 transition-all ${
              activeTab === "OPERATIONS"
                ? "bg-white text-[#C92C1E] shadow-sm"
                : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
            }`}
          >
            Daftar Komisi & Payout
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ANALYTICS")}
            className={`rounded-lg px-5 py-2.5 transition-all ${
              activeTab === "ANALYTICS"
                ? "bg-white text-[#C92C1E] shadow-sm"
                : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
            }`}
          >
            Analitik & Health Komisi
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

      <div className="flex flex-col rounded-2xl border border-gray-200/60 bg-white shadow-xs">
        <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Ledger Komisi</h2>
            <p className="mt-1 text-sm text-gray-500">
              {selectedPartner
                ? `${selectedPartner.name || "-"} · ${
                    selectedPartner.code || `ID #${selectedPartner.id}`
                  }`
                : "Pilih partner terlebih dahulu."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSync}
                disabled={!selectedPartnerId || actionLoading === "sync"}
                className="w-full sm:w-auto rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-black text-white shadow-sm shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
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
                className="w-full sm:w-auto rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-[#C92C1E] transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "create-payout"
                  ? "Membuat..."
                  : summary.approved === 0
                    ? "Approve Komisi Dulu"
                    : "Buat Payout"}
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                selectedPartnerId && void loadPartnerDetail(selectedPartnerId)
              }
              disabled={!selectedPartnerId || loadingDetail}
              className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingDetail ? "Refresh..." : "Refresh"}
            </button>
          </div>
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
                          title="Approve"
                          onClick={() => void handleApprove(commission)}
                          disabled={actionLoading === `approve-${commission.id}`}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === `approve-${commission.id}` ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          )}
                        </button>
                      ) : null}

                      {status === "APPROVED" ? (
                        <button
                          type="button"
                          title="Pay"
                          onClick={() => void handlePay(commission)}
                          disabled={actionLoading === `pay-${commission.id}`}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === `pay-${commission.id}` ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          )}
                        </button>
                      ) : null}

                      {status === "PENDING" || status === "APPROVED" ? (
                        <button
                          type="button"
                          title="Cancel"
                          onClick={() => void handleCancel(commission)}
                          disabled={
                            actionLoading === `cancel-${commission.id}`
                          }
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === `cancel-${commission.id}` ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          )}
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

      <div className="flex flex-col rounded-2xl border border-gray-200/60 bg-white shadow-xs">
        <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payout Batch</h2>
            <p className="mt-1 text-sm text-gray-500">
              Payout akan membatch commission berstatus APPROVED untuk partner
              terpilih.
            </p>
          </div>
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
                          title="Pay"
                          onClick={() => void handlePayPayout(payout)}
                          disabled={
                            actionLoading === `pay-payout-${payout.id}`
                          }
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === `pay-payout-${payout.id}` ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          )}
                        </button>

                        <button
                          type="button"
                          title="Cancel"
                          onClick={() => void handleCancelPayout(payout)}
                          disabled={
                            actionLoading === `cancel-payout-${payout.id}`
                          }
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === `cancel-payout-${payout.id}` ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          )}
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

      <div className="flex flex-col rounded-2xl border border-gray-200/60 bg-white shadow-xs">
        <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Daftar Partner</h2>
            <p className="mt-1 text-sm text-gray-500">
              Pilih partner untuk melihat ledger komisi.
            </p>
          </div>
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
              className="app-modal-panel w-full max-w-3xl rounded-[32px] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="app-modal-header px-5 py-4 md:px-6">
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
                    className="app-modal-close shrink-0 rounded-2xl px-4 py-2 text-xs font-black transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              <div className="app-modal-body grid min-w-0 grid-cols-1 gap-3 p-5 md:grid-cols-2 md:p-6">
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

