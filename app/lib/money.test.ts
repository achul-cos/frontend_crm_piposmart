import { describe, expect, it } from "vitest";

import { formatBackendMoney, formatRupiah, parseDecimal } from "./money";

describe("parseDecimal", () => {
  it("mengubah string desimal backend menjadi number", () => {
    expect(parseDecimal("3768703.00")).toBe(3768703);
  });

  it("mengembalikan null (bukan 0) untuk nilai yang tidak ada", () => {
    expect(parseDecimal(undefined)).toBeNull();
    expect(parseDecimal(null)).toBeNull();
    expect(parseDecimal("")).toBeNull();
  });

  it("mengembalikan null untuk string yang bukan angka, bukan NaN", () => {
    expect(parseDecimal("bukan-angka")).toBeNull();
  });
});

/**
 * `Intl.NumberFormat("id-ID", { style: "currency" })` menyisipkan spasi
 * (kadang non-breaking space, tergantung versi ICU runtime) antara "Rp" dan
 * angkanya. Dinormalisasi di sini supaya test tidak rapuh terhadap versi ICU.
 */
function normalizeSpaces(value: string): string {
  return value.replace(/\s/g, "");
}

describe("formatRupiah", () => {
  it("memformat angka sebagai rupiah tanpa desimal", () => {
    expect(normalizeSpaces(formatRupiah(3768703))).toBe("Rp3.768.703");
  });

  it("menampilkan tanda '—' untuk nilai yang tidak ada", () => {
    expect(formatRupiah(null)).toBe("—");
    expect(formatRupiah(undefined)).toBe("—");
  });
});

describe("formatBackendMoney", () => {
  it("menggabungkan parse + format dalam satu langkah", () => {
    expect(normalizeSpaces(formatBackendMoney("150000.00"))).toBe(
      "Rp150.000",
    );
    expect(formatBackendMoney(undefined)).toBe("—");
  });
});
