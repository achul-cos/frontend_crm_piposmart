"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

import {
  type OwnerListParams,
  getLeadsWithTotal,
  type BackendLead,
  getSalesList,
  getSupervisorList,
  getProfile,
  bulkAssignSupervisorToLeads,
  bulkAssignSalesToLeads,
  createInteraction,
  createLeadClosing,
  getLeadInteractions,
  getLeadTrainings,
  softDeleteOwner,
  fetchOwners,
  bulkSoftDeleteOwners,
  updateOwner,
  scheduleTraining,
  type UserResponse,
  bulkReleaseLeads,
  uploadImportFile,
  getImportBatch,
  commitImportBatch,
  getImportErrorRows,
  getImportValidRows,
  type ImportBatchResponse,
  type ImportRowError,
} from "@/app/lib/api";
import * as XLSX from "xlsx";
import CallPage, { CallFormResult } from "./call/page";
import ActionButtons, { EditProfileModal } from "./action/page";
import AnalyticsTab from "./AnalyticsTab";
import ImportHistoryModal from "@/app/components/ImportHistoryModal";
import LeadFormModal from "./LeadFormModal";

interface NasabahItem {
  totalFu: number;
  tanggalFu: string;
  tahun: string;
  bulan: string;
  no: number;
  pic: string;
  picRole?: string;
  tanggalDibagikan: string;
  statusAkun: string;
  kodeBaris: string;
  kodeOwner: string;
  ownerId?: number;
  namaOwner: string;
  projectBrand: string;
  outlet: string;
  outlets?: {
    namaOutlet: string;
    noHpOutlet?: string;
  }[];
  noHpOwner: string;
  noHpOutlet: string;
  createDateProject: string;
  expiredDate: string;
  totalTransaksi: number;
  scor: number;
  callStatus: string;
  chatStatus: string;
  validitas: string;
  remarks: string;
  sumberNasabah: string;
  finalisasiClosing: string;
  skemaId?: string;
  nominal: number;
  noted: string;
  callHistories?: {
    waktuCall: string;
    picSales: string;
    remark: string;
    conclusion?: string;
  }[];
  trainingSessions?: string[];
  trainingHistories?: {
    waktuTraining: string;
    lokasiTraining: string;
  }[];
  purchaseHistories?: {
    paket: string;
    waktuMulai: string;
    waktuBerakhir: string;
    hargaAktual: number;
    snapshot?: {
      paketId: string;
      namaPaket: string;
      hargaPaketBulanan: number;
      promoId: string;
      namaPromo: string;
      tenor: number;
      bonus: number;
      hargaNormal: number;
      diskonPromo: number;
      hargaPromo: number;
      jenisPromo: string;
      bundlingItems: string[];
      potonganTambahan: number;
      kodeUnik: number;
    };
  }[];
}

type EditModalMode = "profil";
type DeleteTargetMode = "selected" | "page" | "filtered" | "custom";

const LIST_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const getTodayInputDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const LIST_SKOR = [
  { value: "0", label: "Tidak Potensial (0)", scor: 0 },
  { value: "1", label: "Kemungkinan Potensial (1)", scor: 1 },
  { value: "2", label: "Potensial (2)", scor: 2 },
  { value: "3", label: "Langganan (3)", scor: 3 },
];

const getSkorValueFromItem = (item?: Partial<NasabahItem> | null) => {
  return String(item?.scor ?? "0");
};

const getLatestRemarkScore = (item?: Partial<NasabahItem> | null) => {
  return String(item?.scor ?? "0");
};

const isInvalidPic = (pic?: string) => {
  const normalizedPic = String(pic || "").trim().toLowerCase();

  return (
    normalizedPic === "" ||
    normalizedPic === "-" ||
    normalizedPic === "invalid" ||
    normalizedPic.includes("invalid") ||
    normalizedPic === "no pic"
  );
};

const isTrialPackage = (value?: string) => String(value || "").toLowerCase().includes("trial");

const isSubscribedCustomer = (item: Partial<NasabahItem>) => {
  const activePurchase = item.purchaseHistories?.some((purchase) => !isTrialPackage(purchase.paket));

  if (activePurchase) return true;

  const statusAkun = String(item.statusAkun || "").toLowerCase();

  return statusAkun.includes("berlangganan") || statusAkun.includes("pro") || statusAkun.includes("business") || statusAkun.includes("basic");
};

const formatPercentValue = (value: number) => `${Math.round(value)}%`;

const REQUIRED_PROFILE_FIELDS = [
  { key: "kodeOwner", label: "Kode Owner" },
  { key: "namaOwner", label: "Nama Owner" },
  { key: "projectBrand", label: "Nama Brand" },
  { key: "outlet", label: "Nama Outlet" },
  { key: "noHpOwner", label: "Nomor Telepon Owner" },
  { key: "noHpOutlet", label: "Nomor Telepon Outlet" },
  { key: "pic", label: "PIC Sales" },
] as const;

type ProfileFieldKey = (typeof REQUIRED_PROFILE_FIELDS)[number]["key"];
type ProfileValidationErrors = Partial<Record<ProfileFieldKey, string>>;

const isValidInternationalPhone = (value?: string) => {
  const digitsOnly = String(value || "").replace(/\D/g, "");

  return digitsOnly.length >= 8 && digitsOnly.length <= 16;
};

const getProfileFieldErrors = (item: Partial<NasabahItem>) => {
  const errors: ProfileValidationErrors = {};

  REQUIRED_PROFILE_FIELDS.forEach(({ key, label }) => {
    const value = item[key];

    if (typeof value !== "string" || value.trim() === "") {
      errors[key] = `${label} wajib diisi.`;
    }
  });

  if (!errors.noHpOwner && !isValidInternationalPhone(item.noHpOwner)) {
    errors.noHpOwner = "Nomor Telepon Owner belum valid.";
  }

  if (!errors.noHpOutlet && !isValidInternationalPhone(item.noHpOutlet)) {
    errors.noHpOutlet = "Nomor Telepon Outlet belum valid.";
  }

  return errors;
};

const getOwnerFilterDate = (item: Partial<NasabahItem>) => {
  const rawDate = (
    item.tanggalFu ||
    item.createDateProject ||
    item.tanggalDibagikan ||
    ""
  );
  return rawDate ? rawDate.split("T")[0] : "";
};

const getOwnerFilterMonth = (item: Partial<NasabahItem>) => {
  const dateValue = getOwnerFilterDate(item);

  if (dateValue && dateValue.includes("-")) {
    const monthIndex = Number(dateValue.split("-")[1]) - 1;
    return LIST_BULAN[monthIndex] || item.bulan || "";
  }

  return item.bulan || "";
};

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-3.5 h-3.5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18" />
  </svg>
);

function getQuickSkorBadgeClass(item: NasabahItem) {
  const value = getSkorValueFromItem(item);

  if (value === "3") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (value === "2") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (value === "1") return "bg-orange-50 text-orange-700 border border-orange-200";

  return "bg-gray-50 text-gray-600 border border-gray-200";
}

function PicBadge({
  value,
  color = "red",
}: {
  value: string;
  color?: "red" | "green";
}) {
  const colorClass =
    color === "green"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : "bg-red-50 border-red-200 text-[#C92C1E]";

  return (
    <span
      className={`inline-flex max-w-[150px] items-center justify-center rounded-full border px-2.5 py-1 text-center text-[10px] font-black uppercase tracking-tight ${colorClass}`}
      title={value || "-"}
    >
      <span className="truncate">{value || "-"}</span>
    </span>
  );
}

function getSkorLabelFromItem(item: NasabahItem) {
  const skorValue = getSkorValueFromItem(item);
  const skor = LIST_SKOR.find((row) => row.value === skorValue);

  return skor?.label || "Tidak Potensial (0)";
}

function SkorBadge({ item }: { item: NasabahItem }) {
  return (
    <span
      className={`inline-flex max-w-[180px] items-center justify-center rounded-full px-2.5 py-1 text-center text-[10px] font-black uppercase tracking-tight ${getQuickSkorBadgeClass(item)}`}
      title={getSkorLabelFromItem(item)}
    >
      <span className="truncate">{getSkorLabelFromItem(item)}</span>
    </span>
  );
}

function FieldIcon({ type }: { type: "code" | "user" | "brand" | "outlet" | "phone" | "sales" }) {
  const className = "h-4 w-4 text-[#C92C1E]";

  if (type === "code") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h6m-6 5h10M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
      </svg>
    );
  }

  if (type === "user") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
      </svg>
    );
  }

  if (type === "brand") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 21V8.25A2.25 2.25 0 016.75 6h10.5a2.25 2.25 0 012.25 2.25V21M8.25 6V3.75h7.5V6M8.25 11.25h.008M12 11.25h.008M15.75 11.25h.008M8.25 15h.008M12 15h.008M15.75 15h.008" />
      </svg>
    );
  }

  if (type === "outlet") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 4l7.5 6.5M6.75 9.5V20.25h10.5V9.5M9.75 20.25v-6h4.5v6" />
      </svg>
    );
  }

  if (type === "phone") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372a1.125 1.125 0 00-.852-1.091l-4.423-1.106a1.125 1.125 0 00-1.173.417l-.97 1.293a1.125 1.125 0 01-1.21.38 12.035 12.035 0 01-7.143-7.143 1.125 1.125 0 01.38-1.21l1.293-.97a1.125 1.125 0 00.417-1.173L6.963 3.102A1.125 1.125 0 005.872 2.25H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM3.75 21a8.25 8.25 0 0116.5 0M18.75 8.25h2.25M19.875 7.125v2.25" />
    </svg>
  );
}

function SummaryMetricCard({
  title,
  value,
  description,
  isPrimary = false,
}: {
  title: string;
  value: string | number;
  description: string;
  isPrimary?: boolean;
}) {
  if (isPrimary) {
    return (
      <div className="bg-gradient-to-br from-[#C92C1E] to-[#A82216] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[140px]">
        <div className="relative z-10">
          <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
          <h2 className="text-3xl font-black">{value}</h2>
          <p className="text-red-200 text-[10px] font-medium mt-2 max-w-[90%]">{description}</p>
        </div>
        <svg className="absolute -bottom-4 -right-4 w-28 h-28 text-white opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.001 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-[#C92C1E] transition-colors min-h-[140px]">
      <div className="relative z-10">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
        <h2 className="text-3xl font-black text-gray-900">{value}</h2>
        <p className="text-gray-400 text-[10px] font-medium mt-2">{description}</p>
      </div>
    </div>
  );
}

export default function DataKelolaanPage() {
  usePageTitle("Lead");
  const router = useRouter();


  const [dataNasabah, setDataNasabah] = useState<NasabahItem[]>([]);
  const [backendTotal, setBackendTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [salesList, setSalesList] = useState<UserResponse[]>([]);
  const [supervisorList, setSupervisorList] = useState<UserResponse[]>([]);
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportHistoryModalOpen, setIsImportHistoryModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBatch, setImportBatch] = useState<ImportBatchResponse | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importErrorRows, setImportErrorRows] = useState<ImportRowError[]>([]);
  const [editedErrorRows, setEditedErrorRows] = useState<Record<number, any>>({});
  const [isApplyingCorrections, setIsApplyingCorrections] = useState(false);
  const [correctionProgress, setCorrectionProgress] = useState(0);
  const [correctionStatusText, setCorrectionStatusText] = useState("");
  // Ref untuk menyimpan timer polling — agar bisa dibatalkan kapanpun
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref untuk combobox input PIC — dipakai menghitung posisi dropdown fixed
  const picSearchRef = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const openDropdownWithPosition = () => {
    if (picSearchRef.current) {
      const rect = picSearchRef.current.closest('[data-combobox]')?.getBoundingClientRect()
        ?? picSearchRef.current.getBoundingClientRect();
      setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setBulkPicDropdownOpen(true);
  };


  // Batalkan polling otomatis saat komponen unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const combinedPicList = useMemo(() => {
    return [...supervisorList, ...salesList];
  }, [supervisorList, salesList]);

  const [filterMode, setFilterMode] = useState<"harian" | "bulanan">("harian");

  const [searchKodeOwner, setSearchKodeOwner] = useState("");
  const [searchNamaOwner, setSearchNamaOwner] = useState("");
  const [searchNamaBrand, setSearchNamaBrand] = useState("");
  const [startDateFilter, setStartDateFilter] = useState(() => getTodayInputDate());
  const [endDateFilter, setEndDateFilter] = useState(() => getTodayInputDate());
  const [startMonthFilter, setStartMonthFilter] = useState("");
  const [endMonthFilter, setEndMonthFilter] = useState("");
  const [picFilter, setPicFilter] = useState("Semua");
  const [skorFilter, setSkorFilter] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [sort, setSort] = useState<string>("no");
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionAction, setSelectionAction] = useState<"edit" | "delete" | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleRowMouseDown = (id: number, currentlySelected: boolean) => {
    setIsDragging(true);
    const mode = currentlySelected ? "deselect" : "select";
    setDragMode(mode);
    
    setSelectedIds(prev => {
      if (mode === "select" && !prev.includes(id)) return [...prev, id];
      if (mode === "deselect" && prev.includes(id)) return prev.filter(selectedId => selectedId !== id);
      return prev;
    });
  };

  const handleRowMouseEnter = (id: number) => {
    if (isDragging) {
      setSelectedIds(prev => {
        if (dragMode === "select" && !prev.includes(id)) return [...prev, id];
        if (dragMode === "deselect" && prev.includes(id)) return prev.filter(selectedId => selectedId !== id);
        return prev;
      });
    }
  };
  const [deleteTargetMode, setDeleteTargetMode] = useState<DeleteTargetMode>("selected");
  const [deleteCustomLimit, setDeleteCustomLimit] = useState("25");
  const [trashCount, setTrashCount] = useState(0);

  const [modalMode, setModalMode] = useState<EditModalMode>("profil");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NasabahItem | null>(null);
  const [profileValidationErrors, setProfileValidationErrors] = useState<ProfileValidationErrors>({});
  const [callModalItem, setCallModalItem] = useState<NasabahItem | null>(null);

  const [bulkPicModalOpen, setBulkPicModalOpen] = useState(false);
  const [bulkSelectedPic, setBulkSelectedPic] = useState("");
  const [bulkActionReason, setBulkActionReason] = useState("");
  const [bulkPicSearch, setBulkPicSearch] = useState("");
  const [bulkPicDropdownOpen, setBulkPicDropdownOpen] = useState(false);


  const [loggedInUser, setLoggedInUser] = useState("Satria");
  const [loggedInRole, setLoggedInRole] = useState("Developer");
  const [isAdminState, setIsAdminState] = useState(false);
  const [isSupervisorState, setIsSupervisorState] = useState(false);
  const [isSalesState, setIsSalesState] = useState(false);
  const [activeTodayDate, setActiveTodayDate] = useState(() => getTodayInputDate());

  const mapBackendLeadToNasabahItem = useCallback((lead: BackendLead): NasabahItem => {
    return {
      no: lead.id,
      pic: lead.current_owner?.name || "-",
      picRole: lead.current_owner_role,
      tanggalDibagikan: lead.created_at,
      statusAkun: lead.status,
      kodeBaris: lead.code,
      kodeOwner: lead.owner?.code || "-",
      ownerId: lead.owner?.id,
      namaOwner: lead.owner?.name || "-",
      projectBrand: lead.owner?.brand_name || "-",
      outlet: String(lead.outlet_id || "-"),
      noHpOwner: lead.owner?.phone || "-",
      noHpOutlet: "-",
      createDateProject: lead.created_at,
      expiredDate: "-",
      totalTransaksi: 0,
      scor: lead.current_score || 0,
      callStatus: lead.stage,
      chatStatus: lead.status,
      validitas: "Valid",
      remarks: "-",
      sumberNasabah: lead.source_type,
      finalisasiClosing: "-",
      nominal: 0,
      noted: "-",
      outlets: [],
      totalFu: 0,
      tanggalFu: "",
      tahun: new Date().getFullYear().toString(),
      bulan: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    };
  }, []);

  const loadOwnersFromBackend = useCallback(() => {
    setIsLoading(true);

    const q = [searchKodeOwner, searchNamaOwner, searchNamaBrand]
      .filter(Boolean)
      .join(" ");

    const params: any = {
      page: currentPage,
      limit: rowsPerPage,
      q: q || undefined,
    };

    if (picFilter !== "Semua") {
      if (picFilter === "No PIC") {
        params.status = "OPEN"; // Assuming No PIC means unassigned or open stage
      } else if (picFilter.startsWith("ROLE:")) {
        params.ownership = picFilter.replace("ROLE:", "");
      } else {
        // If it's a specific PIC name, append to search query
        params.q = params.q ? `${params.q} ${picFilter}` : picFilter;
      }
    }

    if (skorFilter !== "Semua") {
      params.score = skorFilter;
    }

    if (filterMode === "harian") {
      // Temporarily disabled to avoid hiding all leads by default since backend only checks next_follow_up_at
      // if (startDateFilter) params.follow_up_from = startDateFilter;
      // if (endDateFilter) params.follow_up_to = endDateFilter;
    }

    if (sort && sort !== "no" && sort !== "-no") {
      // Map frontend sort keys to backend sort keys
      let backendSort = sort;
      const isDesc = sort.startsWith("-");
      const key = sort.replace("-", "");
      
      let mappedKey = "";
      if (key === "kodeOwner") mappedKey = "code";
      else if (key === "namaOwner") mappedKey = "owner_name";
      else if (key === "skor") mappedKey = "score";
      else if (key === "status") mappedKey = "status";
      else if (key === "stage") mappedKey = "stage";
      else if (key === "tanggalFu") mappedKey = "next_follow_up_at";
      
      if (mappedKey) {
        params.sort = isDesc ? `-${mappedKey}` : mappedKey;
      }
    }

    getLeadsWithTotal(params)
      .then(({ items, total }) => {
        const mappedData = items.map(mapBackendLeadToNasabahItem);
        setDataNasabah(mappedData);
        setBackendTotal(total);
        try {
          localStorage.setItem("piposmart_nasabah_data", JSON.stringify(mappedData));
        } catch (e) {
          console.warn("localStorage quota exceeded for piposmart_nasabah_data");
        }
      })
      .catch((err) => {
        console.error("Gagal memuat lead dari backend:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [
    mapBackendLeadToNasabahItem,
    currentPage,
    rowsPerPage,
    searchKodeOwner,
    searchNamaOwner,
    searchNamaBrand,
    skorFilter,
    filterMode,
    startDateFilter,
    endDateFilter,
    sort
  ]);

  useEffect(() => {
    const userName = localStorage.getItem("piposmart_user_name");
    const currentUserRole = localStorage.getItem("piposmart_user_role");

    if (userName) setLoggedInUser(userName);
    if (currentUserRole) setLoggedInRole(currentUserRole);

    const isAdmin = ["Developer", "Admin", "ADMIN", "Direktur"].includes(currentUserRole || "");
    const isSupervisor = ["Supervisor", "SUPERVISOR"].includes(currentUserRole || "");
    const isSales = ["Sales", "SALES"].includes(currentUserRole || "");

    setIsAdminState(isAdmin);
    setIsSupervisorState(isSupervisor);
    setIsSalesState(isSales);

    if (isAdmin) {
      getSalesList().then(setSalesList).catch(console.error);
      getSupervisorList().then(setSupervisorList).catch(console.error);
    } else if (isSupervisor) {
      getSalesList().then(setSalesList).catch(console.error);
      getProfile().then(me => {
        if (me && me.id) {
          setSupervisorList(prev => {
            if (prev.find(s => s.id === me.id)) return prev;
            return [...prev, { id: me.id, name: me.name, role_code: "SUPERVISOR" } as unknown as UserResponse];
          });
        }
      }).catch(console.error);
    }

    loadOwnersFromBackend();

    fetchOwners({ scope: "trash", limit: 1 })
      .then((res) => setTrashCount(res.data.pagination.total))
      .catch(() => setTrashCount(0));
  }, [loadOwnersFromBackend]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const today = getTodayInputDate();

      if (today !== activeTodayDate) {
        setActiveTodayDate(today);

        if (filterMode === "harian") {
          setStartDateFilter(today);
          setEndDateFilter(today);
        }
      }
    }, 60000);

    return () => window.clearInterval(interval);
  }, [activeTodayDate, filterMode]);

  useEffect(() => {
    const isAnyPopupOpen = editModalOpen || bulkPicModalOpen;

    if (!isAnyPopupOpen || typeof window === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [editModalOpen, bulkPicModalOpen, callModalItem]);

  const saveDataNasabah = (nextData: NasabahItem[]) => {
    setDataNasabah(nextData);
    try {
      localStorage.setItem("piposmart_nasabah_data", JSON.stringify(nextData));
    } catch (e) {
      console.warn("localStorage quota exceeded for piposmart_nasabah_data");
    }
  };

  const handleExportExcel = () => {
    if (dataNasabah.length === 0) {
      alert("Tidak ada data kelolaan untuk diexport.");
      return;
    }

    const dataToExport = dataNasabah.map(o => ({
      "Kode Baris": o.kodeBaris,
      "Kode Owner": o.kodeOwner,
      "Nama Owner": o.namaOwner,
      "Brand/Usaha": o.projectBrand,
      "Status Akun": o.statusAkun,
      "PIC": o.pic,
      "Tanggal Dibagikan": o.tanggalDibagikan,
      "Total FU": o.totalFu,
      "Tanggal FU": o.tanggalFu,
      "Nilai Skor": o.scor,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Lead");
    XLSX.writeFile(workbook, `Data_Lead_${new Date().getTime()}.xlsx`);
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
    } catch (err: any) {
      setImportError(err.message || "Gagal mengunggah file");
      setIsImportLoading(false);
    }
  };

  const pollImportStatus = async (batchId: number) => {
    // Batalkan timer sebelumnya (jika ada) sebelum mulai polling baru
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    try {
      const resp = await getImportBatch(batchId);
      setImportBatch(resp);

      const isInProgress = ["UPLOADED", "VALIDATING", "COMMITTING"].includes(resp.status);
      if (isInProgress) {
        // Jadwalkan polling berikutnya dan simpan timer ID-nya
        pollTimerRef.current = setTimeout(() => pollImportStatus(batchId), 2500);
      } else {
        // Status sudah final — hentikan polling
        pollTimerRef.current = null;
        setIsImportLoading(false);
        setCorrectionProgress(100);
        setCorrectionStatusText("Selesai!");
        setTimeout(() => {
          setCorrectionProgress(0);
          setCorrectionStatusText("");
        }, 2000);

        if (resp.status === "VALIDATED" && resp.invalid_rows > 0) {
          try {
            const errorResp = await getImportErrorRows(batchId);
            setImportErrorRows(errorResp.items);
            setImportError(`Masih terdapat ${resp.invalid_rows} baris dengan format yang tidak valid.`);
          } catch (e) {
            console.error("Gagal memuat detail error:", e);
          }
        } else if (resp.status === "VALIDATED") {
          setImportError(null);
        } else if (resp.status === "VALIDATION_FAILED") {
          setImportError(resp.error_message || "Validasi file gagal. Periksa format dan header file Excel Anda.");
        } else if (resp.status === "COMMIT_FAILED") {
          setImportError(resp.error_message || "Proses simpan data gagal. Silakan coba lagi.");
        }
      }
    } catch (err: any) {
      pollTimerRef.current = null;
      setImportError(err.message || "Gagal mengecek status import");
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
    } catch (err: any) {
      setImportError(err.message || "Gagal menyimpan data import");
      setIsImportLoading(false);
    }
  };

  const resetImportState = () => {
    // Batalkan polling yang sedang berjalan sebelum reset state
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setImportFile(null);
    setImportBatch(null);
    setImportError(null);
    setIsImportLoading(false);
    setImportErrorRows([]);
    setEditedErrorRows({});
    setCorrectionProgress(0);
    setCorrectionStatusText("");
  };

  const handleEditErrorRow = (rowId: number, field: string, value: string) => {
    setEditedErrorRows((prev) => {
      const originalRow = importErrorRows.find((r) => r.id === rowId);
      const currentPayload = prev[rowId] || (originalRow ? originalRow.raw_payload : {});
      return {
        ...prev,
        [rowId]: {
          ...currentPayload,
          [field]: value,
        },
      };
    });
  };

  const handleApplyCorrections = async () => {
    if (!importBatch) return;
    setIsApplyingCorrections(true);
    setImportError(null);
    setCorrectionProgress(10);
    setCorrectionStatusText("Menyiapkan data perbaikan...");
    
    try {
      const correctedPayloads = importErrorRows.map(row => {
        return editedErrorRows[row.id] || row.raw_payload;
      });

      setCorrectionProgress(30);
      setCorrectionStatusText("Mengambil data valid dari server...");
      const validResp = await getImportValidRows(importBatch.id);
      const validPayloads = validResp.items.map(item => item.raw_payload);
      
      setCorrectionProgress(50);
      setCorrectionStatusText("Menyusun ulang file Excel...");
      const allPayloads = [...validPayloads, ...correctedPayloads];

      const worksheet = XLSX.utils.json_to_sheet(allPayloads);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Lead");
      
      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const file = new File([wbout], "import_corrected.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      setCorrectionProgress(70);
      setCorrectionStatusText("Mengunggah ulang file perbaikan...");
      setIsImportLoading(true);
      const resp = await uploadImportFile(file, "LEAD");
      setImportBatch(resp);
      
      setCorrectionProgress(90);
      setCorrectionStatusText("Memvalidasi ulang data...");
      pollImportStatus(resp.id);
    } catch (e: any) {
      console.error(e);
      setImportError(e.message || "Gagal menerapkan perbaikan.");
      setIsApplyingCorrections(false);
      setCorrectionProgress(0);
      setCorrectionStatusText("");
    }
  };

  const handleStartSelectionMode = (action: "edit" | "delete") => {
    setSelectionMode(true);
    setSelectionAction(action);
    setSelectedIds([]);

    if (action === "delete") {
      setDeleteTargetMode("page");
    }
  };

  const handleCancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectionAction(null);
    setSelectedIds([]);
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id],
    );
  };

  const moveItemsToTrash = async (itemsToDelete: NasabahItem[]) => {
    if (itemsToDelete.length === 0) {
      alert("Belum ada data yang dipilih untuk dihapus.");
      return;
    }
    const deleteSet = new Set(itemsToDelete.map((i) => i.no));
    const nextData = dataNasabah.filter((row) => !deleteSet.has(row.no));

    saveDataNasabah(nextData);
    
    // Call API to soft delete
    const ownerIds = itemsToDelete.map(item => item.ownerId).filter((id): id is number => id !== undefined);
    if (ownerIds.length > 0) {
      try {
        await bulkSoftDeleteOwners(ownerIds);
        console.log("Successfully soft deleted owners via API");
        fetchOwners({ scope: "trash", limit: 1 })
          .then((res) => setTrashCount(res.data.pagination.total))
          .catch(() => {});
      } catch (err) {
        console.error("Failed to soft delete owners via API", err);
      }
    }

    setSelectedIds([]);
    setSelectionMode(false);
    setSelectionAction(null);

    alert(`${itemsToDelete.length} data dipindahkan ke Riwayat Hapus.`);
  };

  const prepareDeleteTarget = () => {
    setDeleteTargetMode(selectedIds.length > 0 ? "selected" : "filtered");
    setDeleteCustomLimit(String(Math.min(rowsPerPage, backendTotal || 1)));
  };

  const getCustomDeleteLimit = () => {
    const parsedLimit = Number(deleteCustomLimit);

    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return 0;
    }

    return Math.min(Math.floor(parsedLimit), backendTotal);
  };

  const getDeleteTargetItems = () => {
    if (deleteTargetMode === "selected") {
      const selectedSet = new Set(selectedIds);
      return dataNasabah.filter((item) => selectedSet.has(item.no));
    }

    if (deleteTargetMode === "page") {
      const pageSet = new Set(currentPageIds);
      return dataNasabah.filter((item) => pageSet.has(item.no));
    }

    if (deleteTargetMode === "custom") {
      return dataNasabah.slice(0, getCustomDeleteLimit());
    }

    return dataNasabah;
  };

  const handleConfirmDeleteBulk = () => {
    const targetItems = getDeleteTargetItems();

    if (targetItems.length === 0) {
      alert("Belum ada data yang masuk ke pilihan hapus.");
      return;
    }

    const yakin = confirm(
      `Yakin ingin memindahkan ${targetItems.length} data ke Riwayat Hapus? Data masih bisa dipulihkan dari halaman Trash.`,
    );

    if (!yakin) return;

    moveItemsToTrash(targetItems);
  };

  const handleHapusSatuData = async (item: NasabahItem) => {
    const yakin = confirm(
      `Yakin ingin memindahkan data "${item.namaOwner}" ke Riwayat Hapus?`,
    );

    if (!yakin) return;

    const nextData = dataNasabah.filter((row) => row.no !== item.no);
    saveDataNasabah(nextData);

    if (item.ownerId) {
      try {
        await softDeleteOwner(item.ownerId);
        fetchOwners({ scope: "trash", limit: 1 })
          .then((res) => setTrashCount(res.data.pagination.total))
          .catch(() => {});
      } catch (err) {
        console.error("Failed to soft delete owner via API", err);
      }
    }

    alert("Data dipindahkan ke Riwayat Hapus.");
  };

  const handleOpenCallAction = async (item: NasabahItem) => {
    try {
      // Tarik riwayat interaksi & training dari backend secara paralel
      const [interactions, trainings] = await Promise.all([
        getLeadInteractions(item.no),
        getLeadTrainings(item.no),
      ]);

      // Map riwayat call/chat dari backend → format callHistories
      const callHistories = interactions.map((i) => ({
        waktuCall: new Date(i.interaction_at).toLocaleString("id-ID"),
        picSales: i.sales?.name || i.created_by?.name || "-",
        remark: i.remark_score !== undefined && i.remark_score !== null
          ? String(i.remark_score)
          : "-",
        conclusion: i.note || "-",
      }));

      // Map riwayat training dari backend → format trainingHistories
      const trainingHistories = trainings.map((t) => ({
        waktuTraining: t.scheduled_at
          ? new Date(t.scheduled_at).toLocaleString("id-ID")
          : "-",
        lokasiTraining: t.location || t.training_type || "-",
      }));

      // Merge ke item agar tampil di modal
      const enrichedItem: NasabahItem = {
        ...item,
        callHistories,
        trainingHistories,
        totalFu: callHistories.length,
      };

      setCallModalItem(enrichedItem);
    } catch (err) {
      console.error("Gagal memuat riwayat interaksi:", err);
      // Tetap buka modal meski gagal memuat riwayat
      setCallModalItem(item);
    }
  };

  const handleSaveCallResult = async (result: CallFormResult) => {
    // 1. Panggil API jika remark-nya valid
    try {
      const { rawPayload, customerId } = result;
      if (rawPayload && rawPayload.selectedRemarkScore === "3") {
        if (!rawPayload.salesPayload) throw new Error("Missing sales payload for closing");
        
        // Use backend plan_id if available, else parse from packageType (legacy fallback)
        const planId = rawPayload.salesPayload.planId
          || parseInt(rawPayload.salesPayload.packageType.replace(/\D/g, "")) || 1;
        
        await createLeadClosing(customerId, {
          plan_id: planId,
          promotion_id: rawPayload.salesPayload.promotionId ?? undefined,
          discount_amount: String(rawPayload.salesPayload.discount || 0),
          unique_transfer_code: rawPayload.salesPayload.transferCode || 0,
          closed_at: new Date(rawPayload.callTime).toISOString(),
          interaction_type: "CALL",
          contact_name: result.nextCustomer?.namaOwner || "-",
          contact_phone: result.nextCustomer?.noHpOwner || "-",
          customer_response: rawPayload.conclusion || "-",
          note: `Call: ${rawPayload.callStatus}, Chat: ${rawPayload.chatStatus}`,
        });
      } else if (
        rawPayload &&
        rawPayload.selectedRemarkScore &&
        rawPayload.selectedRemarkScore !== "3"
      ) {
        await createInteraction(customerId, {
          type: "CALL", // default to call
          remark_score: Number(rawPayload.selectedRemarkScore),
          note: `Call: ${rawPayload.callStatus}, Chat: ${rawPayload.chatStatus} - ${rawPayload.conclusion}`,
          follow_up_at: rawPayload.followUpDate ? rawPayload.followUpDate + "T00:00:00Z" : undefined,
          interaction_at: new Date(rawPayload.callTime).toISOString(),
        });

        if (rawPayload.selectedRemarkScore === "2" && rawPayload.trainingPayload) {
          const sType = rawPayload.trainingPayload.sessionType.toLowerCase();
          const mappedType = sType.includes("offline") ? "OFFLINE" : "ONLINE";
          
          await scheduleTraining(customerId, {
            training_type: mappedType,
            scheduled_at: new Date(rawPayload.trainingPayload.schedule).toISOString(),
            location: rawPayload.trainingPayload.sessionType,
            note: rawPayload.conclusion,
          });
        }
      }
    } catch (err) {
      console.error("Gagal memanggil API createInteraction:", err);
      alert(`Gagal menyimpan interaksi ke server: ${err instanceof Error ? err.message : 'Unknown'}`);
      return;
    }

    // 2. Update state lokal
    const nextData = dataNasabah.map((item) => {
      if (item.no === result.customerId) {
        const raw = result.rawPayload;
        let updatedCallHistories = item.callHistories || [];
        let updatedTrainingHistories = item.trainingHistories || [];
        let updatedPurchaseHistories = item.purchaseHistories || [];

        if (raw) {
          updatedCallHistories = [
            ...updatedCallHistories,
            {
              waktuCall: new Date(raw.callTime).toLocaleString("id-ID"),
              picSales: loggedInUser,
              remark: raw.selectedRemarkScore,
              conclusion: raw.conclusion,
            },
          ];

          if (raw.selectedRemarkScore === "2" && raw.trainingPayload) {
            updatedTrainingHistories = [
              ...updatedTrainingHistories,
              {
                waktuTraining: raw.trainingPayload.schedule,
                lokasiTraining: raw.trainingPayload.sessionType,
              },
            ];
          }

          if (raw.selectedRemarkScore === "3" && raw.salesPayload) {
            updatedPurchaseHistories = [
              ...updatedPurchaseHistories,
              {
                paket: raw.salesPayload.packageType,
                waktuMulai: new Date(raw.callTime).toLocaleString("id-ID"),
                waktuBerakhir: "-",
                hargaAktual: Number(raw.salesPayload.discount) || 0,
              },
            ];
          }
        }

        return {
          ...item,
          ...result.nextCustomer,
          callHistories: updatedCallHistories,
          trainingHistories: updatedTrainingHistories,
          purchaseHistories: updatedPurchaseHistories,
        };
      }
      return item;
    });

    saveDataNasabah(nextData);
    setCallModalItem(null);
    loadOwnersFromBackend();

    alert("Hasil Call & Chat berhasil disimpan.");
  };

  const openBulkPicModal = () => {
    if (selectedIds.length === 0) {
      alert("Pilih data owner terlebih dahulu.");
      return;
    }

    setBulkSelectedPic("");
    setBulkActionReason("");
    setBulkPicSearch("");
    setBulkPicDropdownOpen(false);
    setBulkPicModalOpen(true);
  };

  const closeBulkPicModal = () => {
    setBulkPicModalOpen(false);
    setBulkSelectedPic("");
    setBulkActionReason("");
    setBulkPicSearch("");
    setBulkPicDropdownOpen(false);
    setDropdownRect(null);
  };

  const handleSaveBulkPic = async (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedIds.length === 0) {
      alert("Belum ada data yang dipilih.");
      return;
    }

    if (isSalesState) {
      if (!bulkActionReason.trim()) {
        alert("Alasan wajib diisi.");
        return;
      }
    } else {
      if (!bulkSelectedPic) {
        alert("Pilih PIC terlebih dahulu.");
        return;
      }
    }

    const selectedSet = new Set(selectedIds);
    const ids = Array.from(selectedSet);

    try {
      if (isSalesState) {
        await bulkReleaseLeads(ids, bulkActionReason);
      } else {
        const targetList = isAdminState ? supervisorList : salesList;
        const targetUser = targetList.find(p => p.name === bulkSelectedPic);
        
        if (!targetUser) {
          alert("PIC tidak ditemukan di sistem.");
          return;
        }

        if (isAdminState) {
          await bulkAssignSupervisorToLeads(ids, targetUser.id);
        } else {
          await bulkAssignSalesToLeads(ids, targetUser.id);
        }
      }

      // Optimistic UI update
      const nextData = dataNasabah.map((item) => {
        if (selectedSet.has(item.no)) {
          if (isSalesState) {
            // When released, the PIC goes back to admin (or is cleared). We'll set it to "-" or "Admin"
            return { ...item, pic: "-" };
          }
          return { ...item, pic: bulkSelectedPic };
        }
        return item;
      });
      saveDataNasabah(nextData);
      loadOwnersFromBackend();

      closeBulkPicModal();
      setSelectedIds([]);
      setSelectionMode(false);
      setSelectionAction(null);
      
      if (isSalesState) {
        alert(`${selectedSet.size} data berhasil dikembalikan ke Admin.`);
      } else {
        alert(`${selectedSet.size} data berhasil diganti ke PIC ${bulkSelectedPic}.`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Gagal menyimpan aksi: ${err?.message || err}`);
    }
  };

  const daftarPicUnik = useMemo(() => {
    const setPic = new Set<string>();

    dataNasabah.forEach((item) => {
      if (item.pic) setPic.add(item.pic);
    });

    return Array.from(setPic).sort();
  }, [dataNasabah]);

  const summaryData = useMemo(() => {
    const totalCustomer = backendTotal > 0 ? backendTotal : dataNasabah.length;

    const totalCustomerPotensi = dataNasabah.filter((item) => {
      const latestScore = getLatestRemarkScore(item);
      const hasTraining =
        (item.trainingSessions?.length || 0) > 0 ||
        (item.trainingHistories?.length || 0) > 0 ||
        String(item.noted || "").toLowerCase().includes("training");

      return latestScore === "2" || hasTraining;
    }).length;

    const totalCustomerKemungkinan = dataNasabah.filter((item) => {
      const latestScore = getLatestRemarkScore(item);

      return latestScore === "1" && !isInvalidPic(item.pic);
    }).length;

    const totalCustomerBerlangganan = dataNasabah.filter(isSubscribedCustomer).length;

    const perbandinganBerlangganan =
      totalCustomer === 0 ? 0 : (totalCustomerBerlangganan / totalCustomer) * 100;

    return {
      totalCustomer,
      totalCustomerPotensi,
      totalCustomerKemungkinan,
      totalCustomerBerlangganan,
      perbandinganBerlangganan,
    };
  }, [dataNasabah, backendTotal]);



  const displayData = useMemo(() => {
    const groupedMap = new Map<string, NasabahItem>();

    dataNasabah.forEach((item) => {
      const groupKey = [
        String(item.kodeOwner || "").trim(),
        String(item.projectBrand || "").trim().toLowerCase(),
      ].join("::");

      const existingItem = groupedMap.get(groupKey);

      if (!existingItem) {
        const sameOwnerRows = dataNasabah.filter(
          (row) =>
            String(row.kodeOwner || "").trim() === String(item.kodeOwner || "").trim() &&
            String(row.projectBrand || "").trim().toLowerCase() ===
              String(item.projectBrand || "").trim().toLowerCase(),
        );

        const outletRows = sameOwnerRows
          .flatMap((row) => {
            const listFromOutlets = row.outlets?.length
              ? row.outlets.map((outletItem) => ({
                  namaOutlet: outletItem.namaOutlet,
                  noHpOutlet: outletItem.noHpOutlet || row.noHpOutlet || "",
                }))
              : [];

            return [
              ...listFromOutlets,
              ...(row.outlet
                ? [{ namaOutlet: row.outlet, noHpOutlet: row.noHpOutlet || "" }]
                : []),
            ];
          })
          .map((outletItem) => ({
            namaOutlet: String(outletItem.namaOutlet || "").trim(),
            noHpOutlet: String(outletItem.noHpOutlet || "").trim(),
          }))
          .filter((outletItem) => outletItem.namaOutlet);

        const uniqueOutlets = Array.from(
          new Map(
            outletRows.map((outletItem) => [
              outletItem.namaOutlet.toLowerCase(),
              outletItem,
            ]),
          ).values(),
        );

        groupedMap.set(groupKey, {
          ...item,
          outlets: uniqueOutlets,
          outlet: uniqueOutlets[0]?.namaOutlet || item.outlet || "",
        });
      }
    });

    return Array.from(groupedMap.values());
  }, [dataNasabah]);


  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterMode,
    searchKodeOwner,
    searchNamaOwner,
    searchNamaBrand,
    picFilter,
    skorFilter,
    startDateFilter,
    endDateFilter,
    startMonthFilter,
    endMonthFilter,
    rowsPerPage,
  ]);

  const totalPages = Math.max(1, Math.ceil(backendTotal / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages) || 1;
  const startDataIndex = (safeCurrentPage - 1) * rowsPerPage;

  const paginatedData = useMemo(
    () => displayData,
    [displayData],
  );

  const currentPageIds = useMemo(
    () => paginatedData.map((item) => item.no),
    [paginatedData],
  );

  const isAllCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAllCurrentPage = () => {
    if (currentPageIds.length === 0) return;

    if (isAllCurrentPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));

    if (selectionAction === "delete") {
      setDeleteTargetMode("selected");
    }
  };

  const formatTgl = (str: string) => {
    if (!str || str.trim() === "") return "-";

    if (str.includes("-")) {
      const parts = str.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
    }

    return str;
  };

  const formatRupiah = (value: number) => {
    if (!value || value === 0) return "-";

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getSkorLabel = (item: NasabahItem) => {
    const skorValue = getSkorValueFromItem(item);
    const skor = LIST_SKOR.find((row) => row.value === skorValue);

    return skor?.label || "Tidak Potensial (0)";
  };

  const getSkorBadgeClass = (item: NasabahItem) => {
    const value = getSkorValueFromItem(item);

    if (value === "3") return "bg-blue-100 text-blue-700";
    if (value === "2") return "bg-yellow-100 text-yellow-800";
    if (value === "1") return "bg-orange-100 text-orange-800";

    return "bg-red-100 text-red-700";
  };

  const openEditModal = (item: NasabahItem, mode: EditModalMode) => {
    setEditingItem({ ...item });
    setModalMode(mode);
    setProfileValidationErrors({});
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setProfileValidationErrors({});
    setEditModalOpen(false);
  };

  const updateEditingField = <K extends keyof NasabahItem>(
    field: K,
    value: NasabahItem[K],
  ) => {
    setEditingItem((prev) => (prev ? { ...prev, [field]: value } : prev));

    setProfileValidationErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };


  const handleSaveEditModal = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingItem) return;

    if (modalMode === "profil") {
      const errors = getProfileFieldErrors(editingItem);

      if (Object.values(errors).some(Boolean)) {
        setProfileValidationErrors(errors);
        return;
      }

      setProfileValidationErrors({});
    }

    const selectedSkorValue = getSkorValueFromItem(editingItem);
    const selectedSkor = LIST_SKOR.find((item) => item.value === selectedSkorValue) || LIST_SKOR[0];

    const normalizedEditingItem: NasabahItem = {
      ...editingItem,
      remarks: selectedSkor.value,
      scor: selectedSkor.scor,
    };

    const normalizedOutletsWithPhone = (normalizedEditingItem.outlets || [])
      .map((outletItem) => ({
        namaOutlet: String(outletItem.namaOutlet || "").trim(),
        noHpOutlet: String(outletItem.noHpOutlet || "").trim(),
      }))
      .filter((outletItem) => outletItem.namaOutlet);

    const nextData = dataNasabah.map((item) => {
      const isSameOwnerBrand =
        String(item.kodeOwner || "").trim() ===
          String(normalizedEditingItem.kodeOwner || "").trim() &&
        String(item.projectBrand || "").trim().toLowerCase() ===
          String(normalizedEditingItem.projectBrand || "").trim().toLowerCase();

      if (normalizedOutletsWithPhone.length > 0 && isSameOwnerBrand) {
        const sameOwnerRows = dataNasabah.filter(
          (row) =>
            String(row.kodeOwner || "").trim() ===
              String(normalizedEditingItem.kodeOwner || "").trim() &&
            String(row.projectBrand || "").trim().toLowerCase() ===
              String(normalizedEditingItem.projectBrand || "").trim().toLowerCase(),
        );

        const rowIndex = sameOwnerRows.findIndex((row) => row.no === item.no);
        const nextOutlet =
          normalizedOutletsWithPhone[rowIndex] ||
          normalizedOutletsWithPhone.find(
            (outletItem) =>
              outletItem.namaOutlet.toLowerCase() ===
              String(item.outlet || "").trim().toLowerCase(),
          ) ||
          normalizedOutletsWithPhone[0];

        return {
          ...item,
          namaOwner: normalizedEditingItem.namaOwner,
          projectBrand: normalizedEditingItem.projectBrand,
          noHpOwner: normalizedEditingItem.noHpOwner,
          noHpOutlet: nextOutlet?.noHpOutlet || "",
          pic: normalizedEditingItem.pic,
          remarks: normalizedEditingItem.remarks,
          scor: normalizedEditingItem.scor,
          outlet: nextOutlet?.namaOutlet || item.outlet || "",
          outlets: normalizedOutletsWithPhone,
        };
      }

      return item.no === normalizedEditingItem.no ? normalizedEditingItem : item;
    });

    const existingOutletKeysAfterEdit = new Set(
      nextData
        .filter(
          (item) =>
            String(item.kodeOwner || "").trim() ===
              String(normalizedEditingItem.kodeOwner || "").trim() &&
            String(item.projectBrand || "").trim().toLowerCase() ===
              String(normalizedEditingItem.projectBrand || "").trim().toLowerCase(),
        )
        .map((item) => String(item.outlet || "").trim().toLowerCase())
        .filter(Boolean),
    );

    const maxCurrentNo =
      nextData.length > 0 ? Math.max(...nextData.map((item) => Number(item.no) || 0)) : 0;
    let nextNoCounter = maxCurrentNo + 1;

    normalizedOutletsWithPhone.forEach((outletItem) => {
      const outletKey = outletItem.namaOutlet.toLowerCase();

      if (!outletKey || existingOutletKeysAfterEdit.has(outletKey)) return;

      nextData.push({
        ...normalizedEditingItem,
        no: nextNoCounter,
        outlet: outletItem.namaOutlet,
        noHpOutlet: outletItem.noHpOutlet || "",
        outlets: normalizedOutletsWithPhone,
        totalTransaksi: 0,
      } as NasabahItem);

      nextNoCounter += 1;
      existingOutletKeysAfterEdit.add(outletKey);
    });

    saveDataNasabah(nextData);
    closeEditModal();

    if (normalizedEditingItem.ownerId && modalMode === "profil") {
      try {
        await updateOwner(normalizedEditingItem.ownerId, {
          name: normalizedEditingItem.namaOwner,
          phone: normalizedEditingItem.noHpOwner,
          brand_name: normalizedEditingItem.projectBrand,
        });
        console.log("Successfully updated owner profile on backend");
      } catch (err) {
        console.error("Failed to update owner profile on backend", err);
      }
    }

    if (normalizedEditingItem.pic && normalizedEditingItem.no) {
      const originalItem = dataNasabah.find(item => item.no === normalizedEditingItem.no);
      if (originalItem && originalItem.pic !== normalizedEditingItem.pic) {
        const targetUser = combinedPicList.find(p => p.name === normalizedEditingItem.pic);
        if (targetUser) {
          try {
            if (targetUser.role === "SUPERVISOR" || targetUser.role === "Supervisor") {
              await bulkAssignSupervisorToLeads([normalizedEditingItem.no], targetUser.id);
            } else {
              await bulkAssignSalesToLeads([normalizedEditingItem.no], targetUser.id);
            }
            console.log("Successfully assigned PIC on backend");
          } catch (err: any) {
            console.error("Failed to assign PIC on backend", err?.message || err);
          }
        }
      }
    }

    loadOwnersFromBackend();
    alert("Data profil berhasil diperbarui.");
  };

  const renderFilterHeader = (key: string, label: string, value: string, setter: (val: string) => void) => {
    const isSorted = sort.replace('-', '') === key;
    const isDesc = sort.startsWith('-');
    
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
            <svg className={`w-2.5 h-2.5 ${isSorted && !isDesc ? 'text-[#C92C1E] opacity-100' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
            <svg className={`w-2.5 h-2.5 ${isSorted && isDesc ? 'text-[#C92C1E] opacity-100' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </div>
        </div>
        <svg 
          className={`w-3.5 h-3.5 transition-colors cursor-pointer ml-1 ${value ? 'text-[#C92C1E]' : 'text-gray-400 hover:text-gray-600'}`} 
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
              placeholder={`Ketik untuk mencari...`} 
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 font-normal focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]" 
              value={value} 
              onChange={(e) => setter(e.target.value)} 
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setOpenFilter(null);
                }
              }}
            />
          </div>
        </>
      )}
    </th>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans text-[#1C1C1E]">
      {/* Menu Header */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b-2 border-[#C92C1E] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
              <span>Menu</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#C92C1E]">Lead & Kepemilikan</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Manajemen Lead & Kepemilikan</h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola data lead, perpindahan kepemilikan PIC, aktivitas follow up, dan proses import data customer.
            </p>
          </div>
        </div>
      </div>



      {/* SUMMARY CUSTOMER */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryMetricCard
          title="Total Owner"
          value={summaryData.totalCustomer}
          description="Jumlah semua owner yang masuk ke data kelolaan."
          isPrimary={true}
        />

        <SummaryMetricCard
          title="Total Owner Potensi"
          value={summaryData.totalCustomerPotensi}
          description="Owner skor 2, remark terakhir 2, atau sedang/akan training."
        />

        <SummaryMetricCard
          title="Total Owner Kemungkinan"
          value={summaryData.totalCustomerKemungkinan}
          description="Owner dengan PIC valid dan skor/remark terakhir 1."
        />

        <SummaryMetricCard
          title="Total Owner Berlangganan"
          value={summaryData.totalCustomerBerlangganan}
          description="Owner berlangganan aktif selain trial."
        />

        <SummaryMetricCard
          title="Perbandingan Owner Berlangganan"
          value={formatPercentValue(summaryData.perbandinganBerlangganan)}
          description="Total berlangganan dibanding total owner."
        />
      </div>

      {/* Tabs / Segmented Control */}
      <div className="flex bg-gray-100 p-1.5 rounded-xl w-max shadow-sm border border-gray-200/50">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'list'
              ? 'bg-white text-[#C92C1E] shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
          }`}
        >
          Daftar Lead
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-white text-[#C92C1E] shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          Analitik
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <AnalyticsTab />
      ) : (
        <>
      {/* PANEL FILTER & SEARCHING */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start">
          <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => {
                const today = getTodayInputDate();

                setFilterMode("harian");
                setStartDateFilter(today);
                setEndDateFilter(today);
                setStartMonthFilter("");
                setEndMonthFilter("");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                filterMode === "harian"
                  ? "bg-[#C92C1E] text-white shadow-md"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Harian
            </button>
            <button
              onClick={() => {
                setFilterMode("bulanan");
                setStartDateFilter("");
                setEndDateFilter("");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                filterMode === "bulanan"
                  ? "bg-[#C92C1E] text-white shadow-md"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Bulanan
            </button>
          </div>

          {filterMode === "harian" ? (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600">
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
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600">
              <select
                value={startMonthFilter}
                onChange={(e) => setStartMonthFilter(e.target.value)}
                className="bg-transparent focus:outline-none text-gray-700 font-bold cursor-pointer"
              >
                <option value="">Awal...</option>
                {LIST_BULAN.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <span className="text-gray-300">s/d</span>
              <select
                value={endMonthFilter}
                onChange={(e) => setEndMonthFilter(e.target.value)}
                className="bg-transparent focus:outline-none text-gray-700 font-bold cursor-pointer"
              >
                <option value="">Akhir...</option>
                {LIST_BULAN.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 shadow-sm"
          >
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export Excel
          </button>

          <button
            onClick={() => setIsImportHistoryModalOpen(true)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Riwayat Import
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 shadow-sm"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Import Excel
          </button>

          <button
            onClick={() => setIsManualAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-red-700 shadow-sm shadow-red-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Data Manual
          </button>
        </div>
      </div>
      {/* TABLE HEADER ACTIONS */}
      <div className="px-4 py-3 border-b border-gray-100 flex flex-col md:flex-row md:items-end md:justify-between gap-4 bg-white">
        <div>
          <h2 className="text-base font-black text-gray-800 uppercase tracking-tight">
            Tabel Data Lead & Kepemilikan
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Menampilkan daftar lead sesuai filter aktif, PIC terakhir, dan skor remark terbaru.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/menu/lead/trash"
              className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black hover:bg-gray-50 transition cursor-pointer flex items-center gap-1.5"
            >
              <TrashIcon className="w-3.5 h-3.5 text-gray-500" />
              Riwayat Hapus ({trashCount})
            </Link>

            {!selectionMode ? (
              <button
                onClick={() => handleStartSelectionMode("edit")}
                className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-black hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1.5"
              >
                <EditIcon className="w-3.5 h-3.5" />
                {isAdminState ? "Pilih untuk Assign Supervisor" : isSupervisorState ? "Pilih untuk Assign Sales" : "Pilih untuk Lepas Lead (Invalid)"}
              </button>
            ) : null}

            {!selectionMode ? (
              <button
                onClick={() => handleStartSelectionMode("delete")}
                className="px-3.5 py-2 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-black hover:bg-red-100 transition cursor-pointer flex items-center gap-1.5"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Pilih untuk Hapus
              </button>
            ) : (
              <>
                <div
                  className={`px-3.5 py-2 rounded-xl text-xs font-black ${
                    selectionAction === "edit"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  Mode: {selectionAction === "edit" ? "Edit PIC" : "Hapus Data"}
                </div>

                <button
                  onClick={handleCancelSelectionMode}
                  className="px-3.5 py-2 bg-gray-900 border border-gray-900 text-white rounded-xl text-xs font-black hover:bg-black transition cursor-pointer"
                >
                  Batal Pilih
                </button>

                {selectionAction === "edit" && (
                  <button
                    onClick={openBulkPicModal}
                    disabled={selectedIds.length === 0}
                    className="px-3.5 py-2 bg-emerald-600 border border-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isAdminState ? "Assign Supervisor Terpilih" : isSupervisorState ? "Assign Sales Terpilih" : "Lepas Lead Terpilih"} ({selectedIds.length})
                  </button>
                )}

                {selectionAction === "delete" && (
                  <>
                    <select
                      value={deleteTargetMode}
                      onChange={(event) => setDeleteTargetMode(event.target.value as DeleteTargetMode)}
                      className="px-3.5 py-2 bg-white border border-red-200 text-red-700 rounded-xl text-xs font-black outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value="selected">
                        Yang dicentang ({selectedIds.length})
                      </option>
                      <option value="page">
                        Halaman ini ({currentPageIds.length})
                      </option>
                      <option value="filtered">
                        Semua hasil filter ({backendTotal})
                      </option>
                      <option value="custom">
                        Jumlah tertentu
                      </option>
                    </select>

                    {deleteTargetMode === "custom" && (
                      <input
                        type="number"
                        min={1}
                        max={backendTotal}
                        value={deleteCustomLimit}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => {
                          const rawValue = event.target.value.replace(/\D/g, "");
                          setDeleteCustomLimit(rawValue);
                        }}
                        onBlur={() => {
                          const safeLimit = getCustomDeleteLimit();
                          setDeleteCustomLimit(safeLimit > 0 ? String(safeLimit) : "1");
                        }}
                        className="w-24 px-3 py-2 bg-white border border-red-200 text-red-700 rounded-xl text-xs font-black outline-none focus:border-red-500"
                        title="Jumlah data dari hasil filter"
                      />
                    )}

                    <button
                      onClick={handleConfirmDeleteBulk}
                      disabled={dataNasabah.length === 0 || getDeleteTargetItems().length === 0}
                      className="px-3.5 py-2 bg-red-600 border border-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Hapus {getDeleteTargetItems().length} Data
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

      {/* TABLE WORKSPACE */}
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm text-gray-600">
            <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-y border-gray-200">
              <tr>
                {selectionMode && (
                  <th className="px-4 py-4 text-center w-12">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleSelectAllCurrentPage}
                      className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                      title="Pilih semua data di halaman ini"
                    />
                  </th>
                )}

                <th className="px-4 py-4 text-center font-bold">No</th>
                {renderFilterHeader("kodeOwner", "Kode", searchKodeOwner, setSearchKodeOwner)}
                {renderFilterHeader("namaOwner", "Nama Owner", searchNamaOwner, setSearchNamaOwner)}
                {renderFilterHeader("projectBrand", "Brand", searchNamaBrand, setSearchNamaBrand)}
                <th className="px-4 py-4 min-w-[150px] font-bold">Kontak</th>
                    <th className="px-4 py-4 min-w-[150px] font-bold relative group whitespace-nowrap">
                      <div 
                        className="flex items-center justify-center gap-2 select-none cursor-pointer hover:text-red-700 transition-colors"
                        onClick={() => setOpenFilter(openFilter === 'pic' ? null : 'pic')}
                      >
                        <span className="flex items-center gap-1.5 text-center truncate max-w-[120px]">
                          {picFilter === 'Semua' ? 'PIC Sales' : (
                            picFilter === 'No PIC' ? 'Belum Ada PIC' :
                            picFilter === 'ROLE:ADMIN' ? 'Semua Admin' :
                            picFilter === 'ROLE:SUPERVISOR' ? 'Semua Supervisor' :
                            picFilter === 'ROLE:SALES' ? 'Semua Sales' : picFilter
                          )}
                        </span>
                        <svg 
                          className={`w-3.5 h-3.5 transition-colors ml-1 flex-shrink-0 ${picFilter !== 'Semua' ? 'text-[#C92C1E]' : 'text-gray-400 group-hover:text-gray-600'}`} 
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <title>Filter PIC Sales</title>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      </div>
                      {openFilter === 'pic' && (
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
                        onClick={() => setOpenFilter(openFilter === 'skor' ? null : 'skor')}
                      >
                        <span className="flex items-center gap-1.5 text-center truncate max-w-[120px]">
                          {skorFilter === 'Semua' ? 'Skor' : (LIST_SKOR.find(s => s.value === skorFilter)?.label || skorFilter)}
                        </span>
                        <svg 
                          className={`w-3.5 h-3.5 transition-colors ml-1 flex-shrink-0 ${skorFilter !== 'Semua' ? 'text-[#C92C1E]' : 'text-gray-400 group-hover:text-gray-600'}`} 
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <title>Filter Skor</title>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      </div>
                      {openFilter === 'skor' && (
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
              {displayData.length === 0 ? (
                <tr>
                  <td
                    colSpan={8 + (selectionMode ? 1 : 0)}
                    className="p-8 text-center text-gray-400 font-bold italic"
                  >
                    Data tidak ditemukan pada rentang filter ini.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => (
                  <tr
                    key={row.no || idx}
                    onClick={() => {
                      if (selectionMode) {
                        handleToggleSelectRow(row.no);
                      }
                    }}
                    className={`transition-colors ${
                      selectionMode ? "cursor-pointer" : ""
                    } ${
                      selectionMode ? "select-none" : ""
                    } ${
                      selectedIds.includes(row.no)
                        ? "bg-red-100/70 hover:bg-red-100"
                        : "hover:bg-gray-50"
                    }`}
                    onMouseDown={(e) => {
                      if (!selectionMode || e.button !== 0) return;
                      handleRowMouseDown(row.no, selectedIds.includes(row.no));
                    }}
                    onMouseEnter={() => {
                      if (selectionMode) handleRowMouseEnter(row.no);
                    }}
                  >
                    {selectionMode && (
                      <td
                        className="px-4 py-4 text-center"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.no)}
                          readOnly
                          className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E] pointer-events-none"
                        />
                      </td>
                    )}

                        <td className="px-4 py-4 text-center align-top font-medium text-gray-500 whitespace-nowrap">
                          {startDataIndex + idx + 1}
                        </td>

                        <td className="px-4 py-4 align-top font-medium text-gray-900 whitespace-normal break-words max-w-[150px]">
                          {row.kodeOwner || "-"}
                        </td>

                        <td className="px-4 py-4 align-top font-medium text-gray-900 whitespace-normal break-words max-w-[220px]">
                          {row.namaOwner || "-"}
                        </td>

                        <td className="px-4 py-4 align-top text-gray-700 whitespace-normal break-words max-w-[200px]">
                          {row.projectBrand || "-"}
                        </td>

                        <td className="px-4 py-4 align-top text-gray-700 whitespace-normal break-words max-w-[160px]">
                          {row.noHpOwner || "-"}
                        </td>

                        <td className="px-4 py-4 align-top text-center">
                          <PicBadge value={row.pic || ""} color="red" />
                        </td>

                        <td className="px-4 py-4 align-top text-center">
                          <SkorBadge item={row} />
                        </td>

                        <td
                          className="px-4 py-4 align-top text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/menu/lead/${row.no}`}
                              className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                              title="Lihat Detail Lead"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                            <ActionButtons
                              item={row}
                              onCall={handleOpenCallAction}
                              onEdit={openEditModal}
                              onDelete={handleHapusSatuData}
                              canEdit={isAdminState}
                              canDelete={isAdminState}
                              canCall={isSalesState}
                            />
                          </div>
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
              Total {backendTotal > 0 ? backendTotal : dataNasabah.length} Owner
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
            <span className="text-xs font-bold text-[#C92C1E]">
              Halaman {safeCurrentPage}
            </span>
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
        </>
      )}

      <CallPage
        customer={callModalItem}
        onClose={() => setCallModalItem(null)}
        onSave={handleSaveCallResult}
      />
      <ImportHistoryModal 
        isOpen={isImportHistoryModalOpen} 
        onClose={() => setIsImportHistoryModalOpen(false)}
        profile="NON_REGISTER"
        onResume={(batch) => {
          setImportBatch(batch);
          setIsImportHistoryModalOpen(false);
          setIsImportModalOpen(true);
          pollImportStatus(batch.id);
        }}
      />
      
      {/* MODAL EDIT PIC DATA TERPILIH */}
      {bulkPicModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 p-3 sm:p-6">
        <div className="mx-auto my-6 flex max-h-[calc(100vh-3rem)] w-full max-w-lg flex-col overflow-visible rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {isAdminState ? "Assign Supervisor Terpilih" : isSupervisorState ? "Assign Sales Terpilih" : "Lepas Lead Terpilih"}
                </h2>
                <p className="text-xs font-medium text-gray-400">
                  {isSalesState 
                    ? `Masukkan alasan untuk melepaskan ${selectedIds.length} data ke Admin.`
                    : `Pilih PIC baru untuk ${selectedIds.length} data owner yang dicentang.`}
                </p>
              </div>

              <button
                type="button"
                onClick={closeBulkPicModal}
                className="h-9 w-9 rounded-full bg-gray-100 font-black text-gray-600 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBulkPic} className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
                {isSalesState ? (
                  <>
                    <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Alasan Invalid
                    </label>
                    <textarea
                      value={bulkActionReason}
                      onChange={(e) => setBulkActionReason(e.target.value)}
                      required
                      rows={3}
                      placeholder="Masukkan alasan mengapa lead ini dikembalikan..."
                      className="w-full rounded-xl border border-red-100 bg-white p-3 text-xs font-black text-gray-700 outline-none focus:border-[#C92C1E] resize-none"
                    ></textarea>
                    <p className="mt-2 text-[11px] font-medium text-gray-400">
                      Semua data yang dicentang akan dikembalikan ke Admin dengan alasan ini.
                    </p>
                  </>
                ) : (
                  <>
                    <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                      <FieldIcon type="sales" />
                      {isAdminState ? "PIC Supervisor Baru" : "PIC Sales Baru"}
                    </label>

                    {/* Search + Dropdown Combobox */}
                    <div className="relative">
                      {/* Input search + selected display */}
                      <div
                        data-combobox
                        className={`flex items-center gap-2 rounded-xl border bg-white px-4 py-3 transition-all ${
                          bulkPicDropdownOpen
                            ? "border-[#C92C1E] ring-2 ring-[#C92C1E]/20"
                            : "border-red-100 hover:border-red-300"
                        }`}
                      >
                        <svg className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          ref={picSearchRef}
                          type="text"
                          value={bulkPicSearch}
                          onChange={(e) => {
                            setBulkPicSearch(e.target.value);
                            openDropdownWithPosition();
                            if (bulkSelectedPic && !e.target.value.toLowerCase().includes(bulkSelectedPic.toLowerCase())) {
                              setBulkSelectedPic("");
                            }
                          }}
                          onFocus={openDropdownWithPosition}
                          placeholder={bulkSelectedPic || (isAdminState ? "Cari supervisor..." : "Cari sales...")}
                          className="flex-1 bg-transparent text-sm font-bold text-gray-700 outline-none placeholder:font-medium placeholder:text-gray-400"
                        />
                        {bulkSelectedPic && (
                          <button
                            type="button"
                            onClick={() => { setBulkSelectedPic(""); setBulkPicSearch(""); }}
                            className="flex-shrink-0 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Hapus pilihan"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (bulkPicDropdownOpen) {
                              setBulkPicDropdownOpen(false);
                            } else {
                              openDropdownWithPosition();
                            }
                          }}
                          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                        >
                          <svg
                            className={`h-3.5 w-3.5 transition-transform ${bulkPicDropdownOpen ? "rotate-180" : ""}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      {/* Dropdown list */}
                      {bulkPicDropdownOpen && (() => {
                        const sourceList = isAdminState ? supervisorList : salesList;
                        const filtered = sourceList.filter(p =>
                          p.name.toLowerCase().includes(bulkPicSearch.toLowerCase())
                        );
                        return dropdownRect ? (
                          <div
                            className="fixed z-[9999] max-h-56 overflow-y-auto p-1.5 rounded-xl border border-gray-200 bg-white shadow-2xl [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
                            style={{
                              top: dropdownRect.top,
                              left: dropdownRect.left,
                              width: dropdownRect.width,
                            }}
                          >
                            {filtered.length === 0 ? (
                              <div className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                                Tidak ada {isAdminState ? "supervisor" : "sales"} ditemukan
                              </div>
                            ) : (
                              filtered.map((pic) => (
                                <button
                                  key={`${pic.id}-${pic.name}`}
                                  type="button"
                                  onClick={() => {
                                    setBulkSelectedPic(pic.name);
                                    setBulkPicSearch(pic.name);
                                    setBulkPicDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-colors hover:bg-red-50 ${
                                    bulkSelectedPic === pic.name
                                      ? "bg-red-50 font-black text-[#C92C1E]"
                                      : "font-bold text-gray-700"
                                  }`}
                                >
                                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-black text-gray-600">
                                    {pic.name.charAt(0).toUpperCase()}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate">{pic.name}</div>
                                    {pic.code && <div className="text-[10px] font-medium text-gray-400">{pic.code}</div>}
                                  </div>
                                  {bulkSelectedPic === pic.name && (
                                    <svg className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        ) : null;
                      })()}

                      {/* Overlay tutup dropdown saat klik luar */}
                      {bulkPicDropdownOpen && (
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setBulkPicDropdownOpen(false)}
                        />
                      )}
                    </div>

                    {/* Hidden input agar form validation required bisa bekerja */}
                    <input type="text" required value={bulkSelectedPic} readOnly className="sr-only" tabIndex={-1} />

                    <p className="mt-2 text-[11px] font-medium text-gray-400">
                      Setelah disimpan, semua data yang dicentang akan berubah ke PIC yang dipilih.
                    </p>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={closeBulkPicModal}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#C92C1E] px-6 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#A82216] disabled:opacity-60"
                >
                  {isSalesState ? "Lepas Lead" : "Simpan PIC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <EditProfileModal
        open={editModalOpen}
        item={editingItem}
        errors={profileValidationErrors}
        listPic={
          isAdminState
            ? supervisorList.map(p => p.name)
            : isSupervisorState
            ? salesList.map(p => p.name)
            : combinedPicList.map(p => p.name)
        }
        onClose={closeEditModal}
        onSubmit={handleSaveEditModal}
        onChangeField={updateEditingField}
      />

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div 
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => !isImportLoading && setIsImportModalOpen(false)} 
          />
          
          <div className="relative z-10 w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Import Excel
                </h3>
                <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mt-1">
                  Unggah data Lead massal
                </p>
              </div>
              <button
                onClick={() => !isImportLoading && setIsImportModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                disabled={isImportLoading}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {importError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                  {importError}
                </div>
              )}

              {!importBatch || importBatch.status === "UPLOADED" ? (
                <>
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Silakan unggah file Excel (.xlsx) dengan mengikuti format yang ditentukan.
                    </p>
                    <a 
                      href="/api/v1/imports/template/owner" 
                      target="_blank"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#C92C1E] bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Pastikan file Excel Anda memiliki kolom header berikut pada baris pertama:\n\nKODE | NAMA | TELEPON | EMAIL | NAMA_BRAND | PROVINSI | KOTA | ALAMAT");
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Lihat Format Template
                    </a>
                  </div>

                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#C92C1E] transition-colors relative">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isImportLoading}
                    />
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-bold text-gray-700">
                      {importFile ? importFile.name : "Klik atau seret file Excel ke sini"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Hanya menerima file .xlsx</p>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleUploadClick}
                      disabled={!importFile || isImportLoading}
                      className="rounded-xl bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isImportLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Mengunggah...
                        </>
                      ) : (
                        "Unggah & Validasi"
                      )}
                    </button>
                  </div>
                </>
              ) : importBatch.status === "VALIDATING" ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
                    <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Memvalidasi Data...</h3>
                  <p className="text-gray-500 text-sm mb-8">Mohon tunggu, sistem sedang memeriksa format dan duplikasi data.</p>
                  
                  {importBatch.progress_percentage !== undefined && (
                    <div className="w-full max-w-md mx-auto">
                      <div className="flex justify-between text-sm font-bold mb-2">
                        <span className="text-gray-700">Progress Validasi</span>
                        <span className="text-[#C92C1E]">{importBatch.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                        <div 
                          className="bg-[#C92C1E] h-3 rounded-full transition-all duration-300 ease-out" 
                          style={{ width: `${importBatch.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                ) : importBatch.status === "COMMITTING" ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 mb-4">
                    <svg className="w-8 h-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Menyimpan Data...</h3>
                  <p className="text-gray-500 text-sm mb-8">Mohon tunggu, sistem sedang menyimpan data ke database.</p>
                  
                  {importBatch.progress_percentage !== undefined && (
                    <div className="w-full max-w-md mx-auto">
                      <div className="flex justify-between text-sm font-bold mb-2">
                        <span className="text-gray-700">Progress Penyimpanan</span>
                        <span className="text-[#C92C1E]">{importBatch.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                        <div 
                          className="bg-[#C92C1E] h-3 rounded-full transition-all duration-300 ease-out" 
                          style={{ width: `${importBatch.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                ) : importBatch.status === "VALIDATION_FAILED" ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                      <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Validasi Gagal</h4>
                    <p className="text-sm text-gray-600 mb-6">
                      {importBatch.error_message || "Terjadi kesalahan saat memvalidasi file Excel. Pastikan format file sudah benar."}
                    </p>
                    <button
                      type="button"
                      onClick={() => resetImportState()}
                      className="rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200"
                    >
                      Kembali
                    </button>
                  </div>
                ) : importBatch.status === "COMMITTED" ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
                      <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">
                      File Sudah Disimpan
                    </h4>
                    <p className="text-sm text-gray-600 mb-6 px-4">
                      Data dari file Excel ini telah berhasil disimpan ke database.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        resetImportState();
                        setIsImportModalOpen(false);
                        loadOwnersFromBackend();
                      }}
                      className="rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200"
                    >
                      Tutup
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                        <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-bold text-gray-900">Validasi Selesai</h4>
                      <p className="text-sm text-gray-500 mt-1">Berikut adalah hasil pengecekan data Anda.</p>
                    </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-600 uppercase">Valid</p>
                      <p className="text-xl font-black text-emerald-700 mt-1">{importBatch.valid_rows}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl text-center border border-red-100">
                      <p className="text-xs font-bold text-red-600 uppercase">Error</p>
                      <p className="text-xl font-black text-red-700 mt-1">{importBatch.invalid_rows}</p>
                    </div>
                  </div>

                  {importBatch.invalid_rows > 0 && (
                    <div className="mb-6">
                      <div className="p-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-t-xl text-sm font-medium">
                        Terdapat {importBatch.invalid_rows} baris dengan format yang salah atau data duplikat. Anda tetap bisa menyimpan {importBatch.valid_rows} data yang valid.
                      </div>
                      {importErrorRows.length > 0 && (
                        <div className="border border-t-0 border-orange-200 rounded-b-xl overflow-hidden max-h-96 overflow-y-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-orange-100 text-orange-800 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 w-16">Baris</th>
                                <th className="px-3 py-2">Keterangan Error</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importErrorRows.map((row) => (
                                <tr key={row.id} className="border-t border-orange-100 bg-orange-50/50">
                                  <td className="px-3 py-2 font-bold text-orange-900 align-top">
                                    {row.row_index}
                                  </td>
                                  <td className="px-3 py-2 text-orange-800 break-words align-top">
                                    {row.validation_errors ? (
                                      Array.isArray(row.validation_errors) ? (
                                        <ul className="list-disc list-inside">
                                          {row.validation_errors.map((err, i) => <li key={i}>{err}</li>)}
                                        </ul>
                                      ) : (
                                        <ul className="list-disc list-inside">
                                          {Object.entries(row.validation_errors).map(([field, msg], i) => (
                                            <li key={i}><span className="font-semibold">{field}</span>: {String(msg)}</li>
                                          ))}
                                        </ul>
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
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => resetImportState()}
                      disabled={isImportLoading}
                      className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleCommitImport}
                      disabled={isImportLoading || importBatch.valid_rows === 0}
                      className="rounded-xl bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isImportLoading ? "Menyimpan..." : "Simpan Data Valid"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <LeadFormModal isOpen={isManualAddModalOpen} onClose={() => setIsManualAddModalOpen(false)} onSuccess={loadOwnersFromBackend} />
    </div>
  );
}
