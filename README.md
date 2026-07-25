# Piposmart CRM (Frontend)

Piposmart CRM adalah aplikasi antarmuka pengguna (Frontend) yang dirancang khusus untuk tim Sales dan Manajemen dalam melacak aktivitas prospek, mengelola *follow-up* (Call & Chat), dan mencatat laporan penjualan (Closing).

Aplikasi ini mengusung desain **modern, cepat, dan premium** menggunakan ekosistem terbaru dari Next.js dan Tailwind CSS.

## 🚀 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) — perhatikan: sejak v16, `middleware.ts` berganti nama menjadi `proxy.ts` (fungsinya sama).
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Data Export**: [XLSX](https://sheetjs.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Server State**: [TanStack Query](https://tanstack.com/query) — cache, dedup, dan invalidation untuk data dari backend.
- **Unit/Component Test**: [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react)
- **E2E Test**: [Playwright](https://playwright.dev/)
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
- Backend `backend_crm_piposmart` (Go/Gin/MySQL) berjalan dan sudah di-migrate + di-seed. Lihat
  `../backend_crm_piposmart/README.md`.

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

3. Salin `.env.example` menjadi `.env.local` dan sesuaikan `BACKEND_API_URL` /
   `NEXT_PUBLIC_BACKEND_API_URL` dengan alamat backend yang sedang berjalan:
   ```bash
   cp .env.example .env.local
   ```

4. Jalankan *development server*:
   ```bash
   npm run dev
   ```

5. Buka [http://localhost:3000](http://localhost:3000) di browser Anda. Anda akan diarahkan ke
   `/auth/login` — gunakan akun demo dari seeder backend (mis. `admin.001@demo.piposmart.id`).

## 🧪 Testing

```bash
npm test           # Vitest — unit & component test (jsdom), sekali jalan
npm run test:watch # Vitest — mode watch untuk development
npm run test:e2e   # Playwright — e2e critical-path (butuh backend & dev server nyata berjalan)
```

Playwright memerlukan browser lokal (`npx playwright install chromium`, sekali saja) dan backend yang
benar-benar hidup — bukan mock. Kredensial demo yang dipakai `e2e/auth.spec.ts` bisa dioverride lewat
`E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`, dan base URL lewat `E2E_BASE_URL` (default
`http://localhost:3000`).

> **Gotcha**: kalau port `3000` sedang dipakai proses lain, Next.js otomatis pindah ke `3001` — tapi
> `CORS_ALLOWED_ORIGINS` backend biasanya hanya mengizinkan `localhost:3000`. Browser akan gagal
> memanggil API dengan pesan generik ("Tidak dapat terhubung ke server"), padahal penyebabnya CORS,
> bukan backend mati. Pastikan tidak ada instance `next dev` lama yang masih berjalan
> (`Get-Process -Name node` di PowerShell, cocokkan `CommandLine`-nya) sebelum menjalankan `npm run dev`.

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

Sejak Sprint FE-01, autentikasi memakai pola **BFF (Backend-for-Frontend)** — bukan lagi token mentah di
`localStorage`:

- `POST /api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` (`app/api/auth/*`) adalah Route Handler
  Next.js yang menjadi perantara ke backend. **Refresh token disimpan di cookie `httpOnly`** (nama
  `piposmart_rt`) — tidak pernah bisa dibaca JavaScript di browser, sehingga kebal terhadap pencurian
  token lewat XSS.
- **Access token hanya disimpan di memory** (`app/lib/auth/session.tsx`, `SessionProvider`), hilang saat
  halaman di-reload dan dipulihkan otomatis lewat cookie refresh. Auto-refresh terjadwal di ~90% umur
  token (backend: `JWT_ACCESS_TTL=15m`).
- **Guard rute berjalan di server** lewat `proxy.ts` (bukan `middleware.ts` — Next.js 16 mengganti nama
  konvensi ini) yang memeriksa keberadaan cookie sesi sebelum halaman terproteksi dikirim ke browser.
  Ini menggantikan guard lama berbasis `useEffect` + `localStorage` di `app/layout.tsx` yang rentan
  *flash-of-protected-content* dan mudah dilewati dari console.
- Role dari backend (`ADMIN` / `SUPERVISOR` / `SALES`) beserta `permissions` yang dikirim saat login
  dipakai `app/lib/auth/rbac.ts` untuk menyaring menu yang tampil — bukan mekanisme keamanan utama
  (otorisasi sesungguhnya tetap di backend), murni supaya pengguna tidak diarahkan ke layar yang
  ujungnya ditolak backend.

## 🔗 Integrasi API

- `app/lib/api/client.ts` — pemanggil endpoint data (`apiFetch`), memasang header `Authorization`,
  membuka bungkus amplop response backend (`{data, meta}` / `{error}`), dan mencoba refresh token sekali
  saat menerima `401` sebelum mengulang request.
- `app/lib/api/{owners,leads,sales}.ts` — pembungkus bertipe per domain, parameter query-nya dicocokkan
  langsung ke handler backend (`internal/customer`, `internal/lead`, `internal/identity`).
- `app/lib/mappers/` + `app/lib/view-models/` — *anti-corruption layer* yang menyusun response backend
  (ternormalisasi per entitas: owner, outlet, lead, dst.) menjadi view model gepeng yang dipakai UI
  existing, supaya desain layar yang sudah ada tidak perlu ditulis ulang saat integrasi.
- `app/lib/money.ts` — backend mengirim nilai uang sebagai **string desimal** (bukan `number`, untuk
  menghindari presisi `float64`); konversi ke tampilan rupiah dipusatkan di sini.

Panggilan data (owners, leads, dll.) dilakukan **langsung dari browser ke backend** (CORS backend sudah
mengizinkan origin frontend) — hanya alur auth yang melewati Route Handler Next.js.

---
*Dibuat untuk Tim Piposmart © 2026*
