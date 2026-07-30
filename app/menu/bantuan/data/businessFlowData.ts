export interface BusinessStep {
  stepNumber: number;
  title: string;
  actor: string;
  description: string;
  input: string;
  output: string;
  iconBg: string;
}

export interface BusinessFramework {
  id: string;
  title: string;
  badge: string;
  description: string;
  steps: BusinessStep[];
}

export const BUSINESS_FLOW_DATA: BusinessFramework[] = [
  {
    id: "sales-pipeline",
    title: "1. Alur Prospection & Pipeline Penjualan (Lead → Closing)",
    badge: "Sales Core",
    description: "Kerangka alur kerja harian Sales dari penerimaan calon pelanggan (lead) hingga kesepakatan berlangganan paket CRM.",
    steps: [
      {
        stepNumber: 1,
        title: "Identifikasi & Entry Lead",
        actor: "Sales / Admin",
        description: "Mencatat data calon pelanggan (Nama Usaha, Owner, Kontak WhatsApp, Alamat Outlet) ke dalam menu Lead.",
        input: "Kontak & Profil Usaha Prospek",
        output: "Status Lead: PROSPECT",
        iconBg: "bg-blue-500",
      },
      {
        stepNumber: 2,
        title: "Pendekatan & Presentasi Produk",
        actor: "Sales Internal",
        description: "Melakukan janji temu, panggilan telepon (Call), atau pesan WhatsApp untuk melakukan demo aplikasi POS/CRM Piposmart.",
        input: "Jadwal Demo & Kebutuhan Outlet",
        output: "Log Interaksi: CONTACTED / QUALIFIED",
        iconBg: "bg-indigo-500",
      },
      {
        stepNumber: 3,
        title: "Pengiriman Penawaran & Trial",
        actor: "Sales",
        description: "Memberikan penawaran harga paket langganan (Paket Silver/Gold/Platinum) dan mengaktifkan akun trial gratis.",
        input: "Paket Langganan Dipilih",
        output: "Proposal & Akun Trial Aktif",
        iconBg: "bg-amber-500",
      },
      {
        stepNumber: 4,
        title: "Closing & Pembayaran Subskripsi",
        actor: "Sales / Owner Outlet",
        description: "Pelanggan melakukan pembayaran subskripsi. Status deal ditandai sebagai CLOSED WON dan invoice diterbitkan.",
        input: "Bukti Transfer / Konfirmasi Bayar",
        output: "Status Deal: CLOSED_WON & Komisi Terhitung",
        iconBg: "bg-green-500",
      },
    ],
  },
  {
    id: "partner-afiliasi",
    title: "2. Skema Kemitraan Sales & Lead Afiliasi (Partner Referrals)",
    badge: "Afiliasi Mitra",
    description: "Framework pengolahan mitra agen eksternal yang mereferensikan calon pelanggan dan pembagian komisi closing.",
    steps: [
      {
        stepNumber: 1,
        title: "Registrasi & Profiling Mitra Sales",
        actor: "Admin / Supervisor",
        description: "Mendaftarkan agen mitra eksternal ke dalam menu Mitra Sales beserta nomor kontak, rekening bank, dan tipe kemitraan.",
        input: "Data Identitas & Rekening Mitra",
        output: "Status Mitra: ACTIVE (Siap Berafiliasi)",
        iconBg: "bg-purple-500",
      },
      {
        stepNumber: 2,
        title: "Penugasan PIC Sales Internal",
        actor: "Supervisor / Admin",
        description: "Menugaskan satu akun Sales internal sebagai PIC penanggung jawab pembina Mitra Sales tersebut.",
        input: "Pilihan Akun Sales Penanggung Jawab",
        output: "Relasi PIC Sales ↔ Mitra Terhubung",
        iconBg: "bg-pink-500",
      },
      {
        stepNumber: 3,
        title: "Input Lead Afiliasi Mitra",
        actor: "Mitra Sales / Sales PIC",
        description: "Menambahkan data lead yang direferensikan oleh Mitra Sales melalui tombol '+ Lead Afiliasi' pada detail mitra.",
        input: "Data Referensi Customer dari Mitra",
        output: "Record Partner Referral Binding Created",
        iconBg: "bg-teal-500",
      },
      {
        stepNumber: 4,
        title: "Pencairan Komisi Referral",
        actor: "Sistem CRM / Admin Finance",
        description: "Ketika lead afiliasi melakukan closing transaksi, komisi referral dihitung secara otomatis dan dicatat di tab Komisi.",
        input: "Status Transaction: PAID",
        output: "Status Komisi: PAID & Disalurkan ke Mitra",
        iconBg: "bg-emerald-500",
      },
    ],
  },
  {
    id: "target-kpi",
    title: "3. Framework Target Sales & Ranking Performa KPI",
    badge: "Performa KPI",
    description: "Sistem penetapan dan evaluasi pencapaian target bulanan tim Sales untuk menentukan urutan peringkat kinerja.",
    steps: [
      {
        stepNumber: 1,
        title: "Penetapan Target Bulanan",
        actor: "Supervisor / Admin",
        description: "Menentukan target nominal omset atau jumlah closing unit untuk masing-masing Sales pada periode bulan aktif.",
        input: "Nominal Omset Target (contoh: Rp 50.000.000)",
        output: "Record Target Sales Terbuat",
        iconBg: "bg-rose-500",
      },
      {
        stepNumber: 2,
        title: "Tracking Omset Realtime",
        actor: "Sistem CRM",
        description: "Setiap transaksi closing yang didapatkan oleh Sales secara otomatis mengkalkulasi persentase pencapaian (% Achievement).",
        input: "Akumulasi Nominal Realisasi Closing",
        output: "% Achievement = (Realisasi / Target) * 100",
        iconBg: "bg-orange-500",
      },
      {
        stepNumber: 3,
        title: "Kalkulasi Rank & Gradasi KPI",
        actor: "Sistem CRM Engine",
        description: "Peringkat (Rank 1, Rank 2, ...) diurutkan secara dinamis berdasarkan pencapaian tertinggi persentase target KPI.",
        input: "Score % Achievement Seluruh Sales",
        output: "Papan Klasemen Ranking Sales Aktif",
        iconBg: "bg-yellow-500",
      },
    ],
  },
];
