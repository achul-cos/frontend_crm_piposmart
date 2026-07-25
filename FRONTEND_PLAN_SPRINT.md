# Roadmap Sprint Frontend CRM Piposmart

## Ringkasan

- Durasi Sprint: 1 minggu.
- Stakeholder: Developer, Project Manager, CTO.
- Frontend: Next.js 16 (App Router) + React 19 + Tailwind CSS v4, tanpa component library (Tailwind
  murni). Backend: `backend_crm_piposmart` (Go/Gin/MySQL), roadmap resmi di `BACKEND_PLAN_SPRINT.md`
  (repo terpisah, `../BACKEND_PLAN_SPRINT.md`).
- Setiap sprint didemokan **di browser** terhadap instance backend yang benar-benar berjalan (bukan
  cuma Swagger/OpenAPI) — Definition of Done tidak terpenuhi kalau cuma lulus test otomatis tanpa
  verifikasi manual.
- Dokumen ini adalah padanan `BACKEND_PLAN_SPRINT.md` untuk sisi frontend, dengan siklus kerja dan
  format laporan yang sengaja disamakan supaya kedua project bisa dilaporkan ke stakeholder yang sama
  dengan bahasa yang konsisten — tapi disesuaikan di titik-titik yang memang berbeda cara kerjanya.

## Mengapa Frontend Butuh Roadmap Terpisah dari Backend

Backend berjalan di atas roadmap 18-sprint yang dikunci sejak awal. Frontend baru mulai integrasi nyata
belakangan dan saat ini **tertinggal jauh** dari progress backend (lihat Baseline di bawah) — sehingga
frontend butuh serangkaian sprint "catch-up" dulu sebelum bisa berjalan selaras (1 sprint di belakang)
mengikuti sprint backend yang baru. Sprint frontend diberi nomor independen (`FE-01`, `FE-02`, ...),
bukan mengikuti nomor Sprint backend 1-18, tapi **setiap sprint FE-XX secara eksplisit mencantumkan
target Sprint/domain backend yang disasar** supaya keterlacakan dua arah selalu jelas.

## Baseline / Kondisi Saat Ini

**Superseded** — snapshot pra-FE-01 (ditulis 25 Juli 2026 pagi) sudah dipindahkan seluruhnya ke
`docs/sprint-fe-01/sprint-fe-01.md`. FE-01 sudah **selesai (GREEN)** pada hari yang sama: arsitektur BFF
yang tadinya berstatus "orphaned" kini disambungkan penuh (auth `localStorage` lama sudah dibongkar
total), Vitest (27 test) + Playwright (7 test e2e terhadap backend nyata) terpasang dan hijau, dan
Kelolaan Customer sudah membaca data live dari `GET /api/v1/leads`. Detail lengkap — termasuk temuan
signifikan (bug pra-eksisting yang menggagalkan `npm run build` sejak sebelum FE-01, di luar scope
sprint ini) dan bug yang ditemukan/diperbaiki selama sprint — ada di laporan sprint tersebut, bukan
diulang di sini supaya tidak ada dua sumber kebenaran yang bisa saling menyimpang.

Baseline untuk **FE-02** (mulai dari sini): modul `data-kelolaan` sudah baca data asli tapi masih
**read-only**; CRUD owner/outlet, create lead, dan assign/release PIC masih memakai UI lama
(`app/menu/data-kelolaan/_legacy/`, tidak lagi ter-routing, disimpan sebagai referensi). Lihat
"Rencana Sprint Berikutnya" di `docs/sprint-fe-01/sprint-fe-01.md` untuk daftar tindak lanjut konkret.

## Keputusan Teknis yang Dikunci

- Penomoran sprint: `FE-01`, `FE-02`, ... independen dari nomor Sprint backend, tapi setiap sprint
  mencantumkan target Sprint/domain backend yang disasar (lihat tabel Roadmap Catch-up).
- Auth resmi: pola BFF + refresh token httpOnly cookie + access token in-memory (arsitektur orphaned
  yang sudah ada) — auth `localStorage` token mentah dinyatakan **deprecated**, dibongkar total di FE-01,
  bukan dipertahankan sebagai fallback.
- Stack testing: **Vitest + React Testing Library** untuk unit/komponen, **Playwright** untuk e2e/
  critical-path yang dijalankan terhadap instance backend nyata (bukan mock) — dipasang di FE-01, tidak
  ada sebelumnya.
- Praktik isolasi dev: saat sprint berpotensi bentrok dengan pekerjaan backend paralel, jalankan backend
  dari worktree terisolasi dengan port & database sendiri, arahkan `.env.local` ke situ — pola yang
  sudah dirintis (`.env.local` saat ini mengarah ke port 8091/db `piposmart_fe01`), dijadikan praktik
  standar, mencerminkan cara backend Sprint 12 mengisolasi diri dari Sprint 11c yang berjalan paralel.
- Kode mati (`app/lib/api.ts`, dan variabel env yang tidak lagi dipakai seperti `NEXT_PUBLIC_API_URL`)
  dihapus, bukan dibiarkan menumpuk sebagai referensi basi.
- Tidak menambah component library (MUI/Ant/shadcn) — tetap Tailwind murni sesuai arah desain yang
  sudah berjalan, kecuali ada kebutuhan konkret yang muncul di sprint mendatang (keputusan ulang saat
  itu terjadi, bukan diputuskan preventif sekarang).

## Siklus Sprint (Sprint Lifecycle)

Setiap sprint FE-XX mengikuti 11 tahap berikut, dari persiapan sampai jadi input sprint berikutnya.
Kolom kanan menandai mana yang murni direplikasi dari kebiasaan backend dan mana yang tambahan khas
frontend (karena frontend adalah *consumer* API yang berubah tiap minggu, bukan pemilik kontraknya).

| # | Tahap | Apa yang dilakukan |
|---|---|---|
| 1 | **Persiapan sprint** | Cek status Sprint backend terbaru (`BACKEND_PLAN_SPRINT.md` + laporan sprint terakhirnya) dan tarik `openapi.yaml` versi terbaru. Siapkan instance backend terisolasi (worktree+port+DB) bila sprint ini berpotensi bentrok dengan pekerjaan backend paralel. |
| 2 | **Review sprint sebelumnya** | Baca `docs/sprint-fe-XX/README.md` sprint FE sebelumnya, terutama bagian *Not Completed / Carry Over*. |
| 3 | **Audit on-track vs roadmap sendiri** | Bandingkan hasil sprint FE sebelumnya terhadap dokumen ini (`FRONTEND_PLAN_SPRINT.md`) — ada scope creep (mengerjakan sprint yang belum gilirannya) atau under-delivery (DoD tidak benar-benar terpenuhi)? Pola sama seperti `docs/sprint-12/ADDENDUM_roadmap_audit.md` di backend. |
| 4 | **Review kesesuaian dengan backend** *(khas frontend — tidak ada padanan langsung di backend)* | Cross-check implementasi FE sprint sebelumnya terhadap `openapi.yaml` dan kode handler backend **yang berlaku sekarang**, bukan asumsi lama. Backend berubah tiap minggu (contoh nyata: field `commission_rule_id`/`tier_ordinal`/`active_payout_id` baru ditambah ke `PartnerCommissionResponse` hari ini) — field/enum/error code yang dipakai FE minggu lalu bisa sudah berubah atau bertambah. |
| 5 | **Perencanaan implementasi sprint** | Tentukan Sprint Goal, Committed Deliverables, dan Definition of Done ala backend (lihat Global DoD di bawah); petakan tiap deliverable ke endpoint backend spesifik yang akan dikonsumsi. |
| 6 | **Implementasi** | Tulis kode. |
| 7 | **Pengujian, testing, validasi, verifikasi** | Vitest (unit/komponen) + Playwright (e2e path kritis) berjalan terhadap backend nyata, **plus verifikasi manual di browser** — jalankan `npm run dev`, coba golden path & edge case, sebelum melaporkan selesai. Test otomatis lulus saja tidak cukup untuk menutup sprint. |
| 8 | **Dokumentasi & pelaporan** | Tulis `docs/sprint-fe-XX/README.md` (dan `sprint-fe-XX.md` bila perlu detail teknis terpisah) memakai format laporan di bawah — identik dengan backend. |
| 9 | **Evaluasi/audit implementasi vs on-track** | Ulangi tahap 3 & 4, kali ini terhadap hasil sprint yang **baru saja selesai** — temuannya mengisi bagian laporan. |
| 10 | **Penyesuaian** | Perbaiki temuan audit yang murah/cepat pada hari yang sama (mencerminkan cara fix concurrency `partner_assignments` langsung dikerjakan begitu ditemukan, bukan ditunda). Temuan yang lebih besar masuk backlog resmi di laporan. |
| 11 | **Catatan & evaluasi untuk sprint berikutnya** | Bagian "Rencana Sprint Berikutnya" & "Keputusan yang Dibutuhkan" di laporan — otomatis jadi bahan tahap 1 siklus berikutnya. |

## Roadmap Catch-up

FE-01 didetailkan penuh karena itu yang akan dikerjakan berikutnya. FE-02 dan seterusnya digambarkan
level milestone dulu (goal/deliverable detail ditulis saat gilirannya tiba lewat tahap 5 siklus di
atas) — kerangka besarnya sudah dikunci di sini, isinya hidup per-sprint, sama seperti roadmap backend.

| Sprint | Fokus | Target Backend |
|---|---|---|
| **FE-01** | Landasan: commit & sambungkan arsitektur BFF/session/RBAC yang sudah ada (bukan bangun baru — 90% sudah jadi, tinggal disambung & dibersihkan); bongkar total auth `localStorage` lama; pasang Vitest + Playwright; hapus kode mati (`app/lib/api.ts`) & rapikan env var yang tumpang tindih (`NEXT_PUBLIC_API_URL` vs `NEXT_PUBLIC_BACKEND_API_URL`) | Sprint 1-3 (Fondasi, Auth & RBAC) |
| FE-02 | Sambungkan modul `data-kelolaan` (owner/outlet/lead) ke data nyata, ganti seluruh dummy generator | Sprint 4-5 |
| FE-03 | Call/Chat/Remark (skor 0-3)/Training memakai data & aturan stage nyata dari backend | Sprint 6 |
| FE-04 | Katalog Paket/Plan/Promosi (`paket-langganan`) memakai data nyata, bukan `paket-langganan-data.ts`/`promo-data.ts` statis | Sprint 7 |
| FE-05 | Closing & Laporan Penjualan (`laporan-penjualan`) memakai data nyata | Sprint 8 |
| FE-06 | Modul Wallet/Payment — **belum ada UI sama sekali**, dibangun baru | Sprint 9 |
| FE-07 | Subscription/Order/Reconciliation — UI baru | Sprint 10 |
| FE-08 | Modul Partner/PIC/Referral — UI baru | Sprint 11 |
| FE-09 | Modul Commission/Payout — UI baru, termasuk TIER commission & payout batch (`docs/sprint-12/ADDENDUM_02_commission_rules_payouts.md` di backend) | Sprint 12 + addendum |
| FE-10+ | Mulai mengikuti sprint backend yang sedang berjalan (Target/KPI, Import Excel, Dashboard/Reporting, dst.) — dari titik ini FE idealnya 1 sprint di belakang backend, bukan lagi mode catch-up | Sprint 13+ |

## Rencana Per Sprint

### FE-01 — Landasan: BFF Architecture, Auth, Testing Stack

**Sprint Goal**: Frontend dapat login lewat BFF dengan session management aman, dan testing infrastructure (Vitest + Playwright) terpasang.

**Deliverable**:

- Commit dan sambungkan arsitektur BFF/session/RBAC yang sudah orphaned (`app/api/auth/*`, `app/lib/auth/session.tsx`, `app/lib/api/client.ts`).
- Bongkar total auth `localStorage` lama di `app/layout.tsx` dan `app/auth/login/page.tsx`.
- Ganti `layout.tsx` route guard dengan server-side `proxy.ts` redirect berbasis cookie httpOnly.
- Update `README.md`: dokumentasi auth BFF, environment setup, testing infrastruktur.
- Pasang **Vitest + React Testing Library** untuk unit/komponen test, dengan example test file.
- Pasang **Playwright** untuk e2e test, dengan critical-path test (login → dashboard).
- Hapus kode mati: `app/lib/api.ts`, update env var (`NEXT_PUBLIC_API_URL` → `NEXT_PUBLIC_BACKEND_API_URL` konsisten).
- Commit semua perubahan ke feature branch, buat PR untuk review.

**Demo**:

```text
npm run dev
1. Akses http://localhost:3000/auth/login → redirect ke login form (tidak ada flash)
2. Login sebagai Admin → SessionProvider berhasil init, redirect ke dashboard
3. Refresh halaman → tetap logged in (session persisten via cookie)
4. Logout → redirect ke /auth/login
5. npm test → Vitest test lulus
6. npm run test:e2e → Playwright critical-path test lulus
```

**Definition of Done**:

- Tidak ada dua jalur auth berjalan paralel — auth `localStorage` benar-benar dihapus atau dibuat deprecated.
- `SessionProvider` (BFF pattern) adalah satu-satunya auth mechanism di `app/layout.tsx`.
- Refresh token disimpan **httpOnly cookie**, access token **hanya di memory** (`useRef`).
- Endpoint `app/api/auth/login`, `app/api/auth/logout`, `app/api/auth/refresh` tersambung ke backend.
- `npm run build` dan `npm run lint` bersih.
- Example Vitest test dan Playwright test ada dan lulus.
- `README.md` updated dengan dev setup, auth flow, testing commands.
- Tidak ada console error/warning di golden path (login → dashboard → logout).

**Risiko**: BFF route handlers sudah ada tapi belum terintegrasi — potensi ada bug di mana mereka hanya partial tested. Mitigasi: jalankan manual smoke test login/logout sebelum merge.

---

### FE-02 — Data-Kelolaan: Owner, Outlet, Lead

**Sprint Goal**: Modul `data-kelolaan` terkoneksi ke API backend nyata untuk owner/outlet/lead, dummy data generator dihapus.

**Deliverable**:

- Ganti `generateDummyOwners()` dengan panggilan `GET /api/v1/owners` via `app/lib/api/owners.ts`.
- Ganti `generateDummyTransactions()` dengan panggilan `GET /api/v1/customer-leads` + pagination.
- Implementasi owner/outlet/lead search/filter menggunakan backend query param (`?search=`, `?status=`, `?page=`).
- Tabel responsif tetap, tapi data benar-benar dari backend.
- Update action buttons (add/edit/delete owner, add/edit outlet) untuk actual API calls (POST/PATCH/DELETE).
- Wrapper API baru di `app/lib/api/`: mungkin perlu `UpdateOwner`, `CreateOutlet`, `DeleteOutlet` dll.
- Testing: Playwright test untuk list view, create, edit, delete flow terhadap backend nyata.

**Demo**:

```text
npm run dev (backend berjalan di port 8080)
1. Buka /menu/data-kelolaan → tabel owner terisi dari API, bukan dummy
2. Filter/search owner → request ke backend dengan param
3. Buat owner baru → POST /api/v1/owners, terlihat di tabel
4. Edit outlet → PATCH /api/v1/outlets/{id}, update langsung
5. Soft-delete owner → DELETE /api/v1/owners/{id}, tidak lagi terlihat di list default
```

**Definition of Done**:

- Tidak ada hardcoded dummy data (`generateDummyOwners`, `INITIAL_OWNERS`, dll).
- Semua data source benar-benar dari backend endpoint, tidak dari file statis.
- Pagination backend diimplementasikan di FE (bukan load-all).
- Error handling: API error (500/404/validation) ditampilkan di UI.
- Playwright test login → list → create → edit → delete → logout lulus.
- RBAC permission dicheck: hanya ADMIN/SUPERVISOR bisa create/edit owner.
- `npm run lint`, `npm run build` bersih.

---

### FE-03 — Call, Chat, Remark, Training

**Sprint Goal**: Call/Chat/Remark skor 0-3 dan training terhubung ke backend dengan stage policy yang benar.

**Deliverable**:

- Ganti dummy call/chat/remark logic dengan API calls.
- Wrapper API: `createInteraction()`, `listInteractions()`, `createTraining()`, `listTrainings()`.
- UI tetap sama, tapi state sync dengan backend.
- Validasi remark 0 → assignment dilepas (stage jadi INVALID).
- Validasi remark 3 → wajib ada closing (backend rule).
- Training optional untuk remark 2, wajib untuk remark 3+.
- Styling & responsif tetap dari work existing.

**Demo**:

```text
1. View lead detail → lihat interaction history dari backend
2. Catat remark 0 → stage jadi INVALID, assignment dilepas terlihat di UI
3. Catat remark 1 → stage POSSIBLE, no action needed
4. Catat remark 2 dengan training → save ke backend, training record terlihat
5. Catat remark 3 tanpa closing → validation error dari backend
```

**Definition of Done**:

- Stage policy (INVALID/POSSIBLE/POTENTIAL) selaras dengan backend aturan (Sprint 6).
- Interaction append-only (no edit/delete, hanya create).
- Training schedule/reschedule/complete tersambung ke backend.
- Permission: Sales hanya bisa input remark untuk lead miliknya.
- Playwright test: full call/chat/training workflow.

---

### FE-04 — Paket, Plan, Promosi

**Sprint Goal**: Master paket, plan, dan promo menggunakan data backend, bukan `paket-langganan-data.ts` statis.

**Deliverable**:

- Ganti `INITIAL_PAKETS`, `INITIAL_MASTER_PROMOS` dengan API GET calls.
- Wrapper API: `listSubscriptionPackages()`, `listPlans()`, `listPromotions()`, `calculatePromoDiscount()`.
- Promo eligibility logic: backend menentukan promo mana yang valid untuk plan/paket mana (lihat Sprint 7).
- Form promo popup tetap sama design, tapi data real-time dari backend.
- Snapshot harga saat closing (jangan menggunakan harga live).

**Demo**:

```text
1. Buka /menu/paket-langganan → paket list dari API, bukan hardcoded
2. Pilih paket → show plan options dari backend
3. Input tenor dan benefit → calculate final price via backend
4. Promo dropdown hanya show eligible promo (backend filter)
5. Promo discount dihitung backend, terlihat di preview
```

**Definition of Done**:

- Benefit free duration, discount, device, consumable semua dari backend snapshot.
- Promo eligibility filter sesuai effective_from/effective_to backend.
- Pricing tetap decimal (tidak float), snapshot saat closing.
- Permission: Admin/Supervisor bisa buat promo (ini mungkin delayed ke FE-08 kalau scope).

---

### FE-05 — Closing & Laporan Penjualan

**Sprint Goal**: Sales dapat membuat closing dengan snapshot paket/plan/promo, laporan penjualan real-time dari backend.

**Deliverable**:

- Closing form: pilih lead → pilih paket → pilih plan → pilih promo (dari eligible list) → submit.
- Backend snapshot paket/plan/promo saat closing dibuat.
- Status closing: PENDING_RECONCILIATION → CONFIRMED → REJECTED (lihat dari backend).
- Laporan penjualan (`laporan-penjualan`): filter by date range, Sales, stage, status.
- Export CSV/XLSX dari laporan (via backend `/api/v1/.../export`).
- Chart/grafik tetap pakai recharts, data real-time dari backend.

**Demo**:

```text
1. Pilih lead dengan remark 3 → form closing
2. Pilih paket → show plan, tenor, benefit dari backend
3. Pilih promo → discount dihitung, final amount terlihat
4. Submit closing → status PENDING_RECONCILIATION (reconciliation manual di backend)
5. Laporan penjualan: filter by bulan → closing list with status
6. Export → download CSV dengan closing details
```

**Definition of Done**:

- Final amount tidak negatif, snapshot saat create.
- Sales hanya bisa closing untuk lead miliknya.
- Status CONFIRMED hanya tampil setelah backend reconciliation.
- Chart menampilkan closing/revenue/target live dari backend.
- Playwright test: closing flow sampai laporan export.

---

### FE-06 — Wallet & Payment

**Sprint Goal**: Modul Wallet & Payment dibangun baru untuk top-up dan balance tracking.

**Deliverable**:

- UI Wallet: balance view, top-up form, transaction history.
- Top-up flow: input nominal → submit → backend generate reference code.
- Transaction ledger: credit (top-up), debit (subscription), adjustment (admin only).
- Balance accuracy: FE harus cocok dengan backend balance calculation.
- Export transaction history.

**Demo**:

```text
1. Lihat wallet balance → query dari backend
2. Top-up Rp 500.000 → generate reference code
3. Terlihat di transaction history: +Rp 500.000 credit
4. Kirim subscription order → debit otomatis, balance berkurang
5. Admin adjustment → terlihat di history dengan note
```

**Definition of Done**:

- Balance tidak bisa negatif.
- Top-up hanya Admin/Owner yang bisa submit (backend permission).
- Transaction append-only.
- Concurrency: multi-tab open wallet tidak double-debit.
- Playwright test: full top-up → order flow.

---

### FE-07 — Subscription, Order, Reconciliation

**Sprint Goal**: Subscription order dan reconciliation terhubung ke backend wallet debit & ledger.

**Deliverable**:

- Order form: pilih paket → tenor → promo → submit order.
- Wallet debit saat order creation.
- Subscription active/expired view.
- Reconciliation queue: Admin bisa approve/reject hanging transaction.
- Subscription end date calculation (fixed 30-day per period).

**Demo**:

```text
1. Top-up (FE-06) → balance = Rp 500.000
2. Buat order paket 3 bulan @ Rp 150.000/bulan → total Rp 450.000
3. Wallet debit otomatis, balance sisa Rp 50.000
4. Subscription status: ACTIVE sampai 90 hari
5. Reconciliation queue: jika ada unmatched closing, show di admin dashboard
```

**Definition of Done**:

- Order debit, subscription activation, wallet ledger atomic (all or nothing).
- Subscription end date = start date + (tenure × 30 hari).
- Reconciliation confirmed → KPI/commission activated.
- Permission: Sales create order, Admin/Supervisor reconcile.

---

### FE-08 — Partner, PIC, Referral (UI baru)

**Sprint Goal**: Modul Partner management (assign PIC, view referral, track partner interaction) dibangun baru.

**Deliverable**:

- Partner list (by type/status).
- Partner detail: PIC assignment, one-active constraint (dari backend).
- Referral list: customer yang direferensikan partner.
- Partner call/interaction tracking.
- Permission matrix: Sales manage partner kelolaannya, Supervisor override.

**Demo**:

```text
1. Admin/Supervisor view partner list → assign PIC Sales ke partner
2. Concurrent assign test: 2 Supervisor assign PIC ke partner sama → hanya 1 yang jadi active (backend row-lock)
3. Partner detail: view referral list (customer lead yang dikasih partner)
4. Log call ke partner → terlihat di interaction history
```

**Definition of Done**:

- Satu PIC aktif per partner (backend enforce via UNIQUE constraint).
- Sales hanya lihat partner kelolaannya.
- Referral tidak bisa diduplikasi ke lead sama.
- Concurrent assign serialized (backend row-lock tested di Playwright).

---

### FE-09 — Commission, Payout (UI baru)

**Sprint Goal**: Modul Commission & Payout dibangun untuk TIER mode, effective-date rules, dan batch payout.

**Deliverable**:

- Commission rule config UI: create TIER/PERCENTAGE/FIXED rule, set effective_from/effective_to, package scope optional.
- Commission tier config: input min/max closing bracket, rate per tier.
- Commission list: view earning per partner, status PENDING/APPROVED/PAID.
- Payout list: batch APPROVED commission ke payout.
- Payout action: approve (PENDING→PAID), cancel (soft-release).
- RBAC: Admin/Supervisor manage rule, Admin only approve payout pay.

**Demo** (sesuai Sprint 12 addendum):

```text
1. Create TIER rule: 1-3 closing→2%, 4+→5%, effective from date tertentu
2. Sync commission → lihat escalation: closing 1-3 = Rp 20k, closing 4+ = Rp 50k
3. List commission: filter by partner, status APPROVED
4. Create payout: batch 2 commission APPROVED → payout total Rp 70k
5. Try individual pay commission in payout → error 409 (double-pay guard)
6. Approve payout → commission status jadi PAID
7. Cancel payout → commission back to APPROVED (soft-release)
```

**Definition of Done**:

- TIER escalation sesuai monthly closing ordinal (backend logic).
- Effective-date + package-scope precedence benar (package > type-wide, terbaru menang).
- Double-pay guard: commission tidak bisa dibayar individual kalau sudah di payout.
- Payout soft-release: cancel payout → commission tetap APPROVED, releasable.
- Playwright test: full rule/commission/payout workflow.
- Matching openapi.yaml v0.13.0-sprint-12-addendum (commission_rule_id, tier_ordinal, active_payout_id fields).

**Dependency**: Backend Commission/Payout endpoint stable dan sesuai openapi.yaml.

---

### FE-10+ — Mengikuti Sprint Backend Berjalan

Mulai FE-10, frontend mengikuti sprint backend terbaru dengan lag 1 sprint:

- **FE-10** (Backend Sprint 13): Target, KPI, Ranking UI.
- **FE-11** (Backend Sprint 14): Import Excel framework & customer data.
- **FE-12** (Backend Sprint 15): Import transaksi/mitra/sales data.
- **FE-13** (Backend Sprint 16): Dashboard, Reporting, Export (XLSX/CSV).
- **FE-14+**: Maintenance mode, refinement, UAT.

Tiap sprint FE-10+ tetap mengikuti siklus 11 tahap, terutama tahap 4 (cross-check backend kontrak terkini).

## Global Definition of Done

Sebuah item sprint FE hanya dianggap selesai jika seluruh berikut terpenuhi (kalau belum, statusnya
tetap "Not Completed / Carry Over" di laporan, tidak dianggap selesai):

- Acceptance criteria terpenuhi **dan** terverifikasi manual di browser (golden path + edge case),
  bukan cuma lulus test otomatis.
- Unit/komponen test (Vitest) untuk logic non-trivial, dan e2e path kritis (Playwright) lulus.
- Tidak ada data dummy/mock tersisa untuk fitur yang dinyatakan "sudah wired" ke backend.
- Bentuk request/response yang dipakai FE cocok persis dengan `openapi.yaml`/kode handler backend
  **pada saat sprint ini berjalan** (bukan asumsi dari sprint sebelumnya — lihat tahap 4 siklus).
- Auth/session lewat pola BFF yang disahkan (cookie httpOnly + in-memory token), bukan token mentah
  di `localStorage`.
- UI yang bergantung permission memakai string permission backend yang benar (`app/lib/auth/rbac.ts`
  dicocokkan ke `permissions` yang benar-benar dikirim backend saat login).
- Responsif diperiksa di breakpoint mobile/tablet/desktop; tidak ada console error/warning di golden path.
- `npm run lint` dan `npm run build` bersih.
- Dokumentasi sprint (`docs/sprint-fe-XX/`) selesai ditulis sebelum sprint ditutup.

## Format Laporan Sprint

Format ini **identik** dengan backend (`BACKEND_PLAN_SPRINT.md`) supaya stakeholder (Developer, Project
Manager, CTO) menerima laporan dengan struktur yang sama dari kedua sisi project — hanya bagian "Demo
Evidence" diperluas untuk frontend.

```text
Sprint:
Periode:
Status: GREEN / AMBER / RED

Sprint Goal:
- ...

Committed Deliverables:
- ...

Completed:
- ...

Not Completed / Carry Over:
- Item:
- Penyebab:
- Estimasi ulang:

Demo Evidence:
- Halaman/route yang didemokan:
- Skenario browser yang dicoba (golden path + edge case):
- Backend yang dipakai (port/DB, versi openapi.yaml/sprint backend saat itu):
- Screenshot/rekaman/test report:

Quality:
- Unit/komponen test (Vitest):
- E2E test (Playwright):
- Lint & build:
- Defect terbuka:

Impediments:
- ...

Risiko Baru:
- Risiko:
- Dampak:
- Mitigasi:
- Owner:

Keputusan yang Dibutuhkan:
- ...

Rencana Sprint Berikutnya:
- ...
```

Status:
- `GREEN`: Sprint Goal tercapai dan tidak ada risiko besar.
- `AMBER`: goal utama tercapai sebagian atau ada dependency (biasanya perubahan kontrak backend) yang
  mengancam sprint berikutnya.
- `RED`: Sprint Goal gagal atau ada blocker eksternal/teknis kritis (mis. backend belum ship endpoint
  yang dibutuhkan).

## Risiko Roadmap

- **Drift kontrak backend-frontend**: backend berubah tiap minggu (kadang di hari yang sama, seperti
  penambahan `commission_rule_id` hari ini). Mitigasi: tahap 4 & 9 siklus sprint wajib, bukan opsional.
- **Auth ganda**: dua arsitektur auth sempat berjalan paralel di kode. Mitigasi: FE-01 harus benar-benar
  membongkar yang lama, bukan cuma menambah yang baru sebagai opsi — tidak boleh ada dua jalur auth
  hidup bersamaan setelah FE-01 selesai.
- **Testing debt**: dimulai dari nol. Mitigasi: dipasang sejak FE-01, bukan ditunda — makin lama
  ditunda makin mahal (pelajaran dari backend yang sudah punya kebiasaan test sejak awal).
- **Kapasitas**: kalau frontend dikerjakan 1 orang seperti backend, jaga agar tidak mengerjakan
  paralel >1 sprint FE sekaligus — potong scope per sprint, bukan kompres jadwal.
- **Sinkronisasi jadwal dengan backend**: kalau backend rilis fitur besar (mis. Sprint 17 seeder besar)
  sementara FE masih di FE-01, jangan terburu ikut — tetap ikuti urutan catch-up di atas kecuali ada
  keputusan eksplisit stakeholder untuk mengubah prioritas.
