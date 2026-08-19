"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  type BackendOwner,
  type OwnerListParams,
  createOwner,
  uploadImportFile,
  getImportBatch,
  commitImportBatch,
  getImportErrorRows,
  type ImportBatchResponse,
  type ImportRowError,
  updateOwner,
  bulkSoftDeleteOwners,
  bulkCreateOwnerOutlets,
  downloadOwnerExportFile,
} from "@/app/lib/api";
import { formatPhoneDisplay } from "@/app/lib/phone";
import {
  isDarkTheme,
  readStoredThemeMode,
  type ThemeMode,
} from "@/app/lib/theme";
import { useLocation } from "@/app/lib/useLocation";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { useOwnersQuery } from "@/app/lib/queries/leads";
import { SkeletonBlock } from "@/app/components/skeleton/Skeleton";
import AnalyticsTabSkeleton from "@/app/components/skeleton/AnalyticsTabSkeleton";
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";
import ScreenPortal from "@/app/components/ui/ScreenPortal";
import ColumnVisibilityControl from "@/app/components/table/ColumnVisibilityControl";
import ImportHistoryModal from "@/app/components/ImportHistoryModal";
import { useFeedback } from "@/app/components/feedback/FeedbackContext";
import {
  RowActionGroup,
  ViewActionButton,
  EditActionButton,
} from "@/app/components/table/RowActionButton";

const AnalyticsTab = dynamic(() => import("./AnalyticsTab"), {
  ssr: false,
  loading: () => <AnalyticsTabSkeleton sections={2} />,
});

const modalInputClass =
  "owner-modal-field w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:bg-slate-950 dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

const modalSelectClass =
  "owner-modal-field w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-950 dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

const modalTextareaClass =
  "owner-modal-field w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:bg-slate-950 dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function WalletBalanceCell({ ownerId }: { ownerId: number }) {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/app/lib/api").then(({ getOwnerOverview }) => {
      getOwnerOverview(ownerId)
        .then((res) => {
          if (!cancelled) setBalance(res.balance.wallet.balance);
        })
        .catch(() => {
          if (!cancelled) setBalance("-");
        });
    });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  if (balance === null) return <span className="text-gray-400 text-xs">Memuat...</span>;
  if (balance === "-") return <span className="text-gray-400 text-xs">-</span>;

  const amount = Number(balance || 0);
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

  return <span className="font-bold text-gray-900">{formatted}</span>;
}

function AutocompleteFilter({ label, placeholder, value, onChange, options }: { label: string, placeholder: string, value: string, onChange: (val: string) => void, options: string[] }) {
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

function ModalShell({
  open,
  title,
  subtitle,
  isDarkMode = false,
  label = "Owner",
  maxWidth = "max-w-3xl",
  disabled = false,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  isDarkMode?: boolean;
  label?: string;
  maxWidth?: string;
  disabled?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <ScreenPortal>
      <div
        className={`owner-modal-scope ${isDarkMode ? "is-dark" : "is-light"} fixed inset-0 z-50 bg-slate-950/70`}
        onClick={() => !disabled && onClose()}
      >
        <div className="flex min-h-full items-center justify-center overflow-y-auto p-4 md:p-6">
          <div
            className={`app-modal-panel w-full ${maxWidth} rounded-[32px] shadow-2xl`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-modal-header px-5 py-4 md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                    {label}
                  </p>
                  <h2 className="app-modal-title mt-2 text-lg font-black text-gray-900 dark:text-slate-50 md:text-xl">
                    {title}
                  </h2>
                  <p className="app-modal-subtitle mt-1 text-xs font-medium text-gray-500 dark:text-slate-300">
                    {subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={disabled}
                  className="app-modal-close rounded-2xl px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tutup
                </button>
              </div>
            </div>

            <div className="app-modal-body p-5 md:p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </ScreenPortal>
  );
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function DownloadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function UploadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function HistoryIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SpinnerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function formatToDatetimeLocal(isoString?: string | null) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

type OwnerPageTab = "list" | "non_register" | "analytics";

export default function OwnerPage() {
  usePageTitle("Owner");
  const router = useRouter();
  const { showSuccess, showError, confirm, withLoading } = useFeedback();

  const [isExporting, setIsExporting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("-created_at");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filters, setFilters] = useState({
    code: "",
    name: "",
    brand_name: "",
    phone: "",
    province: "",
    city: "",
    status: "",
  });
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");
  const [activeTab, setActiveTab] = useState<OwnerPageTab>("list");

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportHistoryModalOpen, setIsImportHistoryModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBatch, setImportBatch] = useState<ImportBatchResponse | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importErrorRows, setImportErrorRows] = useState<ImportRowError[]>([]);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isAddOwnerModalOpen, setIsAddOwnerModalOpen] = useState(false);
  const [isAddOwnerSubmitting, setIsAddOwnerSubmitting] = useState(false);
  const [addOwnerForm, setAddOwnerForm] = useState({
    code: "",
    name: "",
    brand_name: "",
    phone: "",
    email: "",
    province: "",
    city: "",
    district: "",
    sub_district: "",
    address: "",
    outlet_name: "",
    outlet_phone: "",
    outlet_province: "",
    outlet_city: "",
    outlet_district: "",
    outlet_sub_district: "",
    outlet_address: "",
  });

  const [isEditOwnerModalOpen, setIsEditOwnerModalOpen] = useState(false);
  const [isEditOwnerSubmitting, setIsEditOwnerSubmitting] = useState(false);
  const [editOwnerForm, setEditOwnerForm] = useState({
    id: 0,
    code: "",
    name: "",
    brand_name: "",
    phone: "",
    email: "",
    province: "",
    city: "",
    district: "",
    sub_district: "",
    address: "",
    created_at: "",
  });

  const {
    provinces,
    cities,
    districts,
    villages,
    loadCitiesByProvinceName,
    loadDistrictsByCityName,
    loadVillagesByDistrictName,
    loadingProvinces,
    loadingCities,
    loadingDistricts,
    loadingVillages,
    loadAllForEdit,
  } = useLocation();

  const {
    provinces: outletProvinces,
    cities: outletCities,
    districts: outletDistricts,
    villages: outletVillages,
    loadCitiesByProvinceName: loadOutletCities,
    loadDistrictsByCityName: loadOutletDistricts,
    loadVillagesByDistrictName: loadOutletVillages,
    loadingProvinces: outletLoadingProvinces,
    loadingCities: outletLoadingCities,
    loadingDistricts: outletLoadingDistricts,
    loadingVillages: outletLoadingVillages,
  } = useLocation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreActionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isEditOwnerModalOpen && editOwnerForm.province && provinces.length > 0) {
      loadCitiesByProvinceName(editOwnerForm.province);
    }
  }, [isEditOwnerModalOpen, editOwnerForm.province, provinces, loadCitiesByProvinceName]);

  const ownersQueryParams = useMemo<OwnerListParams>(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      q: search,
      code: filters.code,
      name: filters.name,
      brand_name: filters.brand_name,
      phone: filters.phone,
      province: filters.province,
      city: filters.city,
      status: filters.status || undefined,
      subscription_status: filters.status || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      created_from: startDate || undefined,
      created_to: endDate || undefined,
      owner_kind: activeTab === "non_register" ? "non_register" : "registered",
      sort,
    }),
    [pagination.page, pagination.limit, search, filters, startDate, endDate, sort, activeTab]
  );

  const { data: ownersData, isLoading, refetch: refetchOwners } = useOwnersQuery(ownersQueryParams);
  const owners = ownersData?.data.items ?? [];
  const total = ownersData?.data.pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pagination.limit));

  const loadOwners = useCallback(() => {
    void refetchOwners();
  }, [refetchOwners]);

  const handleChangeTab = (tab: OwnerPageTab) => {
    setActiveTab(tab);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSelectedOwnerIds([]);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const submitAddOwner = async () => {
    setIsAddOwnerSubmitting(true);

    try {
      await withLoading(async () => {
        const createdOwner = await createOwner(addOwnerForm);
        if (createdOwner.data && createdOwner.data.id) {
          await bulkCreateOwnerOutlets(createdOwner.data.id, [
            {
              code: `${addOwnerForm.code}-1`,
              name: addOwnerForm.outlet_name,
              phone: addOwnerForm.outlet_phone || "",
              province: addOwnerForm.outlet_province || "",
              city: addOwnerForm.outlet_city || "",
              district: addOwnerForm.outlet_district || "",
              sub_district: addOwnerForm.outlet_sub_district || "",
              address: addOwnerForm.outlet_address || "",
            },
          ]);
        }
      }, { label: "Menyimpan owner baru..." });

      showSuccess({
        title: "Owner berhasil ditambahkan",
        message: "Owner dan outlet pertamanya berhasil disimpan.",
      });
      setIsAddOwnerModalOpen(false);
      setAddOwnerForm({
        code: "", name: "", brand_name: "", phone: "", email: "", province: "", city: "", district: "",
        sub_district: "", address: "", outlet_name: "", outlet_phone: "", outlet_province: "",
        outlet_city: "", outlet_district: "", outlet_sub_district: "", outlet_address: "",
      });
      loadOwners();
    } catch (err: unknown) {
      showError({
        title: "Gagal menambahkan owner",
        message: "Sistem gagal menyimpan data owner dan outlet baru.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau kode owner sudah dipakai.",
        solution: "Periksa kembali kode owner dan koneksi Anda, lalu coba lagi.",
        technicalDetails: getErrorMessage(err, "Gagal menambahkan owner"),
        onRetry: () => void submitAddOwner(),
      });
    } finally {
      setIsAddOwnerSubmitting(false);
    }
  };

  const handleAddOwnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addOwnerForm.code.trim() || !addOwnerForm.name.trim()) {
      showError({
        title: "Data belum lengkap",
        message: "Kode dan Nama Owner wajib diisi.",
        solution: "Lengkapi kode dan nama owner terlebih dahulu.",
      });
      return;
    }
    if (!addOwnerForm.outlet_name?.trim()) {
      showError({
        title: "Data belum lengkap",
        message: "Nama Outlet Pertama wajib diisi.",
        solution: "Lengkapi nama outlet pertama terlebih dahulu.",
      });
      return;
    }
    void submitAddOwner();
  };

  const handleOpenEditOwner = (owner: BackendOwner) => {
    setEditOwnerForm({
      id: owner.id,
      code: owner.code,
      name: owner.name,
      brand_name: owner.brand_name || "",
      phone: owner.phone || "",
      email: owner.email || "",
      province: owner.province || "",
      city: owner.city || "",
      district: owner.district || "",
      sub_district: owner.sub_district || "",
      address: owner.address || "",
      created_at: owner.created_at || "",
    });
    loadAllForEdit(owner.province, owner.city, owner.district);
    setIsEditOwnerModalOpen(true);
  };

  const submitEditOwner = async () => {
    setIsEditOwnerSubmitting(true);
    try {
      await withLoading(
        () => updateOwner(editOwnerForm.id, {
            code: editOwnerForm.code, name: editOwnerForm.name, brand_name: editOwnerForm.brand_name,
            phone: editOwnerForm.phone, email: editOwnerForm.email, province: editOwnerForm.province, city: editOwnerForm.city,
            district: editOwnerForm.district, sub_district: editOwnerForm.sub_district, address: editOwnerForm.address,
            created_at: editOwnerForm.created_at || undefined,
        }),
        { label: "Menyimpan perubahan owner..." }
      );

      showSuccess({ title: "Owner berhasil diupdate", message: "Perubahan data owner berhasil disimpan." });
      setIsEditOwnerModalOpen(false);
      loadOwners();
    } catch (err: unknown) {
      showError({
        title: "Gagal update owner",
        message: "Sistem gagal menyimpan perubahan data owner.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau kode owner sudah dipakai owner lain.",
        solution: "Periksa kembali data dan koneksi Anda, lalu coba lagi.",
        technicalDetails: getErrorMessage(err, "Gagal update owner"),
        onRetry: () => void submitEditOwner(),
      });
    } finally {
      setIsEditOwnerSubmitting(false);
    }
  };

  const handleEditOwnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOwnerForm.code.trim() || !editOwnerForm.name.trim()) {
      showError({
        title: "Data belum lengkap",
        message: "Kode dan Nama Owner wajib diisi.",
        solution: "Lengkapi kode dan nama owner terlebih dahulu.",
      });
      return;
    }
    void submitEditOwner();
  };

  const [ownerModalThemeMode, setOwnerModalThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    return readStoredThemeMode();
  });

  useEffect(() => {
    const syncTheme = () => setOwnerModalThemeMode(readStoredThemeMode());
    syncTheme();
    window.addEventListener("storage", syncTheme);
    window.addEventListener("piposmart-theme-change", syncTheme as EventListener);
    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("piposmart-theme-change", syncTheme as EventListener);
    };
  }, []);

  const isOwnerModalDark = isDarkTheme(ownerModalThemeMode);

  const handleDownloadExcel = async (type: "owner-outlet" | "owner") => {
    try {
      setIsExporting(true);
      setIsExportMenuOpen(false);
      const { blob, disposition } = await withLoading(async () => {
        return downloadOwnerExportFile(type, {
          q: search || undefined,
          code: filters.code || undefined,
          name: filters.name || undefined,
          phone: filters.phone || undefined,
          brand_name: filters.brand_name || undefined,
          city: filters.city || undefined,
          status: filters.status || undefined,
          subscription_status: filters.status || undefined,
          sort: sort || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          created_from: startDate || undefined,
          created_to: endDate || undefined,
          date_from: startDate || undefined,
          date_to: endDate || undefined,
          owner_kind: activeTab === "non_register" ? "non_register" : "registered",
        });
      }, { label: "Menyiapkan file ekspor..." });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let filename = type === "owner-outlet" ? "Data_Owner_Outlet.xlsx" : "Data_Owner.xlsx";
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showError({
        title: "Gagal mengekspor data",
        message: "Sistem gagal mengunduh file ekspor data owner.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau Anda tidak memiliki izin akses.",
        solution: "Periksa koneksi dan izin akses Anda, lalu coba lagi.",
        technicalDetails: error instanceof Error ? error.message : String(error),
        onRetry: () => void handleDownloadExcel(type),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOwnerIds.length === 0) return;
    const ok = await confirm({
      title: "Hapus Owner Terpilih",
      message: `Apakah Anda yakin ingin menghapus ${selectedOwnerIds.length} owner terpilih? Data akan dipindahkan ke sampah dan bisa dipulihkan nanti.`,
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;

    try {
      await withLoading(() => bulkSoftDeleteOwners(selectedOwnerIds), {
        label: "Menghapus owner terpilih...",
      });
      setSelectedOwnerIds([]);
      setPagination((prev) => ({ ...prev, page: 1 }));
      loadOwners();
    } catch (err: unknown) {
      showError({
        title: "Gagal menghapus owner terpilih",
        message: "Sistem gagal menghapus owner yang dipilih.",
        cause: "Bisa disebabkan oleh koneksi bermasalah.",
        solution: "Periksa koneksi Anda dan coba lagi.",
        technicalDetails: getErrorMessage(err, "Gagal menghapus owner terpilih."),
        onRetry: () => void handleBulkDelete(),
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setImportError(null);
    }
  };

  const handleUploadClick = async () => {
    if (!importFile) return;
    setIsImportLoading(true);
    setImportError(null);
    try {
      const resp = await uploadImportFile(importFile, "OWNER_OUTLET");
      setImportBatch(resp);
      pollImportStatus(resp.id);
    } catch (err: unknown) {
      setImportError(getErrorMessage(err, "Gagal mengunggah file"));
      setIsImportLoading(false);
    }
  };

  const pollImportStatus = async (batchId: number) => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    try {
      const resp = await getImportBatch(batchId);
      setImportBatch(resp);
      const isInProgress = ["UPLOADED", "VALIDATING", "COMMITTING"].includes(resp.status);

      if (isInProgress) {
        pollTimerRef.current = setTimeout(() => pollImportStatus(batchId), 2500);
      } else {
        pollTimerRef.current = null;
        setIsImportLoading(false);

        if (resp.status === "VALIDATED" && resp.invalid_rows > 0) {
          try {
            const errorResp = await getImportErrorRows(batchId);
            setImportErrorRows(errorResp.items);
            setImportError(`Masih terdapat ${resp.invalid_rows} baris dengan format yang tidak valid.`);
          } catch (error) {
            console.error("Gagal memuat detail error:", error);
          }
        } else if (resp.status === "VALIDATED") {
          setImportError(null);
        } else if (resp.status === "VALIDATION_FAILED") {
          setImportError(resp.error_message || "Validasi file gagal. Periksa format dan header file Excel Anda.");
        } else if (resp.status === "COMMIT_FAILED") {
          setImportError(resp.error_message || "Proses simpan data gagal. Silakan coba lagi.");
        }
      }
    } catch (err: unknown) {
      pollTimerRef.current = null;
      setImportError(getErrorMessage(err, "Gagal mengecek status import"));
      setIsImportLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importBatch) return;
    setIsImportLoading(true);
    try {
      const resp = await commitImportBatch(importBatch.id);
      setImportBatch(resp);
      pollImportStatus(resp.id);
    } catch (err: unknown) {
      setImportError(getErrorMessage(err, "Gagal menyimpan data import"));
      setIsImportLoading(false);
    }
  };

  const resetImportState = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setImportFile(null);
    setImportBatch(null);
    setImportError(null);
    setIsImportLoading(false);
    setImportErrorRows([]);
  };

  const handleViewOutlets = (owner: BackendOwner) => {
    router.push(`/menu/owner-outlet/${owner.id}`);
  };

  const getOwnerStatus = (owner: BackendOwner) => {
    const st = (owner.subscription_status || owner.status || "").toUpperCase();
    if (st === "SUBSCRIBE" || st === "BERLANGGANAN" || st === "ACTIVE") return "BERLANGGANAN";
    if (st === "NEW" || st === "BARU") return "NEW";
    if (st === "AKAN_JATUH_TEMPO" || st === "AKAN JATUH TEMPO") return "AKAN JATUH TEMPO";
    if (st === "JATUH_TEMPO" || st === "JATUH TEMPO") return "JATUH TEMPO";
    if (st === "TELAH_JATUH_TEMPO" || st === "TELAH JATUH TEMPO") return "TELAH JATUH TEMPO";
    if (st === "EXPIRED" || st === "UNSUBSCRIBE") return "UNSUBSCRIBE";
    if (st === "NOT_SUBSCRIBE" || st === "NOT SUBSCRIBE" || st === "TIDAK BERLANGGANAN") return "TIDAK BERLANGGANAN";
    if (st === "TRIAL") return "TRIAL";
    return st || "TIDAK BERLANGGANAN";
  };

  const getOwnerStatusBadgeStyle = (status: string) => {
    const st = (status || "").toUpperCase();
    if (st.includes("BERLANGGANAN") || st === "SUBSCRIBE" || st === "ACTIVE") {
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (st === "TRIAL" || st === "NEW" || st === "BARU") {
      return "border border-blue-200 bg-blue-50 text-blue-700";
    }
    return "border border-red-200 bg-red-50 text-red-700 font-bold";
  };

  const subscribeCount = owners.filter((o) => getOwnerStatus(o) === "BERLANGGANAN").length;
  const trialCount = owners.filter((o) => getOwnerStatus(o) === "TRIAL").length;
  const notSubscribeCount = owners.length - subscribeCount - trialCount;
  const isNonRegisterTab = activeTab === "non_register";
  const tableTitle = isNonRegisterTab ? "Non-Register" : "Daftar Owner";
  const tableDescription = isNonRegisterTab
    ? "Data prospek dari user temp yang belum menyelesaikan registrasi."
    : "Daftar seluruh data owner yang terdaftar dalam sistem.";
  const emptyMessage = isNonRegisterTab
    ? "Tidak ada data non-register ditemukan."
    : "Tidak ada data owner ditemukan.";

  const renderSortableHeader = (key: string, label: string) => {
    const isSorted = sort.replace("-", "") === key;
    const isDesc = sort.startsWith("-");
    return (
      <th 
        className="px-4 py-4 font-bold cursor-pointer hover:text-red-700 transition-colors"
        onClick={() => setSort(sort === key ? `-${key}` : key)}
        title={`Urutkan berdasarkan ${label}`}
      >
        <div className="flex items-center gap-2">
          {label}
          <div className="-space-y-1 flex flex-col opacity-40">
            <svg className={`h-2.5 w-2.5 ${isSorted && !isDesc ? "text-[#C92C1E] opacity-100" : ""}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <svg className={`h-2.5 w-2.5 ${isSorted && isDesc ? "text-[#C92C1E] opacity-100" : ""}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </th>
    );
  };

  const statCards = isNonRegisterTab ? (
    <QuickInfoCardGrid>
      <QuickInfoCard
        label="Total Non-Register"
        value={total}
        description="Prospek user temp yang belum menyelesaikan registrasi."
        tone="accent"
        silhouette="building"
      />
      <QuickInfoCard
        label="Pada Halaman Ini"
        value={owners.length}
        description="Data non-register yang tampil sesuai filter aktif."
        tone="sky"
      />
    </QuickInfoCardGrid>
  ) : (
    <QuickInfoCardGrid>
      <QuickInfoCard
        label="Total Owner"
        value={total}
        description="Basis data owner terdaftar di CRM."
        tone="accent"
        silhouette="building"
      />
      <QuickInfoCard
        label="Berlangganan"
        value={subscribeCount}
        description="Owner yang berlangganan pada halaman aktif."
        tone="emerald"
      />
      <QuickInfoCard
        label="Trial"
        value={trialCount}
        description="Owner yang sedang masa trial 14 hari."
        tone="sky"
      />
      <QuickInfoCard
        label="Belum Berlangganan"
        value={notSubscribeCount}
        description="Owner yang belum memiliki paket aktif."
        tone="rose"
      />
    </QuickInfoCardGrid>
  );

  const tabButtons = (
    <div className="space-y-4">
      <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="flex text-sm font-bold">
          {(
            [
              { key: "list", label: "Daftar Owner" },
              { key: "non_register", label: "Non-Register" },
              { key: "analytics", label: "Analisis" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleChangeTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${
                activeTab === tab.key
                  ? "bg-white text-[#C92C1E] shadow-sm"
                  : "text-gray-500 hover:bg-gray-200 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const uniqueNames = Array.from(new Set(owners.map(o => o.name).filter(Boolean))) as string[];
  const uniqueBrands = Array.from(new Set(owners.map(o => o.brand_name).filter(Boolean))) as string[];
  const uniquePhones = Array.from(new Set(owners.map(o => o.phone).filter(Boolean))) as string[];

  const ownerStatusOptions = ["BERLANGGANAN", "TRIAL", "TIDAK BERLANGGANAN", "NEW"];

  const filterInputs = (
    <div className="grid grid-cols-2 gap-4 w-full md:grid-cols-3 lg:grid-cols-7">
      <AutocompleteFilter
        label="Nama Owner"
        placeholder="Filter Nama..."
        value={filters.name || ""}
        onChange={(val) => {
          setFilters(prev => ({ ...prev, name: val }));
          setPagination(prev => ({ ...prev, page: 1 }));
        }}
        options={uniqueNames}
      />
      <AutocompleteFilter
        label="Brand"
        placeholder="Filter Brand..."
        value={filters.brand_name || ""}
        onChange={(val) => {
          setFilters(prev => ({ ...prev, brand_name: val }));
          setPagination(prev => ({ ...prev, page: 1 }));
        }}
        options={uniqueBrands}
      />
      <AutocompleteFilter
        label="Kontak"
        placeholder="Filter Kontak..."
        value={filters.phone || ""}
        onChange={(val) => {
          setFilters(prev => ({ ...prev, phone: val }));
          setPagination(prev => ({ ...prev, page: 1 }));
        }}
        options={uniquePhones}
      />
      <div className="flex flex-col gap-1.5 w-full">
        <span className="text-xs font-semibold text-black">Provinsi</span>
        <select
          value={filters.province || ""}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, province: e.target.value }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
        >
          <option value="">Semua Provinsi</option>
          {provinces.map((prov) => (
            <option key={prov.id} value={prov.name}>
              {prov.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 w-full">
        <span className="text-xs font-semibold text-black">Status</span>
        <select
          value={filters.status || ""}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, status: e.target.value }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
        >
          <option value="">Semua Status</option>
          {ownerStatusOptions.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>
      <label className="flex flex-col gap-1.5 w-full">
        <span className="text-xs font-semibold text-black">Dari Tanggal</span>
        <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]" />
      </label>
      <label className="flex flex-col gap-1.5 w-full">
        <span className="text-xs font-semibold text-black">Sampai Tanggal</span>
        <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]" />
      </label>
    </div>
  );

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
              <span className="text-[#C92C1E]">Owner</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Manajemen Owner
            </h1>
            <p className="mt-1 text-sm text-gray-500 max-w-3xl">
              Data seluruh owner beserta outlet miliknya untuk informasi umum, status langganan, dan sampah data owner.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Stat Cards */}
      <div>{statCards}</div>

      {/* 3. Tabs and Main Content Area */}
      <div className="space-y-4">
        {tabButtons}

        {activeTab === "analytics" ? (
          <AnalyticsTab />
        ) : (
          <div className="flex flex-col rounded-2xl border border-gray-200/60 bg-white shadow-xs">
            <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{tableTitle}</h2>
                <p className="mt-1 text-sm text-gray-500">{tableDescription}</p>
              </div>

              {/* ACTION BUTTONS (BERADA DI SEBELAH KIRI) */}
              <div className="flex flex-wrap items-center gap-3 w-full">
                {!isNonRegisterTab && (
                  <button onClick={() => setIsAddOwnerModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700">
                    <PlusIcon className="h-4 w-4" /> Tambah Owner
                  </button>
                )}

                <div className="relative">
                  <button
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    disabled={isExporting}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50"
                  >
                    <DownloadIcon className="h-4 w-4" /> 
                    {isExporting ? "Mengunduh..." : "Export Data"}
                    <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {isExportMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        onClick={() => handleDownloadExcel("owner-outlet")}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <DownloadIcon className="h-4 w-4 text-[#C92C1E]" />
                        Data Owner-Outlet
                      </button>
                      <button
                        onClick={() => handleDownloadExcel("owner")}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <DownloadIcon className="h-4 w-4 text-blue-600" />
                        Data Owner
                      </button>
                    </div>
                  )}
                </div>

                {selectedOwnerIds.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-700">
                      <svg className="h-4 w-4 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                      {selectedOwnerIds.length} terpilih
                    </div>

                    <button onClick={handleBulkDelete} className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-100">
                      <TrashIcon className="h-4 w-4" /> Hapus Terpilih ({selectedOwnerIds.length})
                    </button>

                    <button
                      onClick={() => setSelectedOwnerIds([])}
                      className="flex items-center justify-center rounded-xl border border-gray-200 bg-white h-10 w-10 text-gray-500 shadow-sm transition-all hover:bg-gray-100 hover:text-gray-900"
                      title="Batalkan Pilihan"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}

                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setIsMoreActionsOpen(!isMoreActionsOpen)}
                    className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 shadow-sm transition-all hover:bg-gray-50"
                    title="Lainnya"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>

                  {isMoreActionsOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        onClick={() => { setIsMoreActionsOpen(false); setIsImportModalOpen(true); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <UploadIcon className="h-4 w-4" /> Import Data
                      </button>
                      <button
                        onClick={() => { setIsMoreActionsOpen(false); setIsImportHistoryModalOpen(true); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <HistoryIcon className="h-4 w-4" /> Riwayat Import
                      </button>
                      <button
                        onClick={() => { setIsMoreActionsOpen(false); router.push("/menu/owner-outlet/trash"); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4" /> Owner Terhapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-b border-gray-50 px-6 py-4">
              <div className="flex flex-wrap items-start gap-4">
                {filterInputs}
              </div>
            </div>

            <div className="border-b border-gray-50 px-6 py-4">
              <div className="flex w-full items-center gap-3">
                <form onSubmit={handleSearch} className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input type="text" placeholder="Cari kode owner, nama owner, email, telepon, outlet, wilayah, brand, dll..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }} className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]" />
                </form>
                <ColumnVisibilityControl tableId="owner-table" storageKey="column-visibility:owner-table" buttonLabel="Kolom" />
              </div>
            </div>

            <div className="relative w-full">
              <div className="flex flex-col">
                <div className="overflow-x-auto">
              <table id="owner-table" data-column-visibility-manual="true" className="w-full min-w-[1080px] text-left text-sm text-gray-600">
                <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="w-12 px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={
                          owners.length > 0 &&
                          selectedOwnerIds.length === owners.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOwnerIds(owners.map((owner) => owner.id));
                          } else {
                            setSelectedOwnerIds([]);
                          }
                        }}
                        className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                      />
                    </th>
                    <th className="w-12 px-4 py-4 text-center font-bold">No.</th>
                    {renderSortableHeader("code", "Kode Owner")}
                    {renderSortableHeader("name", "Nama Owner")}
                    {renderSortableHeader("brand_name", "Brand")}
                    {renderSortableHeader("phone", "Kontak")}
                    {renderSortableHeader("city", "Lokasi")}
                    <th className="px-4 py-4 font-bold text-left">Saldo Aplikasi</th>
                    {renderSortableHeader("created_at", "Tanggal Registrasi")}
                    {renderSortableHeader("status", "Status")}
                    {renderSortableHeader("outlet_count", "Outlet")}
                    <th className="px-4 py-4 text-center font-bold">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoading && owners.length === 0 ? (
                    Array.from({ length: 8 }).map((_, rowIndex) => (
                      <tr key={`skeleton-${rowIndex}`}>
                        {Array.from({ length: 11 }).map((__, colIndex) => (
                          <td key={colIndex} className="px-4 py-4">
                            <SkeletonBlock className="h-4 w-full max-w-[120px]" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : owners.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-10 text-center text-gray-500">
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    owners.map((owner) => {
                      const isSelected = selectedOwnerIds.includes(owner.id);

                      return (
                        <tr
                          key={owner.id}
                          className={`transition-colors cursor-pointer select-none ${
                            isSelected
                              ? "bg-red-50/60 hover:bg-red-50/80"
                              : "hover:bg-gray-50"
                          }`}
                          onMouseDown={(e) => {
                            if ((e.target as HTMLElement).closest('button, a')) return;
                            if (e.button !== 0) return;
                            setIsDragging(true);
                            setDragMode(isSelected ? "deselect" : "select");
                            setSelectedOwnerIds((prev) =>
                              isSelected ? prev.filter((id) => id !== owner.id) : [...prev, owner.id]
                            );
                          }}
                          onMouseEnter={() => {
                            if (isDragging && dragMode) {
                              setSelectedOwnerIds((prev) => {
                                if (dragMode === "select" && !prev.includes(owner.id)) return [...prev, owner.id];
                                if (dragMode === "deselect" && prev.includes(owner.id)) return prev.filter((id) => id !== owner.id);
                                return prev;
                              });
                            }
                          }}
                        >
                          <td className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E] pointer-events-none"
                            />
                          </td>

                          <td className="px-4 py-4 text-center font-bold text-gray-900">
                            {(pagination.page - 1) * pagination.limit + owners.indexOf(owner) + 1}
                          </td>
                          <td className="px-4 py-4 align-top font-bold text-gray-900 whitespace-nowrap">
                            {owner.code || "-"}
                          </td>
                          <td className="px-4 py-4 align-top font-bold text-gray-900">
                            {owner.name}
                          </td>
                          <td className="px-4 py-4 align-top">
                            {owner.brand_name || "-"}
                          </td>
                          <td className="px-4 py-4 align-top">{owner.phone ? formatPhoneDisplay(owner.phone) : "-"}</td>
                          <td className="px-4 py-4 align-top">
                            {[owner.sub_district, owner.district, owner.city, owner.province].filter(Boolean).join(", ") || "-"}
                          </td>
                          <td className="px-4 py-4 align-top text-left whitespace-nowrap font-semibold">
                            <WalletBalanceCell ownerId={owner.id} />
                          </td>
                          <td className="px-4 py-4 align-top whitespace-nowrap">
                            {owner.created_at ? new Date(owner.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                          </td>
                          <td className="px-4 py-4 text-center align-top">
                            {(() => {
                              const st = getOwnerStatus(owner);
                              return (
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${getOwnerStatusBadgeStyle(
                                    st
                                  )}`}
                                >
                                  {st}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-4 text-center align-top">
                            <span className="inline-flex items-center justify-center rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                              {owner.outlet_count || 0}
                            </span>
                          </td>
                          <td
                            className="px-4 py-4 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <RowActionGroup>
                              <ViewActionButton
                                onClick={() => handleViewOutlets(owner)}
                                title="Detail Outlet"
                              />
                              <EditActionButton
                                onClick={() => handleOpenEditOwner(owner)}
                                title="Edit Owner"
                              />

                            </RowActionGroup>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 p-4 sm:flex-row">
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-500">
                  Menampilkan {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, total)} dari {total} data
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">
                    Tampilkan
                  </span>
                  <select
                    value={pagination.limit}
                    onChange={(e) =>
                      setPagination((prev) => ({
                        ...prev,
                        limit: Number(e.target.value),
                        page: 1,
                      }))
                    }
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-[#C92C1E] focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: prev.page - 1,
                    }))
                  }
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Sebelumnya
                </button>

                <span className="text-xs font-bold text-gray-700">
                  Halaman {pagination.page} / {totalPages}
                </span>

                <button
                  disabled={owners.length < pagination.limit}
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: prev.page + 1,
                    }))
                  }
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
      </div>

      <ImportHistoryModal
        isOpen={isImportHistoryModalOpen}
        onClose={() => setIsImportHistoryModalOpen(false)}
        profile="OWNER_OUTLET"
        onResume={(batch) => {
          setImportBatch(batch);
          setIsImportHistoryModalOpen(false);
          setIsImportModalOpen(true);
          pollImportStatus(batch.id);
        }}
      />

      <ModalShell
        open={isAddOwnerModalOpen}
        title="Tambah Owner Baru"
        subtitle="Pendaftaran pemilik baru beserta outlet pertama."
        isDarkMode={isOwnerModalDark}
        disabled={isAddOwnerSubmitting}
        onClose={() => setIsAddOwnerModalOpen(false)}
      >
        <form onSubmit={handleAddOwnerSubmit} className="space-y-5">
          <div className="owner-modal-card rounded-[28px] border border-gray-200 bg-gray-50/80 p-5 dark:border-slate-700 dark:bg-slate-800/90">
            <p className="owner-modal-label text-[10px] font-black uppercase tracking-[0.24em] text-gray-400 dark:text-slate-200">
              Data Owner
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Kode Owner <span className="text-[#C92C1E]">*</span>
                </span>
                <input
                  type="text"
                  value={addOwnerForm.code}
                  onChange={(e) =>
                    setAddOwnerForm({ ...addOwnerForm, code: e.target.value })
                  }
                  placeholder="Contoh: OWN-001"
                  className={modalInputClass}
                  required
                  disabled={isAddOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Nama Owner <span className="text-[#C92C1E]">*</span>
                </span>
                <input
                  type="text"
                  value={addOwnerForm.name}
                  onChange={(e) =>
                    setAddOwnerForm({ ...addOwnerForm, name: e.target.value })
                  }
                  placeholder="Contoh: Budi Santoso"
                  className={modalInputClass}
                  required
                  disabled={isAddOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Nama Brand / Usaha
                </span>
                <input
                  type="text"
                  value={addOwnerForm.brand_name}
                  onChange={(e) =>
                    setAddOwnerForm({
                      ...addOwnerForm,
                      brand_name: e.target.value,
                    })
                  }
                  placeholder="Contoh: Toko Kopi Sejahtera"
                  className={modalInputClass}
                  disabled={isAddOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Nomor Kontak
                </span>
                <input
                  type="tel"
                  value={addOwnerForm.phone}
                  onChange={(e) =>
                    setAddOwnerForm({ ...addOwnerForm, phone: e.target.value })
                  }
                  placeholder="Contoh: 081234567890"
                  className={modalInputClass}
                  disabled={isAddOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Email Owner
                </span>
                <input
                  type="email"
                  value={addOwnerForm.email || ""}
                  onChange={(e) =>
                    setAddOwnerForm({ ...addOwnerForm, email: e.target.value })
                  }
                  placeholder="Contoh: owner@email.com"
                  className={modalInputClass}
                  disabled={isAddOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Provinsi
                </span>
                <select
                  value={addOwnerForm.province}
                  onChange={(e) => {
                    setAddOwnerForm({
                      ...addOwnerForm,
                      province: e.target.value,
                      city: "",
                    });
                    loadCitiesByProvinceName(e.target.value);
                  }}
                  className={modalSelectClass}
                  disabled={isAddOwnerSubmitting || loadingProvinces}
                >
                  <option value="">Pilih Provinsi</option>
                  {provinces.map((province) => (
                    <option key={province.id} value={province.name}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Kota/Kabupaten
                </span>
                <select
                  value={addOwnerForm.city}
                  onChange={(e) => {
                    setAddOwnerForm({
                      ...addOwnerForm,
                      city: e.target.value,
                      district: "",
                      sub_district: "",
                    });
                    loadDistrictsByCityName(e.target.value);
                  }}
                  className={modalSelectClass}
                  disabled={
                    isAddOwnerSubmitting ||
                    !addOwnerForm.province ||
                    loadingCities
                  }
                >
                  <option value="">Pilih Kota/Kabupaten</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Kecamatan
                </span>
                <select
                  value={addOwnerForm.district}
                  onChange={(e) => {
                    setAddOwnerForm({
                      ...addOwnerForm,
                      district: e.target.value,
                      sub_district: "",
                    });
                    loadVillagesByDistrictName(e.target.value);
                  }}
                  className={modalSelectClass}
                  disabled={
                    isAddOwnerSubmitting ||
                    !addOwnerForm.city ||
                    loadingDistricts
                  }
                >
                  <option value="">Pilih Kecamatan</option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.name}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800">
                  Kelurahan/Desa
                </span>
                <select
                  value={addOwnerForm.sub_district}
                  onChange={(e) =>
                    setAddOwnerForm({
                      ...addOwnerForm,
                      sub_district: e.target.value,
                    })
                  }
                  className={modalSelectClass}
                  disabled={
                    isAddOwnerSubmitting ||
                    !addOwnerForm.district ||
                    loadingVillages
                  }
                >
                  <option value="">Pilih Kelurahan/Desa</option>
                  {villages.map((village) => (
                    <option key={village.id} value={village.name}>
                      {village.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800">
                  Alamat Lengkap
                </span>
                <textarea
                  value={addOwnerForm.address}
                  onChange={(e) =>
                    setAddOwnerForm({
                      ...addOwnerForm,
                      address: e.target.value,
                    })
                  }
                  placeholder="Masukkan detail alamat owner..."
                  rows={3}
                  className={modalTextareaClass}
                  disabled={isAddOwnerSubmitting}
                />
              </label>
            </div>
          </div>

          <div className="owner-modal-card rounded-[28px] border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
              Data Outlet Pertama
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Nama Outlet Pertama{" "}
                  <span className="text-[#C92C1E]">*</span>
                </span>
                <input
                  type="text"
                  value={addOwnerForm.outlet_name || ""}
                  onChange={(e) =>
                    setAddOwnerForm({
                      ...addOwnerForm,
                      outlet_name: e.target.value,
                    })
                  }
                  placeholder="Contoh: Toko Kopi Sejahtera Pusat"
                  className={modalInputClass}
                  required
                  disabled={isAddOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Nomor Telepon Outlet
                </span>
                <input
                  type="tel"
                  value={addOwnerForm.outlet_phone || ""}
                  onChange={(e) =>
                    setAddOwnerForm({
                      ...addOwnerForm,
                      outlet_phone: e.target.value,
                    })
                  }
                  placeholder="Contoh: 081234567890"
                  className={modalInputClass}
                  disabled={isAddOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Provinsi Outlet
                </span>
                <select
                  value={addOwnerForm.outlet_province || ""}
                  onChange={(e) => {
                    setAddOwnerForm({
                      ...addOwnerForm,
                      outlet_province: e.target.value,
                      outlet_city: "",
                    });
                    loadOutletCities(e.target.value);
                  }}
                  className={modalSelectClass}
                  disabled={isAddOwnerSubmitting || outletLoadingProvinces}
                >
                  <option value="">Pilih Provinsi</option>
                  {outletProvinces.map((province) => (
                    <option key={province.id} value={province.name}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Kota/Kabupaten Outlet
                </span>
                <select
                  value={addOwnerForm.outlet_city || ""}
                  onChange={(e) => {
                    setAddOwnerForm({
                      ...addOwnerForm,
                      outlet_city: e.target.value,
                      outlet_district: "",
                      outlet_sub_district: "",
                    });
                    loadOutletDistricts(e.target.value);
                  }}
                  className={modalSelectClass}
                  disabled={
                    isAddOwnerSubmitting ||
                    !addOwnerForm.outlet_province ||
                    outletLoadingCities
                  }
                >
                  <option value="">Pilih Kota/Kabupaten</option>
                  {outletCities.map((city) => (
                    <option key={city.id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Kecamatan Outlet
                </span>
                <select
                  value={addOwnerForm.outlet_district || ""}
                  onChange={(e) => {
                    setAddOwnerForm({
                      ...addOwnerForm,
                      outlet_district: e.target.value,
                      outlet_sub_district: "",
                    });
                    loadOutletVillages(e.target.value);
                  }}
                  className={modalSelectClass}
                  disabled={
                    isAddOwnerSubmitting ||
                    !addOwnerForm.outlet_city ||
                    outletLoadingDistricts
                  }
                >
                  <option value="">Pilih Kecamatan</option>
                  {outletDistricts.map((district) => (
                    <option key={district.id} value={district.name}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Kelurahan/Desa Outlet
                </span>
                <select
                  value={addOwnerForm.outlet_sub_district || ""}
                  onChange={(e) =>
                    setAddOwnerForm({
                      ...addOwnerForm,
                      outlet_sub_district: e.target.value,
                    })
                  }
                  className={modalSelectClass}
                  disabled={
                    isAddOwnerSubmitting ||
                    !addOwnerForm.outlet_district ||
                    outletLoadingVillages
                  }
                >
                  <option value="">Pilih Kelurahan/Desa</option>
                  {outletVillages.map((village) => (
                    <option key={village.id} value={village.name}>
                      {village.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Alamat Lengkap Outlet
                </span>
                <textarea
                  value={addOwnerForm.outlet_address || ""}
                  onChange={(e) =>
                    setAddOwnerForm({
                      ...addOwnerForm,
                      outlet_address: e.target.value,
                    })
                  }
                  placeholder="Masukkan detail alamat outlet..."
                  rows={3}
                  className={modalTextareaClass}
                  disabled={isAddOwnerSubmitting}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsAddOwnerModalOpen(false)}
              disabled={isAddOwnerSubmitting}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                isAddOwnerSubmitting ||
                !addOwnerForm.name.trim() ||
                !addOwnerForm.code.trim() ||
                !addOwnerForm.outlet_name?.trim()
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {isAddOwnerSubmitting ? (
                <>
                  <SpinnerIcon />
                  Menyimpan Owner...
                </>
              ) : (
                <>
                  <PlusIcon />
                  Simpan Owner Baru
                </>
              )}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={isEditOwnerModalOpen}
        title="Edit Data Owner"
        subtitle="Perbarui informasi pemilik owner."
        isDarkMode={isOwnerModalDark}
        disabled={isEditOwnerSubmitting}
        onClose={() => setIsEditOwnerModalOpen(false)}
      >
        <form onSubmit={handleEditOwnerSubmit} className="space-y-5">
          <div className="owner-modal-card rounded-[28px] border border-gray-200 bg-gray-50/80 p-5 dark:border-slate-700 dark:bg-slate-800/90">
            <p className="owner-modal-label text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-200">
              Data Owner
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Tgl Dibuat
                </span>
                <input
                  type="datetime-local"
                  value={editOwnerForm.created_at ? formatToDatetimeLocal(editOwnerForm.created_at) : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const isoString = val ? new Date(val).toISOString() : "";
                    setEditOwnerForm({
                      ...editOwnerForm,
                      created_at: isoString,
                    });
                  }}
                  className={modalInputClass}
                  required
                  disabled={isEditOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Kode Owner <span className="text-[#C92C1E]">*</span>
                </span>
                <input
                  type="text"
                  value={editOwnerForm.code}
                  onChange={(e) =>
                    setEditOwnerForm({
                      ...editOwnerForm,
                      code: e.target.value,
                    })
                  }
                  placeholder="Contoh: OWN-001"
                  className={modalInputClass}
                  required
                  disabled={isEditOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Nama Owner <span className="text-[#C92C1E]">*</span>
                </span>
                <input
                  type="text"
                  value={editOwnerForm.name}
                  onChange={(e) =>
                    setEditOwnerForm({
                      ...editOwnerForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="Contoh: Budi Santoso"
                  className={modalInputClass}
                  required
                  disabled={isEditOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Nama Brand / Usaha
                </span>
                <input
                  type="text"
                  value={editOwnerForm.brand_name}
                  onChange={(e) =>
                    setEditOwnerForm({
                      ...editOwnerForm,
                      brand_name: e.target.value,
                    })
                  }
                  placeholder="Contoh: Toko Kopi Sejahtera"
                  className={modalInputClass}
                  disabled={isEditOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Nomor Kontak
                </span>
                <input
                  type="tel"
                  value={editOwnerForm.phone}
                  onChange={(e) =>
                    setEditOwnerForm({
                      ...editOwnerForm,
                      phone: e.target.value,
                    })
                  }
                  placeholder="Contoh: 081234567890"
                  className={modalInputClass}
                  disabled={isEditOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Email Owner
                </span>
                <input
                  type="email"
                  value={editOwnerForm.email || ""}
                  onChange={(e) =>
                    setEditOwnerForm({
                      ...editOwnerForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="Contoh: owner@email.com"
                  className={modalInputClass}
                  disabled={isEditOwnerSubmitting}
                />
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Provinsi
                </span>
                <select
                  value={editOwnerForm.province}
                  onChange={(e) => {
                    setEditOwnerForm({
                      ...editOwnerForm,
                      province: e.target.value,
                      city: "",
                    });
                    loadCitiesByProvinceName(e.target.value);
                  }}
                  className={modalSelectClass}
                  disabled={isEditOwnerSubmitting || loadingProvinces}
                >
                  <option value="">Pilih Provinsi</option>
                  {provinces.map((province) => (
                    <option key={province.id} value={province.name}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800 dark:text-slate-200">
                  Kota/Kabupaten
                </span>
                <select
                  value={editOwnerForm.city}
                  onChange={(e) => {
                    setEditOwnerForm({
                      ...editOwnerForm,
                      city: e.target.value,
                      district: "",
                      sub_district: "",
                    });
                    loadDistrictsByCityName(e.target.value);
                  }}
                  className={modalSelectClass}
                  disabled={
                    isEditOwnerSubmitting ||
                    !editOwnerForm.province ||
                    loadingCities
                  }
                >
                  <option value="">Pilih Kota/Kabupaten</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800">
                  Kecamatan
                </span>
                <select
                  value={editOwnerForm.district}
                  onChange={(e) => {
                    setEditOwnerForm({
                      ...editOwnerForm,
                      district: e.target.value,
                      sub_district: "",
                    });
                    loadVillagesByDistrictName(e.target.value);
                  }}
                  className={modalSelectClass}
                  disabled={
                    isEditOwnerSubmitting ||
                    !editOwnerForm.city ||
                    loadingDistricts
                  }
                >
                  <option value="">Pilih Kecamatan</option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.name}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800">
                  Kelurahan/Desa
                </span>
                <select
                  value={editOwnerForm.sub_district}
                  onChange={(e) =>
                    setEditOwnerForm({
                      ...editOwnerForm,
                      sub_district: e.target.value,
                    })
                  }
                  className={modalSelectClass}
                  disabled={
                    isEditOwnerSubmitting ||
                    !editOwnerForm.district ||
                    loadingVillages
                  }
                >
                  <option value="">Pilih Kelurahan/Desa</option>
                  {villages.map((village) => (
                    <option key={village.id} value={village.name}>
                      {village.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="owner-modal-label text-[11px] font-black uppercase tracking-wide text-gray-800">
                  Alamat Lengkap
                </span>
                <textarea
                  value={editOwnerForm.address}
                  onChange={(e) =>
                    setEditOwnerForm({
                      ...editOwnerForm,
                      address: e.target.value,
                    })
                  }
                  placeholder="Masukkan detail alamat owner..."
                  rows={3}
                  className={modalTextareaClass}
                  disabled={isEditOwnerSubmitting}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsEditOwnerModalOpen(false)}
              disabled={isEditOwnerSubmitting}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                isEditOwnerSubmitting ||
                !editOwnerForm.name.trim() ||
                !editOwnerForm.code.trim()
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {isEditOwnerSubmitting ? (
                <>
                  <SpinnerIcon />
                  Menyimpan...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        open={isImportModalOpen}
        title="Import Excel"
        subtitle="Unggah data owner dan outlet secara massal."
        isDarkMode={isOwnerModalDark}
        label="Import Owner"
        maxWidth="max-w-4xl"
        disabled={isImportLoading}
        onClose={() => setIsImportModalOpen(false)}
      >
        {importError && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {importError}
          </div>
        )}

        {!importBatch ? (
          <>
            {isImportLoading ? (
              <div className="py-14 text-center">
                <div className="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                  <SpinnerIcon className="h-9 w-9 text-[#C92C1E]" />
                </div>
                <h3 className="mb-1 text-lg font-bold text-gray-900">
                  Mengunggah File...
                </h3>
                <p className="text-sm text-gray-500">
                  Mohon tunggu, file sedang dikirim ke server.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5 rounded-[28px] border border-gray-200 bg-gray-50/80 p-5">
                  <p className="text-sm text-gray-600">
                    Unggah file Excel (.xlsx) dengan format yang ditentukan.
                    Kolom wajib:{" "}
                    <span className="font-bold text-gray-800">
                      KODE OWNER, NAMA OWNER, No Hp Owner, NAMA OUTLET
                    </span>
                  </p>
                </div>

                <div className="group relative cursor-pointer rounded-[28px] border-2 border-dashed border-gray-200 bg-[#FAFAFA] p-8 text-center transition-colors hover:border-[#C92C1E]">
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileChange}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />

                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gray-200 bg-white transition-colors group-hover:border-[#C92C1E] group-hover:bg-red-50">
                      <UploadIcon className="h-7 w-7 text-gray-400 transition-colors group-hover:text-[#C92C1E]" />
                    </div>

                    {importFile ? (
                      <div>
                        <p className="text-sm font-bold text-[#C92C1E]">
                          {importFile.name}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {(importFile.size / 1024).toFixed(1)} KB — klik untuk
                          ganti file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-gray-700">
                          Klik atau seret file Excel ke sini
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          Hanya menerima file .xlsx
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleUploadClick}
                    disabled={!importFile}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#C92C1E] px-6 py-3 text-sm font-black text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                  >
                    <UploadIcon />
                    Unggah & Validasi
                  </button>
                </div>
              </>
            )}
          </>
        ) : importBatch.status === "UPLOADED" ? (
          <div className="py-14 text-center">
            <div className="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
              <SpinnerIcon className="h-9 w-9 text-amber-500" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-gray-900">
              File Diterima
            </h3>
            <p className="mb-1 text-sm text-gray-500">
              Menunggu sistem memulai proses validasi...
            </p>
            <p className="text-xs text-gray-400">
              Halaman ini akan otomatis diperbarui
            </p>
          </div>
        ) : importBatch.status === "VALIDATING" ? (
          <div className="py-12 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <SpinnerIcon className="h-8 w-8 text-blue-600" />
            </div>

            <h3 className="mb-2 text-lg font-bold text-gray-900">
              Memvalidasi Data...
            </h3>
            <p className="mb-8 text-sm text-gray-500">
              Mohon tunggu, sistem sedang memeriksa format dan duplikasi data.
            </p>

            {importBatch.progress_percentage !== undefined && (
              <div className="mx-auto w-full max-w-md">
                <div className="mb-2 flex justify-between text-sm font-bold">
                  <span className="text-gray-700">Progress Validasi</span>
                  <span className="text-[#C92C1E]">
                    {importBatch.progress_percentage}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                  <div
                    className="h-3 rounded-full bg-[#C92C1E] transition-all duration-300 ease-out"
                    style={{
                      width: `${importBatch.progress_percentage}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : importBatch.status === "COMMITTING" ? (
          <div className="py-12 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
              <SpinnerIcon className="h-8 w-8 text-indigo-600" />
            </div>

            <h3 className="mb-2 text-lg font-bold text-gray-900">
              Menyimpan Data...
            </h3>
            <p className="mb-8 text-sm text-gray-500">
              Mohon tunggu, sistem sedang menyimpan data ke database.
            </p>

            {importBatch.progress_percentage !== undefined && (
              <div className="mx-auto w-full max-w-md">
                <div className="mb-2 flex justify-between text-sm font-bold">
                  <span className="text-gray-700">Progress Penyimpanan</span>
                  <span className="text-[#C92C1E]">
                    {importBatch.progress_percentage}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                  <div
                    className="h-3 rounded-full bg-[#C92C1E] transition-all duration-300 ease-out"
                    style={{
                      width: `${importBatch.progress_percentage}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : importBatch.status === "VALIDATION_FAILED" ? (
          <div className="py-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>

            <h4 className="mb-2 text-lg font-bold text-gray-900">
              Validasi Gagal
            </h4>

            <p className="mb-6 text-sm text-gray-600">
              {importBatch.error_message ||
                "Terjadi kesalahan saat memvalidasi file Excel. Pastikan format file sudah benar."}
            </p>

            <button
              type="button"
              onClick={() => resetImportState()}
              className="rounded-2xl bg-gray-100 px-6 py-3 text-sm font-black text-gray-700 transition-colors hover:bg-gray-200"
            >
              Kembali
            </button>
          </div>
        ) : importBatch.status === "COMMITTED" ? (
          <div className="py-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
              <svg
                className="h-8 w-8 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h4 className="mb-2 text-lg font-bold text-gray-900">
              File Sudah Disimpan
            </h4>

            <p className="mb-6 px-4 text-sm text-gray-600">
              Data dari file Excel ini telah berhasil disimpan ke database.
            </p>

            <button
              type="button"
              onClick={() => {
                resetImportState();
                setIsImportModalOpen(false);
                loadOwners();
              }}
              className="rounded-2xl bg-gray-100 px-6 py-3 text-sm font-black text-gray-700 transition-colors hover:bg-gray-200"
            >
              Tutup
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  className="h-8 w-8 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h4 className="mb-2 text-lg font-bold text-gray-900">
                Validasi Selesai
              </h4>

              <p className="text-sm text-gray-600">
                Sistem telah memeriksa isi file yang Anda unggah.
              </p>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-center">
                <p className="text-xs font-bold uppercase text-gray-500">
                  Total
                </p>
                <p className="mt-1 text-xl font-black text-gray-900">
                  {importBatch.total_rows}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                <p className="text-xs font-bold uppercase text-emerald-600">
                  Valid
                </p>
                <p className="mt-1 text-xl font-black text-emerald-700">
                  {importBatch.valid_rows}
                </p>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
                <p className="text-xs font-bold uppercase text-red-600">
                  Error
                </p>
                <p className="mt-1 text-xl font-black text-red-700">
                  {importBatch.invalid_rows}
                </p>
              </div>
            </div>

            {importBatch.invalid_rows > 0 && (
              <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
                Terdapat {importBatch.invalid_rows} baris dengan format yang
                salah atau data duplikat. Anda tetap bisa menyimpan{" "}
                {importBatch.valid_rows} data yang valid.
              </div>
            )}

            {importErrorRows.length > 0 && (
              <div className="max-h-96 overflow-hidden overflow-y-auto rounded-2xl border border-orange-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-orange-100 text-orange-800">
                    <tr>
                      <th className="w-16 px-3 py-2">Baris</th>
                      <th className="px-3 py-2">Keterangan Error</th>
                    </tr>
                  </thead>

                  <tbody>
                    {importErrorRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-orange-100 bg-orange-50/50"
                      >
                        <td className="px-3 py-2 align-top font-bold text-orange-900">
                          {row.row_index}
                        </td>

                        <td className="break-words px-3 py-2 align-top text-orange-800">
                          {row.validation_errors ? (
                            Array.isArray(row.validation_errors) ? (
                              <ul className="list-inside list-disc">
                                {row.validation_errors.map((err, index) => (
                                  <li key={index}>{err}</li>
                                ))}
                              </ul>
                            ) : (
                              String(row.validation_errors)
                            )
                          ) : (
                            "Format tidak valid"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => resetImportState()}
                disabled={isImportLoading}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                onClick={handleCommitImport}
                disabled={isImportLoading || importBatch.valid_rows === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {isImportLoading ? (
                  <>
                    <SpinnerIcon />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <DownloadIcon />
                    Simpan Data Valid
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </ModalShell>
    </div>
  );
}
