"use client";

import type { NasabahItem } from "../../page";
import type { RemarkOption } from "../page";

type Remark1UpdatePayload = {
  callStatus: string;
  chatStatus: string;
  tanggalFu: string;
  remarks: string;
  scor: number;
  noted: string;
};

export const REMARK_1_LABEL = "Remarks 1 - Customer Masih Berpotensi";

export const REMARK_1_OPTIONS: RemarkOption[] = [
  { value: "1_incoming", label: "(1) Incoming", tone: "blue" },
  { value: "1_rencana_buka_laundry", label: "(1) Rencana Buka Laundry", tone: "blue" },
];

export function isRemark1Value(value: string) {
  return value.startsWith("1_");
}

export function applyRemark1Action(
  customer: NasabahItem,
  payload: Remark1UpdatePayload,
): NasabahItem {
  return {
    ...customer,
    ...payload,
    // Remarks 1 tetap di PIC Sales yang sama, karena customer masih bisa difollow up.
    pic: customer.pic,
    totalFu: Number(customer.totalFu || 0) + 1,
  };
}

export default function Remark1Page() {
  return (
    <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-blue-700">
        {REMARK_1_LABEL}
      </p>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {REMARK_1_OPTIONS.map((option) => (
          <div
            key={option.value}
            className="rounded-xl border border-blue-200 bg-blue-100 px-3 py-2 text-center text-xs font-black text-blue-700"
          >
            {option.label}
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold text-gray-500">
        Jika user memilih salah satu remarks 1, customer tetap berada di PIC Sales yang sama dan bisa difollow up ulang.
      </p>
    </div>
  );
}