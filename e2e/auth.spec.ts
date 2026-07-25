import { expect, type Page, test } from "@playwright/test";

/**
 * Critical path: login → dashboard → sesi bertahan → logout.
 *
 * Butuh backend nyata yang sedang berjalan (lihat README.md bagian Testing
 * untuk cara menyiapkan environment terisolasi) dengan akun demo dari
 * `go run . seed demo --preset=minimal`. Kredensial diambil dari env var
 * `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` supaya tidak hard-code akun demo
 * di source, dengan default yang cocok dengan seeder standar.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin.001@demo.piposmart.id";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Password123!";

async function login(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /login sekarang/i }).click();
  await expect(page).toHaveURL("/");
}

/**
 * Dashboard menampilkan popup SOP wajib-baca (`app/page.tsx`) pada kunjungan
 * pertama tiap sesi browser (dilacak via `sessionStorage`, bukan bug —
 * perilaku produk yang disengaja). Popup ini menutupi seluruh layar dan
 * memblokir klik ke elemen lain sampai dismiss, termasuk tombol Sign Out yang
 * dites di sini. Tombol "Tutup" nonaktif dan menampilkan hitung mundur
 * ("5s", "4s", ...) selama 5 detik pertama — deteksi kehadiran popup TIDAK
 * boleh bergantung pada teks tombol itu sendiri (masih berubah-ubah), jadi
 * dipakai judul popup yang teksnya stabil sejak awal muncul.
 */
async function dismissSopIfPresent(page: Page) {
  const heading = page.getByText("Baca SOP Sebelum Masuk Dashboard");

  if (!(await heading.isVisible().catch(() => false))) {
    return;
  }

  const closeButton = page.getByRole("button", { name: /^tutup$/i });
  await expect(closeButton).toBeEnabled({ timeout: 10_000 });
  await closeButton.click();
  await expect(heading).not.toBeVisible();
}

test("mengarahkan ke login saat mengakses halaman terproteksi tanpa sesi", async ({
  page,
}) => {
  await page.goto("/menu/data-kelolaan");
  await expect(page).toHaveURL(/\/auth\/login/);
});

test("login berhasil membawa ke dashboard, dan sesi bertahan setelah reload", async ({
  page,
}) => {
  await login(page);
  await dismissSopIfPresent(page);

  // Refresh token cookie httpOnly harus ada; ini bukti arsitektur BFF
  // benar-benar aktif, bukan sekadar redirect tanpa sesi.
  const cookies = await page.context().cookies();
  const refreshCookie = cookies.find((c) => c.name === "piposmart_rt");
  expect(refreshCookie).toBeTruthy();
  expect(refreshCookie?.httpOnly).toBe(true);

  // Reload harus tetap logged in (sesi dipulihkan lewat cookie, bukan
  // localStorage) — bukti utama Definition of Done "session persisten".
  await page.reload();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("Piposmart CRM")).toBeVisible();
});

test("logout menghapus sesi dan mengarahkan kembali ke login", async ({
  page,
}) => {
  await login(page);
  await dismissSopIfPresent(page);

  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/auth\/login/);

  // Setelah logout, cookie refresh token harus sudah dihapus.
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "piposmart_rt")).toBeUndefined();
});
