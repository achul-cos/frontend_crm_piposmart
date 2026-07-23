"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Package,
  Tag,
  Pencil,
  PowerOff,
  FileText,
  Power,
  Package2,
} from "lucide-react";
import {
  type MasterPaket,
  type MasterPromo,
  type PaketStatus,
  type KategoriNasabah,
  type JenisPromo,
  type PromoStatus,
  INITIAL_PAKETS,
  INITIAL_MASTER_PROMOS,
  PAKET_STATUS_LABELS,
  KATEGORI_LABELS,
  JENIS_LABELS,
  PROMO_STATUS_LABELS,
  formatRupiahPL,
  findPaketById,
  getAktifPakets,
} from "@/app/lib/paket-langganan-data";
import FormPaketDrawer from "./master-paket/form-paket/page";
import FormPromoDrawer from "./master-promo/form-promo/page";

// ============================================================
// CONSTANTS
// ============================================================

// ============================================================
// SHARED COMPONENTS
// ============================================================

type SortDir = "asc" | "desc";

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
  onRowsPerPageChange?: (p: number) => void;
}) {
  if (totalItems === 0) return null;
  const start = (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, totalItems);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 px-5 py-4">
      <p className="text-xs font-bold text-gray-400">
        Menampilkan <span className="text-gray-700">{start} - {end}</span> dari <span className="text-gray-700">{totalItems}</span> data
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onRowsPerPageChange && (
          <select
            value={rowsPerPage}
            onChange={(e) => {
              onRowsPerPageChange(Number(e.target.value));
              onPageChange(1); // Reset page to 1 when changing rows per page
            }}
            className="h-8 cursor-pointer rounded-lg border border-gray-100 bg-gray-50/50 px-2 text-[11px] font-black text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
          >
            {[10, 25, 50, 100].map((val) => (
              <option key={val} value={val}>
                {val} / halaman
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="h-8 rounded-lg border border-gray-100 bg-white px-3 text-[11px] font-black text-gray-400 transition hover:bg-gray-50 disabled:opacity-40"
        >
          Awal
        </button>
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
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="h-8 rounded-lg border border-gray-100 bg-white px-3 text-[11px] font-black text-gray-400 transition hover:bg-gray-50 disabled:opacity-40"
        >
          Akhir
        </button>
      </div>
    </div>
  );
}

function SkeletonTable({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="h-4 rounded-lg bg-gray-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState({
  colSpan,
  hasFilter,
}: {
  colSpan: number;
  hasFilter: boolean;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <FileText className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-sm font-black text-gray-400">Tidak ada data</p>
          <p className="text-xs font-medium text-gray-400">
            {hasFilter
              ? "Coba ubah filter pencarian."
              : "Mulai dengan menambahkan data baru."}
          </p>
        </div>
      </td>
    </tr>
  );
}

// ============================================================
// BADGE COMPONENTS
// ============================================================

function PaketStatusBadge({ status }: { status: PaketStatus }) {
  if (status === "aktif") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        Aktif
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Nonaktif
    </span>
  );
}

function PromoStatusBadge({ status }: { status: PromoStatus }) {
  if (status === "aktif") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        Aktif
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Nonaktif
    </span>
  );
}

function KategoriBadge({ kategori }: { kategori: KategoriNasabah }) {
  if (kategori === "existing") {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-black text-orange-600">
        Existing
      </span>
    );
  }
  if (kategori === "all") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-black text-blue-600">
        New &amp; Existing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-700">
      Baru
    </span>
  );
}

function JenisBadge({ jenis }: { jenis: JenisPromo }) {
  if (jenis === "bundling") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-black text-violet-700">
        <Package2 className="h-3 w-3" />
        Bundling
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-black text-blue-700">
      Reguler
    </span>
  );
}

function PaketNameBadge({ namaPaket }: { namaPaket: string }) {
  const lower = namaPaket.toLowerCase();
  if (lower === "pro") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-black text-red-600">
        Pro
      </span>
    );
  }
  if (lower === "business") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-black text-green-700">
        Business
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-black text-orange-600">
      {namaPaket}
    </span>
  );
}

// ============================================================
// DELETE CONFIRM DIALOG
// ============================================================

function DeleteConfirmDialog({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
          <PowerOff className="h-6 w-6 text-[#C92C1E]" />
        </div>
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
            className="flex-1 rounded-xl bg-[#C92C1E] py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#A82216]"
          >
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SECTION 1 — MASTER PAKET CARD
// ============================================================

type PaketSortField = "namaPaket" | "hargaPerBulan" | "status";

function MasterPaketCard({
  pakets,
  isLoading,
  onAdd,
  onEdit,
  onToggleStatus,
}: {
  pakets: MasterPaket[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (p: MasterPaket) => void;
  onToggleStatus: (p: MasterPaket) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<PaketStatus | "">("");
  const [sortField, setSortField] = useState<PaketSortField>("namaPaket");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const hasFilter = !!(search || filterStatus);

  const resetFilters = () => {
    setSearch("");
    setFilterStatus("");
    setPage(1);
  };

  useEffect(() => setPage(1), [search, filterStatus]);

  const handleSort = (field: PaketSortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let data = [...pakets];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((p) => p.namaPaket.toLowerCase().includes(q));
    }
    if (filterStatus) data = data.filter((p) => p.status === filterStatus);
    data.sort((a, b) => {
      let cmp = 0;
      if (sortField === "namaPaket") cmp = a.namaPaket.localeCompare(b.namaPaket, "id");
      else if (sortField === "hargaPerBulan") cmp = a.hargaPerBulan - b.hargaPerBulan;
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [pakets, search, filterStatus, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const SortIcon = ({ field }: { field: PaketSortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-white/50" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-white" />
      : <ChevronDown className="h-3 w-3 text-white" />;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Card Header */}
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#C92C1E]">
              <Package className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">Master Paket</h2>
              <p className="text-[10px] font-bold text-gray-400">
                Kelola paket dasar sebagai acuan harga promo
              </p>
            </div>
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216] active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Paket
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-gray-100 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama paket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-3 text-xs font-bold text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-1 focus:ring-[#C92C1E]/20"
            />
          </div>
          <FilterSelect
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as PaketStatus | "")}
            options={[
              { value: "aktif", label: "Aktif" },
              { value: "nonaktif", label: "Nonaktif" },
            ]}
            placeholder="Semua Status"
          />
          {hasFilter && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
          <div className="ml-auto flex items-center gap-2 text-[10px] font-bold text-gray-400">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 font-black text-gray-600">
              {pakets.length} paket
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-black text-emerald-700">
              {pakets.filter((p) => p.status === "aktif").length} aktif
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs font-semibold text-gray-600 md:text-sm">
          <thead className="bg-[#C92C1E] text-white">
            <tr>
              <th className="w-12 px-4 py-3 text-center text-[11px] font-black uppercase tracking-wide text-white/90">
                No
              </th>
              <th
                onClick={() => handleSort("namaPaket")}
                className="cursor-pointer select-none px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90 transition hover:text-white"
              >
                <span className="flex items-center gap-1">
                  Nama Paket <SortIcon field="namaPaket" />
                </span>
              </th>
              <th
                onClick={() => handleSort("hargaPerBulan")}
                className="cursor-pointer select-none px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90 transition hover:text-white"
              >
                <span className="flex items-center gap-1">
                  Harga / Bulan <SortIcon field="hargaPerBulan" />
                </span>
              </th>
              <th
                onClick={() => handleSort("status")}
                className="cursor-pointer select-none px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90 transition hover:text-white"
              >
                <span className="flex items-center gap-1">
                  Status <SortIcon field="status" />
                </span>
              </th>
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <SkeletonTable cols={5} />
            ) : paginated.length === 0 ? (
              <EmptyState colSpan={5} hasFilter={hasFilter} />
            ) : (
              paginated.map((paket, idx) => (
                <tr
                  key={paket.id}
                  className="group transition-colors hover:bg-red-50/30"
                >
                  <td className="px-4 py-3.5 text-center font-bold text-gray-400">
                    {(safePage - 1) * rowsPerPage + idx + 1}
                  </td>
                  <td className="px-4 py-3.5">
                    <PaketNameBadge namaPaket={paket.namaPaket} />
                  </td>
                  <td className="px-4 py-3.5 font-black text-gray-800">
                    {formatRupiahPL(paket.hargaPerBulan)}
                    <span className="ml-1 text-[10px] font-bold text-gray-400">/ bln</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <PaketStatusBadge status={paket.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEdit(paket)}
                        className="text-gray-400 transition hover:scale-110 hover:text-[#C92C1E]"
                        title="Edit Paket"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onToggleStatus(paket)}
                        className={`transition hover:scale-110 ${
                          paket.status === "aktif"
                            ? "text-gray-400 hover:text-amber-600"
                            : "text-gray-400 hover:text-emerald-600"
                        }`}
                        title={
                          paket.status === "aktif" ? "Nonaktifkan Paket" : "Aktifkan Paket"
                        }
                      >
                        {paket.status === "aktif" ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filtered.length}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      )}
    </div>
  );
}

// ============================================================
// SECTION 2 — MASTER PROMO CARD
// ============================================================

type PromoSortField =
  | "namaPromo"
  | "paketId"
  | "kategoriNasabah"
  | "jenisPromo"
  | "tenor"
  | "bonus"
  | "hargaPromo"
  | "status";

function MasterPromoCard({
  promos,
  pakets,
  isLoading,
  onAdd,
  onEdit,
  onToggleStatus,
}: {
  promos: MasterPromo[];
  pakets: MasterPaket[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (p: MasterPromo) => void;
  onToggleStatus: (p: MasterPromo) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterPaket, setFilterPaket] = useState("");
  const [filterKategori, setFilterKategori] = useState<KategoriNasabah | "">("");
  const [filterJenis, setFilterJenis] = useState<JenisPromo | "">("");
  const [filterStatus, setFilterStatus] = useState<PromoStatus | "">("");
  const [sortField, setSortField] = useState<PromoSortField>("paketId");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const hasFilter = !!(search || filterPaket || filterKategori || filterJenis || filterStatus);

  const resetFilters = () => {
    setSearch("");
    setFilterPaket("");
    setFilterKategori("");
    setFilterJenis("");
    setFilterStatus("");
    setPage(1);
  };

  useEffect(
    () => setPage(1),
    [search, filterPaket, filterKategori, filterJenis, filterStatus]
  );

  const handleSort = (field: PromoSortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const paketOptions = useMemo(
    () => pakets.map((p) => ({ value: p.id, label: p.namaPaket })),
    [pakets]
  );

  const filtered = useMemo(() => {
    let data = [...promos];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.namaPromo.toLowerCase().includes(q) ||
          (findPaketById(pakets, p.paketId)?.namaPaket.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterPaket) data = data.filter((p) => p.paketId === filterPaket);
    if (filterKategori) data = data.filter((p) => p.kategoriNasabah === filterKategori);
    if (filterJenis) data = data.filter((p) => p.jenisPromo === filterJenis);
    if (filterStatus) data = data.filter((p) => p.status === filterStatus);
    data.sort((a, b) => {
      let cmp = 0;
      if (sortField === "namaPromo") cmp = a.namaPromo.localeCompare(b.namaPromo, "id");
      else if (sortField === "paketId") {
        const aN = findPaketById(pakets, a.paketId)?.namaPaket ?? "";
        const bN = findPaketById(pakets, b.paketId)?.namaPaket ?? "";
        cmp = aN.localeCompare(bN, "id");
      } else if (sortField === "kategoriNasabah")
        cmp = a.kategoriNasabah.localeCompare(b.kategoriNasabah);
      else if (sortField === "jenisPromo")
        cmp = a.jenisPromo.localeCompare(b.jenisPromo);
      else if (sortField === "tenor") cmp = a.tenor - b.tenor;
      else if (sortField === "bonus") cmp = a.bonus - b.bonus;
      else if (sortField === "hargaPromo") cmp = a.hargaPromo - b.hargaPromo;
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [promos, pakets, search, filterPaket, filterKategori, filterJenis, filterStatus, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const SortIcon = ({ field }: { field: PromoSortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-white/50" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-white" />
      : <ChevronDown className="h-3 w-3 text-white" />;
  };

  const ThS = ({
    label,
    field,
    className = "",
  }: {
    label: string;
    field: PromoSortField;
    className?: string;
  }) => (
    <th
      onClick={() => handleSort(field)}
      className={`cursor-pointer select-none px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90 transition hover:text-white ${className}`}
    >
      <span className="flex items-center gap-1">
        {label} <SortIcon field={field} />
      </span>
    </th>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Card Header */}
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#C92C1E]">
              <Tag className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">Master Promo</h2>
              <p className="text-[10px] font-bold text-gray-400">
                Kelola seluruh promo berdasarkan paket langganan
              </p>
            </div>
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216] active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Promo
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-gray-100 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama promo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-3 text-xs font-bold text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-1 focus:ring-[#C92C1E]/20"
            />
          </div>
          <FilterSelect
            value={filterPaket}
            onChange={setFilterPaket}
            options={paketOptions}
            placeholder="Semua Paket"
          />
          <FilterSelect
            value={filterKategori}
            onChange={(v) => setFilterKategori(v as KategoriNasabah | "")}
            options={[
              { value: "baru", label: "Baru" },
              { value: "existing", label: "Existing" },
              { value: "all", label: "New & Existing" },
            ]}
            placeholder="Semua Kategori"
          />
          <FilterSelect
            value={filterJenis}
            onChange={(v) => setFilterJenis(v as JenisPromo | "")}
            options={[
              { value: "reguler", label: "Reguler" },
              { value: "bundling", label: "Bundling" },
            ]}
            placeholder="Semua Jenis"
          />
          <FilterSelect
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as PromoStatus | "")}
            options={[
              { value: "aktif", label: "Aktif" },
              { value: "draft", label: "Draft" },
              { value: "nonaktif", label: "Nonaktif" },
            ]}
            placeholder="Semua Status"
          />
          {hasFilter && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-600">
              {promos.length} promo
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
              {promos.filter((p) => p.status === "aktif").length} aktif
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs font-semibold text-gray-600">
          <thead className="bg-[#C92C1E] text-white">
            <tr>
              <th className="w-10 px-4 py-3 text-center text-[11px] font-black uppercase tracking-wide text-white/90">
                No
              </th>
              <ThS label="Nama Promo" field="namaPromo" />
              <ThS label="Paket" field="paketId" />
              <ThS label="Kategori" field="kategoriNasabah" />
              <ThS label="Jenis" field="jenisPromo" />
              <ThS label="Tenor" field="tenor" />
              <ThS label="Bonus" field="bonus" />
              <ThS label="Harga Promo" field="hargaPromo" />
              <ThS label="Status" field="status" />
              <th className="px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <SkeletonTable cols={10} />
            ) : paginated.length === 0 ? (
              <EmptyState colSpan={10} hasFilter={hasFilter} />
            ) : (
              paginated.map((promo, idx) => {
                const paket = findPaketById(pakets, promo.paketId);
                return (
                  <tr
                    key={promo.id}
                    className="group transition-colors hover:bg-red-50/30"
                  >
                    <td className="px-4 py-3.5 text-center font-bold text-gray-400">
                      {(safePage - 1) * rowsPerPage + idx + 1}
                    </td>
                    <td className="max-w-[250px] px-4 py-3.5">
                      <p className="font-black text-gray-800 break-words">{promo.namaPromo}</p>
                      {promo.jenisPromo === "bundling" &&
                        promo.bundlingItems.length > 0 && (
                          <p className="text-[10px] font-bold text-violet-500 mt-0.5">
                            {promo.bundlingItems.length} peralatan
                          </p>
                        )}
                    </td>
                    <td className="px-4 py-3.5">
                      {paket ? (
                        <PaketNameBadge namaPaket={paket.namaPaket} />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <KategoriBadge kategori={promo.kategoriNasabah} />
                    </td>
                    <td className="px-4 py-3.5">
                      <JenisBadge jenis={promo.jenisPromo} />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-gray-700">{promo.tenor} bln</p>
                      <p className="text-[10px] font-bold text-gray-400">{promo.tenor * 30} hari</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {promo.bonus > 0 ? (
                        <>
                          <p className="font-black text-emerald-600">+{promo.bonus} bln</p>
                          <p className="text-[10px] font-bold text-blue-500">
                            {(promo.tenor + promo.bonus) * 30} hari total
                          </p>
                        </>
                      ) : (
                        <p className="font-bold text-gray-400">—</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-black text-gray-800">
                      {formatRupiahPL(promo.hargaPromo)}
                    </td>
                    <td className="px-4 py-3.5">
                      <PromoStatusBadge status={promo.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => onEdit(promo)}
                          className="text-gray-400 transition hover:scale-110 hover:text-[#C92C1E]"
                          title="Edit Promo"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onToggleStatus(promo)}
                          className={`transition hover:scale-110 ${
                            promo.status === "aktif"
                              ? "text-gray-400 hover:text-amber-600"
                              : "text-gray-400 hover:text-emerald-600"
                          }`}
                          title={
                            promo.status === "aktif"
                              ? "Nonaktifkan Promo"
                              : "Aktifkan Promo"
                          }
                        >
                          {promo.status === "aktif" ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filtered.length}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      )}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

type PaketDrawerMode = null | "create" | "edit";
type PromoDrawerMode = null | "create" | "edit";

export default function PaketLanggananPage() {
  const [pakets, setPakets] = useState<MasterPaket[]>([]);
  const [promos, setPromos] = useState<MasterPromo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Paket drawer state
  const [paketDrawerMode, setPaketDrawerMode] = useState<PaketDrawerMode>(null);
  const [selectedPaket, setSelectedPaket] = useState<MasterPaket | null>(null);
  const [togglePaketTarget, setTogglePaketTarget] = useState<MasterPaket | null>(null);

  // Promo drawer state
  const [promoDrawerMode, setPromoDrawerMode] = useState<PromoDrawerMode>(null);
  const [selectedPromo, setSelectedPromo] = useState<MasterPromo | null>(null);
  const [togglePromoTarget, setTogglePromoTarget] = useState<MasterPromo | null>(null);

  // Load data
  useEffect(() => {
    const t = setTimeout(() => {
      setPakets(INITIAL_PAKETS);
      setPromos(INITIAL_MASTER_PROMOS);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  // Lock body scroll when drawer/dialog is open
  useEffect(() => {
    const anyOpen =
      !!paketDrawerMode || !!promoDrawerMode || !!togglePaketTarget || !!togglePromoTarget;
    if (anyOpen) {
      const sb = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (sb > 0) document.body.style.paddingRight = `${sb}px`;
      return () => {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      };
    }
  }, [paketDrawerMode, promoDrawerMode, togglePaketTarget, togglePromoTarget]);

  // --- Paket Handlers ---
  const handleAddPaket = () => {
    setSelectedPaket(null);
    setPaketDrawerMode("create");
  };

  const handleEditPaket = (paket: MasterPaket) => {
    setSelectedPaket(paket);
    setPaketDrawerMode("edit");
  };

  const handleSavePaket = (paket: MasterPaket) => {
    const now = new Date().toISOString().split("T")[0];

    setPakets((prev) => {
      const idx = prev.findIndex((p) => p.id === paket.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = paket;
        return updated;
      }
      return [paket, ...prev];
    });

    // Saat harga paket berubah → recalculate hargaNormal & hargaPromo semua promo terkait
    setPromos((prev) =>
      prev.map((promo) => {
        if (promo.paketId === paket.id) {
          const hargaNormal = paket.hargaPerBulan * promo.tenor;
          const hargaPromo = Math.max(hargaNormal - promo.diskon, 0);
          return { ...promo, hargaNormal, hargaPromo, updatedAt: now };
        }
        return promo;
      })
    );

    setPaketDrawerMode(null);
    setSelectedPaket(null);
  };

  const handleTogglePaketStatus = (paket: MasterPaket) => {
    setTogglePaketTarget(paket);
  };

  const confirmTogglePaket = () => {
    if (!togglePaketTarget) return;
    const now = new Date().toISOString().split("T")[0];
    setPakets((prev) =>
      prev.map((p) =>
        p.id === togglePaketTarget.id
          ? { ...p, status: p.status === "aktif" ? "nonaktif" : "aktif", updatedAt: now }
          : p
      )
    );
    setTogglePaketTarget(null);
  };

  // --- Promo Handlers ---
  const handleAddPromo = () => {
    setSelectedPromo(null);
    setPromoDrawerMode("create");
  };

  const handleEditPromo = (promo: MasterPromo) => {
    setSelectedPromo(promo);
    setPromoDrawerMode("edit");
  };

  const handleSavePromo = (promo: MasterPromo) => {
    setPromos((prev) => {
      const idx = prev.findIndex((p) => p.id === promo.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = promo;
        return updated;
      }
      return [promo, ...prev];
    });
    setPromoDrawerMode(null);
    setSelectedPromo(null);
  };

  const handleTogglePromoStatus = (promo: MasterPromo) => {
    setTogglePromoTarget(promo);
  };

  const confirmTogglePromo = () => {
    if (!togglePromoTarget) return;
    const now = new Date().toISOString().split("T")[0];
    setPromos((prev) =>
      prev.map((p) =>
        p.id === togglePromoTarget.id
          ? { ...p, status: p.status === "aktif" ? "nonaktif" : "aktif", updatedAt: now }
          : p
      )
    );
    setTogglePromoTarget(null);
  };

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
            <h1 className="text-2xl font-black text-gray-950">Paket Langganan</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-500 shadow-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          {pakets.filter((p) => p.status === "aktif").length} paket aktif ·{" "}
          {promos.filter((p) => p.status === "aktif").length} promo aktif
        </div>
      </div>

      {/* === SECTION 1: MASTER PAKET === */}
      <MasterPaketCard
        pakets={pakets}
        isLoading={isLoading}
        onAdd={handleAddPaket}
        onEdit={handleEditPaket}
        onToggleStatus={handleTogglePaketStatus}
      />

      {/* === SECTION 2: MASTER PROMO === */}
      <MasterPromoCard
        promos={promos}
        pakets={pakets}
        isLoading={isLoading}
        onAdd={handleAddPromo}
        onEdit={handleEditPromo}
        onToggleStatus={handleTogglePromoStatus}
      />

      {/* === DRAWERS === */}
      {paketDrawerMode && (
        <FormPaketDrawer
          mode={paketDrawerMode}
          existingPaket={selectedPaket}
          onClose={() => {
            setPaketDrawerMode(null);
            setSelectedPaket(null);
          }}
          onSave={handleSavePaket}
        />
      )}

      {promoDrawerMode && (
        <FormPromoDrawer
          mode={promoDrawerMode}
          existingPromo={selectedPromo}
          pakets={pakets}
          onClose={() => {
            setPromoDrawerMode(null);
            setSelectedPromo(null);
          }}
          onSave={handleSavePromo}
        />
      )}

      {/* === CONFIRM DIALOGS === */}
      {togglePaketTarget && (
        <DeleteConfirmDialog
          title={
            togglePaketTarget.status === "aktif"
              ? `Nonaktifkan Paket "${togglePaketTarget.namaPaket}"?`
              : `Aktifkan Paket "${togglePaketTarget.namaPaket}"?`
          }
          description={
            togglePaketTarget.status === "aktif"
              ? "Paket yang dinonaktifkan tidak akan tersedia sebagai pilihan saat menambah promo baru."
              : "Paket akan kembali tersedia untuk pembuatan promo baru."
          }
          onConfirm={confirmTogglePaket}
          onCancel={() => setTogglePaketTarget(null)}
        />
      )}

      {togglePromoTarget && (
        <DeleteConfirmDialog
          title={
            togglePromoTarget.status === "aktif"
              ? `Nonaktifkan Promo "${togglePromoTarget.namaPromo}"?`
              : `Aktifkan Promo "${togglePromoTarget.namaPromo}"?`
          }
          description={
            togglePromoTarget.status === "aktif"
              ? "Promo yang dinonaktifkan tidak akan muncul pada pilihan promo saat Closing Customer."
              : "Promo akan kembali tersedia untuk digunakan pada Closing Customer."
          }
          onConfirm={confirmTogglePromo}
          onCancel={() => setTogglePromoTarget(null)}
        />
      )}
    </div>
  );
}
