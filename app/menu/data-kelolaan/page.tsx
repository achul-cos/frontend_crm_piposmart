"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GrafikCustomer from "./grafik/page";
import { generateDummyOwners, LIST_PIC } from "./dummy/page";
import CallPage, { CallFormResult } from "./call/page";
import ActionButtons, { EditProfileModal } from "./action/page";

interface NasabahItem {
  totalFu: number;
  tanggalFu: string;
  tahun: string;
  bulan: string;
  no: number;
  pic: string;
  tanggalDibagikan: string;
  statusAkun: string;
  kodeBaris: string;
  kodeOwner: string;
  namaOwner: string;
  projectBrand: string;
  outlet: string;
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
  const remarksValue = String(item?.remarks ?? "").trim();

  if (LIST_SKOR.some((skor) => skor.value === remarksValue)) {
    return remarksValue;
  }

  const scorValue = String(item?.scor ?? "0").trim();

  if (LIST_SKOR.some((skor) => skor.value === scorValue)) {
    return scorValue;
  }

  return "0";
};

const getLatestRemarkScore = (item?: Partial<NasabahItem> | null) => {
  const latestCall = item?.callHistories?.[item.callHistories.length - 1];
  const latestRemark = String(latestCall?.remark || item?.remarks || "").trim();
  const remarkScore = latestRemark.match(/\((\d)\)/)?.[1];

  if (remarkScore && LIST_SKOR.some((skor) => skor.value === remarkScore)) {
    return remarkScore;
  }

  return getSkorValueFromItem(item);
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

const getProfileFieldErrors = (item: Partial<NasabahItem>) => {
  const errors: ProfileValidationErrors = {};

  REQUIRED_PROFILE_FIELDS.forEach(({ key, label }) => {
    const value = item[key];

    if (typeof value !== "string" || value.trim() === "") {
      errors[key] = `${label} wajib diisi.`;
    }
  });

  if (!errors.noHpOwner && !isValidInternationalPhone(item.noHpOwner)) {
    errors.noHpOwner = "Nomor Telepon Owner belum valid. Pilih negara lalu isi nomor telepon.";
  }

  if (!errors.noHpOutlet && !isValidInternationalPhone(item.noHpOutlet)) {
    errors.noHpOutlet = "Nomor Telepon Outlet belum valid. Pilih negara lalu isi nomor telepon.";
  }

  return errors;
};




const getOwnerFilterDate = (item: Partial<NasabahItem>) => {
  return (
    item.tanggalFu ||
    item.createDateProject ||
    item.tanggalDibagikan ||
    ""
  );
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

  if (value === "3") return "bg-blue-100 text-blue-700";
  if (value === "2") return "bg-yellow-100 text-yellow-800";
  if (value === "1") return "bg-orange-100 text-orange-800";

  return "bg-red-100 text-red-700";
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
      className={`inline-flex max-w-[180px] items-center justify-center rounded-md px-2 py-1 text-center text-[10px] font-black ${getQuickSkorBadgeClass(item)}`}
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
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] border-2 border-red-100 bg-gradient-to-br from-white via-red-50/80 to-[#FFF3EF] px-5 py-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#C92C1E]/40 hover:shadow-lg">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#C92C1E]/10 transition-all duration-200 group-hover:scale-125" />
      <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-[#FDE2DD]" />

      <div className="relative z-10">
        <p className="min-h-[34px] text-center text-sm font-black leading-tight text-[#8F2118]">
          {title}
        </p>

        <p className="mt-2 text-center text-[52px] font-black leading-none tracking-tight text-[#C92C1E] drop-shadow-sm">
          {value}
        </p>

        <p className="mx-auto mt-3 min-h-[34px] max-w-[210px] rounded-2xl bg-white/70 px-3 py-2 text-center text-[10px] font-bold leading-snug text-[#9F4A42]">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function DataKelolaanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dataNasabah, setDataNasabah] = useState<NasabahItem[]>([]);

  const [filterMode, setFilterMode] = useState<"harian" | "bulanan">("harian");

  const [searchKodeOwner, setSearchKodeOwner] = useState("");
  const [searchNamaOwner, setSearchNamaOwner] = useState("");
  const [searchNamaOutlet, setSearchNamaOutlet] = useState("");
  const [startDateFilter, setStartDateFilter] = useState(() => getTodayInputDate());
  const [endDateFilter, setEndDateFilter] = useState(() => getTodayInputDate());
  const [startMonthFilter, setStartMonthFilter] = useState("");
  const [endMonthFilter, setEndMonthFilter] = useState("");
  const [picFilter, setPicFilter] = useState("Semua");
  const [skorFilter, setSkorFilter] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionAction, setSelectionAction] = useState<"edit" | "delete" | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
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

  const [loggedInUser, setLoggedInUser] = useState("Satria");
  const [loggedInRole, setLoggedInRole] = useState("Developer");
  const [activeTodayDate, setActiveTodayDate] = useState(() => getTodayInputDate());

  useEffect(() => {
    const userName = localStorage.getItem("piposmart_user_name");
    const userRole = localStorage.getItem("piposmart_user_role");

    if (userName) setLoggedInUser(userName);
    if (userRole) setLoggedInRole(userRole);

    const cached = localStorage.getItem("piposmart_nasabah_data");
    if (cached) {
      try {
        setDataNasabah(JSON.parse(cached));
      } catch {
        setDataNasabah([]);
      }
    }

    const deletedCached = localStorage.getItem("piposmart_deleted_nasabah_data");
    if (deletedCached) {
      try {
        const parsedDeleted = JSON.parse(deletedCached);
        setTrashCount(Array.isArray(parsedDeleted) ? parsedDeleted.length : 0);
      } catch {
        setTrashCount(0);
      }
    }
  }, []);

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
    localStorage.setItem("piposmart_nasabah_data", JSON.stringify(nextData));
  };

  const handleGenerateDummy = () => {
    const mockExcelData: NasabahItem[] = generateDummyOwners(1000);

    saveDataNasabah(mockExcelData);
    setTrashCount(0);
    localStorage.removeItem("piposmart_deleted_nasabah_data");

    alert("Berhasil inject 1000 data dummy owner.");
  };

  const handleExportData = () => {
    if (dataNasabah.length === 0) {
      alert("Tidak ada data kelolaan untuk diexport.");
      return;
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataNasabah, null, 2),
    )}`;

    const downloadElement = document.createElement("a");
    downloadElement.setAttribute("href", jsonString);
    downloadElement.setAttribute("download", "piposmart_backup_nasabah.json");
    document.body.appendChild(downloadElement);
    downloadElement.click();
    downloadElement.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();

    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");

      fileReader.onload = (event) => {
        try {
          const parsedData = JSON.parse(event.target?.result as string);

          if (Array.isArray(parsedData)) {
            saveDataNasabah(parsedData);
            setTrashCount(0);
            localStorage.removeItem("piposmart_deleted_nasabah_data");
            alert("Sakti! File database nasabah berhasil diimport masuk sistem.");
          } else {
            alert("Gagal: Struktur format dalam file bukan array data nasabah.");
          }
        } catch {
          alert("Gagal membaca berkas. Pastikan file berupa JSON cadangan resmi.");
        }
      };
    }
  };

  const handleStartSelectionMode = (action: "edit" | "delete") => {
    setSelectionMode(true);
    setSelectionAction(action);
    setSelectedIds([]);

    if (action === "delete") {
      setDeleteTargetMode("page");
      setDeleteCustomLimit(String(Math.min(rowsPerPage, filteredData.length || 1)));
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

  const moveItemsToTrash = (itemsToDelete: NasabahItem[]) => {
    if (itemsToDelete.length === 0) {
      alert("Belum ada data yang dipilih untuk dihapus.");
      return;
    }

    const deleteIds = new Set(itemsToDelete.map((item) => item.no));
    const nextData = dataNasabah.filter((item) => !deleteIds.has(item.no));

    const oldTrashRaw = localStorage.getItem("piposmart_deleted_nasabah_data");
    let oldTrash: NasabahItem[] = [];

    if (oldTrashRaw) {
      try {
        const parsed = JSON.parse(oldTrashRaw);
        oldTrash = Array.isArray(parsed) ? parsed : [];
      } catch {
        oldTrash = [];
      }
    }

    const oldTrashIds = new Set(oldTrash.map((item) => item.no));
    const nextTrash = [
      ...itemsToDelete.filter((item) => !oldTrashIds.has(item.no)),
      ...oldTrash,
    ];

    saveDataNasabah(nextData);
    setTrashCount(nextTrash.length);
    localStorage.setItem("piposmart_deleted_nasabah_data", JSON.stringify(nextTrash));

    setSelectedIds([]);
    setSelectionMode(false);
    setSelectionAction(null);

    alert(`${itemsToDelete.length} data dipindahkan ke Riwayat Hapus.`);
  };

  const prepareDeleteTarget = () => {
    setDeleteTargetMode(selectedIds.length > 0 ? "selected" : "filtered");
    setDeleteCustomLimit(String(Math.min(rowsPerPage, filteredData.length || 1)));
  };

  const getCustomDeleteLimit = () => {
    const parsedLimit = Number(deleteCustomLimit);

    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return 0;
    }

    return Math.min(Math.floor(parsedLimit), filteredData.length);
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
      return filteredData.slice(0, getCustomDeleteLimit());
    }

    return filteredData;
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

  const handleHapusSatuData = (item: NasabahItem) => {
    const yakin = confirm(
      `Yakin ingin memindahkan data "${item.namaOwner}" ke Riwayat Hapus?`,
    );

    if (!yakin) return;

    const oldTrashRaw = localStorage.getItem("piposmart_deleted_nasabah_data");
    let oldTrash: NasabahItem[] = [];

    if (oldTrashRaw) {
      try {
        const parsed = JSON.parse(oldTrashRaw);
        oldTrash = Array.isArray(parsed) ? parsed : [];
      } catch {
        oldTrash = [];
      }
    }

    const nextData = dataNasabah.filter((row) => row.no !== item.no);
    const nextTrash = [item, ...oldTrash.filter((row) => row.no !== item.no)];

    saveDataNasabah(nextData);
    setTrashCount(nextTrash.length);
    localStorage.setItem("piposmart_deleted_nasabah_data", JSON.stringify(nextTrash));

    alert("Data dipindahkan ke Riwayat Hapus.");
  };

  const handleOpenCallAction = (item: NasabahItem) => {
    setCallModalItem(item);
  };

  const handleSaveCallResult = (result: CallFormResult) => {
    const nextData = dataNasabah.map((item) =>
      item.no === result.customerId
        ? {
            ...item,
            ...result.nextCustomer,
          }
        : item,
    );

    saveDataNasabah(nextData);
    setCallModalItem(null);

    alert("Hasil Call & Chat berhasil disimpan.");
  };

  const openBulkPicModal = () => {
    if (selectedIds.length === 0) {
      alert("Pilih data owner terlebih dahulu.");
      return;
    }

    setBulkSelectedPic("");
    setBulkPicModalOpen(true);
  };

  const closeBulkPicModal = () => {
    setBulkPicModalOpen(false);
    setBulkSelectedPic("");
  };

  const handleSaveBulkPic = (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedIds.length === 0) {
      alert("Belum ada data yang dipilih.");
      return;
    }

    if (!bulkSelectedPic) {
      alert("Pilih PIC Sales terlebih dahulu.");
      return;
    }

    const selectedSet = new Set(selectedIds);
    const nextData = dataNasabah.map((item) =>
      selectedSet.has(item.no) ? { ...item, pic: bulkSelectedPic } : item,
    );

    saveDataNasabah(nextData);
    closeBulkPicModal();
    setSelectedIds([]);
    setSelectionMode(false);
    setSelectionAction(null);

    alert(`${selectedSet.size} data berhasil diganti ke PIC ${bulkSelectedPic}.`);
  };

  const daftarPicUnik = useMemo(() => {
    const setPic = new Set<string>();

    dataNasabah.forEach((item) => {
      if (item.pic) setPic.add(item.pic);
    });

    return Array.from(setPic).sort();
  }, [dataNasabah]);

  const summaryData = useMemo(() => {
    const totalCustomer = dataNasabah.length;

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
  }, [dataNasabah]);

  const filteredData = useMemo(() => {
    return dataNasabah.filter((item) => {
      const kodeKeyword = searchKodeOwner.toLowerCase().trim();
      const namaKeyword = searchNamaOwner.toLowerCase().trim();
      const outletKeyword = searchNamaOutlet.toLowerCase().trim();

      const matchesSearch =
        (kodeKeyword === "" ||
          item.kodeOwner?.toLowerCase().includes(kodeKeyword)) &&
        (namaKeyword === "" ||
          item.namaOwner?.toLowerCase().includes(namaKeyword)) &&
        (outletKeyword === "" ||
          item.outlet?.toLowerCase().includes(outletKeyword));

      const matchesPic = picFilter === "Semua" || item.pic === picFilter;

      const matchesSkor =
        skorFilter === "Semua" ||
        String(item.remarks ?? item.scor ?? "0") === skorFilter;

      let matchesFilter = true;

      if (filterMode === "harian") {
        const itemDate = getOwnerFilterDate(item);
        const today = getTodayInputDate();
        const activeStartDate = startDateFilter || today;
        const activeEndDate = endDateFilter || activeStartDate;

        if (!itemDate) {
          return false;
        }

        if (activeStartDate && itemDate < activeStartDate) {
          return false;
        }

        if (activeEndDate && itemDate > activeEndDate) {
          return false;
        }
      } else {
        if (startMonthFilter || endMonthFilter) {
          const itemMonth = getOwnerFilterMonth(item);
          const itemMonthIndex = LIST_BULAN.indexOf(itemMonth);

          const startIndex = startMonthFilter
            ? LIST_BULAN.indexOf(startMonthFilter)
            : 0;

          const endIndex = endMonthFilter
            ? LIST_BULAN.indexOf(endMonthFilter)
            : 11;

          if (itemMonthIndex === -1) {
            return false;
          }

          if (itemMonthIndex < startIndex || itemMonthIndex > endIndex) {
            matchesFilter = false;
          }
        }
      }

      return matchesSearch && matchesPic && matchesSkor && matchesFilter;
    });
  }, [
    dataNasabah,
    searchKodeOwner,
    searchNamaOwner,
    searchNamaOutlet,
    picFilter,
    skorFilter,
    startDateFilter,
    endDateFilter,
    startMonthFilter,
    endMonthFilter,
    filterMode,
  ]);


  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterMode,
    searchKodeOwner,
    searchNamaOwner,
    searchNamaOutlet,
    picFilter,
    skorFilter,
    startDateFilter,
    endDateFilter,
    startMonthFilter,
    endMonthFilter,
    rowsPerPage,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startDataIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endDataIndex = Math.min(startDataIndex + rowsPerPage, filteredData.length);

  const paginatedData = useMemo(
    () => filteredData.slice(startDataIndex, endDataIndex),
    [filteredData, startDataIndex, endDataIndex],
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


  const handleSaveEditModal = (event: React.FormEvent) => {
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

    const nextData = dataNasabah.map((item) =>
      item.no === normalizedEditingItem.no ? normalizedEditingItem : item,
    );

    saveDataNasabah(nextData);
    closeEditModal();

    alert("Data profil berhasil diperbarui.");
  };

  return (
    <div className="space-y-6 font-sans text-[#1C1C1E] max-w-full overflow-x-hidden overflow-y-visible">
      {/* ACTION TOP BAR */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200/60 shadow-xs">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Data Kelolaan Owner
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Workspace Monitoring Kemitraan PT. PIPOSMART DIGITAL INDONESIA.
          </p>
          <div className="text-xs text-gray-400 font-bold mt-1.5 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <UserIcon />
              Logged in:{" "}
              <span className="text-[#C92C1E] font-black">{loggedInUser}</span>
            </div>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border border-red-200 bg-red-50 text-[#C92C1E] uppercase tracking-wider shadow-sm">
              {loggedInRole}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleImportData}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <UploadIcon />
            Import Data
          </button>

          <button
            onClick={handleExportData}
            className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <DownloadIcon />
            Export Data
          </button>

          <button
            onClick={handleGenerateDummy}
            className="px-3.5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <RefreshIcon />
            Inject 1000 Dummy
          </button>

          <Link
            href="/menu/data-kelolaan/form"
            className="px-4 py-2.5 bg-[#C92C1E] text-white rounded-xl text-xs font-black hover:bg-[#A82216] transition shadow-sm flex items-center gap-1.5"
          >
            <PlusIcon />
            Tambah Data Manual
          </Link>
        </div>
      </div>

      {/* SUMMARY CUSTOMER */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryMetricCard
          title="Total Owner"
          value={summaryData.totalCustomer}
          description="Jumlah semua owner yang masuk ke data kelolaan."
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

      {/* PANEL FILTER & SEARCHING */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
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


      </div>

      {/* TABLE WORKSPACE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div>
              <p className="text-xs font-black text-gray-800 uppercase">
                Tabel Profil Owner
              </p>
              <p className="text-[11px] text-gray-400 font-medium">
                Edit profil tetap muncul di depan layar sebagai modal, bukan pindah halaman.
              </p>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/menu/data-kelolaan/trash"
              className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black hover:bg-gray-50 transition cursor-pointer flex items-center gap-1.5"
            >
              <TrashIcon className="w-3.5 h-3.5 text-gray-500" />
              Riwayat Hapus ({trashCount})
            </Link>

            {!selectionMode ? (
              <>
                <button
                  onClick={() => handleStartSelectionMode("edit")}
                  className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-black hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1.5"
                >
                  <EditIcon className="w-3.5 h-3.5" />
                  Pilih untuk Edit PIC
                </button>

                <button
                  onClick={() => handleStartSelectionMode("delete")}
                  className="px-3.5 py-2 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-black hover:bg-red-100 transition cursor-pointer flex items-center gap-1.5"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Pilih untuk Hapus
                </button>
              </>
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
                    Edit PIC Terpilih ({selectedIds.length})
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
                        Semua hasil filter ({filteredData.length})
                      </option>
                      <option value="custom">
                        Jumlah tertentu
                      </option>
                    </select>

                    {deleteTargetMode === "custom" && (
                      <input
                        type="number"
                        min={1}
                        max={filteredData.length}
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
                      disabled={filteredData.length === 0 || getDeleteTargetItems().length === 0}
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm font-semibold text-gray-600 border-collapse table-auto">
            <thead>
              <tr
                className="bg-[#C92C1E] text-white uppercase text-[10px] md:text-[11px] tracking-wider font-black"
              >
                {selectionMode && (
                  <th className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleSelectAllCurrentPage}
                      className="h-4 w-4 cursor-pointer accent-white"
                      title="Pilih semua data di halaman ini"
                    />
                  </th>
                )}

                <th className="p-3 text-center align-top">No</th>
                    <th className="p-3 text-center align-top min-w-[140px]">
                      <div className="space-y-2">
                        <span>Kode Owner</span>
                        <input
                          type="text"
                          value={searchKodeOwner}
                          onChange={(e) => setSearchKodeOwner(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Kode"
                          className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                        />
                      </div>
                    </th>
                    <th className="p-3 align-top min-w-[180px]">
                      <div className="space-y-2">
                        <span>Nama Owner</span>
                        <input
                          type="text"
                          value={searchNamaOwner}
                          onChange={(e) => setSearchNamaOwner(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Owner"
                          className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                        />
                      </div>
                    </th>
                    <th className="p-3 align-top min-w-[180px]">
                      <div className="space-y-2">
                        <span>Nama Outlet</span>
                        <input
                          type="text"
                          value={searchNamaOutlet}
                          onChange={(e) => setSearchNamaOutlet(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Outlet"
                          className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                        />
                      </div>
                    </th>
                    <th className="p-3 text-center align-top min-w-[150px]">
                      <div className="space-y-2">
                        <span>PIC Sales</span>
                        <select
                          value={picFilter}
                          onChange={(e) => setPicFilter(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                        >
                          <option value="Semua">Semua PIC</option>
                          {LIST_PIC.map((pic) => (
                            <option key={pic} value={pic}>
                              {pic}
                            </option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="p-3 text-center align-top min-w-[170px]">
                      <div className="space-y-2">
                        <span>Skor</span>
                        <select
                          value={skorFilter}
                          onChange={(e) => setSkorFilter(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                        >
                          <option value="Semua">Semua Skor</option>
                          {LIST_SKOR.map((skor) => (
                            <option key={skor.value} value={skor.value}>
                              {skor.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="p-3 text-center align-top">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7 + (selectionMode ? 1 : 0)}
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
                        return;
                      }

                      router.push(`/menu/data-kelolaan/deskripsi-customer?id=${row.no}`);
                    }}
                    className={`border-b border-gray-100 last:border-0 transition-colors cursor-pointer ${
                      selectedIds.includes(row.no)
                        ? "bg-red-100/70 hover:bg-red-100"
                        : "hover:bg-gray-50/80"
                    }`}
                  >
                    {selectionMode && (
                      <td
                        className="p-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.no)}
                          onChange={() => handleToggleSelectRow(row.no)}
                          className="h-4 w-4 cursor-pointer accent-[#C92C1E]"
                        />
                      </td>
                    )}

                    <td className="p-3 text-center text-gray-400 font-bold">
                          {startDataIndex + idx + 1}
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-gray-700 bg-gray-50/20">
                          {row.kodeOwner || "-"}
                        </td>

                        <td className="p-3 font-black text-gray-900 whitespace-normal break-words">
                          {row.namaOwner || "-"}
                        </td>

                        <td className="p-3 text-gray-500 whitespace-normal break-words">
                          {row.outlet || "-"}
                        </td>

                        <td className="p-3 text-center">
                          <PicBadge value={row.pic || ""} color="red" />
                        </td>

                        <td className="p-3 text-center">
                          <SkorBadge item={row} />
                        </td>

                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ActionButtons
                            item={row}
                            onCall={handleOpenCallAction}
                            onEdit={openEditModal}
                            onDelete={handleHapusSatuData}
                          />
                        </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs font-bold text-gray-500">
            Menampilkan{" "}
            <span className="font-black text-gray-900">
              {filteredData.length === 0 ? 0 : startDataIndex + 1}
            </span>{" "}
            -{" "}
            <span className="font-black text-gray-900">{endDataIndex}</span>{" "}
            dari{" "}
            <span className="font-black text-[#C92C1E]">{filteredData.length}</span>{" "}
            data
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={rowsPerPage}
              onChange={(event) => setRowsPerPage(Number(event.target.value))}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 outline-none"
            >
              <option value={10}>10 / halaman</option>
              <option value={25}>25 / halaman</option>
              <option value={50}>50 / halaman</option>
              <option value={100}>100 / halaman</option>
            </select>

            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Awal
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>

            <span className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-[#C92C1E]">
              {safeCurrentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Akhir
            </button>
          </div>
        </div>
      </div>


      <GrafikCustomer dataNasabah={dataNasabah} />

      <CallPage
        customer={callModalItem}
        onClose={() => setCallModalItem(null)}
        onSave={handleSaveCallResult}
      />

      {/* MODAL EDIT PIC DATA TERPILIH */}
      {bulkPicModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 p-3 sm:p-6">
          <div className="mx-auto my-6 flex max-h-[calc(100vh-3rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  Edit PIC Data Terpilih
                </h2>
                <p className="text-xs font-medium text-gray-400">
                  Pilih PIC Sales baru untuk {selectedIds.length} data owner yang dicentang.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBulkPicModal}
                className="h-9 w-9 rounded-full bg-gray-100 font-black text-gray-600 hover:bg-gray-200"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveBulkPic} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
                <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                  <FieldIcon type="sales" />
                  PIC Sales Baru
                </label>

                <select
                  value={bulkSelectedPic}
                  onChange={(event) => setBulkSelectedPic(event.target.value)}
                  required
                  className="w-full cursor-pointer rounded-xl border border-red-100 bg-white p-3 text-xs font-black text-gray-700 outline-none focus:border-[#C92C1E]"
                >
                  <option value="">Pilih PIC Sales</option>
                  {LIST_PIC.map((pic) => (
                    <option key={pic} value={pic}>
                      {pic}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-[11px] font-medium text-gray-400">
                  Setelah disimpan, semua data yang dicentang akan berubah ke PIC yang dipilih.
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={closeBulkPicModal}
                  className="rounded-xl border px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#C92C1E] px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#A82216]"
                >
                  Simpan PIC
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
        listPic={LIST_PIC}
        onClose={closeEditModal}
        onSubmit={handleSaveEditModal}
        onChangeField={updateEditingField}
      />
    </div>
  );
}