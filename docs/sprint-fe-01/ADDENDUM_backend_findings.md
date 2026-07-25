# Addendum — Temuan untuk Tim Backend (Sprint FE-01)

Bukan pekerjaan frontend, dicatat di sini agar masuk perencanaan sprint backend berikutnya.

## 1. `AUTH_COOKIE_NAME`/`AUTH_COOKIE_SECURE`/`AUTH_COOKIE_SAME_SITE` adalah dead config

`.env.example` backend (`backend_crm_piposmart/.env.example`) mendefinisikan tiga variabel ini sejak
Sprint 3, tapi pencarian `SetCookie`/`http.Cookie` di seluruh `internal/` menghasilkan **nol** — backend
tidak pernah benar-benar menetapkan cookie apa pun. Refresh token hanya dikirim di body JSON response
login/refresh.

**Dampak untuk FE-01**: tidak ada — arsitektur BFF yang dibangun sprint ini sengaja tidak bergantung pada
backend menetapkan cookie (Route Handler Next.js sendiri yang menaruh refresh token ke cookie httpOnly
setelah menerimanya dari body backend). Jadi ini **bukan blocker**, murni housekeeping: variabel
konfigurasi yang tidak pernah dipakai berisiko menyesatkan engineer berikutnya yang mengira backend
sudah menangani cookie.

**Rekomendasi**: hapus ketiga variabel dari `.env.example`, atau implementasikan kalau memang suatu saat
backend ingin menetapkan cookie sendiri (di luar kebutuhan sprint FE manapun saat ini).

## 2. Tidak ada endpoint untuk melihat data yang sudah di-soft-delete

`POST /owners/{id}/restore` dan `POST /owners/{id}/force` ada, tapi `GET /owners` **tidak punya**
parameter untuk melihat data yang sudah soft-deleted (`include_deleted`/`only_deleted`, atau semacamnya).

**Dampak untuk FE-01**: halaman **Trash** (`app/menu/data-kelolaan/trash`, saat ini masih di
`_legacy/`) tidak bisa diintegrasikan ke data asli sampai backend menyediakan cara membaca data
ter-soft-delete. Ditahan sebagai carry-over eksplisit (bukan diimplementasikan dengan data mock yang
disamarkan seolah nyata).

**Rekomendasi**: pertimbangkan parameter `status=deleted` (konsisten dengan pola `status` yang sudah ada
di beberapa list endpoint lain) pada `GET /owners`, atau endpoint terpisah `GET /owners/deleted`
(mengikuti bentuk `restore`/`force` yang sudah nested di bawah `/owners/{id}`, kemungkinan
`GET /owners/deleted` lebih konsisten sebagai list-level, bukan detail-level).

## 3. Nilai uang sebagai string desimal — sudah ditangani dengan benar di frontend, dicatat sebagai konfirmasi

Bukan gap, murni konfirmasi: `ClosingResponse.FinalAmount` dkk. dikirim sebagai `string` (bukan JSON
number), sesuai catatan `Global Definition of Done` roadmap backend ("Uang memakai decimal, bukan
`float64`"). Frontend FE-01 sudah menyesuaikan (`app/lib/money.ts`, `parseDecimal`) — dicatat di sini
supaya tim backend tahu kontrak ini sudah diverifikasi dipahami benar oleh sisi frontend, bukan asumsi
yang meleset seperti pada kasus lain.
