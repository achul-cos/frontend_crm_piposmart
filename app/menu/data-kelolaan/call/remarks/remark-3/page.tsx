"use client";

import React, { useMemo } from "react";
import type { CallCustomer } from "../../page";

export type Remark3SalesPayload = {
  packageType: string;
  durationMonth: number;
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
  { value: "basic", label: "Basic", pricePerMonth: 1000000 },
  { value: "business", label: "Business", pricePerMonth: 3000000 },
  { value: "pro", label: "Pro", pricePerMonth: 2500000 },
];

const DURATION_OPTIONS = [
  { value: 1, label: "1 bulan" },
  { value: 3, label: "3 bulan" },
  { value: 6, label: "6 bulan" },
  { value: 9, label: "9 bulan" },
  { value: 12, label: "1 tahun" },
];

export const getDefaultSalesPayload = (): Remark3SalesPayload => ({
  packageType: "basic",
  durationMonth: 1,
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

const getDurationLabel = (value: number) => {
  return DURATION_OPTIONS.find((item) => item.value === value)?.label || `${value} bulan`;
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
  const packagePrice = selectedPackage.pricePerMonth * value.durationMonth;
  const actualSale = Math.max(packagePrice - value.discount + value.transferCode, 0);

  const durationIndex = useMemo(() => {
    const index = DURATION_OPTIONS.findIndex((item) => item.value === value.durationMonth);
    return index >= 0 ? index : 0;
  }, [value.durationMonth]);

  const rangeMax = DURATION_OPTIONS.length - 1;

  const handleChangeDuration = (nextIndex: number) => {
    const selectedDuration = DURATION_OPTIONS[nextIndex] || DURATION_OPTIONS[0];

    onChange({
      ...value,
      durationMonth: selectedDuration.value,
    });
  };

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <h3 className="text-center text-xl font-black text-gray-950">
        Laporan Penjualan
      </h3>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
            Jenis Paket
          </label>

          <select
            value={value.packageType}
            onChange={(event) =>
              onChange({
                ...value,
                packageType: event.target.value,
              })
            }
            className="h-10 w-full cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-center text-sm font-black text-emerald-800 outline-none focus:border-emerald-600"
          >
            {PACKAGE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <InfoPrice label="Harga Paket" value={formatRupiah(packagePrice)} />
          <InfoPrice label="Penjualan Aktual" value={formatRupiah(actualSale)} />
        </div>

        <div className="space-y-3">
          <NumberInput
            label="Kode Unik Transfer"
            value={value.transferCode}
            onChange={(nextValue) =>
              onChange({
                ...value,
                transferCode: nextValue,
              })
            }
          />

          <NumberInput
            label="Potongan Harga Khusus"
            value={value.discount}
            onChange={(nextValue) =>
              onChange({
                ...value,
                discount: nextValue,
              })
            }
          />
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-black uppercase text-gray-500">
              Durasi Membership
            </label>

            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
              {getDurationLabel(value.durationMonth)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={rangeMax}
            step={1}
            value={durationIndex}
            onChange={(event) => handleChangeDuration(Number(event.target.value))}
            className="mt-5 h-2 w-full cursor-pointer accent-[#C92C1E]"
          />

          <div className="mt-3 grid grid-cols-5 gap-2">
            {DURATION_OPTIONS.map((item, index) => {
              const active = index === durationIndex;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleChangeDuration(index)}
                  className={`text-center text-sm font-black transition ${
                    active ? "text-[#C92C1E]" : "text-red-400"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPrice({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-black text-gray-950">{value}</p>
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

export function applyRemark3Action(
  customer: CallCustomer,
  payload: Remark3SalesPayload,
): CallCustomer {
  const selectedPackage = getPackageOption(payload.packageType);
  const packagePrice = selectedPackage.pricePerMonth * payload.durationMonth;
  const actualSale = Math.max(packagePrice - payload.discount + payload.transferCode, 0);
  const startDate = new Date();
  const endDate = addMonthsToDate(startDate, payload.durationMonth);

  return {
    ...customer,
    totalFu: Number(customer.totalFu || 0) + 1,
    remarks: "3",
    scor: 3,
    statusAkun: "Berlangganan",
    finalisasiClosing: selectedPackage.label,
    nominal: actualSale,
    purchaseHistories: [
      ...(customer.purchaseHistories || []),
      {
        paket: selectedPackage.label,
        waktuMulai: formatDateOnly(startDate),
        waktuBerakhir: formatDateOnly(endDate),
        hargaAktual: actualSale,
      },
    ],
  };
}

export default Remark3SalesSection;