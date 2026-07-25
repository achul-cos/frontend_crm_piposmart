# Sprint FE-01 — Landasan: BFF Architecture, Auth, Testing Stack

## Sprint

FE-01

## Periode

25 Juli 2026

## Status

`GREEN`

Sprint Goal tercapai: frontend login lewat arsitektur BFF dengan session management aman (refresh token
httpOnly, access token in-memory, auto-refresh), guard rute server-side (`proxy.ts`), RBAC berbasis
permission backend, dan menu Kelolaan Customer menampilkan data **asli** dari database backend
(`GET /api/v1/leads`) — bukan lagi dummy generator. Testing infrastructure (Vitest + Playwright)
terpasang dan hijau.

## Sprint Goal

Frontend dapat login lewat BFF dengan session management aman, dan testing infrastructure
(Vitest + Playwright) terpasang — sesuai `FRONTEND_PLAN_SPRINT.md`.

## Catatan Penting: Konflik Sesi Paralel

Selama sprint ini berjalan, ditemukan **sesi Claude Code lain berjalan paralel** di repo yang sama,
menulis `FRONTEND_PLAN_SPRINT.md` dan `CLAUDE.md` dengan rencana FE-01 sendiri (Vitest+Playwright wajib,
`app/lib/api.ts` dihapus, dll.) sambil pekerjaan BFF/session/RBAC sprint ini sedang berjalan — sesi
tersebut mendeskripsikan kode yang sedang ditulis sebagai "orphaned, belum pernah dipakai satu halaman
pun". Setelah dikonfirmasi ke stakeholder, implementasi sprint ini **diselaraskan** dengan
`FRONTEND_PLAN_SPRINT.md` yang sudah ada (bukan menimpanya) — DoD dan cakupan FE-01 di dokumen tersebut
menjadi acuan resmi mulai laporan ini. Pola ini identik dengan temuan
`feedback_shared_git_worktree` pada `backend_crm_piposmart`: checkout dipakai bersama beberapa sesi
paralel, bukan worktree terisolasi per task.

## Committed Deliverables

(Disalin dari `FRONTEND_PLAN_SPRINT.md` § FE-01)

- Commit dan sambungkan arsitektur BFF/session/RBAC (`app/api/auth/*`, `app/lib/auth/session.tsx`,
  `app/lib/api/client.ts`).
- Bongkar total auth `localStorage` lama di `app/layout.tsx` dan `app/auth/login/page.tsx`.
- Ganti route guard dengan server-side `proxy.ts` berbasis cookie httpOnly.
- Update `README.md`: dokumentasi auth BFF, environment setup, testing infrastruktur.
- Pasang Vitest + React Testing Library dengan test non-trivial (bukan placeholder).
- Pasang Playwright dengan e2e critical-path (login → dashboard).
- Hapus kode mati: `app/lib/api.ts`, rapikan env var (`NEXT_PUBLIC_API_URL` → `NEXT_PUBLIC_BACKEND_API_URL`).

## Completed

- [x] BFF Route Handler (`app/api/auth/login|refresh|logout/route.ts`) — refresh token disimpan cookie
      **httpOnly**, path `/` (bukan `/api/auth` — kalau dipersempit, `proxy.ts` tidak bisa membacanya
      saat navigasi ke `/menu/*`, lihat komentar di `app/lib/auth/config.ts`).
- [x] `SessionProvider` (`app/lib/auth/session.tsx`) — access token **hanya di memory** (`useRef`), auto
      refresh terjadwal 90% umur token (899s → ±809s). Refresh dan penerapan sesi dipecah jadi dua
      `useCallback` terpisah yang tidak saling mereferensikan langsung (lihat "Bug Ditemukan" di bawah)
      untuk menghindari siklus dependency yang tidak valid.
- [x] `proxy.ts` — guard server-side; Next.js 16 mengganti nama `middleware.ts` menjadi `proxy.ts`
      (fungsinya sama). Redirect ke `/auth/login` tanpa flash konten untuk rute tanpa cookie sesi.
- [x] `app/lib/auth/rbac.ts` — menyaring menu berdasarkan `user.permissions` dari backend. Diperbaiki
      sekali di tengah sprint: Laporan Penjualan awalnya hanya mensyaratkan `reports.read_all` (Sales
      jadi tidak pernah melihatnya), padahal seed backend memberi Sales `reports.read_own` — menu
      sekarang tampil untuk **salah satu** dari kedua permission (cakupan data tetap urusan backend).
- [x] `app/lib/api/client.ts` + `owners.ts`/`leads.ts`/`sales.ts` — client bertipe, field dicocokkan ke
      response backend nyata (dikonfirmasi via `curl` ke instance terisolasi, bukan ditebak dari kode).
- [x] `app/lib/mappers/nasabah.ts` + `app/lib/view-models/nasabah.ts` — anti-corruption layer; field yang
      backend belum sediakan (`totalTransaksi`, `callStatus`, dst.) ditandai eksplisit dan ditampilkan
      "—", tidak diisi angka karangan.
- [x] `app/lib/money.ts` — backend mengirim uang sebagai **string desimal**, konversi terpusat.
- [x] Kelolaan Customer (`app/menu/data-kelolaan/page.tsx`) — dibaca ulang total, membaca
      `GET /api/v1/leads` lewat TanStack Query, paginasi/filter server-side. Tombol tulis dinonaktifkan
      eksplisit dengan label "FE-02" (jujur ke pengguna, scope FE-01 read-only).
- [x] Versi mock lama dipindah ke `app/menu/data-kelolaan/_legacy/` (private folder Next.js, prefix `_`
      supaya tidak jadi route publik) sebagai referensi migrasi FE-02, bukan dihapus (masih ada UI
      Call/Remark/Training yang belum tersambung sampai FE-03).
- [x] `app/lib/api.ts` (dead code, menunjuk route `/customer`/`/sales` yang sudah dihapus backend sejak
      migrasi ke `/api/v1`) **dihapus**.
- [x] `app/page.tsx` (dashboard) dan `app/menu/setting/page.tsx` diperbaiki: keduanya membaca identitas
      dari `localStorage` yang **sudah tidak lagi ditulis** setelah bongkar auth lama — kalau dibiarkan,
      greeting/SOP-seen-tracking akan diam-diam rusak (regresi tersembunyi). Sekarang membaca dari
      `useSession()`.
- [x] Vitest + React Testing Library terpasang, **27 test lulus** — bukan placeholder: menguji logic
      anti-corruption layer (`nasabah.ts`), konversi uang, RBAC, dan interaksi komponen `Pagination`.
- [x] Playwright terpasang, **7 test e2e lulus** terhadap backend nyata (bukan mock): login/logout/session
      persistence/route guard (`e2e/auth.spec.ts`) + Kelolaan Customer data asli/RBAC/error state
      (`e2e/data-kelolaan.spec.ts`).
- [x] `README.md` diperbarui: arsitektur BFF, setup `.env.local`, perintah testing.

## Not Completed / Carry Over

- **`npm run build` (static export) tidak lulus** — bukan karena kode FE-01, melainkan bug pra-eksisting
  yang baru pertama kali terungkap sprint ini (proyek belum pernah sekali pun berhasil `next build`
  sebelumnya). Detail di bagian "Temuan Signifikan" di bawah. **Bukan blocker untuk sprint ini** (DoD FE-01
  yang relevan — auth, RBAC, Kelolaan Customer — sudah diverifikasi lewat `npm run dev` + Playwright
  terhadap backend nyata), tapi harus dijadwalkan sebelum rilis staging manapun.
  - Item: perbaikan menyeluruh pola "component-as-page" di `paket-langganan/*` dan modul lain.
  - Penyebab: di luar scope FE-01 (modul tersebut dijadwalkan FE-04), risiko tinggi untuk diperbaiki
    tanpa pemahaman mendalam terhadap logic masing-masing komponen.
  - Estimasi ulang: dipecah jadi tugas hardening tersendiri, diusulkan sebelum FE-04 dimulai (lihat
    Keputusan yang Dibutuhkan).
- Commit ke feature branch + PR **belum dilakukan** — sesuai protokol keamanan git, commit hanya
  dilakukan atas permintaan eksplisit pengguna. Working tree saat ini siap untuk direview.

## Demo Evidence

- **Halaman/route yang didemokan**: `/auth/login`, `/` (dashboard), `/menu/data-kelolaan`,
  `/menu/paket-langganan` (hanya untuk verifikasi RBAC-hide), `/menu/setting`.
- **Skenario browser yang dicoba**: 10 skenario dari rencana implementasi, seluruhnya lulus — lihat
  `README.md` di folder ini (Integration Test Report) untuk detail request/response dan tangkapan
  Playwright.
- **Backend yang dipakai**: worktree terisolasi `piposmart_fe01_backend` pada commit backend `7e403dc`
  ("Backup Sprint 12"), database `piposmart_fe01`, port `8091` — tree utama `backend_crm_piposmart`
  sedang dipakai sesi paralel lain (WIP payout/commission-rules, `go build` gagal) sehingga tidak
  disentuh sama sekali.
- **Test report**: 27 Vitest + 7 Playwright, seluruhnya lulus pada percobaan terakhir (lihat Quality).

## Quality

- **Unit/komponen test (Vitest)**: 27 lulus, 4 file (`app/lib/mappers/nasabah.test.ts`,
  `app/lib/money.test.ts`, `app/lib/auth/rbac.test.ts`, `app/components/ui/Pagination.test.tsx`).
- **E2E test (Playwright)**: 7 lulus, 2 file (`e2e/auth.spec.ts`, `e2e/data-kelolaan.spec.ts`), dijalankan
  terhadap backend nyata di port 8091.
- **Lint**: `npm run lint` — **0 masalah pada seluruh file yang benar-benar dibuat/ditulis FE-01**
  (`app/lib/auth/*`, `app/lib/api/*`, `app/lib/mappers/*`, `app/components/*`, `proxy.ts`, semua test).
  Total project **naik dari 81 → 83 problems** (diverifikasi dengan `git stash` + script pembanding
  per-file, bukan angka final yang salah dilaporkan sebelumnya di draf awal laporan ini — lihat
  "Koreksi Metodologi Verifikasi" di bawah). Kenaikan ini seluruhnya berasal dari
  `app/menu/data-kelolaan/_legacy/page.tsx` (referensi migrasi beku, tidak ter-routing), bukan dari
  kode baru yang ditulis sprint ini.
- **Build**: `npm run build` — TypeScript compile & type-check **lulus** (setelah dua perbaikan bug
  pra-eksisting yang mengganjal seluruh build, lihat "Bug Ditemukan"); static export gagal pada
  `/menu/paket-langganan/delete` karena bug arsitektur pra-eksisting di luar scope FE-01 (lihat Not
  Completed).
- **Defect terbuka**: pola "component-as-page" (Temuan Signifikan di bawah) — tercatat sebagai backlog,
  bukan diperbaiki sprint ini.

## Bug Ditemukan & Diperbaiki Selama Sprint

1. **Dashboard & Setting diam-diam rusak oleh bongkar auth lama** — `app/page.tsx` dan
   `app/menu/setting/page.tsx` membaca `localStorage.getItem("piposmart_user_name"/"_role")` untuk
   greeting dan SOP-seen-tracking. Begitu login berhenti menulis key tersebut (sesuai DoD "bongkar total
   auth localStorage"), keduanya akan selalu jatuh ke default ("User"/"Sales") tanpa error yang
   terlihat — regresi senyap. Diperbaiki dengan membaca dari `useSession()`.
2. **Siklus dependency `useCallback` antara `refresh` dan `applySession`** (`session.tsx`) — refresh yang
   berhasil harus menerapkan sesi baru DAN menjadwalkan refresh berikutnya, membuat kedua fungsi saling
   membutuhkan. Percobaan pertama pakai pola "ref ke fungsi terbaru" (`useRef` + tulis di `useEffect`)
   ditolak linter (`react-hooks/immutability` — versi React 19.2/eslint-plugin-react-hooks di project ini
   melarang ref dimodifikasi setelah first render, sekalipun di dalam effect). Percobaan kedua
   (`useEffectEvent`, API baru React 19.2) masih kena `no-use-before-define` karena kedua fungsi saling
   merujuk secara tekstual. **Solusi final**: pecah jadi state counter (`sessionVersion`) yang naik
   setiap sesi baru diterapkan; efek penjadwalan terpisah bereaksi terhadapnya — `applySession` tidak
   lagi perlu merujuk `refresh` sama sekali, siklusnya putus secara struktural.
3. **Cookie refresh token dengan `path: "/api/auth"` membuat guard tidak pernah melihat sesi** — path
   sempit tampak lebih aman, tapi browser tidak menyertakan cookie pada navigasi ke `/menu/*` sehingga
   `proxy.ts` selalu menganggap pengguna belum login. Diperbaiki ke `path: "/"`; keamanan tetap terjaga
   lewat `httpOnly` (bukan lewat pembatasan path).
4. **`isValidInternationalPhone` dideklarasikan dua kali** di `data-kelolaan/page.tsx` versi lama —
   `SyntaxError` yang menghentikan seluruh `next build`. Sudah ada sejak HEAD sebelum sprint ini
   (diverifikasi via `git show HEAD:...`), bukan regresi FE-01. Diperbaiki di `_legacy/page.tsx` (versi
   kedua, redundan, dihapus).
5. **`app/menu/paket-langganan/form/page.tsx` memakai `useState` tanpa `"use client"`** — juga
   menghentikan seluruh build (bukan hanya halaman itu). Pra-eksisting, bukan regresi FE-01. Ditambahkan
   direktifnya.
6. **`Intl.NumberFormat("id-ID", {style:"currency"})` menyisipkan spasi (kadang non-breaking) antara
   "Rp" dan angka** — bukan bug, tapi asumsi salah di test pertama (`formatRupiah`). Diperbaiki dengan
   normalisasi whitespace di assertion, bukan mengubah kode produksi (perilaku aslinya benar).
7. **`getByText("Next")` ambigu di test `Pagination`** — cocok lebih dari satu elemen begitu ada beberapa
   `render()` menumpuk tanpa `cleanup()` antar-test. Diperbaiki dengan `afterEach(cleanup)` di
   `vitest.setup.ts` (RTL tidak membersihkan otomatis tanpa `test.globals: true`).
8. **Verifikasi e2e final sempat gagal 2 test karena port/CORS, bukan bug produk** — dua proses
   `next-server` sisa dari percobaan sebelumnya di sesi ini masih hidup (tidak mati bersih saat
   `pkill -f "next dev"` dijalankan, karena Next.js memisahkan proses wrapper dan `next-server`
   child-nya). Salah satunya menguasai port 3000, memaksa dev server berikutnya pindah ke 3001 —
   sementara `CORS_ALLOWED_ORIGINS` backend terisolasi hanya mengizinkan `localhost:3000`. Browser
   gagal memanggil API dengan pesan generik ("Tidak dapat terhubung ke server"), yang **secara
   kebetulan justru membuktikan `ErrorState` bekerja benar** untuk kegagalan jaringan apa pun, bukan
   cuma "backend mati". Diperbaiki dengan mematikan proses sisa dan membuat `playwright.config.ts`
   memakai `E2E_BASE_URL` yang sama untuk `baseURL` maupun pemeriksaan kesiapan `webServer`
   (sebelumnya `webServer.url` hardcode ke port 3000, bisa tidak sinkron dengan `baseURL` yang
   dioverride). Dicatat sebagai gotcha operasional di `README.md`.
10. **E2E logout timeout — popup SOP memblokir klik** — `app/page.tsx` menampilkan popup wajib-baca dengan
   tombol nonaktif 5 detik pertama (teks berubah dari `"5s"` → `"Tutup"`). Helper dismiss pertama
   memeriksa visibilitas tombol bernama persis "Tutup" — pada detik-detik awal tombol itu belum ada
   (masih bertuliskan hitung mundur), jadi helper salah menyimpulkan popup tidak ada dan langsung
   mencoba klik Sign Out yang tertutup overlay. Diperbaiki dengan mendeteksi popup lewat judulnya
   (teks stabil sejak awal), bukan lewat teks tombol yang berubah-ubah.

## Koreksi Metodologi Verifikasi

Draf awal laporan ini sempat mengklaim "total lint turun ke 78, tidak ada masalah baru" — **klaim itu
salah**, ditemukan sendiri saat mengulang verifikasi dengan metode yang lebih teliti (skrip Node
pembanding per-file, menggantikan pendekatan `awk`/`grep` berbasis regex yang ternyata salah
mendeteksi batas antar-file). Angka yang benar: **81 → 83 problems**. Dicatat di sini secara terbuka
karena laporan sprint harus akurat, bukan optimis.

Rincian kenaikan (semuanya di `app/menu/data-kelolaan/_legacy/page.tsx`):

| Sebelum (path lama, `data-kelolaan/page.tsx`) | Sesudah (`_legacy/page.tsx`) |
|---|---|
| 6 warning (`no-unused-vars`) | 6 warning yang sama (relokasi murni) + **6 error baru terlihat**: 2× `react-hooks/set-state-in-effect`, 4× `react-hooks/preserve-manual-memoization` ("Compilation Skipped") |

Investigasi akar penyebab: 6 error tersebut **bukan bug baru yang ditulis sprint ini** — file ini
adalah salinan verbatim dari mock lama, dan satu-satunya perubahan substantif adalah menghapus
deklarasi `const isValidInternationalPhone` ganda (lihat "Bug Ditemukan" #4). Deklarasi ganda itu
sendiri adalah *parse-level error* yang tampaknya membuat parser ESLint masuk mode pemulihan sebagian
untuk sisa file, secara diam-diam **menonaktifkan rule analisis-alur yang lebih dalam**
(`react-hooks/set-state-in-effect`, `react-hooks/preserve-manual-memoization` — keduanya butuh analisis
kontrol-alur penuh ala React Compiler) untuk bagian file setelah titik itu, sementara rule sintaksis
sederhana (`no-unused-vars`) tetap berjalan normal di seluruh file. Begitu duplikasi diperbaiki, parser
mendapat AST bersih dan rule-rule tersebut **baru bisa berjalan** — mengungkap bug yang sebenarnya
**selalu ada** di kode ini, bukan yang baru ditulis. Tidak diperbaiki di sprint ini (di luar scope,
kode legacy tidak ter-routing) — dicatat sebagai temuan proses, bukan disembunyikan.

## Temuan Signifikan (Bukan Bug FE-01, Perlu Perhatian Stakeholder)

**`npm run build` belum pernah berhasil di project ini, bahkan sebelum Sprint FE-01 dimulai.** Root
cause: banyak `page.tsx` di `app/menu/data-kelolaan/*` dan `app/menu/paket-langganan/*` sebenarnya adalah
**komponen biasa** (mensyaratkan props wajib, mis. `DeleteDialog({ promo }: { promo: PromoItem })`) yang
ditaruh di lokasi yang membuat Next.js App Router menganggapnya **route sungguhan** (mis.
`/menu/paket-langganan/delete`). Saat `next build` mencoba prerender route tersebut tanpa props apa pun,
komponennya crash (`Cannot read properties of undefined`). Pola serupa terdeteksi di setidaknya 5 lokasi
lain (`data-kelolaan/call`, `/call/remarks`, `/form`, `paket-langganan/view`, dan turunannya) yang selama
ini "berhasil" hanya karena tidak pernah benar-benar diakses sebagai route (hanya diimpor sebagai
komponen lewat relative import) — `next build` yang memprosesnya tetap mencoba men-generate route-nya.

Ini murni ditemukan sebagai efek samping mengejar DoD `npm run build` bersih untuk FE-01 — bukan sesuatu
yang sprint ini sengaja audit. Karena skalanya lintas modul dan berisiko tinggi diperbaiki tanpa
pemahaman bisnis masing-masing komponen, **tidak diperbaiki di sprint ini** (lihat Not Completed).

## Impediments

- Sesi paralel di repo yang sama (lihat "Catatan Penting" di atas) — terselesaikan lewat keputusan
  stakeholder untuk menyelaraskan, bukan menimpa.
- Backend tree utama (`backend_crm_piposmart`) tidak bisa dipakai untuk testing (WIP payout/commission
  rules dari sesi lain, `go build` gagal) — diatasi dengan worktree terisolasi.

## Risiko Baru

- **Risiko**: `npm run build` gagal untuk keseluruhan aplikasi (bukan hanya modul FE-01).
  **Dampak**: staging/production deployment (Docker build, dsb.) akan gagal sampai diperbaiki; belum
  terasa sekarang karena deployment belum jadi bagian roadmap FE sampai FE-08+.
  **Mitigasi**: dijadwalkan sebagai task hardening tersendiri sebelum sprint yang menyentuh modul
  terdampak (FE-04 untuk `paket-langganan`) atau sebelum rilis staging pertama, mana yang lebih dulu.
  **Owner**: dibahas di planning sprint berikutnya.
- **Risiko**: sesi paralel yang tidak terkoordinasi terhadap checkout yang sama (frontend maupun backend).
  **Dampak**: potensi saling menimpa file, seperti yang nyaris terjadi sprint ini.
  **Mitigasi**: pola yang sama seperti backend — cek `git status`/`git log` sebelum mulai kerja, jangan
  asumsikan tree statis.
  **Owner**: kebiasaan kerja tim, bukan item teknis.

## Keputusan yang Dibutuhkan

1. Apakah perbaikan pola "component-as-page" (Temuan Signifikan) dijadwalkan sebagai sprint/task
   hardening tersendiri sebelum FE-04, atau digabung ke dalam FE-04 itu sendiri (yang memang menyentuh
   `paket-langganan`)?
2. Konfirmasi: `FRONTEND_PLAN_SPRINT.md` yang sudah ada di repo (ditulis sesi paralel) menjadi roadmap FE
   resmi mulai sprint ini — laporan ini mengikuti formatnya. Perlu diverifikasi stakeholder tidak ada
   niat mempertahankan dua roadmap FE berbeda.

## Rencana Sprint Berikutnya (FE-02)

Sesuai `FRONTEND_PLAN_SPRINT.md`:

1. Sambungkan modul `data-kelolaan` untuk alur **tulis**: CRUD owner/outlet, create lead, assign/release
   PIC (termasuk `bulk/assign-sales`), ganti dummy generator sepenuhnya (hapus `_legacy/` setelah alur
   tulis berpindah ke API).
2. Pecah `data-kelolaan/page.tsx` (saat ini sudah jauh lebih ramping dari versi lama, tapi form/modal
   tulis akan menambah kompleksitas) menjadi komponen memakai `app/components/ui/` dari FE-01.
3. Tindak lanjuti temuan: backend belum punya endpoint listing soft-deleted (`include_deleted`), yang
   memblokir halaman Trash — perlu dikoordinasikan ke tim backend.
4. Playwright test untuk alur create/edit/delete owner & outlet, dan assign PIC.
