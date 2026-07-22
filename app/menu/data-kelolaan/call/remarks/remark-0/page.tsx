"use client";

import type { CallCustomer } from "../../page";

export const REMARK_0_OPTIONS = [
  {
    value: "pakai-aplikasi-lain",
    label: "(0) Pakai Aplikasi Lain",
    score: "0",
  },
  {
    value: "harga-tidak-sesuai",
    label: "(0) Harga Tidak Sesuai",
    score: "0",
  },
  {
    value: "nomor-diblokir",
    label: "(0) Nomor Diblokir",
    score: "0",
  },
  {
    value: "fitur-tidak-sesuai",
    label: "(0) Fitur Tidak Sesuai",
    score: "0",
  },
  {
    value: "tidak-merespon",
    label: "(0) Tidak Merespon",
    score: "0",
  },
  {
    value: "tidak-jadi-buka-laundry",
    label: "(0) Tidak Jadi Buka Laundry",
    score: "0",
  },
];

export function applyRemark0Action(customer: CallCustomer): CallCustomer {
  return {
    ...customer,
    pic: "INVALID",
    totalFu: Number(customer.totalFu || 0) + 1,
    remarks: "0",
    scor: 0,
  };
}

export default function Remark0Page() {
  return null;
}