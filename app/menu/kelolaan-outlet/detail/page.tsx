"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import {
  findRelatedLead,
  getGlobalOutlet,
  listSubscriptionsByOutlet,
  type BackendLead,
  type OutletDetail,
  type SubscriptionItem,
} from "@/app/lib/api";
import { formatPhoneDisplay } from "@/app/lib/phone";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const trimmed = value.trim();
  if (trimmed === "-" || trimmed === "Belum Berlangganan" || trimmed === "Tidak Pernah") {
    return trimmed;
  }

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let date: Date;

  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    date = new Date(Number(y), Number(m) - 1, Number(d));
  } else {
    date = new Date(trimmed);
  }

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatLabel(value?: string | null): string {
  if (!value) return "-";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

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
  const [lead, setLead] = useState<BackendLead | null>(null);
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

        const [relatedLead, subsRes] = await Promise.all([
          findRelatedLead({
            ownerId: outletDetail.owner.id,
            outletId,
          }).catch(() => null),
          listSubscriptionsByOutlet(outletId, { limit: 10 }),
        ]);

        if (cancelled) return;

        setLead(relatedLead);
        setSubscriptions(subsRes.items);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat detail outlet.");
        }
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
      <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
            <span>Menu</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/menu/kelolaan-outlet" className="hover:underline">
              Kelolaan Outlet
            </Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Detail</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Detail Outlet</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {detail?.owner.id ? (
            <Link
              href={`/menu/owner-outlet/${detail.owner.id}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-[#C92C1E]"
            >
              Lihat Detail Owner
            </Link>
          ) : null}
          {lead?.id ? (
            <Link
              href={`/menu/lead/${lead.id}`}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-[#C92C1E] shadow-sm transition-colors hover:bg-red-100"
            >
              Lihat Detail Lead
            </Link>
          ) : null}
          <Link
            href="/menu/kelolaan-outlet"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Kembali ke Kelolaan Outlet
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-6 w-6 text-[#C92C1E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="font-semibold text-sm">Mengambil rincian data...</span>
        </div>
      ) : error || !detail ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Outlet Tidak Ditemukan</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            {error || "Data outlet yang Anda cari mungkin telah dihapus atau ID tidak valid."}
          </p>
          <Link
            href="/menu/kelolaan-outlet"
            className="rounded-lg bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 inline-flex items-center gap-2"
          >
            Kembali ke Halaman Utama
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {activeSubscriptions > 0 ? (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  ) : null}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${activeSubscriptions > 0 ? "bg-emerald-500" : "bg-gray-300"}`} />
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
              <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h3l2 2h5a2 2 0 012 2v8a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900 leading-tight">Relasi CRM</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Koneksi outlet ini ke owner dan lead</p>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Owner Terkait</p>
                <p className="mt-2 text-base font-black text-gray-900">{detail.owner.name || "-"}</p>
                <p className="mt-1 text-xs font-medium text-gray-500">Kode owner {detail.owner.code || "-"}</p>
                {detail.owner.id ? (
                  <Link
                    href={`/menu/owner-outlet/${detail.owner.id}`}
                    className="mt-4 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-black text-gray-700 border border-gray-200 transition-colors hover:bg-gray-100 hover:text-[#C92C1E]"
                  >
                    Buka Detail Owner
                  </Link>
                ) : null}
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Lead Terkait</p>
                <p className="mt-2 text-base font-black text-gray-900">
                  {lead ? lead.outlet?.name || lead.owner?.name || lead.code : "Lead belum ditemukan"}
                </p>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  {lead
                    ? `Kode lead ${lead.code} • stage ${formatLabel(lead.stage)} • status ${formatLabel(lead.status)}`
                    : "Outlet ini belum memiliki relasi lead yang bisa dibuka dari halaman detail."}
                </p>
                {lead?.id ? (
                  <Link
                    href={`/menu/lead/${lead.id}`}
                    className="mt-4 inline-flex rounded-lg bg-[#C92C1E] px-3 py-2 text-xs font-black text-white transition-colors hover:bg-[#A82216]"
                  >
                    Buka Detail Lead
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <InfoSection
            title="Informasi Owner"
            subtitle="Pemilik dari outlet ini"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            }
          >
            <FieldBox label="Kode Owner" value={detail.owner.code} />
            <FieldBox label="Nama Owner" value={detail.owner.name} />
            <FieldBox label="Telepon" value={formatPhoneDisplay(detail.owner.phone)} />
            <FieldBox label="Email" value={detail.owner.email} />
            <FieldBox label="Brand" value={detail.owner.brand_name} />
            <FieldBox label="Tanggal Dibuat Owner" value={formatDate(detail.owner.created_at)} />
          </InfoSection>

          <InfoSection
            title="Informasi Outlet"
            subtitle="Detail lokasi usaha"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            }
          >
            <FieldBox label="Kode Outlet" value={detail.code} />
            <FieldBox label="Nama Outlet" value={detail.name} />
            <FieldBox label="Telepon" value={formatPhoneDisplay(detail.phone)} />
            <FieldBox label="Tanggal Dibuat Outlet" value={formatDate(detail.created_at)} />
            <FieldBox label="Provinsi" value={detail.province} />
            <FieldBox label="Kota/Kabupaten" value={detail.city} />
            <FieldBox label="Kecamatan" value={detail.district} />
            <FieldBox label="Kelurahan" value={detail.sub_district} />
            <FieldBox label="Alamat Lengkap" value={detail.address} span />
            <FieldBox label="Status" badge value={detail.status} />
          </InfoSection>

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
                      {formatDate(sub.active_from)} - {formatDate(sub.active_until)}
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
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${
            value === "ACTIVE"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${value === "ACTIVE" ? "bg-emerald-500" : "bg-red-500"}`} />
          {value || "-"}
        </span>
      ) : (
        <span className="font-bold text-gray-900">{value || "-"}</span>
      )}
    </div>
  );
}
