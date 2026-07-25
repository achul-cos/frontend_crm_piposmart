import { describe, expect, it } from "vitest";

import { can, canSeeMenu, normalizeRole, roleLabel } from "./rbac";

describe("normalizeRole", () => {
  it("mengenali role ADMIN/SUPERVISOR/SALES persis dari backend", () => {
    expect(normalizeRole("ADMIN")).toBe("ADMIN");
    expect(normalizeRole("SUPERVISOR")).toBe("SUPERVISOR");
    expect(normalizeRole("SALES")).toBe("SALES");
  });

  it("mengembalikan UNKNOWN untuk role yang tidak dikenal, bukan menebak", () => {
    expect(normalizeRole("DEVELOPER")).toBe("UNKNOWN");
    expect(normalizeRole(undefined)).toBe("UNKNOWN");
  });
});

describe("canSeeMenu", () => {
  it("mengizinkan menu tanpa syarat permission untuk siapa pun yang login", () => {
    expect(canSeeMenu("/", [])).toBe(true);
    expect(canSeeMenu("/menu/sop", [])).toBe(true);
  });

  it("menahan menu yang mensyaratkan permission spesifik", () => {
    expect(canSeeMenu("/menu/data-kelolaan", [])).toBe(false);
    expect(canSeeMenu("/menu/data-kelolaan", ["leads.work"])).toBe(true);
  });

  it("menahan Laporan Penjualan tanpa reports.read_all maupun reports.read_own", () => {
    expect(canSeeMenu("/menu/laporan-penjualan", ["leads.work"])).toBe(false);
  });

  it("mengizinkan Laporan Penjualan dengan reports.read_all ATAU reports.read_own", () => {
    // Sesuai seed backend: Sales hanya punya reports.read_own, Admin/Supervisor
    // punya reports.read_all — keduanya berhak melihat menunya (cakupan data
    // di-scope oleh backend, bukan oleh gate menu ini).
    expect(
      canSeeMenu("/menu/laporan-penjualan", ["reports.read_all"]),
    ).toBe(true);
    expect(
      canSeeMenu("/menu/laporan-penjualan", ["leads.work", "reports.read_own"]),
    ).toBe(true);
  });
});

describe("can", () => {
  it("memeriksa keanggotaan permission secara eksak", () => {
    expect(can("owners.manage", ["owners.manage", "leads.work"])).toBe(true);
    expect(can("owners.manage", ["leads.work"])).toBe(false);
  });
});

describe("roleLabel", () => {
  it("memberi label Indonesia untuk role yang dikenal", () => {
    expect(roleLabel("SUPERVISOR")).toBe("Supervisor");
  });

  it("menampilkan nilai asli untuk role tak dikenal, bukan label default palsu", () => {
    expect(roleLabel("DEVELOPER")).toBe("DEVELOPER");
  });
});
