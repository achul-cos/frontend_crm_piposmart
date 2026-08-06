"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  createPartnerTypeCommissionRule,
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
  if (!mode) return "Rp 0";
  const numValue = Number(value || 0);
  if (!value || numValue === 0) return "Rp 0";
  if (mode === "PERCENTAGE") return `${numValue}%`;
  if (mode === "FIXED") return formatRupiah(value);
  return "Bertingkat";
}

function stripThousandDots(value: string) {
  return value.replace(/\./g, "").trim();
}

function formatThousandDots(val: string | number): string {
  const digits = String(val).replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function getAutoCommissionCategory(typeIdentifier?: string | null): "REFERRAL" | "PARTNERSHIP" | "STRATEGIC" | null {
  const typeUpper = (typeIdentifier || "").toUpperCase();

  if (
    typeUpper.includes("STRATEGIC") ||
    typeUpper.includes("STRATEGIS") ||
    typeUpper.includes("DISTRIBUTOR")
  ) {
    return "STRATEGIC";
  }

  if (
    typeUpper.includes("PARTNERSHIP") ||
    typeUpper.includes("PARTNER") ||
    typeUpper.includes("AGEN")
  ) {
    return "PARTNERSHIP";
  }

  if (
    typeUpper.includes("REFERRAL") ||
    typeUpper.includes("REFERAL")
  ) {
    return "REFERRAL";
  }

  return null;
}

function getPresetCommissionValue(
  plan: CatalogPlan | null,
  typeIdentifier?: string | null,
): string | null {
  if (!plan) return "0";

  const category = getAutoCommissionCategory(typeIdentifier);
  const pkgNameUpper = (plan.package?.name || "").toUpperCase();
  const planNameUpper = (plan.name || "").toUpperCase();
  const tenure = Number(plan.tenure_months || 0);

  if (tenure !== 12 && tenure !== 18 && tenure !== 24) {
    return "0";
  }

  if (!category) return "0";

  const isBasic = pkgNameUpper.includes("BASIC") || planNameUpper.includes("BASIC");
  const isBusiness = pkgNameUpper.includes("BUSINESS") || planNameUpper.includes("BUSINESS");
  const isPro = pkgNameUpper.includes("PRO") || planNameUpper.includes("PRO");

  // 1. Basic (12 Bulan)
  if (isBasic && tenure === 12) {
    if (category === "REFERRAL") return "120000";
    if (category === "PARTNERSHIP") return "150000";
    if (category === "STRATEGIC") return "240000";
  }

  // 2. Business (12, 18, 24 Bulan)
  if (isBusiness) {
    if (tenure === 12) {
      if (category === "REFERRAL") return "180000";
      if (category === "PARTNERSHIP") return "210000";
      if (category === "STRATEGIC") return "320000";
    }
    if (tenure === 18) {
      if (category === "REFERRAL") return "270000";
      if (category === "PARTNERSHIP") return "315000";
      if (category === "STRATEGIC") return "480000";
    }
    if (tenure === 24) {
      if (category === "REFERRAL") return "360000";
      if (category === "PARTNERSHIP") return "420000";
      if (category === "STRATEGIC") return "640000";
    }
  }

  // 3. Pro (12, 18, 24 Bulan)
  if (isPro) {
    if (tenure === 12) {
      if (category === "REFERRAL") return "220000";
      if (category === "PARTNERSHIP") return "250000";
      if (category === "STRATEGIC") return "400000";
    }
    if (tenure === 18) {
      if (category === "REFERRAL") return "330000";
      if (category === "PARTNERSHIP") return "375000";
      if (category === "STRATEGIC") return "600000";
    }
    if (tenure === 24) {
      if (category === "REFERRAL") return "440000";
      if (category === "PARTNERSHIP") return "500000";
      if (category === "STRATEGIC") return "800000";
    }
  }

  return "0";
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

function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div
        className="w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl transition-all"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b border-slate-100 bg-white px-6 py-5 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C92C1E]">
                Edit Komisi Plan
              </span>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">
                {title}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Tutup Modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
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
      <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50">
        <div className="flex items-center gap-3">
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
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function FieldBox({
  label,
  value,
  badge = false,
  span = false,
  children,
}: {
  label: string;
  value?: ReactNode;
  badge?: boolean;
  span?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`bg-gray-50 p-3.5 rounded-xl border border-gray-100 ${span ? "sm:col-span-2 xl:col-span-3" : ""}`}>
      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</span>
      <div className="font-bold text-gray-900 text-sm break-words">
        {children ?? (badge ? <Badge value={String(value)} className={getModeBadgeClass(String(value))} /> : (value ?? "-"))}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-xs focus:border-[#C92C1E] focus:outline-hidden focus:ring-4 focus:ring-red-100 transition-all";
const selectClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-xs focus:border-[#C92C1E] focus:outline-hidden focus:ring-4 focus:ring-red-100 transition-all";

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

  // Edit Plan Commission Modal State
  const [editingPlanRow, setEditingPlanRow] = useState<{
    planId: number;
    planName: string;
    packageName: string;
    tenureMonths: number;
    price: string;
    currentMode: string;
    currentValue: string;
  } | null>(null);
  const [editMode, setEditMode] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [editValue, setEditValue] = useState("");
  const [savingPlanCommission, setSavingPlanCommission] = useState(false);
  const [editModalError, setEditModalError] = useState("");

  const [customPlanCommissions, setCustomPlanCommissions] = useState<Record<number, { mode: string; value: string }>>({});

  const loadData = async () => {
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

      setPartnerType(detail);
      setRules(
        detailedRules.sort((a, b) => {
          const left = new Date(b.effective_from || 0).getTime();
          const right = new Date(a.effective_from || 0).getTime();
          if (left !== right) return left - right;
          return (b.id || 0) - (a.id || 0);
        }),
      );
      setPackages(packageList);
      setPlans(planList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat detail jenis mitra.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isInvalidPartnerTypeId) {
      setError("ID jenis mitra tidak valid.");
      setIsLoading(false);
      return;
    }

    loadData();
  }, [partnerTypeId, isInvalidPartnerTypeId]);

  const activeRules = useMemo(() => rules.filter((rule) => rule.active), [rules]);

  // Computed rows for the plan commission table
  const planCommissionRows = useMemo(() => {
    if (!plans || plans.length === 0) return [];

    const typeIdentifier = partnerType ? `${partnerType.code} ${partnerType.name}` : "";

    return plans.map((plan, idx) => {
      const specificRule = rules.find(
        (r) => r.active && r.plan_id !== null && r.plan_id !== undefined && Number(r.plan_id) === Number(plan.id),
      );
      const globalRule = rules.find((r) => r.active && (r.plan_id === null || r.plan_id === undefined));
      const activeRule = specificRule || globalRule;

      const override = customPlanCommissions[plan.id];

      let effectiveMode = override?.mode || (activeRule ? activeRule.mode : partnerType?.commission_mode || "FIXED");
      let effectiveValue = override?.value ?? (activeRule ? activeRule.value : getPresetCommissionValue(plan, typeIdentifier));

      if (!effectiveValue || effectiveValue === "0") {
        effectiveValue = "0";
      }

      return {
        no: idx + 1,
        planId: plan.id,
        planCode: plan.code,
        planName: plan.name,
        packageName: plan.package?.name || plan.name,
        tenureMonths: plan.tenure_months,
        price: plan.price ? formatRupiah(plan.price) : "-",
        hasSpecificRule: Boolean(specificRule || override),
        rule: activeRule,
        commissionMode: effectiveMode,
        rawCommissionValue: effectiveValue,
        displayCommission: formatCommission(effectiveMode, effectiveValue),
      };
    });
  }, [plans, rules, partnerType, customPlanCommissions]);

  const openEditPlanModal = (row: typeof planCommissionRows[0]) => {
    setEditingPlanRow({
      planId: row.planId,
      planName: row.planName,
      packageName: row.packageName,
      tenureMonths: row.tenureMonths,
      price: row.price,
      currentMode: row.commissionMode || "FIXED",
      currentValue: row.rawCommissionValue || "0",
    });
    const mode = row.commissionMode === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
    setEditMode(mode);
    const rawVal = row.rawCommissionValue === "0" ? "" : row.rawCommissionValue || "";
    setEditValue(mode === "FIXED" && rawVal ? formatThousandDots(rawVal) : rawVal);
    setEditModalError("");
  };

  const handleSavePlanCommission = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPlanRow) return;
    setEditModalError("");

    const cleanValue = stripThousandDots(editValue);
    if (!cleanValue) {
      setEditModalError("Nilai komisi wajib diisi.");
      return;
    }

    try {
      setSavingPlanCommission(true);

      // Immediately update local state so table reflects changes without delay
      setCustomPlanCommissions((prev) => ({
        ...prev,
        [editingPlanRow.planId]: { mode: editMode, value: cleanValue },
      }));

      await createPartnerTypeCommissionRule(partnerTypeId, {
        plan_id: editingPlanRow.planId,
        mode: editMode,
        value: cleanValue,
        effective_from: new Date().toISOString(),
      });

      setEditingPlanRow(null);
      await loadData();
    } catch (err) {
      setEditModalError(err instanceof Error ? err.message : "Gagal memperbarui komisi plan.");
    } finally {
      setSavingPlanCommission(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
            <span>Menu</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/menu/kelolaan-mitra" className="hover:text-[#C92C1E] transition-colors">
              Kelolaan Mitra
            </Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Detail Jenis Mitra & Komisi</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isLoading ? "Memuat Data..." : partnerType ? `Detail Jenis Mitra: ${partnerType.name}` : "Data Tidak Ditemukan"}
          </h1>
          {!isLoading && partnerType ? (
            <p className="mt-1 text-sm text-gray-500">
              Kode <span className="font-bold text-gray-700">{partnerType.code}</span> • Fallback Komisi:{" "}
              <span className="font-bold text-[#C92C1E]">{formatCommission(partnerType.commission_mode, partnerType.commission_value)}</span>
            </p>
          ) : null}
        </div>

        <Link
          href="/menu/kelolaan-mitra"
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#C92C1E] flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali
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
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">{error || "Data jenis mitra yang Anda cari tidak tersedia."}</p>
          <Link
            href="/menu/kelolaan-mitra"
            className="rounded-lg bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 inline-flex items-center gap-2"
          >
            Kembali ke Kelolaan Mitra
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              title="Kode Jenis Mitra"
              value={partnerType.code}
              description="Identitas master yang dipakai untuk pengelompokan mitra dan komisi."
              primary
            />
            <SummaryCard
              title="Jumlah Plan / Paket"
              value={plans.length}
              description={`${packages.length} paket langganan master tersedia`}
            />
            <SummaryCard
              title="Rule Komisi Aktif"
              value={activeRules.length}
              description={`Fallback komisi dasar: ${formatCommission(partnerType.commission_mode, partnerType.commission_value)}`}
            />
          </div>

          <InfoSection
            title="Informasi Jenis Mitra"
            subtitle="Identitas utama dan konfigurasi komisi dasar"
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

          {/* TABEL RINCIAN KOMISI PER PLAN / PAKET LANGGANAN */}
          <div className="w-full bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                  <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900 leading-tight">
                    Tabel Rincian Komisi per Paket / Plan Langganan ({partnerType.name})
                  </h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                    Daftar komisi untuk setiap paket langganan (Tekan tombol Edit pada baris plan untuk mengubah komisi)
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 min-w-[760px]">
                <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-4 text-center w-12">No</th>
                    <th className="px-5 py-4">Nama Paket & Plan</th>
                    <th className="px-5 py-4">Durasi</th>
                    <th className="px-5 py-4">Harga Paket</th>
                    <th className="px-5 py-4">Komisi ({partnerType.name})</th>
                    <th className="px-5 py-4 text-center">Mode Komisi</th>
                    <th className="px-5 py-4 text-center">Status Aturan</th>
                    <th className="px-5 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {planCommissionRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-400 font-bold italic">
                        Belum ada data paket langganan.
                      </td>
                    </tr>
                  ) : (
                    planCommissionRows.map((row) => (
                      <tr key={row.planId} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4 text-center font-bold text-gray-400">{row.no}</td>
                        <td className="px-5 py-4 font-bold text-gray-900">
                          {row.packageName}
                          <span className="block text-xs font-medium text-gray-400 mt-0.5">{row.planCode} - {row.planName}</span>
                        </td>
                        <td className="px-5 py-4 font-medium text-gray-700 whitespace-nowrap">
                          {row.tenureMonths ? `${row.tenureMonths} Bulan` : "-"}
                        </td>
                        <td className="px-5 py-4 font-medium text-gray-800 whitespace-nowrap">
                          {row.price}
                        </td>
                        <td className="px-5 py-4 font-black text-[#C92C1E] text-base whitespace-nowrap">
                          {row.displayCommission}
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <Badge value={formatLabel(row.commissionMode)} className={getModeBadgeClass(row.commissionMode)} />
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          {row.hasSpecificRule ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 border border-emerald-200">
                              Rule Spesifik Plan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase text-gray-600 border border-gray-200">
                              Komisi Standar
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditPlanModal(row)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 shadow-xs transition-colors hover:bg-orange-100 hover:border-orange-300"
                            title={`Edit Komisi ${row.packageName} (${row.tenureMonths} Bulan)`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Komisi Plan */}
      <ModalShell
        open={Boolean(editingPlanRow)}
        title={`Edit Komisi: ${editingPlanRow?.packageName || ""} (${editingPlanRow?.tenureMonths || 0} Bulan)`}
        subtitle={`Ubah nilai komisi untuk jenis mitra ${partnerType?.name || ""}`}
        onClose={() => setEditingPlanRow(null)}
      >
        <form onSubmit={handleSavePlanCommission} className="space-y-4">
          {editModalError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
              {editModalError}
            </div>
          ) : null}

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
            <p className="text-xs font-bold text-gray-500">Plan / Paket:</p>
            <p className="text-sm font-black text-gray-900">{editingPlanRow?.packageName} - {editingPlanRow?.planName}</p>
            <p className="text-xs font-semibold text-gray-600">Harga Paket: {editingPlanRow?.price}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Mode Komisi</label>
            <select
              value={editMode}
              onChange={(e) => {
                const newMode = e.target.value as "FIXED" | "PERCENTAGE";
                setEditMode(newMode);
                if (newMode === "FIXED" && editValue) {
                  setEditValue(formatThousandDots(editValue));
                } else if (newMode === "PERCENTAGE" && editValue) {
                  setEditValue(stripThousandDots(editValue));
                }
              }}
              className={selectClass}
            >
              <option value="FIXED">Nominal Tetap (Rp)</option>
              <option value="PERCENTAGE">Persentase (%)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {editMode === "PERCENTAGE" ? "Nilai Persentase Komisi (%)" : "Nilai Nominal Komisi (Rp)"}
            </label>
            <input
              type="text"
              value={editValue}
              onChange={(e) => {
                const val = e.target.value;
                if (editMode === "FIXED") {
                  setEditValue(formatThousandDots(val));
                } else {
                  setEditValue(val);
                }
              }}
              placeholder={editMode === "PERCENTAGE" ? "Contoh: 10" : "Contoh: 150.000"}
              className={inputClass}
              autoFocus
            />
            <p className="mt-1 text-[11px] text-gray-400">
              {editMode === "FIXED"
                ? "Format nominal komisi menggunakan pemisah titik ribuan (misal: 150.000). Jika diisi 0, komisi plan ini menjadi Rp 0."
                : "Masukkan nilai persentase komisi (misal: 10). Jika diisi 0, komisi plan ini menjadi 0%."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setEditingPlanRow(null)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingPlanCommission}
              className="rounded-xl bg-[#C92C1E] px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {savingPlanCommission ? "Menyimpan..." : "Simpan Komisi Plan"}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
