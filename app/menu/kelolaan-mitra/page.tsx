"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import {
  createPartner,
  createPartnerType,
  createPartnerTypeCommissionRule,
  deactivatePartner,
  deactivatePartnerTypeCommissionRule,
  getCatalogPackages,
  getCatalogPlans,
  getPartnerType,
  getProfile,
  listPartners,
  listPartnerTypeCommissionRules,
  listPartnerTypes,
  updatePartner,
  updatePartnerType,
  type CatalogPackage,
  type CatalogPlan,
  type PartnerCommissionRuleItem,
  type PartnerCommissionTierItem,
  type PartnerItem,
  type PartnerTypeItem,
} from "@/app/lib/api";

type TableMode = "PARTNER_TYPES" | "ACTIVE_PARTNERS" | "INACTIVE_PARTNERS";

type PartnerFormState = {
  partnerTypeId: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  bankAccount: string;
  status: "ACTIVE" | "INACTIVE";
};

type TypeFormState = {
  code: string;
  name: string;
  commissionMode: "PERCENTAGE" | "FIXED";
  commissionValue: string;
  description: string;
};

type RuleFormState = {
  packageId: string;
  mode: "PERCENTAGE" | "FIXED" | "TIER";
  value: string;
  effectiveFrom: string;
  effectiveTo: string;
};

type RuleTierFormState = {
  tierOrder: string;
  minClosings: string;
  maxClosings: string;
  mode: "PERCENTAGE" | "FIXED";
  value: string;
};

const PAGE_SIZE = 20;

const EMPTY_PARTNER_FORM: PartnerFormState = {
  partnerTypeId: "",
  code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  bankAccount: "",
  status: "ACTIVE",
};

const EMPTY_TYPE_FORM: TypeFormState = {
  code: "",
  name: "",
  commissionMode: "PERCENTAGE",
  commissionValue: "",
  description: "",
};

function createEmptyRuleForm(): RuleFormState {
  return {
    packageId: "",
    mode: "PERCENTAGE",
    value: "",
    effectiveFrom: "",
    effectiveTo: "",
  };
}

function createEmptyRuleTier(overrides: Partial<RuleTierFormState> = {}): RuleTierFormState {
  return {
    tierOrder: "1",
    minClosings: "1",
    maxClosings: "",
    mode: "PERCENTAGE",
    value: "",
    ...overrides,
  };
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

function formatDateOnly(value?: string | null) {
  if (!value) return "Tanpa batas";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }
  return formatDateTime(value);
}

function formatMoney(value?: string | number | null) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatFlatCommission(partnerType?: PartnerTypeItem | null) {
  if (!partnerType) return "-";
  const value = Number(partnerType.commission_value || 0);
  return partnerType.commission_mode === "PERCENTAGE" ? `${value}%` : formatMoney(value);
}

function formatRuleValue(mode: "PERCENTAGE" | "FIXED" | "TIER", value?: string | null) {
  if (mode === "TIER") return "Bertingkat";
  if (!value) return "-";
  return mode === "PERCENTAGE" ? `${Number(value)}%` : formatMoney(value);
}

function formatTierRange(tier: Pick<PartnerCommissionTierItem, "min_closings" | "max_closings">) {
  return tier.max_closings ? `${tier.min_closings} - ${tier.max_closings} closing` : `>= ${tier.min_closings} closing`;
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
    <div className="fixed inset-0 z-50 bg-slate-950/70" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center overflow-y-auto p-4 md:p-6">
        <div
          className="w-full max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#fff_0%,#fff8f5_55%,#fee2e2_100%)] px-5 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">Kelolaan Mitra</p>
                <h2 className="mt-2 text-lg font-black text-slate-950 md:text-xl">{title}</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-500 transition hover:bg-white"
              >
                Tutup
              </button>
            </div>
          </div>
          <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-5 md:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function KelolaanMitraPage() {
  usePageTitle("Mitra");
  const [currentRole, setCurrentRole] = useState("");
  const [tableMode, setTableMode] = useState<TableMode>("ACTIVE_PARTNERS");
  const [partnerTypes, setPartnerTypes] = useState<PartnerTypeItem[]>([]);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [packages, setPackages] = useState<CatalogPackage[]>([]);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [selectedType, setSelectedType] = useState<PartnerTypeItem | null>(null);
  const [commissionRules, setCommissionRules] = useState<PartnerCommissionRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTypeDetail, setLoadingTypeDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [pageError, setPageError] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [typeSearch, setTypeSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(null);
  const [editingType, setEditingType] = useState<PartnerTypeItem | null>(null);
  const [partnerForm, setPartnerForm] = useState<PartnerFormState>(EMPTY_PARTNER_FORM);
  const [typeForm, setTypeForm] = useState<TypeFormState>(EMPTY_TYPE_FORM);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(createEmptyRuleForm());
  const [ruleTiers, setRuleTiers] = useState<RuleTierFormState[]>([createEmptyRuleTier()]);
  const [partnerFormError, setPartnerFormError] = useState("");
  const [typeFormError, setTypeFormError] = useState("");
  const [ruleFormError, setRuleFormError] = useState("");

  const isSales = currentRole === "SALES";
  const isAdmin = currentRole === "" || currentRole === "ADMIN";
  const canManageTypes = currentRole === "" || currentRole === "ADMIN" || currentRole === "SUPERVISOR";

  useEffect(() => {
    if (!showPartnerModal && !showTypeModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showPartnerModal, showTypeModal]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const [profileResult, typesResult, packagesResult, plansResult] = await Promise.allSettled([
          getProfile(),
          listPartnerTypes(),
          getCatalogPackages(),
          getCatalogPlans(),
        ]);

        if (cancelled) return;

        setCurrentRole(profileResult.status === "fulfilled" ? profileResult.value.role || "" : "");
        setPartnerTypes(typesResult.status === "fulfilled" ? typesResult.value.items || [] : []);
        setPackages(packagesResult.status === "fulfilled" ? packagesResult.value || [] : []);
        setPlans(plansResult.status === "fulfilled" ? plansResult.value || [] : []);
      } catch {
        if (!cancelled) setCurrentRole("");
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPartners = async () => {
      setLoading(true);
      setPageError("");
      try {
        const result = await listPartners({
          search: appliedSearch,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        });
        if (cancelled) return;
        setPartners(result.items || []);
      } catch (error) {
        if (!cancelled) {
          setPageError(getErrorMessage(error));
          setPartners([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadPartners();

    return () => {
      cancelled = true;
    };
  }, [appliedSearch, page]);

  const filteredPartners = useMemo(
    () => partners.filter((partner) => (typeFilter === "ALL" ? true : partner.partner_type.code === typeFilter)),
    [partners, typeFilter],
  );

  const activePartners = useMemo(
    () => filteredPartners.filter((partner) => partner.status === "ACTIVE"),
    [filteredPartners],
  );

  const inactivePartners = useMemo(
    () => filteredPartners.filter((partner) => partner.status === "INACTIVE"),
    [filteredPartners],
  );

  const filteredPartnerTypes = useMemo(() => {
    const keyword = typeSearch.trim().toLowerCase();
    if (!keyword) return partnerTypes;
    return partnerTypes.filter((item) =>
      [item.code, item.name, item.description || "", item.commission_mode, item.commission_value]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [partnerTypes, typeSearch]);

  const selectedPackagePlans = useMemo(() => {
    if (!ruleForm.packageId) return plans;
    return plans.filter((plan) => plan.package?.id === Number(ruleForm.packageId));
  }, [plans, ruleForm.packageId]);

  const tableMeta = useMemo(() => {
    if (tableMode === "PARTNER_TYPES") {
      return {
        title: "Jenis Mitra",
        description: "Kelola master jenis mitra dan rule komisi per paket dalam modal yang sama.",
      };
    }
    if (tableMode === "ACTIVE_PARTNERS") {
      return {
        title: "Mitra Aktif",
        description: "Pantau mitra yang masih berjalan dan buka action sesuai role pengguna.",
      };
    }
    return {
      title: "Mitra Non Aktif",
      description: "Data soft delete tetap tersimpan dan bisa dipulihkan kapan saja.",
    };
  }, [tableMode]);

  const loadTypeDetail = async (typeId: number) => {
    setLoadingTypeDetail(true);
    try {
      const [detailResult, rulesResult] = await Promise.all([
        getPartnerType(typeId),
        listPartnerTypeCommissionRules(typeId),
      ]);
      setSelectedType(detailResult);
      setCommissionRules(Array.isArray(rulesResult.items) ? rulesResult.items : []);
    } finally {
      setLoadingTypeDetail(false);
    }
  };

  const refreshPartners = async () => {
    const result = await listPartners({
      search: appliedSearch,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    setPartners(result.items || []);
  };

  const refreshTypes = async (preferredId?: number) => {
    const result = await listPartnerTypes();
    const items = result.items || [];
    setPartnerTypes(items);

    if (preferredId) {
      const matched = items.find((item) => item.id === preferredId) || null;
      setEditingType(matched);
      if (matched) {
        await loadTypeDetail(matched.id);
      }
    }
  };

  const openCreatePartnerModal = () => {
    setEditingPartner(null);
    setPartnerForm(EMPTY_PARTNER_FORM);
    setPartnerFormError("");
    setShowPartnerModal(true);
  };

  const openEditPartnerModal = (partner: PartnerItem) => {
    setEditingPartner(partner);
    setPartnerForm({
      partnerTypeId: String(partner.partner_type.id),
      code: partner.code,
      name: partner.name,
      phone: partner.phone || "",
      email: partner.email || "",
      address: partner.address || "",
      bankAccount: "",
      status: partner.status,
    });
    setPartnerFormError("");
    setShowPartnerModal(true);
  };

  const openCreateTypeModal = () => {
    setEditingType(null);
    setSelectedType(null);
    setCommissionRules([]);
    setTypeForm(EMPTY_TYPE_FORM);
    setRuleForm(createEmptyRuleForm());
    setRuleTiers([createEmptyRuleTier()]);
    setTypeFormError("");
    setRuleFormError("");
    setShowTypeModal(true);
  };

  const openEditTypeModal = async (partnerType: PartnerTypeItem) => {
    setEditingType(partnerType);
    setTypeForm({
      code: partnerType.code,
      name: partnerType.name,
      commissionMode: partnerType.commission_mode,
      commissionValue: partnerType.commission_value,
      description: partnerType.description || "",
    });
    setRuleForm(createEmptyRuleForm());
    setRuleTiers([createEmptyRuleTier()]);
    setTypeFormError("");
    setRuleFormError("");
    setShowTypeModal(true);
    await loadTypeDetail(partnerType.id);
  };

  const handleRuleModeChange = (mode: "PERCENTAGE" | "FIXED" | "TIER") => {
    setRuleForm((current) => ({
      ...current,
      mode,
      value: mode === "TIER" ? "" : current.value,
    }));
    if (mode === "TIER") {
      setRuleTiers((current) => (current.length > 0 ? current : [createEmptyRuleTier()]));
    }
  };

  const addRuleTier = () => {
    setRuleTiers((current) => {
      const lastTier = current[current.length - 1];
      const nextMin = lastTier
        ? String(Number(lastTier.maxClosings || lastTier.minClosings || current.length) + 1)
        : "1";
      return [
        ...current,
        createEmptyRuleTier({
          tierOrder: String(current.length + 1),
          minClosings: nextMin,
        }),
      ];
    });
  };

  const updateRuleTier = (index: number, field: keyof RuleTierFormState, value: string) => {
    setRuleTiers((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const removeRuleTier = (index: number) => {
    setRuleTiers((current) => {
      if (current.length === 1) return [createEmptyRuleTier()];
      return current
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({
          ...item,
          tierOrder: String(itemIndex + 1),
        }));
    });
  };

  const handlePartnerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPartnerFormError("");

    if (!partnerForm.name.trim()) {
      setPartnerFormError("Nama mitra wajib diisi.");
      return;
    }

    if (!editingPartner && !partnerForm.partnerTypeId) {
      setPartnerFormError("Jenis mitra wajib dipilih.");
      return;
    }

    if (!editingPartner && !partnerForm.code.trim()) {
      setPartnerFormError("Code mitra wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      if (editingPartner) {
        await updatePartner(editingPartner.id, {
          name: partnerForm.name.trim(),
          phone: partnerForm.phone.trim() || undefined,
          email: partnerForm.email.trim() || undefined,
          address: partnerForm.address.trim() || undefined,
          bank_account: partnerForm.bankAccount.trim() || undefined,
          status: partnerForm.status,
        });
      } else {
        await createPartner({
          partner_type_id: Number(partnerForm.partnerTypeId),
          code: partnerForm.code.trim().toUpperCase(),
          name: partnerForm.name.trim(),
          phone: partnerForm.phone.trim() || undefined,
          email: partnerForm.email.trim() || undefined,
          address: partnerForm.address.trim() || undefined,
          bank_account: partnerForm.bankAccount.trim() || undefined,
          status: partnerForm.status,
        });
      }

      setShowPartnerModal(false);
      setPartnerForm(EMPTY_PARTNER_FORM);
      await refreshPartners();
    } catch (error) {
      setPartnerFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleTypeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTypeFormError("");

    if (!typeForm.name.trim()) {
      setTypeFormError("Nama jenis mitra wajib diisi.");
      return;
    }

    if (!editingType && !typeForm.code.trim()) {
      setTypeFormError("Code jenis mitra wajib diisi.");
      return;
    }

    if (!typeForm.commissionValue.trim()) {
      setTypeFormError("Nilai komisi dasar wajib diisi.");
      return;
    }

    setSavingType(true);
    try {
      if (editingType) {
        await updatePartnerType(editingType.id, {
          name: typeForm.name.trim(),
          commission_mode: typeForm.commissionMode,
          commission_value: typeForm.commissionValue.trim(),
          description: typeForm.description.trim() || undefined,
        });
        await refreshTypes(editingType.id);
      } else {
        const created = await createPartnerType({
          code: typeForm.code.trim().toUpperCase(),
          name: typeForm.name.trim(),
          commission_mode: typeForm.commissionMode,
          commission_value: typeForm.commissionValue.trim(),
          description: typeForm.description.trim() || undefined,
        });
        setEditingType(created);
        await refreshTypes(created.id);
      }
    } catch (error) {
      setTypeFormError(getErrorMessage(error));
    } finally {
      setSavingType(false);
    }
  };

  const handleRuleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRuleFormError("");

    const typeId = editingType?.id || selectedType?.id;
    if (!typeId) {
      setRuleFormError("Simpan jenis mitra terlebih dahulu.");
      return;
    }

    if (!ruleForm.effectiveFrom) {
      setRuleFormError("Tanggal effective from wajib diisi.");
      return;
    }

    if (ruleForm.effectiveTo && ruleForm.effectiveTo < ruleForm.effectiveFrom) {
      setRuleFormError("Tanggal effective to tidak boleh lebih awal dari effective from.");
      return;
    }

    if (ruleForm.mode === "TIER") {
      if (ruleTiers.length === 0) {
        setRuleFormError("Tambahkan minimal satu tier komisi.");
        return;
      }

      const invalidTier = ruleTiers.find((tier) => {
        if (!tier.tierOrder || !tier.minClosings || !tier.value.trim()) return true;
        if (tier.maxClosings && Number(tier.maxClosings) < Number(tier.minClosings)) return true;
        return false;
      });

      if (invalidTier) {
        setRuleFormError("Semua field tier wajib valid, dan max closing tidak boleh lebih kecil dari min closing.");
        return;
      }
    } else if (!ruleForm.value.trim()) {
      setRuleFormError("Nilai komisi rule wajib diisi.");
      return;
    }

    setSavingRule(true);
    try {
      await createPartnerTypeCommissionRule(typeId, {
        package_id: ruleForm.packageId ? Number(ruleForm.packageId) : undefined,
        mode: ruleForm.mode,
        value: ruleForm.mode === "TIER" ? undefined : ruleForm.value.trim(),
        effective_from: ruleForm.effectiveFrom,
        effective_to: ruleForm.effectiveTo || undefined,
        tiers:
          ruleForm.mode === "TIER"
            ? ruleTiers.map((tier, index) => ({
                tier_order: Number(tier.tierOrder || index + 1),
                min_closings: Number(tier.minClosings),
                max_closings: tier.maxClosings ? Number(tier.maxClosings) : undefined,
                mode: tier.mode,
                value: tier.value.trim(),
              }))
            : undefined,
      });

      setRuleForm(createEmptyRuleForm());
      setRuleTiers([createEmptyRuleTier()]);
      await loadTypeDetail(typeId);
    } catch (error) {
      setRuleFormError(getErrorMessage(error));
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeactivatePartner = async (partner: PartnerItem) => {
    if (!window.confirm(`Nonaktifkan mitra ${partner.name}?`)) return;
    setSaving(true);
    try {
      await deactivatePartner(partner.id);
      await refreshPartners();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleRestorePartner = async (partner: PartnerItem) => {
    if (!window.confirm(`Pulihkan mitra ${partner.name}?`)) return;
    setSaving(true);
    try {
      await updatePartner(partner.id, { status: "ACTIVE" });
      await refreshPartners();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateRule = async (rule: PartnerCommissionRuleItem) => {
    const typeId = editingType?.id || selectedType?.id;
    if (!typeId || !window.confirm(`Nonaktifkan rule #${rule.id}?`)) return;
    setSavingRule(true);
    try {
      await deactivatePartnerTypeCommissionRule(typeId, rule.id);
      await loadTypeDetail(typeId);
    } catch (error) {
      setRuleFormError(getErrorMessage(error));
    } finally {
      setSavingRule(false);
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(searchDraft.trim());
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#C92C1E]">Mitra</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Manajemen Mitra</h1>
            <p className="mt-1 text-sm text-gray-500">
              Semua pengelolaan jenis mitra, mitra aktif, dan mitra nonaktif berjalan pada basis API backend terbaru.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            {canManageTypes ? <button type="button" onClick={openCreateTypeModal} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 shadow-sm">+ Tambah Jenis Mitra</button> : null}
            {isAdmin ? <button type="button" onClick={openCreatePartnerModal} disabled={partnerTypes.length === 0} className="rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-red-700 shadow-sm shadow-red-200 disabled:cursor-not-allowed disabled:bg-red-300">+ Tambah Mitra</button> : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-gradient-to-br from-[#C92C1E] to-[#A82216] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">Total Mitra</p>
            <h2 className="text-3xl font-black">{partners.length}</h2>
          </div>
          <svg className="absolute -bottom-4 -right-4 w-28 h-28 text-white opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.001 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-[#C92C1E] transition-colors">
          <div className="relative z-10">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Mitra Aktif</p>
            <h2 className="text-3xl font-black text-gray-900">{activePartners.length}</h2>
          </div>
          <div className="absolute top-0 right-0 p-5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-[#C92C1E] transition-colors">
          <div className="relative z-10">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Mitra Nonaktif</p>
            <h2 className="text-3xl font-black text-gray-900">{inactivePartners.length}</h2>
          </div>
          <div className="absolute top-0 right-0 p-5">
            <span className="flex h-3 w-3 relative">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Jenis Mitra</p>
          <h2 className="text-2xl font-black text-gray-900">{partnerTypes.length}</h2>
          <p className="mt-1 text-xs font-medium text-gray-400">Master yang dapat dipakai untuk onboarding mitra baru.</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Paket Tersedia</p>
          <h2 className="text-2xl font-black text-gray-900">{packages.length}</h2>
          <p className="mt-1 text-xs font-medium text-gray-400">Rule komisi bisa diarahkan ke paket tertentu sesuai backend.</p>
        </div>
      </div>

      <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="flex text-sm font-bold">
          {[{ key: "PARTNER_TYPES", label: "Jenis Mitra" }, { key: "ACTIVE_PARTNERS", label: "Mitra Aktif" }, { key: "INACTIVE_PARTNERS", label: "Mitra Non Aktif" }].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTableMode(item.key as TableMode)}
              className={`rounded-lg px-5 py-2.5 transition-all ${
                tableMode === item.key
                  ? "bg-white text-[#C92C1E] shadow-sm"
                  : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
          {tableMode === "PARTNER_TYPES" ? (
            <input
              value={typeSearch}
              onChange={(event) => setTypeSearch(event.target.value)}
              placeholder="Cari code, nama, atau mode komisi jenis mitra"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] min-w-[240px] text-gray-700"
            />
          ) : (
            <form onSubmit={handleSearch} className="flex flex-wrap gap-2 items-center">
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Cari nama atau code mitra"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] min-w-[200px] text-gray-700"
              />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] text-gray-700"
              >
                <option value="ALL">Semua Type</option>
                {partnerTypes.map((item) => (
                  <option key={item.id} value={item.code}>{item.code}</option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-[#C92C1E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Cari
              </button>
            </form>
          )}
        </div>

        {pageError ? (
          <div className="mx-4 mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{pageError}</div>
        ) : null}

        <div className="overflow-x-auto">
          {tableMode === "PARTNER_TYPES" ? (
            <table className="w-full min-w-[820px] text-left text-sm text-gray-600">
              <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-y border-gray-200">
                <tr>
                  <th className="px-4 py-4 font-bold">Code</th>
                  <th className="px-4 py-4 font-bold">Jenis Mitra</th>
                  <th className="px-4 py-4 font-bold">Komisi Dasar</th>
                  <th className="px-4 py-4 font-bold">Deskripsi</th>
                  <th className="px-4 py-4 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredPartnerTypes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Jenis mitra tidak ditemukan.</td>
                  </tr>
                ) : (
                  filteredPartnerTypes.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 align-top font-medium text-gray-900">{item.code}</td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="mt-1 text-xs text-gray-400">Mode dasar {item.commission_mode}</p>
                      </td>
                      <td className="px-4 py-4 align-top">{formatFlatCommission(item)}</td>
                      <td className="px-4 py-4 align-top">{item.description || "Belum ada deskripsi."}</td>
                      <td className="px-4 py-4 align-top text-center">
                        {canManageTypes ? (
                          <button
                            type="button"
                            onClick={() => void openEditTypeModal(item)}
                            className="rounded-lg bg-orange-50 p-2 text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-700"
                            title="Kelola Jenis Mitra"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : tableMode === "ACTIVE_PARTNERS" ? (
            <table className="w-full min-w-[980px] text-left text-sm text-gray-600">
              <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-y border-gray-200">
                <tr>
                  <th className="px-4 py-4 font-bold">Mitra</th>
                  <th className="px-4 py-4 font-bold">Type</th>
                  <th className="px-4 py-4 font-bold">Kontak</th>
                  <th className="px-4 py-4 font-bold">Komisi Dasar</th>
                  <th className="px-4 py-4 font-bold">Updated</th>
                  <th className="px-4 py-4 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      <div className="flex justify-center items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-[#C92C1E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memuat data mitra...
                      </div>
                    </td>
                  </tr>
                ) : activePartners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">Tidak ada mitra aktif.</td>
                  </tr>
                ) : (
                  activePartners.map((partner) => (
                    <tr key={partner.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900">{partner.name}</p>
                        <p className="mt-1 text-xs text-gray-400">{partner.code}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {partner.partner_type.name}
                        <span className="mt-1 block text-xs text-gray-400">{partner.partner_type.code}</span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {partner.phone || "-"}
                        <span className="mt-1 block text-xs text-gray-400">{partner.email || "-"}</span>
                      </td>
                      <td className="px-4 py-4 align-top">{formatFlatCommission(partner.partner_type)}</td>
                      <td className="px-4 py-4 align-top">{formatDateTime(partner.updated_at)}</td>
                      <td className="px-4 py-4 align-top text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={isSales ? `/menu/kelolaan-mitra/detail?id=${partner.id}&tab=interaction` : `/menu/kelolaan-mitra/detail?id=${partner.id}`}
                            className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                            title={isSales ? "Interaksi Mitra" : "Detail Mitra"}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => openEditPartnerModal(partner)}
                              className="rounded-lg bg-orange-50 p-2 text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-700"
                              title="Edit Mitra"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          ) : null}
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => void handleDeactivatePartner(partner)}
                              disabled={saving}
                              className="rounded-lg bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Nonaktifkan Mitra"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[820px] text-left text-sm text-gray-600">
              <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-y border-gray-200">
                <tr>
                  <th className="px-4 py-4 font-bold">Mitra</th>
                  <th className="px-4 py-4 font-bold">Type</th>
                  <th className="px-4 py-4 font-bold">Kontak</th>
                  <th className="px-4 py-4 font-bold">Updated</th>
                  <th className="px-4 py-4 font-bold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Memuat data mitra nonaktif...</td>
                  </tr>
                ) : inactivePartners.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Tidak ada mitra nonaktif.</td>
                  </tr>
                ) : (
                  inactivePartners.map((partner) => (
                    <tr key={partner.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900">{partner.name}</p>
                        <p className="mt-1 text-xs text-gray-400">{partner.code}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {partner.partner_type.name}
                        <span className="mt-1 block text-xs text-gray-400">{partner.partner_type.code}</span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {partner.phone || "-"}
                        <span className="mt-1 block text-xs text-gray-400">{partner.email || "-"}</span>
                      </td>
                      <td className="px-4 py-4 align-top">{formatDateTime(partner.updated_at)}</td>
                      <td className="px-4 py-4 align-top text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/menu/kelolaan-mitra/detail?id=${partner.id}`}
                            className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                            title="Detail Mitra"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => void handleRestorePartner(partner)}
                              disabled={saving}
                              className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Pulihkan Mitra"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {tableMode !== "PARTNER_TYPES" ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 p-4">
            <span className="text-xs text-gray-500">Halaman {page}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                disabled={partners.length < PAGE_SIZE}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <ModalShell open={showPartnerModal} title={editingPartner ? "Edit Mitra" : "Tambah Mitra"} subtitle="Form mitra tetap memakai schema backend terbaru, termasuk soft delete dan update status." onClose={() => setShowPartnerModal(false)}>
        <form onSubmit={handlePartnerSubmit} className="space-y-5">
          {partnerFormError ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{partnerFormError}</div> : null}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Identitas</p>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {!editingPartner ? <label className="space-y-2 md:col-span-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Jenis Mitra</span><select value={partnerForm.partnerTypeId} onChange={(event) => setPartnerForm((current) => ({ ...current, partnerTypeId: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]"><option value="">Pilih jenis mitra</option>{partnerTypes.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}</select></label> : <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-slate-900 md:col-span-2">{editingPartner.partner_type.name}<span className="mt-1 block text-[11px] text-slate-400">{editingPartner.partner_type.code}</span></div>}
                {!editingPartner ? <label className="space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Code</span><input value={partnerForm.code} onChange={(event) => setPartnerForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="Code mitra" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold uppercase outline-none focus:border-[#C92C1E]" /></label> : null}
                <label className="space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Nama Mitra</span><input value={partnerForm.name} onChange={(event) => setPartnerForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nama mitra" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /></label>
                <label className="space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Status</span><select value={partnerForm.status} onChange={(event) => setPartnerForm((current) => ({ ...current, status: event.target.value as "ACTIVE" | "INACTIVE" }))} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></label>
              </div>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Kontak Mitra</p>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Telepon</span><input value={partnerForm.phone} onChange={(event) => setPartnerForm((current) => ({ ...current, phone: event.target.value }))} placeholder="No. telepon" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /></label>
                <label className="space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Email</span><input value={partnerForm.email} onChange={(event) => setPartnerForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /></label>
                <label className="space-y-2 md:col-span-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Alamat</span><textarea value={partnerForm.address} onChange={(event) => setPartnerForm((current) => ({ ...current, address: event.target.value }))} rows={4} placeholder="Alamat mitra" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /></label>
                <label className="space-y-2 md:col-span-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Rekening</span><input value={partnerForm.bankAccount} onChange={(event) => setPartnerForm((current) => ({ ...current, bankAccount: event.target.value }))} placeholder="Nomor rekening" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /></label>
              </div>
            </div>
          </div>
          <div className="flex justify-end"><button type="submit" disabled={saving} className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-red-300">{saving ? "Menyimpan..." : editingPartner ? "Simpan Perubahan" : "Tambah Mitra"}</button></div>
        </form>
      </ModalShell>

      <ModalShell open={showTypeModal} title={editingType ? "Edit Jenis Mitra" : "Tambah Jenis Mitra"} subtitle="Atur komisi dasar jenis mitra dan tambahkan rule komisi aktif per paket dari satu modal yang sama." onClose={() => setShowTypeModal(false)}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_1.35fr]">
          <form onSubmit={handleTypeSubmit} className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            {typeFormError ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{typeFormError}</div> : null}
            <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Master Jenis Mitra</p><p className="mt-2 text-sm font-medium leading-6 text-slate-500">Komisi dasar ini menjadi fallback ketika tidak ada rule aktif yang lebih spesifik.</p></div>
            <label className="block space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Code</span><input value={typeForm.code} onChange={(event) => setTypeForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} disabled={Boolean(editingType)} placeholder="Code jenis mitra" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold uppercase outline-none focus:border-[#C92C1E] disabled:bg-gray-50" /></label>
            <label className="block space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Nama Jenis Mitra</span><input value={typeForm.name} onChange={(event) => setTypeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nama jenis mitra" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /></label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="block space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Mode Komisi Dasar</span><select value={typeForm.commissionMode} onChange={(event) => setTypeForm((current) => ({ ...current, commissionMode: event.target.value as "PERCENTAGE" | "FIXED" }))} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]"><option value="PERCENTAGE">PERCENTAGE</option><option value="FIXED">FIXED</option></select></label><label className="block space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Nilai Komisi Dasar</span><input value={typeForm.commissionValue} onChange={(event) => setTypeForm((current) => ({ ...current, commissionValue: event.target.value }))} placeholder="Masukkan nilai" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /></label></div>
            <label className="block space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Deskripsi</span><textarea value={typeForm.description} onChange={(event) => setTypeForm((current) => ({ ...current, description: event.target.value }))} rows={5} placeholder="Deskripsi singkat jenis mitra" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /></label>
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">Preview komisi dasar: {typeForm.commissionMode === "PERCENTAGE" ? `${typeForm.commissionValue || 0}%` : formatMoney(typeForm.commissionValue || 0)}</div>
            <div className="flex justify-end"><button type="submit" disabled={savingType} className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-red-300">{savingType ? "Menyimpan..." : editingType ? "Simpan Perubahan" : "Simpan Jenis Mitra"}</button></div>
          </form>
          <div className="space-y-5">
            <form onSubmit={handleRuleSubmit} className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              {ruleFormError ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{ruleFormError}</div> : null}
              <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Rule Komisi per Paket</p><p className="mt-2 text-sm font-medium leading-6 text-slate-500">Backend terbaru mendukung rule spesifik per paket dengan mode persentase, fixed, atau tier bertingkat.</p></div>
              <label className="block space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Paket</span><select value={ruleForm.packageId} onChange={(event) => setRuleForm((current) => ({ ...current, packageId: event.target.value }))} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]"><option value="">Semua Paket</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500">{selectedPackagePlans.length === 0 ? "Belum ada plan aktif untuk paket ini atau rule berlaku untuk semua paket." : `Plan aktif terkait paket ini: ${selectedPackagePlans.map((plan) => `${plan.name} (${plan.tenure_months} bln)`).join(", ")}`}</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Mode Rule</span><select value={ruleForm.mode} onChange={(event) => handleRuleModeChange(event.target.value as "PERCENTAGE" | "FIXED" | "TIER")} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]"><option value="PERCENTAGE">PERCENTAGE</option><option value="FIXED">FIXED</option><option value="TIER">TIER</option></select></label>
                {ruleForm.mode !== "TIER" ? <label className="block space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Nilai Rule</span><input value={ruleForm.value} onChange={(event) => setRuleForm((current) => ({ ...current, value: event.target.value }))} placeholder="Nilai komisi rule" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /></label> : <div className="rounded-2xl border border-dashed border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-[#C92C1E]">Mode TIER memakai daftar tingkatan di bawah, bukan satu nilai flat.</div>}
              </div>
              {ruleForm.mode === "TIER" ? <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-slate-900">Tier Komisi</p><p className="mt-1 text-[11px] font-bold text-slate-500">Atur rentang closing dan nilai komisi tiap level.</p></div><button type="button" onClick={addRuleTier} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600">+ Tier</button></div><div className="space-y-3">{ruleTiers.map((tier, index) => <div key={`${index}-${tier.tierOrder}`} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="grid grid-cols-1 gap-3 md:grid-cols-5"><label className="block space-y-2"><span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Urutan</span><input value={tier.tierOrder} onChange={(event) => updateRuleTier(index, "tierOrder", event.target.value)} className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]" /></label><label className="block space-y-2"><span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Min Closing</span><input value={tier.minClosings} onChange={(event) => updateRuleTier(index, "minClosings", event.target.value)} className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]" /></label><label className="block space-y-2"><span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Max Closing</span><input value={tier.maxClosings} onChange={(event) => updateRuleTier(index, "maxClosings", event.target.value)} placeholder="Opsional" className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]" /></label><label className="block space-y-2"><span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Mode</span><select value={tier.mode} onChange={(event) => updateRuleTier(index, "mode", event.target.value)} className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"><option value="PERCENTAGE">PERCENTAGE</option><option value="FIXED">FIXED</option></select></label><label className="block space-y-2"><span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Nilai</span><input value={tier.value} onChange={(event) => updateRuleTier(index, "value", event.target.value)} className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]" /></label></div><div className="mt-3 flex items-center justify-between gap-3"><p className="text-[11px] font-bold text-slate-400">Preview: {tier.maxClosings ? `${tier.minClosings} - ${tier.maxClosings}` : `>= ${tier.minClosings}`} closing, {tier.mode === "PERCENTAGE" ? `${tier.value || 0}%` : formatMoney(tier.value || 0)}</p><button type="button" onClick={() => removeRuleTier(index)} className="rounded-xl border border-gray-200 px-3 py-2 text-[10px] font-black text-gray-600">Hapus Tier</button></div></div>)}</div></div> : null}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><label className="block space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Effective From</span><input type="date" value={ruleForm.effectiveFrom} onChange={(event) => setRuleForm((current) => ({ ...current, effectiveFrom: event.target.value }))} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /></label><label className="block space-y-2"><span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Effective To</span><input type="date" value={ruleForm.effectiveTo} onChange={(event) => setRuleForm((current) => ({ ...current, effectiveTo: event.target.value }))} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#C92C1E]" /></label></div>
              <div className="flex justify-end"><button type="submit" disabled={savingRule || !(editingType || selectedType)} className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-red-300">{savingRule ? "Menyimpan Rule..." : "Simpan Commission Rule"}</button></div>
            </form>
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Rule Tersimpan</p><h3 className="mt-2 text-sm font-black text-slate-900">{selectedType?.name || editingType?.name || "Jenis mitra belum dipilih"}</h3></div>{selectedType ? <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-black text-[#C92C1E]">{selectedType.code}</span> : null}</div>
              <div className="mt-4 space-y-3">{loadingTypeDetail ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">Memuat detail rule komisi...</div> : commissionRules.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">Belum ada rule komisi untuk jenis mitra ini.</div> : commissionRules.map((rule) => <div key={rule.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black text-slate-900">{rule.package_name || "Semua Paket"}</p><span className={`rounded-full px-3 py-1 text-[10px] font-black ${rule.active ? "border border-green-100 bg-green-50 text-green-700" : "border border-gray-200 bg-white text-gray-500"}`}>{rule.active ? "ACTIVE" : "INACTIVE"}</span></div><p className="mt-1 text-[11px] font-bold text-slate-400">Mode {rule.mode}</p><p className="mt-1 text-[11px] font-bold text-slate-400">Berlaku {formatDateOnly(rule.effective_from)} sampai {formatDateOnly(rule.effective_to)}</p>{rule.mode !== "TIER" ? <p className="mt-2 text-sm font-bold text-slate-600">Nilai: {formatRuleValue(rule.mode, rule.value)}</p> : null}</div>{rule.active ? <button type="button" onClick={() => void handleDeactivateRule(rule)} className="rounded-2xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-600 transition hover:bg-white">Nonaktifkan</button> : null}</div>{rule.mode === "TIER" && rule.tiers && rule.tiers.length > 0 ? <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">{rule.tiers.map((tier) => <div key={tier.id} className="rounded-2xl border border-white bg-white px-4 py-3"><p className="text-xs font-black text-slate-900">Tier {tier.tier_order}</p><p className="mt-1 text-[11px] font-bold text-slate-400">{formatTierRange(tier)}</p><p className="mt-2 text-sm font-bold text-slate-600">{formatRuleValue(tier.mode, tier.value)}</p></div>)}</div> : null}</div>)}</div>
            </section>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}

