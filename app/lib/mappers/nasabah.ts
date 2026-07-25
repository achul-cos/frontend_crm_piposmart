import type { Lead } from "@/app/lib/api/leads";
import type { Outlet } from "@/app/lib/api/owners";
import type { NasabahItem } from "@/app/lib/view-models/nasabah";

/**
 * Anti-corruption layer: menyusun view model `NasabahItem` dari response
 * backend yang ternormalisasi.
 *
 * Alasan lapisan ini ada: UI existing dibangun di atas satu baris gepeng,
 * sedangkan backend memisahkan owner, outlet, lead, assignment, interaksi,
 * training, closing, dan subscription. Menaruh penyesuaian itu di sini
 * membuat halaman tidak perlu tahu bentuk asli API, dan saat halaman
 * dirapikan nanti (FE-02 dan seterusnya) hanya berkas ini yang menyusut.
 */

/**
 * Field yang BELUM punya sumber data di backend pada Sprint FE-01.
 *
 * Semuanya butuh agregasi lintas endpoint (interaksi, closing, wallet) yang
 * baru akan disambungkan di FE-03/FE-04. Sampai saat itu nilainya dibiarkan
 * kosong dan UI menampilkan "—".
 *
 * Aturan yang dipegang: JANGAN mengisi angka karangan hanya supaya tabel
 * terlihat penuh. Kolom kosong yang jujur lebih baik daripada angka yang
 * salah dan diambil sebagai keputusan bisnis.
 */
export const UNAVAILABLE_FIELDS = [
  "totalFu",
  "totalTransaksi",
  "callStatus",
  "chatStatus",
  "nominal",
  "expiredDate",
  "createDateProject",
  "finalisasiClosing",
] as const;

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

function toDateOnly(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

/**
 * Terjemahan `stage` lead backend ke label `statusAkun` yang dipakai UI.
 * Nilai stage backend: NEW, POSSIBLE, POTENTIAL, CLOSING, INVALID
 * (`internal/lead/types.go` dan `internal/activity/types.go`).
 */
export function stageToStatusAkun(stage: string): string {
  switch (stage) {
    case "NEW":
      return "Baru";
    case "POSSIBLE":
      return "Kemungkinan Potensial";
    case "POTENTIAL":
      return "Potensial";
    case "CLOSING":
      return "Berlangganan";
    case "INVALID":
      return "Tidak Potensial";
    default:
      return stage || "—";
  }
}

/** Skor remark 0-3 dipetakan ke label yang sama dengan `LIST_SKOR` di UI. */
export function scoreToRemarkLabel(score?: number | null): string {
  switch (score) {
    case 0:
      return "Tidak Potensial (0)";
    case 1:
      return "Kemungkinan Potensial (1)";
    case 2:
      return "Potensial (2)";
    case 3:
      return "Langganan (3)";
    default:
      return "";
  }
}

/**
 * Susun satu baris tabel dari sebuah lead.
 *
 * @param lead     Response `/leads`.
 * @param index    Nomor urut tampilan (mengikuti halaman aktif).
 * @param outlet   Outlet terkait bila sudah dimuat; opsional karena `/leads`
 *                 hanya membawa `outlet_id`, bukan detail outletnya.
 */
export function toNasabahItem(
  lead: Lead,
  index: number,
  outlet?: Outlet,
): NasabahItem {
  const followUpDate = toDateOnly(lead.next_follow_up_at);
  const assignedDate = toDateOnly(lead.created_at);
  const createdAt = new Date(lead.created_at);

  return {
    // --- Identitas owner (dari lead.owner) ---
    no: index,
    kodeBaris: lead.code,
    kodeOwner: lead.owner.code ?? "",
    namaOwner: lead.owner.name ?? "",
    projectBrand: lead.owner.brand_name ?? "",
    noHpOwner: lead.owner.phone ?? "",

    // --- Outlet (butuh pemanggilan terpisah; kosong bila belum dimuat) ---
    outlet: outlet?.name ?? "",
    noHpOutlet: outlet?.phone ?? "",

    // --- Kepemilikan / assignment ---
    pic: lead.active_sales?.name ?? "",
    tanggalDibagikan: assignedDate,

    // --- Stage & skor ---
    statusAkun: stageToStatusAkun(lead.stage),
    validitas: lead.status === "INVALID" ? "Invalid" : "Valid",
    scor: lead.current_score ?? 0,
    remarks: scoreToRemarkLabel(lead.current_score),

    // --- Follow-up ---
    tanggalFu: followUpDate,
    tahun: String(createdAt.getFullYear()),
    bulan: LIST_BULAN[createdAt.getMonth()] ?? "",

    // --- Sumber ---
    sumberNasabah: lead.source_type ?? "",
    noted: lead.source_reference ?? "",

    // --- Belum tersedia di backend pada sprint ini (lihat UNAVAILABLE_FIELDS) ---
    totalFu: 0,
    totalTransaksi: 0,
    callStatus: "",
    chatStatus: "",
    nominal: 0,
    expiredDate: "",
    createDateProject: "",
    finalisasiClosing: "",

    // --- Identitas asli untuk pemanggilan endpoint lanjutan ---
    leadId: lead.id,
    ownerId: lead.owner.id,
    outletId: lead.outlet_id,

    unavailableFields: [...UNAVAILABLE_FIELDS],
  };
}

export function toNasabahItems(
  leads: Lead[],
  offset = 0,
): NasabahItem[] {
  return leads.map((lead, i) => toNasabahItem(lead, offset + i + 1));
}

/** Tampilkan nilai, atau "—" bila field-nya memang belum ada sumbernya. */
export function displayValue(
  item: NasabahItem,
  field: keyof NasabahItem,
): string {
  if (item.unavailableFields?.includes(field as string)) {
    return "—";
  }

  const value = item[field];

  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}
