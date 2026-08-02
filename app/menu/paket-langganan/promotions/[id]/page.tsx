"use client";

import Link from "next/link";
import { use, useEffect, useState, type ReactNode } from "react";
import {
  getPromotionEligiblePlans,
  listPromotionBenefits,
  promotionApi,
  type CatalogBenefitItem,
  type CatalogPlanItem,
  type CatalogPromotionItem,
} from "@/app/lib/api";
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

function getChargeBadgeClass(chargeType?: string | null): string {
  return String(chargeType || "").toUpperCase() === "FREE"
    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border border-amber-200 bg-amber-50 text-amber-700";
}

function getStatusBadgeClass(active?: boolean): string {
  return active
    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border border-gray-200 bg-gray-50 text-gray-600";
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

export default function PromotionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  usePageTitle("Detail Promosi");
  const resolvedParams = use(params);
  const promotionId = Number(resolvedParams.id);
  const isInvalidPromotionId = !promotionId || Number.isNaN(promotionId);

  const [promotion, setPromotion] = useState<CatalogPromotionItem | null>(null);
  const [benefits, setBenefits] = useState<CatalogBenefitItem[]>([]);
  const [plans, setPlans] = useState<CatalogPlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInvalidPromotionId) {
      const timer = window.setTimeout(() => {
        setError("ID promosi tidak valid.");
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

          const [promo, benefitItems, eligiblePlans] = await Promise.all([
            promotionApi.get(promotionId),
            listPromotionBenefits(promotionId).catch(() => []),
            getPromotionEligiblePlans(promotionId).catch(() => []),
          ]);

          if (cancelled) return;
          setPromotion(promo);
          setBenefits(benefitItems);
          setPlans(eligiblePlans);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Gagal memuat detail promosi.");
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
  }, [isInvalidPromotionId, promotionId]);

  const totalFreeDurationDays = benefits.reduce((sum, benefit) => sum + Number(benefit.duration_days || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm md:flex-row md:items-center">
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
            {isLoading ? "Memuat Data..." : promotion ? `Detail Promosi: ${promotion.name}` : "Data Tidak Ditemukan"}
          </h1>
          {!isLoading && promotion ? (
            <p className="mt-1 text-sm text-gray-500">
              Kode <span className="font-bold text-gray-700">{promotion.code}</span> • tipe {formatLabel(promotion.promotion_type)}
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
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200/60 bg-white py-20 text-gray-500 shadow-sm">
          <svg className="h-6 w-6 animate-spin text-[#C92C1E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-semibold">Mengambil rincian promosi...</span>
        </div>
      ) : error || !promotion ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <svg className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mb-2 text-lg font-bold text-gray-900">Promosi Tidak Ditemukan</h3>
          <p className="mx-auto mb-6 max-w-md text-sm text-gray-500">
            {error || "Data promosi yang Anda cari mungkin tidak tersedia atau ID tidak valid."}
          </p>
          <Link
            href="/menu/paket-langganan"
            className="inline-flex items-center gap-2 rounded-lg bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
          >
            Kembali ke Halaman Katalog
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard
              title="Kode Promosi"
              value={promotion.code}
              description="Identitas promo yang dipakai pada katalog dan transaksi closing."
              primary
            />
            <SummaryCard
              title="Biaya Promo"
              value={promotion.charge_type === "FREE" ? "Gratis" : formatRupiah(promotion.additional_charge)}
              description={`${formatLabel(promotion.charge_type)} • prioritas ${promotion.priority}`}
            />
            <SummaryCard
              title="Cakupan Promo"
              value={`${benefits.length} benefit`}
              description={`${plans.length} plan eligible • bonus durasi ${totalFreeDurationDays} hari`}
            />
          </div>

          <InfoSection
            title="Informasi Promosi"
            subtitle="Identitas utama, biaya, periode aktif, dan prioritas promo"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v2m0 0l7.586 7.586a2 2 0 002.828 0L21 11a2 2 0 000-2.828L15.828 3A2 2 0 0014.414 2H7a2 2 0 00-2 2v5z" />}
          >
            <FieldBox label="ID" value={promotion.id} />
            <FieldBox label="Kode" value={promotion.code} />
            <FieldBox label="Nama Promosi" value={promotion.name} />
            <FieldBox label="Tipe Promosi" value={formatLabel(promotion.promotion_type)} />
            <FieldBox label="Charge Type">
              <Badge value={formatLabel(promotion.charge_type)} className={getChargeBadgeClass(promotion.charge_type)} />
            </FieldBox>
            <FieldBox
              label="Additional Charge"
              value={promotion.charge_type === "FREE" ? "Gratis" : formatRupiah(promotion.additional_charge)}
            />
            <FieldBox label="Priority" value={promotion.priority} />
            <FieldBox label="Status">
              <Badge value={promotion.active ? "Active" : "Inactive"} className={getStatusBadgeClass(promotion.active)} />
            </FieldBox>
            <FieldBox label="Effective From" value={formatDateOnly(promotion.effective_from)} />
            <FieldBox label="Effective To" value={formatDateOnly(promotion.effective_to)} />
            <FieldBox label="Created At" value={formatDateTime(promotion.created_at)} />
            <FieldBox label="Updated At" value={formatDateTime(promotion.updated_at)} />
            <FieldBox label="Deskripsi" value={promotion.description || "Belum ada deskripsi promosi."} span />
          </InfoSection>

          <Panel
            title="Benefit Promosi"
            subtitle="Daftar bonus, durasi tambahan, alat, atau item lain yang diberikan promo"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 1.567-3 3.5S10.343 15 12 15s3-1.567 3-3.5S13.657 8 12 8zm0 0V5m0 10v4m7-7h-3M8 12H5m11.364-4.95l-2.121 2.121M9.757 14.243l-2.12 2.121m0-9.192l2.12 2.121m6.607 6.607l-2.121-2.12" />}
          >
            {benefits.length === 0 ? (
              <EmptyPanel title="Belum ada benefit" description="Promosi ini belum memiliki benefit tambahan yang terdaftar." />
            ) : (
              <div className="divide-y divide-gray-100">
                {benefits.map((benefit) => (
                  <div key={benefit.id} className="space-y-3 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge value={formatLabel(benefit.benefit_type)} className="border border-violet-200 bg-violet-50 text-violet-700" />
                          {benefit.package?.name ? (
                            <Badge value={benefit.package.name} className="border border-gray-200 bg-gray-50 text-gray-600" />
                          ) : null}
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {benefit.description || "Benefit promosi tanpa deskripsi tambahan."}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-xs font-bold text-gray-400">{formatDateTime(benefit.created_at)}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <FieldBox label="Benefit ID" value={benefit.id} />
                      <FieldBox label="Package Scope" value={benefit.package?.name || "-"} />
                      <FieldBox label="Duration Days" value={benefit.duration_days ?? "-"} />
                      <FieldBox label="Quantity" value={benefit.quantity ?? "-"} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Plan Eligible"
            subtitle="Daftar plan yang memenuhi syarat untuk mendapatkan promosi ini"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 7.5 12 4l9 3.5M4.5 10.5l7.5 3 7.5-3M4.5 14.25l7.5 3 7.5-3" />}
          >
            {plans.length === 0 ? (
              <EmptyPanel title="Belum ada plan eligible" description="Promosi ini belum dihubungkan ke plan tertentu." />
            ) : (
              <div className="divide-y divide-gray-100">
                {plans.map((plan) => (
                  <div key={plan.id} className="p-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <FieldBox label="Plan Code" value={plan.code} />
                      <FieldBox label="Plan Name" value={plan.name} />
                      <FieldBox label="Package" value={plan.package?.name || "-"} />
                      <FieldBox label="Tenure" value={`${plan.tenure_months} bulan`} />
                      <FieldBox label="Duration Days" value={plan.duration_days} />
                      <FieldBox label="Price" value={formatRupiah(plan.price)} />
                      <FieldBox label="Currency" value={plan.currency || "IDR"} />
                      <FieldBox label="Status">
                        <Badge value={plan.active ? "Active" : "Inactive"} className={getStatusBadgeClass(plan.active)} />
                      </FieldBox>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
