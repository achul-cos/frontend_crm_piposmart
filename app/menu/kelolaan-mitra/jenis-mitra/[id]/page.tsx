"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getCatalogPackages,
  getCatalogPlans,
  getPartnerType,
  getPartnerTypeCommissionRule,
  listPartnerTypeCommissionRules,
  type CatalogPackage,
  type CatalogPlan,
  type PartnerCommissionRuleItem,
  type PartnerTypeItem,
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

function formatCommission(mode?: string | null, value?: string | number | null): string {
  if (!mode) return "-";
  if (mode === "PERCENTAGE") return `${Number(value || 0)}%`;
  if (mode === "FIXED") return formatRupiah(value);
  return "Bertingkat";
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

function getModeBadgeClass(mode?: string | null): string {
  switch (String(mode || "").toUpperCase()) {
    case "PERCENTAGE":
      return "bg-sky-50 text-sky-700 border border-sky-200";
    case "FIXED":
      return "bg-violet-50 text-violet-700 border border-violet-200";
    case "TIER":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    default:
      return "bg-gray-50 text-gray-600 border border-gray-200";
  }
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
      <div className="bg-gradient-to-br from-[#C92C1E] to-[#A82216] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden min-h-[144px]">
        <div className="relative z-10">
          <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
          <h2 className="text-3xl font-black">{value}</h2>
          <p className="mt-2 text-[11px] text-red-100/90 max-w-[90%]">{description}</p>
        </div>
        <svg className="absolute -bottom-4 -right-4 w-28 h-28 text-white opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm2 5h10M7 12h6m-6 4h10" />
        </svg>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm min-h-[144px]">
      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
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
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{children}</div>
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
    <div className={`bg-gray-50 p-3.5 rounded-xl border border-gray-100 ${span ? "sm:col-span-2 xl:col-span-3" : ""}`}>
      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</span>
      <div className="font-bold text-gray-900 text-sm break-words">{children ?? value ?? "-"}</div>
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
    <div className="text-center py-12 px-6">
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

function TimelinePanel({
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
    <div className="w-full bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
        <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
          <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icon}
          </svg>
        </div>
        <div>
          <h4 className="text-base font-black text-gray-900 leading-tight">{title}</h4>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function PartnerTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  usePageTitle("Detail Jenis Mitra");
  const resolvedParams = use(params);
  const partnerTypeId = Number(resolvedParams.id);
  const isInvalidPartnerTypeId = !partnerTypeId || Number.isNaN(partnerTypeId);

  const [partnerType, setPartnerType] = useState<PartnerTypeItem | null>(null);
  const [rules, setRules] = useState<PartnerCommissionRuleItem[]>([]);
  const [packages, setPackages] = useState<CatalogPackage[]>([]);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInvalidPartnerTypeId) {
      const timer = window.setTimeout(() => {
        setError("ID jenis mitra tidak valid.");
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

          const [detail, ruleList, packageList, planList] = await Promise.all([
            getPartnerType(partnerTypeId),
            listPartnerTypeCommissionRules(partnerTypeId),
            getCatalogPackages().catch(() => []),
            getCatalogPlans().catch(() => []),
          ]);

          const detailedRules = await Promise.all(
            (ruleList.items || []).map(async (rule) => {
              try {
                return await getPartnerTypeCommissionRule(partnerTypeId, rule.id);
              } catch {
                return rule;
              }
            }),
          );

          if (cancelled) return;
          setPartnerType(detail);
          setRules(detailedRules.sort((a, b) => {
            const left = new Date(b.effective_from || 0).getTime();
            const right = new Date(a.effective_from || 0).getTime();
            return left - right;
          }));
          setPackages(packageList);
          setPlans(planList);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Gagal memuat detail jenis mitra.");
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
  }, [isInvalidPartnerTypeId, partnerTypeId]);

  const activeRules = useMemo(() => rules.filter((rule) => rule.active), [rules]);
  const tierRules = useMemo(() => rules.filter((rule) => rule.mode === "TIER"), [rules]);
  // Sprint 15a — commission rule sekarang scoped langsung ke plan_id (bukan
  // package_id), jadi tidak perlu lagi lookup 2-hop package->plan.
  const scopedPlanIds = useMemo(
    () => new Set(rules.map((rule) => rule.plan_id).filter((value): value is number => typeof value === "number")),
    [rules],
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
            <span>Menu</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/menu/kelolaan-mitra/jenis-mitra" className="hover:text-[#C92C1E] transition-colors">
              Jenis Mitra
            </Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Detail Data</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isLoading ? "Memuat Data..." : partnerType ? `Detail Jenis Mitra: ${partnerType.name}` : "Data Tidak Ditemukan"}
          </h1>
          {!isLoading && partnerType ? (
            <p className="mt-1 text-sm text-gray-500">
              Kode <span className="font-bold text-gray-700">{partnerType.code}</span> • fallback komisi {formatCommission(partnerType.commission_mode, partnerType.commission_value)}
            </p>
          ) : null}
        </div>

        <Link
          href="/menu/kelolaan-mitra/jenis-mitra"
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
          <span className="font-semibold text-sm">Mengambil rincian jenis mitra...</span>
        </div>
      ) : error || !partnerType ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Jenis Mitra Tidak Ditemukan</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">{error || "Data jenis mitra yang Anda cari mungkin tidak tersedia atau ID tidak valid."}</p>
          <Link
            href="/menu/kelolaan-mitra/jenis-mitra"
            className="rounded-lg bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 inline-flex items-center gap-2"
          >
            Kembali ke Halaman Jenis Mitra
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              title="Kode Jenis Mitra"
              value={partnerType.code}
              description="Identitas master yang dipakai untuk pengelompokan mitra dan fallback komisi."
              primary
            />
            <SummaryCard
              title="Rule Komisi"
              value={rules.length}
              description={`${activeRules.length} aktif • ${tierRules.length} tier • ${rules.length - activeRules.length} nonaktif`}
            />
            <SummaryCard
              title="Cakupan Plan"
              value={scopedPlanIds.size === 0 ? "Semua Plan" : scopedPlanIds.size}
              description={`${plans.length} plan master tersedia`}
            />
          </div>

          <InfoSection
            title="Informasi Jenis Mitra"
            subtitle="Identitas utama dan konfigurasi fallback komisi"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm2 5h10M7 12h10M7 16h6" />}
          >
            <FieldBox label="ID" value={partnerType.id} />
            <FieldBox label="Code" value={partnerType.code} />
            <FieldBox label="Nama Jenis Mitra" value={partnerType.name} />
            <FieldBox label="Mode Komisi Dasar">
              <Badge value={formatLabel(partnerType.commission_mode)} className={getModeBadgeClass(partnerType.commission_mode)} />
            </FieldBox>
            <FieldBox label="Nilai Komisi Dasar" value={formatCommission(partnerType.commission_mode, partnerType.commission_value)} />
            <FieldBox label="Rule Aktif" value={activeRules.length} />
            <FieldBox label="Dibuat Pada" value={formatDateTime(partnerType.created_at)} />
            <FieldBox label="Diperbarui Pada" value={formatDateTime(partnerType.updated_at)} />
            <FieldBox label="Deskripsi" value={partnerType.description || "Belum ada deskripsi jenis mitra."} span />
          </InfoSection>

          <InfoSection
            title="Cakupan Konfigurasi"
            subtitle="Ringkasan apakah komisi berlaku global atau spesifik paket"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 7.5 12 4l9 3.5M4.5 10.5l7.5 3 7.5-3M4.5 14.25l7.5 3 7.5-3" />}
          >
            <FieldBox label="Plan Dengan Rule" value={scopedPlanIds.size === 0 ? "Semua Plan / belum ada scope spesifik" : scopedPlanIds.size} />
            <FieldBox label="Jumlah Plan Master" value={plans.length} />
            <FieldBox label="Jumlah Paket Master" value={packages.length} />
            <FieldBox label="Jumlah Tier Bracket" value={tierRules.reduce((sum, rule) => sum + (rule.tiers?.length || 0), 0)} />
            <FieldBox
              label="Plan Yang Ter-cover Rule"
              span
              value={
                scopedPlanIds.size === 0
                  ? "Rule yang ada saat ini berlaku untuk semua plan atau belum dibatasi pada plan tertentu."
                  : plans
                      .filter((item) => scopedPlanIds.has(item.id))
                      .map((item) => `${item.code} - ${item.name}`)
                      .join(", ") || "Belum ada plan terdeteksi."
              }
            />
          </InfoSection>

          <TimelinePanel
            title="Riwayat Rule Komisi"
            subtitle="Daftar rule komisi berdasarkan paket, periode efektif, dan statusnya"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
          >
            {rules.length === 0 ? (
              <EmptyPanel title="Belum ada commission rule" description="Jenis mitra ini masih memakai fallback komisi dasar dari master partner type." />
            ) : (
              <div className="divide-y divide-gray-100">
                {rules.map((rule) => (
                  <div key={rule.id} className="p-5 space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge value={formatLabel(rule.mode)} className={getModeBadgeClass(rule.mode)} />
                          <Badge value={rule.active ? "Active" : "Inactive"} className={getStatusBadgeClass(rule.active)} />
                          <Badge value={rule.plan_name || "Semua Plan"} className="bg-gray-50 text-gray-600 border border-gray-200" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {formatCommission(rule.mode, rule.value)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Berlaku {formatDateOnly(rule.effective_from)} sampai {formatDateOnly(rule.effective_to)}
                        </p>
                      </div>
                      <p className="text-xs font-bold text-gray-400 whitespace-nowrap">
                        Dibuat {formatDateTime(rule.created_at)}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      <FieldBox label="Rule ID" value={rule.id} />
                      <FieldBox label="Plan Scope" value={rule.plan_code || rule.plan_name || "Semua Plan"} />
                      <FieldBox label="Created By" value={rule.created_by?.name || "-"} />
                      <FieldBox label="Updated At" value={formatDateTime(rule.updated_at)} />
                    </div>

                    {rule.mode === "TIER" && rule.tiers && rule.tiers.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {rule.tiers.map((tier) => (
                          <div key={tier.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-black text-gray-900">Tier {tier.tier_order}</p>
                              <Badge value={formatLabel(tier.mode)} className={getModeBadgeClass(tier.mode)} />
                            </div>
                            <p className="mt-2 text-xs font-bold text-gray-500">
                              Closing {tier.min_closings} sampai {tier.max_closings ?? "tak terbatas"}
                            </p>
                            <p className="mt-2 text-sm font-bold text-[#C92C1E]">
                              {formatCommission(tier.mode, tier.value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </TimelinePanel>
        </div>
      )}
    </div>
  );
}
