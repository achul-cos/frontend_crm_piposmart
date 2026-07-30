export interface TutorialStep {
  stepTitle: string;
  stepDescription: string;
}

export interface MenuTutorial {
  menuKey: string;
  menuName: string;
  category: "Operasional Sales" | "Manajemen & User" | "Laporan & Sistem";
  summary: string;
  targetRole: string;
  steps: TutorialStep[];
  tips: string;
}

export const TUTORIAL_DATA: MenuTutorial[] = [
  {
    menuKey: "sales",
    menuName: "Menu Sales",
    category: "Operasional Sales",
    summary: "Mengelola pipeline prospek penjualan, log aktivitas interaksi harian, dan ringkasan omset sales.",
    targetRole: "Sales, Supervisor, Admin",
    steps: [
      {
        stepTitle: "1. Membuka Dashboard Sales",
        stepDescription: "Klik menu Sales di sidebar kiri. Anda akan melihat ringkasan omset bulanan, jumlah prospek aktif, dan shortcut Mitra Sales.",
      },
      {
        stepTitle: "2. Menambah Prospek Sales Baru",
        stepDescription: "Klik tombol '+ Tambah Sales / Prospek'. Isi nama calon pembeli, kontak HP, nilai estimasi deal, dan pilih status (Prospect, Qualification, Proposal, Won).",
      },
      {
        stepTitle: "3. Mencatat Log Aktivitas (Call / Meeting / Chat)",
        stepDescription: "Gunakan tombol log interaksi untuk mencatat hasil pertemuan atau telepon dengan prospek agar terpantau oleh Supervisor.",
      },
    ],
    tips: "Gunakan shortcut 'Mitra Sales & Lead Afiliasi' di bagian atas halaman Sales untuk menghubungkan prospek dengan agen mitra dengan cepat.",
  },
  {
    menuKey: "mitra-sales",
    menuName: "Menu Mitra Sales",
    category: "Operasional Sales",
    summary: "Mengelola data mitra agen afiliasi eksternal, penugasan PIC Sales internal, tambah Lead Afiliasi, dan pemantauan komisi.",
    targetRole: "Admin, Supervisor, Sales",
    steps: [
      {
        stepTitle: "1. Menambahkan Mitra Sales Baru",
        stepDescription: "Klik tombol '+ Tambah Mitra Sales'. Masukkan nama agen/perusahaan mitra, nomor telepon, dan data rekening bank untuk pencairan komisi.",
      },
      {
        stepTitle: "2. Menugaskan PIC Sales Penanggung Jawab",
        stepDescription: "Klik tombol 'Detail & PIC' pada baris mitra aktif. Pilih akun Sales internal yang akan membina mitra tersebut dan klik 'Tugaskan PIC'.",
      },
      {
        stepTitle: "3. Menambahkan Lead Afiliasi Mitra",
        stepDescription: "Pada halaman detail mitra, klik tombol '+ Lead Afiliasi' untuk mencatat calon customer yang direkomendasikan oleh mitra tersebut.",
      },
      {
        stepTitle: "4. Memantau Komisi Closing Mitra",
        stepDescription: "Scroll ke bagian 'Riwayat Komisi Mitra' untuk melihat nominal komisi yang didapatkan mitra dari transaksi lead yang berhasil closing.",
      },
    ],
    tips: "Pastikan PIC Sales selalu aktif memperbarui log interaksi dengan mitra agar hubungan kemitraan tetap terjaga baik.",
  },
  {
    menuKey: "target",
    menuName: "Menu Target",
    category: "Operasional Sales",
    summary: "Penetapan target penjualan bulanan per tim Sales dan pemantauan peringkat KPI secara realtime.",
    targetRole: "Admin, Supervisor, Sales",
    steps: [
      {
        stepTitle: "1. Menentukan Target Omset Sales",
        stepDescription: "Klik tombol '+ Atur Target Sales'. Pilih nama anggota Sales, periode bulan, dan tentukan nominal target (contoh: Rp 50.000.000).",
      },
      {
        stepTitle: "2. Memantau Peringkat Klasemen KPI",
        stepDescription: "Lihat tabel 'Peringkat & Pencapaian KPI'. Sistem secara otomatis menghitung % Achievement dan menetapkan rank Sales 1, 2, 3.",
      },
    ],
    tips: "Sales yang mencapai persentase achievement > 100% akan ditandai dengan badge prestasi berwarna hijau emas di klasemen.",
  },
  {
    menuKey: "lead",
    menuName: "Menu Lead",
    category: "Operasional Sales",
    summary: "Manajemen data mentah calon pelanggan (lead) sebelum dialokasikan ke dalam pipeline prospek.",
    targetRole: "Sales, Admin",
    steps: [
      {
        stepTitle: "1. Input Data Lead Usaha",
        stepDescription: "Klik tombol '+ Lead Baru'. Isi data owner, brand outlet, kota, dan sumber lead (Instagram, Referral, Web, Cold Call).",
      },
      {
        stepTitle: "2. Mengubah Status Lead",
        stepDescription: "Perbarui status lead dari NEW -> CONTACTED -> QUALIFIED saat prospek mulai menunjukkan minat berlangganan.",
      },
    ],
    tips: "Filter lead berdasarkan sumber referral untuk melacak performa efektivitas saluran pemasaran.",
  },
  {
    menuKey: "owner-outlet",
    menuName: "Menu Owner & Outlet",
    category: "Manajemen & User",
    summary: "Mengelola data pemilik usaha (Owner) dan daftar gerai/cabang outlet yang terdaftar di CRM Piposmart.",
    targetRole: "Admin, Supervisor",
    steps: [
      {
        stepTitle: "1. Mendaftarkan Data Owner Usaha",
        stepDescription: "Klik tab 'Owner Usaha' dan masukkan data identitas pemilik bisnis beserta jumlah cabang yang dikelola.",
      },
      {
        stepTitle: "2. Menghubungkan Outlet ke Owner",
        stepDescription: "Klik tab 'Daftar Outlet' untuk mendaftarkan lokasi cabang baru di bawah nama Owner terpilih.",
      },
    ],
    tips: "Satu Owner dapat memiliki multiple gerai outlet di sistem CRM Piposmart.",
  },
  {
    menuKey: "laporan-penjualan",
    menuName: "Menu Laporan Penjualan",
    category: "Laporan & Sistem",
    summary: "Analisis grafik performa omset bulanan, tren closing, dan ringkasan pengeluaran komisi mitra.",
    targetRole: "Admin, Supervisor",
    steps: [
      {
        stepTitle: "1. Memilih Periode Tanggal Laporan",
        stepDescription: "Gunakan filter tanggal di bagian atas halaman untuk menampilkan laporan omset harian, mingguan, atau bulanan.",
      },
      {
        stepTitle: "2. Eksport Laporan Excel / PDF",
        stepDescription: "Klik tombol 'Export Laporan' untuk mengunduh rekapitulasi angka omset dan komisi dalam format file dokumen.",
      },
    ],
    tips: "Gunakan laporan ini saat evaluasi bulanan tim Sales untuk penentuan bonus dan insentif.",
  },
  {
    menuKey: "kelola-user",
    menuName: "Menu Kelola User",
    category: "Manajemen & User",
    summary: "Pembuatan akun login internal (Admin, Supervisor, Sales) dan konfigurasi perizinan hak akses.",
    targetRole: "Admin",
    steps: [
      {
        stepTitle: "1. Membuat Akun User Baru",
        stepDescription: "Klik tombol '+ Buat Akun Login'. Pilih Role (Admin, Supervisor, atau Sales), isi Nama User, Username/Email, dan Password.",
      },
      {
        stepTitle: "2. Memilih Supervisor untuk Akun Sales",
        stepDescription: "Khusus role Sales, Anda wajib memilih akun Supervisor yang bertanggung jawab memimpin Sales tersebut.",
      },
      {
        stepTitle: "3. Mengelola Status Akun (Aktif / Nonaktif)",
        stepDescription: "Gunakan tombol toggle status di daftar user untuk mengaktifkan atau menonaktifkan hak akses akun karyawan.",
      },
    ],
    tips: "Setelah akun dibuat, modal akan tertutup otomatis dan kredensial login (Email & Password) akan ditampilkan di notifikasi sukses.",
  },
  {
    menuKey: "setting",
    menuName: "Menu Setting",
    category: "Laporan & Sistem",
    summary: "Pengaturan mandiri profil akun (Nama & Username/Email), pengubahan kata sandi login, dan preferensi tampilan.",
    targetRole: "Semua Role (Admin, Supervisor, Sales)",
    steps: [
      {
        stepTitle: "1. Mengubah Nama Lengkap & Email",
        stepDescription: "Pada tab 'Profil Saya', edit nama dan email login Anda lalu klik 'Simpan Perubahan Profil'. Data di header akan langsung ter-update.",
      },
      {
        stepTitle: "2. Mengubah Password Login",
        stepDescription: "Klik tab/tombol 'Ganti Password'. Isi Password Saat Ini, Password Baru (min. 8 karakter), dan Konfirmasi Password.",
      },
      {
        stepTitle: "3. Mengganti Mode Tampilan (Light / Dark)",
        stepDescription: "Pilih mode tampilan terang atau gelap pada tab 'Preferensi Tampilan' sesuai kenyamanan mata Anda.",
      },
    ],
    tips: "Gunakan tombol pintas '🔑 Ganti Password' di header Setting untuk beralih langsung ke form ubah password.",
  },
];
