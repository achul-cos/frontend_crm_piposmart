"use client";

import Link from "next/link";
import { use, useEffect, useState, type ReactNode } from "react";
import { packageApi, planApi, type CatalogPackageItem, type CatalogPlanItem } from "@/app/lib/api";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRupiah(value?: string | number | null): string {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) return String(value || "-");
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function Badge({
  value,
  className,
}: {
  value?: string | number | null;
  className: string;
}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${className}`}>
      {value ?? "-"}
    </span>
  );
}

function getStatusBadgeClass(active?: boolean): string {
  return active
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : "bg-gray-50 text-gray-600 border border-gray-200";
}

function SummaryCard({
  title,
  value,
  description,
  primary = false,
}: {
  title: string;
  value: string | number;
  description: string;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <div className="relative min-h-[144px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
        <div className="relative z-10">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">{title}</p>
          <h2 className="text-3xl font-black">{value}</h2>
          <p className="mt-2 max-w-[90%] text-[11px] text-red-100/90">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[144px] rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">{title}</p>
      <h2 className="text-3xl font-black text-gray-900">{value}</h2>
      <p className="mt-2 text-[11px] text-gray-400">{description}</p>
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
    <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 p-5">
        <div className="rounded-xl border border-red-100 bg-red-50 p-2.5">
          <svg className="h-5 w-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icon}
          </svg>
        </div>
        <div>
          <h4 className="text-base font-black leading-tight text-gray-900">{title}</h4>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}

function FieldBox({
  label,
  value,
  span = false,
  children,
}: {
  label: string;
  value?: ReactNode;
  span?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-gray-50 p-3.5 ${span ? "sm:col-span-2 xl:col-span-3" : ""}`}>
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <div className="break-words text-sm font-bold text-gray-900">{children ?? value ?? "-"}</div>
    </div>
  );
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-gray-50">
        <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19 11H5m14-6H5m14 12H5m14 6H5" />
        </svg>
      </div>
      <h5 className="text-sm font-bold text-gray-900">{title}</h5>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function Panel({
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
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 p-5">
        <div className="rounded-xl border border-red-100 bg-red-50 p-2.5">
          <svg className="h-5 w-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icon}
          </svg>
        </div>
        <div>
          <h4 className="text-base font-black leading-tight text-gray-900">{title}</h4>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  usePageTitle("Detail Paket");
  const resolvedParams = use(params);
  const packageId = Number(resolvedParams.id);

  const [item, setItem] = useState<CatalogPackageItem | null>(null);
  const [plans, setPlans] = useState<CatalogPlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!packageId || Number.isNaN(packageId)) {
      setError("ID paket tidak valid.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [detail, relatedPlans] = await Promise.all([
          packageApi.get(packageId),
          planApi
            .list({ package_id: packageId, limit: 100, scope: "ALL" })
            .then((response) => response.items)
            .catch(() => []),
        ]);

        if (cancelled) return;

        setItem(detail);
        setPlans(relatedPlans);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat detail paket.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [packageId]);

  return (
    <div className="min-h-screen bg-[#f6f9fc] p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
              <Link href="/menu/paket-langganan" className="transition-colors hover:text-[#C92C1E]">
                Paket Langganan
              </Link>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#C92C1E]">Detail Data</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              {isLoading ? "Memuat Data..." : item ? `Detail Paket: ${item.name}` : "Data Tidak Ditemukan"}
            </h1>
            {!isLoading && item ? (
              <p className="mt-1 text-sm text-gray-500">
                Kode <span className="font-bold text-gray-700">{item.code}</span> • level {item.level_order}
              </p>
            ) : null}
          </div>
          <Link
            href="/menu/paket-langganan"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#C92C1E]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Daftar
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center text-sm font-bold text-gray-400">
            Memuat detail paket...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center text-sm font-bold text-red-600">
            {error}
          </div>
        ) : !item ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center text-sm font-bold text-gray-400">
            Data paket tidak ditemukan.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <SummaryCard
                title="Kode Paket"
                value={item.code}
                description="Kode unik paket untuk identifikasi master katalog."
                primary
              />
              <SummaryCard
                title="Jumlah Plan"
                value={plans.length}
                description="Jumlah plan yang saat ini terkait dengan paket ini."
              />
              <SummaryCard
                title="Status Paket"
                value={item.active ? "Aktif" : "Nonaktif"}
                description="Menunjukkan apakah paket masih tersedia sebagai master aktif."
              />
            </div>

            <InfoSection
              title="Informasi Paket"
              subtitle="Data utama package"
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />}
            >
              <FieldBox label="ID Paket" value={item.id} />
              <FieldBox label="Kode Paket" value={item.code} />
              <FieldBox label="Nama Paket" value={item.name} />
              <FieldBox label="Level Order" value={item.level_order} />
              <FieldBox label="Status">
                <Badge value={item.active ? "Aktif" : "Nonaktif"} className={getStatusBadgeClass(item.active)} />
              </FieldBox>
              <FieldBox label="Dibuat Pada" value={formatDateTime(item.created_at)} />
              <FieldBox label="Diperbarui Pada" value={formatDateTime(item.updated_at)} />
              <FieldBox label="Deskripsi" span value={item.description || "Tidak ada deskripsi paket."} />
            </InfoSection>

            <Panel
              title="Daftar Plan"
              subtitle="Tenor dan harga di dalam paket"
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m4 6V7m4 10v-4M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />}
            >
              {plans.length === 0 ? (
                <EmptyPanel
                  title="Belum ada plan"
                  description="Paket ini belum memiliki plan terkait atau seluruh plan belum tersedia."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-gray-600">
                    <thead className="border-b border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-5 py-4">Plan</th>
                        <th className="px-5 py-4">Tenor</th>
                        <th className="px-5 py-4">Durasi</th>
                        <th className="px-5 py-4">Harga</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {plans.map((plan) => (
                        <tr key={plan.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-5 py-4 align-top">
                            <Link
                              href={`/menu/paket-langganan/plans/${plan.id}`}
                              className="font-black text-gray-900 transition-colors hover:text-[#C92C1E]"
                            >
                              {plan.name}
                            </Link>
                            <p className="mt-1 text-[11px] font-bold text-gray-400">{plan.code}</p>
                          </td>
                          <td className="px-5 py-4 align-top font-bold text-gray-700">{plan.tenure_months} bulan</td>
                          <td className="px-5 py-4 align-top font-bold text-gray-700">{plan.duration_days} hari</td>
                          <td className="px-5 py-4 align-top font-black text-[#C92C1E]">{formatRupiah(plan.price)}</td>
                          <td className="px-5 py-4 align-top">
                            <Badge value={plan.active ? "Aktif" : "Nonaktif"} className={getStatusBadgeClass(plan.active)} />
                          </td>
                          <td className="px-5 py-4 align-top">
                            <Link
                              href={`/menu/paket-langganan/plans/${plan.id}`}
                              className="inline-flex rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                              title="Lihat Detail Plan"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
