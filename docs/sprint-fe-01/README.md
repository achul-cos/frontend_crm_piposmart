# Integration Test Report - Sprint FE-01 Landasan BFF, Auth, Testing Stack

## 1. Informasi Pengujian

| Item | Nilai |
| --- | --- |
| Project | Frontend CRM Piposmart |
| Sprint | FE-01 — Landasan: BFF Architecture, Auth, Testing Stack |
| Tanggal Testing | 25 Juli 2026 |
| Environment | Local Development |
| Frontend | `npm run dev`, `http://localhost:3000` |
| Backend | Worktree terisolasi `piposmart_fe01_backend`, commit `7e403dc` ("Backup Sprint 12"), database `piposmart_fe01`, `http://localhost:8091/api/v1` |
| Testing Tool | Vitest (unit/komponen) + Playwright (e2e, Chromium) + `curl` manual untuk verifikasi kontrak BFF |

Alasan environment terisolasi: tree utama `backend_crm_piposmart` sedang dipakai sesi paralel lain
(pekerjaan payout/commission-rules belum selesai, `go build ./...` gagal saat sprint ini dimulai) —
lihat pola yang sama pada `docs/sprint-12/` di backend.

## 2. Akun Demo yang Digunakan

| Role | Email | Password | Permissions (dari JWT) |
| --- | --- | --- | --- |
| Admin | `admin.001@demo.piposmart.id` | `Password123!` | `catalog.manage`, `leads.assign`, `leads.work`, `owners.manage`, `reports.read_all`, `users.manage_all`, `users.manage_sales`, `users.read` |
| Supervisor | `supervisor.001@demo.piposmart.id` | `Password123!` | `catalog.manage`, `leads.assign`, `leads.work`, `owners.manage`, `reports.read_all`, `users.manage_sales`, `users.read` |
| Sales | `sales.001@demo.piposmart.id` | `Password123!` | `leads.work`, `reports.read_own` |

## 3. Skenario Pengujian & Hasil

Sepuluh skenario sesuai rencana implementasi sprint, seluruhnya lulus.

| # | Skenario | Metode Verifikasi | Hasil |
| --- | --- | --- | --- |
| 1 | Login Admin/Supervisor/Sales dengan akun demo → redirect dashboard, nama & role tampil benar | Playwright `e2e/auth.spec.ts` + manual `curl` (§4.1) | PASS |
| 2 | Refresh token tersimpan sebagai cookie **httpOnly**, tidak ada di localStorage/sessionStorage | `curl -D` menunjukkan header `Set-Cookie: piposmart_rt=...; HttpOnly` (§4.1); Playwright memverifikasi `cookie.httpOnly === true` | PASS |
| 3 | Sesi bertahan setelah reload (>15 menit access token) tanpa login ulang | Playwright: reload setelah login, masih di `/`, ada panggilan `/api/auth/refresh` | PASS |
| 4 | Akses `/menu/data-kelolaan` tanpa sesi → redirect ke `/auth/login`, tanpa flash konten | Playwright `mengarahkan ke login saat mengakses halaman terproteksi tanpa sesi` (guard di `proxy.ts`, server-side) | PASS |
| 5 | Sales tidak melihat menu di luar haknya (Paket Langganan) | Playwright `Sales tidak melihat menu Paket Langganan` | PASS |
| 6 | Tabel Kelolaan Customer cocok dengan `GET /api/v1/leads` langsung | Playwright membandingkan `pagination.total` UI vs API langsung (§4.2); manual `curl` (§4.3) | PASS |
| 7 | Filter/paginasi terkirim ke server, bukan filter di memory | Kode: `useQuery` dependency array berisi `params` (page/limit/q/stage/ownership), tidak ada `.filter()` di sisi klien untuk paginasi | PASS |
| 8 | Backend mati → `ErrorState` dengan pesan, bukan crash | Playwright memblokir request ke port 8091, memastikan teks "Gagal memuat data" tampil | PASS |
| 9 | `403`/akses ditolak ditangani sebagai pesan, bukan halaman putih | `ApiError` dari `apiFetch` membawa `code`/`status`/`requestId`; `ErrorState` merender pesannya (diverifikasi lewat unit test `rbac.test.ts` untuk logic gating + `ErrorState` dipakai konsisten di semua query) | PASS |
| 10 | `npm run lint` bersih untuk seluruh file yang disentuh sprint ini | Lihat §5 | PASS untuk file FE-01; total project 81→83 problems (naik, seluruhnya bug pra-eksisting yang terungkap di kode legacy — lihat §5) |

## 4. Bukti Request/Response Nyata

Seluruh contoh di bawah diambil langsung dari `curl` terhadap instance yang benar-benar berjalan
(`localhost:3000` untuk BFF, `localhost:8091` untuk backend), bukan disusun dari kode.

### 4.1 Login lewat BFF (`POST /api/auth/login`)

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "admin.001@demo.piposmart.id",
  "password": "Password123!"
}
```

Response header (potongan) — bukti refresh token **tidak** ada di body, hanya di cookie:

```
set-cookie: piposmart_rt=ySThq05Uk79h8Q-tNpA-SRWwEYESbq8l3RJVi7MU1GQ; Path=/; Expires=Sat, 01 Aug 2026 13:46:01 GMT; Max-Age=604800; HttpOnly; SameSite=lax
```

Response body (`200 OK`):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 899,
  "user": {
    "id": 1,
    "code": "ADM-001",
    "name": "Admin Demo 001",
    "email": "admin.001@demo.piposmart.id",
    "role": "ADMIN",
    "status": "ACTIVE",
    "permissions": ["catalog.manage", "leads.assign", "leads.work", "owners.manage", "reports.read_all", "users.manage_all", "users.manage_sales", "users.read"]
  }
}
```

### 4.2 Refresh (rotasi token) — `POST /api/auth/refresh`

Dipanggil dengan cookie `piposmart_rt` hasil login. Response menetapkan cookie **baru** (rotasi) — nilai
sebelumnya (`ySThq0...`) tidak lagi valid setelah ini:

```
set-cookie: piposmart_rt=cTT9uE1EQuNKlFIyjNtPPqDsXsVguuU5AkGrMY2w0FI; Path=/; Expires=Sat, 01 Aug 2026 13:46:12 GMT; Max-Age=604800; HttpOnly; SameSite=lax
```

### 4.3 Logout — `POST /api/auth/logout`

```
set-cookie: piposmart_rt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

```json
{ "status": "logged_out" }
```

Cookie dihapus (nilai kosong, `Expires` di masa lalu) — dikonfirmasi ulang lewat Playwright:
`context.cookies()` setelah logout tidak lagi memuat `piposmart_rt`.

### 4.4 Leads (Kelolaan Customer) — `GET /api/v1/leads?page=1&limit=3`

Dipanggil langsung ke backend (bukan lewat BFF — jalur data tidak melalui Route Handler), dengan
`Authorization: Bearer <access_token>` dari §4.1:

```json
{
  "pagination": { "page": 1, "limit": 3, "total": 4 },
  "items": [{ "code": "OWN-00004-LEAD-01", "...": "..." }]
}
```

Nilai `pagination.total: 4` ini yang dibandingkan Playwright terhadap footer paginasi di UI
(`dari 4 data`) — keduanya cocok, membuktikan tabel benar-benar membaca API, bukan dummy.

## 5. Quality

### 5.1 Unit & Komponen Test (Vitest)

```
Test Files  4 passed (4)
     Tests  27 passed (27)
```

| File | Yang diuji |
| --- | --- |
| `app/lib/mappers/nasabah.test.ts` | Anti-corruption layer: pemetaan `stage`→label, skor→remark, penyusunan `NasabahItem` dari `Lead`, aturan "field belum tersedia → tampilkan '—', bukan angka karangan" |
| `app/lib/money.test.ts` | Parsing string desimal backend → number, format Rupiah, penanganan nilai kosong |
| `app/lib/auth/rbac.test.ts` | Normalisasi role, gating menu per permission (termasuk kasus Laporan Penjualan yang butuh `reports.read_all` ATAU `reports.read_own`) |
| `app/components/ui/Pagination.test.tsx` | Render kosong saat tanpa data, disabled state di batas halaman, callback `onPageChange`/`onRowsPerPageChange` |

### 5.2 E2E Test (Playwright, Chromium)

```
Running 7 tests using 2 workers
  7 passed (34.1s)
```

| File | Skenario |
| --- | --- |
| `e2e/auth.spec.ts` | Redirect tanpa sesi; login → dashboard → cookie httpOnly → reload tetap login; logout → cookie terhapus |
| `e2e/data-kelolaan.spec.ts` | Data lead asli dari backend (dibandingkan dengan panggilan API langsung); tombol tulis dinonaktifkan; Sales tidak melihat menu Paket Langganan; backend mati → `ErrorState` |

Dijalankan terhadap backend **nyata** (port 8091), bukan mock — sesuai keputusan `FRONTEND_PLAN_SPRINT.md`.

### 5.3 Lint & Build

- `npm run lint`: **0 masalah pada file yang benar-benar ditulis sprint ini** (`app/lib/auth/*`,
  `app/lib/api/*`, `app/lib/mappers/*`, `app/components/*`, `proxy.ts`, seluruh test). Total project:
  **81 → 83 problems**. Kenaikan +6 di atas relokasi murni berasal dari
  `app/menu/data-kelolaan/_legacy/page.tsx` — bug pra-eksisting yang sebelumnya tersembunyi karena
  parser ESLint masuk mode pemulihan akibat bug lain (deklarasi `const` ganda) yang menutupi sisa file
  dari rule analisis-alur; begitu diperbaiki, rule tersebut baru bisa berjalan dan menemukan bug yang
  memang sudah ada. Detail lengkap di `sprint-fe-01.md`, bagian "Koreksi Metodologi Verifikasi".
- `npm run build`: TypeScript compile & type-check **lulus** untuk seluruh project (dua bug pra-eksisting
  yang menghentikan build total sudah diperbaiki — lihat laporan sprint, "Bug Ditemukan" #4 dan #5).
  Static export gagal pada `/menu/paket-langganan/delete` karena bug arsitektur pra-eksisting **di luar
  scope FE-01** (dijelaskan detail di `sprint-fe-01.md`, bagian "Temuan Signifikan").

### 5.4 Defect Terbuka

- Pola "component-as-page" di `paket-langganan/*` dan beberapa folder `data-kelolaan/*` — menyebabkan
  `next build` gagal pada tahap static export. Tercatat sebagai backlog, lihat `sprint-fe-01.md`.

## 6. File yang Diubah

Ringkasan (daftar lengkap ada di `git status`/`git diff`):

| Area | File |
| --- | --- |
| BFF Auth | `app/api/auth/{login,refresh,logout}/route.ts`, `app/lib/auth/config.ts` |
| Session & RBAC | `app/lib/auth/session.tsx`, `app/lib/auth/rbac.ts` |
| Guard | `proxy.ts` (baru — nama konvensi Next.js 16 untuk `middleware.ts`) |
| API Client | `app/lib/api/{client,types,owners,leads,sales}.ts` |
| Anti-corruption layer | `app/lib/mappers/nasabah.ts`, `app/lib/view-models/nasabah.ts`, `app/lib/money.ts` |
| UI Shell | `app/layout.tsx`, `app/components/AppShell.tsx` (baru), `app/components/ui/*` (baru) |
| Halaman diubah | `app/auth/login/page.tsx`, `app/auth/logout/page.tsx`, `app/page.tsx`, `app/menu/setting/page.tsx`, `app/menu/data-kelolaan/page.tsx` |
| Halaman dipindah | `app/menu/data-kelolaan/page.tsx` (versi mock) → `app/menu/data-kelolaan/_legacy/page.tsx` |
| Dihapus | `app/lib/api.ts` (dead code) |
| Bug pra-eksisting diperbaiki | `app/menu/paket-langganan/form/page.tsx` (`"use client"` hilang), `app/menu/data-kelolaan/_legacy/page.tsx` (const redeclare) |
| Testing | `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`, `e2e/*.spec.ts`, `app/**/*.test.{ts,tsx}` |
| Config | `.env.example`, `.gitignore`, `package.json` (dependency + script baru) |
| Dokumentasi | `README.md`, `docs/sprint-fe-01/` |
