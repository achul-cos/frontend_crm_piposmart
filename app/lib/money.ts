/**
 * Penanganan nilai uang.
 *
 * Backend mengirim uang sebagai STRING desimal (mis. `"3768703.00"`), bukan
 * number — lihat `ClosingResponse.FinalAmount` di `internal/closing/types.go`.
 * Ini disengaja: di sisi Go nilainya decimal, dan mengirimkannya sebagai JSON
 * number akan melewati `float64` yang bisa menggeser digit terakhir.
 *
 * Konversi karena itu dipusatkan di sini, bukan ditebar sebagai `Number(...)`
 * di banyak halaman.
 */

/**
 * Ubah string desimal dari backend menjadi number.
 *
 * Mengembalikan `null` — bukan 0 — untuk nilai yang tidak ada atau tidak
 * valid, supaya UI dapat membedakan "nol rupiah" dari "tidak ada datanya".
 */
export function parseDecimal(value?: string | number | null): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

/** Format rupiah tanpa angka di belakang koma, sesuai gaya tampilan aplikasi. */
export function formatRupiah(value?: number | null): string {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format string desimal dari backend langsung menjadi rupiah. */
export function formatBackendMoney(value?: string | null): string {
  return formatRupiah(parseDecimal(value));
}
