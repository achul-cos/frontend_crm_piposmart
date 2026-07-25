import { describe, expect, it } from "vitest";

import {
  displayValue,
  scoreToRemarkLabel,
  stageToStatusAkun,
  toNasabahItem,
  UNAVAILABLE_FIELDS,
} from "./nasabah";
import type { Lead } from "@/app/lib/api/leads";

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 4,
    code: "OWN-00004-LEAD-01",
    owner: {
      available: true,
      id: 4,
      code: "OWN-00004",
      name: "Owner Laundry 004",
      phone: "6281300200004",
      brand_name: "Laundry Cerah 004",
      province: "Jawa Timur",
      city: "Surabaya",
    },
    outlet_id: 6,
    current_owner_role: "SALES",
    active_sales: { id: 4, name: "Sales Demo 002", role: "SALES" },
    source_type: "DEMO_SEED",
    source_reference: "minimal-OWN-00004",
    stage: "NEW",
    status: "OPEN",
    current_score: 1,
    next_follow_up_at: "2026-08-01T00:00:00Z",
    created_at: "2026-07-25T01:03:52Z",
    updated_at: "2026-07-25T01:03:52Z",
    ...overrides,
  };
}

describe("stageToStatusAkun", () => {
  it("menerjemahkan seluruh nilai stage backend yang dikenal", () => {
    expect(stageToStatusAkun("NEW")).toBe("Baru");
    expect(stageToStatusAkun("POSSIBLE")).toBe("Kemungkinan Potensial");
    expect(stageToStatusAkun("POTENTIAL")).toBe("Potensial");
    expect(stageToStatusAkun("CLOSING")).toBe("Berlangganan");
    expect(stageToStatusAkun("INVALID")).toBe("Tidak Potensial");
  });

  it("mengembalikan nilai asli untuk stage yang tidak dikenal, bukan string kosong", () => {
    expect(stageToStatusAkun("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});

describe("scoreToRemarkLabel", () => {
  it("memetakan skor 0-3 ke label LIST_SKOR yang sama dipakai UI", () => {
    expect(scoreToRemarkLabel(0)).toBe("Tidak Potensial (0)");
    expect(scoreToRemarkLabel(3)).toBe("Langganan (3)");
  });

  it("mengembalikan string kosong untuk skor yang belum ada (bukan '0' palsu)", () => {
    expect(scoreToRemarkLabel(undefined)).toBe("");
    expect(scoreToRemarkLabel(null)).toBe("");
  });
});

describe("toNasabahItem", () => {
  it("menyusun identitas owner dan PIC dari response lead", () => {
    const item = toNasabahItem(makeLead(), 1);

    expect(item.kodeOwner).toBe("OWN-00004");
    expect(item.namaOwner).toBe("Owner Laundry 004");
    expect(item.projectBrand).toBe("Laundry Cerah 004");
    expect(item.pic).toBe("Sales Demo 002");
    expect(item.leadId).toBe(4);
    expect(item.ownerId).toBe(4);
  });

  it("tidak mengarang nilai untuk field yang belum ada sumber datanya di backend", () => {
    const item = toNasabahItem(makeLead(), 1);

    // Field-field ini WAJIB nol/kosong dan ditandai unavailable — bukan
    // hasil tebakan. Ini aturan eksplisit anti-corruption layer.
    for (const field of UNAVAILABLE_FIELDS) {
      expect(item.unavailableFields).toContain(field);
    }
  });

  it("menampilkan tanda '—' untuk field yang ditandai unavailable", () => {
    const item = toNasabahItem(makeLead(), 1);
    expect(displayValue(item, "totalTransaksi")).toBe("—");
  });

  it("menampilkan nilai asli untuk field yang tersedia", () => {
    const item = toNasabahItem(makeLead(), 1);
    expect(displayValue(item, "kodeOwner")).toBe("OWN-00004");
  });
});
