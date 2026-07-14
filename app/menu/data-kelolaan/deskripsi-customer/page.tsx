"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface NasabahItem {
  totalFu: number;
  tanggalFu: string;
  tahun: string;
  bulan: string;
  no: number;
  pic: string;
  tanggalDibagikan: string;
  statusAkun: string;
  kodeBaris: string;
  kodeOwner: string;
  namaOwner: string;
  projectBrand: string;
  outlet: string;
  noHpOwner: string;
  noHpOutlet: string;
  createDateProject: string;
  expiredDate: string;
  totalTransaksi: number;
  scor: number;
  callStatus: string;
  chatStatus: string;
  validitas: string;
  remarks: string;
  sumberNasabah: string;
  finalisasiClosing: string;
  skemaId?: string;
  nominal: number;
  noted: string;
}

type TrendRangeMode = "default4bulan" | "harian" | "bulanan" | "tahunan";

const LIST_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const SKOR_MASTER = [
  { key: "0", label: "Tidak Potensial (0)", color: "#C92C1E" },
  { key: "1", label: "Kemungkinan Potensial", color: "#F0783E" },
  { key: "2", label: "Potensial (2)", color: "#F6B84B" },
  { key: "3", label: "Langganan (3)", color: "#3A7D8A" },
];

const SUMBER_COLORS = ["#C92C1E", "#F0783E", "#F6B84B", "#3A7D8A", "#8E7DC3", "#6B7280"];

const monthIndexMap: Record<string, number> = LIST_BULAN.reduce(
  (acc, month, index) => {
    acc[month.toLowerCase()] = index;
    return acc;
  },
  {} as Record<string, number>,
);

const EmptyValue = ({ children }: { children?: React.ReactNode }) => (
  <span className="text-gray-400">{children || "-"}</span>
);

const InfoField = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</p>
    <div className={`mt-1 text-sm font-bold text-gray-800 ${mono ? "font-mono" : ""}`}>
      {value || <EmptyValue />}
    </div>
  </div>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="border-b border-gray-100 pb-3">
    <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">{title}</h2>
    <p className="mt-0.5 text-[11px] font-medium text-gray-400">{subtitle}</p>
  </div>
);

const UserIcon = () => (
  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a1.125 1.125 0 00-1.173.417l-.97 1.293a1.125 1.125 0 01-1.21.38 12.035 12.035 0 01-7.143-7.143 1.125 1.125 0 01.38-1.21l1.293-.97a1.125 1.125 0 00.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25m10.5-2.25v2.25M3.75 8.25h16.5m-16.5 0A2.25 2.25 0 016 6h12a2.25 2.25 0 012.25 2.25m-16.5 0v9.75A2.25 2.25 0 006 20.25h12a2.25 2.25 0 002.25-2.25V8.25" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
  </svg>
);

function normalizeDate(value?: string) {
  if (!value || value.trim() === "") return "";

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  return trimmed;
}

function getItemDate(item: NasabahItem) {
  return normalizeDate(item.tanggalFu || item.tanggalDibagikan || item.createDateProject);
}

function getItemMonthIndex(item: NasabahItem) {
  const fromDate = getItemDate(item);

  if (fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
    return Number(fromDate.slice(5, 7)) - 1;
  }

  const monthName = String(item.bulan || "").toLowerCase();
  return monthIndexMap[monthName] ?? 0;
}

function getItemYear(item: NasabahItem) {
  const fromDate = getItemDate(item);

  if (fromDate && /^\d{4}/.test(fromDate)) {
    return Number(fromDate.slice(0, 4));
  }

  return Number(item.tahun) || new Date().getFullYear();
}

function getSkorKey(item: NasabahItem) {
  const remarks = String(item.remarks ?? "").trim();

  if (["0", "1", "2", "3"].includes(remarks)) return remarks;

  const scor = String(item.scor ?? "0");
  if (["0", "1", "2", "3"].includes(scor)) return scor;

  return "0";
}

function getSkorLabel(item: NasabahItem) {
  return SKOR_MASTER.find((row) => row.key === getSkorKey(item))?.label || "Tidak Potensial (0)";
}

function getSkorBadgeClass(item: NasabahItem) {
  const key = getSkorKey(item);

  if (key === "3") return "bg-blue-100 text-blue-700 border-blue-200";
  if (key === "2") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (key === "1") return "bg-orange-100 text-orange-800 border-orange-200";

  return "bg-red-100 text-red-700 border-red-200";
}

function formatTgl(str?: string) {
  if (!str || str.trim() === "") return "-";

  if (str.includes("-")) {
    const parts = str.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return str;
}

function formatRupiah(value?: number) {
  if (!value || value === 0) return "-";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildPieData(
  data: NasabahItem[],
  getKey: (item: NasabahItem) => string,
  labelMap?: Record<string, string>,
  colorMap?: Record<string, string>,
  fallbackColors = SUMBER_COLORS,
) {
  const counts = new Map<string, number>();

  data.forEach((item) => {
    const key = getKey(item) || "Tidak Diketahui";
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.entries()).map(([key, value], index) => ({
    key,
    label: labelMap?.[key] || key,
    value,
    color: colorMap?.[key] || fallbackColors[index % fallbackColors.length],
  }));
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function PieChartCard({
  title,
  data,
}: {
  title: string;
  data: { key: string; label: string; value: number; color: string }[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-700">{title}</h2>

      {total === 0 ? (
        <div className="py-14 text-center text-xs font-bold italic text-gray-400">
          Belum ada data untuk diagram ini.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_180px]">
          <div className="flex justify-center">
            <svg viewBox="0 0 260 260" className="h-[260px] w-[260px]">
              {data.map((item) => {
                const percentage = item.value / total;
                const angle = percentage * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                currentAngle += angle;

                return (
                  <path
                    key={item.key}
                    d={describeArc(130, 130, 105, startAngle, endAngle)}
                    fill={item.color}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                  >
                    <title>{`${item.label}: ${item.value} customer (${((item.value / total) * 100).toFixed(1)}%)`}</title>
                  </path>
                );
              })}

              <circle cx={130} cy={130} r={42} fill="white" />
              <text x={130} y={126} textAnchor="middle" className="fill-gray-500 text-[10px] font-black">
                TOTAL
              </text>
              <text x={130} y={146} textAnchor="middle" className="fill-gray-900 text-[18px] font-black">
                {total}
              </text>
            </svg>
          </div>

          <div className="space-y-2 self-center">
            {data.map((item) => {
              const percentage = total ? (item.value / total) * 100 : 0;

              return (
                <div key={item.key} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <p className="text-xs font-black text-gray-800">{item.label}</p>
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-gray-400">
                    {item.value} customer • {percentage.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShortDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDate();
  const month = LIST_BULAN[date.getMonth()]?.slice(0, 3) || "";

  return `${day} ${month}`;
}

function buildTrendData(
  data: NasabahItem[],
  mode: TrendRangeMode,
  options: {
    startDate: string;
    endDate: string;
    startMonth: string;
    endMonth: string;
    monthYear: string;
    startYear: string;
    endYear: string;
  },
) {
  const now = new Date();

  if (mode === "harian") {
    const fallbackEnd = toInputDate(now);
    const fallbackStart = toInputDate(addDays(now, -7));

    const rawStart = options.startDate || fallbackStart;
    const rawEnd = options.endDate || fallbackEnd;
    const start = rawStart <= rawEnd ? rawStart : rawEnd;
    const end = rawStart <= rawEnd ? rawEnd : rawStart;

    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T00:00:00`);
    const diffDays = Math.min(
      62,
      Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000)),
    );

    return Array.from({ length: diffDays + 1 }, (_, index) => {
      const currentDate = addDays(startDate, index);
      const currentKey = toInputDate(currentDate);

      const group = data.filter((item) => getItemDate(item) === currentKey);

      return {
        label: formatShortDate(currentKey),
        total: group.length,
        "0": group.filter((item) => getSkorKey(item) === "0").length,
        "1": group.filter((item) => getSkorKey(item) === "1").length,
        "2": group.filter((item) => getSkorKey(item) === "2").length,
        "3": group.filter((item) => getSkorKey(item) === "3").length,
      };
    });
  }

  if (mode === "tahunan") {
    const rawStart = Number(options.startYear) || now.getFullYear() - 2;
    const rawEnd = Number(options.endYear) || now.getFullYear();
    const startYear = Math.min(rawStart, rawEnd);
    const endYear = Math.max(rawStart, rawEnd);

    return Array.from({ length: endYear - startYear + 1 }, (_, index) => {
      const year = startYear + index;

      const group = data.filter((item) => getItemYear(item) === year);

      return {
        label: String(year),
        total: group.length,
        "0": group.filter((item) => getSkorKey(item) === "0").length,
        "1": group.filter((item) => getSkorKey(item) === "1").length,
        "2": group.filter((item) => getSkorKey(item) === "2").length,
        "3": group.filter((item) => getSkorKey(item) === "3").length,
      };
    });
  }

  const year = Number(options.monthYear) || now.getFullYear();

  const defaultStart = Math.max(0, now.getMonth() - 3);
  const defaultEnd = now.getMonth();

  const startIndex =
    mode === "default4bulan"
      ? defaultStart
      : options.startMonth
        ? LIST_BULAN.indexOf(options.startMonth)
        : defaultStart;

  const endIndex =
    mode === "default4bulan"
      ? defaultEnd
      : options.endMonth
        ? LIST_BULAN.indexOf(options.endMonth)
        : defaultEnd;

  const minMonth = Math.max(0, Math.min(startIndex === -1 ? 0 : startIndex, endIndex === -1 ? 11 : endIndex));
  const maxMonth = Math.min(11, Math.max(startIndex === -1 ? 0 : startIndex, endIndex === -1 ? 11 : endIndex));

  return Array.from({ length: maxMonth - minMonth + 1 }, (_, index) => {
    const monthIndex = minMonth + index;

    const group = data.filter(
      (item) => getItemYear(item) === year && getItemMonthIndex(item) === monthIndex,
    );

    return {
      label: LIST_BULAN[monthIndex],
      total: group.length,
      "0": group.filter((item) => getSkorKey(item) === "0").length,
      "1": group.filter((item) => getSkorKey(item) === "1").length,
      "2": group.filter((item) => getSkorKey(item) === "2").length,
      "3": group.filter((item) => getSkorKey(item) === "3").length,
    };
  });
}

function TrendChartCard({
  data,
}: {
  data: {
    label: string;
    total: number;
    "0": number;
    "1": number;
    "2": number;
    "3": number;
  }[];
}) {
  const width = 720;
  const height = 300;
  const padding = { top: 30, right: 30, bottom: 45, left: 45 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const series = [
    { key: "total", label: "Total", color: "#C92C1E" },
    { key: "0", label: "Tidak Potensial (0)", color: "#991B1B" },
    { key: "1", label: "Kemungkinan (1)", color: "#F0783E" },
    { key: "2", label: "Potensial (2)", color: "#F6B84B" },
    { key: "3", label: "Langganan (3)", color: "#3A7D8A" },
  ] as const;

  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => series.map((serie) => Number(item[serie.key]) || 0)),
  );

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (data.length - 1)) * innerWidth;
  };

  const getY = (value: number) => {
    return padding.top + innerHeight - (value / maxValue) * innerHeight;
  };

  const yTicks = Array.from(
    new Set([0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio))),
  );

  const buildSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    const commands = [`M ${points[0].x} ${points[0].y}`];

    for (let index = 1; index < points.length; index += 1) {
      const current = points[index];
      const previous = points[index - 1];
      const controlX = previous.x + (current.x - previous.x) * 0.55;

      commands.push(`C ${controlX} ${previous.y}, ${controlX} ${current.y}, ${current.x} ${current.y}`);
    }

    return commands.join(" ");
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-700">Tren Jumlah Customer Berdasarkan Skor</h2>
          <p className="mt-1 text-[11px] font-medium text-gray-400">
            Menampilkan jumlah customer sesuai rentang bulan dan tahun yang dipilih.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {series.map((serie) => (
            <div key={serie.key} className="flex items-center gap-1 text-[11px] font-bold text-gray-600">
              <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: serie.color }} />
              {serie.label}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px]">
          {yTicks.map((tick, index) => {
            const y = getY(tick);

            return (
              <g key={`y-tick-${index}-${tick}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth={1}
                />
                <text x={padding.left - 12} y={y + 4} textAnchor="end" className="fill-gray-500 text-[11px] font-bold">
                  {tick}
                </text>
              </g>
            );
          })}

          {data.map((item, index) => (
            <text
              key={item.label}
              x={getX(index)}
              y={height - 14}
              textAnchor="middle"
              className="fill-gray-600 text-[11px] font-bold"
            >
              {item.label}
            </text>
          ))}

          {series.map((serie) => {
            const points = data.map((item, index) => ({
              x: getX(index),
              y: getY(Number(item[serie.key]) || 0),
            }));

            return (
              <g key={serie.key}>
                <path
                  d={buildSmoothPath(points)}
                  fill="none"
                  stroke={serie.color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="cursor-pointer"
                >
                  <title>{serie.label}</title>
                </path>

                {points.map((point, index) => (
                  <circle
                    key={`${serie.key}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={3.5}
                    fill="white"
                    stroke={serie.color}
                    strokeWidth={2}
                    className="cursor-pointer"
                  >
                    <title>{`${serie.label} - ${data[index]?.label}: ${Number(data[index]?.[serie.key]) || 0} customer`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}


function getPackageKey(item: NasabahItem) {
  const value = String(item.finalisasiClosing || "").toLowerCase();

  if (value.includes("basic")) return "basic";
  if (value.includes("business") || value.includes("bisnis")) return "business";
  if (value.includes("pro")) return "pro";

  return "lainnya";
}

function buildPackageTrendData(
  data: NasabahItem[],
  mode: TrendRangeMode,
  options: {
    startDate: string;
    endDate: string;
    startMonth: string;
    endMonth: string;
    monthYear: string;
    startYear: string;
    endYear: string;
  },
) {
  const rows = buildTrendData(data, mode, options);

  return rows.map((row) => {
    const group = data.filter((item) => {
      if (mode === "harian") {
        const currentDateLabel = formatShortDate(getItemDate(item));
        return currentDateLabel === row.label;
      }

      if (mode === "tahunan") {
        return String(getItemYear(item)) === row.label;
      }

      return LIST_BULAN[getItemMonthIndex(item)] === row.label && getItemYear(item) === (Number(options.monthYear) || new Date().getFullYear());
    });

    const subscribedGroup = group.filter((item) => getPackageKey(item) !== "lainnya");

    return {
      label: row.label,
      total: subscribedGroup.length,
      basic: subscribedGroup.filter((item) => getPackageKey(item) === "basic").length,
      business: subscribedGroup.filter((item) => getPackageKey(item) === "business").length,
      pro: subscribedGroup.filter((item) => getPackageKey(item) === "pro").length,
    };
  });
}

function PackageBarChartCard({
  data,
}: {
  data: {
    label: string;
    total: number;
    basic: number;
    business: number;
    pro: number;
  }[];
}) {
  const width = 720;
  const height = 330;
  const padding = { top: 35, right: 25, bottom: 50, left: 45 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const series = [
    { key: "total", label: "Total", color: "#C92C1E" },
    { key: "basic", label: "Basic", color: "#F0783E" },
    { key: "business", label: "Business", color: "#F6B84B" },
    { key: "pro", label: "Pro", color: "#3A7D8A" },
  ] as const;

  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => series.map((serie) => Number(item[serie.key]) || 0)),
  );

  const yTicks = Array.from(
    new Set([0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio))),
  );

  const groupWidth = data.length > 0 ? innerWidth / data.length : innerWidth;
  const barWidth = Math.min(22, Math.max(8, groupWidth / 7));
  const groupInnerWidth = barWidth * series.length + 10;

  const getY = (value: number) => {
    return padding.top + innerHeight - (value / maxValue) * innerHeight;
  };

  const getBarX = (groupIndex: number, serieIndex: number) => {
    const groupStart = padding.left + groupIndex * groupWidth + groupWidth / 2 - groupInnerWidth / 2;
    return groupStart + serieIndex * (barWidth + 3);
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-700">
            Perbandingan Customer Langganan Berdasarkan Paket
          </h2>
          <p className="mt-1 text-[11px] font-medium text-gray-400">
            Membandingkan customer langganan berdasarkan paket Basic, Business, dan Pro.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {series.map((serie) => (
            <div key={serie.key} className="flex items-center gap-1 text-[11px] font-bold text-gray-600">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: serie.color }} />
              {serie.label}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px]">
          {yTicks.map((tick, index) => {
            const y = getY(tick);

            return (
              <g key={`package-y-${index}-${tick}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-gray-500 text-[11px] font-bold"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {data.map((item, groupIndex) => (
            <g key={`package-group-${item.label}-${groupIndex}`}>
              {series.map((serie, serieIndex) => {
                const value = Number(item[serie.key]) || 0;
                const y = getY(value);
                const barHeight = padding.top + innerHeight - y;

                return (
                  <rect
                    key={`${item.label}-${serie.key}`}
                    x={getBarX(groupIndex, serieIndex)}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={4}
                    fill={serie.color}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                  >
                    <title>{`${serie.label} - ${item.label}: ${value} customer`}</title>
                  </rect>
                );
              })}

              <text
                x={padding.left + groupIndex * groupWidth + groupWidth / 2}
                y={height - 16}
                textAnchor="middle"
                className="fill-gray-700 text-[12px] font-bold"
              >
                {item.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function DeskripsiCustomerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [customers, setCustomers] = useState<NasabahItem[]>([]);

  const today = new Date();
  const [trendMode, setTrendMode] = useState<TrendRangeMode>("default4bulan");
  const [trendStartDate, setTrendStartDate] = useState(toInputDate(addDays(today, -7)));
  const [trendEndDate, setTrendEndDate] = useState(toInputDate(today));
  const [trendStartMonth, setTrendStartMonth] = useState(LIST_BULAN[Math.max(0, today.getMonth() - 3)]);
  const [trendEndMonth, setTrendEndMonth] = useState(LIST_BULAN[today.getMonth()]);
  const [trendMonthYear, setTrendMonthYear] = useState(String(today.getFullYear()));
  const [trendStartYear, setTrendStartYear] = useState(String(today.getFullYear() - 2));
  const [trendEndYear, setTrendEndYear] = useState(String(today.getFullYear()));

  useEffect(() => {
    const cached = localStorage.getItem("piposmart_nasabah_data");

    if (!cached) {
      setCustomers([]);
      return;
    }

    try {
      const parsed = JSON.parse(cached);
      setCustomers(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCustomers([]);
    }
  }, []);

  const selectedCustomer = useMemo(() => {
    if (!id) return null;
    return customers.find((item) => String(item.no) === String(id)) || null;
  }, [customers, id]);

  const skorPieData = useMemo(() => {
    const colorMap = SKOR_MASTER.reduce((acc, item) => {
      acc[item.key] = item.color;
      return acc;
    }, {} as Record<string, string>);

    const labelMap = SKOR_MASTER.reduce((acc, item) => {
      acc[item.key] = item.label;
      return acc;
    }, {} as Record<string, string>);

    return buildPieData(customers, getSkorKey, labelMap, colorMap);
  }, [customers]);

  const sumberPieData = useMemo(() => {
    return buildPieData(
      customers,
      (item) => item.sumberNasabah || "Tidak Diketahui",
      undefined,
      undefined,
      SUMBER_COLORS,
    );
  }, [customers]);

  const trendData = useMemo(
    () =>
      buildTrendData(customers, trendMode, {
        startDate: trendStartDate,
        endDate: trendEndDate,
        startMonth: trendStartMonth,
        endMonth: trendEndMonth,
        monthYear: trendMonthYear,
        startYear: trendStartYear,
        endYear: trendEndYear,
      }),
    [
      customers,
      trendMode,
      trendStartDate,
      trendEndDate,
      trendStartMonth,
      trendEndMonth,
      trendMonthYear,
      trendStartYear,
      trendEndYear,
    ],
  );

  const packageTrendData = useMemo(
    () =>
      buildPackageTrendData(customers, trendMode, {
        startDate: trendStartDate,
        endDate: trendEndDate,
        startMonth: trendStartMonth,
        endMonth: trendEndMonth,
        monthYear: trendMonthYear,
        startYear: trendStartYear,
        endYear: trendEndYear,
      }),
    [
      customers,
      trendMode,
      trendStartDate,
      trendEndDate,
      trendStartMonth,
      trendEndMonth,
      trendMonthYear,
      trendStartYear,
      trendEndYear,
    ],
  );

  return (
    <div className="space-y-6 p-4 font-sans text-[#1C1C1E]">
      <div className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Deskripsi Customer</h1>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Halaman ini menampilkan deskripsi customer yang dipilih dan diagram analisis customer.
          </p>
        </div>

        <button
          onClick={() => router.push("/menu/data-kelolaan")}
          className="w-fit rounded-xl bg-[#C92C1E] px-4 py-2 text-xs font-black text-white hover:bg-[#A82216]"
        >
          ← Kembali ke Data Kelolaan
        </button>
      </div>

      {selectedCustomer ? (
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-[#C92C1E] shadow-sm">
                  <UserIcon />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                    Customer Detail
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-gray-900">
                    {selectedCustomer.namaOwner || "-"}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-gray-500">
                    {selectedCustomer.outlet || selectedCustomer.projectBrand || "Outlet belum diisi"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-gray-700 shadow-sm">
                      Owner: {selectedCustomer.kodeOwner || "-"}
                    </span>
                    <span className="rounded-full bg-[#C92C1E] px-3 py-1 text-[11px] font-black text-white shadow-sm">
                      PIC {selectedCustomer.pic || "-"}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-black shadow-sm ${getSkorBadgeClass(selectedCustomer)}`}>
                      {getSkorLabel(selectedCustomer)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 md:w-[360px]">
                <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase text-gray-400">Total FU</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">{selectedCustomer.totalFu || 0}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase text-gray-400">Total Transaksi</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">{selectedCustomer.totalTransaksi || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)]">
            <div className="space-y-4">
              <SectionTitle
                title="Profil Customer"
                subtitle="Informasi utama customer sesuai data kelolaan."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoField label="Kode Owner" value={selectedCustomer.kodeOwner} mono />
                <InfoField label="Kode Baris" value={selectedCustomer.kodeBaris} mono />
                <InfoField label="Nama Owner" value={selectedCustomer.namaOwner} />
                <InfoField label="Nama Outlet" value={selectedCustomer.outlet || selectedCustomer.projectBrand} />
                <InfoField label="Project / Brand" value={selectedCustomer.projectBrand} />
                <InfoField label="PIC Sales" value={selectedCustomer.pic} />
                <InfoField
                  label="No. HP Owner"
                  value={
                    selectedCustomer.noHpOwner ? (
                      <span className="inline-flex items-center gap-1.5">
                        <PhoneIcon />
                        {selectedCustomer.noHpOwner}
                      </span>
                    ) : (
                      <EmptyValue />
                    )
                  }
                  mono
                />
                <InfoField
                  label="No. HP Outlet"
                  value={
                    selectedCustomer.noHpOutlet ? (
                      <span className="inline-flex items-center gap-1.5">
                        <PhoneIcon />
                        {selectedCustomer.noHpOutlet}
                      </span>
                    ) : (
                      <EmptyValue />
                    )
                  }
                  mono
                />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Catatan Customer
                </p>
                <p className="mt-2 min-h-20 whitespace-pre-wrap text-sm font-medium text-gray-700">
                  {selectedCustomer.noted || "Belum ada catatan khusus untuk customer ini."}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <SectionTitle
                title="Diagram Customer"
                subtitle="Area kanan digunakan untuk grafik, bukan tabel scoring."
              />

              <div className="grid gap-4">
                <PieChartCard title="Diagram Customer Berdasarkan Skor" data={skorPieData} />
                <PieChartCard title="Perbandingan Customer Berdasarkan Sumber" data={sumberPieData} />
              </div>
            </div>
          </div>

          <div className="border-t p-5">
            <Link
              href={`/menu/data-kelolaan/form?id=${selectedCustomer.no}`}
              className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-[#C92C1E] hover:bg-red-100"
            >
              <EditIcon />
              Edit Full Form
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-orange-100 bg-orange-50/60 p-5">
          <p className="text-sm font-black text-orange-800">
            Belum ada customer yang dipilih.
          </p>
          <p className="mt-1 text-xs font-medium text-orange-700/80">
            Klik salah satu baris customer di halaman Data Kelolaan untuk melihat deskripsi detail customer di sini.
          </p>
        </section>
      )}

      <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase text-gray-900">
              Diagram Tren Pertumbuhan Customer
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-gray-400">
              Default mengambil 4 bulan terakhir. Kamu juga bisa memilih rentang hari, rentang bulan, atau rentang tahun.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={trendMode}
              onChange={(event) => setTrendMode(event.target.value as TrendRangeMode)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 focus:outline-none"
            >
              <option value="default4bulan">Default 4 Bulan Terakhir</option>
              <option value="harian">Rentang Hari</option>
              <option value="bulanan">Rentang Bulan</option>
              <option value="tahunan">Rentang Tahun</option>
            </select>

            {trendMode === "harian" && (
              <>
                <input
                  type="date"
                  value={trendStartDate}
                  onChange={(event) => setTrendStartDate(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 focus:outline-none"
                />
                <span className="text-xs font-black text-gray-300">s/d</span>
                <input
                  type="date"
                  value={trendEndDate}
                  onChange={(event) => setTrendEndDate(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 focus:outline-none"
                />
              </>
            )}

            {(trendMode === "bulanan" || trendMode === "default4bulan") && (
              <>
                <select
                  value={trendStartMonth}
                  onChange={(event) => setTrendStartMonth(event.target.value)}
                  disabled={trendMode === "default4bulan"}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 focus:outline-none disabled:opacity-60"
                >
                  {LIST_BULAN.map((month) => (
                    <option key={`start-${month}`} value={month}>
                      Dari {month}
                    </option>
                  ))}
                </select>

                <select
                  value={trendEndMonth}
                  onChange={(event) => setTrendEndMonth(event.target.value)}
                  disabled={trendMode === "default4bulan"}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 focus:outline-none disabled:opacity-60"
                >
                  {LIST_BULAN.map((month) => (
                    <option key={`end-${month}`} value={month}>
                      Sampai {month}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={trendMonthYear}
                  onChange={(event) => setTrendMonthYear(event.target.value)}
                  disabled={trendMode === "default4bulan"}
                  className="w-28 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 focus:outline-none disabled:opacity-60"
                  placeholder="Tahun"
                />
              </>
            )}

            {trendMode === "tahunan" && (
              <>
                <input
                  type="number"
                  value={trendStartYear}
                  onChange={(event) => setTrendStartYear(event.target.value)}
                  className="w-28 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 focus:outline-none"
                  placeholder="Dari tahun"
                />
                <span className="text-xs font-black text-gray-300">s/d</span>
                <input
                  type="number"
                  value={trendEndYear}
                  onChange={(event) => setTrendEndYear(event.target.value)}
                  className="w-28 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 focus:outline-none"
                  placeholder="Sampai tahun"
                />
              </>
            )}
          </div>
        </div>

        <TrendChartCard data={trendData} />
      </section>

      <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-black uppercase text-gray-900">
            Diagram Perbandingan Paket Langganan Customer
          </h2>
          <p className="mt-0.5 text-[11px] font-medium text-gray-400">
Mengikuti mode filter yang sama dengan grafik pertumbuhan di atas. Arahkan kursor ke batang grafik untuk melihat paket dan jumlah customer.
          </p>
        </div>

        <PackageBarChartCard data={packageTrendData} />
      </section>
    </div>
  );
}