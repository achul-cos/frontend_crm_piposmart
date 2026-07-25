import { defineConfig, devices } from "@playwright/test";

/**
 * Konfigurasi Playwright untuk uji e2e path kritis.
 *
 * Dijalankan terhadap BACKEND SUNGGUHAN (bukan mock) — sesuai keputusan
 * `FRONTEND_PLAN_SPRINT.md`: "e2e/critical-path yang dijalankan terhadap
 * instance backend nyata". `webServer` di bawah menyalakan `next dev`;
 * backend disiapkan terpisah (lihat README.md bagian Testing) karena
 * siklus hidupnya (migrate + seed) di luar cakupan Playwright.
 */
// `E2E_BASE_URL` mengendalikan baseURL sekaligus URL yang diperiksa
// `webServer` di bawah — keduanya WAJIB port yang sama. Sebelumnya `webServer.url`
// hardcode ke 3000 sementara `baseURL` bisa dioverride sendiri; begitu port 3000
// terpakai proses lain (mis. sesi paralel), Playwright mengira dev server sudah
// siap padahal yang merespons proses asing itu, sementara test menavigasi ke
// port lain — dua sinyal kesiapan yang tidak sinkron.
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
