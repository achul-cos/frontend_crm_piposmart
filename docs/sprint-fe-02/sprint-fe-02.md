# Sprint FE-02 — Migrasi Auth + CRUD Kelolaan Customer

## Sprint

FE-02

## Periode

26 Juli 2026

## Status

`GREEN`

Sprint Goal tercapai: kelima halaman yang sempat diintegrasikan sesi paralel dengan pola auth lama
(token mentah `localStorage`) sudah dimigrasikan penuh ke arsitektur BFF (`app/lib/api/*` + `apiFetch`),
`app/lib/api.ts` (dead code yang sempat hidup kembali) dihapus untuk kedua kalinya — kali ini terverifikasi
tidak ada pemanggil tersisa — dan tabel utama Kelolaan Customer sekarang punya alur tulis penuh
(create/edit/soft-delete) yang tersambung ke UI yang sudah dibangun sebelumnya, bukan dibangun ulang.

## Sprint Goal

Menyatukan seluruh integrasi API frontend ke satu arsitektur (BFF, bukan token mentah di localStorage),
dan menyambungkan alur tulis Kelolaan Customer yang sebelumnya (FE-01) sengaja read-only.

## Catatan Penting: Kondisi Awal Sprint

Sebelum sprint ini dimulai, ditemukan dua hal di working tree:

1. **Marka konflik git yang ter-commit** di `app/layout.tsx` (`<<<<<<< HEAD` ... `>>>>>>> main`),
   hasil merge yang tidak diselesaikan tuntas oleh proses lain sebelum push ke `origin/achul-v2`.
   Diperbaiki di awal sprint: mempertahankan arsitektur BFF/AppShell FE-01 sebagai isi `layout.tsx`,
   memindahkan entri menu baru "Kelolaan Mitra" (dari sisi merge yang satunya) ke `AppShell.tsx` dan
   `rbac.ts` (menu ini masih 100% mock, dijadwalkan integrasi di FE-08 per `FRONTEND_PLAN_SPRINT.md`).
2. **`app/lib/api.ts` hidup kembali** (763 baris) — merge yang sama membawa kembali file yang FE-01
   hapus sebagai dead code, kali ini dengan pemakai nyata: 5 halaman (`call`, `form`, `trash`,
   `deskripsi-customer`, `call/remarks/remark-3`) yang diintegrasikan **sesi paralel** ke backend
   memakai pola auth lama. Bagian A sprint ini adalah migrasi tuntas kelima halaman tersebut.

Detail investigasi lengkap ada di riwayat percakapan; keputusan scope (migrasi Bagian A + wiring
Bagian B, Kelolaan Mitra tetap mock) dikonfirmasi bersama stakeholder sebelum implementasi dimulai.

## Committed Deliverables

**Bagian A — Migrasi Auth:**
- Perluasan `app/lib/api/owners.ts`: `createOwner`, `updateOwner`, `restoreOwner`, `hardDeleteOwner`,
  `softDeleteOwner`, `bulkCreateOutlets`, `bulkForceDeleteOutlets`.
- Perluasan `app/lib/api/leads.ts`: `createLead`, `assignSupervisor`, `listLeadInteractions`,
  `listLeadTrainings`, `listLeadClosings`, `getSupervisorList` (hack sisi-klien dipertahankan apa
  adanya, backend belum punya endpoint supervisor).
- Modul baru `app/lib/api/catalog.ts`: `listCatalogPackages`, `listCatalogPlans`,
  `listEligiblePromotions`.
- Migrasi 5 file pemanggil ke lokasi baru, dengan penyesuaian bentuk data di setiap titik yang
  konvensinya berbeda (amplop `{data}` lama vs unwrap konsisten baru; array bentar vs
  `PaginatedList<T>`).
- `form/page.tsx`: dihapus pemanggilan `getProfile` (redundan dengan `useSession().user` yang sudah
  ada sejak FE-01) dan pembacaan `localStorage.getItem("piposmart_user_name"/"_role")` — diganti
  `useSession()` + `normalizeRole()`.
- `app/lib/api.ts` dihapus (terverifikasi ulang: nol pemanggil tersisa sebelum dihapus).

**Bagian B — CRUD Tabel Utama:**
- Tombol "Tambah Owner" (link ke `form/page.tsx` mode create) dan link "Trash", digate permission
  `owners.manage`.
- Kolom Aksi per baris: Edit (link ke `form/page.tsx?id={leadId}`) dan Hapus (modal konfirmasi →
  `softDeleteOwner` → invalidate query `["leads"]` agar tabel refetch).
- **Perbaikan blocker tersembunyi**: mode edit `form/page.tsx` sebelumnya mengisi field dari cache
  `localStorage` (`piposmart_nasabah_data`) yang sudah tidak ditulis sejak FE-01 — form akan selalu
  kosong. Diganti memanggil `getLead(id)` + `listOutlets(ownerId)` langsung ke backend.
- Testing: e2e baru untuk create→edit→soft-delete dan akses Trash.

## Completed

- [x] `app/lib/api/owners.ts` — 7 fungsi baru, mengikuti pola `apiFetch` yang sudah ada.
- [x] `app/lib/api/leads.ts` — 6 fungsi baru + 3 tipe (`InteractionItem`, `TrainingItem`, `ClosingItem`).
- [x] `app/lib/api/catalog.ts` — modul baru, 3 fungsi.
- [x] 5 halaman pemanggil dimigrasikan, seluruh perbedaan bentuk data disesuaikan (lihat "Bug
      Ditemukan" untuk daftar lengkap).
- [x] `app/lib/api.ts` dihapus untuk kedua kalinya, kali ini dikonfirmasi tanpa pemanggil tersisa
      (`grep -rl 'from "@/app/lib/api"'` → kosong) sebelum penghapusan.
- [x] Tabel utama: Tambah Owner, Edit, Hapus (soft-delete), link Trash — seluruhnya digate
      `can("owners.manage", permissions)`.
- [x] Mode edit `form/page.tsx` diperbaiki: `getLead()` + `listOutlets()` menggantikan pembacaan
      localStorage yang sudah basi.
- [x] Vitest: **27/27 tetap hijau** (tidak ada regresi; tidak ada logic baru yang cukup non-trivial
      untuk unit test tambahan — fungsi API baru adalah pemanggil `apiFetch` tipis, polanya sudah
      diuji lewat fungsi sejenis di FE-01).
- [x] Playwright: **9/9 hijau** — 7 test FE-01 (2 di antaranya diperbarui: 1 karena perilaku FE-01
      "read-only" sudah tidak berlaku, 1 karena race kondisi test paralel) + 2 test FE-02 baru
      (`e2e/data-kelolaan-crud.spec.ts`: create→edit→soft-delete penuh, akses Trash).
- [x] `npm run lint`: 0 masalah baru di seluruh file yang disentuh/dibuat sprint ini (diverifikasi
      dengan skrip pembanding per-file yang sama dipakai FE-01).
- [x] `npm run build`: **berhasil penuh** (exit 0, 39/39 halaman ter-generate) — bug pra-eksisting
      `paket-langganan/delete` yang diflag FE-01 sebagai out-of-scope carry-over sudah tidak lagi
      menggagalkan build (kemungkinan diperbaiki commit lain di luar sprint ini; tidak disentuh
      sengaja oleh FE-02).

## Not Completed / Carry Over

- **Autofill "kodeOwner" saat mengetik** (`getOwnerProfileByKodeOwner` di `form/page.tsx`) masih
  bergantung cache `localStorage` yang sudah basi — terdegradasi diam-diam (autofill tidak pernah
  aktif, tapi tidak crash). Fitur UX terpisah dari CRUD inti; butuh desain ulang sebagai pencarian API
  live (debounced `listOwners({code})`), bukan migrasi mekanis. Carry-over ke sprint berikutnya yang
  menyentuh area ini.
  - Item: autofill kodeOwner berbasis API.
  - Penyebab: di luar scope Bagian A (migrasi auth) maupun Bagian B (wiring CRUD tabel utama);
    ditemukan sebagai efek samping investigasi, bukan tujuan sprint.
  - Estimasi ulang: 0.5–1 hari, dijadwalkan bersamaan dengan sprint FE berikutnya yang menyentuh
    `form/page.tsx`.
- Bulk assign PIC/supervisor dari tabel utama belum disambungkan (fungsi `assignSupervisor` sudah ada
  di client, tapi UI-nya belum — di luar scope Bagian B yang fokus CRUD owner/outlet dasar per
  `FRONTEND_PLAN_SPRINT.md` FE-02).

## Demo Evidence

- **Halaman yang didemokan**: `/menu/data-kelolaan` (tabel + Tambah/Edit/Hapus), `/menu/data-kelolaan/form`
  (create & edit), `/menu/data-kelolaan/trash` (akses link).
- **Skenario**: lihat `README.md` di folder ini untuk request/response nyata dan detail e2e.
- **Backend**: worktree terisolasi baru `piposmart_fe02_backend` pada commit `a5799c2` ("Sprint 13"),
  database `piposmart_fe02`, port `8092` — worktree FE-01 sebelumnya (`piposmart_fe01_backend`)
  ditemukan sudah terhapus fisik (kemungkinan dibersihkan sesi lain) saat sprint ini dimulai, dibuat
  ulang dari commit terbaru. Tree utama `backend_crm_piposmart` sedang dipakai sesi paralel lain di
  port 8080 (`test_piposmart`) — tidak disentuh, konsisten dengan kebiasaan isolasi sejak FE-01/Sprint 12.

## Quality

- **Unit test (Vitest)**: 27/27 lulus (tidak berubah dari FE-01 — tidak ada regresi).
- **E2E (Playwright)**: 9/9 lulus — `e2e/auth.spec.ts` (3), `e2e/data-kelolaan.spec.ts` (4, 1 diperbarui
  isinya + 1 diperbaiki agar tidak bergantung urutan baris), `e2e/data-kelolaan-crud.spec.ts` (2, baru).
- **Lint**: 0 masalah baru di file yang disentuh (total project tidak berubah, 116 problems, seluruhnya
  pra-eksisting di modul yang tidak disentuh sprint ini — sama seperti kondisi sebelum Bagian A/B).
- **Build**: berhasil penuh (lihat "Completed").
- **Defect terbuka**: autofill kodeOwner terdegradasi diam-diam (lihat Not Completed).

## Bug Ditemukan & Diperbaiki Selama Sprint

1. **Konflik git ter-commit di `app/layout.tsx`** — lihat "Catatan Penting" di atas.
2. **Bentuk data tidak konsisten antara `app/lib/api.ts` lama dan konvensi `app/lib/api/*` baru** —
   `createOwner` lama mengembalikan amplop `{data, meta}` (call site baca `.data.id`), yang baru
   unwrap langsung (`Owner`) — call site disesuaikan (`createdOwner.id`). `fetchOwnerOutlets`/`getLeads`
   lama unwrap ke array bentar, `listOutlets`/`listLeads` baru mengembalikan `PaginatedList<T>`
   (`{items, pagination}`) — seluruh call site disesuaikan mengambil `.items`.
3. **Kontradiksi logika pra-eksisting di `form/page.tsx`** — gate akses picker supervisor
   mensyaratkan role Admin/Developer/Direktur (tidak pernah termasuk Supervisor), tapi ada cabang kode
   di dalamnya yang mengecek `role === "Supervisor"` — cabang itu sebenarnya tidak pernah tercapai
   sejak awal. TypeScript (setelah migrasi ke `normalizeRole()` yang bertipe ketat) menangkap ini
   sebagai error compile (`no overlap`). Diperbaiki dengan menghapus cabang mati, bukan mengubah
   perilaku (dicatat, bukan "diperbaiki" — di luar scope menebak niat bisnis yang sebenarnya).
4. **Mode edit form.tsx kehilangan sumber data** — lihat "Committed Deliverables" Bagian B. Ditemukan
   lewat analisis kode sebelum implementasi (bukan lewat kegagalan produksi), sesuai keputusan
   stakeholder untuk memperbaikinya di sprint ini juga.
5. **Validasi outlet gagal diam-diam saat submit edit** — dua penyebab berlapis, keduanya ditemukan
   lewat e2e (bukan tebakan):
   - Field tunggal `outlet`/`noHpOutlet` (dipakai validasi wajib-isi) tidak disinkronkan dengan baris
     pertama `outletRows` saat prefill dari API — hanya array-nya yang diisi.
   - **Backend menyimpan/mengembalikan nomor telepon TANPA prefix `+`** (mis. `"6281200000099"`),
     sementara validasi `isValidInternationalPhone` di frontend mensyaratkan format `+62...`. Prefill
     dari `getLead()`/`listOutlets()` perlu menormalisasi (`ensurePlusPrefix`) sebelum mengisi form —
     kalau tidak, submit tertahan validasi tanpa pesan error yang terlihat (form pakai `alert()`
     native untuk sukses/gagal, validasi inline tidak memicu alert sama sekali).
6. **`alert()` native, bukan elemen DOM** — `form/page.tsx` melapor sukses/gagal lewat `window.alert()`
   bawaan browser. E2e awal memakai `page.getByText(/berhasil.../)` yang tidak akan pernah menemukan
   apa pun (alert tidak masuk DOM). Diperbaiki dengan `page.on("dialog", ...)` handler + verifikasi
   via redirect URL setelah alert diterima (`router.push` yang mengikuti setiap alert sukses).
7. **Race kondisi antar-test paralel** — test FE-01 (`data-kelolaan.spec.ts`) mengasumsikan baris
   PERTAMA tabel selalu berkode `OWN-xxxxx` (data seed). Begitu test CRUD baru (FE-02) berjalan
   *paralel* dan membuat owner baru dengan kode `E2Exxxxxxxx`, asumsi urutan itu tidak lagi berlaku.
   Diperbaiki: assertion memeriksa ADA baris yang cocok pola kode nyata (bukan baris pertama secara
   spesifik), menerima kedua pola kode.
8. **Worktree backend FE-01 (`piposmart_fe01_backend`) terhapus fisik** antar-sesi (referensi git masih
   ada, ditandai `prunable`) — dibuat ulang dari commit terbaru (`a5799c2`, sudah termasuk Sprint 13
   backend yang rupanya selesai di sesi paralel sejak FE-01 dilaporkan).

## Impediments

- Worktree backend FE-01 hilang, perlu dibuat ulang dari nol (migrate+seed) — menambah ~5 menit di awal
  sprint, tidak mengubah rencana.
- Debugging kegagalan e2e edit membutuhkan 5 iterasi (lihat Bug #5) — masing-masing butuh restart
  server/backend dan menjalankan ulang skenario penuh (~30-40 detik per iterasi), karena `alert()`
  native menyembunyikan pesan error asli sampai dialog handler ditambahkan.

## Risiko Baru

- **Risiko**: kontrak telepon backend (tanpa `+`) vs validasi frontend (butuh `+`) tidak terdokumentasi
  di manapun — modul lain yang menampilkan/mengedit nomor telepon dari API berpotensi kena bug yang
  sama, tersembunyi sampai ada e2e test yang menguji round-trip edit.
  **Dampak**: submit form gagal diam-diam (validasi inline, tanpa alert) di modul manapun yang
  melakukan pola serupa (ambil dari API → prefill form → validasi format lokal).
  **Mitigasi**: pola `ensurePlusPrefix` di sprint ini bisa dijadikan helper bersama (`app/lib/phone.ts`)
  kalau modul lain butuh hal serupa — belum diekstrak sprint ini karena baru satu titik pakai.
  **Owner**: dibahas saat sprint berikutnya menyentuh form dengan field telepon dari API.
- **Risiko**: `getSupervisorList` tetap hack sisi-klien dengan fallback dummy hardcode
  ("Budi (Supervisor Dummy)"). **Dampak**: picker supervisor bisa menampilkan data palsu kalau tidak
  ada supervisor yang pernah di-assign ke lead manapun. **Mitigasi**: sudah ada sejak sebelum sprint
  ini (bukan regresi), backend perlu endpoint `/api/v1/supervisors` resmi. **Owner**: backlog backend.

## Keputusan yang Dibutuhkan

1. Apakah autofill kodeOwner (carry-over) masuk sprint FE berikutnya, atau dijadwalkan terpisah?
2. Konfirmasi ke tim backend: apakah normalisasi nomor telepon (strip `+`) adalah perilaku yang
   disengaja/permanen, supaya frontend bisa menstandardisasi helper `ensurePlusPrefix` alih-alih
   menambal per-titik-pakai.

## Rencana Sprint Berikutnya (FE-03)

Sesuai `FRONTEND_PLAN_SPRINT.md`:

1. Call/Chat/Remark (skor 0-3)/Training memakai data & aturan stage nyata dari backend — modul
   `call/page.tsx` dan `remark-*/page.tsx` sudah tersambung API (Bagian A sprint ini), tapi alur
   Remark 0-3 dan validasi stage-nya sendiri belum diverifikasi end-to-end.
2. Tindak lanjuti carry-over autofill kodeOwner (lihat "Not Completed").
3. Pertimbangkan ekstraksi helper `ensurePlusPrefix` bersama jika FE-03 menyentuh field telepon lain.
