"use client";

import React, { useMemo, useState } from "react";

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

type TrendRangeMode = "default4bulan" | "harian" | "bulanan" | "tahunan";


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


function ChartToggleIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25L12 15.75 4.5 8.25" />
    </svg>
  );
}

function CollapsibleChartSection({
  title,
  description,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  badge: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`h-fit overflow-hidden rounded-3xl border shadow-sm transition-all duration-300 ${
        open
          ? "border-red-100 bg-red-50/40 shadow-md"
          : "border-gray-200 bg-white hover:border-red-100 hover:bg-red-50/20"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full flex-col gap-4 p-4 text-left transition sm:p-5 md:flex-row md:items-center md:justify-between ${
          open ? "bg-red-50/70" : "bg-gradient-to-r from-white to-gray-50/60"
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition ${
              open ? "bg-[#C92C1E] text-white" : "bg-red-50 text-[#C92C1E]"
            }`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 19.5h16.5M5.25 17.25V10.5m5.25 6.75V6.75m5.25 10.5V3.75"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xs font-black uppercase leading-snug text-gray-900 sm:text-sm">
                {title}
              </h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide sm:text-[10px] ${
                  open
                    ? "bg-white text-[#C92C1E] ring-1 ring-red-100"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {badge}
              </span>
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-gray-500 sm:text-xs">
              {description}
            </p>
          </div>
        </div>

        <div
          className={`flex w-full shrink-0 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-black shadow-sm transition md:w-auto ${
            open
              ? "bg-[#C92C1E] text-white"
              : "border border-red-100 bg-red-50 text-[#C92C1E] hover:bg-red-100"
          }`}
        >
          <span>{open ? "Tutup Grafik" : "Lihat Grafik"}</span>
          <ChartToggleIcon open={open} />
        </div>
      </button>

      {open && (
        <div className="border-t border-red-100 bg-white/70 p-3 sm:p-5">
          {children}
        </div>
      )}
    </section>
  );
}


export default function GrafikCustomer({ dataNasabah }: { dataNasabah: NasabahItem[] }) {
  const today = new Date();
  const [trendMode, setTrendMode] = useState<TrendRangeMode>("default4bulan");
  const [trendStartDate, setTrendStartDate] = useState(toInputDate(addDays(today, -7)));
  const [trendEndDate, setTrendEndDate] = useState(toInputDate(today));
  const [trendStartMonth, setTrendStartMonth] = useState(LIST_BULAN[Math.max(0, today.getMonth() - 3)]);
  const [trendEndMonth, setTrendEndMonth] = useState(LIST_BULAN[today.getMonth()]);
  const [trendMonthYear, setTrendMonthYear] = useState(String(today.getFullYear()));
  const [trendStartYear, setTrendStartYear] = useState(String(today.getFullYear() - 2));
  const [trendEndYear, setTrendEndYear] = useState(String(today.getFullYear()));
  const [openedCharts, setOpenedCharts] = useState({
    skor: false,
    sumber: false,
    pertumbuhan: false,
    paket: false,
  });

  const toggleChart = (key: keyof typeof openedCharts) => {
    setOpenedCharts((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const skorPieData = useMemo(() => {
    const colorMap = SKOR_MASTER.reduce((acc, item) => {
      acc[item.key] = item.color;
      return acc;
    }, {} as Record<string, string>);

    const labelMap = SKOR_MASTER.reduce((acc, item) => {
      acc[item.key] = item.label;
      return acc;
    }, {} as Record<string, string>);

    return buildPieData(dataNasabah, getSkorKey, labelMap, colorMap);
  }, [dataNasabah]);

  const sumberPieData = useMemo(() => {
    return buildPieData(
      dataNasabah,
      (item) => item.sumberNasabah || "Tidak Diketahui",
      undefined,
      undefined,
      SUMBER_COLORS,
    );
  }, [dataNasabah]);

  const trendData = useMemo(
    () =>
      buildTrendData(dataNasabah, trendMode, {
        startDate: trendStartDate,
        endDate: trendEndDate,
        startMonth: trendStartMonth,
        endMonth: trendEndMonth,
        monthYear: trendMonthYear,
        startYear: trendStartYear,
        endYear: trendEndYear,
      }),
    [
      dataNasabah,
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
      buildPackageTrendData(dataNasabah, trendMode, {
        startDate: trendStartDate,
        endDate: trendEndDate,
        startMonth: trendStartMonth,
        endMonth: trendEndMonth,
        monthYear: trendMonthYear,
        startYear: trendStartYear,
        endYear: trendEndYear,
      }),
    [
      dataNasabah,
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
    <div className="space-y-6">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <CollapsibleChartSection
          title="Diagram Customer Berdasarkan Skor"
          description="Menampilkan pembagian customer berdasarkan kategori skor, mulai dari tidak potensial sampai berlangganan."
          badge={`${dataNasabah.length} customer`}
          open={openedCharts.skor}
          onToggle={() => toggleChart("skor")}
        >
          <PieChartCard title="Diagram Customer Berdasarkan Skor" data={skorPieData} />
        </CollapsibleChartSection>

        <CollapsibleChartSection
          title="Perbandingan Customer Berdasarkan Sumber"
          description="Menunjukkan dari mana customer berasal, seperti Instagram, Facebook, TikTok, Mitra, Playstore, atau sumber lainnya."
          badge="Sumber data"
          open={openedCharts.sumber}
          onToggle={() => toggleChart("sumber")}
        >
          <PieChartCard title="Perbandingan Customer Berdasarkan Sumber" data={sumberPieData} />
        </CollapsibleChartSection>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <CollapsibleChartSection
          title="Diagram Tren Pertumbuhan Customer"
          description="Melihat perkembangan jumlah customer berdasarkan waktu. Grafik ini bisa difilter berdasarkan hari, bulan, atau tahun."
          badge="Tren customer"
          open={openedCharts.pertumbuhan}
          onToggle={() => toggleChart("pertumbuhan")}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={trendMode}
                onChange={(event) => setTrendMode(event.target.value as TrendRangeMode)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 focus:outline-none sm:w-auto"
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

            <TrendChartCard data={trendData} />
          </div>
        </CollapsibleChartSection>

        <CollapsibleChartSection
          title="Diagram Perbandingan Paket Langganan Customer"
          description="Membandingkan jumlah customer berdasarkan paket langganan seperti Basic, Business, Pro, dan Bundling."
          badge="Paket customer"
          open={openedCharts.paket}
          onToggle={() => toggleChart("paket")}
        >
          <PackageBarChartCard data={packageTrendData} />
        </CollapsibleChartSection>
      </div>
    </div>
  );
}