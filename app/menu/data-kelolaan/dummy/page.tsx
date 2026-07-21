export const LIST_PIC = [
  "Invalid",
  "No PIC",
  "Wati (Supervisor)",
  "Satria (Developer)",
  "Achul (Developer)",
  "Lidya (Sales)",
  "Rangga (Sales)",
  "Maya (Sales)",
  "Arabella (Sales)",
];

export interface DummyNasabahItem {
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

const OWNER_FIRST_NAMES = [
  "Ayu",
  "Budi",
  "Citra",
  "Dewi",
  "Eka",
  "Fajar",
  "Gita",
  "Hendra",
  "Indah",
  "Joko",
  "Kartika",
  "Lina",
  "Mira",
  "Nadia",
  "Putri",
  "Rizky",
  "Sari",
  "Tono",
  "Vina",
  "Yusuf",
];

const OWNER_LAST_NAMES = [
  "Pratama",
  "Laundry",
  "Mandiri",
  "Bersih",
  "Sejahtera",
  "Utama",
  "Jaya",
  "Abadi",
  "Sukses",
  "Cemerlang",
  "Sentosa",
  "Makmur",
  "Lestari",
  "Harmoni",
  "Amanah",
  "Gemilang",
];

const BRAND_NAMES = [
  "Fresh Laundry",
  "Aroma Wash",
  "Clean Express",
  "Kilat Laundry",
  "Bersih Wangi",
  "Daily Wash",
  "Laundry Kita",
  "Rumah Laundry",
  "Happy Clean",
  "Sinar Laundry",
  "Cuci Cepat",
  "Putih Bersih",
  "Mama Laundry",
  "Laundry Point",
  "Wash House",
  "Bubble Wash",
];

const CITIES = [
  "Batam",
  "Jakarta",
  "Bandung",
  "Medan",
  "Surabaya",
  "Makassar",
  "Pekanbaru",
  "Padang",
  "Denpasar",
  "Yogyakarta",
  "Semarang",
  "Palembang",
  "Balikpapan",
  "Pontianak",
  "Manado",
  "Malang",
];

const SOURCES = ["Facebook", "Instagram", "Tiktok"];

const SOCIAL_SOURCE_DISTRIBUTION = [
  { label: "Facebook", total: 334 },
  { label: "Instagram", total: 333 },
  { label: "Tiktok", total: 333 },
];

const KEMITRAAN_SOURCE_DISTRIBUTION = [
  { label: "Non Mitra", total: 218 },
  { label: "Referal", total: 327 },
  { label: "Partnership", total: 109 },
  { label: "Regional", total: 346 },
];

const buildDistributedSocialSources = () => {
  return SOCIAL_SOURCE_DISTRIBUTION.flatMap((item) =>
    Array.from({ length: item.total }, () => item.label),
  );
};

const buildDistributedKemitraanSources = () => {
  return KEMITRAAN_SOURCE_DISTRIBUTION.flatMap((item) =>
    Array.from({ length: item.total }, () => item.label),
  );
};
const CALL_STATUSES = ["PENDING", "CONTACTED", "NO CALL"];
const CHAT_STATUSES = ["PENDING", "PROSPECT", "DELIVERED", "NO CHAT"];
const VALIDITIES = ["VALID", "INVALID"];
const PACKAGE_NAMES = ["", "Basic", "Business", "Pro", "Bundling & Alat"];

const PACKAGE_PRICE: Record<string, { skemaId: string; nominal: number }> = {
  "": { skemaId: "", nominal: 0 },
  Basic: { skemaId: "basic_12", nominal: 858000 },
  Business: { skemaId: "biz_12", nominal: 1298000 },
  Pro: { skemaId: "pro_12", nominal: 1688000 },
  "Bundling & Alat": { skemaId: "bund_pos_pro", nominal: 5288000 },
};

const pad = (value: number) => String(value).padStart(2, "0");

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  return `${year}-${month}-${day}`;
};

const addDaysToDate = (dateInput: string, totalDays: number) => {
  const date = new Date(`${dateInput}T00:00:00`);
  date.setDate(date.getDate() + totalDays);

  return toDateInput(date);
};

const getDateRange = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Array.from({ length: diffDays + 1 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return toDateInput(date);
  });
};

const CUSTOMER_DATE_DISTRIBUTION = [
  {
    startDate: "2026-01-01",
    endDate: "2026-03-01",
    total: 300,
  },
  {
    startDate: "2026-03-02",
    endDate: "2026-05-01",
    total: 300,
  },
  {
    startDate: "2026-05-02",
    endDate: "2026-07-15",
    total: 400,
  },
];

const buildDistributedCustomerDates = () => {
  return CUSTOMER_DATE_DISTRIBUTION.flatMap((range) => {
    const dates = getDateRange(range.startDate, range.endDate);

    return Array.from({ length: range.total }, (_, index) => dates[index % dates.length]);
  });
};

const makePhone = (index: number) => {
  const suffix = String(81200000000 + index).slice(0, 11);
  return `+62${suffix}`;
};

export const generateDummyCustomers = (total = 1000): DummyNasabahItem[] => {
  const distributedDates = buildDistributedCustomerDates();
  const distributedSocialSources = buildDistributedSocialSources();
  const distributedKemitraanSources = buildDistributedKemitraanSources();
  const totalData = Math.min(
    total,
    distributedDates.length,
    distributedSocialSources.length,
    distributedKemitraanSources.length,
  );

  return Array.from({ length: totalData }, (_, index) => {
    const no = index + 1;
    const tanggalCustomer = distributedDates[index];
    const tanggalCustomerDate = new Date(`${tanggalCustomer}T00:00:00`);
    const sumberSocial = distributedSocialSources[index] || "Facebook";
    const sumberKemitraan = distributedKemitraanSources[index] || "Non Mitra";
    const monthIndex = tanggalCustomerDate.getMonth();
    const score = index % 4;
    const finalisasiClosing = PACKAGE_NAMES[index % PACKAGE_NAMES.length];
    const packageInfo = PACKAGE_PRICE[finalisasiClosing];
    const brand = BRAND_NAMES[index % BRAND_NAMES.length];
    const city = CITIES[index % CITIES.length];
    const ownerName = `${OWNER_FIRST_NAMES[index % OWNER_FIRST_NAMES.length]} ${
      OWNER_LAST_NAMES[Math.floor(index / OWNER_FIRST_NAMES.length) % OWNER_LAST_NAMES.length]
    } ${no}`;

    return {
      totalFu: (index % 7) + 1,
      tanggalFu: tanggalCustomer,
      tahun: "2026",
      bulan: LIST_BULAN[monthIndex],
      no,
      pic: LIST_PIC[index % LIST_PIC.length],
      tanggalDibagikan: tanggalCustomer,
      statusAkun: sumberKemitraan,
      kodeBaris: String(10000 + no),
      kodeOwner: String(18000 + no),
      namaOwner: ownerName,
      projectBrand: `${brand} ${city}`,
      outlet: `${brand} ${city} Cabang ${(index % 5) + 1}`,
      noHpOwner: makePhone(index + 100),
      noHpOutlet: makePhone(index + 500),
      createDateProject: tanggalCustomer,
      expiredDate: addDaysToDate(tanggalCustomer, 14),
      totalTransaksi: index % 3 === 0 ? 0 : (index * 3) % 120,
      scor: score,
      callStatus: CALL_STATUSES[index % CALL_STATUSES.length],
      chatStatus: CHAT_STATUSES[index % CHAT_STATUSES.length],
      validitas: VALIDITIES[index % VALIDITIES.length],
      remarks: String(score),
      sumberNasabah: sumberSocial,
      finalisasiClosing,
      skemaId: packageInfo.skemaId,
      nominal: packageInfo.nominal,
      noted:
        index % 5 === 0
          ? "Butuh follow up ulang"
          : index % 5 === 1
            ? "Tertarik paket tahunan"
            : index % 5 === 2
              ? "Nomor aktif WhatsApp"
              : index % 5 === 3
                ? "Minta demo fitur"
                : "",
    };
  });
};


export const generateDummyOwners = generateDummyCustomers;