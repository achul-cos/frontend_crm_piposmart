"use client";

import type { NasabahItem } from "../../page";
import type { RemarkOption } from "../page";

type Remark0UpdatePayload = {
  callStatus: string;
  chatStatus: string;
  tanggalFu: string;
  remarks: string;
  scor: number;
  noted: string;
};

export const REMARK_0_LABEL = "Remarks 0 - Invalid Customer";

export const REMARK_0_OPTIONS: RemarkOption[] = [
  { value: "0_pakai_aplikasi_lain", label: "(0) Pakai Aplikasi Lain", tone: "red" },
  { value: "0_harga_tidak_sesuai", label: "(0) Harga Tidak Sesuai", tone: "red" },
  { value: "0_nomor_diblokir", label: "(0) Nomor Diblokir", tone: "red" },
  { value: "0_fitur_tidak_sesuai", label: "(0) Fitur Tidak Sesuai", tone: "red" },
  { value: "0_tidak_merespon", label: "(0) Tidak Merespon", tone: "red" },
  { value: "0_tidak_jadi_buka_laundry", label: "(0) Tidak Jadi Buka Laundry", tone: "red" },
];

export function isRemark0Value(value: string) {
  return value.startsWith("0_");
}

export function applyRemark0Action(
  customer: NasabahItem,
  payload: Remark0UpdatePayload,
): NasabahItem {
  return {
    ...customer,
    ...payload,
    pic: "INVALID",
    totalFu: Number(customer.totalFu || 0) + 1,
  };
}

export default function Remark0Page() {
  return (
    <div className="space-y-3 rounded-2xl border border-red-100 bg-red-50/50 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-[#C92C1E]">
        {REMARK_0_LABEL}
      </p>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {REMARK_0_OPTIONS.map((option) => (
          <div
            key={option.value}
            className="rounded-xl border border-red-200 bg-red-100 px-3 py-2 text-center text-xs font-black text-red-700"
          >
            {option.label}
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold text-gray-500">
        Jika user memilih salah satu remarks 0, customer akan dipindahkan ke PIC Sales INVALID.
      </p>
    </div>
  );
}