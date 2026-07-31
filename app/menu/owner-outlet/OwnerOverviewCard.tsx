"use client";

import { useEffect, useState } from "react";
import { getOwnerOverview, type OwnerOverview } from "@/app/lib/api";

function formatRupiah(value?: string): string {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) return value || "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Gagal memuat ringkasan saldo owner.";
}

// Sprint 15a — GET /owners/:id/overview: saldo, riwayat transfer/topup/spent,
// dan status (baru/lama, berlangganan) yang sekarang murni milik Owner
// (bukan per Outlet — satu owner cuma punya satu wallet, dipakai bersama
// seluruh outlet-nya).
export default function OwnerOverviewCard({ ownerId }: { ownerId: number }) {
  const [overview, setOverview] = useState<OwnerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ownerId || Number.isNaN(ownerId)) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getOwnerOverview(ownerId)
      .then((result) => {
        if (!cancelled) setOverview(result);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-white p-5 text-sm font-semibold text-gray-500 shadow-sm">
        <svg className="h-5 w-5 animate-spin text-[#C92C1E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Memuat ringkasan saldo owner...
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
        {error || "Ringkasan saldo owner tidak tersedia."}
      </div>
    );
  }

  const { balance, owner_status: ownerStatus } = overview;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">Saldo Berjalan</p>
          <h3 className="text-2xl font-black">{formatRupiah(balance.wallet.balance)}</h3>
          <p className="mt-1 text-[10px] font-bold text-red-100/80">
            Ledger: {formatRupiah(balance.wallet.ledger_balance)}
          </p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">Total Transfer</p>
          <h3 className="text-xl font-black text-gray-900">{formatRupiah(balance.total_transferred)}</h3>
        </div>
        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">Total Top Up</p>
          <h3 className="text-xl font-black text-gray-900">{formatRupiah(balance.total_topup)}</h3>
        </div>
        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">Total Terpakai</p>
          <h3 className="text-xl font-black text-gray-900">{formatRupiah(balance.total_spent)}</h3>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm">
        <span
          className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${
            ownerStatus.age_status === "NEW"
              ? "border-sky-200 bg-sky-50 text-sky-700"
              : "border-gray-200 bg-gray-100 text-gray-600"
          }`}
        >
          {ownerStatus.age_status === "NEW" ? "Owner Baru" : "Owner Lama"}
        </span>
        <span
          className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${
            ownerStatus.subscription_status === "BERLANGGANAN"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-gray-200 bg-gray-100 text-gray-600"
          }`}
        >
          {ownerStatus.subscription_status === "BERLANGGANAN" ? "Berlangganan" : "Tidak Berlangganan"}
        </span>
        <span className="text-xs font-bold text-gray-500">
          {ownerStatus.subscribed_outlet_count} dari {ownerStatus.outlet_count} outlet berlangganan
        </span>
      </div>
    </div>
  );
}
