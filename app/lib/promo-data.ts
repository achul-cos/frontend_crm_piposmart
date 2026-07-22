// ============================================================
// PROMO DATA LAYER — Single Source of Truth
// Digunakan oleh: Master Promo page & Remark 3 (Closing)
// ============================================================

// --- Tipe Data ---

export type PaketType = "basic" | "business" | "pro" | "starter-pro" | "pos-bundle-pro" | "pos-bundle-business";
export type KategoriNasabah = "new" | "existing" | "new-existing";
export type PromoStatus = "active" | "draft" | "expired";

export interface PromoItem {
  id: string;
  namaPromo: string;
  paket: PaketType;
  kategoriNasabah: KategoriNasabah;
  tenor: number;
  bonus: number;
  totalMasaAktif: number;
  hargaNormal: number;
  diskon: number;
  hargaPromo: number;
  status: PromoStatus;
  periodeStart: string;
  periodeEnd: string;
  jumlahClosing: number;
  totalRevenue: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// --- Harga Paket Per Bulan (single source of truth) ---

export const PACKAGE_PRICES: Record<PaketType, { label: string; pricePerMonth: number }> = {
  basic: { label: "Basic", pricePerMonth: 78_000 },
  business: { label: "Business", pricePerMonth: 118_000 },
  pro: { label: "Pro", pricePerMonth: 168_000 },
  "starter-pro": { label: "Starter Pro (JAGOAN PRO)", pricePerMonth: 229_250 },
  "pos-bundle-pro": { label: "POS Bundle Pro", pricePerMonth: 501_833 },
  "pos-bundle-business": { label: "POS Bundle Business", pricePerMonth: 433_666 }
};

// --- Label Maps ---

export const PAKET_LABELS: Record<PaketType, string> = {
  basic: "Basic",
  business: "Business",
  pro: "Pro",
  "starter-pro": "Starter Pro (JAGOAN PRO)",
  "pos-bundle-pro": "POS Bundle Pro",
  "pos-bundle-business": "POS Bundle Business",
};

export const KATEGORI_LABELS: Record<KategoriNasabah, string> = {
  new: "New",
  existing: "Existing",
  "new-existing": "New & Existing",
};

export const STATUS_LABELS: Record<PromoStatus, string> = {
  active: "Active",
  draft: "Draft",
  expired: "Expired",
};

// --- Opsi untuk form select ---

export const PAKET_OPTIONS: { value: PaketType; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "business", label: "Business" },
  { value: "pro", label: "Pro" },
  { value: "starter-pro", label: "Starter Pro (JAGOAN PRO)" },
  { value: "pos-bundle-pro", label: "POS Bundle Pro" },
  { value: "pos-bundle-business", label: "POS Bundle Business" },
];

export const KATEGORI_OPTIONS: { value: KategoriNasabah; label: string }[] = [
  { value: "new", label: "New" },
  { value: "existing", label: "Existing" },
  { value: "new-existing", label: "New & Existing" },
];

export const STATUS_OPTIONS: { value: PromoStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "expired", label: "Expired" },
];

export const TENOR_OPTIONS = [
  { value: 1, label: "1 bulan" },
  { value: 3, label: "3 bulan" },
  { value: 6, label: "6 bulan" },
  { value: 9, label: "9 bulan" },
  { value: 12, label: "12 bulan" },
  { value: 18, label: "18 bulan" },
  { value: 24, label: "24 bulan" },
];

// --- Helper Functions ---

export function calculateHargaNormal(paket: PaketType, tenor: number): number {
  return (PACKAGE_PRICES[paket]?.pricePerMonth ?? 0) * tenor;
}

export function calculateHargaPromo(hargaNormal: number, diskon: number): number {
  return Math.max(hargaNormal - diskon, 0);
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatCompactRupiah(value: number): string {
  if (!value) return "Rp0";

  if (value >= 1_000_000_000) {
    return `Rp${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  }

  if (value >= 1_000_000) {
    return `Rp${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} Jt`;
  }

  return formatRupiah(value);
}

export function formatDateID(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}

export function formatDateTimeID(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function generatePromoId(): string {
  return `promo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Ambil semua promo yang berstatus Active (untuk Remark 3) */
export function getActivePromos(promos: PromoItem[]): PromoItem[] {
  return promos.filter((p) => p.status === "active");
}

/** Hitung total masa aktif = tenor + bonus */
export function calculateTotalMasaAktif(tenor: number, bonus: number): number {
  return tenor + bonus;
}

// --- Dummy Data ---

const today = new Date();
const formatISO = (d: Date) => d.toISOString().split("T")[0];

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

export const INITIAL_PROMOS: PromoItem[] = [
  { id: "PRO-01", namaPromo: "1 Bulan", paket: "pro", kategoriNasabah: "new-existing", tenor: 1, bonus: 0, totalMasaAktif: 1, hargaNormal: 168000, diskon: 0, hargaPromo: 168000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "PRO-06", namaPromo: "6 Bulan", paket: "pro", kategoriNasabah: "new-existing", tenor: 6, bonus: 0, totalMasaAktif: 6, hargaNormal: 1008000, diskon: 0, hargaPromo: 1008000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "PRO-09", namaPromo: "9 Bulan", paket: "pro", kategoriNasabah: "new-existing", tenor: 9, bonus: 0, totalMasaAktif: 9, hargaNormal: 1512000, diskon: 144000, hargaPromo: 1368000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "PRO-12", namaPromo: "12 + 2 Bulan", paket: "pro", kategoriNasabah: "new-existing", tenor: 12, bonus: 2, totalMasaAktif: 14, hargaNormal: 2352000, diskon: 664000, hargaPromo: 1688000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "PRO-18", namaPromo: "18 + 4 Bulan", paket: "pro", kategoriNasabah: "new-existing", tenor: 18, bonus: 4, totalMasaAktif: 22, hargaNormal: 3696000, diskon: 1008000, hargaPromo: 2688000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "PRO-24", namaPromo: "24 + 6 Bulan", paket: "pro", kategoriNasabah: "new-existing", tenor: 24, bonus: 6, totalMasaAktif: 30, hargaNormal: 5040000, diskon: 1672000, hargaPromo: 3368000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  
  { id: "BUS-01", namaPromo: "1 Bulan", paket: "business", kategoriNasabah: "new-existing", tenor: 1, bonus: 0, totalMasaAktif: 1, hargaNormal: 118000, diskon: 0, hargaPromo: 118000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "BUS-06", namaPromo: "6 Bulan", paket: "business", kategoriNasabah: "new-existing", tenor: 6, bonus: 0, totalMasaAktif: 6, hargaNormal: 708000, diskon: 0, hargaPromo: 708000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "BUS-09", namaPromo: "9 Bulan", paket: "business", kategoriNasabah: "new-existing", tenor: 9, bonus: 0, totalMasaAktif: 9, hargaNormal: 1062000, diskon: 64000, hargaPromo: 998000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "BUS-12", namaPromo: "12 + 1 Bulan", paket: "business", kategoriNasabah: "new-existing", tenor: 12, bonus: 1, totalMasaAktif: 13, hargaNormal: 1534000, diskon: 236000, hargaPromo: 1298000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "BUS-18", namaPromo: "18 + 2 Bulan", paket: "business", kategoriNasabah: "new-existing", tenor: 18, bonus: 2, totalMasaAktif: 20, hargaNormal: 2360000, diskon: 362000, hargaPromo: 1998000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "BUS-24", namaPromo: "24 + 4 Bulan", paket: "business", kategoriNasabah: "new-existing", tenor: 24, bonus: 4, totalMasaAktif: 28, hargaNormal: 3304000, diskon: 708000, hargaPromo: 2596000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },

  { id: "BAS-01", namaPromo: "1 Bulan", paket: "basic", kategoriNasabah: "existing", tenor: 1, bonus: 0, totalMasaAktif: 1, hargaNormal: 78000, diskon: 0, hargaPromo: 78000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "BAS-09", namaPromo: "9 Bulan", paket: "basic", kategoriNasabah: "new-existing", tenor: 9, bonus: 0, totalMasaAktif: 9, hargaNormal: 702000, diskon: 0, hargaPromo: 702000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "BAS-12", namaPromo: "12 Bulan", paket: "basic", kategoriNasabah: "new-existing", tenor: 12, bonus: 0, totalMasaAktif: 12, hargaNormal: 936000, diskon: 78000, hargaPromo: 858000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "BAS-18", namaPromo: "18 + 2 Bulan", paket: "basic", kategoriNasabah: "new-existing", tenor: 18, bonus: 2, totalMasaAktif: 20, hargaNormal: 1560000, diskon: 162000, hargaPromo: 1398000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "BAS-24", namaPromo: "24 + 3 Bulan", paket: "basic", kategoriNasabah: "new-existing", tenor: 24, bonus: 3, totalMasaAktif: 27, hargaNormal: 2106000, diskon: 390000, hargaPromo: 1716000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },

  { id: "STP-12", namaPromo: "Paket Starter", paket: "starter-pro", kategoriNasabah: "new-existing", tenor: 12, bonus: 2, totalMasaAktif: 14, hargaNormal: 2751000, diskon: 673000, hargaPromo: 2078000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "POSP-12", namaPromo: "POS Bundle", paket: "pos-bundle-pro", kategoriNasabah: "new-existing", tenor: 12, bonus: 2, totalMasaAktif: 14, hargaNormal: 6022000, diskon: 734000, hargaPromo: 5288000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  
  { id: "STB-12", namaPromo: "Jagoan Business", paket: "business", kategoriNasabah: "new-existing", tenor: 12, bonus: 1, totalMasaAktif: 13, hargaNormal: 1933000, diskon: 335000, hargaPromo: 1598000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) },
  { id: "POSB-12", namaPromo: "POS Bundle", paket: "pos-bundle-business", kategoriNasabah: "new-existing", tenor: 12, bonus: 1, totalMasaAktif: 13, hargaNormal: 5204000, diskon: 406000, hargaPromo: 4798000, status: "active", periodeStart: formatISO(subtractMonths(today, 1)), periodeEnd: formatISO(addMonths(today, 12)), jumlahClosing: 0, totalRevenue: 0, createdBy: "System", createdAt: formatISO(today), updatedAt: formatISO(today) }
];
