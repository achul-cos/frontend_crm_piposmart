import { expect, type Page, test } from "@playwright/test";

/**
 * Critical path CRUD Kelolaan Customer (Sprint FE-02): create → edit →
 * soft-delete lewat tabel utama.
 *
 * Menguji alur tulis yang baru disambungkan sprint ini — sebelumnya (FE-01)
 * tabel hanya baca. Membutuhkan backend nyata dengan permission
 * `owners.manage` (akun demo Admin).
 *
 * Selector memakai `input[name=...]` untuk field `FormInput` (punya atribut
 * `name`) dan `title`/`placeholder` untuk `PhoneInput` (label & input adalah
 * elemen bersaudara, bukan bersarang — `getByLabel` tidak dapat menemukannya;
 * dicatat sebagai gap aksesibilitas pra-eksisting di laporan sprint, bukan
 * diperbaiki di sini karena di luar scope migrasi auth/CRUD).
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin.001@demo.piposmart.id";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Password123!";
const PHONE_INPUT_TITLE = "Pilih negara lalu isi nomor telepon";

async function login(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /login sekarang/i }).click();
  await expect(page).toHaveURL("/");
}

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

async function searchOwner(page: Page, code: string) {
  await page.goto("/menu/data-kelolaan");
  const search = page.getByPlaceholder(/cari kode/i);
  await search.fill(code);
  await search.press("Enter");
}

test("Admin dapat membuat, mengedit, lalu soft-delete owner", async ({
  page,
}) => {
  // form/page.tsx melapor sukses/gagal lewat `alert()` bawaan browser, bukan
  // elemen DOM — harus diterima lewat dialog handler, `getByText` tidak akan
  // pernah menemukannya.
  page.on("dialog", (dialog) => void dialog.accept());

  await login(page);
  await dismissSopIfPresent(page);

  const uniqueSuffix = Date.now().toString().slice(-8);
  const ownerCode = `E2E${uniqueSuffix}`;
  const ownerName = `Owner E2E ${uniqueSuffix}`;
  const ownerNameEdited = `${ownerName} Diedit`;

  // --- CREATE ---
  await page.goto("/menu/data-kelolaan");
  await page.getByRole("link", { name: /tambah owner/i }).click();
  await expect(page).toHaveURL(/\/menu\/data-kelolaan\/form$/);

  await page.locator('input[name="kodeOwner"]').fill(ownerCode);
  await page.locator('input[name="namaOwner"]').fill(ownerName);
  await page.locator('input[name="projectBrand"]').fill("Brand E2E");

  // Mengisi kodeOwner memicu autofill sisi-klien yang otomatis membuat satu
  // baris outlet kosong (lihat `handleInputChange` di form/page.tsx) — jadi
  // pada titik ini sudah ada 2 PhoneInput (owner + outlet), bukan 1.
  const phoneInputs = page.getByTitle(PHONE_INPUT_TITLE);
  await expect(phoneInputs).toHaveCount(2);
  await phoneInputs.nth(0).fill("81200000099");

  await page
    .getByPlaceholder("Contoh: Azzahra Laundry Cabang 1")
    .fill("Outlet E2E 1");
  await phoneInputs.nth(1).fill("81200000098");

  await page.getByRole("button", { name: /^tambah owner$/i }).click();
  // Setelah alert diterima, form.tsx me-redirect kembali ke tabel utama.
  await expect(page).toHaveURL(/\/menu\/data-kelolaan$/, { timeout: 15_000 });

  // --- Verifikasi muncul di tabel ---
  await searchOwner(page, ownerCode);
  const row = page.locator("tbody tr").filter({ hasText: ownerCode });
  await expect(row).toBeVisible({ timeout: 10_000 });
  await expect(row).toContainText(ownerName);

  // --- EDIT ---
  await row.getByTitle("Edit profil owner").click();
  await expect(page).toHaveURL(/\/menu\/data-kelolaan\/form\?id=\d+$/);

  const namaOwnerInput = page.locator('input[name="namaOwner"]');
  await expect(namaOwnerInput).toHaveValue(ownerName, { timeout: 10_000 });

  // Baris outlet diisi lewat panggilan `listOutlets` terpisah (async, setelah
  // `getLead` resolve) — tunggu sampai benar-benar terisi, kalau tidak submit
  // akan tertahan validasi "Outlet wajib diisi" secara diam-diam (tanpa alert).
  await expect(
    page.getByPlaceholder("Contoh: Azzahra Laundry Cabang 1"),
  ).toHaveValue("Outlet E2E 1", { timeout: 10_000 });

  await namaOwnerInput.fill(ownerNameEdited);
  await page.getByRole("button", { name: /simpan perubahan/i }).click();
  await expect(page).toHaveURL(/\/menu\/data-kelolaan$/, { timeout: 15_000 });

  await searchOwner(page, ownerCode);
  await expect(
    page.locator("tbody tr").filter({ hasText: ownerCode }),
  ).toContainText(ownerNameEdited, { timeout: 10_000 });

  // --- SOFT DELETE ---
  const editedRow = page.locator("tbody tr").filter({ hasText: ownerCode });
  await editedRow.getByTitle(/hapus owner/i).click();
  await page.getByRole("button", { name: /^hapus$/i }).click();
  await expect(page.getByText("Hapus Owner?")).not.toBeVisible({
    timeout: 10_000,
  });

  await searchOwner(page, ownerCode);
  await expect(page.getByText("Tidak ada lead")).toBeVisible({
    timeout: 10_000,
  });
});

test("Trash dapat diakses dari tabel utama", async ({ page }) => {
  await login(page);
  await dismissSopIfPresent(page);
  await page.goto("/menu/data-kelolaan");

  await page.getByRole("link", { name: /trash/i }).click();
  await expect(page).toHaveURL(/\/menu\/data-kelolaan\/trash$/);
});
