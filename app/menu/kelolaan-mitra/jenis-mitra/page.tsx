"use client";

/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, PowerOff } from "lucide-react";
import { useFeedback } from "@/app/components/feedback/FeedbackContext";
import {
  ViewActionButton,
  EditActionButton,
  RowActionButton,
  RowActionGroup,
} from "@/app/components/table/RowActionButton";
import { AnimatedListItem } from "@/app/components/motion/primitives";
import {
  type PartnerCommissionRuleItem,
  type PartnerTypeItem,
} from "@/app/lib/api";
import {
  useCatalogPackagesQuery,
  useCatalogPlansQuery,
  useCreatePartnerTypeCommissionRuleMutation,
  useCreatePartnerTypeMutation,
  useDeactivatePartnerTypeCommissionRuleMutation,
  useMitraProfileQuery,
  usePartnerTypeDetailQuery,
  usePartnerTypeListQuery,
  usePartnerTypeRulesDetailedQuery,
  useUpdatePartnerTypeMutation,
} from "@/app/lib/queries/mitra";
import type { CatalogPlan } from "@/app/lib/api";

type TypeFormState = {
  code: string;
  name: string;
  commissionMode: "PERCENTAGE" | "FIXED";
  commissionValue: string;
  description: string;
};

type TierDraft = {
  tier_order: number;
  min_closings: number;
  max_closings: string;
  mode: "PERCENTAGE" | "FIXED";
  value: string;
};

type RuleFormState = {
  // Sprint 15a — commission rule scoped langsung ke plan (bukan package lagi),
  // karena beda tenor plan pada package yang sama bisa punya komisi beda.
  planId: string;
  mode: "PERCENTAGE" | "FIXED" | "TIER";
  value: string;
  effectiveFrom: string;
  effectiveTo: string;
  tiers: TierDraft[];
};

const EMPTY_TYPE_FORM: TypeFormState = {
  code: "",
  name: "",
  commissionMode: "PERCENTAGE",
  commissionValue: "",
  description: "",
};

const EMPTY_RULE_FORM: RuleFormState = {
  planId: "",
  mode: "PERCENTAGE",
  value: "",
  effectiveFrom: "",
  effectiveTo: "",
  tiers: [
    { tier_order: 1, min_closings: 1, max_closings: "", mode: "PERCENTAGE", value: "" },
  ],
};

function stripThousandDots(value: string) {
  return value.replace(/\./g, "").trim();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

function formatDateTime(value?: string | null) {
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

function formatFlatCommission(item?: PartnerTypeItem | null) {
  if (!item) return "-";
  const amount = Number(item.commission_value || 0);
  if (item.commission_mode === "PERCENTAGE") return `${amount}%`;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default function JenisMitraPage() {
  const { confirm, withLoading, showError } = useFeedback();
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [savingType, setSavingType] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [typeFormError, setTypeFormError] = useState("");
  const [ruleFormError, setRuleFormError] = useState("");
  const [typeFormSuccess, setTypeFormSuccess] = useState("");
  const [ruleFormSuccess, setRuleFormSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingType, setEditingType] = useState<PartnerTypeItem | null>(null);
  const [typeForm, setTypeForm] = useState<TypeFormState>(EMPTY_TYPE_FORM);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(EMPTY_RULE_FORM);

  const profileQuery = useMitraProfileQuery();
  const currentRole =
    profileQuery.data?.role ||
    (typeof window !== "undefined" ? localStorage.getItem("piposmart_user_role") || "" : "");

  const typesQuery = usePartnerTypeListQuery();
  const partnerTypes = useMemo(() => typesQuery.data?.items || [], [typesQuery.data]);

  const packagesQuery = useCatalogPackagesQuery();
  const packages = packagesQuery.data || [];
  const plansQuery = useCatalogPlansQuery();
  const plans = plansQuery.data || [];

  // Default the selection to the first partner type once the list has loaded.
  useEffect(() => {
    if (selectedTypeId === null && partnerTypes.length > 0) {
      setSelectedTypeId(partnerTypes[0].id);
    }
  }, [partnerTypes, selectedTypeId]);

  const typeDetailQuery = usePartnerTypeDetailQuery(selectedTypeId);
  const selectedType = typeDetailQuery.data || null;
  const rulesQuery = usePartnerTypeRulesDetailedQuery(selectedTypeId);
  const commissionRules = useMemo(() => rulesQuery.data || [], [rulesQuery.data]);

  const loading = typesQuery.isLoading || (Boolean(selectedTypeId) && (typeDetailQuery.isLoading || rulesQuery.isLoading));
  const pageError = typesQuery.error
    ? getErrorMessage(typesQuery.error)
    : typeDetailQuery.error
      ? getErrorMessage(typeDetailQuery.error)
      : "";

  const createTypeMutation = useCreatePartnerTypeMutation();
  const updateTypeMutation = useUpdatePartnerTypeMutation();
  const createRuleMutation = useCreatePartnerTypeCommissionRuleMutation();
  const deactivateRuleMutation = useDeactivatePartnerTypeCommissionRuleMutation();

  // Backend: partner-type CRUD (create/update/delete) is ADMIN-only (canManagePartnerType).
  const canManageTypes = currentRole === "ADMIN";
  // Backend: creating a commission rule allows ADMIN + SUPERVISOR (CreateCommissionRule).
  const canCreateRules = currentRole === "ADMIN" || currentRole === "SUPERVISOR";
  // Backend: deactivating a commission rule is ADMIN-only (DeactivateCommissionRule).
  const canDeactivateRules = currentRole === "ADMIN";

  const selectedPlan = useMemo(() => {
    if (!ruleForm.planId) return null;
    return plans.find((plan) => plan.id === Number(ruleForm.planId)) || null;
  }, [plans, ruleForm.planId]);

  const getPresetCommissionValue = (
    plan: CatalogPlan | null,
    typeIdentifier?: string | null,
  ): string | null => {
    if (!plan) return null;

    const typeUpper = (typeIdentifier || "").toUpperCase();
    const pkgNameUpper = (plan.package?.name || plan.name || "").toUpperCase();
    const planNameUpper = (plan.name || "").toUpperCase();
    const tenure = Number(plan.tenure_months || 0);

    // Determine category (Referral, Partnership, Strategic)
    let category: "REFERRAL" | "PARTNERSHIP" | "STRATEGIC" = "REFERRAL";
    if (typeUpper.includes("STRATEGIC") || typeUpper.includes("STRATEGIS") || typeUpper.includes("DISTRIBUTOR")) {
      category = "STRATEGIC";
    } else if (typeUpper.includes("PARTNERSHIP") || typeUpper.includes("PARTNER") || typeUpper.includes("AGEN")) {
      category = "PARTNERSHIP";
    } else if (typeUpper.includes("REFERRAL") || typeUpper.includes("REFRAL") || typeUpper.includes("REF")) {
      category = "REFERRAL";
    }

    // Basic Package
    if (pkgNameUpper.includes("BASIC") || planNameUpper.includes("BASIC")) {
      if (category === "STRATEGIC") return "240000";
      if (category === "PARTNERSHIP") return "150000";
      return "120000"; // Referral fallback
    }

    // Business Package
    if (pkgNameUpper.includes("BUSINESS") || planNameUpper.includes("BUSINESS")) {
      if (tenure === 18) {
        if (category === "STRATEGIC") return "480000";
        if (category === "PARTNERSHIP") return "315000";
        return "270000"; // Referral
      }
      if (tenure === 24) {
        if (category === "STRATEGIC") return "640000";
        if (category === "PARTNERSHIP") return "420000";
        return "360000"; // Referral
      }
      // Default Business (12 Bulan / 1 Bulan / standard)
      if (category === "STRATEGIC") return "320000";
      if (category === "PARTNERSHIP") return "210000";
      return "180000"; // Referral
    }

    // Pro Package
    if (pkgNameUpper.includes("PRO") || planNameUpper.includes("PRO")) {
      if (tenure === 18) {
        if (category === "STRATEGIC") return "600000";
        if (category === "PARTNERSHIP") return "375000";
        return "330000"; // Referral
      }
      if (tenure === 24) {
        if (category === "STRATEGIC") return "800000";
        if (category === "PARTNERSHIP") return "500000";
        return "440000"; // Referral
      }
      // Default Pro (12 Bulan / 1 Bulan / standard)
      if (category === "STRATEGIC") return "400000";
      if (category === "PARTNERSHIP") return "250000";
      return "220000"; // Referral
    }

    // General fallback based on category if package name is unknown
    if (category === "STRATEGIC") return "240000";
    if (category === "PARTNERSHIP") return "150000";
    return "120000";
  };

  const handlePlanChange = (planId: string) => {
    const selectedPlanObj = plans.find((p) => String(p.id) === planId) || null;
    const selectedTypeObj = partnerTypes.find((t) => t.id === selectedTypeId);
    const typeIdentifier =
      selectedTypeObj?.code ||
      selectedTypeObj?.name ||
      editingType?.code ||
      editingType?.name ||
      typeForm.code ||
      typeForm.name;

    const presetVal = getPresetCommissionValue(selectedPlanObj, typeIdentifier);

    setRuleForm((current) => ({
      ...current,
      planId,
      mode: presetVal ? "FIXED" : current.mode,
      value: presetVal || current.value,
    }));
  };

  const filteredPartnerTypes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return partnerTypes;
    return partnerTypes.filter((item) => [item.code, item.name, item.description || ""].join(" ").toLowerCase().includes(keyword));
  }, [partnerTypes, search]);


  const activeRuleCount = useMemo(() => {
    return commissionRules.filter((rule) => rule.active).length;
  }, [commissionRules]);

  const startCreateType = () => {
    setEditingType(null);
    setTypeForm(EMPTY_TYPE_FORM);
    setTypeFormError("");
    setTypeFormSuccess("");
    setShowTypeForm(true);
  };

  const startEditType = () => {
    if (!selectedType) return;
    setEditingType(selectedType);
    setTypeForm({
      code: selectedType.code,
      name: selectedType.name,
      commissionMode: selectedType.commission_mode,
      commissionValue: selectedType.commission_value,
      description: selectedType.description || "",
    });
    setTypeFormError("");
    setTypeFormSuccess("");
    setShowTypeForm(true);
  };

  const handleTypeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTypeFormError("");
    setTypeFormSuccess("");
    if (!typeForm.name.trim()) {
      setTypeFormError("Nama partner type wajib diisi.");
      return;
    }
    if (!editingType && !typeForm.code.trim()) {
      setTypeFormError("Code partner type wajib diisi.");
      return;
    }
    if (!typeForm.commissionValue.trim()) {
      setTypeFormError("Nilai komisi dasar wajib diisi.");
      return;
    }

    setSavingType(true);
    try {
      if (editingType) {
        await updateTypeMutation.mutateAsync({
          typeId: editingType.id,
          payload: {
            name: typeForm.name.trim(),
            commission_mode: typeForm.commissionMode,
            commission_value: stripThousandDots(typeForm.commissionValue) || "0",
            description: typeForm.description.trim(),
          },
        });
        setTypeFormSuccess("Jenis mitra berhasil diperbarui.");
        setSelectedTypeId(editingType.id);
      } else {
        const created = await createTypeMutation.mutateAsync({
          code: typeForm.code.trim().toUpperCase(),
          name: typeForm.name.trim(),
          commission_mode: typeForm.commissionMode,
          commission_value: stripThousandDots(typeForm.commissionValue) || "0",
          description: typeForm.description.trim() || undefined,
        });
        setTypeFormSuccess(`Jenis mitra ${created.name} (${created.code}) berhasil dibuat.`);
        setSelectedTypeId(created.id);
        setShowTypeForm(false);
      }
    } catch (error) {
      setTypeFormError(getErrorMessage(error));
    } finally {
      setSavingType(false);
    }
  };

  const handleRuleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTypeId) {
      setRuleFormError("Pilih partner type terlebih dahulu.");
      return;
    }
    setRuleFormError("");
    setRuleFormSuccess("");

    if (!ruleForm.effectiveFrom) {
      setRuleFormError("Tanggal effective from wajib diisi.");
      return;
    }
    if (ruleForm.mode !== "TIER" && !ruleForm.value.trim()) {
      setRuleFormError("Nilai rule wajib diisi untuk mode PERCENTAGE/FIXED.");
      return;
    }
    if (ruleForm.mode === "TIER") {
      const invalidTier = ruleForm.tiers.some((tier) => !tier.value.trim());
      if (invalidTier) {
        setRuleFormError("Setiap tier wajib memiliki nilai komisi.");
        return;
      }
    }

    setSavingRule(true);
    try {
      await createRuleMutation.mutateAsync({
        typeId: selectedTypeId,
        payload: {
          plan_id: ruleForm.planId ? Number(ruleForm.planId) : undefined,
          mode: ruleForm.mode,
          value: ruleForm.mode === "TIER" ? undefined : ruleForm.value.trim(),
          effective_from: new Date(ruleForm.effectiveFrom).toISOString(),
          effective_to: ruleForm.effectiveTo ? new Date(ruleForm.effectiveTo).toISOString() : undefined,
          tiers: ruleForm.mode === "TIER" ? ruleForm.tiers.map((tier) => ({
            tier_order: tier.tier_order,
            min_closings: tier.min_closings,
            max_closings: tier.max_closings ? Number(tier.max_closings) : undefined,
            mode: tier.mode,
            value: tier.value.trim(),
          })) : undefined,
        },
      });
      setRuleFormSuccess("Commission rule berhasil dibuat.");
      setRuleForm(EMPTY_RULE_FORM);
    } catch (error) {
      setRuleFormError(getErrorMessage(error));
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeactivateRule = async (rule: PartnerCommissionRuleItem) => {
    if (!selectedTypeId) return;
    const ok = await confirm({
      title: "Nonaktifkan Rule Komisi",
      message: `Yakin ingin menonaktifkan rule komisi #${rule.id}? Rule ini tidak akan dipakai lagi untuk perhitungan komisi selanjutnya.`,
      danger: true,
    });
    if (!ok) return;
    setSavingRule(true);
    setRuleFormError("");
    setRuleFormSuccess("");
    try {
      await withLoading(() =>
        deactivateRuleMutation.mutateAsync({ typeId: selectedTypeId, ruleId: rule.id }),
      );
      setRuleFormSuccess("Rule berhasil dinonaktifkan.");
    } catch (error) {
      const message = getErrorMessage(error);
      setRuleFormError(message);
      showError({
        title: "Gagal menonaktifkan rule",
        message: "Sistem gagal menonaktifkan rule komisi ini.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau data sudah berubah sejak halaman dimuat.",
        solution: "Muat ulang halaman lalu coba lagi.",
        technicalDetails: message,
        onRetry: () => void handleDeactivateRule(rule),
      });
    } finally {
      setSavingRule(false);
    }
  };

  return (
    <div className="w-full space-y-6 font-sans text-[#1C1C1E]">
      <section className="overflow-hidden rounded-3xl border border-red-100 bg-white shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-[80px] bg-red-50" />
          <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">Jenis Mitra</div>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-gray-950 md:text-3xl">Master Partner Type dan Rule Komisi</h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-gray-500">Halaman ini memakai backend `partner-types` dan `commission-rules`. Rule komisi saat ini package-scoped dan effective-dated, dengan opsi mode TIER bila spesifikasi komisinya bertingkat.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Link href="/menu/kelolaan-mitra" className="rounded-2xl border border-gray-200 px-5 py-3 text-center text-xs font-black text-gray-600 transition hover:bg-gray-50">Kembali ke Mitra</Link>{canManageTypes ? <button type="button" onClick={startCreateType} className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216]">+ Tambah Partner Type</button> : null}</div>
          </div>
        </div>
      </section>

      {pageError ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{pageError}</div> : null}

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-black text-gray-900">Tabel Jenis Mitra</h2>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Master ini dipakai saat membuat mitra baru. Komisi dasar menjadi fallback, sedangkan komisi per paket dikelola lewat commission rule.
            </p>
          </div>
          <div className="w-full lg:max-w-sm">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari code / nama jenis mitra"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
          Nonaktifkan jenis mitra belum saya hubungkan ke aksi backend, karena kontrak API saat ini hanya menyediakan create dan update partner type, serta deactivate untuk commission rule.
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500">Code</th>
                <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500">Nama</th>
                <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500">Komisi Dasar</th>
                <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500">Rule Aktif</th>
                <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredPartnerTypes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm font-bold text-gray-400">
                    Belum ada jenis mitra yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
                filteredPartnerTypes.map((item) => {
                  const isSelected = selectedTypeId === item.id;
                  return (
                    <tr key={item.id} className={isSelected ? "bg-red-50/60" : "bg-white"}>
                      <td className="px-4 py-4 text-sm font-black text-gray-900">{item.code}</td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-600">{item.name}</td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-600">{formatFlatCommission(item)}</td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-600">{selectedTypeId === item.id ? activeRuleCount : "Lihat detail"}</td>
                      <td className="px-4 py-4">
                        <RowActionGroup>
                          <ViewActionButton
                            href={`/menu/kelolaan-mitra/jenis-mitra/${item.id}`}
                            title="Detail Jenis Mitra"
                          />
                          <RowActionButton
                            icon={CheckCircle2}
                            tone={isSelected ? "deactivate" : "activate"}
                            title={isSelected ? "Terpilih" : "Pilih"}
                            onClick={() => setSelectedTypeId(item.id)}
                          />
                          {canManageTypes ? (
                            <EditActionButton
                              onClick={() => {
                                setSelectedTypeId(item.id);
                                setTimeout(() => startEditType(), 0);
                              }}
                              title="Edit"
                            />
                          ) : null}
                          {canManageTypes ? (
                            <RowActionButton
                              icon={PowerOff}
                              tone="deactivate"
                              disabled
                              title="Backend belum menyediakan endpoint nonaktifkan partner type"
                            />
                          ) : null}
                        </RowActionGroup>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-sm font-black text-gray-900">Detail Jenis Mitra</h2>
                <p className="mt-1 text-xs font-medium text-gray-400">
                  Komisi dasar di partner type tetap menjadi fallback jika tidak ada rule backend yang cocok.
                </p>
              </div>
              {canManageTypes && selectedType ? (
                <button
                  type="button"
                  onClick={startEditType}
                  className="rounded-2xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50"
                >
                  Edit Jenis Mitra
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-400">
                Memuat detail partner type...
              </div>
            ) : selectedType ? (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Code</p>
                  <p className="mt-2 text-sm font-black text-gray-900">{selectedType.code}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Nama</p>
                  <p className="mt-2 text-sm font-black text-gray-900">{selectedType.name}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Mode Dasar</p>
                  <p className="mt-2 text-sm font-black text-gray-900">{selectedType.commission_mode}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Nilai Dasar</p>
                  <p className="mt-2 text-sm font-black text-gray-900">{formatFlatCommission(selectedType)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Rule Aktif</p>
                  <p className="mt-2 text-sm font-black text-gray-900">{activeRuleCount}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:col-span-2 xl:col-span-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Deskripsi</p>
                  <p className="mt-2 text-sm font-bold text-gray-600">{selectedType.description || "Belum ada deskripsi partner type."}</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-400">
                Belum ada partner type yang dipilih.
              </div>
            )}
          </section>

          <form onSubmit={handleRuleSubmit} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-sm font-black text-gray-900">Komisi Per Paket</h2>
                <p className="mt-1 text-xs font-medium text-gray-400">
                  Buat rule baru untuk mengubah komisi berdasarkan paket. Backend akan memakai rule aktif sesuai effective date dan paket yang cocok.
                </p>
              </div>
              <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-black text-[#C92C1E]">
                {selectedType ? selectedType.code : "Belum pilih type"}
              </span>
            </div>
            {ruleFormError ? <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{ruleFormError}</div> : null}
            {ruleFormSuccess ? <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{ruleFormSuccess}</div> : null}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"><select value={ruleForm.planId} onChange={(event) => handlePlanChange(event.target.value)} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]"><option value="">Semua Plan</option>{plans.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.tenure_months} bln)</option>)}</select><select value={ruleForm.mode} onChange={(event) => setRuleForm((current) => ({ ...current, mode: event.target.value as "PERCENTAGE" | "FIXED" | "TIER" }))} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]"><option value="PERCENTAGE">PERCENTAGE</option><option value="FIXED">FIXED</option><option value="TIER">TIER</option></select>{ruleForm.mode === "TIER" ? <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500">Mode TIER memakai daftar bracket di bawah.</div> : <input value={ruleForm.value} onChange={(event) => setRuleForm((current) => ({ ...current, value: event.target.value }))} placeholder={ruleForm.mode === "PERCENTAGE" ? "Contoh: 7.5" : "Contoh: 250000"} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" />}<input type="datetime-local" value={ruleForm.effectiveFrom} onChange={(event) => setRuleForm((current) => ({ ...current, effectiveFrom: event.target.value }))} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /><input type="datetime-local" value={ruleForm.effectiveTo} onChange={(event) => setRuleForm((current) => ({ ...current, effectiveTo: event.target.value }))} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /><div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500">{!selectedPlan ? "Rule akan berlaku untuk semua plan (fallback komisi dasar)." : `Plan terpilih: ${selectedPlan.name} — harga ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(selectedPlan.price || 0))}`}</div></div>
            {ruleForm.mode === "TIER" ? <div className="mt-4 space-y-3">{ruleForm.tiers.map((tier, index) => <div key={index} className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-5"><input type="number" min={1} value={tier.min_closings} onChange={(event) => setRuleForm((current) => ({ ...current, tiers: current.tiers.map((item, tierIndex) => tierIndex === index ? { ...item, min_closings: Number(event.target.value) || 1 } : item) }))} placeholder="Min closings" className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" /><input value={tier.max_closings} onChange={(event) => setRuleForm((current) => ({ ...current, tiers: current.tiers.map((item, tierIndex) => tierIndex === index ? { ...item, max_closings: event.target.value } : item) }))} placeholder="Max closings" className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" /><select value={tier.mode} onChange={(event) => setRuleForm((current) => ({ ...current, tiers: current.tiers.map((item, tierIndex) => tierIndex === index ? { ...item, mode: event.target.value as "PERCENTAGE" | "FIXED" } : item) }))} className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"><option value="PERCENTAGE">PERCENTAGE</option><option value="FIXED">FIXED</option></select><input value={tier.value} onChange={(event) => setRuleForm((current) => ({ ...current, tiers: current.tiers.map((item, tierIndex) => tierIndex === index ? { ...item, value: event.target.value } : item) }))} placeholder="Nilai komisi tier" className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" /><button type="button" onClick={() => setRuleForm((current) => ({ ...current, tiers: current.tiers.filter((_, tierIndex) => tierIndex !== index).map((item, itemIndex) => ({ ...item, tier_order: itemIndex + 1 })) }))} disabled={ruleForm.tiers.length === 1} className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-black text-gray-600 disabled:cursor-not-allowed disabled:opacity-50">Hapus Tier</button></div>)}<button type="button" onClick={() => setRuleForm((current) => ({ ...current, tiers: [...current.tiers, { tier_order: current.tiers.length + 1, min_closings: current.tiers.length + 1, max_closings: "", mode: "PERCENTAGE", value: "" }] }))} className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-black text-gray-600 transition hover:bg-gray-50">+ Tambah Tier</button></div> : null}
            <div className="mt-4 flex justify-end"><button type="submit" disabled={!canCreateRules || savingRule || !selectedTypeId} className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-red-300">{savingRule ? "Menyimpan Rule..." : "Simpan Commission Rule"}</button></div>
          </form>
        </div>

        <div className="space-y-5">
          {showTypeForm ? <form onSubmit={handleTypeSubmit} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="text-sm font-black text-gray-900">{editingType ? "Edit Partner Type" : "Tambah Partner Type"}</h2><p className="mt-1 text-xs font-medium text-gray-400">Form master partner type tetap dipakai untuk fallback komisi dasar.</p></div><button type="button" onClick={() => setShowTypeForm(false)} className="rounded-2xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50">Tutup</button></div>{typeFormError ? <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{typeFormError}</div> : null}{typeFormSuccess ? <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{typeFormSuccess}</div> : null}<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"><input value={typeForm.code} onChange={(event) => setTypeForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} disabled={Boolean(editingType)} placeholder="Code partner type" className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold uppercase outline-none focus:border-[#C92C1E] disabled:bg-gray-50" /><input value={typeForm.name} onChange={(event) => setTypeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nama partner type" className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /><select value={typeForm.commissionMode} onChange={(event) => setTypeForm((current) => ({ ...current, commissionMode: event.target.value as "PERCENTAGE" | "FIXED" }))} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]"><option value="PERCENTAGE">PERCENTAGE</option><option value="FIXED">FIXED</option></select><input value={typeForm.commissionValue} onChange={(event) => setTypeForm((current) => ({ ...current, commissionValue: event.target.value }))} placeholder={typeForm.commissionMode === "PERCENTAGE" ? "Contoh: 5.00" : "Contoh: 150000"} className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /><textarea value={typeForm.description} onChange={(event) => setTypeForm((current) => ({ ...current, description: event.target.value }))} rows={4} placeholder="Deskripsi partner type" className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E] md:col-span-2" /></div><div className="mt-4 flex justify-end"><button type="submit" disabled={savingType} className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-red-300">{savingType ? "Menyimpan..." : editingType ? "Simpan Perubahan" : "Tambah Partner Type"}</button></div></form> : <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-400">Pilih tambah atau edit jenis mitra untuk membuka form master.</div>}

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black text-gray-900">Tabel Rule Komisi</h2><p className="mt-1 text-xs font-medium text-gray-400">Aturan komisi per paket yang aktif dan nonaktif untuk jenis mitra terpilih.</p></div><span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-black text-gray-500">{commissionRules.length} Rule</span></div>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500">Paket</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500">Mode</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500">Nilai</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500">Periode</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {commissionRules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm font-bold text-gray-400">
                        Belum ada commission rule untuk partner type ini.
                      </td>
                    </tr>
                  ) : (
                    commissionRules.map((rule) => (
                      <tr key={rule.id}>
                        <td className="px-4 py-4 text-sm font-black text-gray-900">{rule.plan_name || "Semua Plan"}</td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-600">{rule.mode}</td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-600">{rule.value || (rule.tiers && rule.tiers.length > 0 ? `${rule.tiers.length} tier` : "-")}</td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-600">{formatDateTime(rule.effective_from)} - {formatDateTime(rule.effective_to)}</td>
                        <td className="px-4 py-4 text-sm font-bold text-gray-600">{rule.active ? "ACTIVE" : "INACTIVE"}</td>
                        <td className="px-4 py-4">{canDeactivateRules && rule.active ? <RowActionButton icon={PowerOff} tone="deactivate" onClick={() => void handleDeactivateRule(rule)} title="Nonaktifkan" /> : <span className="text-xs font-bold text-gray-300">-</span>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 space-y-2">
              {commissionRules.filter((rule) => rule.tiers && rule.tiers.length > 0).map((rule) => (
                <div key={`tier-${rule.id}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-black text-gray-900">Tier rule #{rule.id} - {rule.plan_name || "Semua Plan"}</p>
                  <div className="mt-3 space-y-2">
                    {rule.tiers?.map((tier) => (
                      <div key={tier.id} className="rounded-2xl border border-white bg-white px-4 py-3 text-xs font-bold text-gray-600">
                        Tier {tier.tier_order}: closing {tier.min_closings} sampai {tier.max_closings || "tak terbatas"}  {tier.mode}  {tier.value}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}



