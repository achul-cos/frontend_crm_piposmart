"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import dynamic from "next/dynamic";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  restoreOutletForOwner,
  forceDeleteOutletForOwner,
  bulkUpdateOutletsForOwner,
  bulkTrashOutletsForOwner,
  bulkForceDeleteOutletsForOwner,
  downloadGlobalOutletExportFile,
  type BackendOutlet,
  type OutletOverviewItem,
  type OutletSubscriptionStatusItem,
} from "@/app/lib/api";
import { useGlobalOutletsQuery, useOutletSubscriptionStatusesQuery } from "@/app/lib/queries/outlets";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import OutletFormModal from "./OutletFormModal";
import BulkEditOutletModal, { type BulkEditFields } from "./BulkEditOutletModal";
import ColumnVisibilityControl from "@/app/components/table/ColumnVisibilityControl";
import AnalyticsTabSkeleton from "@/app/components/skeleton/AnalyticsTabSkeleton";
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";

const OutletAnalytics = dynamic(() => import("./OutletAnalytics"), {
  ssr: false,
  loading: () => <AnalyticsTabSkeleton sections={2} />,
});

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

type TableState = "umum" | "langganan" | "sampah" | "analytics";

const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "TRIAL", label: "Trial" },
  { value: "TIDAK_AKTIF", label: "Tidak Aktif" },
  { value: "NEW", label: "New" },
  { value: "BERLANGGANAN", label: "Berlangganan" },
  { value: "RENEWAL", label: "Renewal" },
];

const DUE_STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "BELUM_JATUH_TEMPO", label: "Belum Jatuh Tempo" },
  { value: "AKAN_JATUH_TEMPO", label: "Akan Jatuh Tempo" },
  { value: "JATUH_TEMPO", label: "Jatuh Tempo" },
  { value: "TELAH_JATUH_TEMPO", label: "Telah Jatuh Tempo" },
  { value: "TRIAL", label: "Trial" },
];

const TIME_STATUS_OPTIONS = [
  { value: "", label: "Semua Status Outlet" },
  { value: "NEW", label: "New" },
  { value: "EXISTING", label: "Existing" },
  { value: "FUTURE", label: "Future" },
];

function getOutletTimeStatus(createdAtStr?: string, filterMonthStr?: string): string {
  if (!filterMonthStr || !createdAtStr) return "-";
  const date = new Date(createdAtStr);
  if (Number.isNaN(date.getTime())) return "-";
  const createdY = date.getFullYear();
  const createdM = date.getMonth() + 1;
  const createdMonthStr = `${createdY}-${createdM.toString().padStart(2, "0")}`;

  if (createdMonthStr === filterMonthStr) return "New";
  if (createdMonthStr < filterMonthStr) return "Existing";
  return "Future";
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function currentDateValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStartOfMonth(monthStr: string): string {
  return monthStr ? `${monthStr}-01` : "";
}

function getEndOfMonth(monthStr: string): string {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return `${monthStr}-${String(lastDay).padStart(2, "0")}`;
}

function formatIndonesianDate(value?: string | null): string {
  if (!value) return "—";
  const trimmed = value.trim();
  if (trimmed === "—" || trimmed === "-" || trimmed === "Belum Berlangganan" || trimmed === "Tidak Pernah") {
    return trimmed;
  }
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let date: Date;
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    date = new Date(Number(y), Number(m) - 1, Number(d));
  } else {
    date = new Date(trimmed);
  }
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

async function runBulkByOwner(
  items: OutletOverviewItem[],
  action: (ownerId: number, ids: number[]) => Promise<unknown>,
): Promise<{ successCount: number; failCount: number }> {
  const groups = new Map<number, number[]>();
  for (const item of items) {
    const ownerId = item.owner.id;
    if (!ownerId) continue;
    if (!groups.has(ownerId)) groups.set(ownerId, []);
    groups.get(ownerId)!.push(item.id);
  }
  let successCount = 0;
  for (const [ownerId, ids] of groups) {
    try {
      await action(ownerId, ids);
      successCount += ids.length;
    } catch {
      // ignore
    }
  }
  return { successCount, failCount: items.length - successCount };
}

export default function KelolaanOutletPage() {
  usePageTitle("Outlet");
  const [isAdmin, setIsAdmin] = useState(false);
  const [tableState, setTableState] = useState<TableState>("umum");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusLangganan, setStatusLangganan] = useState("");
  const [month, setMonth] = useState(currentMonthValue());
  const [statusJatuhTempo, setStatusJatuhTempo] = useState("");
  const [dueDateReference, setDueDateReference] = useState(currentDateValue());
  const [dueDateStart, setDueDateStart] = useState(getStartOfMonth(currentMonthValue()));
  const [dueDateEnd, setDueDateEnd] = useState(getEndOfMonth(currentMonthValue()));
  const [timeStatusFilter, setTimeStatusFilter] = useState("");

  const [filterCode, setFilterCode] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");
  const hasMoved = useRef(false);

  const [showForm, setShowForm] = useState<{ mode: "create" | "edit"; outlet?: BackendOutlet } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<{ id: number; ownerId: number; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; ownerId: number; name: string } | null>(null);
  const [isActing, setIsActing] = useState(false);

  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkTrashConfirm, setBulkTrashConfirm] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [bulkResultMessage, setBulkResultMessage] = useState<string | null>(null);

  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreActionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const overviewScope = tableState === "sampah" ? "trash" : "active";
  const overviewParams = useMemo(() => {
    let computedStart = createdFrom || undefined;
    let computedEnd = createdTo || undefined;

    if (timeStatusFilter && month) {
      const year = parseInt(month.split("-")[0]);
      const monthNum = parseInt(month.split("-")[1]);

      if (timeStatusFilter === "NEW" || timeStatusFilter === "NEW_EXISTING") {
        computedStart = `${month}-01`;
        const lastDay = new Date(year, monthNum, 0).getDate();
        computedEnd = `${month}-${String(lastDay).padStart(2, "0")}`;
      } else if (timeStatusFilter === "EXISTING") {
        const prevMonthDate = new Date(year, monthNum - 1, 0);
        const y = prevMonthDate.getFullYear();
        const m = String(prevMonthDate.getMonth() + 1).padStart(2, "0");
        const d = String(prevMonthDate.getDate()).padStart(2, "0");
        computedEnd = `${y}-${m}-${d}`;
      } else if (timeStatusFilter === "FUTURE") {
        const nextMonthDate = new Date(year, monthNum, 1);
        const y = nextMonthDate.getFullYear();
        const m = String(nextMonthDate.getMonth() + 1).padStart(2, "0");
        const d = String(nextMonthDate.getDate()).padStart(2, "0");
        computedStart = `${y}-${m}-${d}`;
      }
    }

    return {
      q: search || undefined,
      code: filterCode || undefined,
      name: filterName || undefined,
      city: filterCity || undefined,
      page,
      limit,
      start_date: computedStart,
      end_date: computedEnd,
    };
  }, [search, filterCode, filterName, filterCity, page, limit, createdFrom, createdTo, timeStatusFilter, month]);

  const subscriptionParams = useMemo(
    () => ({
      q: search || undefined,
      code: filterCode || undefined,
      name: filterName || undefined,
      city: filterCity || undefined,
      subscription_status: statusLangganan || undefined,
      status_langganan: statusLangganan || undefined,
      status_jatuh_tempo: statusJatuhTempo || undefined,
      month,
      due_date_reference: dueDateReference || undefined,
      due_date_start: dueDateStart || undefined,
      due_date_end: dueDateEnd || undefined,
      page,
      limit,
    }),
    [search, filterCode, filterName, filterCity, statusLangganan, statusJatuhTempo, month, dueDateReference, dueDateStart, dueDateEnd, page, limit],
  );

  const overviewQuery = useGlobalOutletsQuery(
    overviewParams,
    overviewScope,
    tableState === "umum" || tableState === "sampah",
  );
  const subscriptionQuery = useOutletSubscriptionStatusesQuery(
    subscriptionParams,
    tableState === "langganan",
  );

  const overviewItems = overviewQuery.data?.items ?? [];
  const subscriptionItems = subscriptionQuery.data?.items ?? [];
  const total =
    tableState === "langganan"
      ? subscriptionQuery.data?.pagination.total ?? 0
      : tableState === "analytics"
        ? 0
        : overviewQuery.data?.pagination.total ?? 0;
  const isLoading = tableState === "langganan" ? subscriptionQuery.isLoading : overviewQuery.isLoading;

  useEffect(() => {
    const activeError = tableState === "langganan" ? subscriptionQuery.error : overviewQuery.error;
    setError(activeError instanceof Error ? activeError.message : activeError ? "Gagal memuat data outlet." : null);
  }, [tableState, overviewQuery.error, subscriptionQuery.error]);

  const uniqueOverviewCodes = useMemo(
    () => Array.from(new Set(overviewItems.map((i) => i.code).filter(Boolean))),
    [overviewItems]
  );
  const uniqueOverviewNames = useMemo(
    () => Array.from(new Set(overviewItems.map((i) => i.name).filter(Boolean))),
    [overviewItems]
  );
  const uniqueOverviewOwners = useMemo(
    () => Array.from(new Set(overviewItems.map((i) => i.owner.name || "").filter(Boolean))),
    [overviewItems]
  );
  const uniqueOverviewCities = useMemo(() => {
    const list: string[] = [];
    overviewItems.forEach((i) => {
      if (i.city) list.push(i.city);
      if (i.province) list.push(i.province);
      if (i.city && i.province) list.push(`${i.city}, ${i.province}`);
    });
    return Array.from(new Set(list.filter(Boolean)));
  }, [overviewItems]);

  const uniqueSubCodes = useMemo(
    () => Array.from(new Set(subscriptionItems.map((i) => i.outlet_code).filter(Boolean))),
    [subscriptionItems]
  );
  const uniqueSubNames = useMemo(
    () => Array.from(new Set(subscriptionItems.map((i) => i.outlet_name).filter(Boolean))),
    [subscriptionItems]
  );
  const uniqueSubOwners = useMemo(
    () => Array.from(new Set(subscriptionItems.map((i) => (i.owner.name || "")).filter(Boolean))),
    [subscriptionItems]
  );
  const uniqueSubPlans = useMemo(
    () =>
      Array.from(
        new Set(
          subscriptionItems
            .map((i) => i.package_plan?.package_name)
            .filter((val): val is string => Boolean(val))
        )
      ),
    [subscriptionItems]
  );

  const filteredOverviewItems = useMemo(() => {
    return overviewItems.filter((item) => {
      if (filterCode && !item.code.toLowerCase().includes(filterCode.toLowerCase())) return false;
      if (filterName && !item.name.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (
        filterOwner &&
        !(item.owner.name || "").toLowerCase().includes(filterOwner.toLowerCase()) &&
        !(item.owner.code || "").toLowerCase().includes(filterOwner.toLowerCase())
      ) {
        return false;
      }
      if (filterCity) {
        const cityProv = `${item.city || ""} ${item.province || ""}`.toLowerCase();
        if (!cityProv.includes(filterCity.toLowerCase())) return false;
      }
      if (timeStatusFilter) {
        const status = getOutletTimeStatus(item.created_at, month);
        if ((timeStatusFilter === "NEW_EXISTING" || timeStatusFilter === "NEW") && status !== "New") return false;
        if (timeStatusFilter === "EXISTING" && status !== "Existing") return false;
        if (timeStatusFilter === "FUTURE" && status !== "Future") return false;
      }
      if (createdFrom || createdTo) {
        const createdDate = item.created_at?.slice(0, 10) || "";
        if (createdFrom && createdDate < createdFrom) return false;
        if (createdTo && createdDate > createdTo) return false;
      }
      return true;
    });
  }, [overviewItems, filterCode, filterName, filterOwner, filterCity, timeStatusFilter, month, createdFrom, createdTo]);

  const filteredSubscriptionItems = useMemo(() => {
    return subscriptionItems.filter((item) => {
      if (filterCode && !item.outlet_code.toLowerCase().includes(filterCode.toLowerCase())) return false;
      if (filterName && !item.outlet_name.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (
        filterOwner &&
        !(item.owner.name || "").toLowerCase().includes(filterOwner.toLowerCase()) &&
        !(item.owner.code || "").toLowerCase().includes(filterOwner.toLowerCase())
      ) {
        return false;
      }
      if (filterPlan) {
        const planStr = `${item.package_plan?.package_name || ""} ${item.package_plan?.plan_name || ""}`.toLowerCase();
        if (!planStr.includes(filterPlan.toLowerCase())) return false;
      }
      if (createdFrom || createdTo) {
        const createdDate = item.created_at?.slice(0, 10) || "";
        if (createdFrom && createdDate < createdFrom) return false;
        if (createdTo && createdDate > createdTo) return false;
      }
      return true;
    });
  }, [subscriptionItems, filterCode, filterName, filterOwner, filterPlan, createdFrom, createdTo]);

  // Handle Drag / Click Selection
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      hasMoved.current = false;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleToggleSelectRow = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  }, []);

  const handleRowMouseDown = (id: number, currentlySelected: boolean) => {
    setIsDragging(true);
    hasMoved.current = false;
    setDragMode(currentlySelected ? "deselect" : "select");
    
    setSelectedIds((prev) => {
      if (!currentlySelected && !prev.includes(id)) return [...prev, id];
      if (currentlySelected && prev.includes(id)) return prev.filter((selectedId) => selectedId !== id);
      return prev;
    });
  };

  const handleRowMouseEnter = (id: number) => {
    if (isDragging) {
      hasMoved.current = true;
      setSelectedIds((prev) => {
        if (dragMode === "select" && !prev.includes(id)) return [...prev, id];
        if (dragMode === "deselect" && prev.includes(id)) return prev.filter((selectedId) => selectedId !== id);
        return prev;
      });
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = localStorage.getItem("piposmart_user_role") || "";
    setIsAdmin(role === "" || role === "ADMIN");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setSelectedIds([]);
    setBulkResultMessage(null);
  }, [tableState, page, search, statusLangganan, statusJatuhTempo, dueDateReference, month, dueDateStart, dueDateEnd, timeStatusFilter, filterCode, filterName, filterOwner, filterCity, filterPlan]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const visibleCount =
    tableState === "langganan"
      ? filteredSubscriptionItems.length
      : tableState === "analytics"
        ? 0
        : filteredOverviewItems.length;
  const activeTabLabel =
    tableState === "umum"
      ? "Informasi Umum"
      : tableState === "langganan"
        ? "Langganan Outlet"
        : tableState === "sampah"
          ? "Sampah Outlet"
          : "Analitik Outlet";
  const activeTabDescription =
    tableState === "umum"
      ? "Data outlet aktif lintas owner."
      : tableState === "langganan"
        ? "Rekap status langganan per outlet."
        : tableState === "sampah"
          ? "Riwayat outlet yang sudah dihapus sementara."
          : "Dashboard diagram analitik khusus modul outlet.";

  const changeTableState = (next: TableState) => {
    setTableState(next);
    setFilterCode("");
    setFilterName("");
    setFilterOwner("");
    setFilterCity("");
    setFilterPlan("");
    setPage(1);
  };

  const refetch = () => {
    void overviewQuery.refetch();
    void subscriptionQuery.refetch();
  };

  const handleDownloadOutletExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      const { blob, disposition } = await downloadGlobalOutletExportFile({
        q: search || undefined,
        code: filterCode || undefined,
        name: filterName || undefined,
        owner_keyword: filterOwner || undefined,
        city: filterCity || undefined,
        start_date: createdFrom || undefined,
        end_date: createdTo || undefined,
        created_from: createdFrom || undefined,
        created_to: createdTo || undefined,
        date_from: createdFrom || undefined,
        date_to: createdTo || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let filename = "Data_Owner_Outlet.xlsx";
      if (disposition) {
        const match = disposition.match(/filename=\"?([^\"]+)\"?/);
        if (match) filename = match[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh file export outlet.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setIsActing(true);
    try {
      await restoreOutletForOwner(restoreTarget.ownerId, restoreTarget.id);
      setRestoreTarget(null);
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memulihkan outlet.");
    } finally {
      setIsActing(false);
    }
  };

  const handleForceDelete = async () => {
    if (!deleteTarget) return;
    setIsActing(true);
    try {
      await forceDeleteOutletForOwner(deleteTarget.ownerId, deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus outlet secara permanen.");
    } finally {
      setIsActing(false);
    }
  };

  const selectedItems = overviewItems.filter((item) => selectedIds.includes(item.id));

  const handleBulkEditSubmit = async (fields: BulkEditFields) => {
    setIsBulkActing(true);
    const result = await runBulkByOwner(selectedItems, (ownerId, ids) =>
      bulkUpdateOutletsForOwner(
        ownerId,
        ids.map((id) => ({ id, ...fields })),
      ),
    );
    setIsBulkActing(false);
    setShowBulkEdit(false);
    setSelectedIds([]);
    setBulkResultMessage(
      result.failCount > 0
        ? `${result.successCount} outlet berhasil diubah, ${result.failCount} gagal.`
        : `${result.successCount} outlet berhasil diubah.`,
    );
    refetch();
  };

  const handleBulkTrash = async () => {
    setIsBulkActing(true);
    const result = await runBulkByOwner(selectedItems, (ownerId, ids) =>
      bulkTrashOutletsForOwner(ownerId, ids),
    );
    setIsBulkActing(false);
    setBulkTrashConfirm(false);
    setSelectedIds([]);
    setBulkResultMessage(
      result.failCount > 0
        ? `${result.successCount} outlet dipindahkan ke sampah, ${result.failCount} gagal.`
        : `${result.successCount} outlet dipindahkan ke sampah.`,
    );
    refetch();
  };

  const handleBulkForceDelete = async () => {
    setIsBulkActing(true);
    const result = await runBulkByOwner(selectedItems, (ownerId, ids) =>
      bulkForceDeleteOutletsForOwner(ownerId, ids),
    );
    setIsBulkActing(false);
    setBulkDeleteConfirm(false);
    setSelectedIds([]);
    setBulkResultMessage(
      result.failCount > 0
        ? `${result.successCount} outlet dihapus permanen, ${result.failCount} gagal.`
        : `${result.successCount} outlet dihapus permanen.`,
    );
    refetch();
  };

  const isAllCurrentPageSelected =
    filteredOverviewItems.length > 0 &&
    filteredOverviewItems.every((item) => selectedIds.includes(item.id));

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOverviewItems.map((item) => item.id));
    }
  };

  return (
    <div className="space-y-6">

      {/* 1. Header Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
              <span>Menu</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#C92C1E]">Outlet</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Manajemen Outlet</h1>
            <p className="mt-1 text-sm text-gray-500 max-w-3xl">
              Data seluruh outlet lintas owner untuk informasi umum, status langganan, dan sampah outlet.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Stat Cards */}
      <QuickInfoCardGrid>
        <QuickInfoCard
          label="Total Outlet"
          value={total}
          description="Seluruh outlet lintas owner yang tercatat."
          tone="accent"
          silhouette="building"
        />
        <QuickInfoCard
          label="Ditampilkan"
          value={visibleCount}
          description="Baris yang tampil pada halaman aktif saat ini."
          tone="emerald"
        />
        <QuickInfoCard
          label="Tab Aktif"
          value={activeTabLabel}
          description={activeTabDescription}
          tone="rose"
          valueClassName="text-[2rem] md:text-[2.15rem]"
        />
        <QuickInfoCard
          label="Halaman"
          value={
            <>
              {page} <span className="text-base font-bold opacity-70">/ {totalPages}</span>
            </>
          }
          description="Posisi halaman aktif dari total halaman data."
          tone="sky"
        />
      </QuickInfoCardGrid>

      {/* 3. Tabs and Main Content Area */}
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
          <div className="flex text-sm font-bold">
            {(
              [
                { key: "umum" as const, label: "Informasi Umum" },
                { key: "langganan" as const, label: "Langganan" },
                { key: "sampah" as const, label: "Sampah" },
                { key: "analytics" as const, label: "Analitik" },
              ]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => changeTableState(tab.key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${tableState === tab.key
                  ? "bg-white text-[#C92C1E] shadow-sm"
                  : "text-gray-500 hover:bg-gray-200 hover:text-gray-900"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {tableState === "analytics" ? (
          <OutletAnalytics />
        ) : (
          <div className="flex flex-col rounded-2xl border border-gray-200/60 bg-white shadow-xs">

            {/* Table Header (Title, Desc, Actions) */}
            <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{activeTabLabel}</h2>
                <p className="mt-1 text-sm text-gray-500">{activeTabDescription}</p>
              </div>

              {/* ACTION BUTTONS (SEBELAH KIRI) */}
              <div className="flex flex-wrap items-center gap-3 w-full">
                {isAdmin && tableState !== "sampah" && (
                  <button
                    type="button"
                    onClick={() => setShowForm({ mode: "create" })}
                    className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Outlet
                  </button>
                )}

                {tableState === "umum" && (
                  <button
                    type="button"
                    onClick={() => void handleDownloadOutletExport()}
                    disabled={isExporting}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v10m0 0l-4-4m4 4l4-4M4 20h16" />
                    </svg>
                    {isExporting ? "Mengunduh..." : "Export Owner-Outlet"}
                  </button>
                )}

                {/* TOMBOL AKSI MASSAL TERPILIH DI SEBELAH KIRI */}
                {isAdmin && selectedIds.length > 0 && tableState === "umum" && (
                  <>
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-700">
                      <svg className="h-4 w-4 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                      {selectedIds.length} terpilih
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowBulkEdit(true)}
                      className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition-all hover:bg-emerald-100"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Ubah Bulk ({selectedIds.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setBulkTrashConfirm(true)}
                      className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-100"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Pindahkan ke Sampah
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="flex items-center justify-center rounded-xl border border-gray-200 bg-white h-10 w-10 text-gray-500 shadow-sm transition-all hover:bg-gray-100 hover:text-gray-900"
                      title="Batalkan Pilihan"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}

                {isAdmin && selectedIds.length > 0 && tableState === "sampah" && (
                  <button
                    type="button"
                    onClick={() => setBulkDeleteConfirm(true)}
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-100"
                  >
                    Hapus Permanen ({selectedIds.length})
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            {(tableState === "umum" || tableState === "langganan") && (
              <div className="border-b border-gray-50 px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
                  {tableState === "umum" && (
                    <>
                      <AutocompleteFilter
                        label="Kode Outlet"
                        placeholder="Filter Kode..."
                        value={filterCode}
                        onChange={setFilterCode}
                        options={uniqueOverviewCodes}
                      />
                      <AutocompleteFilter
                        label="Nama Outlet"
                        placeholder="Filter Nama Outlet..."
                        value={filterName}
                        onChange={setFilterName}
                        options={uniqueOverviewNames}
                      />
                      <AutocompleteFilter
                        label="Owner"
                        placeholder="Filter Owner..."
                        value={filterOwner}
                        onChange={setFilterOwner}
                        options={uniqueOverviewOwners}
                      />
                      <AutocompleteFilter
                        label="Kota / Provinsi"
                        placeholder="Filter Wilayah..."
                        value={filterCity}
                        onChange={setFilterCity}
                        options={uniqueOverviewCities}
                      />
                      <div className="flex flex-col gap-1.5 w-full">
                        <span className="text-xs font-semibold text-black">Status Outlet</span>
                        <select
                          value={timeStatusFilter}
                          onChange={(e) => {
                            setTimeStatusFilter(e.target.value);
                            setPage(1);
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                        >
                          {TIME_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="flex flex-col gap-1.5 w-full">
                        <span className="text-xs font-semibold text-black">Bulan Pendaftaran</span>
                        <input
                          type="month"
                          value={month}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMonth(val);
                            setDueDateStart(getStartOfMonth(val));
                            setDueDateEnd(getEndOfMonth(val));
                            setPage(1);
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 w-full">
                        <span className="text-xs font-semibold text-black">Dibuat Dari</span>
                        <input
                          type="date"
                          value={createdFrom}
                          onChange={(e) => {
                            setCreatedFrom(e.target.value);
                            setPage(1);
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 w-full">
                        <span className="text-xs font-semibold text-black">Dibuat Sampai</span>
                        <input
                          type="date"
                          value={createdTo}
                          onChange={(e) => {
                            setCreatedTo(e.target.value);
                            setPage(1);
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                        />
                      </label>
                    </>
                  )}

                  {tableState === "langganan" && (
                    <div className="col-span-full flex flex-col gap-4 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 items-end gap-4">
                        <AutocompleteFilter
                          label="Kode Outlet"
                          placeholder="Filter Kode..."
                          value={filterCode}
                          onChange={setFilterCode}
                          options={uniqueSubCodes}
                        />
                        <AutocompleteFilter
                          label="Nama Outlet"
                          placeholder="Filter Nama Outlet..."
                          value={filterName}
                          onChange={setFilterName}
                          options={uniqueSubNames}
                        />
                        <AutocompleteFilter
                          label="Owner"
                          placeholder="Filter Owner..."
                          value={filterOwner}
                          onChange={setFilterOwner}
                          options={uniqueSubOwners}
                        />
                        <AutocompleteFilter
                          label="Paket / Plan"
                          placeholder="Filter Paket..."
                          value={filterPlan}
                          onChange={setFilterPlan}
                          options={uniqueSubPlans}
                        />
                        <div className="flex flex-col gap-1.5 w-full">
                          <span className="text-xs font-semibold text-black">Status Langganan</span>
                          <select
                            value={statusLangganan}
                            onChange={(e) => {
                              setStatusLangganan(e.target.value);
                              setPage(1);
                            }}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                          >
                            {SUBSCRIPTION_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <label className="flex flex-col gap-1.5 w-full">
                          <span className="text-xs font-semibold text-black">Bulan Acuan</span>
                          <input
                            type="month"
                            value={month}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMonth(val);
                              setDueDateStart(getStartOfMonth(val));
                              setDueDateEnd(getEndOfMonth(val));
                              setPage(1);
                            }}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                          />
                        </label>
                        <div className="flex flex-col gap-1.5 w-full">
                          <span className="text-xs font-semibold text-black">Status Jatuh Tempo</span>
                          <select
                            value={statusJatuhTempo}
                            onChange={(e) => {
                              setStatusJatuhTempo(e.target.value);
                              setPage(1);
                            }}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                          >
                            {DUE_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="flex items-center justify-between">
                            <label htmlFor="dueDateReference" className="text-xs font-semibold text-black">Acuan Jatuh Tempo</label>
                            {dueDateReference && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDueDateReference("");
                                  setPage(1);
                                }}
                                className="text-[10px] font-bold text-[#C92C1E] hover:underline"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          <input
                            id="dueDateReference"
                            type="date"
                            value={dueDateReference}
                            onChange={(e) => {
                              setDueDateReference(e.target.value);
                              setPage(1);
                            }}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="flex items-center justify-between">
                            <label htmlFor="dueDateStart" className="text-xs font-semibold text-black">Dari Tanggal</label>
                            {dueDateStart && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDueDateStart("");
                                  setPage(1);
                                }}
                                className="text-[10px] font-bold text-[#C92C1E] hover:underline"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          <input
                            id="dueDateStart"
                            type="date"
                            min={month ? `${month}-01` : undefined}
                            max={month ? `${month}-${new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0).getDate()}` : undefined}
                            value={dueDateStart}
                            onChange={(e) => {
                              setDueDateStart(e.target.value);
                              setPage(1);
                            }}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="flex items-center justify-between">
                            <label htmlFor="dueDateEnd" className="text-xs font-semibold text-black">Sampai Tanggal</label>
                            {dueDateEnd && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDueDateEnd("");
                                  setPage(1);
                                }}
                                className="text-[10px] font-bold text-[#C92C1E] hover:underline"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          <input
                            id="dueDateEnd"
                            type="date"
                            min={month ? `${month}-01` : undefined}
                            max={month ? `${month}-${new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0).getDate()}` : undefined}
                            value={dueDateEnd}
                            onChange={(e) => {
                              setDueDateEnd(e.target.value);
                              setPage(1);
                            }}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search Global + Kolom */}
            <div className="border-b border-gray-50 px-6 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Cari kode outlet, nama outlet, atau owner..."
                    className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                  />
                </div>

                {tableState === "langganan" ? (
                  <ColumnVisibilityControl
                    tableId="kelolaan-outlet-subscription-table"
                    storageKey="column-visibility:kelolaan-outlet-subscription-table"
                    buttonLabel="Kolom"
                  />
                ) : (
                  <ColumnVisibilityControl
                    tableId="kelolaan-outlet-overview-table"
                    storageKey="column-visibility:kelolaan-outlet-overview-table"
                    buttonLabel="Kolom"
                  />
                )}
              </div>
            </div>

            {/* Bulk Result Message */}
            {bulkResultMessage && (
              <div className="border-b border-green-100 bg-green-50 px-6 py-3">
                <p className="text-xs font-bold text-green-800">{bulkResultMessage}</p>
              </div>
            )}

            {/* Table Content */}
            <div className="overflow-x-auto">
              {isLoading ? (
                <p className="p-10 text-center text-sm font-medium text-gray-400">Memuat data...</p>
              ) : error ? (
                <p className="p-10 text-center text-sm font-medium text-red-600">{error}</p>
              ) : tableState === "langganan" ? (
                <SubscriptionTable items={filteredSubscriptionItems} />
              ) : (
                <OverviewTable
                  items={filteredOverviewItems}
                  scope={tableState}
                  isAdmin={isAdmin}
                  selectedIds={selectedIds}
                  isAllCurrentPageSelected={isAllCurrentPageSelected}
                  onToggleSelectAll={handleToggleSelectAll}
                  onToggleSelectRow={handleToggleSelectRow}
                  onRowMouseDown={handleRowMouseDown}
                  onRowMouseEnter={handleRowMouseEnter}
                  hasMovedRef={hasMoved}
                  monthFilter={month}
                  onEdit={(outlet) => setShowForm({ mode: "edit", outlet })}
                  onRestore={(outlet) =>
                    setRestoreTarget({ id: outlet.id, ownerId: outlet.owner.id || 0, name: outlet.name })
                  }
                  onForceDelete={(outlet) =>
                    setDeleteTarget({ id: outlet.id, ownerId: outlet.owner.id || 0, name: outlet.name })
                  }
                />
              )}
            </div>

            {/* Pagination */}
            {!isLoading && !error && (
              <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 p-4 sm:flex-row">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-medium text-gray-500">
                    Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total} data
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-xs font-bold text-gray-700">Halaman {page} / {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <OutletFormModal
          mode={showForm.mode}
          outlet={showForm.outlet}
          onClose={() => setShowForm(null)}
          onSaved={() => {
            setShowForm(null);
            refetch();
          }}
        />
      )}

      {showBulkEdit && (
        <BulkEditOutletModal
          items={selectedItems}
          onClose={() => setShowBulkEdit(false)}
          onSubmit={handleBulkEditSubmit}
        />
      )}

      {restoreTarget && (
        <ConfirmDialog
          title="Pulihkan Outlet?"
          message={`"${restoreTarget.name}" akan dipulihkan dan aktif kembali.`}
          confirmLabel="Pulihkan"
          isBusy={isActing}
          onClose={() => setRestoreTarget(null)}
          onConfirm={() => void handleRestore()}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Hapus Permanen?"
          message={`"${deleteTarget.name}" akan dihapus PERMANEN dan tidak bisa dipulihkan lagi.`}
          confirmLabel="Hapus Permanen"
          danger
          isBusy={isActing}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleForceDelete()}
        />
      )}

      {bulkTrashConfirm && (
        <ConfirmDialog
          title="Pindahkan ke Sampah?"
          message={`${selectedIds.length} outlet terpilih akan dipindahkan ke sampah.`}
          confirmLabel="Pindahkan"
          isBusy={isBulkActing}
          onClose={() => setBulkTrashConfirm(false)}
          onConfirm={() => void handleBulkTrash()}
        />
      )}

      {bulkDeleteConfirm && (
        <ConfirmDialog
          title="Hapus Permanen?"
          message={`${selectedIds.length} outlet terpilih akan dihapus PERMANEN dan tidak bisa dipulihkan lagi.`}
          confirmLabel="Hapus Permanen"
          danger
          isBusy={isBulkActing}
          onClose={() => setBulkDeleteConfirm(false)}
          onConfirm={() => void handleBulkForceDelete()}
        />
      )}
    </div>
  );
}

function OverviewTable({
  items,
  scope,
  isAdmin,
  selectedIds,
  isAllCurrentPageSelected,
  onToggleSelectAll,
  onToggleSelectRow,
  onRowMouseDown,
  onRowMouseEnter,
  hasMovedRef,
  monthFilter,
  onEdit,
  onRestore,
  onForceDelete,
}: {
  items: OutletOverviewItem[];
  scope: string;
  isAdmin: boolean;
  selectedIds: number[];
  isAllCurrentPageSelected: boolean;
  onToggleSelectAll: () => void;
  onToggleSelectRow: (id: number) => void;
  onRowMouseDown: (id: number, currentlySelected: boolean) => void;
  onRowMouseEnter: (id: number) => void;
  hasMovedRef: React.MutableRefObject<boolean>;
  monthFilter: string;
  onEdit: (outlet: BackendOutlet) => void;
  onRestore: (outlet: OutletOverviewItem) => void;
  onForceDelete: (outlet: OutletOverviewItem) => void;
}) {
  const getTimeStatusBadgeClass = (status: string) => {
    if (status === "New" || status === "New Existing") return "border-blue-200 bg-blue-50 text-blue-700";
    if (status === "Existing") return "border-green-200 bg-green-50 text-green-700";
    if (status === "Future") return "border-gray-200 bg-gray-50 text-gray-600";
    return "border-gray-200 bg-gray-100 text-gray-500";
  };

  const colCount = isAdmin ? 10 : 9;

  return (
    <table id="kelolaan-outlet-overview-table" data-column-visibility-manual="true" className="w-full min-w-[900px] text-left text-sm text-gray-600">
      <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
        <tr>
          {isAdmin && (
            <th className="w-12 px-4 py-4 text-center">
              <input
                type="checkbox"
                checked={isAllCurrentPageSelected}
                onChange={onToggleSelectAll}
                className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
              />
            </th>
          )}
          <th className="px-4 py-4 font-bold">Kode Outlet</th>
          <th className="px-4 py-4 font-bold">Nama Outlet</th>
          <th className="px-4 py-4 font-bold">Owner</th>
          <th className="px-4 py-4 font-bold">Kota / Provinsi</th>
          <th className="px-4 py-4 font-bold">Kecamatan / Kelurahan</th>
          <th className="px-4 py-4 font-bold">Nama Penginput</th>
          <th className="px-4 py-4 font-bold">Tgl Dibuat</th>
          <th className="px-4 py-4 text-center font-bold">Status</th>
          <th className="px-4 py-4 text-center font-bold">Aksi</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {items.length === 0 ? (
          <tr>
            <td colSpan={colCount} className="p-8 text-center text-sm font-medium text-gray-400">
              Belum ada outlet yang ditambahkan.
            </td>
          </tr>
        ) : (
          items.map((item) => (
          <tr
            key={item.id}
            className={`transition-colors cursor-pointer select-none ${selectedIds.includes(item.id) ? "bg-red-50/60" : "hover:bg-gray-50"
              }`}
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).closest('button, a')) return;
              if (e.button !== 0) return;
              onRowMouseDown(item.id, selectedIds.includes(item.id));
            }}
            onMouseEnter={() => {
              onRowMouseEnter(item.id);
            }}
          >
            {isAdmin && (
              <td className="px-4 py-4 align-top text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  readOnly
                  className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E] pointer-events-none"
                />
              </td>
            )}
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.code}</td>
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.name}</td>
            <td className="px-4 py-4 align-top">
              {item.owner.name || "—"}
              {item.owner.code && <span className="text-gray-400"> ({item.owner.code})</span>}
            </td>
            <td className="px-4 py-4 align-top">
              {item.city || "—"}
              {item.province ? `, ${item.province}` : ""}
            </td>
            <td className="px-4 py-4 align-top">
              {item.district || "—"}
              {item.sub_district ? `, ${item.sub_district}` : ""}
            </td>
            <td className="px-4 py-4 align-top">
              {item.entered_by_name || "—"}
            </td>
            <td className="px-4 py-4 align-top font-medium text-gray-700 whitespace-nowrap">
              {formatIndonesianDate(item.created_at)}
            </td>
            <td className="px-4 py-4 align-top text-center">
              {(() => {
                const timeStatus = getOutletTimeStatus(item.created_at, monthFilter);
                return (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${getTimeStatusBadgeClass(timeStatus)}`}
                  >
                    {timeStatus}
                  </span>
                );
              })()}
            </td>
            <td className="px-4 py-4 align-top text-center">
              <div className="flex items-center justify-center gap-2">
                <Link
                  href={`/menu/kelolaan-outlet/detail?id=${item.id}`}
                  className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                  title="Lihat Detail Outlet"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </Link>
                {isAdmin && scope === "umum" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit({
                        id: item.id,
                        owner_id: item.owner.id || 0,
                        code: item.code,
                        name: item.name,
                        phone: item.phone || "",
                        province: item.province || "",
                        city: item.city || "",
                        district: item.district || "",
                        sub_district: item.sub_district || "",
                        address: item.address || "",
                      });
                    }}
                    className="rounded-lg bg-orange-50 p-2 text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-700"
                    title="Edit Outlet"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                {isAdmin && scope === "sampah" && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRestore(item); }}
                      className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                      title="Pulihkan Outlet"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onForceDelete(item); }}
                      className="rounded-lg bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      title="Hapus Permanen"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))
        )}
      </tbody>
    </table>
  );
}

function getSubscriptionStatusBadgeClass(code?: string): string {
  const c = (code || "").toUpperCase();
  if (c.includes("BERLANGGANAN") || c === "ACTIVE" || c === "SUBSCRIBE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (c.includes("AKAN") || c.includes("TELAH") || c.includes("JATUH") || c.includes("DUE")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (c === "NEW" || c === "BARU" || c === "TRIAL") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (c.includes("EXPIRED") || c.includes("UNSUBSCRIBE") || c.includes("KEDALUWARSA")) {
    return "border-rose-300 bg-rose-100/80 text-rose-800";
  }
  if (c.includes("NOT") || c.includes("TIDAK")) {
    return "border-red-200 bg-red-50 text-red-700 font-bold";
  }
  return "border-red-200 bg-red-50 text-red-700 font-bold";
}

function getStatusDisplayLabel(code?: string, fallbackLabel?: string): string {
  const c = (code || fallbackLabel || "").toUpperCase();
  if (c === "BERLANGGANAN" || c === "ACTIVE" || c === "SUBSCRIBE") return "BERLANGGANAN";
  if (c === "BERLANGGANAN 1 BULAN") return "BERLANGGANAN 1 BULAN";
  if (c === "NEW" || c === "BARU") return "NEW";
  if (c === "AKAN_JATUH_TEMPO" || c === "AKAN JATUH TEMPO") return "AKAN JATUH TEMPO";
  if (c === "JATUH_TEMPO" || c === "JATUH TEMPO") return "JATUH TEMPO";
  if (c === "TELAH_JATUH_TEMPO" || c === "TELAH JATUH TEMPO") return "TELAH JATUH TEMPO";
  if (c === "EXPIRED" || c === "UNSUBSCRIBE" || c === "KEDALUWARSA") return "UNSUBSCRIBE";
  if (c === "NOT_SUBSCRIBE" || c === "NOT SUBSCRIBE" || c === "TIDAK BERLANGGANAN") return "TIDAK BERLANGGANAN";
  if (c === "TRIAL") return "TRIAL";
  if (c === "BELUM_JATUH_TEMPO" || c === "BELUM JATUH TEMPO") return "BELUM JATUH TEMPO";
  return fallbackLabel || code || "";
}

function SubscriptionTable({ items }: { items: OutletSubscriptionStatusItem[] }) {
  return (
    <table id="kelolaan-outlet-subscription-table" data-column-visibility-manual="true" className="w-full min-w-[1020px] text-left text-sm text-gray-600">
      <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
        <tr>
          <th className="px-4 py-4 font-bold">Kode Outlet</th>
          <th className="px-4 py-4 font-bold">Nama Outlet</th>
          <th className="px-4 py-4 font-bold">Owner</th>
          <th className="px-4 py-4 font-bold">Paket / Plan</th>
          <th className="px-4 py-4 text-center font-bold">Status Langganan</th>
          <th className="px-4 py-4 text-center font-bold">Status Jatuh Tempo</th>
          <th className="px-4 py-4 font-bold">Sisa Hari</th>
          <th className="px-4 py-4 font-bold">Tgl Mulai</th>
          <th className="px-4 py-4 font-bold">Tgl Berakhir</th>
          <th className="px-4 py-4 text-center font-bold">Aksi</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {items.length === 0 ? (
          <tr>
            <td colSpan={10} className="p-8 text-center text-sm font-medium text-gray-400">
              Tidak ada data langganan yang cocok untuk bulan ini.
            </td>
          </tr>
        ) : (
          items.map((item) => (
          <tr key={item.outlet_id} className="transition-colors hover:bg-gray-50">
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.outlet_code}</td>
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.outlet_name}</td>
            <td className="p-3 align-top">{item.owner.name || "—"}</td>
            <td className="px-4 py-4 align-top">
              {item.package_plan.package_name || "—"}
              {item.package_plan.plan_name ? ` / ${item.package_plan.plan_name}` : ""}
            </td>
            <td className="px-4 py-4 align-top text-center">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${getSubscriptionStatusBadgeClass(
                item.subscription_status_code || item.subscription_status_label
              )}`}>
                {getStatusDisplayLabel(item.subscription_status_code, item.subscription_status_label)}
              </span>
            </td>
            <td className="px-4 py-4 align-top text-center">
              {item.due_status_code || item.due_status_label ? (
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${getSubscriptionStatusBadgeClass(
                  item.due_status_code || item.due_status_label
                )}`}>
                  {getStatusDisplayLabel(item.due_status_code, item.due_status_label)}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </td>
            <td className="px-4 py-4 align-top">{item.remaining_days_display}</td>
            <td className="px-4 py-4 align-top whitespace-nowrap">{formatIndonesianDate(item.subscription_start_date || item.created_at)}</td>
            <td className="px-4 py-4 align-top whitespace-nowrap">{formatIndonesianDate(item.subscription_end_date || item.last_subscription_end_display)}</td>
            <td className="px-4 py-4 align-top text-center">
              <Link
                href={`/menu/kelolaan-outlet/detail?id=${item.outlet_id}`}
                className="inline-flex rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                title="Lihat Detail Outlet"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </Link>
            </td>
          </tr>
        ))
        )}
      </tbody>
    </table>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  isBusy,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  isBusy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="app-modal-panel w-full max-w-sm rounded-2xl shadow-xl">
        <div className="app-modal-header p-6">
          <h3 className={`text-lg font-black ${danger ? "text-red-600" : "text-gray-900"}`}>{title}</h3>
        </div>
        <div className="app-modal-body space-y-4 p-6">
        <p className="text-xs text-gray-600">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="app-modal-close rounded-xl px-4 py-2 text-xs font-black"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={`rounded-xl px-4 py-2 text-xs font-black text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-[#C92C1E] hover:bg-[#A82216]"
              }`}
          >
            {isBusy ? "Memproses..." : confirmLabel}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}