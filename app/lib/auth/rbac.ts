/**
 * Peta hak akses frontend.
 *
 * Sumber kebenaran tetap backend — setiap response login memuat
 * `user.permissions` (mis. `owners.manage`, `leads.assign`, `leads.work`,
 * `reports.read_all`, `users.manage_sales`). Modul ini hanya memutuskan
 * apa yang layak DITAMPILKAN, supaya pengguna tidak diarahkan ke layar yang
 * ujungnya dijawab 403 oleh backend.
 *
 * Menyembunyikan menu bukan pengamanan. Pengamanan sesungguhnya ada di
 * backend, dan itu memang sudah diuji terpisah pada Sprint 3.
 */

export type Role = "ADMIN" | "SUPERVISOR" | "SALES" | "UNKNOWN";

export function normalizeRole(role?: string | null): Role {
  const value = String(role ?? "").toUpperCase();

  if (value === "ADMIN" || value === "SUPERVISOR" || value === "SALES") {
    return value;
  }

  return "UNKNOWN";
}

/**
 * Permission yang dibutuhkan agar sebuah menu tampil. Satu menu bisa
 * disyaratkan lebih dari satu permission (cukup salah satu) — mis. Laporan
 * Penjualan tetap tampil untuk Sales yang hanya punya `reports.read_own`
 * (lihat data seed: Sales = `["leads.work","reports.read_own"]`,
 * Supervisor/Admin = `[...,"reports.read_all",...]`). Cakupan datanya sendiri
 * (semua Sales vs. milik sendiri) adalah urusan backend saat halaman itu
 * disambungkan ke data asli (FE-04/FE-05), bukan urusan gate menu ini.
 * `null` berarti menu terbuka untuk semua pengguna yang sudah login.
 */
const MENU_PERMISSIONS: Record<string, string[] | null> = {
  "/": null,
  "/menu/sop": null,
  "/menu/data-kelolaan": ["leads.work"],
  "/menu/paket-langganan": ["catalog.manage"],
  "/menu/laporan-penjualan": ["reports.read_all", "reports.read_own"],
  "/menu/setting": null,
};

export function canSeeMenu(href: string, permissions: string[]): boolean {
  const required = MENU_PERMISSIONS[href];

  if (required === null || required === undefined) {
    return true;
  }

  return required.some((permission) => permissions.includes(permission));
}

export function can(permission: string, permissions: string[]): boolean {
  return permissions.includes(permission);
}

/** Label role untuk ditampilkan pada UI. */
export function roleLabel(role?: string | null): string {
  switch (normalizeRole(role)) {
    case "ADMIN":
      return "Admin";
    case "SUPERVISOR":
      return "Supervisor";
    case "SALES":
      return "Sales";
    default:
      return role || "Guest";
  }
}
