"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import {
  getGlobalOutlet,
  listOwnerWalletTransactions,
  listSubscriptionsByOutlet,
  type OutletDetail,
  type WalletTransactionItem,
  type SubscriptionItem,
} from "@/app/lib/api";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

function formatRupiah(value?: string): string {
  const num = Number(value || 0);
  return `Rp ${num.toLocaleString("id-ID")}`;
}

function formatDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Detail Outlet — halaman tersendiri (bukan drawer), disusun sehierarki dan
 * konsisten dengan Detail Owner (`app/menu/owner-outlet/[id]/page.tsx`):
 * Ringkasan → Informasi Owner → Informasi Outlet → Riwayat Topup → Riwayat
 * Subscribe, semuanya vertikal per grup informasi. Wallet di-scope per OWNER
 * di backend (bukan per-outlet, saldo dipakai bersama semua outlet owner
 * tsb) — riwayat topup di sini karenanya riwayat wallet OWNER, bukan hanya
 * transaksi outlet ini secara sempit.
 */
export default function OutletDetailPage() {
  return (
    <Suspense fallback={null}>
      <OutletDetailPageInner />
    </Suspense>
  );
}

function OutletDetailPageInner() {
  usePageTitle("Detail Outlet");
  const searchParams = useSearchParams();
  const outletId = Number(searchParams.get("id"));

  const [detail, setDetail] = useState<OutletDetail | null>(null);
  const [walletHistory, setWalletHistory] = useState<WalletTransactionItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!outletId) {
      setIsLoading(false);
      setError("ID outlet tidak valid.");
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const outletDetail = await getGlobalOutlet(outletId);
        if (cancelled) return;
        setDetail(outletDetail);

        const [walletRes, subsRes] = await Promise.all([
          outletDetail.owner.id
            ? listOwnerWalletTransactions(outletDetail.owner.id, { limit: 10 })
            : Promise.resolve({ items: [], pagination: { page: 1, limit: 10, total: 0 } }),
          listSubscriptionsByOutlet(outletId, { limit: 10 }),
        ]);
        if (cancelled) return;
        setWalletHistory(walletRes.items);
        setSubscriptions(subsRes.items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat detail outlet.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [outletId]);

  const activeSubscriptions = detail?.subscription_summary?.active_subscriptions ?? 0;

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
            <span>Menu</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/menu/kelolaan-outlet" className="hover:text-[#C92C1E] transition-colors">
              Outlet
            </Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Detail Data</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isLoading ? "Memuat Data..." : detail ? `Detail Outlet: ${detail.name}` : "Data Tidak Ditemukan"}
          </h1>
        </div>
        <Link
          href="/menu/kelolaan-outlet"
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#C92C1E] flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Daftar
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20 text-gray-500 gap-3 bg-white rounded-2xl border border-gray-200/60 shadow-sm">
          <svg className="animate-spin h-6 w-6 text-[#C92C1E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-semibold text-sm">Mengambil rincian data...</span>
        </div>
      ) : error || !detail ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Outlet Tidak Ditemukan</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">{error || "Data outlet yang Anda cari mungkin telah dihapus atau ID tidak valid."}</p>
          <Link
            href="/menu/kelolaan-outlet"
            className="rounded-lg bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 inline-flex items-center gap-2"
          >
            Kembali ke Halaman Utama
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Level 1: Ringkasan (Quick Stats) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-[#C92C1E] to-[#A82216] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">Saldo Berjalan</p>
                <h2 className="text-2xl font-black">{formatRupiah(detail.wallet?.balance)}</h2>
                <p className="mt-1 text-[10px] font-bold text-red-100/80">Ledger: {formatRupiah(detail.wallet?.ledger_balance)}</p>
              </div>
              <svg className="absolute -bottom-4 -right-4 w-28 h-28 text-white opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-9 4h16a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-[#C92C1E] transition-colors">
              <div className="relative z-10">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Langganan</p>
                <h2 className="text-3xl font-black text-gray-900">{detail.subscription_summary?.total_subscriptions ?? 0}</h2>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-[#C92C1E] transition-colors">
              <div className="relative z-10">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Langganan Aktif</p>
                <h2 className="text-3xl font-black text-gray-900">{activeSubscriptions}</h2>
              </div>
              <div className="absolute top-0 right-0 p-5">
                <span className="flex h-3 w-3 relative">
                  {activeSubscriptions > 0 && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${activeSubscriptions > 0 ? "bg-emerald-500" : "bg-gray-300"}`}></span>
                </span>
              </div>
            </div>
          </div>

          {/* Level 2: Informasi Owner */}
          <InfoSection
            title="Informasi Owner"
            subtitle="Pemilik dari outlet ini"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            }
          >
            <FieldBox label="Kode Owner" value={detail.owner.code} />
            <FieldBox label="Nama Owner" value={detail.owner.name} />
            <FieldBox label="Telepon" value={detail.owner.phone} />
            <FieldBox label="Email" value={detail.owner.email} />
            <FieldBox label="Brand" value={detail.owner.brand_name} />
          </InfoSection>

          {/* Level 3: Informasi Outlet */}
          <InfoSection
            title="Informasi Outlet"
            subtitle="Detail lokasi usaha"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            }
          >
            <FieldBox label="Kode Outlet" value={detail.code} />
            <FieldBox label="Nama Outlet" value={detail.name} />
            <FieldBox label="Telepon" value={detail.phone} />
            <FieldBox label="Lokasi" value={[detail.city, detail.province].filter(Boolean).join(", ")} />
            <FieldBox label="Alamat Lengkap" value={detail.address} span />
            <FieldBox label="Status" badge value={detail.status} />
          </InfoSection>

          {/* Level 4: Riwayat Topup */}
          <div className="w-full bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
              <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-9 4h16a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900 leading-tight">Riwayat Topup</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Saldo wallet ini dipakai bersama seluruh outlet owner</p>
              </div>
            </div>
            {walletHistory.length === 0 ? (
              <div className="text-center py-14 bg-white">
                <p className="text-gray-500 text-xs font-medium">Belum ada riwayat transaksi.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {walletHistory.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3 text-xs hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-bold text-gray-900">{tx.transaction_type}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(tx.occurred_at)}</p>
                    </div>
                    <p className={`font-black ${tx.direction === "CREDIT" ? "text-emerald-600" : "text-red-600"}`}>
                      {tx.direction === "CREDIT" ? "+" : "-"}
                      {formatRupiah(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Level 5: Riwayat Subscribe */}
          <div className="w-full bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
              <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900 leading-tight">Riwayat Subscribe</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Langganan paket pada outlet ini</p>
              </div>
            </div>
            {subscriptions.length === 0 ? (
              <div className="text-center py-14 bg-white">
                <p className="text-gray-500 text-xs font-medium">Belum ada riwayat langganan.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {subscriptions.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/menu/subscribe/${sub.id}`}
                      className="block px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-900 text-sm">
                          {sub.package?.name || "-"}
                          {sub.plan?.name ? ` / ${sub.plan.name}` : ""}
                      </p>
                      <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-tight bg-red-50 text-[#C92C1E] border border-red-200">
                        {sub.status}
                      </span>
                    </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDate(sub.active_from)} &ndash; {formatDate(sub.active_until)}
                      </p>
                    </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoSection({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
        <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
          <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icon}
          </svg>
        </div>
        <div>
          <h4 className="text-base font-black text-gray-900 leading-tight">{title}</h4>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function FieldBox({
  label,
  value,
  span,
  badge,
}: {
  label: string;
  value?: string;
  span?: boolean;
  badge?: boolean;
}) {
  return (
    <div className={`bg-gray-50 p-3.5 rounded-xl border border-gray-100 ${span ? "sm:col-span-2" : ""}`}>
      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</span>
      {badge ? (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${
          value === "ACTIVE"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${value === "ACTIVE" ? "bg-emerald-500" : "bg-red-500"}`}></span>
          {value || "-"}
        </span>
      ) : (
        <span className="font-bold text-gray-900">{value || "-"}</span>
      )}
    </div>
  );
}
