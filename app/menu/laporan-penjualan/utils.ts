import { SalesTransaction } from "./types";
import { generateDummyOwners } from "../lead/dummy/page";
import { INITIAL_MASTER_PROMOS, INITIAL_PAKETS } from "@/app/lib/paket-langganan-data";

export const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export const differenceInDays = (endDate: string | Date, startDate: string | Date = new Date()) => {
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getSubscriptionStatus = (waktuMulai: string | Date, waktuBerakhir: string | Date): "New" | "Berlangganan" | "Jatuh Tempo" | "Expired" => {
  const today = new Date();
  
  // Hitung sisa hari
  const sisaHari = differenceInDays(waktuBerakhir, today);
  
  // Jika kurang dari 0, berarti sudah expired
  if (sisaHari < 0) return "Expired";
  
  // Jika sisa hari <= 30, masuk kategori Jatuh Tempo (Menimpa status New untuk tenor 1 bulan)
  if (sisaHari <= 30) return "Jatuh Tempo";
  
  // Jika hari ini masih dalam rentang 30 hari sejak waktu mulai, masuk kategori New
  const hariSejakMulai = differenceInDays(today, waktuMulai);
  if (hariSejakMulai <= 30 && hariSejakMulai >= 0) return "New";
  
  // Sisanya adalah Berlangganan normal
  return "Berlangganan";
};

export const generateDummyTransactions = (): SalesTransaction[] => {
  const dummyCustomers = generateDummyOwners(1000);
  const transactions: SalesTransaction[] = [];

  dummyCustomers.forEach((cust: any, i: number) => {

    // Cycle through all promos sequentially to ensure bundling is included
    const promoIndex = i % INITIAL_MASTER_PROMOS.length;
    const promo = INITIAL_MASTER_PROMOS[promoIndex];
    const paket = INITIAL_PAKETS.find(p => p.id === promo.paketId) || INITIAL_PAKETS[0];

    // Generate dates specific to the 4 status conditions (Threshold = 30 Hari)
    const today = new Date();
    const closingDate = new Date(today);
    const endDate = new Date(today);
    
    const condition = i % 4;
    // Hindari tenor 1 bulan jatuh ke "New" di dummy data (karena akan langsung disedot jadi Jatuh Tempo)
    // Jika paket 1 bulan (tenor+bonus = 1), kita atur endDate minimal 2 bulan agar status New / Berlangganan bisa muncul untuk test
    let totalBulan = promo.tenor + promo.bonus;
    
    if (condition === 0) {
      // New: Mulai <= 30 hari yang lalu. Berakhir > 30 hari ke depan
      if (totalBulan < 2) totalBulan = 2; // Paksa tenor jadi 2 bulan agar sisa hari > 30
      closingDate.setDate(today.getDate() - (i % 25)); // 0-24 hari lalu
      endDate.setTime(closingDate.getTime());
      endDate.setMonth(endDate.getMonth() + totalBulan);
    } else if (condition === 1) {
      // Jatuh Tempo: Berakhir <= 30 hari ke depan (0-29 hari ke depan)
      endDate.setDate(today.getDate() + (i % 30));
      closingDate.setTime(endDate.getTime());
      closingDate.setMonth(closingDate.getMonth() - totalBulan);
    } else if (condition === 2) {
      // Expired: Berakhir = masa lalu
      endDate.setDate(today.getDate() - ((i % 30) + 1));
      closingDate.setTime(endDate.getTime());
      closingDate.setMonth(closingDate.getMonth() - totalBulan);
    } else {
      // Berlangganan: Aman (Mulai > 30 hari yang lalu, Berakhir > 30 hari ke depan)
      if (totalBulan < 3) totalBulan = 3;
      closingDate.setDate(today.getDate() - 35 - (i % 30)); // 35+ hari yang lalu
      endDate.setTime(closingDate.getTime());
      endDate.setMonth(endDate.getMonth() + totalBulan);
      
      if (endDate.getTime() - today.getTime() <= 30 * 24 * 60 * 60 * 1000) {
        endDate.setDate(today.getDate() + 60);
      }
    }

    const closingStr = closingDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    
    // Gunakan fungsi dinamis
    const status = getSubscriptionStatus(closingStr, endStr);

    const salesPics = [
      "Lidya (Sales)",
      "Rangga (Sales)",
      "Maya (Sales)",
      "Arabella (Sales)",
    ];
    const pic = salesPics[i % salesPics.length];

    transactions.push({
      id: `TRX-${10000 + i}`,
      kodeOwner: cust.kodeOwner,
      customerName: cust.namaOwner,
      pic: pic,
      tanggalClosing: closingStr,
      paket: promo.namaPromo,
      waktuMulai: closingStr,
      waktuBerakhir: endStr,
      hargaAktual: promo.hargaPromo,
      statusBerlangganan: status,
      snapshot: {
        paketId: paket.id,
        namaPaket: paket.namaPaket,
        hargaPaketBulanan: paket.hargaPerBulan,
        promoId: promo.id,
        namaPromo: promo.namaPromo,
        tenor: promo.tenor,
        bonus: promo.bonus,
        hargaNormal: promo.hargaNormal,
        diskonPromo: promo.diskon,
        hargaPromo: promo.hargaPromo,
        jenisPromo: promo.jenisPromo,
        bundlingItems: promo.bundlingItems || [],
        potonganTambahan: 0,
        kodeUnik: 123 + i,
      }
    });
  });
  
  return transactions;
};

// --- Date Filter Utilities ---

const formatDateStr = (date: Date) => {
  return date.toISOString().split("T")[0];
};

export const getPresetDateRange = (preset: string): [string, string] => {
  const today = new Date();
  let dari = new Date(today);
  let sampai = new Date(today);

  switch (preset) {
    case "Hari Ini":
      break; // both are today
    case "Kemarin":
      dari.setDate(today.getDate() - 1);
      sampai.setDate(today.getDate() - 1);
      break;
    case "7 Hari Terakhir":
      dari.setDate(today.getDate() - 6);
      break;
    case "30 Hari Terakhir":
      dari.setDate(today.getDate() - 29);
      break;
    case "Bulan Ini":
      dari = new Date(today.getFullYear(), today.getMonth(), 1);
      sampai = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case "Bulan Lalu":
      dari = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      sampai = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case "Bulan Depan":
      dari = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      sampai = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      break;
    case "Tahun Ini":
      dari = new Date(today.getFullYear(), 0, 1);
      sampai = new Date(today.getFullYear(), 11, 31);
      break;
    case "Semua":
    case "Custom":
    default:
      return ["", ""];
  }

  // Adjust for local timezone offsets to avoid crossing midnight UTC incorrectly
  const tzOffsetDari = dari.getTimezoneOffset() * 60000;
  const localDari = new Date(dari.getTime() - tzOffsetDari);
  const tzOffsetSampai = sampai.getTimezoneOffset() * 60000;
  const localSampai = new Date(sampai.getTime() - tzOffsetSampai);

  return [localDari.toISOString().split("T")[0], localSampai.toISOString().split("T")[0]];
};
