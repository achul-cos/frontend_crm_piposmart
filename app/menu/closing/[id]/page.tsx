"use client";

import React, { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { useClosingDetailQuery } from "@/app/lib/queries/closing";
import { ArrowLeft, CreditCard, Calendar, User, Phone, CheckCircle, Clock, Percent, AlertCircle, FileText } from "lucide-react";

export default function ClosingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const closingId = parseInt(id, 10);

  usePageTitle(`Detail Closing #${closingId} | CRM Piposmart`);

  const { data: closing, isLoading, error } = useClosingDetailQuery(closingId, !isNaN(closingId));

  const formatDateTime = (str?: string) => {
    if (!str) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(str));
  };

  const formatCurrency = (amount?: string, currency = "IDR") => {
    if (!amount) return "-";
    const value = parseFloat(amount);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PENDING_RECONCILIATION":
        return <span className="rounded-full bg-yellow-100 border border-yellow-200 px-3 py-1 text-xs font-black uppercase text-yellow-800">Pending Rekonsiliasi</span>;
      case "CONFIRMED":
        return <span className="rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-black uppercase text-emerald-700">Berhasil (Confirmed)</span>;
      case "REJECTED":
        return <span className="rounded-full bg-red-100 border border-red-200 px-3 py-1 text-xs font-black uppercase text-red-700">Ditolak (Rejected)</span>;
      case "CANCELED":
        return <span className="rounded-full bg-gray-200 border border-gray-300 px-3 py-1 text-xs font-black uppercase text-gray-700">Dibatalkan</span>;
      default:
        return <span className="rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-black uppercase text-gray-700">{status || "-"}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#C92C1E]" />
      </div>
    );
  }

  if (error || !closing) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
        <p className="font-bold">Gagal memuat data detail closing.</p>
        <p className="mt-1 text-xs">{error instanceof Error ? error.message : "Data tidak ditemukan"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-black"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 font-sans text-[#1C1C1E]">
      {/* 1. Header & Navigation */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="border-b-2 border-[#C92C1E] p-5">
          <div className="mb-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar
            </button>
          </div>

          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
            <span>Menu</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/menu/closing" className="transition hover:text-[#C92C1E]">Closing</Link>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Detail Closing</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Detail Closing Transaksi #{closing.code || closing.id}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Rincian transaksi closing berlangganan yang diajukan oleh sales.
          </p>
        </div>
      </div>

      {/* 2. Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Transaction Metadata & Customer */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card: Customer & PIC */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-400">Pihak Terkait (Customer & PIC)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Nama Customer (Owner/Lead)</p>
                    <p className="text-sm font-bold text-gray-900">{closing.owner?.name || closing.lead?.name || "-"}</p>
                    <p className="text-xs font-mono text-gray-450 mt-0.5">Kode: {closing.owner?.code || closing.lead?.code || "-"}</p>
                  </div>
                </div>
                {closing.outlet_id && (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-400">Outlet ID</p>
                      <p className="text-sm font-bold text-gray-905">#{closing.outlet_id}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 border-t border-gray-100 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-5 w-5 text-[#C92C1E] shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Sales PIC</p>
                    <p className="text-sm font-bold text-gray-900">{closing.sales?.name || "Tanpa PIC"}</p>
                  </div>
                </div>
                {closing.supervisor && (
                  <div className="flex items-start gap-3">
                    <User className="mt-0.5 h-5 w-5 text-gray-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-400">Supervisor PIC</p>
                      <p className="text-sm font-bold text-gray-900">{closing.supervisor.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Plan Snapshot */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-400">Paket Yang Dipilih</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Nama Plan</p>
                <p className="text-sm font-black text-gray-900">{closing.plan?.name || "Custom Plan"}</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{closing.plan?.code}</p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Package</p>
                <p className="text-sm font-bold text-gray-800">{closing.package?.name || "-"}</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{closing.package?.code}</p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Tenor / Durasi</p>
                <p className="text-sm font-bold text-gray-800">
                  {closing.tenure_months
                    ? `${closing.tenure_months} Bulan`
                    : closing.duration_days
                      ? `${closing.duration_days} Hari`
                      : "-"}
                </p>
              </div>
            </div>

            {closing.promotion && (
              <div className="mt-6 rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-purple-700 mb-1 flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5" /> Promosi Yang Diterapkan
                </p>
                <p className="text-sm font-bold text-purple-900">{closing.promotion.name}</p>
                {typeof closing.promotion.description === "string" && closing.promotion.description && (
                  <p className="mt-1 text-xs text-purple-700/80 leading-relaxed">
                    {closing.promotion.description}
                  </p>
                )}
              </div>
            )}
          </div>


        </div>

        {/* Right Column: Pricing & Status */}
        <div className="space-y-6 lg:col-span-1">
          {/* Card: Pricing Breakdown */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-400">Rincian Pembayaran</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Harga Dasar:</span>
                <span className="font-bold">{formatCurrency(closing.base_price)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-red-500 border-b border-gray-100 pb-3">
                <span>Diskon:</span>
                <span className="font-bold">-{formatCurrency(closing.discount_amount)}</span>
              </div>

              {parseFloat(closing.additional_charge || "0") > 0 && (
                <div className="flex items-center justify-between text-xs text-gray-600 border-b border-gray-100 pb-3">
                  <span>Biaya Tambahan:</span>
                  <span className="font-bold">{formatCurrency(closing.additional_charge)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-purple-600 border-b border-gray-100 pb-3">
                <span className="flex items-center gap-1">
                  Kode Unik Transfer:{" "}
                  <span title="Digunakan untuk mempermudah rekonsiliasi bank otomatis" className="cursor-help">
                    <AlertCircle className="h-3 w-3 text-purple-400" />
                  </span>
                </span>
                <span className="font-bold">+{closing.unique_transfer_code || 0}</span>
              </div>

              <div className="flex flex-col pt-3 bg-red-50/30 p-3.5 rounded-xl border border-red-100/50">
                <span className="text-[10px] font-black uppercase text-gray-400">Total Akhir Transfer</span>
                <span className="text-xl font-black text-[#C92C1E] mt-1">{formatCurrency(closing.final_amount)}</span>
              </div>
            </div>
          </div>

          {/* Card: Transaction Status */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-400">Status Transaksi</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1.5">Status Transaksi</p>
                <div>{getStatusBadge(closing.status)}</div>
              </div>

              <div className="flex items-center gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>Tanggal Closing: {formatDateTime(closing.closed_at)}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Terakhir Diubah: {formatDateTime(closing.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
