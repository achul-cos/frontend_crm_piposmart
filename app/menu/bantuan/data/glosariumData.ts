export interface GlosariumItem {
  id: string;
  term: string;
  category: "pipeline" | "kemitraan" | "target" | "account";
  categoryLabel: string;
  technicalDef: string;
  analogy: string;
  location: string;
}

export const GLOSARIUM_DATA: GlosariumItem[] = [
  // 1. Penjualan & Pipeline
  {
    id: "lead",
    term: "Lead (Calon Pelanggan / Prospek)",
    category: "pipeline",
    categoryLabel: "Penjualan & Pipeline",
    technicalDef: "Data kontak usaha atau calon pemilik outlet yang berpotensi menjadi pengguna paket CRM Piposmart namun belum melakukan transaksi.",
    analogy: "Tamu yang datang masuk ke toko untuk melihat-lihat katalog produk tetapi belum memutuskan membeli.",
    location: "Menu Lead (/menu/lead)",
  },
  {
    id: "sales-pipeline",
    term: "Sales Pipeline & Funnel",
    category: "pipeline",
    categoryLabel: "Penjualan & Pipeline",
    technicalDef: "Tahapan proses penjualan yang dilalui setiap lead dari tahap kontak awal (Prospect), kualifikasi kebutuhan (Qualification), penawaran (Proposal), hingga closing.",
    analogy: "Corong penyaringan: dari 100 orang yang disapa di awal, tersaring 20 orang yang tertarik, hingga 5 orang yang membeli.",
    location: "Menu Sales (/menu/sales)",
  },
  {
    id: "closing-won-lost",
    term: "Closing (Closed Won / Closed Lost)",
    category: "pipeline",
    categoryLabel: "Penjualan & Pipeline",
    technicalDef: "Hasil akhir dari penawaran penjualan. Closed Won berarti prospek sepakat membeli/berlangganan, sedangkan Closed Lost berarti prospek batal membeli.",
    analogy: "Closed Won = Penandatanganan akta jual beli resmi; Closed Lost = Pembeli memilih membatalkan pesanan.",
    location: "Menu Sales & Laporan Penjualan",
  },
  {
    id: "log-interaksi",
    term: "Log Interaksi (Activity Logging)",
    category: "pipeline",
    categoryLabel: "Penjualan & Pipeline",
    technicalDef: "Catatan histori komunikasi yang dilakukan tim Sales dengan prospek atau mitra, baik berupa panggilan telepon (Call), pesan WhatsApp, atau meeting fisik.",
    analogy: "Buku catatan harian salesman yang mencatat jam berapa menelpon klien dan apa respon dari klien tersebut.",
    location: "Form Log Interaksi di Detail Sales & Detail Mitra",
  },

  // 2. Kemitraan & Afiliasi
  {
    id: "mitra-sales",
    term: "Mitra Sales (Partner Afiliasi)",
    category: "kemitraan",
    categoryLabel: "Kemitraan & Afiliasi",
    technicalDef: "Pihak luar atau agen perantara eksternal yang bekerjasama dengan Piposmart untuk merekomendasikan usaha calon pelanggan.",
    analogy: "Agen perantara / makelar independen yang membawa calon pembeli kepada penjual dan mendapatkan bagi hasil.",
    location: "Menu Mitra Sales (/menu/mitra-sales)",
  },
  {
    id: "lead-afiliasi",
    term: "Lead Afiliasi (Referral Lead)",
    category: "kemitraan",
    categoryLabel: "Kemitraan & Afiliasi",
    technicalDef: "Calon pelanggan yang datang khusus dari hasil rujukan Mitra Sales tertentu dan terikat secara otomatis untuk perhitungan hak komisi.",
    analogy: "Pembeli yang membawa kupon rujukan bertuliskan nama agen perantara yang merekomendasikannya.",
    location: "Tab Lead Afiliasi di Detail Mitra Sales",
  },
  {
    id: "pic-sales",
    term: "PIC Sales Penanggung Jawab",
    category: "kemitraan",
    categoryLabel: "Kemitraan & Afiliasi",
    technicalDef: "Anggota tim Sales internal yang ditunjuk resmi oleh Supervisor/Admin untuk membina agen Mitra Sales dan mengawal lead afilitasinya.",
    analogy: "Account Executive / Pembina khusus di perusahaan yang bertugas melayani dan membantu agen perantara.",
    location: "Detail Mitra Sales → Form Penugasan PIC Sales",
  },
  {
    id: "komisi-referral",
    term: "Komisi Referral (Partner Commission)",
    category: "kemitraan",
    categoryLabel: "Kemitraan & Afiliasi",
    technicalDef: "Imbalan insentif finansial yang dihitung otomatis dan berhak dicairkan kepada Mitra Sales saat lead rujuakannya berhasil transaksi closing.",
    analogy: "Bonus bagi hasil persenan yang dikirim langsung ke rekening agen saat barang yang dia rujuk lunas dibayar.",
    location: "Riwayat Komisi di Detail Mitra Sales",
  },

  // 3. Target & Performa KPI
  {
    id: "target-sales",
    term: "Target Sales Bulanan",
    category: "target",
    categoryLabel: "Target & Performa KPI",
    technicalDef: "Jumlah nominal omset penjualan atau kuota unit langganan yang wajib dicapai oleh seorang Sales dalam periode satu bulan berjalan.",
    analogy: "Batas kuota omset minimum yang harus dikumpulkan atlet penjualan sebelum garis finish akhir bulan.",
    location: "Menu Target (/menu/target)",
  },
  {
    id: "achievement-rate",
    term: "Achievement Rate (% Pencapaian)",
    category: "target",
    categoryLabel: "Target & Performa KPI",
    technicalDef: "Persentase perbandingan antara omset riil yang didapatkan dengan target omset yang ditetapkan. Formula: (Real / Target) * 100%.",
    analogy: "Nilai rapor: jika target 100 juta dan berhasil mendapat 120 juta, maka nilai achievement-nya adalah 120%.",
    location: "Menu Target & Dashboard Sales",
  },
  {
    id: "kpi-ranking",
    term: "Peringkat Klasemen (KPI Rank)",
    category: "target",
    categoryLabel: "Target & Performa KPI",
    technicalDef: "Urutan posisi kinerja tim Sales berdasarkan persentase achievement tertinggi untuk memberikan kompetisi sehat dan apresiasi bonus.",
    analogy: "Klasemen liga sepakbola tempat peringkat pertama diisi oleh pemain dengan skor gol terbanyak.",
    location: "Klasemen Peringkat di Menu Target",
  },

  // 4. Manajemen Akun & Lisensi
  {
    id: "owner-outlet",
    term: "Owner Usaha & Multi-Outlet",
    category: "account",
    categoryLabel: "Manajemen Akun & Lisensi",
    technicalDef: "Struktur hierarki pelanggan di mana satu Pemilik Usaha (Owner) dapat memiliki dan mengelola banyak cabang gerai (Multi-Outlet).",
    analogy: "Pemilik waralaba (Franchisor/Owner) yang membawahi 5 cabang toko fisik di kota yang berbeda-beda.",
    location: "Menu Owner & Outlet (/menu/owner-outlet)",
  },
  {
    id: "subskripsi-paket",
    term: "Subskripsi Paket Langganan",
    category: "account",
    categoryLabel: "Manajemen Akun & Lisensi",
    technicalDef: "Masa aktif lisensi penggunaan aplikasi Piposmart (Paket Silver/Gold/Platinum) yang dibayarkan secara berkala (bulanan/tahunan).",
    analogy: "Langganan TV kabel atau paket internet kantor yang diperpanjang setiap masa sewa berakhir.",
    location: "Menu Owner Outlet & Laporan Penjualan",
  },
  {
    id: "role-rbac",
    term: "Role & Hak Akses (Admin, Supervisor, Sales)",
    category: "account",
    categoryLabel: "Manajemen Akun & Lisensi",
    technicalDef: "Tingkat kewenangan akun pengguna dalam sistem: Admin (Akses Penuh), Supervisor (Manajemen Tim & Target), Sales (Operasional Prospek).",
    analogy: "Pangkat dalam organisasi: Direktur (Admin), Manajer Lapangan (Supervisor), dan Staf Lapangan (Sales).",
    location: "Menu Kelola User (/menu/kelola-user)",
  },
];
