import React from "react";
import {
  type PromoStatus,
  type PaketType,
  type KategoriNasabah,
  PAKET_LABELS,
  KATEGORI_LABELS,
} from "@/app/lib/promo-data";

export function StatusBadge({ status }: { status: PromoStatus }) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide";
  if (status === "active") {
    return (
      <span className={`${base} border border-emerald-200 bg-emerald-50 text-emerald-700`}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className={`${base} border border-amber-200 bg-amber-50 text-amber-700`}>
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Draft
      </span>
    );
  }
  return (
    <span className={`${base} border border-gray-200 bg-gray-50 text-gray-500`}>
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Expired
    </span>
  );
}

export function PaketBadge({ paket }: { paket: PaketType }) {
  const base = "inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[11px] font-black";
  if (paket === "pro") {
    return <span className={`${base} bg-red-100 text-red-500`}>{PAKET_LABELS[paket]}</span>;
  }
  if (paket === "business") {
    return <span className={`${base} bg-[#d9ead3] text-[#38761d]`}>{PAKET_LABELS[paket]}</span>;
  }
  return <span className={`${base} bg-[#fce5cd] text-orange-500`}>{PAKET_LABELS[paket]}</span>;
}

export function KategoriBadge({ kategori }: { kategori: KategoriNasabah }) {
  const base = "inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[11px] font-black";
  if (kategori === "existing") {
    return <span className={`${base} bg-[#fce5cd] text-[#b45f06]`}>{KATEGORI_LABELS[kategori]}</span>;
  }
  return <span className={`${base} bg-[#d9ead3] text-[#38761d]`}>{KATEGORI_LABELS[kategori]}</span>;
}

export default function BadgePage() { return null; }
