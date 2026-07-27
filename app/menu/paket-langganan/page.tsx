"use client";

import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import {
  packageApi,
  planApi,
  promotionApi,
  listPromotionBenefits,
  createPromotionBenefit,
  deletePromotionBenefit,
  setPromotionEligiblePlans,
  type CatalogPackageItem,
  type CatalogPlanItem,
  type CatalogPromotionItem,
  type CatalogBenefitItem,
  type CreatePackagePayload,
  type CreatePlanPayload,
  type CreatePromotionPayload,
  type CatalogScope,
} from "@/app/lib/api";

/**
 * Katalog — Package / Plan / Promotion (branch main, integrasi backend
 * `internal/catalog`). Menggantikan Master Paket + Master Promo lama
 * (`paket-langganan-data.ts` statis, model rata 2-entitas) dengan struktur
 * backend sesungguhnya: Package (tanpa harga) → Plan (harga per tenor,
 * milik satu Package) → Promotion (+ Benefit, eligible untuk Plan tertentu).
 *
 * Satu tabel (bukan kartu terpisah per entitas) yang berubah kolom/filter
 * mengikuti `entity` yang aktif — sesuai permintaan eksplisit user, bukan 3
 * halaman terpisah. Form pakai modal terpusat (bukan drawer slide-in seperti
 * versi lama) dengan backdrop gelap + body-scroll-lock.
 */

type Entity = "package" | "plan" | "promotion";

function formatRupiah(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

// ============================================================
// SHARED UI PRIMITIVES
// ============================================================

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
    <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-bold text-gray-400">
        Menampilkan <span className="text-gray-700">{start} - {end}</span> dari{" "}
        <span className="text-gray-700">{totalItems}</span> data
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
          className="h-8 cursor-pointer rounded-lg border border-gray-100 bg-gray-50/50 px-2 text-[11px] font-black text-slate-700 outline-none"
        >
          {[10, 25, 50, 100].map((v) => (
            <option key={v} value={v}>{v} / halaman</option>
          ))}
        </select>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="h-8 rounded-lg border border-gray-100 bg-white px-3 text-[11px] font-black text-gray-400 transition hover:bg-gray-50 disabled:opacity-40"
        >
          Prev
        </button>
        <div className="flex h-8 items-center justify-center rounded-lg bg-red-50 px-3 text-[11px] font-black text-[#C92C1E]">
          {currentPage} / {totalPages}
        </div>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="h-8 rounded-lg border border-gray-100 bg-white px-3 text-[11px] font-black text-gray-400 transition hover:bg-gray-50 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/** Modal terpusat — backdrop hitam gelap, body dikunci (tidak bisa scroll). */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full ${wide ? "max-w-2xl" : "max-w-md"} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#C92C1E]">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-base font-black text-gray-900">{title}</h2>
              {subtitle && (
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
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
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-wide text-gray-400">
        {label} {required && <span className="text-[#C92C1E]">*</span>}
      </span>
      {children}
      {error && <p className="text-[10px] font-bold text-red-600">{error}</p>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]/20";

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-black text-gray-900">{title}</h3>
        <p className="mt-1.5 text-sm font-medium text-gray-500">{description}</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-black text-white shadow-sm transition ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[#C92C1E] hover:bg-[#A82216]"
            }`}
          >
            {confirmLabel}
          </button>
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
      <button onClick={onClear} className="text-xs font-bold text-white/60 hover:text-white">
        Batal
      </button>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function PaketLanggananPage() {
  const [entity, setEntity] = useState<Entity>("package");
  const [scope, setScope] = useState<CatalogScope>("ACTIVE");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [packageFilter, setPackageFilter] = useState<string>("");
  const [chargeTypeFilter, setChargeTypeFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [packages, setPackages] = useState<CatalogPackageItem[]>([]);
  const [plans, setPlans] = useState<CatalogPlanItem[]>([]);
  const [promotions, setPromotions] = useState<CatalogPromotionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [packageOptions, setPackageOptions] = useState<CatalogPackageItem[]>([]);

  const [packageForm, setPackageForm] = useState<{ mode: "create" | "edit"; item?: CatalogPackageItem } | null>(null);
  const [planForm, setPlanForm] = useState<{ mode: "create" | "edit"; item?: CatalogPlanItem } | null>(null);
  const [promotionForm, setPromotionForm] = useState<{ mode: "create" | "edit"; item?: CatalogPromotionItem } | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<
    | { kind: "delete" | "restore" | "forceDelete"; ids: number[] }
    | null
  >(null);

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

  // Load packages once for the Plan "package" filter dropdown & Plan/Promotion forms.
  useEffect(() => {
    packageApi
      .list({ active: true, limit: 100 })
      .then((res) => setPackageOptions(res.items))
      .catch(() => setPackageOptions([]));
  }, []);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const baseParams: Record<string, unknown> = {
        q: search || undefined,
        active: activeFilter === "" ? undefined : activeFilter === "true",
        page,
        limit: rowsPerPage,
        scope,
      };
      if (entity === "package") {
        const res = await packageApi.list(baseParams);
        setPackages(res.items);
        setTotal(res.pagination.total);
      } else if (entity === "plan") {
        const res = await planApi.list({
          ...baseParams,
          package_id: packageFilter || undefined,
        });
        setPlans(res.items);
        setTotal(res.pagination.total);
      } else {
        const res = await promotionApi.list({
          ...baseParams,
          charge_type: chargeTypeFilter || undefined,
        });
        setPromotions(res.items);
        setTotal(res.pagination.total);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat data katalog.");
    } finally {
      setIsLoading(false);
    }
  }, [entity, scope, search, activeFilter, packageFilter, chargeTypeFilter, page, rowsPerPage]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const currentIds = useMemo(() => {
    if (entity === "package") return packages.map((p) => p.id);
    if (entity === "plan") return plans.map((p) => p.id);
    return promotions.map((p) => p.id);
  }, [entity, packages, plans, promotions]);

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

  const activeApi = entity === "package" ? packageApi : entity === "plan" ? planApi : promotionApi;

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

  const entityLabel = { package: "Package", plan: "Plan", promotion: "Promotion" }[entity];
  const addLabel = { package: "Tambah Package", plan: "Tambah Plan", promotion: "Tambah Promo" }[entity];

  return (
    <div className="space-y-6 font-sans text-[#1C1C1E]">
      {/* === PAGE HEADER === */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#C92C1E]">
              Manajemen
            </p>
            <h1 className="text-2xl font-black text-gray-950">Katalog</h1>
          </div>
        </div>
      </div>

      {/* === ENTITY TABS === */}
      <div className="inline-flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {(["package", "plan", "promotion"] as Entity[]).map((e) => (
          <button
            key={e}
            onClick={() => changeEntity(e)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition ${
              entity === e ? "bg-[#C92C1E] text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {e === "package" && <Package className="h-3.5 w-3.5" />}
            {e === "plan" && <Layers className="h-3.5 w-3.5" />}
            {e === "promotion" && <Tag className="h-3.5 w-3.5" />}
            {e === "package" ? "Package" : e === "plan" ? "Plan" : "Promotion"}
          </button>
        ))}
      </div>

      {/* === SINGLE ADAPTIVE TABLE CARD === */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="border-b border-gray-100 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Cari ${entityLabel.toLowerCase()}...`}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-3 text-xs font-bold text-gray-700 outline-none transition focus:border-[#C92C1E] focus:bg-white"
              />
            </div>

            {scope !== "DELETED" && (
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
            )}

            {entity === "plan" && (
              <FilterSelect
                value={packageFilter}
                onChange={(v) => {
                  setPackageFilter(v);
                  setPage(1);
                }}
                options={packageOptions.map((p) => ({ value: String(p.id), label: p.name }))}
                placeholder="Semua Package"
              />
            )}

            {entity === "promotion" && (
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
            )}

            {(search || activeFilter || packageFilter || chargeTypeFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setActiveFilter("");
                  setPackageFilter("");
                  setChargeTypeFilter("");
                  setPage(1);
                }}
                className="flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => changeScope(scope === "DELETED" ? "ACTIVE" : "DELETED")}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition ${
                  scope === "DELETED"
                    ? "border-gray-800 bg-gray-800 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {scope === "DELETED" ? "Kembali" : "Trash"}
              </button>
              {scope !== "DELETED" && (
                <button
                  onClick={() => {
                    if (entity === "package") setPackageForm({ mode: "create" });
                    else if (entity === "plan") setPlanForm({ mode: "create" });
                    else setPromotionForm({ mode: "create" });
                  }}
                  className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216] active:scale-[0.98]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {addLabel}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-semibold text-gray-600 md:text-sm">
            <thead className="bg-[#C92C1E] text-white">
              <tr>
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={currentIds.length > 0 && currentIds.every((id) => selectedIds.has(id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                {entity === "package" && (
                  <>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Kode</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Nama</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Level</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Status</th>
                  </>
                )}
                {entity === "plan" && (
                  <>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Kode</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Nama</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Package</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Tenor</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Harga</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Status</th>
                  </>
                )}
                {entity === "promotion" && (
                  <>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Kode</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Nama</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Tipe</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Biaya</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Benefit</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Status</th>
                  </>
                )}
                <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">Memuat...</td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-red-500">{loadError}</td>
                </tr>
              ) : currentIds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-gray-400">
                    Tidak ada data.
                  </td>
                </tr>
              ) : entity === "package" ? (
                packages.map((p) => (
                  <tr key={p.id} className="hover:bg-red-50/30">
                    <td className="px-4 py-3.5 text-center">
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-gray-700">{p.code}</td>
                    <td className="px-4 py-3.5 font-black text-gray-800">{p.name}</td>
                    <td className="px-4 py-3.5">{p.level_order}</td>
                    <td className="px-4 py-3.5"><StatusBadge active={p.active} /></td>
                    <td className="px-4 py-3.5">
                      <RowActions
                        scope={scope}
                        onEdit={() => setPackageForm({ mode: "edit", item: p })}
                        onDelete={() => setConfirmTarget({ kind: "delete", ids: [p.id] })}
                        onRestore={() => setConfirmTarget({ kind: "restore", ids: [p.id] })}
                        onForceDelete={() => setConfirmTarget({ kind: "forceDelete", ids: [p.id] })}
                      />
                    </td>
                  </tr>
                ))
              ) : entity === "plan" ? (
                plans.map((p) => (
                  <tr key={p.id} className="hover:bg-red-50/30">
                    <td className="px-4 py-3.5 text-center">
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-gray-700">{p.code}</td>
                    <td className="px-4 py-3.5 font-black text-gray-800">{p.name}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-black text-orange-600">
                        {p.package.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">{p.tenure_months} bln</td>
                    <td className="px-4 py-3.5 font-black text-gray-800">{formatRupiah(p.price)}</td>
                    <td className="px-4 py-3.5"><StatusBadge active={p.active} /></td>
                    <td className="px-4 py-3.5">
                      <RowActions
                        scope={scope}
                        onEdit={() => setPlanForm({ mode: "edit", item: p })}
                        onDelete={() => setConfirmTarget({ kind: "delete", ids: [p.id] })}
                        onRestore={() => setConfirmTarget({ kind: "restore", ids: [p.id] })}
                        onForceDelete={() => setConfirmTarget({ kind: "forceDelete", ids: [p.id] })}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                promotions.map((p) => (
                  <tr key={p.id} className="hover:bg-red-50/30">
                    <td className="px-4 py-3.5 text-center">
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-gray-700">{p.code}</td>
                    <td className="px-4 py-3.5 font-black text-gray-800">{p.name}</td>
                    <td className="px-4 py-3.5">{p.promotion_type}</td>
                    <td className="px-4 py-3.5">
                      {p.charge_type === "FREE" ? (
                        <span className="font-black text-emerald-600">Gratis</span>
                      ) : (
                        <span className="font-black text-gray-800">{formatRupiah(p.additional_charge)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">{p.benefits?.length || 0} benefit</td>
                    <td className="px-4 py-3.5"><StatusBadge active={p.active} /></td>
                    <td className="px-4 py-3.5">
                      <RowActions
                        scope={scope}
                        onEdit={() => setPromotionForm({ mode: "edit", item: p })}
                        onDelete={() => setConfirmTarget({ kind: "delete", ids: [p.id] })}
                        onRestore={() => setConfirmTarget({ kind: "restore", ids: [p.id] })}
                        onForceDelete={() => setConfirmTarget({ kind: "forceDelete", ids: [p.id] })}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

      {/* === BULK ACTION BAR === */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          isTrash={scope === "DELETED"}
          onClear={resetSelection}
          onDelete={() => setConfirmTarget({ kind: "delete", ids: Array.from(selectedIds) })}
          onRestore={() => setConfirmTarget({ kind: "restore", ids: Array.from(selectedIds) })}
          onForceDelete={() => setConfirmTarget({ kind: "forceDelete", ids: Array.from(selectedIds) })}
        />
      )}

      {/* === MODALS === */}
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
            confirmTarget.kind === "delete" ? "Hapus" : confirmTarget.kind === "restore" ? "Pulihkan" : "Hapus Permanen"
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
  onEdit,
  onDelete,
  onRestore,
  onForceDelete,
}: {
  scope: CatalogScope;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onForceDelete: () => void;
}) {
  if (scope === "DELETED") {
    return (
      <div className="flex items-center gap-3">
        <button onClick={onRestore} className="text-gray-400 transition hover:scale-110 hover:text-emerald-600" title="Pulihkan">
          <ArchiveRestore className="h-4 w-4" />
        </button>
        <button onClick={onForceDelete} className="text-gray-400 transition hover:scale-110 hover:text-red-600" title="Hapus Permanen">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <button onClick={onEdit} className="text-gray-400 transition hover:scale-110 hover:text-[#C92C1E]" title="Edit">
        <Pencil className="h-4 w-4" />
      </button>
      <button onClick={onDelete} className="text-gray-400 transition hover:scale-110 hover:text-red-600" title="Hapus">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ============================================================
// PACKAGE FORM MODAL
// ============================================================

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
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup label="Kode Package" required>
          <input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="Contoh: PRO"
            className={inputClass}
          />
        </FieldGroup>
        <FieldGroup label="Nama Package" required>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Contoh: Pro"
            className={inputClass}
          />
        </FieldGroup>
        <FieldGroup label="Level Order" required>
          <input
            type="number"
            min={1}
            value={form.level_order}
            onChange={(e) => setForm((f) => ({ ...f, level_order: Number(e.target.value) }))}
            className={inputClass}
          />
        </FieldGroup>
        <FieldGroup label="Deskripsi">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className={inputClass}
          />
        </FieldGroup>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />
          Aktif
        </label>
        {error && <p className="text-xs font-bold text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
            Batal
          </button>
          <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-[#C92C1E] py-2.5 text-sm font-black text-white hover:bg-[#A82216] disabled:opacity-60">
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================
// PLAN FORM MODAL
// ============================================================

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
      const payload = { ...form, effective_to: form.effective_to || undefined };
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup label="Package" required>
          <select
            value={form.package_id}
            onChange={(e) => setForm((f) => ({ ...f, package_id: Number(e.target.value) }))}
            className={inputClass}
          >
            <option value={0}>Pilih package...</option>
            {packageOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup label="Kode Plan" required>
          <input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="Contoh: PRO_12_MONTHS"
            className={inputClass}
          />
        </FieldGroup>
        <FieldGroup label="Nama Plan" required>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Contoh: Pro 12 Bulan"
            className={inputClass}
          />
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Tenor (bulan)" required>
            <input
              type="number"
              min={1}
              value={form.tenure_months}
              onChange={(e) => setForm((f) => ({ ...f, tenure_months: Number(e.target.value) }))}
              className={inputClass}
            />
          </FieldGroup>
          <FieldGroup label="Harga (IDR)" required>
            <input
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="990000.00"
              className={inputClass}
            />
          </FieldGroup>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Berlaku Dari" required>
            <input
              type="date"
              value={form.effective_from}
              onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
              className={inputClass}
            />
          </FieldGroup>
          <FieldGroup label="Berlaku Sampai">
            <input
              type="date"
              value={form.effective_to}
              onChange={(e) => setForm((f) => ({ ...f, effective_to: e.target.value }))}
              className={inputClass}
            />
          </FieldGroup>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />
          Aktif
        </label>
        {error && <p className="text-xs font-bold text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
            Batal
          </button>
          <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-[#C92C1E] py-2.5 text-sm font-black text-white hover:bg-[#A82216] disabled:opacity-60">
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================
// PROMOTION FORM MODAL (+ Benefit + Eligible Plans)
// ============================================================

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
  const [savedPromotion, setSavedPromotion] = useState<CatalogPromotionItem | null>(item || null);
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
      const payload = { ...form, effective_to: form.effective_to || undefined };
      let result: CatalogPromotionItem;
      if (mode === "edit" && item) result = await promotionApi.update(item.id, payload);
      else result = await promotionApi.create(payload);
      setSavedPromotion(result);
      if (mode === "create") {
        // Setelah promosi dibuat, tetap di modal supaya user bisa langsung
        // kelola Benefit + eligible-plans (butuh promotion_id, tidak bisa
        // sebelum promosi ada).
        return;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan promosi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={mode === "edit" ? "Edit Promosi" : savedPromotion ? "Kelola Benefit & Eligibilitas" : "Tambah Promosi Baru"}
      subtitle="Master Promotion"
      icon={<Tag className="h-5 w-5" />}
      onClose={savedPromotion && mode === "create" ? onSaved : onClose}
      wide
    >
      {!savedPromotion || mode === "edit" ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Kode Promosi" required>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                className={inputClass}
              />
            </FieldGroup>
            <FieldGroup label="Nama Promosi" required>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
            </FieldGroup>
          </div>
          <FieldGroup label="Tipe Promosi" required>
            <input
              list="promotion-type-suggestions"
              value={form.promotion_type}
              onChange={(e) => setForm((f) => ({ ...f, promotion_type: e.target.value }))}
              placeholder="cth: FREE_DURATION"
              className={inputClass}
            />
            <datalist id="promotion-type-suggestions">
              {PROMOTION_TYPE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
            </datalist>
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Tipe Biaya" required>
              <div className="flex overflow-hidden rounded-xl border border-gray-200">
                {(["FREE", "PAID"] as const).map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, charge_type: ct }))}
                    className={`flex-1 py-2 text-xs font-black transition ${
                      form.charge_type === ct ? "bg-[#C92C1E] text-white" : "bg-white text-gray-500 hover:bg-gray-50"
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
                  onChange={(e) => setForm((f) => ({ ...f, additional_charge: e.target.value }))}
                  className={inputClass}
                />
              </FieldGroup>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Berlaku Dari" required>
              <input
                type="date"
                value={form.effective_from}
                onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
                className={inputClass}
              />
            </FieldGroup>
            <FieldGroup label="Berlaku Sampai">
              <input
                type="date"
                value={form.effective_to}
                onChange={(e) => setForm((f) => ({ ...f, effective_to: e.target.value }))}
                className={inputClass}
              />
            </FieldGroup>
          </div>
          <FieldGroup label="Prioritas">
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
              className={inputClass}
            />
          </FieldGroup>
          <FieldGroup label="Deskripsi">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className={inputClass}
            />
          </FieldGroup>
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Aktif
          </label>
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
              Batal
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-[#C92C1E] py-2.5 text-sm font-black text-white hover:bg-[#A82216] disabled:opacity-60">
              {isSaving ? "Menyimpan..." : mode === "edit" ? "Simpan Perubahan" : "Simpan & Lanjut"}
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
  const [benefits, setBenefits] = useState<CatalogBenefitItem[]>(promotion.benefits || []);
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
        duration_days: benefitDurationDays ? Number(benefitDurationDays) : undefined,
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
      setBenefitError(err instanceof Error ? err.message : "Gagal menambah benefit.");
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
      alert(err instanceof Error ? err.message : "Gagal menyimpan eligibilitas.");
    } finally {
      setIsSavingEligibility(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
        Promosi &quot;{promotion.name}&quot; tersimpan. Tambahkan benefit dan tentukan plan mana yang
        eligible di bawah, lalu tutup modal ini untuk selesai.
      </div>

      {/* Benefits */}
      <div>
        <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">Benefit</h3>
        <div className="space-y-2">
          {benefits.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 text-xs">
              <div>
                <span className="font-black text-gray-800">{b.benefit_type}</span>
                {b.package && <span className="ml-2 text-gray-500">· {b.package.name}</span>}
                {b.duration_days != null && <span className="ml-2 text-gray-500">· {b.duration_days} hari</span>}
                {b.quantity != null && <span className="ml-2 text-gray-500">· qty {b.quantity}</span>}
              </div>
              <button onClick={() => void handleDeleteBenefit(b.id)} className="text-gray-400 hover:text-red-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {benefits.length === 0 && <p className="text-xs text-gray-400">Belum ada benefit.</p>}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-dashed border-gray-200 p-3">
          <input
            list="benefit-type-suggestions"
            placeholder="Tipe benefit"
            value={benefitType}
            onChange={(e) => setBenefitType(e.target.value)}
            className={inputClass}
          />
          <datalist id="benefit-type-suggestions">
            {BENEFIT_TYPE_SUGGESTIONS.map((t) => <option key={t} value={t} />)}
          </datalist>
          <select value={benefitPackageId} onChange={(e) => setBenefitPackageId(Number(e.target.value))} className={inputClass}>
            <option value={0}>Package (opsional)</option>
            {packageOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input
            type="number"
            placeholder="Durasi (hari)"
            value={benefitDurationDays}
            onChange={(e) => setBenefitDurationDays(e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            placeholder="Qty"
            value={benefitQuantity}
            onChange={(e) => setBenefitQuantity(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Deskripsi"
            value={benefitDescription}
            onChange={(e) => setBenefitDescription(e.target.value)}
            className={`col-span-2 ${inputClass}`}
          />
          {benefitError && <p className="col-span-2 text-[10px] font-bold text-red-600">{benefitError}</p>}
          <button
            type="button"
            onClick={() => void handleAddBenefit()}
            disabled={isAddingBenefit}
            className="col-span-2 rounded-lg bg-gray-800 py-2 text-xs font-black text-white hover:bg-gray-900 disabled:opacity-60"
          >
            {isAddingBenefit ? "Menambahkan..." : "+ Tambah Benefit"}
          </button>
        </div>
      </div>

      {/* Eligible Plans */}
      <div>
        <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">Eligible untuk Plan</h3>
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-gray-100 p-2">
          {plans.map((pl) => (
            <label key={pl.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50">
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

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onDone} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
          Selesai Nanti
        </button>
        <button
          type="button"
          onClick={() => void handleSaveEligibility()}
          disabled={isSavingEligibility}
          className="flex-1 rounded-xl bg-[#C92C1E] py-2.5 text-sm font-black text-white hover:bg-[#A82216] disabled:opacity-60"
        >
          {isSavingEligibility ? "Menyimpan..." : "Simpan Eligibilitas & Selesai"}
        </button>
      </div>
    </div>
  );
}
