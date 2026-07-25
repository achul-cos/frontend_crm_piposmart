"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MitraFormModal, { MitraFormPayload } from "./form/page";
import MitraDetailModal from "./detail/page";

export type StatusPencairan = "Belum Dicairkan" | "Dicairkan Sebagian" | "Selesai Dicairkan";
export type MitraStatus = "Sudah 1 Tahun" | "Belum 1 Tahun" | "Aktif" | "Prospek" | "Nonaktif";

export type OwnerReferral = {
  id: number;
  kodeOwner: string;
  namaOwner: string;
  namaOutlet: string;
  jumlahOutlet: number;
  komisi: number;
  tanggal: string;
};

export type MitraItem = {
  id: number;
  namaMitra: string;
  kategoriMitra: string;
  paketLangganan: string;
  hargaBerlangganan: number;
  jenisKomisi: string;
  pic: string;
  noHp: string;
  status: MitraStatus;
  statusPencairan: StatusPencairan;
  tanggalKerjasama: string;
  tanggalPencairan1: string;
  tanggalPencairan2: string;
  kodeReferral: string;
  catatan: string;
  owners: OwnerReferral[];
};

const STORAGE_KEY = "piposmart_kelolaan_mitra_data";

const LIST_PIC = ["Satria", "Achul", "Wati", "Lidya", "Rangga", "Maya", "Arabella"];

const LIST_STATUS: MitraStatus[] = [
  "Sudah 1 Tahun",
  "Belum 1 Tahun",
  "Aktif",
  "Prospek",
  "Nonaktif",
];

const LIST_STATUS_PENCAIRAN: StatusPencairan[] = [
  "Belum Dicairkan",
  "Dicairkan Sebagian",
  "Selesai Dicairkan",
];

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatRupiah = (value: number) => {
  if (!value) return "Rp0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number) => {
  if (!value) return "-";

  return new Intl.NumberFormat("id-ID").format(value);
};

const formatTanggalPendek = (value: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
};

const getMitraTotalKomisi = (mitra: MitraItem) => {
  return mitra.owners.reduce((total, owner) => total + Number(owner.komisi || 0), 0);
};

const MASTER_JENIS_MITRA_KEY = "piposmart_master_jenis_mitra";

const cleanJenisKomisiLabel = (value: string) => {
  return String(value || "")
    .replace(/^Komisi\s+/i, "")
    .trim();
};

const normalizeJenisKomisiFilterValue = (value: string) => {
  return cleanJenisKomisiLabel(value).toLowerCase();
};

const getMasterJenisMitraOptions = () => {
  if (typeof window === "undefined") return [];

  const cached = localStorage.getItem(MASTER_JENIS_MITRA_KEY);
  if (!cached) return [];

  try {
    const parsed = JSON.parse(cached);

    if (!Array.isArray(parsed)) return [];

    const options = parsed
      .flatMap((item: any) => {
        if (item?.jenisMitra) return [cleanJenisKomisiLabel(item.jenisMitra)];

        const legacyOptions: string[] = [];

        if (Number(item?.komisiReferral || 0) > 0) legacyOptions.push("Referral");
        if (Number(item?.komisiPartnership || 0) > 0) legacyOptions.push("Partnership");
        if (Number(item?.komisiStrategic || 0) > 0) legacyOptions.push("Strategic");

        return legacyOptions;
      })
      .map((item: string) => item.trim())
      .filter(Boolean);

    return Array.from(new Set(options));
  } catch {
    return [];
  }
};

const sortJenisKomisiOptions = (items: string[]) => {
  const priority = ["Referral", "Referal", "Partnership", "Strategic"];

  return [...items].sort((first, second) => {
    const firstPriority = priority.findIndex(
      (item) => item.toLowerCase() === first.toLowerCase(),
    );
    const secondPriority = priority.findIndex(
      (item) => item.toLowerCase() === second.toLowerCase(),
    );

    const safeFirstPriority = firstPriority === -1 ? 999 : firstPriority;
    const safeSecondPriority = secondPriority === -1 ? 999 : secondPriority;

    if (safeFirstPriority !== safeSecondPriority) {
      return safeFirstPriority - safeSecondPriority;
    }

    return first.localeCompare(second);
  });
};

const getJenisKomisiLabel = (jenisKomisi: string) => {
  const cleanLabel = cleanJenisKomisiLabel(jenisKomisi);

  if (!cleanLabel) return "Referral";
  if (cleanLabel.toLowerCase() === "referal") return "Referal";

  return cleanLabel;
};

const getJenisKomisiClass = (jenisKomisi: string) => {
  const normalized = getJenisKomisiLabel(jenisKomisi).toLowerCase();

  if (normalized.includes("partner")) {
    return "border-red-100 bg-red-50 text-[#C92C1E]";
  }

  if (normalized.includes("strateg")) {
    return "border-violet-100 bg-violet-50 text-violet-700";
  }

  if (normalized.includes("refer")) {
    return "border-orange-100 bg-orange-50 text-orange-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
};

const getStatusPencairanClass = (status: StatusPencairan) => {
  if (status === "Selesai Dicairkan") return "bg-green-50 text-green-700 border-green-100";
  if (status === "Dicairkan Sebagian") return "bg-yellow-50 text-yellow-700 border-yellow-100";

  return "bg-red-50 text-red-700 border-red-100";
};

const defaultMitraData: MitraItem[] = [
  {
    id: 1,
    namaMitra: "Detergent Laundry",
    kategoriMitra: "FRANCHISE (Jual Brand Usaha)",
    paketLangganan: "Business (12 Bulan)",
    hargaBerlangganan: 1298000,
    jenisKomisi: "Komisi Partnership",
    pic: "Lidya",
    noHp: "6281252347769",
    status: "Sudah 1 Tahun",
    statusPencairan: "Selesai Dicairkan",
    tanggalKerjasama: getTodayDate(),
    tanggalPencairan1: getTodayDate(),
    tanggalPencairan2: "",
    kodeReferral: "MITRA-DTG001",
    catatan: "Mitra paket usaha laundry dan konsultasi bisnis laundry.",
    owners: [
      {
        id: 1,
        kodeOwner: "#45",
        namaOwner: "Nur Khaerunisah",
        namaOutlet: "Kedai Laundry",
        jumlahOutlet: 1,
        komisi: 210000,
        tanggal: getTodayDate(),
      },
    ],
  },
];

const normalizeMitraData = (items: unknown): MitraItem[] => {
  if (!Array.isArray(items)) return defaultMitraData;

  return items.map((item: any) => ({
    id: Number(item.id || Date.now()),
    namaMitra: item.namaMitra || "-",
    kategoriMitra: item.kategoriMitra || "REFERAL (Berlangganan)",
    paketLangganan: item.paketLangganan || "Business (12 Bulan)",
    hargaBerlangganan: Number(item.hargaBerlangganan || 0),
    jenisKomisi: item.jenisKomisi || "Komisi Referral",
    pic: item.pic || "-",
    noHp: item.noHp || "",
    status: item.status || "Sudah 1 Tahun",
    statusPencairan: item.statusPencairan || "Belum Dicairkan",
    tanggalKerjasama: item.tanggalKerjasama || "",
    tanggalPencairan1: item.tanggalPencairan1 || "",
    tanggalPencairan2: item.tanggalPencairan2 || "",
    kodeReferral: item.kodeReferral || "",
    catatan: item.catatan || "",
    owners: Array.isArray(item.owners)
      ? item.owners.map((owner: any, index: number) => ({
          id: Number(owner.id || Date.now() + index),
          kodeOwner: owner.kodeOwner || "-",
          namaOwner: owner.namaOwner || "-",
          namaOutlet: owner.namaOutlet || "-",
          jumlahOutlet: Number(owner.jumlahOutlet || 1),
          komisi: Number(owner.komisi || 0),
          tanggal: owner.tanggal || item.tanggalKerjasama || "",
        }))
      : [],
  }));
};

export default function KelolaanMitraPage() {
  const [mitraData, setMitraData] = useState<MitraItem[]>([]);
  const [selectedMitraId, setSelectedMitraId] = useState<number | null>(null);
  const [isMitraModalOpen, setIsMitraModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingMitraId, setEditingMitraId] = useState<number | null>(null);
  const [searchMitra, setSearchMitra] = useState("");
  const [picFilter, setPicFilter] = useState("Semua");
  const [statusPencairanFilter, setStatusPencairanFilter] = useState("Semua");
  const [jenisKomisiFilter, setJenisKomisiFilter] = useState("Semua");
  const [masterJenisMitraOptions, setMasterJenisMitraOptions] = useState<string[]>([]);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);

    if (cached) {
      try {
        const parsed = normalizeMitraData(JSON.parse(cached));
        setMitraData(parsed);
        setSelectedMitraId(parsed[0]?.id || null);
      } catch {
        setMitraData(defaultMitraData);
        setSelectedMitraId(defaultMitraData[0].id);
      }
    } else {
      setMitraData(defaultMitraData);
      setSelectedMitraId(defaultMitraData[0].id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultMitraData));
    }
  }, []);

  useEffect(() => {
    if (!isMitraModalOpen && !isDetailModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMitraModalOpen, isDetailModalOpen]);

  useEffect(() => {
    const syncMasterJenisMitra = () => {
      setMasterJenisMitraOptions(getMasterJenisMitraOptions());
    };

    syncMasterJenisMitra();

    window.addEventListener("focus", syncMasterJenisMitra);

    const interval = window.setInterval(syncMasterJenisMitra, 1000);

    return () => {
      window.removeEventListener("focus", syncMasterJenisMitra);
      window.clearInterval(interval);
    };
  }, []);

  const saveMitraData = (nextData: MitraItem[]) => {
    setMitraData(nextData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
  };

  const filteredMitra = useMemo(() => {
    const keyword = searchMitra.toLowerCase().trim();

    return mitraData.filter((item) => {
      const ownerText = item.owners
        .map((owner) => `${owner.kodeOwner} ${owner.namaOwner} ${owner.namaOutlet}`)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        keyword === "" ||
        item.namaMitra.toLowerCase().includes(keyword) ||
        item.kategoriMitra.toLowerCase().includes(keyword) ||
        item.paketLangganan.toLowerCase().includes(keyword) ||
        item.jenisKomisi.toLowerCase().includes(keyword) ||
        item.kodeReferral.toLowerCase().includes(keyword) ||
        ownerText.includes(keyword);

      const matchesPic = picFilter === "Semua" || item.pic === picFilter;
      const matchesPencairan =
        statusPencairanFilter === "Semua" || item.statusPencairan === statusPencairanFilter;
      const matchesJenisKomisi =
        jenisKomisiFilter === "Semua" ||
        normalizeJenisKomisiFilterValue(item.jenisKomisi) ===
          normalizeJenisKomisiFilterValue(jenisKomisiFilter);

      return matchesSearch && matchesPic && matchesPencairan && matchesJenisKomisi;
    });
  }, [mitraData, searchMitra, picFilter, statusPencairanFilter, jenisKomisiFilter]);

  const selectedMitra = useMemo(() => {
    return mitraData.find((item) => item.id === selectedMitraId) || null;
  }, [mitraData, selectedMitraId]);

  const editingMitra = useMemo(() => {
    return mitraData.find((item) => item.id === editingMitraId) || null;
  }, [mitraData, editingMitraId]);

  const editingMitraPayload = useMemo<MitraFormPayload | null>(() => {
    if (!editingMitra) return null;

    return {
      namaMitra: editingMitra.namaMitra,
      kategoriMitra: editingMitra.kategoriMitra,
      paketLangganan: editingMitra.paketLangganan,
      hargaBerlangganan: editingMitra.hargaBerlangganan,
      jenisKomisi: editingMitra.jenisKomisi as MitraFormPayload["jenisKomisi"],
      pic: editingMitra.pic,
      noHp: editingMitra.noHp,
      status: editingMitra.status,
      statusPencairan: editingMitra.statusPencairan,
      tanggalKerjasama: editingMitra.tanggalKerjasama,
      tanggalPencairan1: editingMitra.tanggalPencairan1,
      tanggalPencairan2: editingMitra.tanggalPencairan2,
      kodeReferral: editingMitra.kodeReferral,
      catatan: editingMitra.catatan,
      owners: editingMitra.owners.map((owner) => ({
        kodeOwner: owner.kodeOwner,
        namaOwner: owner.namaOwner,
        namaOutlet: owner.namaOutlet,
        jumlahOutlet: owner.jumlahOutlet,
        komisi: owner.komisi,
        tanggal: owner.tanggal,
      })),
    };
  }, [editingMitra]);

  const jenisKomisiOptions = useMemo(() => {
    const fromMitraData = mitraData.map((item) => getJenisKomisiLabel(item.jenisKomisi));
    const allOptions = [...masterJenisMitraOptions, ...fromMitraData]
      .map((item) => item.trim())
      .filter(Boolean);

    return sortJenisKomisiOptions(Array.from(new Set(allOptions)));
  }, [masterJenisMitraOptions, mitraData]);

  const totalMitra = mitraData.length;
  const totalOwnerReferral = mitraData.reduce((total, mitra) => total + mitra.owners.length, 0);
  const totalKomisi = mitraData.reduce((total, mitra) => total + getMitraTotalKomisi(mitra), 0);
  const totalSelesaiDicairkan = mitraData
    .filter((mitra) => mitra.statusPencairan === "Selesai Dicairkan")
    .reduce((total, mitra) => total + getMitraTotalKomisi(mitra), 0);


  const handleSaveMitra = (payload: MitraFormPayload) => {
    if (editingMitraId) {
      const nextData = mitraData.map((mitra) =>
        mitra.id === editingMitraId
          ? {
              ...mitra,
              namaMitra: payload.namaMitra,
              kategoriMitra: payload.kategoriMitra,
              paketLangganan: payload.paketLangganan,
              hargaBerlangganan: payload.hargaBerlangganan,
              jenisKomisi: payload.jenisKomisi,
              pic: payload.pic,
              noHp: payload.noHp,
              status: payload.status,
              statusPencairan: payload.statusPencairan,
              tanggalKerjasama: payload.tanggalKerjasama,
              tanggalPencairan1: payload.tanggalPencairan1,
              tanggalPencairan2: payload.tanggalPencairan2,
              kodeReferral: payload.kodeReferral || mitra.kodeReferral || `MITRA-${Date.now()}`,
              catatan: payload.catatan,
              owners: payload.owners.map((owner, index) => ({
                id: mitra.owners[index]?.id || Date.now() + index + 1,
                kodeOwner: owner.kodeOwner,
                namaOwner: owner.namaOwner,
                namaOutlet: owner.namaOutlet || "-",
                jumlahOutlet: owner.jumlahOutlet || 1,
                komisi: owner.komisi,
                tanggal: owner.tanggal || payload.tanggalKerjasama || getTodayDate(),
              })),
            }
          : mitra,
      );

      saveMitraData(nextData);
      setSelectedMitraId(editingMitraId);
      setEditingMitraId(null);
      setIsMitraModalOpen(false);
      return;
    }

    const nextMitra: MitraItem = {
      id: Date.now(),
      namaMitra: payload.namaMitra,
      kategoriMitra: payload.kategoriMitra,
      paketLangganan: payload.paketLangganan,
      hargaBerlangganan: payload.hargaBerlangganan,
      jenisKomisi: payload.jenisKomisi,
      pic: payload.pic,
      noHp: payload.noHp,
      status: payload.status,
      statusPencairan: payload.statusPencairan,
      tanggalKerjasama: payload.tanggalKerjasama,
      tanggalPencairan1: payload.tanggalPencairan1,
      tanggalPencairan2: payload.tanggalPencairan2,
      kodeReferral: payload.kodeReferral || `MITRA-${Date.now()}`,
      catatan: payload.catatan,
      owners: payload.owners.map((owner, index) => ({
        id: Date.now() + index + 1,
        kodeOwner: owner.kodeOwner,
        namaOwner: owner.namaOwner,
        namaOutlet: owner.namaOutlet || "-",
        jumlahOutlet: owner.jumlahOutlet || 1,
        komisi: owner.komisi,
        tanggal: owner.tanggal || payload.tanggalKerjasama || getTodayDate(),
      })),
    };

    const nextData = [nextMitra, ...mitraData];

    saveMitraData(nextData);
    setSelectedMitraId(nextMitra.id);
    setIsMitraModalOpen(false);
  };

  const handleEditMitra = (mitraId: number) => {
    setSelectedMitraId(mitraId);
    setEditingMitraId(mitraId);
    setIsDetailModalOpen(false);
    setIsMitraModalOpen(true);
  };

  const handleUpdateField = <K extends keyof MitraItem>(
    mitraId: number,
    key: K,
    value: MitraItem[K],
  ) => {
    const nextData = mitraData.map((mitra) =>
      mitra.id === mitraId ? { ...mitra, [key]: value } : mitra,
    );

    saveMitraData(nextData);
  };

  const handleDeleteMitra = (mitraId: number) => {
    const yakin = confirm("Yakin ingin menghapus mitra ini?");
    if (!yakin) return;

    const nextData = mitraData.filter((mitra) => mitra.id !== mitraId);

    saveMitraData(nextData);
    setSelectedMitraId(nextData[0]?.id || null);
    if (editingMitraId === mitraId) setEditingMitraId(null);
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-hidden font-sans text-[#1C1C1E]">
      <section className="overflow-hidden rounded-3xl border border-red-100 bg-white shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-[80px] bg-red-50" />

          <div className="relative z-10 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                Kelolaan Mitra
              </div>
              <h1 className="mt-4 break-words text-2xl font-black tracking-tight text-gray-950 md:text-3xl">
                Kelolaan Mitra Piposmart
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-gray-500">
                Kelola mitra berdasarkan paket, tabel komisi, PIC, status pencairan, dan owner yang berhasil direkomendasikan.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:shrink-0">
              <Link
                href="/menu/kelolaan-mitra/jenis-mitra"
                className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-center text-xs font-black text-[#C92C1E] transition hover:bg-red-100"
              >
                Jenis Mitra
              </Link>

              <button
                type="button"
                onClick={() => {
                  setEditingMitraId(null);
                  setIsMitraModalOpen(true);
                }}
                className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216]"
              >
                + Tambah Mitra
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Mitra</p>
          <p className="mt-3 text-3xl font-black text-gray-950">{totalMitra}</p>
          <p className="mt-1 text-xs font-medium text-gray-400">Jumlah mitra terdaftar</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Owner</p>
          <p className="mt-3 text-3xl font-black text-gray-950">{totalOwnerReferral}</p>
          <p className="mt-1 text-xs font-medium text-gray-400">Owner dari seluruh mitra</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Komisi</p>
          <p className="mt-3 text-2xl font-black text-gray-950">{formatRupiah(totalKomisi)}</p>
          <p className="mt-1 text-xs font-medium text-gray-400">Seluruh komisi tercatat</p>
        </div>

        <div className="rounded-3xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">Selesai Dicairkan</p>
          <p className="mt-3 text-2xl font-black text-[#C92C1E]">{formatRupiah(totalSelesaiDicairkan)}</p>
          <p className="mt-1 text-xs font-medium text-red-400">Total komisi selesai dicairkan</p>
        </div>
      </section>

      <section className="min-w-0 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-black text-gray-900">List Mitra</h2>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Filter jenis mitra otomatis mengikuti data dari Master Jenis Mitra.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-4 xl:w-[840px]">
            <input
              value={searchMitra}
              onChange={(event) => setSearchMitra(event.target.value)}
              placeholder="Cari mitra / owner / kode owner"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
            />

            <select
              value={picFilter}
              onChange={(event) => setPicFilter(event.target.value)}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
            >
              <option value="Semua">Semua PIC</option>
              {LIST_PIC.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select
              value={jenisKomisiFilter}
              onChange={(event) => setJenisKomisiFilter(event.target.value)}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
            >
              <option value="Semua">Semua Jenis Mitra</option>
              {jenisKomisiOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={statusPencairanFilter}
              onChange={(event) => setStatusPencairanFilter(event.target.value)}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
            >
              <option value="Semua">Semua Pencairan</option>
              {LIST_STATUS_PENCAIRAN.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 w-full max-w-full overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-[#C92C1E] text-white">
              <tr>
                <th className="w-56 p-3 font-black">Mitra</th>
                <th className="w-56 p-3 font-black">Paket & Komisi</th>
                <th className="w-48 p-3 font-black">Owner</th>
                <th className="w-28 p-3 font-black">PIC</th>
                <th className="w-48 p-3 font-black">Pencairan</th>
                <th className="w-36 p-3 text-right font-black">Total Komisi</th>
                <th className="w-24 p-3 text-center font-black">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredMitra.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs font-bold text-gray-400">
                    Data mitra tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredMitra.map((mitra) => {
                  const isSelected = selectedMitraId === mitra.id;
                  const firstOwner = mitra.owners[0];

                  return (
                    <tr
                      key={mitra.id}
                      onClick={() => {
                        setSelectedMitraId(mitra.id);
                        setIsDetailModalOpen(true);
                      }}
                      className={`cursor-pointer border-b border-gray-100 last:border-0 ${
                        isSelected ? "bg-red-50/60" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{mitra.namaMitra}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-gray-400">
                          {mitra.kategoriMitra}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-500">
                            {formatTanggalPendek(mitra.tanggalKerjasama)}
                          </span>
                          {mitra.kodeReferral && (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-[#C92C1E]">
                              {mitra.kodeReferral}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{mitra.paketLangganan}</p>
                        <p className="mt-1 text-[11px] font-bold text-gray-400">
                          {formatRupiah(mitra.hargaBerlangganan)}
                        </p>

                        <div className="mt-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black ${getJenisKomisiClass(
                              mitra.jenisKomisi,
                            )}`}
                          >
                            {getJenisKomisiLabel(mitra.jenisKomisi)}
                          </span>
                        </div>

                        <p className="mt-2 text-[11px] font-bold text-gray-400">
                          {mitra.owners.length > 0
                            ? `${formatRupiah(mitra.owners[0].komisi)} / owner`
                            : "Belum ada owner"}
                        </p>
                      </td>

                      <td className="p-3 align-top">
                        <p className="font-black text-gray-900">{mitra.owners.length} owner</p>
                        <p className="mt-1 text-[11px] font-bold leading-4 text-gray-500">
                          {mitra.owners.length > 1
                            ? `${firstOwner?.kodeOwner || "-"} • +${mitra.owners.length - 1} owner lain`
                            : `${firstOwner?.kodeOwner || "-"} • ${firstOwner?.namaOwner || "-"}`}
                        </p>
                        <p className="mt-1 line-clamp-1 text-[11px] font-bold text-gray-400">
                          {firstOwner?.namaOutlet || "-"}
                        </p>
                      </td>

                      <td className="p-3 align-top">
                        <select
                          value={mitra.pic}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleUpdateField(mitra.id, "pic", event.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs font-black text-gray-700 outline-none focus:border-[#C92C1E]"
                        >
                          {LIST_PIC.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3 align-top">
                        <div className="grid grid-cols-1 gap-2">
                          <input
                            type="date"
                            value={mitra.tanggalPencairan1}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              handleUpdateField(mitra.id, "tanggalPencairan1", event.target.value)
                            }
                            className="w-full rounded-xl border border-yellow-100 bg-[#FFF4CC] px-2 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                          />

                          <input
                            type="date"
                            value={mitra.tanggalPencairan2}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              handleUpdateField(mitra.id, "tanggalPencairan2", event.target.value)
                            }
                            className="w-full rounded-xl border border-orange-100 bg-[#F5E3CB] px-2 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                          />

                          <select
                            value={mitra.statusPencairan}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              handleUpdateField(
                                mitra.id,
                                "statusPencairan",
                                event.target.value as StatusPencairan,
                              )
                            }
                            className={`w-full rounded-xl border px-2 py-2 text-xs font-black outline-none focus:border-[#C92C1E] ${getStatusPencairanClass(mitra.statusPencairan)}`}
                          >
                            {LIST_STATUS_PENCAIRAN.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td className="p-3 text-right align-top">
                        <div className="ml-auto inline-flex min-w-[120px] justify-end rounded-2xl border border-red-100 bg-red-50 px-4 py-3 font-black text-[#C92C1E]">
                          {formatNumber(getMitraTotalKomisi(mitra))}
                        </div>
                      </td>

                      <td className="p-3 text-center align-top">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            title="Edit mitra"
                            aria-label="Edit mitra"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditMitra(mitra.id);
                            }}
                            className="text-gray-600 transition hover:scale-110 hover:text-[#C92C1E]"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.5 7.125L16.875 4.5"
                              />
                            </svg>
                          </button>

                          <button
                            type="button"
                            title="Hapus mitra"
                            aria-label="Hapus mitra"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteMitra(mitra.id);
                            }}
                            className="text-gray-500 transition hover:scale-110 hover:text-red-600"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
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
      </section>

      <MitraFormModal
        open={isMitraModalOpen}
        mode={editingMitraId ? "edit" : "create"}
        initialData={editingMitraPayload}
        listPic={LIST_PIC}
        listStatus={LIST_STATUS}
        listStatusPencairan={LIST_STATUS_PENCAIRAN}
        onClose={() => {
          setIsMitraModalOpen(false);
          setEditingMitraId(null);
        }}
        onSubmit={handleSaveMitra}
      />

      <MitraDetailModal
        open={isDetailModalOpen}
        mitra={selectedMitra}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}