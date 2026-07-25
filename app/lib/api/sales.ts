import { apiFetch, buildQuery } from "./client";

export type SalesUser = {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Daftar akun Sales, dipakai untuk dropdown PIC.
 *
 * Menggantikan konstanta `LIST_PIC` di
 * `app/menu/data-kelolaan/dummy/page.tsx` yang berisi nama karangan.
 * Backend hanya menerima satu parameter: `status` (`internal/identity/handler.go`).
 */
export function listSales(
  status?: string,
): Promise<{ items: SalesUser[]; total: number }> {
  // `/sales` mengembalikan `{items, total}` tanpa objek pagination — berbeda
  // dari `/owners` dan `/leads` yang memakai `{items, pagination}`.
  return apiFetch<{ items: SalesUser[]; total: number }>(
    `/sales${buildQuery({ status })}`,
  );
}
