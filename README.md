# Piposmart CRM (Frontend)

Piposmart CRM adalah aplikasi antarmuka pengguna (Frontend) yang dirancang khusus untuk tim Sales dan Manajemen dalam melacak aktivitas prospek, mengelola *follow-up* (Call & Chat), dan mencatat laporan penjualan (Closing).

Aplikasi ini mengusung desain **modern, cepat, dan premium** menggunakan ekosistem terbaru dari Next.js dan Tailwind CSS.

## 🚀 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Data Export**: [XLSX](https://sheetjs.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Language**: TypeScript

## ✨ Fitur Utama

1. **📊 Dashboard Analitik**
   - Ringkasan statistik operasional (Total Prospek, Closing, dll).
   - Metrik Potensi dan grafik performa *Sales*.
   - Filter rentang waktu yang interaktif.

2. **👥 Manajemen Kelolaan Customer**
   - Tabel responsif untuk memantau ratusan data nasabah.
   - Form pencatatan Riwayat *Call* & *Chat* (Remark 1, 2, 3).
   - Indikator skor kelayakan (Skor 0 - 3) berdasarkan parameter respon.
   - Sistem tong sampah (*Trash / Recycle Bin*) untuk *Soft Delete* & *Restore* data.

3. **🏷️ Master Promo (Paket Langganan)**
   - Manajemen terpusat (*Single Source of Truth*) untuk katalog paket & promosi.
   - Form Pop-up modern untuk kalkulasi harga diskon, masa tenor, dan bonus bulan.
   - Terintegrasi langsung dengan formulir "Laporan Penjualan" (*Remark 3*) di modul kelolaan customer.

4. **📑 SOP & Panduan Operasional**
   - Direktori *Standard Operating Procedure* terintegrasi.
   - Panduan indikator, *script chat*, dan prosedur eskalasi.

## ⚙️ Prasyarat

Sebelum menjalankan proyek ini, pastikan Anda telah menginstal:
- [Node.js](https://nodejs.org/) (Versi 20.x atau terbaru)
- Backend Golang CRM (harus berjalan di port `localhost:8080`)

## 💻 Instalasi & Menjalankan Aplikasi

1. Clone repositori ini:
   ```bash
   git clone https://github.com/piposmart/crm_piposmart.git
   cd crm_piposmart
   ```

2. Instal dependensi:
   ```bash
   npm install
   ```

3. Jalankan *development server*:
   ```bash
   npm run dev
   ```

4. Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## 📁 Struktur Proyek (App Router)

```text
app/
├── auth/            # Halaman Login & Logout
├── lib/             # Utilities (API config, fungsi helpers, static data)
├── menu/            # Halaman Utama (Main Modules)
│   ├── data-kelolaan/  # Manajemen Customer & Remarks
│   ├── paket-langganan/# Modul Master Promo
│   ├── setting/        # Profil User
│   └── sop/            # Panduan Operasional
├── layout.tsx       # Root layout & navigasi Sidebar
└── page.tsx         # Dashboard Index
```

## 🔐 Autentikasi

Saat ini aplikasi menggunakan sistem otentikasi simulasi (DUMMY) yang dikelola melalui `localStorage` (menggunakan prefix `piposmart_is_logged_in`). Terdapat tiga peran (*role*) yang digunakan untuk mengatur izin akses antarmuka:
- `Developer`
- `Supervisor`
- `Sales`

## 🔗 Integrasi API

Seluruh panggilan ke backend (pengambilan, penyimpanan, dan penghapusan data) dikelola secara terpusat di dalam `app/lib/api.ts`. Aplikasi ini berkomunikasi dengan backend Golang yang memproses format JSON dan terhubung ke database.

---
*Dibuat untuk Tim Piposmart © 2026*
