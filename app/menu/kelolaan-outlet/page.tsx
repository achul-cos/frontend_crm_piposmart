"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  restoreOutletForOwner,
  forceDeleteOutletForOwner,
  bulkUpdateOutletsForOwner,
  bulkTrashOutletsForOwner,
  bulkForceDeleteOutletsForOwner,
  downloadGlobalOutletExportFile,
  downloadOutletSubscriptionMatrixExportFile,
  downloadOutletSubscriptionImportTemplateFile,
  type BackendOutlet,
  type OutletOverviewItem,
  type OutletSubscriptionStatusItem,
} from "@/app/lib/api";
import { useGlobalOutletsQuery, useOutletSubscriptionStatusesQuery, outletKeys } from "@/app/lib/queries/outlets";
import { usePackagesQuery, usePlansQuery } from "@/app/lib/queries/catalog";
import { useBulkSelect } from "@/app/lib/hooks/useBulkSelect";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import OutletFormModal from "./OutletFormModal";
import BulkEditOutletModal, { type BulkEditFields } from "./BulkEditOutletModal";
import SubscriptionImportModal from "./SubscriptionImportModal";
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
    opt.toLowerCase().startsWith(value.toLowerCase())
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

const SUBSCRIPTION_STATUS_ITEMS = [
  { value: "TRIAL", label: "Trial" },
  { value: "NO_PACKAGE", label: "No Package" },
  { value: "UNSUBSCRIBE", label: "Unsubscribe" },
  { value: "NEW", label: "New" },
  { value: "SUBSCRIBE", label: "Subscribe" },
];

function MultiSelectCheckboxFilter({
  label,
  options,
  selectedValues,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
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

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const selectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const resetDefault = () => {
    onChange(options.map((o) => o.value));
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0 || selectedValues.length === options.length) {
      return "Semua Kategori";
    }
    if (selectedValues.length === 1) {
      const found = options.find((o) => o.value === selectedValues[0]);
      return found ? found.label : selectedValues[0];
    }
    return `${selectedValues.length} Kategori Terpilih`;
  };

  return (
    <div ref={wrapperRef} className="flex flex-col gap-1.5 w-full relative">
      <span className="text-xs font-semibold text-black">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
      >
        <span className="truncate">{getDisplayText()}</span>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[200px] overflow-hidden rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 px-1 mb-1">
            <button
              type="button"
              onClick={selectAll}
              className="text-[11px] font-bold text-gray-600 hover:text-[#C92C1E]"
            >
              Pilih Semua
            </button>
            {selectedValues.length < options.length && (
              <button
                type="button"
                onClick={resetDefault}
                className="text-[11px] font-bold text-[#C92C1E] hover:underline"
              >
                Reset
              </button>
            )}
          </div>
          <div className="flex flex-col max-h-48 overflow-y-auto">
            {options.map((opt) => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-800 hover:bg-red-50/60 rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(opt.value)}
                    className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                  />
                  <span className="font-semibold">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const DUE_STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "BELUM_JATUH_TEMPO", label: "Belum Jatuh Tempo" },
  { value: "AKAN_JATUH_TEMPO", label: "Akan Jatuh Tempo" },
  { value: "JATUH_TEMPO", label: "Jatuh Tempo" },
  { value: "TELAH_JATUH_TEMPO", label: "Telah Jatuh Tempo" },
];

const INDONESIA_PROVINCES = [
  "Aceh",
  "Bali",
  "Banten",
  "Bengkulu",
  "DI Yogyakarta",
  "DKI Jakarta",
  "Gorontalo",
  "Jambi",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Kalimantan Barat",
  "Kalimantan Selatan",
  "Kalimantan Tengah",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Kepulauan Bangka Belitung",
  "Kepulauan Riau",
  "Lampung",
  "Maluku",
  "Maluku Utara",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Papua",
  "Papua Barat",
  "Papua Barat Daya",
  "Papua Pegunungan",
  "Papua Selatan",
  "Papua Tengah",
  "Riau",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tengah",
  "Sulawesi Tenggara",
  "Sulawesi Utara",
  "Sumatera Barat",
  "Sumatera Selatan",
  "Sumatera Utara",
];

const TIME_STATUS_OPTIONS = [
  { value: "", label: "Semua Status Outlet" },
  { value: "TRIAL", label: "Trial" },
  { value: "SUBSCRIBE", label: "Subscribe" },
  { value: "UNSUBSCRIBE", label: "Unsubscribe" },
  { value: "NO_PACKAGE", label: "No Package" },
];

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

// ── State Persistence ────────────────────────────────────────────────────────
// Semua state filter/tab disimpan ke sessionStorage sehingga ketika user
// navigasi ke halaman detail lalu kembali (browser back), filter tetap terjaga.
const SESSION_KEY = "kelolaan-outlet:filters";

function readSession<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return (parsed[key] as T) ?? fallback;
  } catch {
    return fallback;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export default function KelolaanOutletPage() {
usePageTitle("Outlet");
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tableState, setTableState] = useState<TableState>(() =>
    readSession("tableState", "umum" as TableState)
  );

  const [searchInput, setSearchInput] = useState(() => readSession("searchInput", ""));

  const [search, setSearch] = useState(() => readSession("search", ""));
  const [statusLangganan, setStatusLangganan] = useState<string[]>(() =>
    readSession("statusLangganan", SUBSCRIPTION_STATUS_ITEMS.map((item) => item.value))
  );
  const [month, setMonth] = useState(() => readSession("month", currentMonthValue()));
  const [statusJatuhTempo, setStatusJatuhTempo] = useState(() => readSession("statusJatuhTempo", ""));
  const [dueDateReference, setDueDateReference] = useState(() => readSession("dueDateReference", ""));
  const [dueDateStart, setDueDateStart] = useState(() => readSession("dueDateStart", ""));
  const [dueDateEnd, setDueDateEnd] = useState(() => readSession("dueDateEnd", ""));
  const [timeStatusFilter, setTimeStatusFilter] = useState(() => readSession("timeStatusFilter", ""));
  const [creationStatusFilter, setCreationStatusFilter] = useState(() => readSession("creationStatusFilter", ""));
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [filterCode, setFilterCode] = useState(() => readSession("filterCode", ""));
  const [filterName, setFilterName] = useState(() => readSession("filterName", ""));
  const [filterOwner, setFilterOwner] = useState(() => readSession("filterOwner", ""));
  const [filterOwnerCode, setFilterOwnerCode] = useState(() => readSession("filterOwnerCode", ""));
  const [filterCity, setFilterCity] = useState(() => readSession("filterCity", ""));
  const [filterCityName, setFilterCityName] = useState(() => readSession("filterCityName", ""));
  const [filterPlan, setFilterPlan] = useState(() => readSession("filterPlan", ""));
  const [createdFrom, setCreatedFrom] = useState(() => readSession("createdFrom", ""));
  const [createdTo, setCreatedTo] = useState(() => readSession("createdTo", ""));
  const [startDateStart, setStartDateStart] = useState(() => readSession("startDateStart", ""));
  const [startDateEnd, setStartDateEnd] = useState(() => readSession("startDateEnd", ""));
  const [page, setPage] = useState(() => readSession("page", 1));
  const [limit, setLimit] = useState(() => readSession("limit", 10));
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingMatrix, setIsExportingMatrix] = useState(false);
  const [showSubscriptionImportModal, setShowSubscriptionImportModal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        tableState, searchInput, search, statusLangganan, month,
        statusJatuhTempo, dueDateReference, dueDateStart, dueDateEnd,
        timeStatusFilter, creationStatusFilter, filterCode, filterName, filterOwner, filterOwnerCode,
        filterCity, filterCityName, filterPlan, createdFrom, createdTo,
        startDateStart, startDateEnd, page, limit,
      }));
    } catch { }
  }, [
    tableState, searchInput, search, statusLangganan, month,
    statusJatuhTempo, dueDateReference, dueDateStart, dueDateEnd,
    timeStatusFilter, creationStatusFilter, filterCode, filterName, filterOwner, filterOwnerCode,
    filterCity, filterCityName, filterPlan, createdFrom, createdTo,
    startDateStart, startDateEnd, page, limit,
  ]);

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
  const [bulkRestoreConfirm, setBulkRestoreConfirm] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [bulkResultMessage, setBulkResultMessage] = useState<string | null>(null);

  const overviewScope = tableState === "sampah" ? "trash" : "active";
  const overviewParams = useMemo(
    () => ({
      q: search || undefined,
      code: filterCode || undefined,
      name: filterName || undefined,
      brand_name: filterOwner || undefined,
      owner_keyword: filterOwner || filterOwnerCode || undefined,
      province: filterCity || undefined,
      city: filterCityName || undefined,
      subscription_status: timeStatusFilter || undefined,
      creation_status: creationStatusFilter || undefined,
      page,
      limit,
      start_date: createdFrom || undefined,
      end_date: createdTo || undefined,
    }),
    [search, filterCode, filterName, filterOwner, filterOwnerCode, filterCity, filterCityName, timeStatusFilter, creationStatusFilter, page, limit, createdFrom, createdTo],
  );
  const statusLanggananParam =
    statusLangganan.length > 0 && statusLangganan.length < SUBSCRIPTION_STATUS_ITEMS.length
      ? statusLangganan.join(",")
      : undefined;
  const subscriptionParams = useMemo(
    () => ({
      q: search || undefined,
      code: filterCode || undefined,
      name: filterName || undefined,
      brand_name: filterOwner || filterOwnerCode || undefined,
      owner_keyword: filterOwner || filterOwnerCode || undefined,
      province: filterCity || undefined,
      city: filterCityName || undefined,
      subscription_status: statusLanggananParam,
      status_langganan: statusLanggananParam,
      status_jatuh_tempo: statusJatuhTempo || undefined,
      creation_status: creationStatusFilter || undefined,
      package_name: filterPlan || undefined,
      month,
      due_date_reference: dueDateReference || undefined,
      due_date_start: dueDateStart || undefined,
      due_date_end: dueDateEnd || undefined,
      start_date_start: startDateStart || undefined,
      start_date_end: startDateEnd || undefined,
      page,
      limit,
    }),
    [search, filterCode, filterName, filterOwner, filterOwnerCode, filterCity, filterCityName, statusLangganan, statusJatuhTempo, creationStatusFilter, filterPlan, month, dueDateReference, dueDateStart, dueDateEnd, startDateStart, startDateEnd, page, limit],
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

  const plansQuery = usePlansQuery({ limit: 100 }, tableState === "langganan");
  const catalogPlans = Array.isArray(plansQuery.data?.items) ? plansQuery.data.items : [];

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
  const uniqueOverviewOwners = useMemo(() => {
    const list = new Set<string>();
    overviewItems.forEach((i) => {
      if (i.owner.name) list.add(i.owner.name);
      if (i.owner.brand_name) list.add(i.owner.brand_name);
    });
    return Array.from(list);
  }, [overviewItems]);
  const uniqueOverviewOwnerCodes = useMemo(
    () => Array.from(new Set(overviewItems.map((i) => i.owner.code).filter(Boolean) as string[])),
    [overviewItems]
  );
  const uniqueOverviewCities = useMemo(
    () => Array.from(new Set(overviewItems.map((i) => i.city).filter(Boolean) as string[])),
    [overviewItems]
  );
  const uniqueOverviewProvinces = useMemo(() => {
    const set = new Set<string>(INDONESIA_PROVINCES);
    overviewItems.forEach((i) => {
      if (i.province && i.province.trim()) set.add(i.province.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [overviewItems]);

  const uniqueSubCodes = useMemo(
    () => Array.from(new Set(subscriptionItems.map((i) => i.outlet_code).filter(Boolean))),
    [subscriptionItems]
  );
  const uniqueSubNames = useMemo(
    () => Array.from(new Set(subscriptionItems.map((i) => i.outlet_name).filter(Boolean))),
    [subscriptionItems]
  );
  const uniqueSubOwners = useMemo(() => {
    const list = new Set<string>();
    subscriptionItems.forEach((i) => {
      if (i.owner.name) list.add(i.owner.name);
      if (i.owner.brand_name) list.add(i.owner.brand_name);
    });
    return Array.from(list);
  }, [subscriptionItems]);
  const uniqueSubOwnerCodes = useMemo(
    () => Array.from(new Set(subscriptionItems.map((i) => i.owner.code).filter(Boolean) as string[])),
    [subscriptionItems]
  );
  const uniqueSubCities = useMemo(
    () => Array.from(new Set(subscriptionItems.map((i) => i.outlet_city).filter(Boolean))),
    [subscriptionItems]
  );
  const uniqueSubPlans = useMemo(() => {
    const list = new Set<string>();
    catalogPlans.forEach((plan) => {
      if (plan.name) list.add(plan.name);
    });
    subscriptionItems.forEach((i) => {
      if (i.package_plan?.plan_name) list.add(i.package_plan.plan_name);
      else if (i.package_plan?.package_name) list.add(i.package_plan.package_name);
    });
    return Array.from(list);
  }, [catalogPlans, subscriptionItems]);

  const filteredOverviewItems = overviewItems;

  const filteredSubscriptionItems = subscriptionItems;

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

  const handleResetFilters = () => {
    setFilterCode("");
    setFilterName("");
    setFilterOwner("");
    setFilterOwnerCode("");
    setFilterCity("");
    setFilterCityName("");
    setFilterPlan("");
    setCreatedFrom("");
    setCreatedTo("");
    setStartDateStart("");
    setStartDateEnd("");
    setStatusJatuhTempo("");
    setDueDateReference("");
    setDueDateStart("");
    setDueDateEnd("");
    setSearchInput("");
    setSearch("");
    setCreationStatusFilter("");
    if (tableState === "langganan") {
      setStatusLangganan(SUBSCRIPTION_STATUS_ITEMS.map((item) => item.value));
      setMonth(currentMonthValue());
    } else {
      setTimeStatusFilter("");
    }
    setPage(1);
  };

  useEffect(() => {
    setSelectedIds([]);
    setBulkResultMessage(null);
  }, [tableState, page, search, statusLangganan, statusJatuhTempo, creationStatusFilter, dueDateReference, month, dueDateStart, dueDateEnd, timeStatusFilter, filterCode, filterName, filterOwner, filterCity, filterPlan]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    if (total > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [total, totalPages, page]);
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
    setCreationStatusFilter("");
    setPage(1);
  };

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: outletKeys.all });

  const handleDownloadOutletExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      
      let blob: Blob;
      let disposition: string | null = null;
      let filename = "Data_Owner_Outlet.xlsx";
      
      if (tableState === "langganan") {
        const res = await downloadOutletSubscriptionMatrixExportFile({
          q: search || undefined,
          code: filterCode || undefined,
          name: filterName || undefined,
          brand_name: filterOwner || filterOwnerCode || undefined,
          owner_keyword: filterOwner || filterOwnerCode || undefined,
          province: filterCity || undefined,
          city: filterCityName || undefined,
          subscription_status: statusLanggananParam,
          status_langganan: statusLanggananParam,
          status_jatuh_tempo: statusJatuhTempo || undefined,
          package_name: filterPlan || undefined,
          month: month || undefined,
          due_date_reference: dueDateReference || undefined,
          due_date_start: dueDateStart || undefined,
          due_date_end: dueDateEnd || undefined,
          start_date_start: startDateStart || undefined,
          start_date_end: startDateEnd || undefined,
        });
        blob = res.blob;
        disposition = res.disposition;
        filename = `Rekap_Matrix_Berlangganan_${month?.substring(0, 4) || new Date().getFullYear()}.xlsx`;
      } else {
        const res = await downloadGlobalOutletExportFile({
          q: search || undefined,
          code: filterCode || undefined,
          name: filterName || undefined,
          brand_name: filterOwner || undefined,
          owner_keyword: filterOwner || filterOwnerCode || undefined,
          province: filterCity || undefined,
          city: filterCityName || undefined,
          subscription_status: timeStatusFilter || undefined,
          creation_status: creationStatusFilter || undefined,
          start_date: createdFrom || undefined,
          end_date: createdTo || undefined,
          created_from: createdFrom || undefined,
          created_to: createdTo || undefined,
          date_from: createdFrom || undefined,
          date_to: createdTo || undefined,
        });
        blob = res.blob;
        disposition = res.disposition;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
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

  const handleDownloadSubscriptionMatrixExport = async () => {
    try {
      setIsExportingMatrix(true);
      setError(null);
      const yearVal = month ? Number(month.slice(0, 4)) : new Date().getFullYear();
      const { blob, disposition } = await downloadOutletSubscriptionMatrixExportFile({
        year: yearVal,
        q: search || undefined,
        code: filterCode || undefined,
        name: filterName || undefined,
        owner_keyword: filterOwner || undefined,
        subscription_status: statusLanggananParam,
        status_langganan: statusLanggananParam,
        creation_status: creationStatusFilter || undefined,
        status_jatuh_tempo: statusJatuhTempo || undefined,
        month,
        due_date_reference: dueDateReference || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let filename = `Rekap_Matrix_Berlangganan_${yearVal}.xlsx`;
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
      setError(err instanceof Error ? err.message : "Gagal mengunduh matrix berlangganan.");
    } finally {
      setIsExportingMatrix(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setIsActing(true);
    try {
      await restoreOutletForOwner(restoreTarget.ownerId, restoreTarget.id);
      setRestoreTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memulihkan outlet.");
    } finally {
      setIsActing(false);
      invalidate();
    }
  };

  const handleForceDelete = async () => {
    if (!deleteTarget) return;
    setIsActing(true);
    try {
      await forceDeleteOutletForOwner(deleteTarget.ownerId, deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus outlet secara permanen.");
    } finally {
      setIsActing(false);
      invalidate();
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
    invalidate();
  };

  const handleBulkTrash = async () => {
    setIsBulkActing(true);
    const result = await runBulkByOwner(selectedItems, (ownerId, ids) =>
      bulkTrashOutletsForOwner(ownerId, ids),
    );
    // Tutup modal & bersihkan pilihan segera — data akan update di background
    setIsBulkActing(false);
    setBulkTrashConfirm(false);
    setSelectedIds([]);
    setBulkResultMessage(
      result.failCount > 0
        ? `${result.successCount} outlet dipindahkan ke sampah, ${result.failCount} gagal.`
        : `${result.successCount} outlet dipindahkan ke sampah.`,
    );
    invalidate();
  };

  const handleBulkRestore = async () => {
    setIsBulkActing(true);
    const result = await runBulkByOwner(selectedItems, (ownerId, ids) =>
      Promise.all(ids.map((id) => restoreOutletForOwner(ownerId, id))),
    );
    setIsBulkActing(false);
    setBulkRestoreConfirm(false);
    bulkSelect.clear();
    setBulkResultMessage(
      result.failCount > 0
        ? `${result.successCount} outlet dipulihkan, ${result.failCount} gagal.`
        : `${result.successCount} outlet dipulihkan.`,
    );
    invalidate();
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
    invalidate();
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
          value={total.toLocaleString("id-ID")}
          description="Seluruh outlet lintas owner yang tercatat."
          tone="accent"
          silhouette="building"
        />
        <QuickInfoCard
          label="Ditampilkan"
          value={visibleCount.toLocaleString("id-ID")}
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
              {page.toLocaleString("id-ID")} <span className="text-base font-bold opacity-70">/ {totalPages.toLocaleString("id-ID")}</span>
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
                {tableState === "langganan" && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleDownloadSubscriptionMatrixExport()}
                      disabled={isExportingMatrix}
                      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isExportingMatrix ? (
                        <svg className="h-4 w-4 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      {isExportingMatrix ? "Sedang Mengekspor..." : "Export Data"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSubscriptionImportModal(true)}
                      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import Data
                    </button>
                  </>
                )}
                {isAdmin && bulkSelect.selectedCount > 0 && tableState === "umum" && (
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
                {isAdmin && bulkSelect.selectedCount > 0 && tableState === "sampah" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setBulkRestoreConfirm(true)}
                      className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-600 shadow-sm transition-all hover:bg-emerald-50"
                    >
                      Pulihkan ({bulkSelect.selectedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkDeleteConfirm(true)}
                      className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-50"
                    >
                      Hapus Permanen ({bulkSelect.selectedCount})
                    </button>
                  </>
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
                        onChange={(val) => {
                          setFilterCode(val);
                          setPage(1);
                        }}
                        options={uniqueOverviewCodes}
                      />
                      <AutocompleteFilter
                        label="Nama Outlet"
                        placeholder="Filter Nama Outlet..."
                        value={filterName}
                        onChange={(val) => {
                          setFilterName(val);
                          setPage(1);
                        }}
                        options={uniqueOverviewNames}
                      />
                      <AutocompleteFilter
                        label="Nama Owner"
                        placeholder="Filter Owner..."
                        value={filterOwner}
                        onChange={(val) => {
                          setFilterOwner(val);
                          setPage(1);
                        }}
                        options={uniqueOverviewOwners}
                      />
                      <AutocompleteFilter
                        label="Kode Owner"
                        placeholder="Filter Kode Owner..."
                        value={filterOwnerCode}
                        onChange={(val) => {
                          setFilterOwnerCode(val);
                          setPage(1);
                        }}
                        options={uniqueOverviewOwnerCodes}
                      />
                      <div className="flex flex-col gap-1.5 w-full">
                        <span className="text-xs font-semibold text-black">Provinsi</span>
                        <select
                          value={filterCity}
                          onChange={(e) => {
                            setFilterCity(e.target.value);
                            setPage(1);
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                        >
                          <option value="">Semua Provinsi</option>
                          {uniqueOverviewProvinces.map((prov) => (
                            <option key={prov} value={prov}>
                              {prov}
                            </option>
                          ))}
                        </select>
                      </div>
                      <AutocompleteFilter
                        label="Kota"
                        placeholder="Filter Kota..."
                        value={filterCityName}
                        onChange={(val) => {
                          setFilterCityName(val);
                          setPage(1);
                        }}
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
                      <div className="flex flex-col gap-1.5 w-full">
                        <span className="text-xs font-semibold text-black">Status Dibuat</span>
                        <select
                          value={creationStatusFilter}
                          onChange={(e) => {
                            setCreationStatusFilter(e.target.value);
                            setPage(1);
                          }}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                        >
                          <option value="">Semua Status Dibuat</option>
                          <option value="NEW">Baru</option>
                          <option value="EXISTING">Sudah Ada</option>
                        </select>
                      </div>

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
                      <div className="col-span-full mt-2">
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
                        >
                          Reset Filter
                        </button>
                      </div>
                    </>
                  )}

                  {tableState === "langganan" && (
                    <div className="col-span-full flex flex-col gap-4 w-full">
                      {/* Filter Utama */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 items-end gap-4">
                        <label className="flex flex-col gap-1.5 w-full">
                          <span className="text-xs font-semibold text-black">Bulan Acuan</span>
                          <input
                            type="month"
                            value={month}
                            onChange={(e) => {
                              setMonth(e.target.value);
                              setDueDateReference("");
                            }}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                          />
                        </label>
                        <MultiSelectCheckboxFilter
                          label="Kategori Nasabah"
                          options={SUBSCRIPTION_STATUS_ITEMS}
                          selectedValues={statusLangganan}
                          onChange={(values) => {
                            setStatusLangganan(values);
                            setPage(1);
                          }}
                        />
                        <div className="flex flex-col gap-1.5 w-full">
                          <span className="text-xs font-semibold text-black">Provinsi</span>
                          <select
                            value={filterCity}
                            onChange={(e) => {
                              setFilterCity(e.target.value);
                              setPage(1);
                            }}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                          >
                            <option value="">Semua Provinsi</option>
                            {uniqueOverviewProvinces.map((prov) => (
                              <option key={prov} value={prov}>
                                {prov}
                              </option>
                            ))}
                          </select>
                        </div>
                        <AutocompleteFilter
                          label="Kode Owner"
                          placeholder="Filter Kode Owner..."
                          value={filterOwnerCode}
                          onChange={(val) => {
                            setFilterOwnerCode(val);
                            setPage(1);
                          }}
                          options={uniqueSubOwnerCodes}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <button
                          type="button"
                          onClick={() => setShowMoreFilters(!showMoreFilters)}
                          className="text-sm font-semibold text-[#C92C1E] hover:underline flex items-center gap-1"
                        >
                          {showMoreFilters ? "Sembunyikan Filter Lanjutan" : "Tampilkan Filter Lanjutan"}
                          <svg
                            className={`w-4 h-4 transition-transform ${showMoreFilters ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
                        >
                          Reset Filter
                        </button>
                      </div>

                      {/* Filter Lanjutan */}
                      {showMoreFilters && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-end gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <AutocompleteFilter
                            label="Kode Outlet"
                            placeholder="Filter Kode..."
                            value={filterCode}
                            onChange={(val) => {
                              setFilterCode(val);
                              setPage(1);
                            }}
                            options={uniqueSubCodes}
                          />
                          <AutocompleteFilter
                            label="Nama Outlet"
                            placeholder="Filter Nama Outlet..."
                            value={filterName}
                            onChange={(val) => {
                              setFilterName(val);
                              setPage(1);
                            }}
                            options={uniqueSubNames}
                          />
                          <AutocompleteFilter
                            label="Nama Owner"
                            placeholder="Filter Owner..."
                            value={filterOwner}
                            onChange={(val) => {
                              setFilterOwner(val);
                              setPage(1);
                            }}
                            options={uniqueSubOwners}
                          />
                          <div className="flex flex-col gap-1.5 w-full">
                            <span className="text-xs font-semibold text-black">Paket / Plan</span>
                            <select
                              value={filterPlan}
                              onChange={(e) => {
                                setFilterPlan(e.target.value);
                                setPage(1);
                              }}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                            >
                              <option value="">Semua Paket / Plan</option>
                              {uniqueSubPlans.map((plan, idx) => (
                                <option key={idx} value={plan}>
                                  {plan}
                                </option>
                              ))}
                            </select>
                          </div>
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
                            <span className="text-xs font-semibold text-black">Status Dibuat</span>
                            <select
                              value={creationStatusFilter}
                              onChange={(e) => {
                                setCreationStatusFilter(e.target.value);
                                setPage(1);
                              }}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                            >
                              <option value="">Semua Status Dibuat</option>
                              <option value="NEW">Baru</option>
                              <option value="EXISTING">Sudah Ada</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5 w-full">
                            <div className="flex items-center justify-between">
                              <label htmlFor="startDateStart" className="text-xs font-semibold text-black">Tanggal Mulai (Dari)</label>
                              {startDateStart && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStartDateStart("");
                                    setPage(1);
                                  }}
                                  className="text-[10px] font-bold text-[#C92C1E] hover:underline"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            <input
                              id="startDateStart"
                              type="date"
                              value={startDateStart}
                              onChange={(e) => {
                                setStartDateStart(e.target.value);
                                setPage(1);
                              }}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5 w-full">
                            <div className="flex items-center justify-between">
                              <label htmlFor="startDateEnd" className="text-xs font-semibold text-black">Tanggal Mulai (Sampai)</label>
                              {startDateEnd && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStartDateEnd("");
                                    setPage(1);
                                  }}
                                  className="text-[10px] font-bold text-[#C92C1E] hover:underline"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            <input
                              id="startDateEnd"
                              type="date"
                              value={startDateEnd}
                              onChange={(e) => {
                                setStartDateEnd(e.target.value);
                                setPage(1);
                              }}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5 w-full">
                            <div className="flex items-center justify-between">
                              <label htmlFor="dueDateStart" className="text-xs font-semibold text-black">Jatuh Tempo (Dari)</label>
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
                              <label htmlFor="dueDateEnd" className="text-xs font-semibold text-black">Jatuh Tempo (Sampai)</label>
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
                              value={dueDateEnd}
                              onChange={(e) => {
                                setDueDateEnd(e.target.value);
                                setPage(1);
                              }}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                            />
                          </div>
                        </div>
                      )}
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
                    Menampilkan {total === 0 ? 0 : ((page - 1) * limit + 1).toLocaleString("id-ID")}–{Math.min(page * limit, total).toLocaleString("id-ID")} dari {total.toLocaleString("id-ID")} data
                  </span>
                  <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
                    <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-800 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-xs font-medium text-gray-500">per halaman</span>
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
            invalidate();
          }}
        />
      )}

      {showSubscriptionImportModal && (
        <SubscriptionImportModal
          onClose={() => setShowSubscriptionImportModal(false)}
          onSuccess={() => {
            setShowSubscriptionImportModal(false);
            invalidate();
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

      {bulkRestoreConfirm && (
        <ConfirmDialog
          title="Pulihkan Outlet Terpilih?"
          message={`${bulkSelect.selectedCount} outlet terpilih akan dipulihkan dan aktif kembali.`}
          confirmLabel="Pulihkan"
          isBusy={isBulkActing}
          onClose={() => setBulkRestoreConfirm(false)}
          onConfirm={() => void handleBulkRestore()}
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


  const colCount = isAdmin ? 13 : 12;

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
          <th className="px-4 py-4 font-bold">Kode Owner</th>
          <th className="px-4 py-4 font-bold">Nama Owner</th>
          <th className="px-4 py-4 font-bold">Kode Outlet</th>
          <th className="px-4 py-4 font-bold">Nama Outlet</th>
          <th className="px-4 py-4 font-bold">Kota</th>
          <th className="px-4 py-4 font-bold">Provinsi</th>
          <th className="px-4 py-4 font-bold">PIC</th>
          <th className="px-4 py-4 font-bold">Tanggal Dibuat</th>
          <th className="px-4 py-4 text-center font-bold">Status Dibuat</th>
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
              <td 
                className="px-4 py-4 align-top text-center cursor-pointer"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelectRow(item.id);
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  readOnly
                  className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E] pointer-events-none"
                />
              </td>
            )}
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.owner.code || "—"}</td>
            <td className="px-4 py-4 align-top">{item.owner.name || "—"}</td>
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.code}</td>
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.name}</td>
            <td className="px-4 py-4 align-top">{item.city || "—"}</td>
            <td className="px-4 py-4 align-top">{item.province || "—"}</td>
            <td className="px-4 py-4 align-top">
              {item.latest_pic ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {item.latest_pic}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
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
                const cs = (item.creation_status || "").toUpperCase();
                const isNew = cs === "NEW";
                return (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${
                      isNew
                        ? "border-purple-200 bg-purple-50 text-purple-700"
                        : "border-slate-200 bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isNew ? "NEW" : "EXISTING"}
                  </span>
                );
              })()}
            </td>
            <td className="px-4 py-4 align-top text-center">
              {(() => {
                const rawStatus = item.subscription_summary?.latest_subscription_status;
                // Di Informasi Umum, NEW diperlakukan sebagai SUBSCRIBE
                const normalizedStatus = (rawStatus === "NEW" || rawStatus === "BARU") ? "SUBSCRIBE" : rawStatus;
                const statusBadgeClass = getSubscriptionStatusBadgeClass(normalizedStatus);
                const displayLabel = getStatusDisplayLabel(normalizedStatus, "NO PACKAGE");
                return (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${statusBadgeClass}`}
                  >
                    {displayLabel}
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
  if (c === "NEW" || c === "BARU") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }
  if (c.includes("SUBSCRIBE") && !c.includes("UNSUBSCRIBE") && !c.includes("NOT") || c.includes("BERLANGGANAN") || c === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (c.includes("AKAN") || c.includes("TELAH") || c.includes("JATUH") || c.includes("DUE")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (c === "TRIAL") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (c === "NO_PACKAGE" || c === "NO PACKAGE") {
    return "border-slate-200 bg-slate-100 text-slate-700 font-medium";
  }
  if (c.includes("EXPIRED") || c.includes("UNSUBSCRIBE") || c.includes("KEDALUWARSA") || c.includes("TIDAK")) {
    return "border-rose-300 bg-rose-100/80 text-rose-800";
  }
  if (c.includes("NOT")) {
    return "border-red-200 bg-red-50 text-red-700 font-bold";
  }
  return "border-red-200 bg-red-50 text-red-700 font-bold";
}

function getStatusDisplayLabel(code?: string, fallbackLabel?: string): string {
  const c = (code || fallbackLabel || "").toUpperCase();
  if (c === "BERLANGGANAN" || c === "ACTIVE" || c === "SUBSCRIBE") return "SUBSCRIBE";
  if (c === "AKAN_JATUH_TEMPO" || c === "AKAN JATUH TEMPO") return "AKAN JATUH TEMPO";
  if (c === "JATUH_TEMPO" || c === "JATUH TEMPO") return "JATUH TEMPO";
  if (c === "TELAH_JATUH_TEMPO" || c === "TELAH JATUH TEMPO") return "TELAH JATUH TEMPO";
  if (c === "NO_PACKAGE" || c === "NO PACKAGE") return "NO PACKAGE";
  if (c === "EXPIRED" || c === "UNSUBSCRIBE" || c === "KEDALUWARSA" || c === "TIDAK_AKTIF" || c === "TIDAK AKTIF") return "UNSUBSCRIBE";
  if (c === "NOT_SUBSCRIBE" || c === "NOT SUBSCRIBE" || c === "TIDAK BERLANGGANAN") return "UNSUBSCRIBE";
  if (c === "TRIAL") return "TRIAL";
  if (c === "BELUM_JATUH_TEMPO" || c === "BELUM JATUH TEMPO") return "BELUM JATUH TEMPO";
  return fallbackLabel || code || "";
}

function getCreationStatusBadge(status: string) {
  const isNew = (status || "").toUpperCase() === "NEW";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${
        isNew
          ? "border-purple-200 bg-purple-50 text-purple-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {isNew ? "NEW" : "EXISTING"}
    </span>
  );
}

function SubscriptionTable({ items }: { items: OutletSubscriptionStatusItem[] }) {
  return (
    <table id="kelolaan-outlet-subscription-table" data-column-visibility-manual="true" className="w-full min-w-[1020px] text-left text-sm text-gray-600">
      <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
        <tr>
          <th className="px-4 py-4 font-bold">Kode Outlet</th>
          <th className="px-4 py-4 font-bold">Nama Outlet</th>
          <th className="px-4 py-4 font-bold">Kode Owner</th>
          <th className="px-4 py-4 font-bold">Nama Owner</th>
          <th className="px-4 py-4 font-bold">Kota</th>
          <th className="px-4 py-4 font-bold">Provinsi</th>
          <th className="px-4 py-4 font-bold">Paket / Plan</th>
          <th className="px-4 py-4 text-center font-bold">Status Dibuat</th>
          <th className="px-4 py-4 font-bold">Tanggal Dibuat</th>
          <th className="px-4 py-4 text-center font-bold">Kategori Nasabah</th>
          <th className="px-4 py-4 text-center font-bold">Status Jatuh Tempo</th>
          <th className="px-4 py-4 font-bold">Sisa Hari</th>
          <th className="px-4 py-4 font-bold">Tanggal Mulai</th>
          <th className="px-4 py-4 font-bold">Tanggal Berakhir</th>
          <th className="px-4 py-4 text-center font-bold">Aksi</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {items.length === 0 ? (
          <tr>
            <td colSpan={15} className="p-8 text-center text-sm font-medium text-gray-400">
              Tidak ada data langganan yang cocok untuk bulan ini.
            </td>
          </tr>
        ) : (
          items.map((item) => (
          <tr key={item.outlet_id} className="transition-colors hover:bg-gray-50">
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.outlet_code}</td>
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.outlet_name}</td>
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.owner.code || "—"}</td>
            <td className="px-4 py-4 align-top">{item.owner.name || "—"}</td>
            <td className="px-4 py-4 align-top">{item.outlet_city || "—"}</td>
            <td className="px-4 py-4 align-top">{item.outlet_province || "—"}</td>
            <td className="px-4 py-4 align-top">
              {item.package_plan.plan_name || item.package_plan.package_name || "—"}
            </td>
            <td className="px-4 py-4 align-top text-center">
              {getCreationStatusBadge(item.creation_status)}
            </td>
            <td className="px-4 py-4 align-top whitespace-nowrap font-medium text-gray-700">
              {formatIndonesianDate(item.created_at)}
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