"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import {
  Search,
  Plus,
  RotateCcw,
  Package,
  Tag,
  Pencil,
  Trash2,
  ArchiveRestore,
  X,
  Layers,
  Eye,
  Power,
  PowerOff,
  ArrowLeft,
} from "lucide-react";
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";
import {
  packageApi,
  planApi,
  promotionApi,
  listPromotionBenefits,
  createPromotionBenefit,
  deletePromotionBenefit,
  setPromotionEligiblePlans,
  getPromotionEligiblePlans,
  getEligiblePromotions,
  type CatalogPackageItem,
  type CatalogPlanItem,
  type CatalogPromotionItem,
  type CatalogBenefitItem,
  type CatalogPromotion,
  type CreatePackagePayload,
  type CreatePlanPayload,
  type CreatePromotionPayload,
  type CatalogScope,
} from "@/app/lib/api";
import { usePackagesQuery, usePlansQuery, usePromotionsQuery } from "@/app/lib/queries/catalog";
import AnalyticsTabSkeleton from "@/app/components/skeleton/AnalyticsTabSkeleton";
import ColumnVisibilityControl from "@/app/components/table/ColumnVisibilityControl";

const AnalyticsTab = dynamic(() => import("./AnalyticsTab"), {
  ssr: false,
  loading: () => <AnalyticsTabSkeleton sections={2} />,
});

type Entity = "package" | "plan" | "promotion";

type ViewTarget =
  | { kind: "package"; item: CatalogPackageItem }
  | { kind: "plan"; item: CatalogPlanItem }
  | { kind: "promotion"; item: CatalogPromotionItem };

function formatRupiah(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;

  if (Number.isNaN(n)) return "-";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

const modalInputClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400";

const modalSelectClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400";

const modalTextareaClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400";

const inputClass = modalInputClass;

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Nonaktif
    </span>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 cursor-pointer rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-bold text-gray-600 outline-none transition focus:border-[#C92C1E]"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  rowsPerPage: number;
  onPageChange: (p: number) => void;
  onRowsPerPageChange: (n: number) => void;
}) {
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 p-4 sm:flex-row">
      <p className="text-xs font-bold text-gray-400">
        Menampilkan <span className="text-gray-700">{start} - {end}</span> dari{" "}
        <span className="text-gray-700">{totalItems}</span> data
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
          className="h-8 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-600 outline-none focus:border-[#C92C1E]"
        >
          {[10, 25, 50, 100].map((v) => (
            <option key={v} value={v}>
              {v} / halaman
            </option>
          ))}
        </select>

        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Prev
        </button>

        <div className="flex h-8 items-center justify-center rounded-lg bg-red-50 px-3 text-[11px] font-black text-[#C92C1E]">
          {currentPage} / {totalPages}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  icon,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const sb = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (sb > 0) document.body.style.paddingRight = `${sb}px`;

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 md:p-6" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center">
        <div
          className={`app-modal-panel w-full rounded-[32px] shadow-2xl transition-all ${
            wide ? "max-w-5xl" : "max-w-3xl xl:max-w-4xl"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="app-modal-header px-5 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {icon && (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-[#C92C1E]">
                  {icon}
                </div>
              )}

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                  Katalog
                </p>

                <h2 className="mt-2 text-lg font-black text-slate-950 md:text-xl">
                  {title}
                </h2>

                {subtitle && (
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="app-modal-close rounded-2xl px-4 py-2 text-xs font-black transition"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="app-modal-body flex-1 min-h-0 space-y-4 p-5 md:p-6">
          {children}
        </div>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label} {required && <span className="text-[#C92C1E]">*</span>}
      </span>
      {children}
      {error && <p className="text-[10px] font-bold text-red-600">{error}</p>}
    </label>
  );
}

function ConfirmDialog({
  title,
  description,
  danger,
  confirmLabel = "Konfirmasi",
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  danger?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70" onClick={onCancel}>
      <div className="flex min-h-full items-center justify-center overflow-y-auto p-4 md:p-6">
          <div
            className="app-modal-panel w-full max-w-sm rounded-[32px] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-modal-header px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
              Konfirmasi
            </p>

            <h3 className="mt-2 text-lg font-black text-slate-950">{title}</h3>

            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
              {description}
            </p>
          </div>

          <div className="app-modal-body p-5">
            <div className="flex flex-col gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
              >
                Batal
              </button>

              <button
                onClick={onConfirm}
                className={`flex-1 rounded-2xl py-3 text-sm font-black text-white shadow-sm transition ${
                  danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#C92C1E] hover:bg-[#A82216]"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkActionBar({
  count,
  isTrash,
  onClear,
  onDelete,
  onRestore,
  onForceDelete,
}: {
  count: number;
  isTrash: boolean;
  onClear: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onForceDelete: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-gray-900 px-5 py-3 text-white shadow-2xl">
      <span className="text-xs font-bold">{count} data dipilih</span>

      {isTrash ? (
        <>
          <button
            onClick={onRestore}
            className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-black transition hover:bg-white/10"
          >
            Pulihkan Massal
          </button>

          <button
            onClick={onForceDelete}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-black transition hover:bg-red-700"
          >
            Hapus Permanen
          </button>
        </>
      ) : (
        <button
          onClick={onDelete}
          className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-black transition hover:bg-white/10"
        >
          Hapus Massal
        </button>
      )}

      <button
        onClick={onClear}
        className="text-xs font-bold text-white/60 hover:text-white"
      >
        Batal
      </button>
    </div>
  );
}

export default function PaketLanggananPage() {
  usePageTitle("Katalog");

  const router = useRouter();
  const [viewMode, setViewMode] = useState<"data" | "analytics">("data");
  const [entity, setEntity] = useState<Entity>("package");
  const [scope, setScope] = useState<CatalogScope>("ACTIVE");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [packageFilter, setPackageFilter] = useState<string>("");
  const [chargeTypeFilter, setChargeTypeFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const catalogBaseParams = useMemo(
    () => ({
      q: search || undefined,
      active: activeFilter === "" ? undefined : activeFilter === "true",
      page,
      limit: rowsPerPage,
      scope,
    }),
    [search, activeFilter, page, rowsPerPage, scope],
  );
  const packageQueryParams = catalogBaseParams;
  const planQueryParams = useMemo(
    () => ({ ...catalogBaseParams, package_id: packageFilter || undefined }),
    [catalogBaseParams, packageFilter],
  );
  const promotionQueryParams = useMemo(
    () => ({ ...catalogBaseParams, charge_type: chargeTypeFilter || undefined }),
    [catalogBaseParams, chargeTypeFilter],
  );

  const packagesQuery = usePackagesQuery(packageQueryParams, entity === "package");
  const plansQuery = usePlansQuery(planQueryParams, entity === "plan");
  const promotionsQuery = usePromotionsQuery(promotionQueryParams, entity === "promotion");

  const allPlansQuery = usePlansQuery({ page: 1, limit: 1000, active: true }, entity === "package");
  const allPromotionsQuery = usePromotionsQuery({ page: 1, limit: 1000, active: true }, entity === "package");

  const allPlans = allPlansQuery.data?.items ?? [];
  const allPromotions = allPromotionsQuery.data?.items ?? [];

  const activeQuery =
    entity === "package" ? packagesQuery : entity === "plan" ? plansQuery : promotionsQuery;

  const packages = packagesQuery.data?.items ?? [];
  const plans = plansQuery.data?.items ?? [];
  const promotions = promotionsQuery.data?.items ?? [];
  const total = activeQuery.data?.pagination.total ?? 0;
  const isLoading = activeQuery.isLoading;
  const loadError = activeQuery.error instanceof Error ? activeQuery.error.message : null;
  const load = React.useCallback(() => {
    void packagesQuery.refetch();
    void plansQuery.refetch();
    void promotionsQuery.refetch();
  }, [packagesQuery.refetch, plansQuery.refetch, promotionsQuery.refetch]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [packageOptions, setPackageOptions] = useState<CatalogPackageItem[]>([]);

  const [packageForm, setPackageForm] = useState<{
    mode: "create" | "edit";
    item?: CatalogPackageItem;
  } | null>(null);
  const [planForm, setPlanForm] = useState<{
    mode: "create" | "edit";
    item?: CatalogPlanItem;
  } | null>(null);
  const [promotionForm, setPromotionForm] = useState<{
    mode: "create" | "edit";
    item?: CatalogPromotionItem;
  } | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<
    | { kind: "delete" | "restore" | "forceDelete"; ids: number[] }
    | null
  >(null);

  const [viewStack, setViewStack] = useState<ViewTarget[]>([]);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const pushView = (target: ViewTarget) =>
    setViewStack((prev) => [...prev, target]);
  const popView = () => setViewStack((prev) => prev.slice(0, -1));
  const closeView = () => setViewStack([]);

  const resetSelection = () => setSelectedIds(new Set());

  const changeEntity = (next: Entity) => {
    setEntity(next);
    setScope("ACTIVE");
    setSearch("");
    setActiveFilter("");
    setPackageFilter("");
    setChargeTypeFilter("");
    setPage(1);
    resetSelection();
  };

  const changeScope = (next: CatalogScope) => {
    setScope(next);
    setPage(1);
    resetSelection();
  };

  useEffect(() => {
    packageApi
      .list({ active: true, limit: 100 })
      .then((res) => setPackageOptions(res.items))
      .catch(() => setPackageOptions([]));
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

  const currentIds = useMemo(() => {
    if (entity === "package") return packages.map((p) => p.id);
    if (entity === "plan") return plans.map((p) => p.id);
    return promotions.map((p) => p.id);
  }, [entity, packages, plans, promotions]);

  const currentItemsForCount = useMemo(() => {
    if (entity === "package") return packages;
    if (entity === "plan") return plans;
    return promotions;
  }, [entity, packages, plans, promotions]);

  const activeCount = currentItemsForCount.filter((item) => item.active).length;
  const inactiveCount = currentItemsForCount.length - activeCount;
  const scopeLabel =
    scope === "DELETED"
      ? "Arsip"
      : scope === "ALL"
        ? "Semua Data"
        : "Aktif";

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      currentIds.every((id) => prev.has(id)) ? new Set() : new Set(currentIds),
    );
  };

  const activeApi =
    entity === "package"
      ? packageApi
      : entity === "plan"
        ? planApi
        : promotionApi;

  const handleConfirmed = async () => {
    if (!confirmTarget) return;

    const { kind, ids } = confirmTarget;

    try {
      if (kind === "delete") await activeApi.bulkRemove(ids);
      else if (kind === "restore") await activeApi.bulkRestore(ids);
      else await activeApi.bulkForceRemove(ids);

      setConfirmTarget(null);
      resetSelection();
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Aksi gagal.");
    }
  };

  const handleToggleActive = async (id: number, nextActive: boolean) => {
    setTogglingId(id);

    try {
      if (entity === "package") await packageApi.update(id, { active: nextActive });
      else if (entity === "plan") await planApi.update(id, { active: nextActive });
      else await promotionApi.update(id, { active: nextActive });

      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengubah status.");
    } finally {
      setTogglingId(null);
    }
  };

  const entityLabel = {
    package: "Package",
    plan: "Plan",
    promotion: "Promotion",
  }[entity];

  const addLabel = {
    package: "Tambah Package",
    plan: "Tambah Plan",
    promotion: "Tambah Promo",
  }[entity];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="border-b-2 border-[#C92C1E] p-5">
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
            <span className="text-[#C92C1E]">Katalog</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Manajemen Katalog
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Kelola Package, Plan, dan Promotion untuk katalog paket langganan.
          </p>
        </div>
      </div>

      <QuickInfoCardGrid>
        <QuickInfoCard
          label={`Total ${entityLabel}`}
          value={total}
          description={`Total ${entityLabel.toLowerCase()} sesuai pencarian dan scope aktif.`}
          tone="accent"
          silhouette="tag"
        />
        <QuickInfoCard
          label={`${entityLabel} Aktif`}
          value={activeCount}
          description={`Data aktif pada halaman ${entityLabel.toLowerCase()} saat ini.`}
          tone="emerald"
        />
        <QuickInfoCard
          label={`${entityLabel} Nonaktif`}
          value={inactiveCount}
          description={`Data nonaktif pada halaman ${entityLabel.toLowerCase()} saat ini.`}
          tone="rose"
        />
        <QuickInfoCard
          label="Scope Aktif"
          value={scopeLabel}
          description="Mode data yang sedang ditampilkan pada katalog."
          tone="sky"
        />
      </QuickInfoCardGrid>

      <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="flex text-sm font-bold">
          {[
            { value: "data", label: "Data Katalog" },
            { value: "analytics", label: "Analitik" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setViewMode(tab.value as "data" | "analytics")}
              className={`flex items-center gap-1.5 rounded-lg px-5 py-2.5 transition-all ${
                viewMode === tab.value
                  ? "bg-white text-[#C92C1E] shadow-sm"
                  : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "data" ? (
        <>
      <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="flex text-sm font-bold">
          {(["package", "plan", "promotion"] as Entity[]).map((e) => (
            <button
              key={e}
              onClick={() => changeEntity(e)}
              className={`flex items-center gap-1.5 rounded-lg px-5 py-2.5 transition-all ${
                entity === e
                  ? "bg-white text-[#C92C1E] shadow-sm"
                  : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
              }`}
            >
              {e === "package" && <Package className="h-3.5 w-3.5" />}
              {e === "plan" && <Layers className="h-3.5 w-3.5" />}
              {e === "promotion" && <Tag className="h-3.5 w-3.5" />}
              {e === "package" ? "Package" : e === "plan" ? "Plan" : "Promotion"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
          <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Daftar {entityLabel}</h2>
            <p className="mt-1 text-sm text-gray-500">Daftar seluruh data {entityLabel.toLowerCase()} dalam katalog.</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  changeScope(scope === "DELETED" ? "ACTIVE" : "DELETED")
                }
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  scope === "DELETED"
                    ? "border-gray-800 bg-gray-800 text-white"
                    : "border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
                }`}
              >
                <Trash2 className="h-4 w-4" />
                {scope === "DELETED" ? "Kembali" : "Trash"}
              </button>

              {scope !== "DELETED" && (
                <button
                  onClick={() => {
                    if (entity === "package") setPackageForm({ mode: "create" });
                    else if (entity === "plan") setPlanForm({ mode: "create" });
                    else setPromotionForm({ mode: "create" });
                  }}
                  className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#A82216] active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  {addLabel}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-gray-50 px-6 py-4">
          <div className="flex flex-wrap items-start gap-4">
            {scope !== "DELETED" && (
              <div className="flex flex-col gap-1.5 w-full md:w-auto">
                <span className="text-xs font-semibold text-black">Status</span>
                <FilterSelect
                  value={activeFilter}
                  onChange={(v) => {
                    setActiveFilter(v as "" | "true" | "false");
                    setPage(1);
                  }}
                  options={[
                    { value: "true", label: "Aktif" },
                    { value: "false", label: "Nonaktif" },
                  ]}
                  placeholder="Semua Status"
                />
              </div>
            )}

            {entity === "plan" && (
              <div className="flex flex-col gap-1.5 w-full md:w-auto">
                <span className="text-xs font-semibold text-black">Package</span>
                <FilterSelect
                  value={packageFilter}
                  onChange={(v) => {
                    setPackageFilter(v);
                    setPage(1);
                  }}
                  options={packageOptions.map((p) => ({
                    value: String(p.id),
                    label: p.name,
                  }))}
                  placeholder="Semua Package"
                />
              </div>
            )}

            {entity === "promotion" && (
              <div className="flex flex-col gap-1.5 w-full md:w-auto">
                <span className="text-xs font-semibold text-black">Tipe Biaya</span>
                <FilterSelect
                  value={chargeTypeFilter}
                  onChange={(v) => {
                    setChargeTypeFilter(v);
                    setPage(1);
                  }}
                  options={[
                    { value: "FREE", label: "Gratis" },
                    { value: "PAID", label: "Berbayar" },
                  ]}
                  placeholder="Semua Tipe Biaya"
                />
              </div>
            )}

            {(search || activeFilter || packageFilter || chargeTypeFilter) && (
              <div className="flex flex-col gap-1.5 mt-auto pb-[1px]">
                <button
                  onClick={() => {
                    setSearch("");
                    setActiveFilter("");
                    setPackageFilter("");
                    setChargeTypeFilter("");
                    setPage(1);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 h-9"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-b border-gray-50 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={`Cari ${entityLabel.toLowerCase()}...`}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
              />
            </div>
            <ColumnVisibilityControl tableId="catalog-table" storageKey="column-visibility:catalog-table" buttonLabel="Kolom" />
          </div>
        </div>

        <div className="relative w-full">
          <div className="flex flex-col">
            <div className="overflow-x-auto">
          <table id="catalog-table" data-column-visibility-manual="true" className="w-full min-w-[1080px] text-left text-sm text-gray-600">
            <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-10 px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={
                      currentIds.length > 0 &&
                      currentIds.every((id) => selectedIds.has(id))
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                  />
                </th>

                {entity === "package" && (
                  <>
                    <th className="px-4 py-4">Kode</th>
                    <th className="px-4 py-4">Nama</th>
                    <th className="px-4 py-4">Level</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Jumlah Plan</th>
                    <th className="px-4 py-4">Jumlah Promo</th>
                    <th className="px-4 py-4">Harga Per Tenor</th>
                  </>
                )}

                {entity === "plan" && (
                  <>
                    <th className="px-4 py-4">Kode</th>
                    <th className="px-4 py-4">Nama</th>
                    <th className="px-4 py-4">Package</th>
                    <th className="px-4 py-4">Tenor</th>
                    <th className="px-4 py-4">Harga</th>
                    <th className="px-4 py-4">Status</th>
                  </>
                )}

                {entity === "promotion" && (
                  <>
                    <th className="px-4 py-4">Kode</th>
                    <th className="px-4 py-4">Nama</th>
                    <th className="px-4 py-4">Tipe</th>
                    <th className="px-4 py-4">Biaya</th>
                    <th className="px-4 py-4">Benefit</th>
                    <th className="px-4 py-4">Status</th>
                  </>
                )}

                <th className="px-4 py-4 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-gray-400">
                    Memuat...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-red-500">
                    {loadError}
                  </td>
                </tr>
              ) : currentIds.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-14 text-center text-gray-400">
                    Tidak ada data.
                  </td>
                </tr>
              ) : entity === "package" ? (
                packages.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3.5 text-center align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                      />
                    </td>

                    <td className="px-4 py-3.5 align-top font-mono font-bold text-gray-700">
                      {p.code}
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <Link
                        href={`/menu/paket-langganan/packages/${p.id}`}
                        className="font-black text-gray-800 transition-colors hover:text-[#C92C1E]"
                      >
                        {p.name}
                      </Link>
                    </td>

                    <td className="px-4 py-3.5 align-top">{p.level_order}</td>

                    <td className="px-4 py-3.5 align-top">
                      <StatusBadge active={p.active} />
                    </td>

                    <td className="px-4 py-3.5 align-top font-bold text-gray-900">
                      {allPlans.filter((plan) => plan.package?.id === p.id).length} Plan
                    </td>

                    <td className="px-4 py-3.5 align-top font-bold text-purple-700">
                      {(() => {
                        const packagePlanIds = allPlans
                          .filter((plan) => plan.package?.id === p.id)
                          .map((plan) => plan.id);
                        const count = allPromotions.filter((promo) =>
                          promo.plan_ids?.some((pid) => packagePlanIds.includes(pid))
                        ).length;
                        return `${count} Promo`;
                      })()}
                    </td>

                    <td className="px-4 py-3.5 align-top max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {allPlans
                          .filter((plan) => plan.package?.id === p.id)
                          .map((plan) => (
                            <span
                              key={plan.id}
                              className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 ring-1 ring-inset ring-gray-500/10"
                            >
                              {plan.tenure_months} Bln: {formatRupiah(plan.price)}
                            </span>
                          ))}
                        {allPlans.filter((plan) => plan.package?.id === p.id).length === 0 && (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <RowActions
                        scope={scope}
                        active={p.active}
                        isToggling={togglingId === p.id}
                        onView={() =>
                          router.push(`/menu/paket-langganan/packages/${p.id}`)
                        }
                        onEdit={() => setPackageForm({ mode: "edit", item: p })}
                        onDelete={() =>
                          setConfirmTarget({ kind: "delete", ids: [p.id] })
                        }
                        onRestore={() =>
                          setConfirmTarget({ kind: "restore", ids: [p.id] })
                        }
                        onForceDelete={() =>
                          setConfirmTarget({ kind: "forceDelete", ids: [p.id] })
                        }
                        onToggleActive={() =>
                          void handleToggleActive(p.id, !p.active)
                        }
                      />
                    </td>
                  </tr>
                ))
              ) : entity === "plan" ? (
                plans.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3.5 text-center align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                      />
                    </td>

                    <td className="px-4 py-3.5 align-top font-mono font-bold text-gray-700">
                      {p.code}
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <Link
                        href={`/menu/paket-langganan/plans/${p.id}`}
                        className="font-black text-gray-800 transition-colors hover:text-[#C92C1E]"
                      >
                        {p.name}
                      </Link>
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-black text-orange-600">
                        {p.package.name}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      {p.tenure_months} bln
                    </td>

                    <td className="px-4 py-3.5 align-top font-black text-gray-800">
                      {formatRupiah(p.price)}
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <StatusBadge active={p.active} />
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <RowActions
                        scope={scope}
                        active={p.active}
                        isToggling={togglingId === p.id}
                        onView={() =>
                          router.push(`/menu/paket-langganan/plans/${p.id}`)
                        }
                        onEdit={() => setPlanForm({ mode: "edit", item: p })}
                        onDelete={() =>
                          setConfirmTarget({ kind: "delete", ids: [p.id] })
                        }
                        onRestore={() =>
                          setConfirmTarget({ kind: "restore", ids: [p.id] })
                        }
                        onForceDelete={() =>
                          setConfirmTarget({ kind: "forceDelete", ids: [p.id] })
                        }
                        onToggleActive={() =>
                          void handleToggleActive(p.id, !p.active)
                        }
                      />
                    </td>
                  </tr>
                ))
              ) : (
                promotions.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3.5 text-center align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                      />
                    </td>

                    <td className="px-4 py-3.5 align-top font-mono font-bold text-gray-700">
                      {p.code}
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <Link
                        href={`/menu/paket-langganan/promotions/${p.id}`}
                        className="font-black text-gray-800 transition-colors hover:text-[#C92C1E]"
                      >
                        {p.name}
                      </Link>
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      {p.promotion_type}
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      {p.charge_type === "FREE" ? (
                        <span className="font-black text-emerald-600">
                          Gratis
                        </span>
                      ) : (
                        <span className="font-black text-gray-800">
                          {formatRupiah(p.additional_charge)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 align-top text-gray-500">
                      {p.benefits?.length || 0} benefit
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <StatusBadge active={p.active} />
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <RowActions
                        scope={scope}
                        active={p.active}
                        isToggling={togglingId === p.id}
                        onView={() =>
                          router.push(`/menu/paket-langganan/promotions/${p.id}`)
                        }
                        onEdit={() =>
                          setPromotionForm({ mode: "edit", item: p })
                        }
                        onDelete={() =>
                          setConfirmTarget({ kind: "delete", ids: [p.id] })
                        }
                        onRestore={() =>
                          setConfirmTarget({ kind: "restore", ids: [p.id] })
                        }
                        onForceDelete={() =>
                          setConfirmTarget({ kind: "forceDelete", ids: [p.id] })
                        }
                        onToggleActive={() =>
                          void handleToggleActive(p.id, !p.active)
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          </div>

        {!isLoading && !loadError && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(n) => {
              setRowsPerPage(n);
              setPage(1);
            }}
          />
        )}
      </div>
      </div>
        </>
      ) : (
        <AnalyticsTab />
      )}

      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          isTrash={scope === "DELETED"}
          onClear={resetSelection}
          onDelete={() =>
            setConfirmTarget({
              kind: "delete",
              ids: Array.from(selectedIds),
            })
          }
          onRestore={() =>
            setConfirmTarget({
              kind: "restore",
              ids: Array.from(selectedIds),
            })
          }
          onForceDelete={() =>
            setConfirmTarget({
              kind: "forceDelete",
              ids: Array.from(selectedIds),
            })
          }
        />
      )}

      {packageForm && (
        <PackageFormModal
          mode={packageForm.mode}
          item={packageForm.item}
          onClose={() => setPackageForm(null)}
          onSaved={() => {
            setPackageForm(null);
            void load();
          }}
        />
      )}

      {planForm && (
        <PlanFormModal
          mode={planForm.mode}
          item={planForm.item}
          packageOptions={packageOptions}
          onClose={() => setPlanForm(null)}
          onSaved={() => {
            setPlanForm(null);
            void load();
          }}
        />
      )}

      {promotionForm && (
        <PromotionFormModal
          mode={promotionForm.mode}
          item={promotionForm.item}
          packageOptions={packageOptions}
          onClose={() => setPromotionForm(null)}
          onSaved={() => {
            setPromotionForm(null);
            void load();
          }}
        />
      )}

      {viewStack.length > 0 && (
        <DetailModal
          target={viewStack[viewStack.length - 1]}
          canGoBack={viewStack.length > 1}
          onBack={popView}
          onClose={closeView}
          onNavigate={pushView}
        />
      )}

      {confirmTarget && (
        <ConfirmDialog
          title={
            confirmTarget.kind === "delete"
              ? `Hapus ${confirmTarget.ids.length} ${entityLabel}?`
              : confirmTarget.kind === "restore"
                ? `Pulihkan ${confirmTarget.ids.length} ${entityLabel}?`
                : `Hapus Permanen ${confirmTarget.ids.length} ${entityLabel}?`
          }
          description={
            confirmTarget.kind === "delete"
              ? "Data akan dipindahkan ke Trash dan masih bisa dipulihkan."
              : confirmTarget.kind === "restore"
                ? "Data akan aktif kembali dan tampil di daftar utama."
                : "Tindakan ini tidak dapat dibatalkan. Data akan dihapus selamanya."
          }
          danger={confirmTarget.kind === "forceDelete"}
          confirmLabel={
            confirmTarget.kind === "delete"
              ? "Hapus"
              : confirmTarget.kind === "restore"
                ? "Pulihkan"
                : "Hapus Permanen"
          }
          onConfirm={() => void handleConfirmed()}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}

function RowActions({
  scope,
  active,
  isToggling,
  onView,
  onEdit,
  onDelete,
  onRestore,
  onForceDelete,
  onToggleActive,
}: {
  scope: CatalogScope;
  active: boolean;
  isToggling?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onForceDelete: () => void;
  onToggleActive: () => void;
}) {
  if (scope === "DELETED") {
    return (
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onView}
          className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
          title="Lihat Detail"
        >
          <Eye className="h-4 w-4" />
        </button>

        <button
          onClick={onRestore}
          className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
          title="Pulihkan"
        >
          <ArchiveRestore className="h-4 w-4" />
        </button>

        <button
          onClick={onForceDelete}
          className="rounded-lg bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-700"
          title="Hapus Permanen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={onView}
        className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
        title="Lihat Detail"
      >
        <Eye className="h-4 w-4" />
      </button>

      <button
        onClick={onToggleActive}
        disabled={isToggling}
        className={`rounded-lg p-2 transition-colors disabled:opacity-40 ${
          active
            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
            : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        }`}
        title={active ? "Nonaktifkan" : "Aktifkan"}
      >
        {active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
      </button>

      <button
        onClick={onEdit}
        className="rounded-lg bg-orange-50 p-2 text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-700"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <button
        onClick={onDelete}
        className="rounded-lg bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-red-100 hover:text-red-700"
        title="Hapus"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function PackageFormModal({
  mode,
  item,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  item?: CatalogPackageItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CreatePackagePayload>({
    code: item?.code || "",
    name: item?.name || "",
    level_order: item?.level_order ?? 1,
    description: item?.description || "",
    active: item?.active ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code.trim() || !form.name.trim()) {
      setError("Kode dan nama wajib diisi.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (mode === "edit" && item) await packageApi.update(item.id, form);
      else await packageApi.create(form);

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan package.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={mode === "edit" ? "Edit Package" : "Tambah Package Baru"}
      subtitle="Master Package"
      icon={<Package className="h-5 w-5" />}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
            Data Package
          </p>

          <div className="space-y-4">
            <FieldGroup label="Kode Package" required>
              <input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="Contoh: PRO"
                className={modalInputClass}
              />
            </FieldGroup>

            <FieldGroup label="Nama Package" required>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Contoh: Pro"
                className={modalInputClass}
              />
            </FieldGroup>

            <FieldGroup label="Level Order" required>
              <input
                type="number"
                min={1}
                value={form.level_order}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    level_order: Number(e.target.value),
                  }))
                }
                className={modalInputClass}
              />
            </FieldGroup>

            <FieldGroup label="Deskripsi">
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                className={modalTextareaClass}
              />
            </FieldGroup>

            <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              Aktif
            </label>
          </div>
        </div>

        {error && <p className="text-xs font-bold text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PlanFormModal({
  mode,
  item,
  packageOptions,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  item?: CatalogPlanItem;
  packageOptions: CatalogPackageItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CreatePlanPayload>({
    package_id: item?.package.id ?? packageOptions[0]?.id ?? 0,
    code: item?.code || "",
    name: item?.name || "",
    tenure_months: item?.tenure_months ?? 1,
    price: item?.price || "",
    currency: item?.currency || "IDR",
    effective_from: item?.effective_from || new Date().toISOString().slice(0, 10),
    effective_to: item?.effective_to || "",
    active: item?.active ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.package_id || !form.code.trim() || !form.name.trim() || !form.price.trim()) {
      setError("Package, kode, nama, dan harga wajib diisi.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        effective_to: form.effective_to || undefined,
      };

      if (mode === "edit" && item) await planApi.update(item.id, payload);
      else await planApi.create(payload);

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan plan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={mode === "edit" ? "Edit Plan" : "Tambah Plan Baru"}
      subtitle="Master Plan"
      icon={<Layers className="h-5 w-5" />}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
            Data Plan
          </p>

          <div className="space-y-4">
            <FieldGroup label="Package" required>
              <select
                value={form.package_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    package_id: Number(e.target.value),
                  }))
                }
                className={modalSelectClass}
              >
                <option value={0}>Pilih package...</option>
                {packageOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup label="Kode Plan" required>
              <input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="Contoh: PRO_12_MONTHS"
                className={modalInputClass}
              />
            </FieldGroup>

            <FieldGroup label="Nama Plan" required>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Contoh: Pro 12 Bulan"
                className={modalInputClass}
              />
            </FieldGroup>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FieldGroup label="Tenor (bulan)" required>
                <input
                  type="number"
                  min={1}
                  value={form.tenure_months}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      tenure_months: Number(e.target.value),
                    }))
                  }
                  className={modalInputClass}
                />
              </FieldGroup>

              <FieldGroup label="Harga (IDR)" required>
                <input
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="990000.00"
                  className={modalInputClass}
                />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FieldGroup label="Berlaku Dari" required>
                <input
                  type="date"
                  value={form.effective_from}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      effective_from: e.target.value,
                    }))
                  }
                  className={modalInputClass}
                />
              </FieldGroup>

              <FieldGroup label="Berlaku Sampai">
                <input
                  type="date"
                  value={form.effective_to}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      effective_to: e.target.value,
                    }))
                  }
                  className={modalInputClass}
                />
              </FieldGroup>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
              Aktif
            </label>
          </div>
        </div>

        {error && <p className="text-xs font-bold text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const PROMOTION_TYPE_SUGGESTIONS = ["FREE_DURATION", "DEVICE_BUNDLE", "DISCOUNT"];
const BENEFIT_TYPE_SUGGESTIONS = ["FREE_DURATION", "DEVICE", "DISCOUNT"];

function PromotionFormModal({
  mode,
  item,
  packageOptions,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  item?: CatalogPromotionItem;
  packageOptions: CatalogPackageItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [savedPromotion, setSavedPromotion] =
    useState<CatalogPromotionItem | null>(item || null);
  const [form, setForm] = useState<CreatePromotionPayload>({
    code: item?.code || "",
    name: item?.name || "",
    promotion_type: item?.promotion_type || "",
    charge_type: item?.charge_type || "FREE",
    additional_charge: item?.additional_charge || "0",
    priority: item?.priority ?? 10,
    description: item?.description || "",
    effective_from: item?.effective_from || new Date().toISOString().slice(0, 10),
    effective_to: item?.effective_to || "",
    active: item?.active ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code.trim() || !form.name.trim() || !form.promotion_type.trim()) {
      setError("Kode, nama, dan tipe promosi wajib diisi.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        effective_to: form.effective_to || undefined,
      };

      let result: CatalogPromotionItem;

      if (mode === "edit" && item) result = await promotionApi.update(item.id, payload);
      else result = await promotionApi.create(payload);

      setSavedPromotion(result);

      if (mode === "create") return;

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan promosi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={
        mode === "edit"
          ? "Edit Promosi"
          : savedPromotion
            ? "Kelola Benefit & Eligibilitas"
            : "Tambah Promosi Baru"
      }
      subtitle="Master Promotion"
      icon={<Tag className="h-5 w-5" />}
      onClose={savedPromotion && mode === "create" ? onSaved : onClose}
      wide
    >
      {!savedPromotion || mode === "edit" ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              Data Promosi
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FieldGroup label="Kode Promosi" required>
                  <input
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className={modalInputClass}
                  />
                </FieldGroup>

                <FieldGroup label="Nama Promosi" required>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className={modalInputClass}
                  />
                </FieldGroup>
              </div>

              <FieldGroup label="Tipe Promosi" required>
                <input
                  list="promotion-type-suggestions"
                  value={form.promotion_type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      promotion_type: e.target.value,
                    }))
                  }
                  placeholder="cth: FREE_DURATION"
                  className={modalInputClass}
                />
                <datalist id="promotion-type-suggestions">
                  {PROMOTION_TYPE_SUGGESTIONS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </FieldGroup>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FieldGroup label="Tipe Biaya" required>
                  <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-[#FAFAFA] p-1">
                    {(["FREE", "PAID"] as const).map((ct) => (
                      <button
                        key={ct}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, charge_type: ct }))
                        }
                        className={`flex-1 rounded-xl py-2.5 text-xs font-black transition ${
                          form.charge_type === ct
                            ? "bg-[#C92C1E] text-white shadow-sm"
                            : "text-gray-500 hover:bg-white"
                        }`}
                      >
                        {ct === "FREE" ? "Gratis" : "Berbayar"}
                      </button>
                    ))}
                  </div>
                </FieldGroup>

                {form.charge_type === "PAID" && (
                  <FieldGroup label="Biaya Tambahan (IDR)">
                    <input
                      value={form.additional_charge}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          additional_charge: e.target.value,
                        }))
                      }
                      className={modalInputClass}
                    />
                  </FieldGroup>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FieldGroup label="Berlaku Dari" required>
                  <input
                    type="date"
                    value={form.effective_from}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        effective_from: e.target.value,
                      }))
                    }
                    className={modalInputClass}
                  />
                </FieldGroup>

                <FieldGroup label="Berlaku Sampai">
                  <input
                    type="date"
                    value={form.effective_to}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        effective_to: e.target.value,
                      }))
                    }
                    className={modalInputClass}
                  />
                </FieldGroup>
              </div>

              <FieldGroup label="Prioritas">
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      priority: Number(e.target.value),
                    }))
                  }
                  className={modalInputClass}
                />
              </FieldGroup>

              <FieldGroup label="Deskripsi">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className={modalTextareaClass}
                />
              </FieldGroup>

              <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                />
                Aktif
              </label>
            </div>
          </div>

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {isSaving
                ? "Menyimpan..."
                : mode === "edit"
                  ? "Simpan Perubahan"
                  : "Simpan & Lanjut"}
            </button>
          </div>
        </form>
      ) : (
        <PromotionBenefitsAndEligibility
          promotion={savedPromotion}
          packageOptions={packageOptions}
          onDone={onSaved}
        />
      )}
    </Modal>
  );
}

function PromotionBenefitsAndEligibility({
  promotion,
  packageOptions,
  onDone,
}: {
  promotion: CatalogPromotionItem;
  packageOptions: CatalogPackageItem[];
  onDone: () => void;
}) {
  const [benefits, setBenefits] = useState<CatalogBenefitItem[]>(
    promotion.benefits || [],
  );
  const [plans, setPlans] = useState<CatalogPlanItem[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<number>>(new Set());
  const [isSavingEligibility, setIsSavingEligibility] = useState(false);

  const [benefitType, setBenefitType] = useState("");
  const [benefitPackageId, setBenefitPackageId] = useState<number>(0);
  const [benefitDurationDays, setBenefitDurationDays] = useState("");
  const [benefitQuantity, setBenefitQuantity] = useState("");
  const [benefitDescription, setBenefitDescription] = useState("");
  const [isAddingBenefit, setIsAddingBenefit] = useState(false);
  const [benefitError, setBenefitError] = useState<string | null>(null);

  useEffect(() => {
    void planApi.list({ active: true, limit: 200 }).then((res) => setPlans(res.items));
    void listPromotionBenefits(promotion.id).then(setBenefits).catch(() => {});
  }, [promotion.id]);

  const handleAddBenefit = async () => {
    if (!benefitType.trim()) {
      setBenefitError("Tipe benefit wajib diisi.");
      return;
    }

    setIsAddingBenefit(true);
    setBenefitError(null);

    try {
      const created = await createPromotionBenefit(promotion.id, {
        benefit_type: benefitType,
        package_id: benefitPackageId || undefined,
        duration_days: benefitDurationDays
          ? Number(benefitDurationDays)
          : undefined,
        quantity: benefitQuantity ? Number(benefitQuantity) : undefined,
        description: benefitDescription || undefined,
      });

      setBenefits((prev) => [...prev, created]);
      setBenefitType("");
      setBenefitPackageId(0);
      setBenefitDurationDays("");
      setBenefitQuantity("");
      setBenefitDescription("");
    } catch (err) {
      setBenefitError(
        err instanceof Error ? err.message : "Gagal menambah benefit.",
      );
    } finally {
      setIsAddingBenefit(false);
    }
  };

  const handleDeleteBenefit = async (benefitId: number) => {
    try {
      await deletePromotionBenefit(promotion.id, benefitId);
      setBenefits((prev) => prev.filter((b) => b.id !== benefitId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus benefit.");
    }
  };

  const handleSaveEligibility = async () => {
    if (selectedPlanIds.size === 0) {
      alert("Pilih minimal 1 plan.");
      return;
    }

    setIsSavingEligibility(true);

    try {
      await setPromotionEligiblePlans(promotion.id, Array.from(selectedPlanIds));
      onDone();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Gagal menyimpan eligibilitas.",
      );
    } finally {
      setIsSavingEligibility(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
        Promosi &quot;{promotion.name}&quot; tersimpan. Tambahkan benefit dan
        tentukan plan mana yang eligible di bawah, lalu tutup modal ini untuk
        selesai.
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
        <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          Benefit
        </h3>

        <div className="space-y-2">
          {benefits.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs"
            >
              <div>
                <span className="font-black text-gray-800">{b.benefit_type}</span>
                {b.package && (
                  <span className="ml-2 text-gray-500">· {b.package.name}</span>
                )}
                {b.duration_days != null && (
                  <span className="ml-2 text-gray-500">
                    · {b.duration_days} hari
                  </span>
                )}
                {b.quantity != null && (
                  <span className="ml-2 text-gray-500">· qty {b.quantity}</span>
                )}
              </div>

              <button
                onClick={() => void handleDeleteBenefit(b.id)}
                className="text-gray-400 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {benefits.length === 0 && (
            <p className="text-xs text-gray-400">Belum ada benefit.</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-dashed border-gray-200 bg-white p-4 md:grid-cols-2">
          <input
            list="benefit-type-suggestions"
            placeholder="Tipe benefit"
            value={benefitType}
            onChange={(e) => setBenefitType(e.target.value)}
            className={modalInputClass}
          />

          <datalist id="benefit-type-suggestions">
            {BENEFIT_TYPE_SUGGESTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>

          <select
            value={benefitPackageId}
            onChange={(e) => setBenefitPackageId(Number(e.target.value))}
            className={modalSelectClass}
          >
            <option value={0}>Package (opsional)</option>
            {packageOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Durasi (hari)"
            value={benefitDurationDays}
            onChange={(e) => setBenefitDurationDays(e.target.value)}
            className={modalInputClass}
          />

          <input
            type="number"
            placeholder="Qty"
            value={benefitQuantity}
            onChange={(e) => setBenefitQuantity(e.target.value)}
            className={modalInputClass}
          />

          <input
            placeholder="Deskripsi"
            value={benefitDescription}
            onChange={(e) => setBenefitDescription(e.target.value)}
            className={`md:col-span-2 ${modalInputClass}`}
          />

          {benefitError && (
            <p className="text-[10px] font-bold text-red-600 md:col-span-2">
              {benefitError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleAddBenefit()}
            disabled={isAddingBenefit}
            className="rounded-2xl bg-gray-800 py-3 text-xs font-black text-white hover:bg-gray-900 disabled:opacity-60 md:col-span-2"
          >
            {isAddingBenefit ? "Menambahkan..." : "+ Tambah Benefit"}
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          Eligible untuk Plan
        </h3>

        <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-gray-100 bg-[#FAFAFA] p-2">
          {plans.map((pl) => (
            <label
              key={pl.id}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 hover:bg-white"
            >
              <input
                type="checkbox"
                checked={selectedPlanIds.has(pl.id)}
                onChange={() =>
                  setSelectedPlanIds((prev) => {
                    const next = new Set(prev);

                    if (next.has(pl.id)) next.delete(pl.id);
                    else next.add(pl.id);

                    return next;
                  })
                }
              />
              {pl.name} <span className="text-gray-400">({pl.package.name})</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
        >
          Selesai Nanti
        </button>

        <button
          type="button"
          onClick={() => void handleSaveEligibility()}
          disabled={isSavingEligibility}
          className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
        >
          {isSavingEligibility ? "Menyimpan..." : "Simpan Eligibilitas & Selesai"}
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-50 py-2 text-xs last:border-0">
      <span className="font-black uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <span className="text-right font-bold text-gray-800">{value}</span>
    </div>
  );
}

function DetailModal({
  target,
  canGoBack,
  onBack,
  onClose,
  onNavigate,
}: {
  target: ViewTarget;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
  onNavigate: (t: ViewTarget) => void;
}) {
  const title =
    target.kind === "package"
      ? "Detail Package"
      : target.kind === "plan"
        ? "Detail Plan"
        : "Detail Promosi";

  const icon =
    target.kind === "package" ? (
      <Package className="h-5 w-5" />
    ) : target.kind === "plan" ? (
      <Layers className="h-5 w-5" />
    ) : (
      <Tag className="h-5 w-5" />
    );

  return (
    <Modal title={title} subtitle={target.item.code} icon={icon} onClose={onClose} wide>
      {canGoBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-xs font-black text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali
        </button>
      )}

      {target.kind === "package" && (
        <PackageDetailBody item={target.item} onNavigate={onNavigate} />
      )}

      {target.kind === "plan" && (
        <PlanDetailBody item={target.item} onNavigate={onNavigate} />
      )}

      {target.kind === "promotion" && (
        <PromotionDetailBody item={target.item} onNavigate={onNavigate} />
      )}
    </Modal>
  );
}

function PackageDetailBody({
  item,
  onNavigate,
}: {
  item: CatalogPackageItem;
  onNavigate: (t: ViewTarget) => void;
}) {
  const [plans, setPlans] = useState<CatalogPlanItem[] | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPlans(null);
      void planApi
        .list({ package_id: item.id, limit: 100 })
        .then((res) => setPlans(res.items))
        .catch(() => setPlans([]));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [item.id]);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
        <InfoRow label="Nama" value={item.name} />
        <InfoRow label="Level Order" value={item.level_order} />
        <InfoRow label="Status" value={<StatusBadge active={item.active} />} />
        {item.description && <InfoRow label="Deskripsi" value={item.description} />}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          Plan pada Package ini {plans && `(${plans.length})`}
        </h3>

        {plans === null ? (
          <p className="text-xs text-gray-400">Memuat plan...</p>
        ) : plans.length === 0 ? (
          <p className="text-xs text-gray-400">Belum ada plan untuk package ini.</p>
        ) : (
          <div className="space-y-2">
            {plans.map((pl) => (
              <button
                key={pl.id}
                type="button"
                onClick={() => onNavigate({ kind: "plan", item: pl })}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-[#FAFAFA] px-4 py-3 text-left text-xs transition hover:border-[#C92C1E]/30 hover:bg-red-50/30"
              >
                <div>
                  <span className="font-black text-gray-800">{pl.name}</span>
                  <span className="ml-2 text-gray-400">
                    {pl.tenure_months} bln · {formatRupiah(pl.price)}
                  </span>
                </div>
                <StatusBadge active={pl.active} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlanDetailBody({
  item,
  onNavigate,
}: {
  item: CatalogPlanItem;
  onNavigate: (t: ViewTarget) => void;
}) {
  const [promotions, setPromotions] = useState<CatalogPromotion[] | null>(null);
  const [navigatingId, setNavigatingId] = useState<number | null>(null);
  const [isOpeningPackage, setIsOpeningPackage] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPromotions(null);
      void getEligiblePromotions(item.id)
        .then(setPromotions)
        .catch(() => setPromotions([]));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [item.id]);

  const handleOpenPromotion = async (promoId: number) => {
    setNavigatingId(promoId);

    try {
      const full = await promotionApi.get(promoId);
      onNavigate({ kind: "promotion", item: full });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal membuka detail promosi.");
    } finally {
      setNavigatingId(null);
    }
  };

  const handleOpenPackage = async () => {
    setIsOpeningPackage(true);

    try {
      const full = await packageApi.get(item.package.id);
      onNavigate({ kind: "package", item: full });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal membuka detail package.");
    } finally {
      setIsOpeningPackage(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
        <InfoRow label="Nama" value={item.name} />
        <InfoRow
          label="Package"
          value={
            <button
              type="button"
              disabled={isOpeningPackage}
              onClick={() => void handleOpenPackage()}
              className="font-black text-[#C92C1E] underline-offset-2 hover:underline disabled:opacity-50"
            >
              {item.package.name}
            </button>
          }
        />
        <InfoRow
          label="Tenor"
          value={`${item.tenure_months} bulan (${item.duration_days} hari)`}
        />
        <InfoRow label="Harga" value={formatRupiah(item.price)} />
        <InfoRow label="Berlaku Dari" value={item.effective_from} />
        {item.effective_to && (
          <InfoRow label="Berlaku Sampai" value={item.effective_to} />
        )}
        <InfoRow label="Status" value={<StatusBadge active={item.active} />} />
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          Promo Berlaku untuk Plan ini {promotions && `(${promotions.length})`}
        </h3>

        {promotions === null ? (
          <p className="text-xs text-gray-400">Memuat promo...</p>
        ) : promotions.length === 0 ? (
          <p className="text-xs text-gray-400">Belum ada promo aktif untuk plan ini.</p>
        ) : (
          <div className="space-y-2">
            {promotions.map((promo) => (
              <button
                key={promo.id}
                type="button"
                disabled={navigatingId === promo.id}
                onClick={() => void handleOpenPromotion(promo.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-[#FAFAFA] px-4 py-3 text-left text-xs transition hover:border-[#C92C1E]/30 hover:bg-red-50/30 disabled:opacity-50"
              >
                <div>
                  <span className="font-black text-gray-800">{promo.name}</span>
                  {promo.description && (
                    <span className="ml-2 text-gray-400">{promo.description}</span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-gray-400">
                  {promo.code}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PromotionDetailBody({
  item,
  onNavigate,
}: {
  item: CatalogPromotionItem;
  onNavigate: (t: ViewTarget) => void;
}) {
  const [plans, setPlans] = useState<CatalogPlanItem[] | null>(null);
  const [benefits, setBenefits] = useState<CatalogBenefitItem[]>(
    item.benefits || [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPlans(null);
      void getPromotionEligiblePlans(item.id)
        .then(setPlans)
        .catch(() => setPlans([]));
      void listPromotionBenefits(item.id).then(setBenefits).catch(() => {});
    }, 0);

    return () => window.clearTimeout(timer);
  }, [item.id]);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
        <InfoRow label="Nama" value={item.name} />
        <InfoRow label="Tipe" value={item.promotion_type} />
        <InfoRow
          label="Biaya"
          value={
            item.charge_type === "FREE"
              ? "Gratis"
              : formatRupiah(item.additional_charge)
          }
        />
        <InfoRow label="Prioritas" value={item.priority} />
        <InfoRow label="Berlaku Dari" value={item.effective_from} />
        {item.effective_to && (
          <InfoRow label="Berlaku Sampai" value={item.effective_to} />
        )}
        <InfoRow label="Status" value={<StatusBadge active={item.active} />} />
        {item.description && <InfoRow label="Deskripsi" value={item.description} />}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          Benefit ({benefits.length})
        </h3>

        {benefits.length === 0 ? (
          <p className="text-xs text-gray-400">Belum ada benefit.</p>
        ) : (
          <div className="space-y-2">
            {benefits.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-gray-100 bg-[#FAFAFA] px-4 py-3 text-xs"
              >
                <span className="font-black text-gray-800">{b.benefit_type}</span>
                {b.package && (
                  <span className="ml-2 text-gray-500">· {b.package.name}</span>
                )}
                {b.duration_days != null && (
                  <span className="ml-2 text-gray-500">
                    · {b.duration_days} hari
                  </span>
                )}
                {b.quantity != null && (
                  <span className="ml-2 text-gray-500">· qty {b.quantity}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          Eligible untuk Plan {plans && `(${plans.length})`}
        </h3>

        {plans === null ? (
          <p className="text-xs text-gray-400">Memuat plan...</p>
        ) : plans.length === 0 ? (
          <p className="text-xs text-gray-400">
            Belum ada plan yang eligible untuk promo ini.
          </p>
        ) : (
          <div className="space-y-2">
            {plans.map((pl) => (
              <button
                key={pl.id}
                type="button"
                onClick={() => onNavigate({ kind: "plan", item: pl })}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-[#FAFAFA] px-4 py-3 text-left text-xs transition hover:border-[#C92C1E]/30 hover:bg-red-50/30"
              >
                <div>
                  <span className="font-black text-gray-800">{pl.name}</span>
                  <span className="ml-2 text-gray-400">({pl.package.name})</span>
                </div>
                <StatusBadge active={pl.active} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
