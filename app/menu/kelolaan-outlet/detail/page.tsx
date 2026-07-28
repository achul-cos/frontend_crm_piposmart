"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  getGlobalOutlet,
  listOwnerWalletTransactions,
  listSubscriptionsByOutlet,
  type OutletDetail,
  type WalletTransactionItem,
  type SubscriptionItem,
} from "@/app/lib/api";

function formatRupiah(value?: string): string {
  const num = Number(value || 0);
  return `Rp ${num.toLocaleString("id-ID")}`;
}

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Detail Outlet — halaman tersendiri (bukan drawer): Informasi Owner,
 * Informasi Outlet, Informasi Saldo + Riwayat Topup, Informasi Langganan +
 * Riwayat Subscribe. Wallet di-scope per OWNER di backend (bukan per-outlet,
 * saldo dipakai bersama semua outlet owner tsb) — riwayat topup di sini
 * karenanya riwayat wallet OWNER, bukan hanya transaksi outlet ini secara
 * sempit.
 */
export default function OutletDetailPage() {
  return (
    <Suspense fallback={null}>
      <OutletDetailPageInner />
    </Suspense>
  );
}

function OutletDetailPageInner() {
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

  return (
    <div className="mx-auto max-w-4xl space-y-5 font-sans text-[#1C1C1E]">
      <div className="flex items-center gap-3">
        <Link
          href="/menu/kelolaan-outlet"
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 shadow-xs hover:border-[#C92C1E]/40 hover:text-[#C92C1E]"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali
        </Link>
        <h1 className="text-lg font-black text-gray-900">Detail Outlet</h1>
      </div>

      {isLoading ? (
        <p className="rounded-2xl border border-gray-200/60 bg-white p-8 text-center text-xs font-bold text-gray-400 shadow-xs">
          Memuat...
        </p>
      ) : error ? (
        <p className="rounded-2xl border border-gray-200/60 bg-white p-8 text-center text-xs font-bold text-red-600 shadow-xs">
          {error}
        </p>
      ) : detail ? (
        <div className="space-y-5">
          <Section title="Informasi Owner">
            <InfoRow label="Kode" value={detail.owner.code} />
            <InfoRow label="Nama" value={detail.owner.name} />
            <InfoRow label="Telepon" value={detail.owner.phone} />
            <InfoRow label="Email" value={detail.owner.email} />
            <InfoRow label="Brand" value={detail.owner.brand_name} />
          </Section>

          <Section title="Informasi Outlet">
            <InfoRow label="Kode" value={detail.code} />
            <InfoRow label="Nama" value={detail.name} />
            <InfoRow label="Telepon" value={detail.phone} />
            <InfoRow
              label="Lokasi"
              value={[detail.city, detail.province].filter(Boolean).join(", ")}
            />
            <InfoRow label="Alamat" value={detail.address} />
            <InfoRow label="Status" value={detail.status} />
          </Section>

          <Section title="Informasi Saldo & Riwayat Topup">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-[10px] font-black uppercase text-gray-400">Saldo Berjalan</p>
              <p className="text-lg font-black text-[#C92C1E]">{formatRupiah(detail.wallet?.balance)}</p>
              <p className="text-[10px] text-gray-400">
                Saldo Ledger: {formatRupiah(detail.wallet?.ledger_balance)}
              </p>
            </div>
            {walletHistory.length === 0 ? (
              <p className="mt-2 text-xs font-bold text-gray-400">Belum ada riwayat transaksi.</p>
            ) : (
              <div className="mt-2 divide-y divide-gray-100">
                {walletHistory.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <p className="font-bold">{tx.transaction_type}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(tx.occurred_at)}</p>
                    </div>
                    <p
                      className={`font-black ${
                        tx.direction === "CREDIT" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.direction === "CREDIT" ? "+" : "-"}
                      {formatRupiah(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Informasi Langganan & Riwayat Subscribe">
            <InfoRow
              label="Total Langganan"
              value={String(detail.subscription_summary?.total_subscriptions ?? 0)}
            />
            <InfoRow
              label="Langganan Aktif"
              value={String(detail.subscription_summary?.active_subscriptions ?? 0)}
            />
            {subscriptions.length === 0 ? (
              <p className="mt-2 text-xs font-bold text-gray-400">Belum ada riwayat langganan.</p>
            ) : (
              <div className="mt-2 divide-y divide-gray-100">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-bold">
                        {sub.package?.name || "—"}
                        {sub.plan?.name ? ` / ${sub.plan.name}` : ""}
                      </p>
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-[#C92C1E]">
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {formatDate(sub.active_from)} &ndash; {formatDate(sub.active_until)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-xs">
      <p className="mb-3 text-[10px] font-black uppercase tracking-wide text-[#C92C1E]">{title}</p>
      <div className="space-y-1 rounded-xl border border-gray-100 p-3">{children}</div>
    </div>
  );
}

export default function OutletDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OutletDetailPageInner />
    </Suspense>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="font-bold text-gray-800">{value || "—"}</span>
    </div>
  );
}
