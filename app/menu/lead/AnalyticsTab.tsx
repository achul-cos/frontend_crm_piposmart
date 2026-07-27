"use client";

import React, { useMemo, useState } from "react";

interface NasabahItem {
  ownerId?: number;
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
type ChartFilterMode = "total" | "harian" | "bulanan" | "tahunan";

interface ChartFilterState {
  mode: ChartFilterMode;
  startDate: string;
  endDate: string;
  startMonth: string;
  endMonth: string;
  monthYear: string;
  startYear: string;
  endYear: string;
}



const PIPO_CHART_COLORS = {
  primary: "#C92C1E",
  dark: "#8F1F16",
  coral: "#E24A3B",
  orange: "#F0783E",
  amber: "#F6B84B",
  cream: "#FFF8F6",
  soft: "#FDE2DD",
  grid: "#F4C7C1",
};

const SKOR_MASTER = [
  { key: "0", label: "Tidak Potensial (0)", color: PIPO_CHART_COLORS.dark },
  { key: "1", label: "Kemungkinan Potensial", color: PIPO_CHART_COLORS.primary },
  { key: "2", label: "Potensial (2)", color: PIPO_CHART_COLORS.orange },
  { key: "3", label: "Langganan (3)", color: PIPO_CHART_COLORS.amber },
];

const SUMBER_COLORS = [
  PIPO_CHART_COLORS.primary,
  PIPO_CHART_COLORS.coral,
  PIPO_CHART_COLORS.orange,
];

const SUMBER_MASTER = [
  { key: "Facebook", label: "Facebook", color: PIPO_CHART_COLORS.primary },
  { key: "Instagram", label: "Instagram", color: PIPO_CHART_COLORS.coral },
  { key: "Tiktok", label: "Tiktok", color: PIPO_CHART_COLORS.orange },
];

const KEMITRAAN_MASTER = [
  { key: "Non Mitra", label: "Non Mitra", color: PIPO_CHART_COLORS.dark },
  { key: "Referal", label: "Referal", color: PIPO_CHART_COLORS.primary },
  { key: "Partnership", label: "Partnership", color: PIPO_CHART_COLORS.orange },
  { key: "Regional", label: "Regional", color: PIPO_CHART_COLORS.amber },
];


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

function getSumberKey(item: NasabahItem) {
  const sumber = String(item.sumberNasabah || "").toLowerCase();

  if (sumber.includes("facebook") || sumber.includes("fb")) return "Facebook";
  if (sumber.includes("instagram") || sumber.includes("ig")) return "Instagram";
  if (sumber.includes("tiktok") || sumber.includes("tik tok")) return "Tiktok";

  return "Facebook";
}

function getKemitraanKey(item: NasabahItem) {
  const sumber = String(item.sumberNasabah || "").toLowerCase();
  const status = String(item.statusAkun || "").toLowerCase();
  const noted = String(item.noted || "").toLowerCase();
  const combined = `${sumber} ${status} ${noted}`;

  if (combined.includes("regional")) return "Regional";
  if (combined.includes("non mitra") || combined.includes("non-mitra")) return "Non Mitra";
  if (combined.includes("partnership") || combined.includes("partner")) return "Partnership";
  if (combined.includes("referal") || combined.includes("referral")) return "Referal";
  if (combined.includes("mitra")) return "Partnership";

  return "Non Mitra";
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

function completePieDataWithMaster(
  data: { key: string; label: string; value: number; color: string }[],
  master: { key: string; label: string; color: string }[],
) {
  const valueMap = new Map(data.map((item) => [item.key, item.value]));

  return master.map((item) => ({
    key: item.key,
    label: item.label,
    value: valueMap.get(item.key) || 0,
    color: item.color,
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
    <div className="rounded-3xl border border-red-100 bg-gradient-to-br from-white via-red-50/40 to-[#FFF8F6] p-5 shadow-sm">
      <h2 className="text-lg font-black text-[#8F1F16]">{title}</h2>

      {total === 0 ? (
        <div className="py-14 text-center text-xs font-bold italic text-gray-400">
          Belum ada data untuk diagram ini.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(260px,1fr)_220px]">
          <div className="flex justify-center overflow-x-auto">
            <svg viewBox="0 0 260 260" className="h-[240px] w-[240px] min-w-[240px] sm:h-[260px] sm:w-[260px] sm:min-w-[260px]">
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
                    <title>{`${item.label}: ${item.value} owner (${((item.value / total) * 100).toFixed(1)}%)`}</title>
                  </path>
                );
              })}

              <circle cx={130} cy={130} r={42} fill="white" />
              <text x={130} y={126} textAnchor="middle" className="fill-[#C92C1E] text-[10px] font-black">
                TOTAL
              </text>
              <text x={130} y={146} textAnchor="middle" className="fill-[#8F1F16] text-[18px] font-black">
                {total}
              </text>
            </svg>
          </div>

          <div className="grid gap-2 self-center sm:grid-cols-2 xl:grid-cols-1">
            {data.map((item) => {
              const percentage = total ? (item.value / total) * 100 : 0;

              return (
                <div key={item.key} className="min-w-0 rounded-2xl border border-red-100 bg-white/80 p-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <p className="min-w-0 truncate text-xs font-black text-[#8F1F16]" title={item.label}>
                      {item.label}
                    </p>
                  </div>
                  <p className="mt-1 whitespace-nowrap text-[11px] font-bold text-[#B7645C]">
                    {item.value} owner • {percentage.toFixed(1)}%
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

function createDefaultChartFilter(today = new Date()): ChartFilterState {
  return {
    mode: "total",
    startDate: toInputDate(addDays(today, -7)),
    endDate: toInputDate(today),
    startMonth: LIST_BULAN[Math.max(0, today.getMonth() - 3)],
    endMonth: LIST_BULAN[today.getMonth()],
    monthYear: String(today.getFullYear()),
    startYear: String(today.getFullYear() - 2),
    endYear: String(today.getFullYear()),
  };
}

function filterDataByChartRange(data: NasabahItem[], filter: ChartFilterState) {
  if (filter.mode === "total") return data;

  if (filter.mode === "harian") {
    const rawStart = filter.startDate || "1900-01-01";
    const rawEnd = filter.endDate || "2999-12-31";
    const start = rawStart <= rawEnd ? rawStart : rawEnd;
    const end = rawStart <= rawEnd ? rawEnd : rawStart;

    return data.filter((item) => {
      const currentDate = getItemDate(item);
      return currentDate >= start && currentDate <= end;
    });
  }

  if (filter.mode === "bulanan") {
    const year = Number(filter.monthYear) || new Date().getFullYear();
    const startIndex = filter.startMonth ? LIST_BULAN.indexOf(filter.startMonth) : 0;
    const endIndex = filter.endMonth ? LIST_BULAN.indexOf(filter.endMonth) : 11;
    const minMonth = Math.max(0, Math.min(startIndex === -1 ? 0 : startIndex, endIndex === -1 ? 11 : endIndex));
    const maxMonth = Math.min(11, Math.max(startIndex === -1 ? 0 : startIndex, endIndex === -1 ? 11 : endIndex));

    return data.filter((item) => {
      return getItemYear(item) === year && getItemMonthIndex(item) >= minMonth && getItemMonthIndex(item) <= maxMonth;
    });
  }

  const rawStartYear = Number(filter.startYear) || new Date().getFullYear() - 2;
  const rawEndYear = Number(filter.endYear) || new Date().getFullYear();
  const startYear = Math.min(rawStartYear, rawEndYear);
  const endYear = Math.max(rawStartYear, rawEndYear);

  return data.filter((item) => {
    const year = getItemYear(item);
    return year >= startYear && year <= endYear;
  });
}

function buildTrendDataByChartFilter(data: NasabahItem[], filter: ChartFilterState) {
  if (filter.mode === "total") {
    const buckets = new Map<string, NasabahItem[]>();

    data.forEach((item) => {
      const year = getItemYear(item);
      const month = getItemMonthIndex(item);
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const current = buckets.get(key) || [];
      current.push(item);
      buckets.set(key, current);
    });

    return Array.from(buckets.entries())
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, group]) => {
        const [, month] = key.split("-");
        const monthIndex = Number(month) - 1;

        return {
          label: `${LIST_BULAN[monthIndex]} ${key.slice(0, 4)}`,
          total: group.length,
          "0": group.filter((item) => getSkorKey(item) === "0").length,
          "1": group.filter((item) => getSkorKey(item) === "1").length,
          "2": group.filter((item) => getSkorKey(item) === "2").length,
          "3": group.filter((item) => getSkorKey(item) === "3").length,
        };
      });
  }

  return buildTrendData(data, filter.mode, {
    startDate: filter.startDate,
    endDate: filter.endDate,
    startMonth: filter.startMonth,
    endMonth: filter.endMonth,
    monthYear: filter.monthYear,
    startYear: filter.startYear,
    endYear: filter.endYear,
  });
}

function buildPackageDataByChartFilter(data: NasabahItem[], filter: ChartFilterState) {
  if (filter.mode === "total") {
    const subscribedGroup = data.filter((item) => getPackageKey(item) !== "lainnya");

    return [
      {
        label: "Total",
        total: subscribedGroup.length,
        basic: subscribedGroup.filter((item) => getPackageKey(item) === "basic").length,
        business: subscribedGroup.filter((item) => getPackageKey(item) === "business").length,
        pro: subscribedGroup.filter((item) => getPackageKey(item) === "pro").length,
      },
    ];
  }

  return buildPackageTrendData(data, filter.mode, {
    startDate: filter.startDate,
    endDate: filter.endDate,
    startMonth: filter.startMonth,
    endMonth: filter.endMonth,
    monthYear: filter.monthYear,
    startYear: filter.startYear,
    endYear: filter.endYear,
  });
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
    { key: "total", label: "Total", color: PIPO_CHART_COLORS.primary },
    { key: "0", label: "Tidak Potensial (0)", color: PIPO_CHART_COLORS.dark },
    { key: "1", label: "Kemungkinan (1)", color: PIPO_CHART_COLORS.coral },
    { key: "2", label: "Potensial (2)", color: PIPO_CHART_COLORS.orange },
    { key: "3", label: "Langganan (3)", color: PIPO_CHART_COLORS.amber },
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
    <div className="rounded-3xl border border-red-100 bg-gradient-to-br from-white via-red-50/40 to-[#FFF8F6] p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#8F1F16]">Tren Jumlah Owner Berdasarkan Skor</h2>
          <p className="mt-1 text-[11px] font-medium text-[#B7645C]">
            Menampilkan jumlah owner sesuai rentang bulan dan tahun yang dipilih.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {series.map((serie) => (
            <div key={serie.key} className="flex items-center gap-1 text-[11px] font-bold text-[#8F1F16]">
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
                  stroke={PIPO_CHART_COLORS.grid}
                  strokeWidth={1}
                />
                <text x={padding.left - 12} y={y + 4} textAnchor="end" className="fill-[#B7645C] text-[11px] font-bold">
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
              className="fill-[#8F1F16] text-[11px] font-bold"
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
                    <title>{`${serie.label} - ${data[index]?.label}: ${Number(data[index]?.[serie.key]) || 0} owner`}</title>
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
    { key: "total", label: "Total", color: PIPO_CHART_COLORS.primary },
    { key: "basic", label: "Basic", color: PIPO_CHART_COLORS.coral },
    { key: "business", label: "Business", color: PIPO_CHART_COLORS.orange },
    { key: "pro", label: "Pro", color: PIPO_CHART_COLORS.amber },
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
    <div className="rounded-3xl border border-red-100 bg-gradient-to-br from-white via-red-50/40 to-[#FFF8F6] p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#8F1F16]">
            Perbandingan Owner Langganan Berdasarkan Paket
          </h2>
          <p className="mt-1 text-[11px] font-medium text-[#B7645C]">
            Membandingkan owner langganan berdasarkan paket Basic, Business, dan Pro.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {series.map((serie) => (
            <div key={serie.key} className="flex items-center gap-1 text-[11px] font-bold text-[#8F1F16]">
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
                  stroke={PIPO_CHART_COLORS.grid}
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#B7645C] text-[11px] font-bold"
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
                    <title>{`${serie.label} - ${item.label}: ${value} owner`}</title>
                  </rect>
                );
              })}

              <text
                x={padding.left + groupIndex * groupWidth + groupWidth / 2}
                y={height - 16}
                textAnchor="middle"
                className="fill-[#8F1F16] text-[12px] font-bold"
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


function ChartFilterControls({
  value,
  onChange,
}: {
  value: ChartFilterState;
  onChange: (nextValue: ChartFilterState) => void;
}) {
  const updateFilter = (patch: Partial<ChartFilterState>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={value.mode}
          onChange={(event) => updateFilter({ mode: event.target.value as ChartFilterMode })}
          className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-[#8F1F16] outline-none focus:border-[#C92C1E] sm:w-auto"
        >
          <option value="total">Total Owner</option>
          <option value="harian">Rentang Hari</option>
          <option value="bulanan">Rentang Bulan</option>
          <option value="tahunan">Rentang Tahun</option>
        </select>

        {value.mode === "harian" && (
          <>
            <input
              type="date"
              value={value.startDate}
              onChange={(event) => updateFilter({ startDate: event.target.value })}
              className="rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-[#8F1F16] outline-none focus:border-[#C92C1E]"
            />
            <span className="text-xs font-black text-gray-300">s/d</span>
            <input
              type="date"
              value={value.endDate}
              onChange={(event) => updateFilter({ endDate: event.target.value })}
              className="rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-[#8F1F16] outline-none focus:border-[#C92C1E]"
            />
          </>
        )}

        {value.mode === "bulanan" && (
          <>
            <select
              value={value.startMonth}
              onChange={(event) => updateFilter({ startMonth: event.target.value })}
              className="rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-[#8F1F16] outline-none focus:border-[#C92C1E]"
            >
              {LIST_BULAN.map((month) => (
                <option key={`filter-start-${month}`} value={month}>
                  Dari {month}
                </option>
              ))}
            </select>

            <select
              value={value.endMonth}
              onChange={(event) => updateFilter({ endMonth: event.target.value })}
              className="rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-[#8F1F16] outline-none focus:border-[#C92C1E]"
            >
              {LIST_BULAN.map((month) => (
                <option key={`filter-end-${month}`} value={month}>
                  Sampai {month}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={value.monthYear}
              onChange={(event) => updateFilter({ monthYear: event.target.value })}
              className="w-28 rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-[#8F1F16] outline-none focus:border-[#C92C1E]"
              placeholder="Tahun"
            />
          </>
        )}

        {value.mode === "tahunan" && (
          <>
            <input
              type="number"
              value={value.startYear}
              onChange={(event) => updateFilter({ startYear: event.target.value })}
              className="w-28 rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-[#8F1F16] outline-none focus:border-[#C92C1E]"
              placeholder="Dari tahun"
            />
            <span className="text-xs font-black text-gray-300">s/d</span>
            <input
              type="number"
              value={value.endYear}
              onChange={(event) => updateFilter({ endYear: event.target.value })}
              className="w-28 rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-[#8F1F16] outline-none focus:border-[#C92C1E]"
              placeholder="Sampai tahun"
            />
          </>
        )}
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
          : "border-red-100 bg-white hover:border-[#C92C1E]/30 hover:bg-red-50/20"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full flex-col gap-4 p-4 text-left transition sm:p-5 md:flex-row md:items-center md:justify-between ${
          open ? "bg-red-50/70" : "bg-gradient-to-r from-white to-[#FFF8F6]"
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
              <h2 className="text-xs font-black uppercase leading-snug text-[#8F1F16] sm:text-sm">
                {title}
              </h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide sm:text-[10px] ${
                  open
                    ? "bg-white text-[#C92C1E] ring-1 ring-red-100"
                    : "bg-red-50 text-[#C92C1E]"
                }`}
              >
                {badge}
              </span>
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-[#B7645C] sm:text-xs">
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


export default function AnalyticsTab({ dataNasabah }: { dataNasabah: NasabahItem[] }) {
  if (!dataNasabah) return null;
  const today = new Date();
  const [skorChartFilter, setSkorChartFilter] = useState<ChartFilterState>(() => createDefaultChartFilter(today));
  const [sumberChartFilter, setSumberChartFilter] = useState<ChartFilterState>(() => createDefaultChartFilter(today));
  const [kemitraanChartFilter, setKemitraanChartFilter] = useState<ChartFilterState>(() => createDefaultChartFilter(today));
  const [pertumbuhanChartFilter, setPertumbuhanChartFilter] = useState<ChartFilterState>(() => createDefaultChartFilter(today));
  const [paketChartFilter, setPaketChartFilter] = useState<ChartFilterState>(() => createDefaultChartFilter(today));
  const [openedCharts, setOpenedCharts] = useState({
    skor: false,
    sumber: false,
    kemitraan: false,
    pertumbuhan: false,
    paket: false,
  });

  const toggleChart = (key: keyof typeof openedCharts) => {
    setOpenedCharts((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const skorFilteredData = useMemo(
    () => filterDataByChartRange(dataNasabah, skorChartFilter),
    [dataNasabah, skorChartFilter],
  );

  const sumberFilteredData = useMemo(
    () => filterDataByChartRange(dataNasabah, sumberChartFilter),
    [dataNasabah, sumberChartFilter],
  );

  const kemitraanFilteredData = useMemo(
    () => filterDataByChartRange(dataNasabah, kemitraanChartFilter),
    [dataNasabah, kemitraanChartFilter],
  );

  const pertumbuhanFilteredData = useMemo(
    () => filterDataByChartRange(dataNasabah, pertumbuhanChartFilter),
    [dataNasabah, pertumbuhanChartFilter],
  );

  const paketFilteredData = useMemo(
    () => filterDataByChartRange(dataNasabah, paketChartFilter),
    [dataNasabah, paketChartFilter],
  );

  const skorPieData = useMemo(() => {
    const colorMap = SKOR_MASTER.reduce((acc, item) => {
      acc[item.key] = item.color;
      return acc;
    }, {} as Record<string, string>);

    const labelMap = SKOR_MASTER.reduce((acc, item) => {
      acc[item.key] = item.label;
      return acc;
    }, {} as Record<string, string>);

    return buildPieData(skorFilteredData, getSkorKey, labelMap, colorMap);
  }, [skorFilteredData]);

  const sumberPieData = useMemo(() => {
    const colorMap = SUMBER_MASTER.reduce((acc, item) => {
      acc[item.key] = item.color;
      return acc;
    }, {} as Record<string, string>);

    const labelMap = SUMBER_MASTER.reduce((acc, item) => {
      acc[item.key] = item.label;
      return acc;
    }, {} as Record<string, string>);

    const rawData = buildPieData(sumberFilteredData, getSumberKey, labelMap, colorMap, SUMBER_COLORS);
    return completePieDataWithMaster(rawData, SUMBER_MASTER);
  }, [sumberFilteredData]);

  const kemitraanPieData = useMemo(() => {
    const colorMap = KEMITRAAN_MASTER.reduce((acc, item) => {
      acc[item.key] = item.color;
      return acc;
    }, {} as Record<string, string>);

    const labelMap = KEMITRAAN_MASTER.reduce((acc, item) => {
      acc[item.key] = item.label;
      return acc;
    }, {} as Record<string, string>);

    const rawData = buildPieData(kemitraanFilteredData, getKemitraanKey, labelMap, colorMap);
    return completePieDataWithMaster(rawData, KEMITRAAN_MASTER);
  }, [kemitraanFilteredData]);

  const trendData = useMemo(
    () => buildTrendDataByChartFilter(pertumbuhanFilteredData, pertumbuhanChartFilter),
    [pertumbuhanFilteredData, pertumbuhanChartFilter],
  );

  const packageTrendData = useMemo(
    () => buildPackageDataByChartFilter(paketFilteredData, paketChartFilter),
    [paketFilteredData, paketChartFilter],
  );

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <CollapsibleChartSection
          title="Diagram Owner Berdasarkan Skor"
          description="Menampilkan pembagian owner berdasarkan kategori skor, mulai dari tidak potensial sampai berlangganan."
          badge={`${skorFilteredData.length} owner`}
          open={openedCharts.skor}
          onToggle={() => toggleChart("skor")}
        >
          <div className="space-y-4">
            <ChartFilterControls value={skorChartFilter} onChange={setSkorChartFilter} />
            <PieChartCard title="Diagram Owner Berdasarkan Skor" data={skorPieData} />
          </div>
        </CollapsibleChartSection>

        <CollapsibleChartSection
          title="Perbandingan Owner Berdasarkan Sumber"
          description="Menunjukkan dari mana owner berasal, yaitu Facebook, Instagram, dan Tiktok."
          badge={`${sumberFilteredData.length} owner`}
          open={openedCharts.sumber}
          onToggle={() => toggleChart("sumber")}
        >
          <div className="space-y-4">
            <ChartFilterControls value={sumberChartFilter} onChange={setSumberChartFilter} />
            <PieChartCard title="Perbandingan Owner Berdasarkan Sumber" data={sumberPieData} />
          </div>
        </CollapsibleChartSection>
      </div>

      <div className="grid items-start gap-4">
        <CollapsibleChartSection
          title="Diagram Owner Berdasarkan Sumber Kemitraan"
          description="Menampilkan persebaran owner berdasarkan sumber kemitraan seperti Non Mitra, Referal, Partnership, dan Regional."
          badge={`${kemitraanFilteredData.length} owner`}
          open={openedCharts.kemitraan}
          onToggle={() => toggleChart("kemitraan")}
        >
          <div className="space-y-4">
            <ChartFilterControls value={kemitraanChartFilter} onChange={setKemitraanChartFilter} />
            <PieChartCard title="Diagram Owner Berdasarkan Sumber Kemitraan" data={kemitraanPieData} />
          </div>
        </CollapsibleChartSection>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <CollapsibleChartSection
          title="Diagram Tren Pertumbuhan Owner"
          description="Melihat perkembangan jumlah owner berdasarkan waktu. Grafik ini bisa difilter berdasarkan hari, bulan, atau tahun."
          badge={`${pertumbuhanFilteredData.length} owner`}
          open={openedCharts.pertumbuhan}
          onToggle={() => toggleChart("pertumbuhan")}
        >
          <div className="space-y-4">
            <ChartFilterControls value={pertumbuhanChartFilter} onChange={setPertumbuhanChartFilter} />

            <TrendChartCard data={trendData} />
          </div>
        </CollapsibleChartSection>

        <CollapsibleChartSection
          title="Diagram Perbandingan Paket Langganan Owner"
          description="Membandingkan jumlah owner berdasarkan paket langganan seperti Basic, Business, Pro, dan Bundling."
          badge={`${paketFilteredData.length} owner`}
          open={openedCharts.paket}
          onToggle={() => toggleChart("paket")}
        >
          <div className="space-y-4">
            <ChartFilterControls value={paketChartFilter} onChange={setPaketChartFilter} />
            <PackageBarChartCard data={packageTrendData} />
          </div>
        </CollapsibleChartSection>
      </div>
    </div>
  );
}