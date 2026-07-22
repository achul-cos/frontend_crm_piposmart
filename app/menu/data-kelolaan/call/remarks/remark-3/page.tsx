"use client";

import React, { useMemo, useEffect } from "react";
import type { CallCustomer } from "../../page";
import { INITIAL_PROMOS, KATEGORI_LABELS } from "@/app/lib/promo-data";
import { Receipt, CalendarDays, CheckCircle2 } from "lucide-react";

export type Remark3SalesPayload = {
  packageType: string;
  promoIndex?: number;
  durationMonth?: number; // legacy
  transferCode: number;
  discount: number;
};

export const REMARK_3_OPTIONS = [
  {
    value: "berlangganan",
    label: "(3) Berlangganan",
    score: "3",
  },
];

const PACKAGE_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "business", label: "Business" },
  { value: "pro", label: "Pro" },
];

type PromoData = {
  label: string;
  tenor: number;
  bonus: number;
  totalTenor: number;
  hargaNormal: number;
  diskon: number;
  hargaPromo: number;
};

const getActivePromos = (packageType: string): PromoData[] => {
  const promos = INITIAL_PROMOS.filter(p => p.paket === packageType);
  if (promos.length === 0) return [];
  return promos.map(p => ({
    label: `${p.namaPromo} (${KATEGORI_LABELS[p.kategoriNasabah]})`,
    tenor: p.tenor,
    bonus: p.bonus,
    totalTenor: p.totalMasaAktif,
    hargaNormal: p.hargaNormal,
    diskon: p.diskon,
    hargaPromo: p.hargaPromo,
  }));
};

export const getDefaultSalesPayload = (): Remark3SalesPayload => ({
  packageType: "basic",
  promoIndex: 0,
  transferCode: 0,
  discount: 0,
});

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const getPackageOption = (value: string) =>
  PACKAGE_OPTIONS.find((item) => item.value === value) || PACKAGE_OPTIONS[0];

const getSelectedPromo = (packageType: string, promoIndex?: number) => {
  let promos = getActivePromos(packageType);
  if (promos.length === 0) promos = getActivePromos("basic");
  const index = typeof promoIndex === "number" && promoIndex >= 0 && promoIndex < promos.length ? promoIndex : 0;
  return promos[index];
};

const addMonthsToDate = (date: Date, months: number) => {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
};

const formatDateOnly = (date: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(date);

function Remark3SalesSection({
  value,
  onChange,
}: {
  value: Remark3SalesPayload;
  onChange: (value: Remark3SalesPayload) => void;
}) {
  const selectedPackage = getPackageOption(value.packageType);
  let activePromos = getActivePromos(selectedPackage.value);
  if (activePromos.length === 0) activePromos = getActivePromos("basic");
  const currentPromoIndex = typeof value.promoIndex === "number" ? value.promoIndex : 0;
  const activePromo = activePromos[currentPromoIndex] || activePromos[0];

  const actualSale = Math.max(activePromo.hargaPromo - (value.discount || 0) + (value.transferCode || 0), 0);

  // Auto fix if promoIndex is out of bounds or missing when package changes
  useEffect(() => {
    if (typeof value.promoIndex !== "number" || value.promoIndex >= activePromos.length) {
      onChange({
        ...value,
        promoIndex: 0,
      });
    }
  }, [value.packageType, value.promoIndex, activePromos.length, onChange, value]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Top Accent Line */}
      <div className="h-1.5 w-full bg-[#C92C1E]" />
      
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">Laporan Penjualan</h3>
              <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-gray-400">Closing Berlangganan</p>
            </div>
          </div>
        </div>

        {/* Jenis Paket (Radio Cards) */}
        <div className="mb-6">
          <label className="mb-3 block text-[11px] font-black uppercase tracking-widest text-gray-500">
            1. Pilih Jenis Paket
          </label>
          <div className="grid grid-cols-3 gap-3">
            {PACKAGE_OPTIONS.map((item) => {
              const isSelected = value.packageType === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onChange({ ...value, packageType: item.value, promoIndex: 0 })}
                  className={`relative flex flex-col items-center justify-center rounded-xl border p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#C92C1E] bg-red-50/50 text-[#C92C1E] shadow-sm ring-1 ring-[#C92C1E]"
                      : "border-gray-200 bg-white text-gray-500 hover:border-red-200 hover:bg-red-50/30"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -right-2 -top-2 rounded-full bg-[#C92C1E] text-white shadow-sm">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}
                  <span className="text-sm font-black">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pilih Promo */}
        <div className="mb-8">
          <label className="mb-3 block text-[11px] font-black uppercase tracking-widest text-gray-500">
            2. Pilih Promo / Durasi
          </label>
          <select
            value={currentPromoIndex}
            onChange={(event) =>
              onChange({
                ...value,
                promoIndex: Number(event.target.value),
              })
            }
            className="h-11 w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50/50 px-4 text-sm font-black text-gray-800 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-1 focus:ring-[#C92C1E]"
          >
            {activePromos.map((promo, idx) => (
              <option key={idx} value={idx}>
                {promo.label}
              </option>
            ))}
          </select>
        </div>

        {/* Receipt Area */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Left: Adjustments */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4">
              <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Penyesuaian Tambahan</p>
              <div className="space-y-3">
                <NumberInput
                  label="Kode Unik Transfer"
                  value={value.transferCode || 0}
                  onChange={(nextValue) =>
                    onChange({
                      ...value,
                      transferCode: nextValue,
                    })
                  }
                />
                <CurrencyInput
                  label="Potongan Harga Khusus (Rp)"
                  value={value.discount || 0}
                  onChange={(nextValue) =>
                    onChange({
                      ...value,
                      discount: nextValue,
                    })
                  }
                />
              </div>
            </div>
            
            {/* Masa Aktif Info */}
            <div className="flex flex-col justify-center rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <CalendarDays className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Masa Aktif Paket</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-blue-900">{activePromo.tenor}</span>
                <span className="text-sm font-bold text-blue-700">bulan</span>
                {activePromo.bonus > 0 && (
                  <>
                    <span className="text-sm font-bold text-blue-400">+</span>
                    <span className="text-sm font-black text-emerald-600">{activePromo.bonus} bln bonus</span>
                  </>
                )}
              </div>
              <div className="mt-2 inline-flex w-fit items-center rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
                Total {activePromo.totalTenor} Bulan
              </div>
            </div>
          </div>

          {/* Right: Receipt Summary */}
          <div className="flex flex-col rounded-xl border border-gray-100 bg-gray-50 p-6">
            <h4 className="mb-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Rincian Pembayaran</h4>
            
            <div className="flex-1 space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">Harga Normal</span>
                <span className="text-sm font-bold text-gray-400 line-through">{formatRupiah(activePromo.hargaNormal)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">Diskon Promo</span>
                <span className="text-sm font-black text-emerald-600">-{formatRupiah(activePromo.diskon)}</span>
              </div>
              
              {value.discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">Potongan Khusus</span>
                  <span className="text-sm font-black text-emerald-600">-{formatRupiah(value.discount)}</span>
                </div>
              )}
              
              {value.transferCode > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">Kode Unik</span>
                  <span className="text-sm font-black text-[#C92C1E]">+{formatRupiah(value.transferCode)}</span>
                </div>
              )}
            </div>
            
            <div className="mt-6 border-t-2 border-dashed border-gray-200 pt-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Aktual</p>
                  <p className="text-[10px] font-bold text-gray-400">Nilai yang harus dibayar</p>
                </div>
                <p className="text-3xl font-black text-[#C92C1E]">{formatRupiah(actualSale)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
        {label}
      </label>

      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-700 outline-none focus:border-emerald-600"
      />
    </div>
  );
}

function CurrencyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const handleRupiahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    onChange(Number(rawValue) || 0);
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
        {label}
      </label>

      <input
        type="text"
        value={value === 0 ? "" : value.toLocaleString("id-ID")}
        onChange={handleRupiahChange}
        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-700 outline-none focus:border-emerald-600"
      />
    </div>
  );
}

export function applyRemark3Action(
  customer: CallCustomer,
  payload: Remark3SalesPayload,
): CallCustomer {
  const selectedPackage = getPackageOption(payload.packageType);
  const activePromo = getSelectedPromo(payload.packageType, payload.promoIndex);

  const actualSale = Math.max(activePromo.hargaPromo - (payload.discount || 0) + (payload.transferCode || 0), 0);
  const startDate = new Date();
  const endDate = addMonthsToDate(startDate, activePromo.totalTenor);

  return {
    ...customer,
    totalFu: Number(customer.totalFu || 0) + 1,
    remarks: "3",
    scor: 3,
    statusAkun: "Berlangganan",
    finalisasiClosing: activePromo.label,
    nominal: actualSale,
    purchaseHistories: [
      ...(customer.purchaseHistories || []),
      {
        paket: activePromo.label,
        waktuMulai: formatDateOnly(startDate),
        waktuBerakhir: formatDateOnly(endDate),
        hargaAktual: actualSale,
      },
    ],
  };
}

export default Remark3SalesSection;