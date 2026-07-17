"use client";

import { useMemo, useState } from "react";
import type { NasabahItem } from "../../page";
import type { RemarkOption } from "../page";

type Remark3UpdatePayload = {
  callStatus: string;
  chatStatus: string;
  tanggalFu: string;
  remarks: string;
  scor: number;
  noted: string;
};

export type Remark3SalesPayload = {
  packageType: string;
  durationMonth: number;
  transferCode: number;
  discount: number;
};

export const REMARK_3_LABEL = "Remarks 3 - Berlangganan";

export const REMARK_3_OPTIONS: RemarkOption[] = [
  { value: "3_berlangganan", label: "(3) Berlangganan", tone: "green" },
];

type PackageOption = {
  value: string;
  label: string;
  pricePerMonth: number;
  tone: RemarkOption["tone"];
};

export const PACKAGE_OPTIONS: PackageOption[] = [
  { value: "pro", label: "Pro", pricePerMonth: 2500000, tone: "blue" },
  { value: "basic", label: "Basic", pricePerMonth: 1000000, tone: "green" },
  { value: "business", label: "Business", pricePerMonth: 3000000, tone: "yellow" },
];

export const DURATION_OPTIONS = [
  { label: "1 bulan", value: 1 },
  { label: "3 bulan", value: 3 },
  { label: "6 bulan", value: 6 },
  { label: "9 bulan", value: 9 },
  { label: "1 tahun", value: 12 },
];

export function getDefaultSalesPayload(): Remark3SalesPayload {
  return {
    packageType: "pro",
    durationMonth: 1,
    transferCode: 0,
    discount: 0,
  };
}

export function getPackageOption(packageType: string) {
  return PACKAGE_OPTIONS.find((item) => item.value === packageType) || PACKAGE_OPTIONS[0];
}

export function getPackagePrice(payload: Remark3SalesPayload) {
  const selectedPackage = getPackageOption(payload.packageType);
  return selectedPackage.pricePerMonth * payload.durationMonth;
}

export function getActualSale(payload: Remark3SalesPayload) {
  return Math.max(getPackagePrice(payload) - payload.discount + payload.transferCode, 0);
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseNumberInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "");
  return Number(digitsOnly || 0);
}

export function getTrialStartDate() {
  return "10 Januari 2026";
}

export function getTrialEndDate() {
  return "24 Januari 2026";
}

export function applyRemark3Action(
  customer: NasabahItem,
  payload: Remark3UpdatePayload,
  salesPayload: Remark3SalesPayload,
): NasabahItem {
  return {
    ...customer,
    ...payload,
    // Remarks 3 berarti customer sudah berlangganan, PIC Sales tetap sama.
    pic: customer.pic,
    statusAkun: "Berlangganan",
    totalFu: Number(customer.totalFu || 0) + 1,
    salesPlan: {
      packageType: salesPayload.packageType,
      durationMonth: salesPayload.durationMonth,
      packagePrice: getPackagePrice(salesPayload),
      transferCode: salesPayload.transferCode,
      discount: salesPayload.discount,
      actualSale: getActualSale(salesPayload),
    },
  };
}

const getToneClass = (tone?: RemarkOption["tone"]) => {
  if (tone === "green") return "border-emerald-200 bg-emerald-100 text-emerald-800";
  if (tone === "yellow") return "border-yellow-200 bg-yellow-100 text-yellow-800";
  if (tone === "blue") return "border-blue-200 bg-blue-100 text-blue-800";
  return "border-red-200 bg-red-100 text-red-700";
};

function PackageSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedPackage = getPackageOption(value);

  return (
    <div className="relative space-y-2">
      <label className="text-xs font-black uppercase tracking-wider text-gray-500">
        Jenis Paket
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-xl border border-gray-300 bg-white p-1.5 text-xs font-black text-gray-700 outline-none transition focus:border-[#C92C1E]"
      >
        <span
          className={`flex min-h-[30px] flex-1 items-center justify-center rounded-lg border px-2.5 py-1.5 ${getToneClass(
            selectedPackage.tone,
          )}`}
        >
          {selectedPackage.label}
        </span>
        <span className="px-2 text-gray-500">⌄</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
          {PACKAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`mb-1.5 flex w-full items-center justify-center rounded-lg border px-2.5 py-1.5 text-xs font-black transition hover:scale-[1.005] ${getToneClass(option.tone)}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Remark3SalesSection({
  value,
  onChange,
}: {
  value: Remark3SalesPayload;
  onChange: (value: Remark3SalesPayload) => void;
}) {
  const selectedPackage = getPackageOption(value.packageType);
  const packagePrice = useMemo(() => getPackagePrice(value), [value]);
  const actualSale = useMemo(() => getActualSale(value), [value]);

  const updateValue = (nextValue: Partial<Remark3SalesPayload>) => {
    onChange({
      ...value,
      ...nextValue,
    });
  };

  return (
    <section className="space-y-5 pt-4">
      <h3 className="text-center text-2xl font-black tracking-tight text-gray-900">
        Laporan Penjualan
      </h3>

      <div className="relative ml-1 space-y-0">
        <div className="absolute left-[7px] top-4 h-10 border-l-4 border-dotted border-orange-400" />

        <div className="relative z-10 flex min-h-10 items-center gap-3 text-xs font-black text-gray-700">
          <span className="h-4 w-4 rounded-full border-2 border-emerald-500 bg-yellow-100" />
          Trial Dimulai, {getTrialStartDate()}
        </div>

        <div className="relative z-10 flex min-h-10 items-center gap-3 text-xs font-black text-gray-700">
          <span className="h-4 w-4 rounded-full border-2 border-emerald-500 bg-yellow-100" />
          Trial Berakhir, {getTrialEndDate()}
        </div>
      </div>

      <PackageSelect
        value={value.packageType}
        onChange={(packageType) => updateValue({ packageType })}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-black text-gray-500">Harga Paket</p>
            <p className="mt-1 text-2xl font-black text-gray-900">
              {formatRupiah(packagePrice)}
            </p>
          </div>

          <div>
            <p className="text-xs font-black text-gray-500">Penjualan Aktual</p>
            <p className="mt-1 text-2xl font-black text-gray-900">
              {formatRupiah(actualSale)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-black text-gray-500">Kode unik Transfer</span>
            <input
              type="text"
              value={`Rp ${value.transferCode.toLocaleString("id-ID")}`}
              onChange={(event) =>
                updateValue({ transferCode: parseNumberInput(event.target.value) })
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-[#C92C1E]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-black text-gray-500">
              Potongan Harga Khusus
            </span>
            <input
              type="text"
              value={`Rp ${value.discount.toLocaleString("id-ID")}`}
              onChange={(event) =>
                updateValue({ discount: parseNumberInput(event.target.value) })
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-[#C92C1E]"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black text-gray-500">Durasi Membership</p>
          <p className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-[#C92C1E]">
            {DURATION_OPTIONS.find((item) => item.value === value.durationMonth)?.label || "1 bulan"}
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="range"
            min={0}
            max={DURATION_OPTIONS.length - 1}
            step={1}
            value={DURATION_OPTIONS.findIndex((item) => item.value === value.durationMonth)}
            onChange={(event) => {
              const selectedIndex = Number(event.target.value);
              const selectedDuration = DURATION_OPTIONS[selectedIndex] || DURATION_OPTIONS[0];

              updateValue({ durationMonth: selectedDuration.value });
            }}
            className="h-2 w-full cursor-pointer accent-[#C92C1E]"
          />

          <div className="grid grid-cols-5 gap-2">
            {DURATION_OPTIONS.map((duration) => {
              const isActive = value.durationMonth === duration.value;

              return (
                <button
                  key={duration.value}
                  type="button"
                  onClick={() => updateValue({ durationMonth: duration.value })}
                  className={`text-center text-xs font-black transition ${
                    isActive ? "scale-105 text-[#C92C1E]" : "text-red-300 hover:text-[#C92C1E]"
                  }`}
                >
                  {duration.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-500">
        Paket aktif: <span className="text-gray-900">{selectedPackage.label}</span> •
        Durasi: <span className="text-gray-900">{value.durationMonth} bulan</span>
      </p>
    </section>
  );
}