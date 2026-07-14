"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
}

type EditModalMode = "profil" | "scoring";

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

const LIST_SKOR = [
  { value: "0", label: "Tidak Potensial (0)", scor: 0 },
  { value: "1", label: "Kemungkinan Potensial (1)", scor: 1 },
  { value: "2", label: "Potensial (2)", scor: 2 },
  { value: "3", label: "Langganan (3)", scor: 3 },
];

const LIST_PIC = ["Satria", "Lydia", "Laura", "Fenya", "Sales A", "Sales B", "Sales C"];

const paketOptions = ["", "Basic", "Business", "Pro", "Bundling & Alat"];
const sumberOptions = ["Instagram", "Facebook", "Tiktok", "Mitra", "Playstore"];
const callOptions = ["PENDING", "CONTACTED", "NO CALL"];
const chatOptions = ["PENDING", "PROSPECT", "DELIVERED", "NO CHAT"];
const validitasOptions = ["VALID", "INVALID"];

const DATA_PACKET_MASTER: Record<string, { id_skema: string; nama_promo: string; total_penjualan: number }[]> = {
  Basic: [
    { id_skema: "basic_24", nama_promo: "24 Bulan Basic", total_penjualan: 1716000 },
    { id_skema: "basic_18", nama_promo: "18 Bulan Basic", total_penjualan: 1398000 },
    { id_skema: "basic_12", nama_promo: "12 Bulan Basic", total_penjualan: 858000 },
    { id_skema: "basic_9", nama_promo: "9 Bulan Basic", total_penjualan: 702000 },
    { id_skema: "basic_1", nama_promo: "1 Bulan Basic", total_penjualan: 78000 },
  ],
  Business: [
    { id_skema: "biz_24", nama_promo: "24 Bulan Business", total_penjualan: 2596000 },
    { id_skema: "biz_18", nama_promo: "18 Bulan Business", total_penjualan: 1998000 },
    { id_skema: "biz_12", nama_promo: "12 Bulan Business", total_penjualan: 1298000 },
    { id_skema: "biz_9", nama_promo: "9 Bulan Business", total_penjualan: 998000 },
    { id_skema: "biz_6", nama_promo: "6 Bulan Business", total_penjualan: 708000 },
    { id_skema: "biz_1", nama_promo: "1 Bulan Business", total_penjualan: 118000 },
  ],
  Pro: [
    { id_skema: "pro_24", nama_promo: "24 Bulan Pro", total_penjualan: 3368000 },
    { id_skema: "pro_18", nama_promo: "18 Bulan Pro", total_penjualan: 2688000 },
    { id_skema: "pro_12", nama_promo: "12 Bulan Pro", total_penjualan: 1688000 },
    { id_skema: "pro_9", nama_promo: "9 Bulan Pro", total_penjualan: 1368000 },
    { id_skema: "pro_6", nama_promo: "6 Bulan Pro", total_penjualan: 1008000 },
    { id_skema: "pro_1", nama_promo: "1 Bulan Pro", total_penjualan: 168000 },
  ],
  "Bundling & Alat": [
    { id_skema: "bund_starter", nama_promo: "Paket Starter Pro", total_penjualan: 2078000 },
    { id_skema: "bund_pos_pro", nama_promo: "POS Bundle Pro", total_penjualan: 5288000 },
    { id_skema: "bund_jagoan_biz", nama_promo: "Jagoan Business", total_penjualan: 1598000 },
    { id_skema: "bund_pos_biz", nama_promo: "POS Bundle Business", total_penjualan: 4798000 },
  ],
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

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

export default function DataKelolaanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dataNasabah, setDataNasabah] = useState<NasabahItem[]>([]);
  const [viewMode, setViewMode] = useState<"merah" | "hijau">("merah");
  const [filterMode, setFilterMode] = useState<"harian" | "bulanan">("harian");

  const [searchKodeOwner, setSearchKodeOwner] = useState("");
  const [searchNamaOwner, setSearchNamaOwner] = useState("");
  const [searchNamaOutlet, setSearchNamaOutlet] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [startMonthFilter, setStartMonthFilter] = useState("");
  const [endMonthFilter, setEndMonthFilter] = useState("");
  const [picFilter, setPicFilter] = useState("Semua");
  const [skorFilter, setSkorFilter] = useState("Semua");

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [trashCount, setTrashCount] = useState(0);

  const [modalMode, setModalMode] = useState<EditModalMode>("profil");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NasabahItem | null>(null);

  const loggedInUser = "Satria";
  const loggedInRole = "Admin";

  useEffect(() => {
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

  const saveDataNasabah = (nextData: NasabahItem[]) => {
    setDataNasabah(nextData);
    localStorage.setItem("piposmart_nasabah_data", JSON.stringify(nextData));
  };

  const handleGenerateDummy = () => {
    const mockExcelData: NasabahItem[] = [
      {
        totalFu: 5,
        tanggalFu: "2026-06-15",
        tahun: "2026",
        bulan: "Juni",
        no: 6,
        pic: "Satria",
        tanggalDibagikan: "2026-06-02",
        statusAkun: "Akun Baru",
        kodeBaris: "11313",
        kodeOwner: "18907",
        namaOwner: "Bubble's~2",
        projectBrand: "Bubble 2",
        outlet: "Bubble 2",
        noHpOwner: "085240267611",
        noHpOutlet: "",
        createDateProject: "2026-06-02",
        expiredDate: "2026-06-16",
        totalTransaksi: 4,
        scor: 3,
        callStatus: "NO CALL",
        chatStatus: "PROSPECT",
        validitas: "VALID",
        remarks: "3",
        sumberNasabah: "Facebook",
        finalisasiClosing: "Basic",
        skemaId: "basic_24",
        nominal: 1716000,
        noted: "reminder untuk perpanjangan",
      },
      {
        totalFu: 2,
        tanggalFu: "2026-03-12",
        tahun: "2026",
        bulan: "Maret",
        no: 7,
        pic: "Lydia",
        tanggalDibagikan: "2026-03-02",
        statusAkun: "Outlet Baru",
        kodeBaris: "10828",
        kodeOwner: "18070",
        namaOwner: "Ramlah 15",
        projectBrand: "IRA LAUNDRY",
        outlet: "IRA LAUNDRY",
        noHpOwner: "085252472966",
        noHpOutlet: "082252472966",
        createDateProject: "2026-03-09",
        expiredDate: "2026-03-23",
        totalTransaksi: 0,
        scor: 0,
        callStatus: "CONTACTED",
        chatStatus: "NO CHAT",
        validitas: "INVALID",
        remarks: "0",
        sumberNasabah: "Instagram",
        finalisasiClosing: "",
        nominal: 0,
        noted: "Nomor tidak terhubung dengan wa",
      },
      {
        totalFu: 2,
        tanggalFu: "2026-01-20",
        tahun: "2026",
        bulan: "Januari",
        no: 8,
        pic: "Satria",
        tanggalDibagikan: "2026-01-02",
        statusAkun: "Referral Mitra",
        kodeBaris: "10850",
        kodeOwner: "18104",
        namaOwner: "Sofiah ichwani",
        projectBrand: "Azzahra laundry",
        outlet: "Azzahra laundry",
        noHpOwner: "081269923421",
        noHpOutlet: "081269923421",
        createDateProject: "2026-01-14",
        expiredDate: "2026-01-28",
        totalTransaksi: 4,
        scor: 1,
        callStatus: "CONTACTED",
        chatStatus: "DELIVERED",
        validitas: "VALID",
        remarks: "0",
        sumberNasabah: "Tiktok",
        finalisasiClosing: "",
        nominal: 0,
        noted: "",
      },
    ];

    saveDataNasabah(mockExcelData);
    setTrashCount(0);
    localStorage.removeItem("piposmart_deleted_nasabah_data");
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

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds([]);
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id],
    );
  };

  const handleHapusDataTerpilih = () => {
    if (selectedIds.length === 0) {
      alert("Belum ada data yang dipilih untuk dihapus.");
      return;
    }

    const yakin = confirm(
      `Yakin ingin memindahkan ${selectedIds.length} data yang dipilih ke Riwayat Hapus? Data masih bisa dipulihkan dari halaman Trash.`,
    );

    if (!yakin) return;

    const selectedSet = new Set(selectedIds);
    const deletedItems = dataNasabah.filter((item) => selectedSet.has(item.no));
    const nextData = dataNasabah.filter((item) => !selectedSet.has(item.no));

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
      ...deletedItems.filter((item) => !oldTrashIds.has(item.no)),
      ...oldTrash,
    ];

    saveDataNasabah(nextData);
    setTrashCount(nextTrash.length);
    localStorage.setItem("piposmart_deleted_nasabah_data", JSON.stringify(nextTrash));

    setSelectedIds([]);
    setSelectionMode(false);

    alert(`${deletedItems.length} data dipindahkan ke Riwayat Hapus.`);
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

  const daftarPicUnik = useMemo(() => {
    const setPic = new Set<string>();

    dataNasabah.forEach((item) => {
      if (item.pic) setPic.add(item.pic);
    });

    return Array.from(setPic).sort();
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
        if (startDateFilter && item.tanggalFu < startDateFilter) matchesFilter = false;
        if (endDateFilter && item.tanggalFu > endDateFilter) matchesFilter = false;
      } else {
        if (startMonthFilter || endMonthFilter) {
          const itemMonthIndex = LIST_BULAN.indexOf(item.bulan);
          const startIndex = startMonthFilter
            ? LIST_BULAN.indexOf(startMonthFilter)
            : 0;
          const endIndex = endMonthFilter
            ? LIST_BULAN.indexOf(endMonthFilter)
            : 11;

          if (itemMonthIndex !== -1) {
            if (itemMonthIndex < startIndex || itemMonthIndex > endIndex) {
              matchesFilter = false;
            }
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

  const filteredIds = useMemo(() => filteredData.map((item) => item.no), [filteredData]);

  const isAllFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAllFiltered = () => {
    if (filteredIds.length === 0) return;

    if (isAllFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
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
    const remarksValue = String(item.remarks ?? "");
    const skor = LIST_SKOR.find((row) => row.value === remarksValue);
    if (skor) return skor.label;

    if (item.scor === 3) return "Langganan (3)";
    if (item.scor === 2) return "Potensial (2)";
    if (item.scor === 1) return "Kemungkinan Potensial (1)";

    return "Tidak Potensial (0)";
  };

  const getSkorBadgeClass = (item: NasabahItem) => {
    const value = String(item.remarks ?? item.scor ?? "0");

    if (value === "3") return "bg-blue-100 text-blue-700";
    if (value === "2") return "bg-yellow-100 text-yellow-800";
    if (value === "1") return "bg-orange-100 text-orange-800";

    return "bg-red-100 text-red-700";
  };

  const openEditModal = (item: NasabahItem, mode: EditModalMode) => {
    setEditingItem({ ...item });
    setModalMode(mode);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditModalOpen(false);
  };

  const updateEditingField = <K extends keyof NasabahItem>(
    field: K,
    value: NasabahItem[K],
  ) => {
    setEditingItem((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveEditModal = (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingItem) return;

    if (!editingItem.kodeOwner || !editingItem.namaOwner) {
      alert("Kode Owner dan Nama Owner wajib diisi.");
      return;
    }

    const nextData = dataNasabah.map((item) =>
      item.no === editingItem.no ? editingItem : item,
    );

    saveDataNasabah(nextData);
    closeEditModal();

    alert(
      modalMode === "profil"
        ? "Data profil berhasil diperbarui."
        : "Data scoring berhasil diperbarui.",
    );
  };

  const updateScoringPackage = (packageName: string) => {
    const listSkema = DATA_PACKET_MASTER[packageName] || [];
    const skemaPertama = listSkema.length > 0 ? listSkema[0] : null;

    setEditingItem((prev) =>
      prev
        ? {
            ...prev,
            finalisasiClosing: packageName,
            skemaId: skemaPertama?.id_skema || "",
            nominal: skemaPertama?.total_penjualan || 0,
          }
        : prev,
    );
  };

  const updateScoringSkema = (skemaId: string) => {
    if (!editingItem) return;

    const listSkema = DATA_PACKET_MASTER[editingItem.finalisasiClosing || ""] || [];
    const targetSkema = listSkema.find((item) => item.id_skema === skemaId);

    setEditingItem((prev) =>
      prev
        ? {
            ...prev,
            skemaId,
            nominal: targetSkema?.total_penjualan || prev.nominal || 0,
          }
        : prev,
    );
  };

  const currentSkemaList =
    editingItem && editingItem.finalisasiClosing
      ? DATA_PACKET_MASTER[editingItem.finalisasiClosing] || []
      : [];

  return (
    <div className="space-y-6 font-sans text-[#1C1C1E] max-w-full overflow-hidden">
      {/* ACTION TOP BAR */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200/60 shadow-xs">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Data Kelolaan Nasabah
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
            Inject Dummy
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

      {/* PANEL FILTER & SEARCHING */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start">
          <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => {
                setFilterMode("harian");
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

        <div className="flex bg-gray-100 p-1 rounded-xl w-full lg:w-auto shadow-inner justify-end">
          <button
            onClick={() => setViewMode("merah")}
            className={`px-5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
              viewMode === "merah"
                ? "bg-[#C92C1E] text-white shadow-md"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Profil
          </button>
          <button
            onClick={() => setViewMode("hijau")}
            className={`px-5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
              viewMode === "hijau"
                ? "bg-emerald-700 text-white shadow-md"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Scoring
          </button>
        </div>
      </div>

      {/* TABLE WORKSPACE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div>
              <p className="text-xs font-black text-gray-800 uppercase">
                {viewMode === "merah" ? "Tabel Profil Nasabah" : "Tabel Scoring Nasabah"}
              </p>
              <p className="text-[11px] text-gray-400 font-medium">
                Edit tetap muncul di depan layar sebagai modal, bukan pindah halaman.
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

            <button
              onClick={handleToggleSelectionMode}
              className={`px-3.5 py-2 border rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                selectionMode
                  ? "bg-gray-900 border-gray-900 text-white hover:bg-black"
                  : "bg-red-50 border-red-100 text-red-600 hover:bg-red-100"
              }`}
            >
              <TrashIcon className="w-3.5 h-3.5" />
              {selectionMode ? "Batal Pilih" : "Pilih Data Hapus"}
            </button>

            {selectionMode && (
              <>
                <button
                  onClick={handleToggleSelectAllFiltered}
                  disabled={filteredIds.length === 0}
                  className="px-3.5 py-2 bg-white border border-red-200 text-red-700 rounded-xl text-xs font-black hover:bg-red-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isAllFilteredSelected
                    ? "Batal Pilih Semua"
                    : `Pilih Semua Tampilan (${filteredIds.length})`}
                </button>

                <button
                  onClick={handleHapusDataTerpilih}
                  disabled={selectedIds.length === 0}
                  className="px-3.5 py-2 bg-red-600 border border-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Hapus Terpilih ({selectedIds.length})
                </button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm font-semibold text-gray-600 border-collapse table-auto">
            <thead>
              <tr
                className={`text-white uppercase text-[10px] md:text-[11px] tracking-wider font-black transition-colors duration-300 ${
                  viewMode === "merah" ? "bg-[#C92C1E]" : "bg-emerald-700"
                }`}
              >
                {selectionMode && (
                  <th className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={handleToggleSelectAllFiltered}
                      className="h-4 w-4 cursor-pointer accent-white"
                      title="Pilih semua data yang sedang tampil"
                    />
                  </th>
                )}

                {viewMode === "merah" ? (
                  <>
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
                          placeholder="Search Nama"
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
                    <th className="p-3 text-center align-top min-w-[140px]">
                      <div className="space-y-2">
                        <span>PIC Sales</span>
                        <select
                          value={picFilter}
                          onChange={(e) => setPicFilter(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                        >
                          <option value="Semua">Semua PIC</option>
                          {daftarPicUnik.map((pic) => (
                            <option key={pic} value={pic}>
                              {pic}
                            </option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="p-3 text-center align-top min-w-[160px]">
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
                  </>
                ) : (
                  <>
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
                          className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                          placeholder="Search Nama"
                          className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                      </div>
                    </th>
                    <th className="p-3 text-center align-top min-w-[140px]">
                      <div className="space-y-2">
                        <span>PIC Sales</span>
                        <select
                          value={picFilter}
                          onChange={(e) => setPicFilter(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        >
                          <option value="Semua">Semua PIC</option>
                          {daftarPicUnik.map((pic) => (
                            <option key={pic} value={pic}>
                              {pic}
                            </option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="p-3 text-center align-top">Expired Date</th>
                    <th className="p-3 text-center">Total Transaksi</th>
                    <th className="p-3 text-center align-top min-w-[160px]">
                      <div className="space-y-2">
                        <span>Skor</span>
                        <select
                          value={skorFilter}
                          onChange={(e) => setSkorFilter(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                    <th className="p-3">Status Call</th>
                    <th className="p-3">Status Chat</th>
                    <th className="p-3 text-center">Validitas</th>
                    <th className="p-3">Remarks</th>
                    <th className="p-3">Sumber Nasabah</th>
                    <th className="p-3">Finalisasi Paket</th>
                    <th className="p-3 text-right">Nominal Closing</th>
                    <th className="p-3">Catatan</th>
                    <th className="p-3 text-center">Action</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={(viewMode === "merah" ? 7 : 16) + (selectionMode ? 1 : 0)}
                    className="p-8 text-center text-gray-400 font-bold italic"
                  >
                    Data tidak ditemukan pada rentang filter ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
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

                    {viewMode === "merah" ? (
                      <>
                        <td className="p-3 text-center text-gray-400 font-bold">
                          {idx + 1}
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
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black rounded-full bg-red-50 border border-red-200 text-[#C92C1E] uppercase tracking-tight whitespace-nowrap">
                            {row.pic || "-"}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center px-2 py-1 text-[10px] font-black rounded-md text-center whitespace-normal ${getSkorBadgeClass(row)}`}
                          >
                            {getSkorLabel(row)}
                          </span>
                        </td>

                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => openEditModal(row, "profil")}
                              className="text-gray-600 hover:text-[#C92C1E] hover:scale-110 transition"
                              title="Edit profil"
                            >
                              <EditIcon className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHapusSatuData(row)}
                              className="text-gray-500 hover:text-red-600 hover:scale-110 transition"
                              title="Hapus data"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-center text-gray-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-gray-700">
                          {row.kodeOwner || "-"}
                        </td>
                        <td className="p-3 font-black text-gray-900 whitespace-normal break-words">
                          {row.namaOwner || "-"}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 uppercase tracking-tight whitespace-nowrap">
                            {row.pic || "-"}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-gray-600">
                          {formatTgl(row.expiredDate)}
                        </td>
                        <td className="p-3 text-center font-bold text-gray-900">
                          {row.totalTransaksi}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center px-2 py-1 text-[10px] font-black rounded-md text-center whitespace-normal ${getSkorBadgeClass(row)}`}
                          >
                            {getSkorLabel(row)}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={
                              row.callStatus === "NO CALL"
                                ? "text-[#C92C1E] font-bold"
                                : "text-emerald-600 font-bold"
                            }
                          >
                            {row.callStatus || "-"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-700 font-bold">
                            {row.chatStatus || "-"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-1 py-0.5 font-bold rounded text-[10px] ${
                              row.validitas === "VALID"
                                ? "bg-emerald-700 text-white"
                                : "bg-red-600 text-white"
                            }`}
                          >
                            {row.validitas || "-"}
                          </span>
                        </td>
                        <td className="p-3 whitespace-normal break-words max-w-[120px]">
                          <span
                            className={`inline-flex items-center justify-center px-2 py-1 text-[10px] font-black rounded-md text-center whitespace-normal ${getSkorBadgeClass(row)}`}
                          >
                            {getSkorLabel(row)}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider border bg-gray-50 border-gray-200 text-gray-600">
                            {row.sumberNasabah || "Instagram"}
                          </span>
                        </td>
                        <td className="p-3 font-black text-gray-800 whitespace-normal break-words">
                          {row.finalisasiClosing || "Tanpa Paket"}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700">
                          {formatRupiah(row.nominal)}
                        </td>
                        <td className="p-3 text-gray-400 whitespace-normal break-words text-[11px]">
                          {row.noted || "-"}
                        </td>
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => openEditModal(row, "scoring")}
                              className="text-gray-600 hover:text-emerald-700 hover:scale-110 transition"
                              title="Edit scoring"
                            >
                              <EditIcon className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHapusSatuData(row)}
                              className="text-gray-500 hover:text-red-600 hover:scale-110 transition"
                              title="Hapus data"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT PROFIL / SCORING */}
      {editModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {modalMode === "profil" ? "Edit Profil Nasabah" : "Edit Scoring Nasabah"}
                </h2>
                <p className="text-xs text-gray-400 font-medium">
                  {modalMode === "profil"
                    ? "Form ini hanya mengubah atribut profil."
                    : "Form ini hanya mengubah atribut scoring."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-black"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="p-5 space-y-4">
              {modalMode === "profil" ? (
                <div className="p-4 bg-red-50/30 border border-red-100 rounded-xl space-y-3">
                  <span className="text-[10px] font-black text-[#C92C1E] uppercase tracking-wider block">
                    Atribut Profil Nasabah
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormInput label="Kode Owner *" value={editingItem.kodeOwner || ""} onChange={(value) => updateEditingField("kodeOwner", value)} />
                    <FormInput label="Nama Owner *" value={editingItem.namaOwner || ""} onChange={(value) => updateEditingField("namaOwner", value)} />
                    <FormSelect label="PIC Sales *" value={editingItem.pic || ""} options={LIST_PIC} onChange={(value) => updateEditingField("pic", value)} />
                    <FormInput label="Tanggal Follow Up" type="date" value={editingItem.tanggalFu || ""} onChange={(value) => updateEditingField("tanggalFu", value)} />
                    <FormInput label="Total FU" type="number" value={String(editingItem.totalFu || 0)} onChange={(value) => updateEditingField("totalFu", Number(value) || 0)} />
                    <FormSelect label="Bulan Laporan" value={editingItem.bulan || "Juni"} options={LIST_BULAN} onChange={(value) => updateEditingField("bulan", value)} />
                    <FormInput label="Tahun Laporan" value={editingItem.tahun || "2026"} onChange={(value) => updateEditingField("tahun", value)} />
                    <FormInput label="No. HP Owner" value={editingItem.noHpOwner || ""} onChange={(value) => updateEditingField("noHpOwner", value)} />
                    <FormSelect label="Status Akun" value={editingItem.statusAkun || "Akun Baru"} options={["Akun Baru", "Outlet Baru", "Referral Mitra"]} onChange={(value) => updateEditingField("statusAkun", value)} />
                    <FormInput label="Project / Brand" value={editingItem.projectBrand || ""} onChange={(value) => updateEditingField("projectBrand", value)} />
                    <FormInput label="Nama Outlet" value={editingItem.outlet || ""} onChange={(value) => updateEditingField("outlet", value)} />
                    <FormInput label="No. HP Outlet" value={editingItem.noHpOutlet || ""} onChange={(value) => updateEditingField("noHpOutlet", value)} />
                    <FormInput label="Kode Baris" value={editingItem.kodeBaris || ""} onChange={(value) => updateEditingField("kodeBaris", value)} />
                    <FormInput label="Tanggal Dibagikan" type="date" value={editingItem.tanggalDibagikan || ""} onChange={(value) => updateEditingField("tanggalDibagikan", value)} />
                    <FormInput label="Create Date Project" type="date" value={editingItem.createDateProject || ""} onChange={(value) => updateEditingField("createDateProject", value)} />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-xl space-y-3">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">
                    Atribut Scoring & Closing
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormInput label="Expired Date" type="date" value={editingItem.expiredDate || ""} onChange={(value) => updateEditingField("expiredDate", value)} />
                    <FormInput label="Total Transaksi" type="number" value={String(editingItem.totalTransaksi || 0)} onChange={(value) => updateEditingField("totalTransaksi", Number(value) || 0)} />
                    <FormSelect
                      label="Skor / Remarks"
                      value={String(editingItem.remarks ?? "0")}
                      options={LIST_SKOR.map((item) => item.value)}
                      getLabel={(value) => LIST_SKOR.find((item) => item.value === value)?.label || value}
                      onChange={(value) => {
                        const selected = LIST_SKOR.find((item) => item.value === value);
                        updateEditingField("remarks", value);
                        updateEditingField("scor", selected?.scor ?? 0);
                      }}
                    />
                    <FormSelect label="Validitas" value={editingItem.validitas || "VALID"} options={validitasOptions} onChange={(value) => updateEditingField("validitas", value)} />
                    <FormSelect label="Call Status" value={editingItem.callStatus || "PENDING"} options={callOptions} onChange={(value) => updateEditingField("callStatus", value)} />
                    <FormSelect label="Chat Status" value={editingItem.chatStatus || "PENDING"} options={chatOptions} onChange={(value) => updateEditingField("chatStatus", value)} />
                    <FormSelect label="Sumber Nasabah" value={editingItem.sumberNasabah || "Instagram"} options={sumberOptions} onChange={(value) => updateEditingField("sumberNasabah", value)} />
                    <FormSelect label="Kategori Paket Closing" value={editingItem.finalisasiClosing || ""} options={paketOptions} getLabel={(value) => value || "Tanpa Paket"} onChange={updateScoringPackage} />

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Nama Promo / Skema Tenor
                      </label>
                      <select
                        value={editingItem.skemaId || ""}
                        onChange={(event) => updateScoringSkema(event.target.value)}
                        className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-600 font-bold text-gray-700 cursor-pointer"
                      >
                        <option value="">Tanpa Skema</option>
                        {currentSkemaList.map((skema) => (
                          <option key={skema.id_skema} value={skema.id_skema}>
                            {skema.nama_promo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <FormInput label="Nominal Closing" type="number" value={String(editingItem.nominal || 0)} onChange={(value) => updateEditingField("nominal", Number(value) || 0)} />

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Catatan / Noted
                      </label>
                      <input
                        type="text"
                        value={editingItem.noted || ""}
                        onChange={(event) => updateEditingField("noted", event.target.value)}
                        className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 border rounded-xl font-bold text-gray-500 hover:bg-gray-50 text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-extrabold text-xs rounded-xl shadow-sm cursor-pointer ${
                    modalMode === "profil"
                      ? "bg-[#C92C1E] hover:bg-[#A82216]"
                      : "bg-emerald-700 hover:bg-emerald-800"
                  }`}
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E] font-bold"
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  options,
  onChange,
  getLabel,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  getLabel?: (value: string) => string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E] font-bold text-gray-700 cursor-pointer"
      >
        {options.map((option) => (
          <option key={option || "empty-option"} value={option}>
            {getLabel ? getLabel(option) : option}
          </option>
        ))}
      </select>
    </div>
  );
}