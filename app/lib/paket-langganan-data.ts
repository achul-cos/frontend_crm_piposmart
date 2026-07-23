// ============================================================
// PAKET LANGGANAN DATA LAYER — Single Source of Truth
// Digunakan oleh: Halaman Paket Langganan & Remark 3 (Closing)
// ============================================================

// --- Tipe Data ---

export type PaketStatus = "aktif" | "nonaktif";
export type KategoriNasabah = "baru" | "existing" | "all";
export type JenisPromo = "reguler" | "bundling";
export type PromoStatus = "aktif" | "nonaktif" | "draft";

export interface MasterPaket {
  id: string;
  namaPaket: string;
  hargaPerBulan: number;
  status: PaketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MasterPromo {
  id: string;
  namaPromo: string;
  paketId: string; // relasi ke MasterPaket.id
  kategoriNasabah: KategoriNasabah;
  jenisPromo: JenisPromo;
  tenor: number;
  bonus: number;
  hargaNormal: number; // auto: hargaPerBulan × tenor
  diskon: number;
  hargaPromo: number; // auto: hargaNormal − diskon
  bundlingItems: string[]; // hanya untuk jenisPromo === 'bundling'
  status: PromoStatus;
  createdAt: string;
  updatedAt: string;
}

// --- Master Alat (Peralatan Bundling) ---

export const MASTER_ALAT: string[] = [
  "Printer Thermal",
  "POS Android Thermal",
  "20 Roll Kertas Struk",
  "Cash Drawer",
  "Barcode Scanner",
  "Customer Display",
  "Mini PC",
  "Scanner Wireless",
];

// --- Opsi Tenor ---

export const TENOR_OPTIONS_PL = [1, 3, 6, 9, 12, 18, 24];

// --- Label Maps ---

export const PAKET_STATUS_LABELS: Record<PaketStatus, string> = {
  aktif: "Aktif",
  nonaktif: "Nonaktif",
};

export const KATEGORI_LABELS: Record<KategoriNasabah, string> = {
  baru: "Baru",
  existing: "Existing",
  all: "New & Existing",
};

export const JENIS_LABELS: Record<JenisPromo, string> = {
  reguler: "Reguler",
  bundling: "Bundling",
};

export const PROMO_STATUS_LABELS: Record<PromoStatus, string> = {
  aktif: "Aktif",
  nonaktif: "Nonaktif",
  draft: "Draft",
};

// --- Helper Functions ---

export function generatePaketId(): string {
  return `PKT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function generatePromoIdPL(): string {
  return `PRM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function formatRupiahPL(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function calcHargaNormal(hargaPerBulan: number, tenor: number): number {
  return hargaPerBulan * tenor;
}

export function calcHargaPromo(hargaNormal: number, diskon: number): number {
  return Math.max(hargaNormal - diskon, 0);
}

/** Cari paket berdasarkan id */
export function findPaketById(
  pakets: MasterPaket[],
  id: string
): MasterPaket | undefined {
  return pakets.find((p) => p.id === id);
}

/** Ambil paket yang berstatus aktif */
export function getAktifPakets(pakets: MasterPaket[]): MasterPaket[] {
  return pakets.filter((p) => p.status === "aktif");
}

// --- Dummy Data ---

const today = new Date().toISOString().split("T")[0];

export const INITIAL_PAKETS: MasterPaket[] = [
  {
    id: "PKT-PRO",
    namaPaket: "Pro",
    hargaPerBulan: 168_000,
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PKT-BUSINESS",
    namaPaket: "Business",
    hargaPerBulan: 118_000,
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PKT-BASIC",
    namaPaket: "Basic",
    hargaPerBulan: 78_000,
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
];

export const INITIAL_MASTER_PROMOS: MasterPromo[] = [
  // ===================== PRO =====================
  {
    id: "PRM-PRO-1",
    namaPromo: "24 + 6 Bulan Pro",
    paketId: "PKT-PRO",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 24,
    bonus: 6,
    hargaNormal: 5040000,
    diskon: 1672000,
    hargaPromo: 3368000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-PRO-2",
    namaPromo: "18 + 4 Bulan Pro",
    paketId: "PKT-PRO",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 18,
    bonus: 4,
    hargaNormal: 3696000,
    diskon: 1008000,
    hargaPromo: 2688000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-PRO-3",
    namaPromo: "12 + 2 Bulan Pro",
    paketId: "PKT-PRO",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 12,
    bonus: 2,
    hargaNormal: 2352000,
    diskon: 664000,
    hargaPromo: 1688000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-PRO-4",
    namaPromo: "9 Bulan Pro",
    paketId: "PKT-PRO",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 9,
    bonus: 0,
    hargaNormal: 1512000,
    diskon: 144000,
    hargaPromo: 1368000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-PRO-5",
    namaPromo: "6 Bulan Pro",
    paketId: "PKT-PRO",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 6,
    bonus: 0,
    hargaNormal: 1008000,
    diskon: 0,
    hargaPromo: 1008000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-PRO-6",
    namaPromo: "1 Bulan Pro",
    paketId: "PKT-PRO",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 1,
    bonus: 0,
    hargaNormal: 168000,
    diskon: 0,
    hargaPromo: 168000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },

  // ===================== BUSINESS =====================
  {
    id: "PRM-BIZ-1",
    namaPromo: "24 + Free 4 Bulan Business",
    paketId: "PKT-BUSINESS",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 24,
    bonus: 4,
    hargaNormal: 3304000,
    diskon: 708000,
    hargaPromo: 2596000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-BIZ-2",
    namaPromo: "18 Bulan + Free 2 Bulan Business",
    paketId: "PKT-BUSINESS",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 18,
    bonus: 2,
    hargaNormal: 2360000,
    diskon: 362000,
    hargaPromo: 1998000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-BIZ-3",
    namaPromo: "12 Bulan + Free 1 Bulan Business",
    paketId: "PKT-BUSINESS",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 12,
    bonus: 1,
    hargaNormal: 1534000,
    diskon: 236000,
    hargaPromo: 1298000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-BIZ-4",
    namaPromo: "9 Bulan Business",
    paketId: "PKT-BUSINESS",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 9,
    bonus: 0,
    hargaNormal: 1062000,
    diskon: 64000,
    hargaPromo: 998000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-BIZ-5",
    namaPromo: "6 Bulan Business",
    paketId: "PKT-BUSINESS",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 6,
    bonus: 0,
    hargaNormal: 708000,
    diskon: 0,
    hargaPromo: 708000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-BIZ-6",
    namaPromo: "1 Bulan Business",
    paketId: "PKT-BUSINESS",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 1,
    bonus: 0,
    hargaNormal: 118000,
    diskon: 0,
    hargaPromo: 118000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },

  // ===================== BASIC =====================
  {
    id: "PRM-BSC-1",
    namaPromo: "24 + 3 Bulan Basic",
    paketId: "PKT-BASIC",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 24,
    bonus: 3,
    hargaNormal: 2106000,
    diskon: 390000,
    hargaPromo: 1716000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-BSC-2",
    namaPromo: "18 + 2 Bulan Basic",
    paketId: "PKT-BASIC",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 18,
    bonus: 2,
    hargaNormal: 1560000,
    diskon: 162000,
    hargaPromo: 1398000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-BSC-3",
    namaPromo: "12 Bulan Basic",
    paketId: "PKT-BASIC",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 12,
    bonus: 0,
    hargaNormal: 936000,
    diskon: 78000,
    hargaPromo: 858000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-BSC-4",
    namaPromo: "9 Bulan Basic",
    paketId: "PKT-BASIC",
    kategoriNasabah: "all",
    jenisPromo: "reguler",
    tenor: 9,
    bonus: 0,
    hargaNormal: 702000,
    diskon: 0,
    hargaPromo: 702000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-BSC-5",
    namaPromo: "1 Bulan Basic",
    paketId: "PKT-BASIC",
    kategoriNasabah: "existing",
    jenisPromo: "reguler",
    tenor: 1,
    bonus: 0,
    hargaNormal: 78000,
    diskon: 0,
    hargaPromo: 78000,
    bundlingItems: [],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },

  // ===================== BUNDLING =====================
  {
    id: "PRM-BND-1",
    namaPromo: "Paket Jagoan Pro",
    paketId: "PKT-PRO",
    kategoriNasabah: "all",
    jenisPromo: "bundling",
    tenor: 12,
    bonus: 2,
    hargaNormal: 2751000, // 2751000 is strange, Pro is 168000, 168k * 12 = 2016000, maybe they have custom hargaNormal? The user data says 2751000. Wait, calcHargaNormal will reset it if we edit the paket, but we use what user says here. I will just populate what user gave. Actually I need to match the type.
    diskon: 673000,
    hargaPromo: 2078000,
    bundlingItems: [
      "Printer Thermal",
    ],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-BND-2",
    namaPromo: "POS Bundle Pro",
    paketId: "PKT-PRO",
    kategoriNasabah: "all",
    jenisPromo: "bundling",
    tenor: 12,
    bonus: 2,
    hargaNormal: 6022000,
    diskon: 734000,
    hargaPromo: 5288000,
    bundlingItems: [
      "POS Android Thermal",
      "20 Roll Kertas Struk",
    ],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-BND-3",
    namaPromo: "Jagoan Business",
    paketId: "PKT-BUSINESS",
    kategoriNasabah: "all",
    jenisPromo: "bundling",
    tenor: 12,
    bonus: 1,
    hargaNormal: 1933000,
    diskon: 335000,
    hargaPromo: 1598000,
    bundlingItems: [
      "Printer Thermal",
    ],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  },
  {
    id: "PRM-BND-4",
    namaPromo: "POS Bundle Business",
    paketId: "PKT-BUSINESS",
    kategoriNasabah: "all",
    jenisPromo: "bundling",
    tenor: 12,
    bonus: 1,
    hargaNormal: 5204000,
    diskon: 406000,
    hargaPromo: 4798000,
    bundlingItems: [
      "POS Android Thermal",
      "20 Roll Kertas Struk",
    ],
    status: "aktif",
    createdAt: today,
    updatedAt: today,
  }
];
