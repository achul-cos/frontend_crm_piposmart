"use client";

import { Trash2, X } from "lucide-react";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { formatPhoneDisplay } from "@/app/lib/phone";
import {
  ViewActionButton,
  EditActionButton,
  ToggleActiveActionButton,
  DeleteActionButton,
  RowActionGroup,
} from "@/app/components/table/RowActionButton";
import {
  createPartner,
  createPartnerType,
  createPartnerTypeCommissionRule,
  deactivatePartner,
  deactivatePartnerTypeCommissionRule,
  deletePartnerType,
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
import AnalyticsTab from "./AnalyticsTab";
import { PartnerActivityBadge } from "@/app/components/PartnerActivityBadge";
import ColumnVisibilityControl from "@/app/components/table/ColumnVisibilityControl";
import TablePaginationFooter from "@/app/components/table/TablePaginationFooter";
import { useFeedback } from "@/app/components/feedback/FeedbackContext";
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";
import ScreenPortal from "@/app/components/ui/ScreenPortal";

function AutocompleteFilter({
  label,
  placeholder,
  value,
  onChange,
  options,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const uniqueOptions = useMemo(() => Array.from(new Set(options.filter(Boolean))), [options]);

  const filteredOptions = uniqueOptions.filter((opt) =>
    opt.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="flex flex-col gap-1.5 w-full relative">
      <span className="text-xs font-semibold text-black">{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
      />
      {isOpen && value && filteredOptions.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {filteredOptions.map((opt, idx) => (
            <li
              key={`${opt}-${idx}`}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className="cursor-pointer px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-red-50 hover:text-[#C92C1E]"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type TableMode =
  | "PARTNER_TYPES"
  | "ACTIVE_PARTNERS"
  | "INACTIVE_PARTNERS"
  | "ANALYTICS";

type PartnerFormState = {
  partnerTypeId: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  province: string;
  city: string;
  district: string;
  sub_district: string;
  bankAccount: string;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
};

type TypeFormState = {
  code: string;
  name: string;
  commissionMode: "PERCENTAGE" | "FIXED";
  commissionValue: string;
  description: string;
};

type RuleFormState = {
  // Sprint 15a â€” commission rule scoped langsung ke plan (bukan package lagi).
  planId: string;
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

type AutoCommissionCategory = "REFERRAL" | "PARTNERSHIP" | "STRATEGIC";



const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400";

const selectClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400";

const textareaClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100";

const EMPTY_PARTNER_FORM: PartnerFormState = {
  partnerTypeId: "",
  code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  province: "",
  city: "",
  district: "",
  sub_district: "",
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

function formatThousandDots(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  const raw = String(val).replace(/\./g, "").trim();
  if (!/^\d+$/.test(raw)) return String(val);
  return Number(raw).toLocaleString("id-ID");
}

function stripThousandDots(val: string | null | undefined): string {
  if (!val) return "";
  return val.replace(/\./g, "").trim();
}

function createEmptyRuleForm(): RuleFormState {
  return {
    planId: "",
    mode: "PERCENTAGE",
    value: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
  };
}

function createEmptyRuleTier(
  overrides: Partial<RuleTierFormState> = {},
): RuleTierFormState {
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

  return partnerType.commission_mode === "PERCENTAGE"
    ? `${value}%`
    : formatMoney(value);
}

function formatRuleValue(
  mode: "PERCENTAGE" | "FIXED" | "TIER",
  value?: string | null,
) {
  if (mode === "TIER") return "Bertingkat";
  if (!value) return "-";

  return mode === "PERCENTAGE" ? `${Number(value)}%` : formatMoney(value);
}

function formatTierRange(
  tier: Pick<PartnerCommissionTierItem, "min_closings" | "max_closings">,
) {
  return tier.max_closings
    ? `${tier.min_closings} - ${tier.max_closings} closing`
    : `>= ${tier.min_closings} closing`;
}

function getAutoCommissionCategory(
  typeIdentifier?: string | null,
): AutoCommissionCategory {
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

  // Default to REFERRAL for all other partner types (e.g. 12 Bulan Basic -> 120.000)
  return "REFERRAL";
}

function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return (
    <ScreenPortal>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm md:p-6" onClick={onClose}>
        <div className="flex min-h-full items-center justify-center">
          <div
            className="app-modal-panel flex w-full max-w-5xl rounded-3xl shadow-2xl transition-all"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-modal-header px-6 py-5 md:px-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C92C1E]">
                    Kelolaan Mitra
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
                  className="app-modal-close flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                  title="Tutup Modal"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="app-modal-body flex-1 min-h-0 space-y-6 p-6 md:p-8">
              {children}
            </div>

            {footer ? <div className="app-modal-footer px-6 py-4 md:px-8">{footer}</div> : null}
          </div>
        </div>
      </div>
    </ScreenPortal>
  );
}

export default function KelolaanMitraPage() {
  usePageTitle("Mitra");

  const { showSuccess, showError, confirm, withLoading } = useFeedback();
  const [currentRole, setCurrentRole] = useState("");
  const [tableMode, setTableMode] = useState<TableMode>("ACTIVE_PARTNERS");
  const [partnerTypes, setPartnerTypes] = useState<PartnerTypeItem[]>([]);
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [packages, setPackages] = useState<CatalogPackage[]>([]);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [selectedType, setSelectedType] = useState<PartnerTypeItem | null>(null);
  const [commissionRules, setCommissionRules] = useState<
    PartnerCommissionRuleItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [loadingTypeDetail, setLoadingTypeDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [savingRule, setSavingRule] = useState(false);

  const [pageError, setPageError] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [filterMitra, setFilterMitra] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterContact, setFilterContact] = useState("");
  const [filterTypeCode, setFilterTypeCode] = useState("");
  const [filterTypeName, setFilterTypeName] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [selectedPartnerTypeIds, setSelectedPartnerTypeIds] = useState<number[]>([]);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [partnerTotal, setPartnerTotal] = useState(0);
  const partnerTotalPages = limit === 0 ? 1 : Math.max(1, Math.ceil(partnerTotal / limit));

  const [isDraggingTypes, setIsDraggingTypes] = useState(false);
  const [dragActionTypes, setDragActionTypes] = useState<"select" | "deselect" | null>(null);

  const [isDraggingPartners, setIsDraggingPartners] = useState(false);
  const [dragActionPartners, setDragActionPartners] = useState<"select" | "deselect" | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDraggingTypes(false);
      setDragActionTypes(null);
      setIsDraggingPartners(false);
      setDragActionPartners(null);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeModalTab, setTypeModalTab] = useState<"detail" | "rules">("detail");
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(null);
  const [editingType, setEditingType] = useState<PartnerTypeItem | null>(null);

  const [partnerForm, setPartnerForm] =
    useState<PartnerFormState>(EMPTY_PARTNER_FORM);
  const [typeForm, setTypeForm] = useState<TypeFormState>(EMPTY_TYPE_FORM);
  const [ruleForm, setRuleForm] =
    useState<RuleFormState>(createEmptyRuleForm());
  const [ruleTiers, setRuleTiers] = useState<RuleTierFormState[]>([
    createEmptyRuleTier(),
  ]);

  const [partnerFormError, setPartnerFormError] = useState("");
  const [typeFormError, setTypeFormError] = useState("");
  const [ruleFormError, setRuleFormError] = useState("");

  const [planMatrixDraft, setPlanMatrixDraft] = useState<
    Record<number, { mode: "FIXED" | "PERCENTAGE"; value: string }>
  >({});

  useEffect(() => {
    if (!plans || plans.length === 0) return;
    const typeIdentifier = selectedType
      ? `${selectedType.code} ${selectedType.name}`
      : editingType
        ? `${editingType.code} ${editingType.name}`
        : `${typeForm.code} ${typeForm.name}`;

    const initialDraft: Record<number, { mode: "FIXED" | "PERCENTAGE"; value: string }> = {};

    plans.forEach((plan) => {
      const activeRule = commissionRules.find(
        (r) => r.active && r.plan_id !== null && r.plan_id !== undefined && Number(r.plan_id) === Number(plan.id),
      );

      if (activeRule) {
        const valStr = activeRule.value || "0";
        initialDraft[plan.id] = {
          mode: activeRule.mode === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
          value: activeRule.mode === "FIXED" ? formatThousandDots(valStr) : valStr,
        };
      } else {
        const presetVal = getPresetCommissionValue(plan, typeIdentifier);
        const defaultMode = (selectedType?.commission_mode || editingType?.commission_mode || typeForm.commissionMode || "FIXED") as "FIXED" | "PERCENTAGE";
        const defaultValue = presetVal
          ? (defaultMode === "FIXED" ? formatThousandDots(presetVal) : presetVal)
          : (defaultMode === "FIXED" ? "100.000" : "10");
        initialDraft[plan.id] = {
          mode: defaultMode,
          value: defaultValue,
        };
      }
    });

    setPlanMatrixDraft(initialDraft);
  }, [plans, commissionRules, selectedType, editingType]);

  const applyPresetToMatrix = (category: "REFERRAL" | "PARTNERSHIP" | "STRATEGIC" | "ZERO") => {
    const newDraft: Record<number, { mode: "FIXED" | "PERCENTAGE"; value: string }> = {};

    plans.forEach((plan) => {
      if (category === "ZERO") {
        newDraft[plan.id] = { mode: "FIXED", value: "0" };
      } else {
        const presetVal = getPresetCommissionValue(plan, category);
        newDraft[plan.id] = {
          mode: "FIXED",
          value: presetVal ? formatThousandDots(presetVal) : "0",
        };
      }
    });

    setPlanMatrixDraft(newDraft);
  };

  const handleDeletePartnerType = async (item: PartnerTypeItem) => {
    const ok = await confirm({
      title: "Hapus Jenis Mitra",
      message: `Hapus jenis mitra "${item.name}" (${item.code})? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;

    try {
      await withLoading(() => deletePartnerType(item.id), {
        label: "Menghapus jenis mitra...",
      });
      setPartnerTypes((prev) => prev.filter((t) => t.id !== item.id));
      showSuccess({
        title: "Jenis mitra dihapus",
        message: `Jenis mitra "${item.name}" berhasil dihapus.`,
      });
    } catch (error) {
      showError({
        title: "Gagal menghapus jenis mitra",
        message: `Sistem gagal menghapus jenis mitra "${item.name}".`,
        cause: "Bisa disebabkan oleh koneksi bermasalah atau jenis mitra ini masih dipakai oleh mitra aktif.",
        solution: "Periksa koneksi Anda dan coba lagi. Jika masih gagal, pastikan tidak ada mitra yang memakai jenis ini.",
        technicalDetails: error instanceof Error ? error.message : String(error),
        onRetry: () => void handleDeletePartnerType(item),
      });
    }
  };

  const handleSaveAllPlanMatrix = async () => {
    const typeId = editingType?.id || selectedType?.id;
    if (!typeId) {
      setRuleFormError("Simpan jenis mitra terlebih dahulu.");
      return;
    }

    setSavingRule(true);
    setRuleFormError("");

    try {
      const payloads = Object.entries(planMatrixDraft).map(([planIdStr, item]) => ({
        plan_id: Number(planIdStr),
        mode: item.mode,
        value: stripThousandDots(item.value) || "0",
        effective_from: new Date().toISOString(),
      }));

      const results = await withLoading(
        () =>
          Promise.allSettled(
            payloads.map((payload) =>
              createPartnerTypeCommissionRule(typeId, payload),
            ),
          ),
        { label: "Menyimpan rule komisi..." },
      );

      const failures = results.filter((r) => r.status === "rejected").length;
      if (failures > 0) {
        setRuleFormError(`Berhasil menyimpan, tetapi ${failures} rule komisi gagal diproses.`);
      } else {
        await loadTypeDetail(typeId);
        showSuccess({
          title: "Rule komisi tersimpan",
          message: `Semua rule komisi per plan untuk jenis mitra "${editingType?.name || selectedType?.name}" berhasil disimpan.`,
        });
      }
    } catch (error) {
      setRuleFormError(getErrorMessage(error));
    } finally {
      setSavingRule(false);
    }
  };

  const isSales = currentRole === "SALES";
  const isAdmin = currentRole === "" || currentRole === "ADMIN";
  // Backend: partner-type CRUD (create/update/delete) is ADMIN-only (canManagePartnerType).
  const canManageTypes = currentRole === "ADMIN";

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
        const [profileResult, typesResult, packagesResult, plansResult] =
          await Promise.allSettled([
            getProfile(),
            listPartnerTypes(),
            getCatalogPackages(),
            getCatalogPlans(),
          ]);

        if (cancelled) return;

        setCurrentRole(
          profileResult.status === "fulfilled"
            ? profileResult.value.role || ""
            : "",
        );
        setPartnerTypes(
          typesResult.status === "fulfilled"
            ? typesResult.value.items || []
            : [],
        );
        setPackages(
          packagesResult.status === "fulfilled"
            ? packagesResult.value || []
            : [],
        );
        setPlans(
          plansResult.status === "fulfilled" ? plansResult.value || [] : [],
        );
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
          limit: limit === 0 ? 0 : limit,
          offset: limit === 0 ? 0 : (page - 1) * limit,
        });

        if (cancelled) return;

        setPartners(result.items || []);
        setPartnerTotal(result.pagination?.total || result.items?.length || 0);
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
  }, [appliedSearch, page, limit]);

  const uniqueMitraNames = useMemo(
    () => Array.from(new Set(partners.map((p) => p.name || p.code).filter(Boolean))),
    [partners]
  );
  const uniqueMitraTypes = useMemo(
    () => Array.from(new Set(partnerTypes.map((t) => t.name || t.code).filter(Boolean))),
    [partnerTypes]
  );
  const uniqueMitraContacts = useMemo(
    () => Array.from(new Set(partners.map((p) => p.phone || p.email).filter((val): val is string => Boolean(val)))),
    [partners]
  );

  const uniqueTypeCodes = useMemo(
    () => Array.from(new Set(partnerTypes.map((t) => t.code).filter(Boolean))),
    [partnerTypes]
  );
  const uniqueTypeNames = useMemo(
    () => Array.from(new Set(partnerTypes.map((t) => t.name).filter(Boolean))),
    [partnerTypes]
  );

  const filteredPartners = useMemo(
    () =>
      partners.filter((partner) => {
        if (typeFilter !== "ALL" && partner.partner_type.code !== typeFilter) {
          return false;
        }
        if (searchDraft) {
          const q = searchDraft.toLowerCase();
          const combinedStr = `${partner.name || ""} ${partner.code || ""} ${partner.email || ""} ${partner.phone || ""}`.toLowerCase();
          if (!combinedStr.includes(q)) return false;
        }
        if (filterMitra) {
          const q = filterMitra.toLowerCase();
          const nameCode = `${partner.name || ""} ${partner.code || ""}`.toLowerCase();
          if (!nameCode.includes(q)) return false;
        }
        if (filterType) {
          const q = filterType.toLowerCase();
          const typeStr = `${partner.partner_type.name || ""} ${partner.partner_type.code || ""}`.toLowerCase();
          if (!typeStr.includes(q)) return false;
        }
        if (filterContact) {
          const q = filterContact.toLowerCase();
          const contactStr = `${partner.phone || ""} ${partner.email || ""}`.toLowerCase();
          if (!contactStr.includes(q)) return false;
        }
        return true;
      }),
    [partners, typeFilter, searchDraft, filterMitra, filterType, filterContact],
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

    return partnerTypes.filter((item) => {
      if (keyword) {
        const combined = [
          item.code,
          item.name,
          item.description || "",
          item.commission_mode,
          item.commission_value,
        ]
          .join(" ")
          .toLowerCase();
        if (!combined.includes(keyword)) return false;
      }
      if (filterTypeCode && !item.code.toLowerCase().includes(filterTypeCode.toLowerCase())) {
        return false;
      }
      if (filterTypeName && !item.name.toLowerCase().includes(filterTypeName.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [partnerTypes, typeSearch, filterTypeCode, filterTypeName]);

  const selectedRulePlan = useMemo(() => {
    if (!ruleForm.planId) return null;
    return plans.find((plan) => plan.id === Number(ruleForm.planId)) || null;
  }, [plans, ruleForm.planId]);

  const getPresetCommissionValue = (
    plan: CatalogPlan | null,
    typeIdentifier?: string | null,
  ): string | null => {
    if (!plan) return null;

    const category = getAutoCommissionCategory(typeIdentifier);
    const pkgNameUpper = (plan.package?.name || "").toUpperCase();
    const planNameUpper = (plan.name || "").toUpperCase();
    const tenure = Number(plan.tenure_months || 0);

    // Auto-fill is strictly for official subscription packages in PDF (12, 18, 24 months)
    if (tenure !== 12 && tenure !== 18 && tenure !== 24) {
      return null;
    }

    if (!category) return null;

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

    return null;
  };

  const buildAutomaticRulesForType = (typeCode: string, typeName: string) => {
    const typeIdentifier = `${typeCode} ${typeName}`.trim();
    const category = getAutoCommissionCategory(typeIdentifier);

    if (!category) {
      return [];
    }

    const effectiveFrom = new Date().toISOString().slice(0, 10);

    return plans
      .map((plan) => {
        const value = getPresetCommissionValue(plan, typeIdentifier);

        if (!value) {
          return null;
        }

        return {
          plan_id: plan.id,
          mode: "FIXED" as const,
          value,
          effective_from: `${effectiveFrom}T00:00:00Z`,
        };
      })
      .filter(
        (
          rule,
        ): rule is {
          plan_id: number;
          mode: "FIXED";
          value: string;
          effective_from: string;
        } => rule !== null,
      );
  };

  const updateRuleValueForTypeAndPlan = (
    typeObj: PartnerTypeItem | null,
    planId: string,
  ) => {
    if (!planId) return;

    const selectedPlanObj = plans.find((p) => String(p.id) === planId) || null;
    const typeIdentifier = typeObj?.code || typeObj?.name || "";
    const presetVal = getPresetCommissionValue(selectedPlanObj, typeIdentifier);

    if (presetVal) {
      setRuleForm((current) => ({
        ...current,
        mode: "FIXED",
        value: formatThousandDots(presetVal),
      }));
    }
  };

  const handlePlanChange = (planId: string) => {
    const selectedPlanObj = plans.find((p) => String(p.id) === planId) || null;
    const typeObj = editingType || selectedType;
    const typeIdentifier =
      typeObj?.code ||
      typeObj?.name ||
      typeForm.code ||
      typeForm.name;

    const presetVal = getPresetCommissionValue(selectedPlanObj, typeIdentifier);

    setRuleForm((current) => ({
      ...current,
      planId,
      mode: presetVal ? "FIXED" : current.mode,
      value: presetVal ? formatThousandDots(presetVal) : current.value,
    }));
  };

  useEffect(() => {
    if (ruleForm.planId) {
      const typeObj = editingType || selectedType;
      updateRuleValueForTypeAndPlan(typeObj, ruleForm.planId);
    }
  }, [editingType, selectedType]);

  const loadTypeDetail = async (typeId: number) => {
    setLoadingTypeDetail(true);

    try {
      const [detailResult, rulesResult] = await Promise.all([
        getPartnerType(typeId),
        listPartnerTypeCommissionRules(typeId),
      ]);

      setSelectedType(detailResult);
      setCommissionRules(
        Array.isArray(rulesResult.items) ? rulesResult.items : [],
      );

      if (ruleForm.planId) {
        updateRuleValueForTypeAndPlan(detailResult, ruleForm.planId);
      }
    } finally {
      setLoadingTypeDetail(false);
    }
  };

  const refreshPartners = async () => {
    const result = await listPartners({
      search: appliedSearch,
      limit: limit === 0 ? 0 : limit,
      offset: limit === 0 ? 0 : (page - 1) * limit,
    });

      setPartners(result.items || []);
      setPartnerTotal(result.pagination?.total || result.items?.length || 0);
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
      province: partner.province || "",
      city: partner.city || "",
      district: partner.district || "",
      sub_district: partner.sub_district || "",
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
    setTypeModalTab("detail");
    setShowTypeModal(true);
  };

  const openEditTypeModal = async (
    partnerType: PartnerTypeItem,
    initialTab: "detail" | "rules" = "detail",
  ) => {
    setEditingType(partnerType);
    setSelectedType(partnerType);
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
    setTypeModalTab(initialTab);
    setShowTypeModal(true);

    await loadTypeDetail(partnerType.id);
  };

  const handleRuleModeChange = (mode: "PERCENTAGE" | "FIXED" | "TIER") => {
    setRuleForm((current) => {
      let newValue = mode === "TIER" ? "" : current.value;

      if (mode === "FIXED") {
        const selectedPlanObj = plans.find((p) => String(p.id) === current.planId) || null;
        const typeIdentifier =
          editingType?.code ||
          selectedType?.code ||
          editingType?.name ||
          selectedType?.name ||
          typeForm.code ||
          typeForm.name;

        const presetVal = getPresetCommissionValue(selectedPlanObj, typeIdentifier);
        if (presetVal) {
          newValue = presetVal;
        } else if (selectedType?.commission_value) {
          newValue = selectedType.commission_value;
        }
      }

      return {
        ...current,
        mode,
        value: newValue,
      };
    });

    if (mode === "TIER") {
      setRuleTiers((current) =>
        current.length > 0 ? current : [createEmptyRuleTier()],
      );
    }
  };

  const addRuleTier = () => {
    setRuleTiers((current) => {
      const lastTier = current[current.length - 1];
      const nextMin = lastTier
        ? String(
            Number(lastTier.maxClosings || lastTier.minClosings || current.length) +
              1,
          )
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

  const updateRuleTier = (
    index: number,
    field: keyof RuleTierFormState,
    value: string,
  ) => {
    setRuleTiers((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
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
          province: partnerForm.province.trim() || undefined,
          city: partnerForm.city.trim() || undefined,
          district: partnerForm.district.trim() || undefined,
          sub_district: partnerForm.sub_district.trim() || undefined,
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

    if (!typeForm.commissionValue.trim()) {
      setTypeFormError("Nilai komisi dasar wajib diisi.");
      return;
    }

    setSavingType(true);

    try {
      const targetTypeId = await withLoading(
        async () => {
          let typeId: number;

          if (editingType) {
            typeId = editingType.id;
            await updatePartnerType(editingType.id, {
              name: typeForm.name.trim(),
              commission_mode: typeForm.commissionMode,
              commission_value: stripThousandDots(typeForm.commissionValue),
              description: typeForm.description.trim() || undefined,
            });
          } else {
            const generatedCode = typeForm.code.trim()
              ? typeForm.code.trim().toUpperCase()
              : "";

            const created = await createPartnerType({
              code: generatedCode,
              name: typeForm.name.trim(),
              commission_mode: typeForm.commissionMode,
              commission_value: stripThousandDots(typeForm.commissionValue),
              description: typeForm.description.trim() || undefined,
            });
            typeId = created.id;
            setEditingType(created);
            setSelectedType(created);
          }

          // Save all plan rules from planMatrixDraft
          if (plans && plans.length > 0 && Object.keys(planMatrixDraft).length > 0) {
            const payloads = Object.entries(planMatrixDraft).map(([planIdStr, item]) => ({
              plan_id: Number(planIdStr),
              mode: item.mode,
              value: stripThousandDots(item.value) || "0",
              effective_from: new Date().toISOString(),
            }));

            await Promise.allSettled(
              payloads.map((payload) =>
                createPartnerTypeCommissionRule(typeId, payload),
              ),
            );
          }

          return typeId;
        },
        { label: "Menyimpan jenis mitra..." },
      );

      await refreshTypes(targetTypeId);
      setShowTypeModal(false);
      showSuccess({
        title: "Jenis mitra tersimpan",
        message: `Jenis mitra ${typeForm.name} dan rule komisi per plan berhasil disimpan.`,
      });
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
      setRuleFormError(
        "Tanggal effective to tidak boleh lebih awal dari effective from.",
      );
      return;
    }

    if (ruleForm.mode === "TIER") {
      if (ruleTiers.length === 0) {
        setRuleFormError("Tambahkan minimal satu tier komisi.");
        return;
      }

      const invalidTier = ruleTiers.find((tier) => {
        if (!tier.tierOrder || !tier.minClosings || !tier.value.trim()) {
          return true;
        }

        if (
          tier.maxClosings &&
          Number(tier.maxClosings) < Number(tier.minClosings)
        ) {
          return true;
        }

        return false;
      });

      if (invalidTier) {
        setRuleFormError(
          "Semua field tier wajib valid, dan max closing tidak boleh lebih kecil dari min closing.",
        );
        return;
      }
    } else if (!ruleForm.value.trim()) {
      setRuleFormError("Nilai komisi rule wajib diisi.");
      return;
    }

    setSavingRule(true);

    const formatIsoDate = (dateStr: string, isEnd = false) => {
      if (!dateStr) return isEnd ? undefined : new Date().toISOString();
      if (dateStr.includes("T")) return dateStr;
      return isEnd ? `${dateStr}T23:59:59Z` : `${dateStr}T00:00:00Z`;
    };

    try {
      await createPartnerTypeCommissionRule(typeId, {
        plan_id: ruleForm.planId
          ? Number(ruleForm.planId)
          : undefined,
        mode: ruleForm.mode,
        value: ruleForm.mode === "TIER" ? undefined : stripThousandDots(ruleForm.value),
        effective_from: formatIsoDate(ruleForm.effectiveFrom) || new Date().toISOString(),
        effective_to: formatIsoDate(ruleForm.effectiveTo, true),
        tiers:
          ruleForm.mode === "TIER"
            ? ruleTiers.map((tier, index) => ({
                tier_order: Number(tier.tierOrder || index + 1),
                min_closings: Number(tier.minClosings),
                max_closings: tier.maxClosings
                  ? Number(tier.maxClosings)
                  : undefined,
                mode: tier.mode,
                value: stripThousandDots(tier.value),
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
    const ok = await confirm({
      title: "Nonaktifkan Mitra",
      message: `Nonaktifkan mitra ${partner.name}? Mitra ini tidak akan bisa dipakai untuk referral baru sampai diaktifkan kembali.`,
      confirmLabel: "Nonaktifkan",
      danger: true,
    });
    if (!ok) return;

    setSaving(true);

    try {
      await withLoading(() => deactivatePartner(partner.id), {
        label: "Menonaktifkan mitra...",
      });
      await refreshPartners();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleRestorePartner = async (partner: PartnerItem) => {
    const ok = await confirm({
      title: "Pulihkan Mitra",
      message: `Pulihkan mitra ${partner.name} menjadi aktif kembali?`,
      confirmLabel: "Pulihkan",
    });
    if (!ok) return;

    setSaving(true);

    try {
      await withLoading(() => updatePartner(partner.id, { status: "ACTIVE" }), {
        label: "Memulihkan mitra...",
      });
      await refreshPartners();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateRule = async (rule: PartnerCommissionRuleItem) => {
    const typeId = editingType?.id || selectedType?.id;

    if (!typeId) return;

    const ok = await confirm({
      title: "Nonaktifkan Rule Komisi",
      message: `Nonaktifkan rule komisi #${rule.id}? Rule ini tidak akan dipakai lagi untuk perhitungan komisi berikutnya.`,
      confirmLabel: "Nonaktifkan",
      danger: true,
    });
    if (!ok) return;

    setSavingRule(true);

    try {
      await withLoading(
        () => deactivatePartnerTypeCommissionRule(typeId, rule.id),
        { label: "Menonaktifkan rule komisi..." },
      );
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
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-[#C92C1E]">Mitra</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Manajemen Mitra
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Semua pengelolaan jenis mitra, mitra aktif, dan mitra nonaktif
              berjalan pada basis API backend terbaru.
            </p>
          </div>
        </div>
      </div>

      <QuickInfoCardGrid columns={3}>
        <QuickInfoCard
          label="Total Mitra"
          value={partners.length}
          description="Seluruh mitra yang tercatat di modul ini."
          tone="accent"
          silhouette="people"
        />
        <QuickInfoCard
          label="Mitra Aktif"
          value={activePartners.length}
          description="Mitra yang sedang aktif untuk operasional."
          tone="emerald"
        />
        <QuickInfoCard
          label="Mitra Nonaktif"
          value={inactivePartners.length}
          description="Mitra yang sedang tidak aktif."
          tone="rose"
        />
      </QuickInfoCardGrid>

      <QuickInfoCardGrid columns={2}>
        <QuickInfoCard
          label="Jenis Mitra"
          value={partnerTypes.length}
          description="Master yang dipakai untuk onboarding mitra baru."
          tone="violet"
          valueClassName="text-[2rem] md:text-[2.15rem]"
        />
        <QuickInfoCard
          label="Paket Tersedia"
          value={packages.length}
          description="Paket yang bisa dipakai untuk rule komisi."
          tone="sky"
          valueClassName="text-[2rem] md:text-[2.15rem]"
        />
      </QuickInfoCardGrid>

      <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="flex text-sm font-bold">
          {[
            { key: "PARTNER_TYPES", label: "Jenis Mitra" },
            { key: "ACTIVE_PARTNERS", label: "Mitra Aktif" },
            { key: "INACTIVE_PARTNERS", label: "Mitra Non Aktif" },
            { key: "ANALYTICS", label: "Analitik" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTableMode(item.key as TableMode);
                setFilterMitra("");
                setFilterType("");
                setFilterContact("");
                setFilterTypeCode("");
                setFilterTypeName("");
              }}
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

      {tableMode === "ANALYTICS" ? (
        <AnalyticsTab />
      ) : (
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
        {/* Table Header (Title, Desc, Actions) */}
        <div className="flex flex-col items-start gap-4 border-b border-gray-100 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {tableMode === "PARTNER_TYPES"
                ? "Jenis Mitra"
                : tableMode === "ACTIVE_PARTNERS"
                ? "Mitra Aktif"
                : "Mitra Non Aktif"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {tableMode === "PARTNER_TYPES"
                ? "Pengelolaan tipe mitra, komisi dasar, dan skema aturan komisi per paket langganan."
                : tableMode === "ACTIVE_PARTNERS"
                ? "Kelola seluruh data mitra aktif, status aktivitas, dan informasi kontak."
                : "Daftar mitra yang dalam status nonaktif atau belum diaktifkan kembali."}
            </p>
          </div>

          <div className="flex overflow-x-auto flex-nowrap items-center gap-3 w-full sm:w-auto mt-4 md:mt-0 pb-2">
            {tableMode === "PARTNER_TYPES" && canManageTypes && (
              <button
                type="button"
                onClick={openCreateTypeModal}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Jenis Mitra
              </button>
            )}

            {(tableMode === "ACTIVE_PARTNERS" || tableMode === "INACTIVE_PARTNERS") && isAdmin && (
              <button
                type="button"
                onClick={openCreatePartnerModal}
                disabled={partnerTypes.length === 0}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Mitra
              </button>
            )}

            {tableMode === "PARTNER_TYPES" && selectedPartnerTypeIds.length > 0 && (
              <>
                <div className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-700">
                  <svg className="h-4 w-4 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  {selectedPartnerTypeIds.length} terpilih
                </div>
                <button
                  type="button"
                  onClick={() => {
                    alert("Fitur hapus massal belum tersedia");
                    setSelectedPartnerTypeIds([]);
                  }}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Pindahkan ke Sampah
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPartnerTypeIds([])}
                  className="flex shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white h-10 w-10 text-gray-500 shadow-sm transition-all hover:bg-gray-100 hover:text-gray-900"
                  title="Batalkan Pilihan"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}

            {(tableMode === "ACTIVE_PARTNERS" || tableMode === "INACTIVE_PARTNERS") && selectedPartnerIds.length > 0 && (
              <>
                <div className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-700">
                  <svg className="h-4 w-4 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  {selectedPartnerIds.length} terpilih
                </div>
                <button
                  type="button"
                  onClick={() => {
                    alert("Fitur hapus massal belum tersedia");
                    setSelectedPartnerIds([]);
                  }}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Pindahkan ke Sampah
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPartnerIds([])}
                  className="flex shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white h-10 w-10 text-gray-500 shadow-sm transition-all hover:bg-gray-100 hover:text-gray-900"
                  title="Batalkan Pilihan"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
        {/* Header Filters Grid */}
        {(tableMode === "ACTIVE_PARTNERS" || tableMode === "INACTIVE_PARTNERS" || tableMode === "PARTNER_TYPES") && (
          <div className="border-b border-gray-50 px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
              {(tableMode === "ACTIVE_PARTNERS" || tableMode === "INACTIVE_PARTNERS") && (
                <>
                  <AutocompleteFilter
                    label="Mitra"
                    placeholder="Filter Mitra..."
                    value={filterMitra}
                    onChange={setFilterMitra}
                    options={uniqueMitraNames}
                  />
                  <AutocompleteFilter
                    label="Type"
                    placeholder="Filter Type..."
                    value={filterType}
                    onChange={setFilterType}
                    options={uniqueMitraTypes}
                  />
                  <AutocompleteFilter
                    label="Kontak"
                    placeholder="Filter Kontak..."
                    value={filterContact}
                    onChange={setFilterContact}
                    options={uniqueMitraContacts}
                  />
                  <div className="flex flex-col gap-1.5 w-full">
                    <span className="text-xs font-semibold text-black">Filter Type Mitra</span>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                    >
                      <option value="ALL">Semua Type</option>
                      {partnerTypes.map((item) => (
                        <option key={item.id} value={item.code}>
                          {item.name || item.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {tableMode === "PARTNER_TYPES" && (
                <>
                  <AutocompleteFilter
                    label="Code"
                    placeholder="Filter Code..."
                    value={filterTypeCode}
                    onChange={setFilterTypeCode}
                    options={uniqueTypeCodes}
                  />
                  <AutocompleteFilter
                    label="Jenis Mitra"
                    placeholder="Filter Jenis Mitra..."
                    value={filterTypeName}
                    onChange={setFilterTypeName}
                    options={uniqueTypeNames}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Global Search Bar + Column Visibility Control */}
        <div className="border-b border-gray-50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {tableMode === "PARTNER_TYPES" ? (
              <div className="flex items-center justify-between w-full gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    value={typeSearch}
                    onChange={(event) => setTypeSearch(event.target.value)}
                    placeholder="Cari code, nama, atau mode komisi jenis mitra..."
                    className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                  />
                </div>

                <ColumnVisibilityControl
                  tableId="partner-types-table"
                  storageKey="column-visibility:partner-types-table"
                  buttonLabel="Kolom"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between w-full gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    value={searchDraft}
                    onChange={(event) => {
                      setSearchDraft(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Cari nama, code mitra, email, telepon..."
                    className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                  />
                </div>

                <ColumnVisibilityControl
                  tableId="partners-table"
                  storageKey="column-visibility:partners-table"
                  buttonLabel="Kolom"
                />
              </div>
            )}
          </div>
        </div>

        {pageError ? (
          <div className="mx-4 mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {pageError}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          {tableMode === "PARTNER_TYPES" ? (
            <table id="partner-types-table" data-column-visibility-manual="true" className="w-full min-w-[820px] text-left text-sm text-gray-600">
              <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={filteredPartnerTypes.length > 0 && selectedPartnerTypeIds.length === filteredPartnerTypes.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPartnerTypeIds(filteredPartnerTypes.map(pt => pt.id));
                        } else {
                          setSelectedPartnerTypeIds([]);
                        }
                      }}
                      className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                    />
                  </th>
                  <th className="px-4 py-4 font-bold">Code</th>
                  <th className="px-4 py-4 font-bold">Jenis Mitra</th>
                  <th className="px-4 py-4 font-bold">Komisi Dasar</th>
                  <th className="px-4 py-4 font-bold">Deskripsi</th>
                  <th className="px-4 py-4 text-center font-bold">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      Memuat data jenis mitra...
                    </td>
                  </tr>
                ) : filteredPartnerTypes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      Jenis mitra tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredPartnerTypes.map((item) => (
                    <tr
                      key={item.id}
                      onMouseDown={(e) => {
                        if ((e.target as HTMLElement).closest("button, a, [role='button']")) return;
                        const isSelected = selectedPartnerTypeIds.includes(item.id);
                        setIsDraggingTypes(true);
                        setDragActionTypes(isSelected ? "deselect" : "select");
                        setSelectedPartnerTypeIds((prev) =>
                          isSelected ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                        );
                      }}
                      onMouseEnter={() => {
                        if (isDraggingTypes && dragActionTypes) {
                          setSelectedPartnerTypeIds((prev) => {
                            if (dragActionTypes === "select" && !prev.includes(item.id)) return [...prev, item.id];
                            if (dragActionTypes === "deselect" && prev.includes(item.id)) return prev.filter((id) => id !== item.id);
                            return prev;
                          });
                        }
                      }}
                      className={`transition-colors hover:bg-gray-50 cursor-pointer select-none ${selectedPartnerTypeIds.includes(item.id) ? "bg-red-50/50" : ""}`}
                    >
                      <td className="w-12 px-4 py-4 text-center align-top">
                        <input
                          type="checkbox"
                          checked={selectedPartnerTypeIds.includes(item.id)}
                          readOnly
                          className="pointer-events-none rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                        />
                      </td>
                      <td className="px-4 py-4 align-top font-medium text-gray-900">
                        {item.code}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          Mode dasar {item.commission_mode}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {formatFlatCommission(item)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {item.description || "Belum ada deskripsi."}
                      </td>
                      <td className="px-4 py-4 text-center align-top">
                        <RowActionGroup>
                          <ViewActionButton
                            href={`/menu/kelolaan-mitra/jenis-mitra/${item.id}`}
                            title="Detail Ringkasan Komisi Mitra"
                          />

                          {canManageTypes && (
                            <>
                              <EditActionButton
                                onClick={() => openEditTypeModal(item, "detail")}
                                title="Edit Jenis Mitra"
                              />

                              <DeleteActionButton
                                onClick={() => void handleDeletePartnerType(item)}
                                title="Hapus Jenis Mitra"
                              />
                            </>
                          )}
                        </RowActionGroup>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table id="partners-table" data-column-visibility-manual="true" data-table-pagination-manual="true" className="w-full min-w-[980px] text-left text-sm text-gray-600">
              <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={
                        (tableMode === "ACTIVE_PARTNERS" ? activePartners : inactivePartners).length > 0 &&
                        selectedPartnerIds.length === (tableMode === "ACTIVE_PARTNERS" ? activePartners : inactivePartners).length
                      }
                      onChange={(e) => {
                        const targetList = tableMode === "ACTIVE_PARTNERS" ? activePartners : inactivePartners;
                        if (e.target.checked) {
                          setSelectedPartnerIds(targetList.map(p => p.id));
                        } else {
                          setSelectedPartnerIds([]);
                        }
                      }}
                      className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                    />
                  </th>
                  <th className="px-4 py-4 font-bold">Mitra</th>
                  <th className="px-4 py-4 font-bold">Type</th>
                  <th className="px-4 py-4 font-bold">Kontak</th>
                  <th className="px-4 py-4 font-bold">Komisi Dasar</th>
                  <th className="px-4 py-4 font-bold">Status</th>
                  <th className="px-4 py-4 text-center font-bold">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      Memuat data mitra...
                    </td>
                  </tr>
                ) : (tableMode === "ACTIVE_PARTNERS"
                    ? activePartners
                    : inactivePartners
                  ).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      Data mitra tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  (tableMode === "ACTIVE_PARTNERS"
                    ? activePartners
                    : inactivePartners
                  ).map((partner) => (
                    <tr
                      key={partner.id}
                      onMouseDown={(e) => {
                        if ((e.target as HTMLElement).closest("button, a, [role='button']")) return;
                        const isSelected = selectedPartnerIds.includes(partner.id);
                        setIsDraggingPartners(true);
                        setDragActionPartners(isSelected ? "deselect" : "select");
                        setSelectedPartnerIds((prev) =>
                          isSelected ? prev.filter((id) => id !== partner.id) : [...prev, partner.id]
                        );
                      }}
                      onMouseEnter={() => {
                        if (isDraggingPartners && dragActionPartners) {
                          setSelectedPartnerIds((prev) => {
                            if (dragActionPartners === "select" && !prev.includes(partner.id)) return [...prev, partner.id];
                            if (dragActionPartners === "deselect" && prev.includes(partner.id)) return prev.filter((id) => id !== partner.id);
                            return prev;
                          });
                        }
                      }}
                      className={`transition-colors hover:bg-gray-50 cursor-pointer select-none ${selectedPartnerIds.includes(partner.id) ? "bg-red-50/50" : ""}`}
                    >
                      <td className="w-12 px-4 py-4 text-center align-top">
                        <input
                          type="checkbox"
                          checked={selectedPartnerIds.includes(partner.id)}
                          readOnly
                          className="pointer-events-none rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900">{partner.name}</p>
                        <p className="mt-1 text-xs text-gray-400">{partner.code}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <Link
                          href={`/menu/kelolaan-mitra/jenis-mitra/${partner.partner_type.id}`}
                          className="font-bold text-[#C92C1E] hover:underline transition-colors"
                          title="Lihat & kelola komisi jenis mitra"
                        >
                          {partner.partner_type.name}
                        </Link>
                        <span className="mt-1 block text-xs text-gray-400">
                          {partner.partner_type.code}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {partner.phone ? formatPhoneDisplay(partner.phone) : "-"}
                        <span className="mt-1 block text-xs text-gray-400">
                          {partner.email || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {formatFlatCommission(partner.partner_type)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <PartnerActivityBadge partnerId={partner.id} />
                      </td>
                      <td className="px-4 py-4 text-center align-top">
                        <RowActionGroup>
                          <ViewActionButton
                            href={
                              isSales
                                ? `/menu/kelolaan-mitra/detail?id=${partner.id}&tab=interaction`
                                : `/menu/kelolaan-mitra/detail?id=${partner.id}`
                            }
                            title="Detail Mitra"
                          />

                          {isAdmin && tableMode === "ACTIVE_PARTNERS" ? (
                            <>
                              <EditActionButton
                                onClick={() => openEditPartnerModal(partner)}
                                title="Edit Mitra"
                              />

                              <ToggleActiveActionButton
                                active={true}
                                onClick={() => void handleDeactivatePartner(partner)}
                                disabled={saving}
                              />
                            </>
                          ) : null}

                          {isAdmin && tableMode === "INACTIVE_PARTNERS" ? (
                            <ToggleActiveActionButton
                              active={false}
                              onClick={() => void handleRestorePartner(partner)}
                              disabled={saving}
                            />
                          ) : null}
                        </RowActionGroup>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {tableMode !== "PARTNER_TYPES" ? (
          <TablePaginationFooter
            currentPage={page}
            totalItems={partnerTotal}
            rowsPerPage={limit === 0 ? "all" : limit}
            totalPages={partnerTotalPages}
            onPageChange={setPage}
            onRowsPerPageChange={(nextLimit) => {
              setLimit(nextLimit === "all" ? 0 : nextLimit);
              setPage(1);
            }}
          />
        ) : null}

        {false && tableMode !== "PARTNER_TYPES" ? (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 p-4 sm:flex-row">
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-gray-500">
                Menampilkan {(page - 1) * limit + 1} hingga {(page - 1) * limit + partners.length} data
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-[#C92C1E] focus:outline-none"
                >
                  {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>

              <button
                disabled={partners.length < limit}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        ) : null}
      </div>
      )}

      <ModalShell
        open={showPartnerModal}
        title={editingPartner ? "Edit Mitra" : "Tambah Mitra"}
        subtitle="Form mitra mengikuti tampilan popup Komisi, dengan input clean dan background soft."
        onClose={() => setShowPartnerModal(false)}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowPartnerModal(false)}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              form="partner-mitra-form"
              disabled={saving}
              className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {saving
                ? "Menyimpan..."
                : editingPartner
                  ? "Simpan Perubahan"
                  : "Tambah Mitra"}
            </button>
          </div>
        }
      >
        <form id="partner-mitra-form" onSubmit={handlePartnerSubmit} className="space-y-5">
          {partnerFormError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {partnerFormError}
            </div>
          ) : null}

          <div className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Identitas
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4">
                {!editingPartner ? (
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                      Jenis Mitra
                    </span>
                    <select
                      value={partnerForm.partnerTypeId}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          partnerTypeId: event.target.value,
                        }))
                      }
                      className={selectClass}
                    >
                      <option value="">Pilih jenis mitra</option>
                      {partnerTypes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name || item.code}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-black text-slate-900">
                    {editingPartner.partner_type.name}
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {editingPartner.partner_type.code}
                    </span>
                  </div>
                )}

                {!editingPartner ? (
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                      Code
                    </span>
                    <input
                      value={partnerForm.code}
                      onChange={(event) =>
                        setPartnerForm((current) => ({
                          ...current,
                          code: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="Code mitra"
                      className={`${inputClass} uppercase`}
                    />
                  </label>
                ) : null}

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Nama Mitra
                  </span>
                  <input
                    value={partnerForm.name}
                    onChange={(event) =>
                      setPartnerForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Nama mitra"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Status
                  </span>
                  <select
                    value={partnerForm.status}
                    onChange={(event) =>
                      setPartnerForm((current) => ({
                        ...current,
                        status: event.target.value as "ACTIVE" | "INACTIVE",
                      }))
                    }
                    className={selectClass}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Kontak Mitra
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Telepon
                  </span>
                  <input
                    value={partnerForm.phone}
                    onChange={(event) =>
                      setPartnerForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="No. telepon"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Email
                  </span>
                  <input
                    value={partnerForm.email}
                    onChange={(event) =>
                      setPartnerForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="Email"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Alamat
                  </span>
                  <textarea
                    value={partnerForm.address}
                    onChange={(event) =>
                      setPartnerForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Alamat mitra"
                    className={textareaClass}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Rekening
                  </span>
                  <input
                    value={partnerForm.bankAccount}
                    onChange={(event) =>
                      setPartnerForm((current) => ({
                        ...current,
                        bankAccount: event.target.value,
                      }))
                    }
                    placeholder="Nomor rekening"
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Provinsi
                  </span>
                  <input
                    value={partnerForm.province}
                    onChange={(event) =>
                      setPartnerForm((current) => ({
                        ...current,
                        province: event.target.value,
                      }))
                    }
                    placeholder="Provinsi"
                    className={inputClass}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Kabupaten/Kota
                  </span>
                  <input
                    value={partnerForm.city}
                    onChange={(event) =>
                      setPartnerForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    placeholder="Kabupaten atau Kota"
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Kecamatan
                  </span>
                  <input
                    value={partnerForm.district}
                    onChange={(event) =>
                      setPartnerForm((current) => ({
                        ...current,
                        district: event.target.value,
                      }))
                    }
                    placeholder="Kecamatan"
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
          </div>

        </form>
      </ModalShell>

      <ModalShell
        open={showTypeModal}
        title={editingType ? "Edit Jenis Mitra" : "Tambah Jenis Mitra"}
        subtitle="Atur informasi jenis mitra dan konfigurasi rule komisi per plan dalam satu halaman."
        onClose={() => setShowTypeModal(false)}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowTypeModal(false)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              form="type-mitra-form"
              disabled={savingType}
              className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-6 py-3 text-xs font-bold text-white shadow-md shadow-red-500/20 transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {savingType ? "Menyimpan..." : "Simpan Jenis Mitra & Rule Komisi"}
            </button>
          </div>
        }
      >
        <form id="type-mitra-form" onSubmit={handleTypeSubmit} className="space-y-6">
          {typeFormError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {typeFormError}
            </div>
          )}

          {/* Section 1: Informasi Jenis Mitra */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <div className="bg-red-50 p-2 rounded-xl border border-red-100 text-[#C92C1E]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">1. Informasi Jenis Mitra</h4>
                <p className="text-[11px] text-slate-500 font-medium">Nama, kode, komisi dasar, dan deskripsi mitra</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Nama Jenis Mitra <span className="text-red-500">*</span>
                </label>
                <input
                  value={typeForm.name}
                  onChange={(event) =>
                    setTypeForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Contoh: Distributor, Agent, Reseller"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-[#C92C1E]/10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Kode Jenis Mitra <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <input
                  value={typeForm.code}
                  onChange={(event) =>
                    setTypeForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  disabled={Boolean(editingType)}
                  placeholder="Otomatis jika kosong (cth: DISTRIBUTOR)"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase text-slate-800 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-[#C92C1E]/10 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Mode Komisi Dasar
                </label>
                <select
                  value={typeForm.commissionMode}
                  onChange={(event) =>
                    setTypeForm((current) => ({
                      ...current,
                      commissionMode: event.target.value as "PERCENTAGE" | "FIXED",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-[#C92C1E]/10"
                >
                  <option value="PERCENTAGE">PERCENTAGE (%)</option>
                  <option value="FIXED">FIXED (Rp)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Nilai Komisi Dasar
                </label>
                <div className="relative">
                  {typeForm.commissionMode === "FIXED" ? (
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                  ) : null}
                  <input
                    value={
                      typeForm.commissionMode === "FIXED"
                        ? formatThousandDots(typeForm.commissionValue)
                        : typeForm.commissionValue
                    }
                    onChange={(event) => {
                      const rawVal = event.target.value.replace(/\./g, "");
                      setTypeForm((current) => ({
                        ...current,
                        commissionValue: rawVal,
                      }));
                    }}
                    placeholder={
                      typeForm.commissionMode === "FIXED"
                        ? "Masukkan nominal komisi (cth: 120.000)"
                        : "Masukkan persentase komisi (cth: 10)"
                    }
                    className={`w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-[#C92C1E]/10 ${
                      typeForm.commissionMode === "FIXED" ? "pl-10" : ""
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Deskripsi
              </label>
              <textarea
                value={typeForm.description}
                onChange={(event) =>
                  setTypeForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={2}
                placeholder="Jelaskan peran atau kualifikasi singkat jenis mitra ini..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-[#C92C1E]/10"
              />
            </div>
          </div>

          {/* Section 2: Rule Komisi per Plan / Paket */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="bg-red-50 p-2 rounded-xl border border-red-100 text-[#C92C1E]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">2. Matriks Rule Komisi per Plan</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Atur komisi spesifik untuk setiap paket & tenor di bawah ini.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Preset:</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value as "REFERRAL" | "PARTNERSHIP" | "STRATEGIC" | "ZERO";
                    if (val) applyPresetToMatrix(val);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                >
                  <option value="" disabled>-- Pilih Preset Komisi --</option>
                  <option value="REFERRAL">Preset Referral</option>
                  <option value="PARTNERSHIP">Preset Partnership / Agen</option>
                  <option value="STRATEGIC">Preset Strategic / Distributor</option>
                  <option value="ZERO">Reset Ke 0</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-center w-10">#</th>
                    <th className="px-4 py-3 font-bold">Paket & Plan</th>
                    <th className="px-4 py-3 font-bold">Tenor</th>
                    <th className="px-4 py-3 font-bold">Harga Paket</th>
                    <th className="px-4 py-3 font-bold w-44">Mode Komisi</th>
                    <th className="px-4 py-3 font-bold w-52">Nilai Komisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {plans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs font-semibold text-slate-400">
                        Belum ada katalog plan paket yang terdaftar.
                      </td>
                    </tr>
                  ) : (
                    plans.map((plan, idx) => {
                      const draft = planMatrixDraft[plan.id] || { mode: "FIXED", value: "0" };
                      return (
                        <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {plan.package?.name || plan.name}
                            <span className="block text-[11px] font-medium text-slate-400 mt-0.5">{plan.code}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                            {plan.tenure_months ? `${plan.tenure_months} Bulan` : "-"}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                            Rp{Number(plan.price || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={draft.mode}
                              onChange={(e) => {
                                const newMode = e.target.value as "FIXED" | "PERCENTAGE";
                                setPlanMatrixDraft((prev) => ({
                                  ...prev,
                                  [plan.id]: {
                                    mode: newMode,
                                    value: newMode === "FIXED" ? formatThousandDots(draft.value) : stripThousandDots(draft.value),
                                  },
                                }));
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                            >
                              <option value="FIXED">Nominal (Rp)</option>
                              <option value="PERCENTAGE">Persen (%)</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              {draft.mode === "FIXED" && (
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                  Rp
                                </span>
                              )}
                              <input
                                type="text"
                                value={draft.mode === "FIXED" ? formatThousandDots(draft.value) : draft.value}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const clean = draft.mode === "FIXED" ? formatThousandDots(val) : val;
                                  setPlanMatrixDraft((prev) => ({
                                    ...prev,
                                    [plan.id]: {
                                      ...draft,
                                      value: clean,
                                    },
                                  }));
                                }}
                                placeholder={draft.mode === "FIXED" ? "150.000" : "10"}
                                className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E] ${
                                  draft.mode === "FIXED" ? "pl-9" : ""
                                }`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </form>
      </ModalShell>
    </div>
  );
}
