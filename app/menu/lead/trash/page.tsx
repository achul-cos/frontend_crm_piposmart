"use client";

// Lead — Riwayat Hapus (trash) page.
//
// IMPORTANT data-source note (see Step 1 of the rebuild task): this app has no
// separate "lead" soft-delete concept. On the main lead table
// (app/menu/lead/page.tsx), the delete action (moveItemsToTrash /
// handleHapusSatuData) calls bulkSoftDeleteOwners()/softDeleteOwner() against
// the OWNER behind the lead (leads are 1:1 with owners via the
// customer_leads unique-per-owner constraint) — there is no
// restoreLead/hardDeleteLead/fetchLeads({scope:"trash"}) anywhere in
// app/lib/api.ts. "Deleting a lead" IS "soft-deleting its owner". So this
// page correctly keeps querying/restoring/hard-deleting via the Owner API
// (fetchOwners({scope:"trash"}), restoreOwner, hardDeleteOwner,
// bulkForceDeleteOwners) — that already was, and remains, the right entity.
// What was wrong before was everything else: a reduced/reshaped local
// interface and a completely different (red-header) table that didn't match
// the main lead table's columns, filters, sorting or ColumnVisibilityControl.
// This rewrite keeps the same data source but renders it through the same
// row shape/columns/filters/markup as app/menu/lead/page.tsx.

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchOwners,
  restoreOwner,
  hardDeleteOwner,
  bulkForceDeleteOwners,
  getSalesList,
  getSupervisorList,
  getProfile,
  isAdminRole,
  isSupervisorRole,
  type BackendOwner,
  type UserResponse,
} from "@/app/lib/api";
import { formatPhoneDisplay } from "@/app/lib/phone";
import { useFeedback } from "@/app/components/feedback/FeedbackContext";
import ColumnVisibilityControl from "@/app/components/table/ColumnVisibilityControl";
import {
  RowActionGroup,
  RestoreActionButton,
  DeleteActionButton,
} from "@/app/components/table/RowActionButton";

// Same row shape as the main lead table's NasabahItem (trimmed to the fields
// this trash view actually renders/filters on) so both tables stay
// structurally identical.
interface NasabahItem {
  no: number;
  ownerId?: number;
  pic: string;
  picRole?: string;
  previousPic?: string;
  tanggalDibagikan: string;
  statusAkun: string;
  kodeOwner: string;
  kodeOutlet?: string;
  namaOwner: string;
  namaOutlet?: string;
  projectBrand: string;
  outlet: string;
  noHpOwner: string;
  noHpOutlet: string;
  createDateProject: string;
  scor: number;
}

const LIST_SKOR = [
  { value: "0", label: "Tidak Potensial (0)" },
  { value: "1", label: "Kemungkinan (1)" },
  { value: "2", label: "Potensial (2)" },
  { value: "3", label: "Langganan (3)" },
];

const getSkorValueFromItem = (item?: Partial<NasabahItem> | null) => String(item?.scor ?? "0");

function getQuickSkorBadgeClass(item: NasabahItem) {
  const value = getSkorValueFromItem(item);
  if (value === "3") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (value === "2") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (value === "1") return "bg-orange-50 text-orange-700 border border-orange-200";
  return "bg-gray-50 text-gray-600 border border-gray-200";
}

function getSkorLabelFromItem(item: NasabahItem) {
  const skorValue = getSkorValueFromItem(item);
  return LIST_SKOR.find((row) => row.value === skorValue)?.label || "Tidak Potensial (0)";
}

function SkorBadge({ item }: { item: NasabahItem }) {
  const label = getSkorLabelFromItem(item);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-center text-[10px] font-black uppercase tracking-tight whitespace-nowrap ${getQuickSkorBadgeClass(item)}`}
      title={label}
    >
      {label}
    </span>
  );
}

function PicBadge({
  value,
  role,
  salesList = [],
  supervisorList = [],
}: {
  value: string;
  role?: string;
  salesList?: UserResponse[];
  supervisorList?: UserResponse[];
}) {
  const rawVal = String(value || "").trim();
  const normalizedVal = rawVal.toLowerCase();
  const normalizedRole = String(role || "").trim().toUpperCase();

  const isNoPic =
    !rawVal ||
    normalizedVal === "" ||
    normalizedVal === "-" ||
    normalizedVal === "no pic" ||
    normalizedVal === "belum ada pic" ||
    normalizedVal.includes("invalid");

  let colorClass = "bg-blue-50 border-blue-200 text-blue-700 font-black";
  let label = rawVal || "Belum Ada PIC";

  if (isNoPic) {
    colorClass = "bg-slate-100 border-slate-200 text-slate-500 font-semibold";
    label = "Belum Ada PIC";
  } else {
    let effectiveRole = normalizedRole;
    if (!effectiveRole) {
      if (salesList.some((s) => s.name.toLowerCase() === normalizedVal)) {
        effectiveRole = "SALES";
      } else if (supervisorList.some((s) => s.name.toLowerCase() === normalizedVal)) {
        effectiveRole = "SUPERVISOR";
      }
    }

    if (effectiveRole === "SUPERVISOR") {
      colorClass = "bg-purple-50 border-purple-200 text-purple-700 font-black";
    } else if (effectiveRole === "ADMIN") {
      colorClass = "bg-amber-50 border-amber-200 text-amber-800 font-black";
    } else {
      colorClass = "bg-blue-50 border-blue-200 text-blue-700 font-black";
    }
  }

  return (
    <span
      className={`inline-flex max-w-[150px] items-center justify-center rounded-full border px-2.5 py-1 text-center text-[10px] uppercase tracking-tight ${colorClass}`}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

const formatIndonesianDate = (value?: string | null, includeTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
};

// Owner is the underlying entity backing a lead; the trashed-owner record
// doesn't carry lead-pipeline-only fields (PIC assignment, previous PIC,
// score) since those live on customer_leads, which has no trash endpoint of
// its own. Those columns are still rendered (kept structurally identical to
// the main table) but will read as "Belum Ada PIC" / "Tidak Potensial (0)"
// for trashed rows — that's the best available data, not a mapping bug.
const mapOwnerToNasabahItem = (owner: BackendOwner): NasabahItem => ({
  no: owner.id,
  ownerId: owner.id,
  pic: "-",
  picRole: undefined,
  previousPic: "-",
  tanggalDibagikan: owner.updated_at || "",
  statusAkun: owner.status,
  kodeOwner: owner.code,
  kodeOutlet: "-",
  namaOwner: owner.name,
  namaOutlet: owner.outlet_count ? `${owner.outlet_count} Outlet` : "-",
  projectBrand: owner.brand_name || "-",
  outlet: owner.outlet_count ? `${owner.outlet_count} Outlet` : "-",
  noHpOwner: owner.phone ? formatPhoneDisplay(owner.phone) : "-",
  noHpOutlet: "-",
  createDateProject: owner.created_at || "",
  scor: 0,
});

export default function LeadTrashPage() {
  const { showSuccess, showError, confirm, withLoading } = useFeedback();

  const [dataNasabah, setDataNasabah] = useState<NasabahItem[]>([]);
  const [salesList, setSalesList] = useState<UserResponse[]>([]);
  const [supervisorList, setSupervisorList] = useState<UserResponse[]>([]);
  const [isAdminState, setIsAdminState] = useState(false);

  const [search, setSearch] = useState("");
  const [searchKodeOwner, setSearchKodeOwner] = useState("");
  const [searchNamaOwner, setSearchNamaOwner] = useState("");
  const [searchNamaBrand, setSearchNamaBrand] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [picFilter, setPicFilter] = useState("Semua");
  const [previousPicFilter, setPreviousPicFilter] = useState<string[]>([]);
  const [skorFilter, setSkorFilter] = useState("Semua");
  const [sort, setSort] = useState<string>("no");
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const combinedPicList = useMemo(() => [...supervisorList, ...salesList], [supervisorList, salesList]);

  const fetchTrashData = () => {
    fetchOwners({ scope: "trash", limit: 1000 })
      .then((res) => {
        setDataNasabah(res.data.items.map(mapOwnerToNasabahItem));
      })
      .catch((err) => {
        console.error("Gagal memuat data lead terhapus:", err);
        setDataNasabah([]);
      });
  };

  useEffect(() => {
    fetchTrashData();

    getProfile()
      .then((me) => {
        if (!me) return;
        const userRole = me.role_code || me.role || "ADMIN";
        const isAdmin = isAdminRole(userRole);
        const isSupervisor = isSupervisorRole(userRole);

        setIsAdminState(isAdmin);

        if (isAdmin) {
          getSalesList().then(setSalesList).catch(console.error);
          getSupervisorList().then(setSupervisorList).catch(console.error);
        } else if (isSupervisor) {
          getSalesList().then(setSalesList).catch(console.error);
        }
      })
      .catch((err) => console.error("Failed to load profile in lead trash page:", err));
  }, []);

  const uniquePreviousPics = useMemo(() => {
    const set = new Set<string>();
    dataNasabah.forEach((item) => {
      if (item.previousPic && item.previousPic !== "-") {
        item.previousPic.split(",").forEach((name) => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== "-") set.add(trimmed);
        });
      }
    });
    return Array.from(set).filter(Boolean);
  }, [dataNasabah]);

  const displayData = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    const kodeKeyword = searchKodeOwner.toLowerCase().trim();
    const namaKeyword = searchNamaOwner.toLowerCase().trim();
    const brandKeyword = searchNamaBrand.toLowerCase().trim();

    let rows = dataNasabah.filter((item) => {
      if (keyword) {
        const haystack = [item.kodeOwner, item.namaOwner, item.projectBrand, item.outlet, item.pic, item.noHpOwner]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      if (kodeKeyword && !item.kodeOwner?.toLowerCase().includes(kodeKeyword)) return false;
      if (namaKeyword && !(item.namaOwner?.toLowerCase().includes(namaKeyword) || item.namaOutlet?.toLowerCase().includes(namaKeyword))) return false;
      if (brandKeyword && !item.projectBrand?.toLowerCase().includes(brandKeyword)) return false;

      if (startDateFilter || endDateFilter) {
        const rowDate = item.createDateProject ? item.createDateProject.substring(0, 10) : "";
        if (startDateFilter && (!rowDate || rowDate < startDateFilter)) return false;
        if (endDateFilter && (!rowDate || rowDate > endDateFilter)) return false;
      }

      if (picFilter !== "Semua") {
        if (picFilter === "No PIC") {
          if (item.pic && item.pic !== "-") return false;
        } else if (picFilter.startsWith("ROLE:")) {
          if ((item.picRole || "").toUpperCase() !== picFilter.replace("ROLE:", "")) return false;
        } else if (item.pic !== picFilter) {
          return false;
        }
      }

      if (skorFilter !== "Semua" && getSkorValueFromItem(item) !== skorFilter) return false;

      if (previousPicFilter.length > 0) {
        if (previousPicFilter.includes("__NONE__")) return false;
        if (!item.previousPic || item.previousPic === "-") return true;
        const pics = item.previousPic.split(",").map((s) => s.trim()).filter(Boolean);
        if (!pics.every((p) => previousPicFilter.includes(p))) return false;
      }

      return true;
    });

    if (sort && sort !== "no" && sort !== "-no") {
      const isDesc = sort.startsWith("-");
      const key = sort.replace("-", "") as keyof NasabahItem;
      rows = [...rows].sort((a, b) => {
        const av = String(a[key] ?? "");
        const bv = String(b[key] ?? "");
        return isDesc ? bv.localeCompare(av) : av.localeCompare(bv);
      });
    }

    return rows;
  }, [
    dataNasabah,
    search,
    searchKodeOwner,
    searchNamaOwner,
    searchNamaBrand,
    startDateFilter,
    endDateFilter,
    picFilter,
    skorFilter,
    previousPicFilter,
    sort,
  ]);

  // Note: unlike the main lead table (which resets to page 1 in a useEffect
  // on filter change), we simply clamp via safeCurrentPage below — avoids an
  // extra setState-in-effect render pass while keeping the same UX (an
  // out-of-range page after filtering snaps back into range).
  const totalPages = Math.max(1, Math.ceil(displayData.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages) || 1;
  const startDataIndex = (safeCurrentPage - 1) * rowsPerPage;
  const paginatedData = useMemo(
    () => displayData.slice(startDataIndex, startDataIndex + rowsPerPage),
    [displayData, startDataIndex, rowsPerPage],
  );

  const currentPageIds = useMemo(() => paginatedData.map((item) => item.no), [paginatedData]);
  const isAllCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAllCurrentPage = () => {
    if (currentPageIds.length === 0) return;
    if (isAllCurrentPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  const handleRestoreSelected = async () => {
    if (selectedIds.length === 0) {
      showError({
        title: "Belum ada data dipilih",
        message: "Pilih data yang ingin dipulihkan dulu.",
        solution: "Centang minimal satu data terlebih dahulu.",
      });
      return;
    }

    const selectedSet = new Set(selectedIds);
    const restoreItems = dataNasabah.filter((item) => selectedSet.has(item.no));

    const confirmed = await confirm({
      title: "Pulihkan Data",
      message: `Pulihkan ${restoreItems.length} data terpilih dari Riwayat Hapus?`,
      confirmLabel: "Pulihkan",
    });
    if (!confirmed) return;

    const restoreOwnerIds = restoreItems.map((item) => item.ownerId).filter((id): id is number => id !== undefined);
    if (restoreOwnerIds.length === 0) return;

    try {
      await withLoading(() => Promise.all(restoreOwnerIds.map((id) => restoreOwner(id))), {
        label: "Memulihkan data...",
      });
      showSuccess({ title: "Data dipulihkan", message: `${restoreItems.length} data berhasil dipulihkan.` });
      fetchTrashData();
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      showError({
        title: "Gagal memulihkan data",
        message: "Sistem gagal memulihkan data yang dipilih.",
        cause: "Bisa disebabkan oleh koneksi bermasalah.",
        solution: "Periksa koneksi Anda dan coba lagi.",
        technicalDetails: err instanceof Error ? err.message : String(err),
        onRetry: () => void handleRestoreSelected(),
      });
    }
  };

  const handleRestoreSingle = async (item: NasabahItem) => {
    if (item.ownerId === undefined) return;

    const confirmed = await confirm({
      title: "Pulihkan Data",
      message: `Pulihkan data "${item.namaOwner}" dari Riwayat Hapus?`,
      confirmLabel: "Pulihkan",
    });
    if (!confirmed) return;

    try {
      await withLoading(() => restoreOwner(item.ownerId as number), { label: "Memulihkan data..." });
      showSuccess({ title: "Data dipulihkan", message: "Data berhasil dipulihkan." });
      fetchTrashData();
      setSelectedIds((prev) => prev.filter((id) => id !== item.no));
    } catch (err) {
      console.error(err);
      showError({
        title: "Gagal memulihkan data",
        message: "Sistem gagal memulihkan data.",
        cause: "Bisa disebabkan oleh koneksi bermasalah.",
        solution: "Periksa koneksi Anda dan coba lagi.",
        technicalDetails: err instanceof Error ? err.message : String(err),
        onRetry: () => void handleRestoreSingle(item),
      });
    }
  };

  const handleDeletePermanentSelected = async () => {
    if (selectedIds.length === 0) {
      showError({
        title: "Belum ada data dipilih",
        message: "Pilih data yang ingin dihapus permanen dulu.",
        solution: "Centang minimal satu data terlebih dahulu.",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Hapus Permanen",
      message: `Yakin ingin menghapus permanen ${selectedIds.length} data? Data ini tidak bisa dipulihkan lagi.`,
      confirmLabel: "Hapus Permanen",
      danger: true,
    });
    if (!confirmed) return;

    const selectedSet = new Set(selectedIds);
    const deletedItems = dataNasabah.filter((item) => selectedSet.has(item.no));
    const hardDeleteOwnerIds = deletedItems.map((item) => item.ownerId).filter((id): id is number => id !== undefined);
    if (hardDeleteOwnerIds.length === 0) return;

    try {
      await withLoading(() => bulkForceDeleteOwners(hardDeleteOwnerIds), { label: "Menghapus permanen data..." });
      showSuccess({ title: "Data dihapus permanen", message: `${selectedSet.size} data berhasil dihapus permanen.` });
      fetchTrashData();
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      showError({
        title: "Gagal menghapus permanen data",
        message: "Sistem gagal menghapus data yang dipilih secara permanen.",
        cause: "Bisa disebabkan oleh koneksi bermasalah.",
        solution: "Periksa koneksi Anda dan coba lagi.",
        technicalDetails: err instanceof Error ? err.message : String(err),
        onRetry: () => void handleDeletePermanentSelected(),
      });
    }
  };

  const handleDeletePermanentSingle = async (item: NasabahItem) => {
    if (item.ownerId === undefined) return;

    const confirmed = await confirm({
      title: "Hapus Permanen",
      message: `Yakin ingin menghapus permanen data "${item.namaOwner}"? Data ini tidak bisa dipulihkan lagi.`,
      confirmLabel: "Hapus Permanen",
      danger: true,
    });
    if (!confirmed) return;

    try {
      await withLoading(() => hardDeleteOwner(item.ownerId as number), { label: "Menghapus permanen data..." });
      showSuccess({ title: "Data dihapus permanen", message: "Data berhasil dihapus permanen." });
      fetchTrashData();
      setSelectedIds((prev) => prev.filter((id) => id !== item.no));
    } catch (err) {
      console.error(err);
      showError({
        title: "Gagal menghapus permanen data",
        message: "Sistem gagal menghapus data secara permanen.",
        cause: "Bisa disebabkan oleh koneksi bermasalah.",
        solution: "Periksa koneksi Anda dan coba lagi.",
        technicalDetails: err instanceof Error ? err.message : String(err),
        onRetry: () => void handleDeletePermanentSingle(item),
      });
    }
  };

  const handleEmptyTrash = async () => {
    if (dataNasabah.length === 0) return;

    const confirmed = await confirm({
      title: "Kosongkan Riwayat Hapus",
      message: `Yakin ingin mengosongkan seluruh riwayat hapus (${dataNasabah.length} data)? Data tidak bisa dipulihkan lagi.`,
      confirmLabel: "Kosongkan",
      danger: true,
    });
    if (!confirmed) return;

    const hardDeleteOwnerIds = dataNasabah.map((item) => item.ownerId).filter((id): id is number => id !== undefined);
    if (hardDeleteOwnerIds.length === 0) return;

    try {
      await withLoading(() => bulkForceDeleteOwners(hardDeleteOwnerIds), { label: "Mengosongkan riwayat hapus..." });
      showSuccess({ title: "Riwayat hapus dikosongkan", message: "Riwayat hapus berhasil dikosongkan." });
      fetchTrashData();
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      showError({
        title: "Gagal mengosongkan riwayat hapus",
        message: "Sistem gagal mengosongkan riwayat hapus.",
        cause: "Bisa disebabkan oleh koneksi bermasalah.",
        solution: "Periksa koneksi Anda dan coba lagi.",
        technicalDetails: err instanceof Error ? err.message : String(err),
        onRetry: () => void handleEmptyTrash(),
      });
    }
  };

  const renderFilterHeader = (key: string, label: string, value: string, setter: (val: string) => void) => {
    const isSorted = sort.replace("-", "") === key;
    const isDesc = sort.startsWith("-");

    return (
      <th className="px-4 py-4 min-w-[150px] font-bold relative group whitespace-nowrap">
        <div className="flex items-center gap-2 select-none">
          <div
            className="flex items-center gap-1 cursor-pointer hover:text-red-700 transition-colors"
            onClick={() => setSort(sort === key ? `-${key}` : key)}
            title={`Urutkan berdasarkan ${label}`}
          >
            {label}
            <div className="flex flex-col -space-y-1 opacity-40 group-hover:opacity-100 transition-opacity">
              <svg className={`w-2.5 h-2.5 ${isSorted && !isDesc ? "text-[#C92C1E] opacity-100" : ""}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
              <svg className={`w-2.5 h-2.5 ${isSorted && isDesc ? "text-[#C92C1E] opacity-100" : ""}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </div>
          </div>
          <svg
            className={`w-3.5 h-3.5 transition-colors cursor-pointer ml-1 ${value ? "text-[#C92C1E]" : "text-gray-400 hover:text-gray-600"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
            onClick={() => setOpenFilter(openFilter === key ? null : key)}
          >
            <title>{`Filter ${label}`}</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        {openFilter === key && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)}></div>
            <div className="absolute top-full left-4 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-2 transform origin-top">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm font-semibold text-gray-600">Cari {label}</span>
              </div>
              <input
                type="text"
                placeholder="Ketik untuk mencari..."
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 font-normal focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
                value={value}
                onChange={(e) => setter(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") setOpenFilter(null);
                }}
              />
            </div>
          </>
        )}
      </th>
    );
  };

  return (
    <div className="space-y-6 font-sans text-[#1C1C1E] max-w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/60 shadow-xs">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Lead Terhapus
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Data lead yang telah dihapus dan dapat dipulihkan kembali. Pilih data lalu gunakan tombol Pulihkan untuk mengembalikannya, atau Hapus Permanen untuk menghapusnya selamanya.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/menu/lead"
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            ← Kembali Ke Tabel
          </Link>

          <button
            onClick={handleEmptyTrash}
            disabled={dataNasabah.length === 0}
            className="px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-black hover:bg-red-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Kosongkan Trash
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Bulk action bar */}
        <div className="border-b border-gray-50 px-6 py-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleToggleSelectAllCurrentPage}
            disabled={currentPageIds.length === 0}
            className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black hover:bg-gray-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAllCurrentPageSelected ? "Batal Pilih Semua" : `Pilih Semua Halaman Ini (${currentPageIds.length})`}
          </button>

          <button
            onClick={handleRestoreSelected}
            disabled={selectedIds.length === 0}
            className="px-3.5 py-2 bg-emerald-600 border border-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            Pulihkan Terpilih ({selectedIds.length})
          </button>

          <button
            onClick={handleDeletePermanentSelected}
            disabled={selectedIds.length === 0}
            className="px-3.5 py-2 bg-red-600 border border-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            Hapus Permanen ({selectedIds.length})
          </button>
        </div>

        {/* Global Search & Column Visibility Bar */}
        <div className="border-b border-gray-50 px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full items-center gap-3 md:w-96">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Cari kode, nama owner, outlet, brand, PIC..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600">
                <span className="text-gray-400">Tanggal:</span>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="bg-transparent focus:outline-none text-gray-700 cursor-pointer"
                />
                <span className="text-gray-300">s/d</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="bg-transparent focus:outline-none text-gray-700 cursor-pointer"
                />
                {(startDateFilter || endDateFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDateFilter("");
                      setEndDateFilter("");
                    }}
                    className="ml-1 text-gray-400 hover:text-red-600 font-bold"
                    title="Reset filter tanggal"
                  >
                    ✕
                  </button>
                )}
              </div>

              <ColumnVisibilityControl tableId="lead-table-trash" storageKey="column-visibility:lead-table-trash" buttonLabel="Kolom" />
            </div>
          </div>
        </div>

        {/* Table WorkSpace */}
        <div className="max-w-full overflow-x-auto">
          <table id="lead-table-trash" data-column-visibility-manual="true" className="w-full min-w-[1080px] text-left text-sm text-gray-600">
            <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-y border-gray-200">
              <tr>
                <th className="px-4 py-4 text-center w-12">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={handleToggleSelectAllCurrentPage}
                    className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                    title="Pilih semua data di halaman ini"
                  />
                </th>

                <th className="px-4 py-4 text-center font-bold">No</th>
                {renderFilterHeader("kodeOwner", "Kode", searchKodeOwner, setSearchKodeOwner)}
                {renderFilterHeader("namaOutlet", "Nama Outlet", searchNamaOwner, setSearchNamaOwner)}
                {renderFilterHeader("namaOwner", "Nama Owner", searchNamaOwner, setSearchNamaOwner)}
                {renderFilterHeader("projectBrand", "Brand", searchNamaBrand, setSearchNamaBrand)}
                <th className="px-4 py-4 min-w-[150px] font-bold">Kontak</th>
                <th className="px-4 py-4 min-w-[140px] font-bold whitespace-nowrap">Tgl Dibuat</th>
                <th className="px-4 py-4 min-w-[180px] font-bold whitespace-nowrap">Tgl Dibagikan</th>

                <th className="px-4 py-4 min-w-[160px] font-bold relative group whitespace-nowrap">
                  <div
                    className="flex items-center justify-center gap-2 select-none cursor-pointer hover:text-red-700 transition-colors"
                    onClick={() => setOpenFilter(openFilter === "prevPic" ? null : "prevPic")}
                  >
                    <span className="flex items-center gap-1.5 text-center truncate max-w-[130px]">
                      {previousPicFilter.length === 0 ? "PIC Sebelumnya" : `${previousPicFilter.length} Terpilih`}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 transition-colors ml-1 flex-shrink-0 ${previousPicFilter.length > 0 ? "text-[#C92C1E]" : "text-gray-400 group-hover:text-gray-600"}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <title>Filter PIC Sebelumnya</title>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                  {openFilter === "prevPic" && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)}></div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-3 text-left">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                          <span className="text-xs font-bold text-gray-800">PIC Sebelumnya</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviousPicFilter(previousPicFilter.length === 0 ? ["__NONE__"] : []);
                            }}
                            className="text-[10px] text-red-600 hover:underline font-bold"
                          >
                            {previousPicFilter.length === 0 ? "Hapus Semua" : "Pilih Semua"}
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {uniquePreviousPics.length === 0 ? (
                            <div className="text-xs text-gray-400 py-2 text-center italic">Tidak ada data PIC sebelumnya</div>
                          ) : (
                            uniquePreviousPics.map((picName) => {
                              const isChecked = previousPicFilter.length === 0 || previousPicFilter.includes(picName);
                              return (
                                <label key={picName} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        const next = [...previousPicFilter.filter((p) => p !== "__NONE__"), picName];
                                        setPreviousPicFilter(next.length >= uniquePreviousPics.length ? [] : next);
                                      } else {
                                        const current = previousPicFilter.length === 0 ? uniquePreviousPics : previousPicFilter;
                                        const next = current.filter((p) => p !== picName);
                                        setPreviousPicFilter(next.length === 0 ? ["__NONE__"] : next);
                                      }
                                    }}
                                    className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                                  />
                                  <span className="truncate">{picName}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </th>

                <th className="px-4 py-4 min-w-[150px] font-bold relative group whitespace-nowrap">
                  <div
                    className="flex items-center justify-center gap-2 select-none cursor-pointer hover:text-red-700 transition-colors"
                    onClick={() => setOpenFilter(openFilter === "pic" ? null : "pic")}
                  >
                    <span className="flex items-center gap-1.5 text-center truncate max-w-[120px]">
                      {picFilter === "Semua" ? "PIC Sales" : (
                        picFilter === "No PIC" ? "Belum Ada PIC" :
                        picFilter === "ROLE:ADMIN" ? "Semua Admin" :
                        picFilter === "ROLE:SUPERVISOR" ? "Semua Supervisor" :
                        picFilter === "ROLE:SALES" ? "Semua Sales" : picFilter
                      )}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 transition-colors ml-1 flex-shrink-0 ${picFilter !== "Semua" ? "text-[#C92C1E]" : "text-gray-400 group-hover:text-gray-600"}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <title>Filter PIC Sales</title>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                  {openFilter === "pic" && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)}></div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-2 transform origin-top text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-600">Filter PIC Sales</span>
                        </div>
                        <select
                          value={picFilter}
                          onChange={(e) => {
                            setPicFilter(e.target.value);
                            setOpenFilter(null);
                          }}
                          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-700 shadow-sm focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] transition-all"
                        >
                          <option value="Semua">Semua PIC</option>
                          <option value="No PIC">Belum Ada PIC</option>
                          <optgroup label="Berdasarkan Role">
                            <option value="ROLE:ADMIN">Semua Admin</option>
                            <option value="ROLE:SUPERVISOR">Semua Supervisor</option>
                            <option value="ROLE:SALES">Semua Sales</option>
                          </optgroup>
                          <optgroup label="Berdasarkan Nama PIC">
                            {combinedPicList.map((pic) => (
                              <option key={`${pic.id}-${pic.name}`} value={pic.name}>
                                {pic.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </>
                  )}
                </th>

                <th className="px-4 py-4 min-w-[150px] font-bold relative group whitespace-nowrap">
                  <div
                    className="flex items-center justify-center gap-2 select-none cursor-pointer hover:text-red-700 transition-colors"
                    onClick={() => setOpenFilter(openFilter === "skor" ? null : "skor")}
                  >
                    <span className="flex items-center gap-1.5 text-center truncate max-w-[120px]">
                      {skorFilter === "Semua" ? "Skor" : (LIST_SKOR.find((s) => s.value === skorFilter)?.label || skorFilter)}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 transition-colors ml-1 flex-shrink-0 ${skorFilter !== "Semua" ? "text-[#C92C1E]" : "text-gray-400 group-hover:text-gray-600"}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <title>Filter Skor</title>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                  {openFilter === "skor" && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)}></div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-2 transform origin-top text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-600">Filter Skor</span>
                        </div>
                        <select
                          value={skorFilter}
                          onChange={(e) => {
                            setSkorFilter(e.target.value);
                            setOpenFilter(null);
                          }}
                          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-700 shadow-sm focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] transition-all"
                        >
                          <option value="Semua">Semua Skor</option>
                          {LIST_SKOR.map((skor) => (
                            <option key={skor.value} value={skor.value}>
                              {skor.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </th>
                <th className="px-4 py-4 text-center font-bold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-gray-400 font-bold italic">
                    Tidak ada data lead terhapus pada rentang filter ini.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => (
                  <tr
                    key={`lead-trash-row-${row.no}`}
                    className={`transition-colors cursor-pointer select-none ${
                      selectedIds.includes(row.no) ? "bg-red-100/70 hover:bg-red-100" : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleToggleSelectRow(row.no)}
                  >
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.no)}
                        onChange={() => handleToggleSelectRow(row.no)}
                        className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                      />
                    </td>

                    <td className="px-4 py-4 text-center align-top font-medium text-gray-500 whitespace-nowrap">
                      {startDataIndex + idx + 1}
                    </td>

                    <td className="px-4 py-4 align-top font-medium text-gray-900 whitespace-normal break-words max-w-[150px]">
                      {row.kodeOutlet && row.kodeOutlet !== "-" ? row.kodeOutlet : row.kodeOwner || "-"}
                    </td>

                    <td className="px-4 py-4 align-top font-medium text-gray-900 whitespace-normal break-words max-w-[220px]">
                      <div className="font-bold text-gray-900 font-sans">{row.namaOutlet || "-"}</div>
                    </td>

                    <td className="px-4 py-4 align-top font-medium text-gray-900 whitespace-normal break-words max-w-[200px]">
                      <div className="font-bold text-gray-900">{row.namaOwner || "-"}</div>
                      {row.kodeOwner && row.kodeOwner !== "-" && (
                        <div className="text-xs font-medium text-gray-400 mt-0.5">({row.kodeOwner})</div>
                      )}
                    </td>

                    <td className="px-4 py-4 align-top text-gray-700 whitespace-normal break-words max-w-[200px]">
                      {row.projectBrand || "-"}
                    </td>

                    <td className="px-4 py-4 align-top text-gray-700 whitespace-normal break-words max-w-[160px]">
                      {row.noHpOutlet && row.noHpOutlet !== "-" ? row.noHpOutlet : (row.noHpOwner || "-")}
                    </td>

                    <td className="px-4 py-4 align-top text-gray-700 whitespace-nowrap font-medium text-xs">
                      {formatIndonesianDate(row.createDateProject)}
                    </td>

                    <td className="px-4 py-4 align-top text-gray-700 whitespace-nowrap font-medium text-xs">
                      {formatIndonesianDate(row.tanggalDibagikan, true)}
                    </td>

                    <td className="px-4 py-4 align-top text-gray-700 whitespace-normal break-words max-w-[180px] text-xs font-medium">
                      {(() => {
                        if (!row.previousPic || row.previousPic === "-") {
                          return <span className="text-gray-400 font-medium">-</span>;
                        }
                        const picList = row.previousPic.split(",").map((name) => name.trim()).filter((name) => name && name !== "-");
                        if (picList.length === 0) return <span className="text-gray-400 font-medium">-</span>;
                        return (
                          <ul className="space-y-1 list-none p-0 m-0">
                            {picList.map((trimmed, index) => (
                              <li key={index} className="flex items-start gap-1.5 text-gray-800 font-semibold">
                                <span className="text-slate-400 font-bold select-none min-w-[16px]">{index + 1}.</span>
                                <span>{trimmed}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </td>

                    <td className="px-4 py-4 align-top text-center">
                      <PicBadge value={row.pic || ""} role={row.picRole} salesList={salesList} supervisorList={supervisorList} />
                    </td>

                    <td className="px-4 py-4 align-top text-center">
                      <SkorBadge item={row} />
                    </td>

                    <td className="px-4 py-4 align-top text-center" onClick={(e) => e.stopPropagation()}>
                      <RowActionGroup>
                        <RestoreActionButton onClick={() => handleRestoreSingle(row)} title="Pulihkan data" />
                        {isAdminState && (
                          <DeleteActionButton onClick={() => handleDeletePermanentSingle(row)} title="Hapus permanen" permanent />
                        )}
                      </RowActionGroup>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-gray-100 bg-gray-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-gray-500 hidden sm:inline-block">
              Total {displayData.length} Owner
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Tampilkan</span>
              <select
                value={rowsPerPage}
                onChange={(event) => {
                  setRowsPerPage(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#C92C1E]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-xs font-medium text-gray-500">baris</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-xs font-bold text-[#C92C1E]">Halaman {safeCurrentPage}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage >= totalPages || totalPages === 0}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
