# Integration Test Report - Sprint FE-02 Migrasi Auth + CRUD Kelolaan Customer

## 1. Informasi Pengujian

| Item | Nilai |
| --- | --- |
| Project | Frontend CRM Piposmart |
| Sprint | FE-02 — Migrasi Auth + CRUD Kelolaan Customer |
| Tanggal Testing | 26 Juli 2026 |
| Environment | Local Development |
| Frontend | `npm run dev`, `http://localhost:3000` |
| Backend | Worktree terisolasi `piposmart_fe02_backend`, commit `a5799c2` ("Sprint 13"), database `piposmart_fe02`, `http://localhost:8092/api/v1` |
| Testing Tool | Vitest (unit) + Playwright (e2e, Chromium) + `curl` manual untuk verifikasi kontrak API |

Worktree FE-01 sebelumnya (`piposmart_fe01_backend`) ditemukan sudah terhapus fisik saat sprint ini
dimulai (git menandai referensinya `prunable`) — dibuat ulang dari commit backend terbaru, yang
ternyata sudah menyelesaikan Sprint 13 (Sales Target/KPI/Ranking) sejak laporan FE-01. Tree utama
`backend_crm_piposmart` sedang dipakai sesi paralel lain di port 8080 — tidak disentuh.

## 2. Skenario Pengujian & Hasil

| # | Skenario | Metode Verifikasi | Hasil |
| --- | --- | --- | --- |
| 1 | 5 halaman (`call`, `form`, `trash`, `deskripsi-customer`, `remark-3`) tidak lagi mengimpor `app/lib/api.ts` | `grep -rl 'from "@/app/lib/api"' app` → kosong | PASS |
| 2 | `app/lib/api.ts` terhapus tanpa meninggalkan pemanggil rusak | `npx tsc --noEmit` bersih setelah penghapusan | PASS |
| 3 | Fungsi API baru (`createOwner`, `updateOwner`, dst.) memakai `apiFetch` (BFF-aware), bukan token `localStorage` manual | Review kode `app/lib/api/{owners,leads,catalog}.ts` — tidak ada `localStorage.getItem` | PASS |
| 4 | Admin dapat membuat owner baru dari tabel utama | Playwright `data-kelolaan-crud.spec.ts`: isi form → submit → alert diterima → redirect ke tabel → baris baru terlihat | PASS |
| 5 | Admin dapat mengedit owner yang sudah ada, field terisi otomatis dari data asli | Playwright: buka form via tombol Edit → field `namaOwner` terisi nilai lama → ubah → submit → verifikasi berubah di tabel | PASS |
| 6 | Admin dapat soft-delete owner, baris hilang dari tabel default | Playwright: klik Hapus → konfirmasi modal → baris tidak lagi muncul saat dicari | PASS |
| 7 | Link Trash dapat diakses dari tabel utama | Playwright: klik link "Trash" → URL berpindah ke `/menu/data-kelolaan/trash` | PASS |
| 8 | Aksi tulis (Tambah/Edit/Hapus) hanya tampil untuk permission `owners.manage` | Review kode: `canManageOwners = can("owners.manage", permissions)` menggate seluruh tombol | PASS (diverifikasi via kode; akun demo yang tersedia semuanya ADMIN/SUPERVISOR yang punya permission ini, tidak ada akun Sales-only untuk uji negatif langsung) |
| 9 | Seluruh test FE-01 (auth, RBAC menu, error state) tetap hijau setelah migrasi | `npx playwright test` — 9/9 lulus termasuk 7 test lama | PASS |
| 10 | `npm run build` berhasil | Lihat §5 | PASS (39/39 halaman) |

## 3. Bukti Request/Response Nyata

### 3.1 Create Owner — `POST /owners`

Request (dikirim `app/lib/api/owners.ts`, `createOwner`):

```json
{
  "code": "DOC-DEMO-01",
  "name": "Demo Report Owner",
  "brand_name": "Demo Brand",
  "phone": "+6281299998888"
}
```

Response — **perhatikan nomor telepon dikirim dengan `+`, backend mengembalikannya TANPA `+`**:

```json
{
  "data": {
    "id": 23,
    "code": "DOC-DEMO-01",
    "name": "Demo Report Owner",
    "phone": "6281299998888",
    "brand_name": "Demo Brand",
    "status": "ACTIVE",
    "created_at": "2026-07-26T02:53:34Z"
  }
}
```

Ini akar penyebab Bug #5 di `sprint-fe-02.md` — form edit yang mem-prefill nomor telepon dari response
ini harus menormalisasi kembali ke `+62...` sebelum ditampilkan, kalau tidak validasi lokal
(`isValidInternationalPhone`) menahan submit tanpa pesan error yang terlihat.

### 3.2 Soft Delete → Restore → Force Delete

```
DELETE /owners/23        → {"data": {"status": "deleted"}}
PATCH  /owners/23/restore → {"data": {"id": 23, ..., "status": "ACTIVE"}}
DELETE /owners/23/force   → {"data": {"status": "force_deleted"}}
```

Dikonfirmasi: `hardDeleteOwner`/`softDeleteOwner` di `app/lib/api/owners.ts` bertipe
`Promise<{status: string}>`, bukan `Promise<void>` — backend selalu membalas body JSON, bukan `204 No
Content`.

## 4. Quality

### 4.1 Unit Test (Vitest)

```
Test Files  4 passed (4)
     Tests  27 passed (27)
```

Tidak berubah dari FE-01 — fungsi API baru sprint ini adalah pemanggil tipis `apiFetch` mengikuti pola
yang sudah diuji lewat fungsi sejenis (`listOwners`, `getLead`, dst.), tidak ada logic baru yang cukup
non-trivial untuk unit test tambahan.

### 4.2 E2E Test (Playwright, Chromium)

```
Running 9 tests using 3 workers
  9 passed (33.2s)
```

| File | Skenario |
| --- | --- |
| `e2e/auth.spec.ts` | Tidak berubah dari FE-01 (3 test) |
| `e2e/data-kelolaan.spec.ts` | 1 test diperbarui isinya (assersi "read-only" FE-01 sudah tidak berlaku, sekarang memverifikasi tombol tulis tampil untuk Admin); 1 test diperbaiki agar tidak bergantung urutan baris tabel (race dengan test CRUD paralel) |
| `e2e/data-kelolaan-crud.spec.ts` | **Baru.** Create → edit → soft-delete penuh (1 test, ~11 detik); akses link Trash (1 test) |

### 4.3 Lint & Build

- `npm run lint`: 0 masalah baru di file yang disentuh/dibuat sprint ini. Total project tidak berubah
  (116 problems, seluruhnya pra-eksisting di modul yang tidak disentuh).
- `npm run build`: **berhasil penuh**, 39/39 halaman ter-generate, exit code 0. Bug pra-eksisting
  `paket-langganan/delete` yang diflag FE-01 sebagai carry-over di luar scope sudah tidak lagi
  menggagalkan build (tidak disentuh sengaja sprint ini — kemungkinan diperbaiki commit lain).

### 4.4 Defect Terbuka

- Autofill kodeOwner (`getOwnerProfileByKodeOwner`) di `form/page.tsx` masih bergantung cache
  `localStorage` yang sudah basi — terdegradasi diam-diam, dicatat sebagai carry-over di
  `sprint-fe-02.md`.

## 5. File yang Diubah

| Area | File |
| --- | --- |
| API Client | `app/lib/api/owners.ts` (+7 fungsi), `app/lib/api/leads.ts` (+6 fungsi, +3 tipe), `app/lib/api/catalog.ts` (baru) |
| Migrasi pemanggil | `app/menu/data-kelolaan/{call,trash,deskripsi-customer,form}/page.tsx`, `app/menu/data-kelolaan/call/remarks/remark-3/page.tsx` |
| CRUD tabel utama | `app/menu/data-kelolaan/page.tsx` |
| Perbaikan merge conflict | `app/layout.tsx`, `app/components/AppShell.tsx`, `app/lib/auth/rbac.ts` |
| Dihapus | `app/lib/api.ts` |
| Testing | `e2e/data-kelolaan-crud.spec.ts` (baru), `e2e/data-kelolaan.spec.ts` (2 test diperbarui) |
| Dokumentasi | `docs/sprint-fe-02/`, `FRONTEND_PLAN_SPRINT.md` (baseline diperbarui bila relevan) |
