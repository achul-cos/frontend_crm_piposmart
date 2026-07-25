import { expect, type Page, test } from "@playwright/test";

/**
 * Critical path Kelolaan Customer (Sprint FE-01, read-only).
 *
 * Menguji bahwa tabel benar-benar membaca data ASLI dari backend
 * (`GET /api/v1/leads`), bukan dummy generator lama, dan bahwa RBAC menu
 * bekerja sesuai `permissions` yang dikirim backend saat login.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin.001@demo.piposmart.id";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "Password123!";
const SALES_EMAIL = process.env.E2E_SALES_EMAIL || "sales.001@demo.piposmart.id";
const SALES_PASSWORD = process.env.E2E_SALES_PASSWORD || "Password123!";

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
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

test("Kelolaan Customer menampilkan data lead asli dari backend, bukan dummy", async ({
  page,
  request,
}) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await dismissSopIfPresent(page);

  await page.goto("/menu/data-kelolaan");
  await expect(page.getByText("Data Live • API")).toBeVisible();

  // Baris pertama tabel harus tampil dan berisi kode lead nyata (pola
  // OWN-xxxxx-LEAD-xx dari seeder), bukan nama dummy generator lama.
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toBeVisible({ timeout: 10_000 });
  await expect(firstRow.getByText(/^OWN-\d+$/)).toBeVisible();

  // Bandingkan jumlah data di footer paginasi dengan total dari API langsung
  // (BFF tidak terlibat di jalur data — request ini menuju backend langsung).
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL_TEST ||
    "http://localhost:8091/api/v1";
  const loginResponse = await request.post(`${backendUrl}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const loginBody = await loginResponse.json();
  const leadsResponse = await request.get(`${backendUrl}/leads?page=1&limit=10`, {
    headers: { Authorization: `Bearer ${loginBody.data.access_token}` },
  });
  const leadsBody = await leadsResponse.json();

  await expect(
    page.getByText(`dari ${leadsBody.data.pagination.total} data`),
  ).toBeVisible();
});

test("tombol tulis di Kelolaan Customer dinonaktifkan (scope FE-01 read-only)", async ({
  page,
}) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await dismissSopIfPresent(page);
  await page.goto("/menu/data-kelolaan");

  await expect(page.locator("tbody tr").first()).toBeVisible({
    timeout: 10_000,
  });

  const fe02Badges = page.getByText("FE-02");
  await expect(fe02Badges.first()).toBeVisible();
});

test("Sales tidak melihat menu Paket Langganan (permission catalog.manage)", async ({
  page,
}) => {
  await login(page, SALES_EMAIL, SALES_PASSWORD);
  await dismissSopIfPresent(page);

  await expect(
    page.getByRole("link", { name: "Kelolaan Customer" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Paket Langganan" }),
  ).not.toBeVisible();
});

test("mematikan backend membuat tabel menampilkan ErrorState, bukan crash", async ({
  page,
  context,
}) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await dismissSopIfPresent(page);

  // Blokir seluruh request ke backend data (bukan ke Route Handler auth
  // lokal) untuk mensimulasikan backend mati, tanpa mematikan proses nyata.
  await context.route("**/localhost:8091/**", (route) => route.abort());

  await page.goto("/menu/data-kelolaan");
  await expect(page.getByText("Gagal memuat data")).toBeVisible({
    timeout: 10_000,
  });
});
