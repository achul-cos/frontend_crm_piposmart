"use client";

import Link from "next/link";
import { use, useEffect, useState, type ReactNode } from "react";
import DetailSummaryCard from "@/app/components/ui/DetailSummaryCard";
import {
  getEligiblePromotions,
  packageApi,
  planApi,
  type CatalogPackageItem,
  type CatalogPlanItem,
  type CatalogPromotion,
} from "@/app/lib/api";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { ViewActionButton } from "@/app/components/table/RowActionButton";

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

function formatDateOnly(value?: string | null): string {
  if (!value) return "Tanpa batas";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

function formatLabel(value?: string | null): string {
  if (!value) return "-";
  return value
    .toString()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  usePageTitle("Detail Plan");
  const resolvedParams = use(params);
  const planId = Number(resolvedParams.id);
  const isInvalidPlanId = !planId || Number.isNaN(planId);

  const [item, setItem] = useState<CatalogPlanItem | null>(null);
  const [pkg, setPkg] = useState<CatalogPackageItem | null>(null);
  const [promotions, setPromotions] = useState<CatalogPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInvalidPlanId) {
      const timer = window.setTimeout(() => {
        setError("ID plan tidak valid.");
        setIsLoading(false);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      (async () => {
        try {
          setIsLoading(true);
          setError(null);

          const detail = await planApi.get(planId);
          const [packageDetail, eligiblePromotions] = await Promise.all([
            packageApi.get(detail.package.id).catch(() => null),
            getEligiblePromotions(planId).catch(() => []),
          ]);

          if (cancelled) return;

          setItem(detail);
          setPkg(packageDetail);
          setPromotions(eligiblePromotions);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Gagal memuat detail plan.");
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isInvalidPlanId, planId]);

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
              {isLoading ? "Memuat Data..." : item ? `Detail Plan: ${item.name}` : "Data Tidak Ditemukan"}
            </h1>
            {!isLoading && item ? (
              <p className="mt-1 text-sm text-gray-500">
                Kode <span className="font-bold text-gray-700">{item.code}</span> • tenor {item.tenure_months} bulan
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
            Memuat detail plan...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center text-sm font-bold text-red-600">
            {error}
          </div>
        ) : !item ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center text-sm font-bold text-gray-400">
            Data plan tidak ditemukan.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <DetailSummaryCard
                title="Kode Plan"
                value={item.code}
                description="Identitas plan yang dipilih customer ketika closing atau subscribe."
                primary
                silhouette="tag"
              />
              <DetailSummaryCard
                title="Harga Plan"
                value={formatRupiah(item.price)}
                tone="emerald"
                description={`${item.tenure_months} bulan • ${item.duration_days} hari`}
              />
              <DetailSummaryCard
                title="Promo Eligible"
                value={promotions.length}
                tone="sky"
                description="Jumlah promo yang tersedia untuk plan ini pada master katalog."
              />
            </div>

            <InfoSection
              title="Informasi Plan"
              subtitle="Master tenor dan harga"
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
            >
              <FieldBox label="ID Plan" value={item.id} />
              <FieldBox label="Kode Plan" value={item.code} />
              <FieldBox label="Nama Plan" value={item.name} />
              <FieldBox label="Package">
                {pkg ? (
                  <Link href={`/menu/paket-langganan/packages/${pkg.id}`} className="text-[#C92C1E] transition-colors hover:text-[#A82216]">
                    {pkg.name}
                  </Link>
                ) : (
                  item.package.name
                )}
              </FieldBox>
              <FieldBox label="Tenor" value={`${item.tenure_months} bulan`} />
              <FieldBox label="Durasi" value={`${item.duration_days} hari`} />
              <FieldBox label="Harga" value={formatRupiah(item.price)} />
              <FieldBox label="Mata Uang" value={item.currency || "IDR"} />
              <FieldBox label="Efektif Dari" value={formatDateOnly(item.effective_from)} />
              <FieldBox label="Efektif Sampai" value={formatDateOnly(item.effective_to)} />
              <FieldBox label="Status">
                <Badge value={item.active ? "Aktif" : "Nonaktif"} className={getStatusBadgeClass(item.active)} />
              </FieldBox>
              <FieldBox label="Dibuat Pada" value={formatDateTime(item.created_at)} />
              <FieldBox label="Diperbarui Pada" value={formatDateTime(item.updated_at)} />
            </InfoSection>

            <Panel
              title="Promosi Eligible"
              subtitle="Daftar promosi yang dapat dipilih untuk plan ini"
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v2m0 0l7.586 7.586a2 2 0 002.828 0L21 11a2 2 0 000-2.828L15.828 3A2 2 0 0014.414 2H7a2 2 0 00-2 2v5z" />}
            >
              {promotions.length === 0 ? (
                <EmptyPanel
                  title="Belum ada promosi eligible"
                  description="Plan ini belum memiliki promosi aktif yang bisa dipilih."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-gray-600">
                    <thead className="border-b border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-5 py-4">Promosi</th>
                        <th className="px-5 py-4">Tipe</th>
                        <th className="px-5 py-4">Biaya</th>
                        <th className="px-5 py-4">Deskripsi</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {promotions.map((promotion) => (
                        <tr key={promotion.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-5 py-4 align-top">
                            <Link
                              href={`/menu/paket-langganan/promotions/${promotion.id}`}
                              className="font-black text-gray-900 transition-colors hover:text-[#C92C1E]"
                            >
                              {promotion.name}
                            </Link>
                            <p className="mt-1 text-[11px] font-bold text-gray-400">{promotion.code}</p>
                          </td>
                          <td className="px-5 py-4 align-top font-bold text-gray-700">
                            {formatLabel(promotion.promotion_type)}
                          </td>
                          <td className="px-5 py-4 align-top font-bold text-[#C92C1E]">
                            {promotion.charge_type === "FREE"
                              ? "Gratis"
                              : formatRupiah(promotion.additional_charge)}
                          </td>
                          <td className="px-5 py-4 align-top text-gray-600">
                            {promotion.description || "-"}
                          </td>
                          <td className="px-5 py-4 align-top">
                            <Badge
                              value={promotion.active === false ? "Nonaktif" : "Aktif"}
                              className={getStatusBadgeClass(promotion.active !== false)}
                            />
                          </td>
                          <td className="px-5 py-4 align-top">
                            <ViewActionButton href={`/menu/paket-langganan/promotions/${promotion.id}`} title="Lihat Detail Promosi" />
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
