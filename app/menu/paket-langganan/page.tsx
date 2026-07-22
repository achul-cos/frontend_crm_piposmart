"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Filter,
  RotateCcw,
  Download,
  Eye,
  Pencil,
  Copy,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Tag,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  CalendarDays,
  Package,
  Users,
  DollarSign,
  FileText,
  Info,
} from "lucide-react";
import {
  type PromoItem,
  type PaketType,
  type KategoriNasabah,
  type PromoStatus,
  INITIAL_PROMOS,
  PACKAGE_PRICES,
  PAKET_OPTIONS,
  KATEGORI_OPTIONS,
  STATUS_OPTIONS,
  TENOR_OPTIONS,
  PAKET_LABELS,
  KATEGORI_LABELS,
  STATUS_LABELS,
  calculateHargaNormal,
  calculateHargaPromo,
  calculateTotalMasaAktif,
  formatRupiah,
  formatCompactRupiah,
  formatDateID,
  formatDateTimeID,
  generatePromoId,
} from "@/app/lib/promo-data";
import * as XLSX from "xlsx";
import { StatusBadge, PaketBadge, KategoriBadge } from './badge/page';
import { SkeletonRows, ThSortable, type SortField, type SortDirection } from './sort/page';
import DeleteDialog from './delete/page';
import ViewDrawer from './view/page';
import FormDrawer from './form/page';
import ActionButtons from './action/page';

// ============================================================
// CONSTANTS
// ============================================================

const ROWS_PER_PAGE = 10;


type DrawerMode = null | "view" | "create" | "edit";

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function MasterPromoPage() {
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterPaket, setFilterPaket] = useState<PaketType | "">("");
  const [filterKategori, setFilterKategori] = useState<KategoriNasabah | "">("");
  const [filterStatus, setFilterStatus] = useState<PromoStatus | "">("");
  const [filterPeriodeStart, setFilterPeriodeStart] = useState("");
  const [filterPeriodeEnd, setFilterPeriodeEnd] = useState("");

  // Sort
  const [sortField, setSortField] = useState<SortField>("namaPromo");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Drawers & dialogs
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedPromo, setSelectedPromo] = useState<PromoItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromoItem | null>(null);

  // Init dummy data (simulated loading)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPromos(INITIAL_PROMOS);
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerMode || deleteTarget) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
      return () => {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      };
    }
  }, [drawerMode, deleteTarget]);

  // --- Stats ---

  const stats = useMemo(() => {
    const active = promos.filter((p) => p.status === "active").length;
    const expired = promos.filter((p) => p.status === "expired").length;
    const totalClosing = promos.reduce((sum, p) => sum + p.jumlahClosing, 0);
    const totalRevenue = promos.reduce((sum, p) => sum + p.totalRevenue, 0);
    return { active, expired, totalClosing, totalRevenue };
  }, [promos]);

  // --- Filtered & Sorted Data ---

  const filteredData = useMemo(() => {
    let data = [...promos];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.namaPromo.toLowerCase().includes(q) ||
          PAKET_LABELS[p.paket].toLowerCase().includes(q) ||
          KATEGORI_LABELS[p.kategoriNasabah].toLowerCase().includes(q),
      );
    }

    // Filters
    if (filterPaket) data = data.filter((p) => p.paket === filterPaket);
    if (filterKategori) data = data.filter((p) => p.kategoriNasabah === filterKategori);
    if (filterStatus) data = data.filter((p) => p.status === filterStatus);
    if (filterPeriodeStart) data = data.filter((p) => p.periodeStart >= filterPeriodeStart);
    if (filterPeriodeEnd) data = data.filter((p) => p.periodeEnd <= filterPeriodeEnd);

    // Sort
    data.sort((a, b) => {
      let cmp = 0;
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        cmp = aVal.localeCompare(bVal, "id");
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return data;
  }, [promos, search, filterPaket, filterKategori, filterStatus, filterPeriodeStart, filterPeriodeEnd, sortField, sortDir]);

  // --- Pagination ---

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ROWS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice(
    (safeCurrentPage - 1) * ROWS_PER_PAGE,
    safeCurrentPage * ROWS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterPaket, filterKategori, filterStatus, filterPeriodeStart, filterPeriodeEnd]);

  // --- Handlers ---

  const resetFilters = () => {
    setSearch("");
    setFilterPaket("");
    setFilterKategori("");
    setFilterStatus("");
    setFilterPeriodeStart("");
    setFilterPeriodeEnd("");
    setCurrentPage(1);
  };

  const hasActiveFilters = search || filterPaket || filterKategori || filterStatus || filterPeriodeStart || filterPeriodeEnd;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const openCreate = () => {
    setSelectedPromo(null);
    setDrawerMode("create");
  };

  const openView = (promo: PromoItem) => {
    setSelectedPromo(promo);
    setDrawerMode("view");
  };

  const openEdit = (promo: PromoItem) => {
    setSelectedPromo(promo);
    setDrawerMode("edit");
  };



  const handleSave = (promo: PromoItem) => {
    setPromos((prev) => {
      const idx = prev.findIndex((p) => p.id === promo.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = promo;
        return updated;
      }
      return [promo, ...prev];
    });
    setDrawerMode(null);
    setSelectedPromo(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setPromos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleExport = () => {
    const exportData = filteredData.map((p, i) => ({
      No: i + 1,
      "Nama Promo": p.namaPromo,
      Paket: PAKET_LABELS[p.paket],
      "Kategori Nasabah": KATEGORI_LABELS[p.kategoriNasabah],
      "Tenor (bln)": p.tenor,
      "Bonus (bln)": p.bonus,
      "Total Masa Aktif (bln)": p.totalMasaAktif,
      "Harga Normal": p.hargaNormal,
      Diskon: p.diskon,
      "Harga Promo": p.hargaPromo,
      Status: STATUS_LABELS[p.status],
      "Jumlah Closing": p.jumlahClosing,
      "Total Revenue": p.totalRevenue,
      "Periode Mulai": p.periodeStart,
      "Periode Berakhir": p.periodeEnd,
      "Dibuat Oleh": p.createdBy,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Promo");
    XLSX.writeFile(wb, `Master_Promo_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // --- Sort Icon Helper ---

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-[#C92C1E]" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-[#C92C1E]" />
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6 font-sans text-[#1C1C1E]">
      {/* === BREADCRUMB + HEADER === */}
      <div>


        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
                <Tag className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#C92C1E]">Manajemen</p>
                <h1 className="text-2xl font-black text-gray-950">Paket Langganan</h1>
              </div>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#A82518] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Tambah Promo
          </button>
        </div>
      </div>

      {/* === STAT CARDS === */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Promo Aktif"
          value={String(stats.active)}
          color="emerald"
          loading={isLoading}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Promo Berakhir"
          value={String(stats.expired)}
          color="gray"
          loading={isLoading}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total Digunakan"
          value={String(stats.totalClosing)}
          suffix="closing"
          color="blue"
          loading={isLoading}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Revenue"
          value={formatCompactRupiah(stats.totalRevenue)}
          color="red"
          loading={isLoading}
        />
      </div>

      {/* === TABLE CARD === */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden w-full">
        {/* Toolbar */}
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari promo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-3 text-sm font-bold text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-1 focus:ring-[#C92C1E]/20"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                value={filterPaket}
                onChange={(v) => setFilterPaket(v as PaketType | "")}
                options={PAKET_OPTIONS}
                placeholder="Semua Paket"
              />
              <FilterSelect
                value={filterKategori}
                onChange={(v) => setFilterKategori(v as KategoriNasabah | "")}
                options={KATEGORI_OPTIONS}
                placeholder="Semua Kategori"
              />

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              )}

              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm font-semibold text-gray-600 border-collapse table-auto">
            <thead className="sticky top-0 z-10 bg-[#C92C1E] text-white">
              <tr>
                <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90 text-center w-12">No</th>
                <ThSortable label="Nama Promo" field="namaPromo" onSort={handleSort} sortField={sortField} sortDir={sortDir} />
                <ThSortable label="Paket" field="paket" onSort={handleSort} sortField={sortField} sortDir={sortDir} />
                <ThSortable label="Kategori" field="kategoriNasabah" onSort={handleSort} sortField={sortField} sortDir={sortDir} />
                <ThSortable label="Tenor + Bonus" field="tenor" onSort={handleSort} sortField={sortField} sortDir={sortDir} />
                <ThSortable label="Harga Promo" field="hargaPromo" onSort={handleSort} sortField={sortField} sortDir={sortDir} />

                <ThSortable label="Closing" field="jumlahClosing" onSort={handleSort} sortField={sortField} sortDir={sortDir} />

                <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <SkeletonRows count={5} />
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                        <FileText className="h-7 w-7 text-gray-300" />
                      </div>
                      <p className="text-sm font-black text-gray-400">Tidak ada data promo</p>
                      <p className="text-xs font-medium text-gray-400">
                        {hasActiveFilters ? "Coba ubah filter pencarian Anda." : "Mulai dengan menambahkan promo baru."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((promo, index) => (
                  <tr
                    key={promo.id}
                    onClick={() => openView(promo)}
                    className="group cursor-pointer transition-colors hover:bg-red-50/30"
                  >
                    <td className="px-4 py-3.5 text-center font-bold text-gray-500">
                      {(safeCurrentPage - 1) * ROWS_PER_PAGE + index + 1}
                    </td>
                    <td className="max-w-[200px] px-4 py-3.5">
                      <p className="break-words font-black text-gray-800">{promo.namaPromo}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <PaketBadge paket={promo.paket} />
                    </td>
                    <td className="px-4 py-3.5">
                      <KategoriBadge kategori={promo.kategoriNasabah} />
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold text-gray-600">
                      {promo.tenor} + {promo.bonus} bln
                    </td>
                    <td className="px-4 py-3.5 font-black text-gray-800">
                      {formatRupiah(promo.hargaPromo)}
                    </td>

                    <td className="px-4 py-3.5 text-center font-black text-gray-700">
                      {promo.jumlahClosing}
                    </td>

                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <ActionButtons
                        promo={promo}
                        onView={() => openView(promo)}
                        onEdit={() => openEdit(promo)}
                        onDelete={() => setDeleteTarget(promo)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && filteredData.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5">
            <p className="text-xs font-bold text-gray-400">
              Menampilkan {(safeCurrentPage - 1) * ROWS_PER_PAGE + 1}–
              {Math.min(safeCurrentPage * ROWS_PER_PAGE, filteredData.length)} dari {filteredData.length} promo
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 min-w-[2rem] rounded-lg text-xs font-black transition ${page === safeCurrentPage
                    ? "bg-[#C92C1E] text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100"
                    }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* === DRAWERS & DIALOGS === */}

      {drawerMode === "view" && selectedPromo && (
        <ViewDrawer
          promo={selectedPromo}
          onClose={() => { setDrawerMode(null); setSelectedPromo(null); }}
          onEdit={() => setDrawerMode("edit")}
        />
      )}

      {(drawerMode === "create" || drawerMode === "edit") && (
        <FormDrawer
          mode={drawerMode === "edit" ? "edit" : "create"}
          existingPromo={selectedPromo}
          onClose={() => { setDrawerMode(null); setSelectedPromo(null); }}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          promo={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS: Stat Card, Filter Select, Sort TH, Action Button
// ============================================================

function StatCard({
  icon,
  label,
  value,
  suffix,
  color,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  color: "emerald" | "gray" | "blue" | "red";
  loading: boolean;
}) {
  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", text: "text-emerald-700" },
    gray: { bg: "bg-gray-50", icon: "text-gray-500", text: "text-gray-600" },
    blue: { bg: "bg-blue-50", icon: "text-blue-600", text: "text-blue-700" },
    red: { bg: "bg-red-50", icon: "text-[#C92C1E]", text: "text-[#C92C1E]" },
  };
  const c = colorMap[color];

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ${c.icon}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</p>
          {loading ? (
            <div className="mt-1 h-6 w-16 animate-pulse rounded-lg bg-gray-100" />
          ) : (
            <p className={`text-xl font-black ${c.text}`}>
              {value}
              {suffix && <span className="ml-1 text-xs font-bold text-gray-400">{suffix}</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
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
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
