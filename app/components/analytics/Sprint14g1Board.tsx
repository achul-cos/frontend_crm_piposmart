"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { geoMercator, geoPath } from "d3-geo";
import { toJpeg, toPng } from "html-to-image";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import {
  fetchAnalyticsCatalog,
  queryAnalyticsDiagram,
  type AnalyticsCatalogItem,
  type AnalyticsChartSeries,
  type AnalyticsQueryRequest,
  type AnalyticsQueryResult,
} from "@/app/lib/api";
import {
  INDONESIA_PROVINCE_GEOJSON,
  matchProvinceToGadmName,
  type IndonesiaProvinceFeature,
} from "@/app/lib/geo/indonesia-provinces";

type FilterMode = "month_range" | "date_range" | "year_range";

export interface Sprint14g1DiagramConfig {
  module: string;
  key: string;
}

export interface Sprint14g1Section {
  id: string;
  title: string;
  description: string;
  diagrams: Sprint14g1DiagramConfig[];
}

interface FilterState {
  mode: FilterMode;
  comparePrevious: boolean;
  monthFrom: string;
  monthTo: string;
  dateFrom: string;
  dateTo: string;
  yearFrom: string;
  yearTo: string;
}

interface DiagramViewState {
  item?: AnalyticsCatalogItem;
  result?: AnalyticsQueryResult;
  isLoading: boolean;
  error?: string;
}

type MetricSelections = Record<string, string>;

interface BoardSummaryCard {
  label: string;
  value: string | number;
  description: string;
  tone?: "primary" | "neutral";
}

export interface Sprint14g1BoardProps {
  heroLabel: string;
  title: string;
  description: string;
  sections: Sprint14g1Section[];
}

const CHART_COLORS = [
  "#C92C1E",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#10B981",
  "#0EA5E9",
  "#8B5CF6",
  "#EC4899",
];

type ExportFormat = "png" | "jpg" | "pdf" | "excel";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toMonthInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getDefaultFilters(): FilterState {
  const now = new Date();
  const currentYear = now.getFullYear();
  const past30 = new Date(now);
  past30.setDate(now.getDate() - 29);

  return {
    mode: "month_range",
    comparePrevious: false,
    monthFrom: `${currentYear}-01`,
    monthTo: toMonthInput(now),
    dateFrom: toDateInput(past30),
    dateTo: toDateInput(now),
    yearFrom: String(currentYear - 2),
    yearTo: String(currentYear),
  };
}

function diagramKey(module: string, key: string) {
  return `${module}/${key}`;
}

function formatNumber(value: number | undefined, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("id-ID", options).format(value ?? 0);
}

function humanizeLabel(value: string | number) {
  if (typeof value === "number") return formatNumber(value);
  const text = String(value);
  if (/^\d{4}-\d{2}$/.test(text)) {
    const [year, month] = text.split("-");
    const monthIndex = Number(month) - 1;
    return new Intl.DateTimeFormat("id-ID", {
      month: "short",
      year: "numeric",
    }).format(new Date(Number(year), monthIndex, 1));
  }
  return text.replaceAll("_", " ");
}

function tooltipValue(value: unknown) {
  return formatNumber(Number(value || 0));
}

function humanizeMetric(metric: string) {
  return metric
    .replaceAll("_", " ")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

function usesAllMetricsByDefault(item?: AnalyticsCatalogItem) {
  if (!item?.supported_metrics?.length) return false;

  return [
    "mixed",
    "monthly-operating-review-board",
    "north-star-kpi-trend",
    "multi-series-trend",
    "metric-comparison-board",
    "region-comparison-board",
    "comparison-impact-summary",
  ].includes(item.type) || [
    "monthly-operating-review-board",
    "north-star-kpi-trend",
    "multi-series-trend",
    "metric-comparison-board",
    "region-comparison-board",
    "comparison-impact-summary",
  ].includes(item.key);
}

function getDefaultMetric(item?: AnalyticsCatalogItem) {
  if (!item?.supported_metrics?.length) return "";
  if (usesAllMetricsByDefault(item)) return item.supported_metrics.join(",");
  return item.supported_metrics[0] || "";
}

function getSafePoints(series?: AnalyticsChartSeries | null) {
  if (!series || !Array.isArray(series.points)) return [];
  return series.points;
}

function mergeSeriesRows(series: AnalyticsChartSeries[] = []) {
  const rowMap = new Map<string, Record<string, string | number>>();
  const orderMap = new Map<string, number>();
  let order = 0;

  for (const item of series) {
    for (const point of getSafePoints(item)) {
      const label = String(point.x);
      if (!rowMap.has(label)) {
        rowMap.set(label, { label });
        orderMap.set(label, order++);
      }
      rowMap.get(label)![item.key] = Number(point.y || 0);
    }
  }

  return Array.from(rowMap.values()).sort(
    (a, b) => (orderMap.get(String(a.label)) ?? 0) - (orderMap.get(String(b.label)) ?? 0),
  );
}

function getSingleSeriesRows(series: AnalyticsChartSeries[] = []) {
  const source = series[0];
  if (!source) return [];
  return getSafePoints(source).map((point) => ({
    label: String(point.x),
    value: Number(point.y || 0),
  }));
}

function parseMetricSelection(metricSelection?: string) {
  if (!metricSelection) return undefined;
  const items = metricSelection
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function buildQueryPayload(filters: FilterState, metricSelection?: string): AnalyticsQueryRequest {
  const metrics = parseMetricSelection(metricSelection);
  if (filters.mode === "date_range") {
    return {
      time_filter: {
        mode: "date_range",
        date_from: filters.dateFrom,
        date_to: filters.dateTo,
        granularity: "day",
      },
      metrics,
      comparison: filters.comparePrevious ? { enabled: true, mode: "previous_period" } : { enabled: false },
      filters: {},
      options: { include_summary: true, include_table: true },
    };
  }

  if (filters.mode === "year_range") {
    return {
      time_filter: {
        mode: "year_range",
        year_from: Number(filters.yearFrom),
        year_to: Number(filters.yearTo),
        granularity: "year",
      },
      metrics,
      comparison: filters.comparePrevious ? { enabled: true, mode: "previous_period" } : { enabled: false },
      filters: {},
      options: { include_summary: true, include_table: true },
    };
  }

  return {
    time_filter: {
      mode: "month_range",
      month_from: filters.monthFrom,
      month_to: filters.monthTo,
      granularity: "month",
    },
    metrics,
    comparison: filters.comparePrevious ? { enabled: true, mode: "previous_period" } : { enabled: false },
    filters: {},
    options: { include_summary: true, include_table: true },
  };
}

function filterLabel(filters: FilterState) {
  if (filters.mode === "date_range") return `${filters.dateFrom} s.d. ${filters.dateTo}`;
  if (filters.mode === "year_range") return `${filters.yearFrom} s.d. ${filters.yearTo}`;
  return `${filters.monthFrom} s.d. ${filters.monthTo}`;
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildExportFileName(item: AnalyticsCatalogItem, formatLabel?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const base = sanitizeFileName(`${item.module}-${item.key}-${item.name}`);
  return `${base}${formatLabel ? `-${formatLabel}` : ""}-${today}`;
}

function downloadBlobUrl(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function truncateSheetName(name: string) {
  return name.slice(0, 31) || "Sheet1";
}

function extractDiagramRows(result?: AnalyticsQueryResult) {
  if (result?.table?.length) return result.table;
  if (!result?.series?.length) return [];
  return mergeSeriesRows(result.series);
}

function extractComparisonRows(result?: AnalyticsQueryResult) {
  const comparison = result?.comparison;
  if (!comparison?.enabled) return [];
  return [
    {
      baseline_label: comparison.baseline_label || "-",
      current_value: comparison.current_value ?? 0,
      baseline_value: comparison.baseline_value ?? 0,
      delta: comparison.delta ?? 0,
      delta_percent: comparison.delta_percent ?? 0,
      direction: comparison.direction || "neutral",
      polarity_rule: comparison.polarity_rule || "-",
      status_value: comparison.status_value ?? 0,
    },
  ];
}

function extractInsightRows(item: AnalyticsCatalogItem, result?: AnalyticsQueryResult, activeFilterLabel?: string) {
  return [
    {
      module: item.module,
      diagram_key: item.key,
      diagram_name: item.name,
      period: activeFilterLabel || "-",
      function: item.function,
      purpose: item.purpose,
      how_to_read: item.how_to_read,
      analysis_goal: item.analysis_goal,
      summary: result?.insight?.summary || "",
      conclusion: result?.insight?.conclusion || "",
      recommendation: result?.insight?.recommendation || "",
    },
  ];
}

async function exportDiagramAsImage(node: HTMLElement, item: AnalyticsCatalogItem, format: "png" | "jpg") {
  const fileName = buildExportFileName(item, format);
  const common = {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  };
  const dataUrl =
    format === "png"
      ? await toPng(node, common)
      : await toJpeg(node, { ...common, quality: 0.95 });
  downloadBlobUrl(dataUrl, `${fileName}.${format === "jpg" ? "jpg" : "png"}`);
}

async function exportDiagramAsPdf(
  node: HTMLElement,
  item: AnalyticsCatalogItem,
  result?: AnalyticsQueryResult,
  activeFilterLabel?: string,
) {
  const imageUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(item.name, margin, margin + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(90, 90, 90);
  pdf.text(`${item.module.toUpperCase()} • ${activeFilterLabel || "-"}`, margin, margin + 26);

  const img = new Image();
  img.src = imageUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Gagal menyiapkan image untuk PDF."));
  });

  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2 - 88;
  const imgRatio = img.width / img.height;
  let renderWidth = availableWidth;
  let renderHeight = renderWidth / imgRatio;
  if (renderHeight > availableHeight) {
    renderHeight = availableHeight;
    renderWidth = renderHeight * imgRatio;
  }
  const x = (pageWidth - renderWidth) / 2;
  pdf.addImage(imageUrl, "PNG", x, margin + 40, renderWidth, renderHeight);

  const footerLines = [
    result?.insight?.summary ? `Insight: ${result.insight.summary}` : "",
    result?.insight?.conclusion ? `Kesimpulan: ${result.insight.conclusion}` : "",
    result?.insight?.recommendation ? `Rekomendasi: ${result.insight.recommendation}` : "",
  ].filter(Boolean);

  if (footerLines.length) {
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    const text = pdf.splitTextToSize(footerLines.join("  "), pageWidth - margin * 2);
    pdf.text(text, margin, pageHeight - 28);
  }

  pdf.save(`${buildExportFileName(item, "diagram")}.pdf`);
}

function exportDiagramAsExcel(item: AnalyticsCatalogItem, result?: AnalyticsQueryResult, activeFilterLabel?: string) {
  const workbook = XLSX.utils.book_new();
  const rows = extractDiagramRows(result);
  const comparisonRows = extractComparisonRows(result);
  const insightRows = extractInsightRows(item, result, activeFilterLabel);

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows.length ? rows : [{ message: "Tidak ada data diagram." }]),
    truncateSheetName("data_diagram"),
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(comparisonRows.length ? comparisonRows : [{ message: "Tidak ada comparison." }]),
    truncateSheetName("comparison"),
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(insightRows),
    truncateSheetName("metadata_insight"),
  );

  XLSX.writeFile(workbook, `${buildExportFileName(item, "data")}.xlsx`);
}

function statusTone(direction?: string) {
  if (direction === "positive") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (direction === "negative") return "bg-red-50 text-red-700 border-red-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function ComparisonChip({ result }: { result?: AnalyticsQueryResult }) {
  const comparison = result?.comparison;
  if (!comparison?.enabled) return null;
  const delta = comparison.delta_percent ?? comparison.delta ?? 0;
  const sign = delta > 0 ? "+" : "";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusTone(
        comparison.direction,
      )}`}
    >
      {sign}
      {formatNumber(delta, { maximumFractionDigits: 2 })}
      {(comparison.delta_percent ?? null) !== undefined ? "%" : ""}
      {comparison.baseline_label ? ` vs ${comparison.baseline_label}` : ""}
    </span>
  );
}

function DiagramSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-gray-200" />
      <div className="h-72 animate-pulse rounded-[24px] bg-gradient-to-br from-gray-100 to-gray-50" />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}

function EmptyDiagramState({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-gray-50 px-5 text-center text-sm font-semibold text-gray-400">
      {message}
    </div>
  );
}

function ExportButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-gray-600 transition hover:border-[#C92C1E] hover:text-[#C92C1E] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function SummaryCard({ card }: { card: BoardSummaryCard }) {
  if (card.tone === "primary") {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-4 text-white shadow-lg">
        <p className="text-[11px] font-black uppercase tracking-wider text-red-100">{card.label}</p>
        <h3 className="mt-2 text-3xl font-black">{card.value}</h3>
        <p className="mt-1 text-xs font-semibold text-red-100">{card.description}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">{card.label}</p>
      <h3 className="mt-2 text-2xl font-black text-gray-900">{card.value}</h3>
      <p className="mt-1 text-xs font-semibold text-gray-500">{card.description}</p>
    </div>
  );
}

function AnalyticsProvinceMap({ result, metricLabel }: { result?: AnalyticsQueryResult; metricLabel: string }) {
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  const { countByProvince, unmatchedCount } = useMemo(() => {
    const rows =
      (result?.extra?.regions as Record<string, unknown>[] | undefined) ||
      result?.table ||
      [];
    const counts = new Map<string, number>();
    let unmatched = 0;

    for (const row of rows) {
      const province = String(row.province_name ?? row.province ?? row.label ?? row.region_label ?? "").trim();
      const gadmName = matchProvinceToGadmName(province);
      const numeric =
        Object.entries(row).find(([key]) => key.endsWith("_count"))?.[1] ??
        row.value ??
        0;
      const count = Number(numeric || 0);

      if (!gadmName) {
        unmatched += count > 0 ? 1 : 0;
        continue;
      }

      counts.set(gadmName, (counts.get(gadmName) || 0) + count);
    }

    return { countByProvince: counts, unmatchedCount: unmatched };
  }, [result?.extra?.regions, result?.table]);

  const maxCount = Math.max(1, ...Array.from(countByProvince.values(), (value) => value || 0));

  const projection = useMemo(
    () =>
      geoMercator().fitSize(
        [760, 340],
        INDONESIA_PROVINCE_GEOJSON as unknown as Parameters<
          ReturnType<typeof geoMercator>["fitSize"]
        >[1],
      ),
    [],
  );
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  return (
    <div className="space-y-3">
      {unmatchedCount > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          Ada {formatNumber(unmatchedCount)} data provinsi yang belum cocok ke peta Indonesia.
        </p>
      )}
      <div className="relative overflow-hidden rounded-[24px] border border-gray-100 bg-[#FCFCFC] p-3">
        <svg viewBox="0 0 760 340" className="w-full">
          {INDONESIA_PROVINCE_GEOJSON.features.map((feature: IndonesiaProvinceFeature) => {
            const name = feature.properties.NAME_1;
            const count = countByProvince.get(name) || 0;
            const intensity = count === 0 ? 0 : 0.2 + (count / maxCount) * 0.8;
            const path = pathGenerator(feature as never) || "";

            return (
              <path
                key={name}
                d={path}
                fill={count === 0 ? "#F3F4F6" : `rgba(201, 44, 30, ${intensity})`}
                stroke="#ffffff"
                strokeWidth={0.7}
                onMouseEnter={() => setHoveredProvince(name)}
                onMouseLeave={() => setHoveredProvince((current) => (current === name ? null : current))}
              />
            );
          })}
        </svg>

        {hoveredProvince && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-xl bg-gray-900/90 px-3 py-2 text-[11px] font-bold text-white shadow-lg">
            {hoveredProvince}: {formatNumber(countByProvince.get(hoveredProvince) || 0)} {metricLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function FunnelDiagram({ result }: { result?: AnalyticsQueryResult }) {
  const rows = getSingleSeriesRows(result?.series);
  const maxValue = Math.max(1, ...rows.map((row) => row.value));

  if (!rows.length) return <EmptyDiagramState message="Belum ada data funnel untuk periode yang dipilih." />;

  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const width = Math.max(18, (row.value / maxValue) * 100);
        return (
          <div key={`${row.label}-${index}`} className="rounded-[24px] border border-gray-100 bg-[#FCFCFC] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black text-gray-900">{humanizeLabel(row.label)}</p>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-[#C92C1E]">
                {formatNumber(row.value)}
              </span>
            </div>
            <div className="h-3 rounded-full bg-gray-100">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-[#C92C1E] to-[#F59E0B]"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SankeyLikeDiagram({ result }: { result?: AnalyticsQueryResult }) {
  const links = ((result?.extra?.links as Record<string, unknown>[] | undefined) || result?.table || []).map(
    (item) => ({
      source: String(item.source ?? item.from_role ?? "-"),
      target: String(item.target ?? item.to_role ?? "-"),
      value: Number(item.value ?? item.total ?? 0),
    }),
  );

  if (!links.length) return <EmptyDiagramState message="Belum ada perpindahan ownership pada periode yang dipilih." />;

  const maxValue = Math.max(1, ...links.map((item) => item.value));

  return (
    <div className="space-y-3">
      {links.map((link, index) => (
        <div key={`${link.source}-${link.target}-${index}`} className="rounded-[24px] border border-gray-100 bg-[#FCFCFC] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-gray-700">
              <span className="rounded-full bg-gray-100 px-2.5 py-1">{link.source}</span>
              <span className="text-[#C92C1E]">→</span>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[#C92C1E]">{link.target}</span>
            </div>
            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
              {formatNumber(link.value)} transfer
            </span>
          </div>
          <div className="h-3 rounded-full bg-gray-100">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-[#C92C1E] to-[#F97316]"
              style={{ width: `${Math.max(16, (link.value / maxValue) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function HeatmapDiagram({ result }: { result?: AnalyticsQueryResult }) {
  const rawCells =
    ((result?.extra?.cells as Record<string, unknown>[] | undefined) || result?.table || []).map((cell) => ({
      row:
        String(cell.package_name ?? cell.row_label ?? cell.row ?? cell.label ?? "Tanpa Label"),
      column:
        String(cell.tenure_label ?? cell.column_label ?? cell.column ?? cell.period ?? "-"),
      value: Number(cell.value ?? 0),
    }));

  if (!rawCells.length) return <EmptyDiagramState message="Belum ada data heatmap untuk periode yang dipilih." />;

  const rows = Array.from(new Set(rawCells.map((cell) => cell.row)));
  const columns = Array.from(new Set(rawCells.map((cell) => cell.column)));
  const maxValue = Math.max(1, ...rawCells.map((cell) => cell.value));
  const cellMap = new Map(rawCells.map((cell) => [`${cell.row}::${cell.column}`, cell.value] as const));

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[560px] gap-2"
        style={{ gridTemplateColumns: `180px repeat(${columns.length}, minmax(92px, 1fr))` }}
      >
        <div className="sticky left-0 z-10 rounded-2xl bg-white/95 p-3 text-xs font-black uppercase tracking-wide text-gray-400">
          Paket
        </div>
        {columns.map((column) => (
          <div
            key={column}
            className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 text-center text-xs font-black text-gray-600"
          >
            {humanizeLabel(column)}
          </div>
        ))}

        {rows.map((row) => (
          <React.Fragment key={row}>
            <div className="sticky left-0 z-10 rounded-2xl border border-gray-100 bg-white/95 px-3 py-3 text-sm font-black text-gray-800">
              {humanizeLabel(row)}
            </div>
            {columns.map((column) => {
              const value = cellMap.get(`${row}::${column}`) || 0;
              const intensity = value === 0 ? 0 : 0.16 + (value / maxValue) * 0.84;
              return (
                <div
                  key={`${row}-${column}`}
                  className="rounded-2xl border border-white/60 px-3 py-4 text-center shadow-sm"
                  style={{
                    backgroundColor: value === 0 ? "#F9FAFB" : `rgba(201, 44, 30, ${intensity})`,
                    color: value === 0 ? "#6B7280" : "#FFFFFF",
                  }}
                  title={`${row} - ${column}: ${formatNumber(value)}`}
                >
                  <p className="text-sm font-black">{formatNumber(value)}</p>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function WaterfallDiagram({ result }: { result?: AnalyticsQueryResult }) {
  const rows = getSingleSeriesRows(result?.series);
  if (!rows.length) return <EmptyDiagramState message="Belum ada data waterfall untuk periode yang dipilih." />;

  const maxValue = Math.max(1, ...rows.map((row) => Math.abs(row.value)));

  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const isNegative = row.value < 0;
        const width = Math.max(12, (Math.abs(row.value) / maxValue) * 100);
        return (
          <div key={`${row.label}-${index}`} className="rounded-[24px] border border-gray-100 bg-[#FCFCFC] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-black text-gray-900">{humanizeLabel(row.label)}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  isNegative ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {isNegative ? "-" : "+"}
                {formatNumber(Math.abs(row.value))}
              </span>
            </div>
            <div className="h-3 rounded-full bg-gray-100">
              <div
                className={`h-3 rounded-full ${isNegative ? "bg-gradient-to-r from-red-500 to-rose-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScatterDiagram({ result }: { result?: AnalyticsQueryResult }) {
  const source = result?.series?.[0];
  const points = getSafePoints(source).map((point, index) => {
    const meta =
      typeof point.x === "object" && point.x !== null
        ? (point.x as Record<string, unknown>)
        : { sales_name: String(point.x) };

    return {
      id: index,
      x: Number(meta.interaction_count ?? 0),
      y: Number(point.y || 0),
      salesName: String(meta.sales_name ?? `Sales ${index + 1}`),
      conversionRate: Number(meta.conversion_rate ?? 0),
    };
  });

  if (!points.length) return <EmptyDiagramState message="Belum ada data scatter untuk periode yang dipilih." />;

  return (
    <div className="space-y-4">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              type="number"
              dataKey="x"
              name="Aktivitas"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              tickFormatter={(value) => formatNumber(Number(value))}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Closing"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              tickFormatter={(value) => formatNumber(Number(value))}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as
                  | { salesName?: string; x?: number; y?: number; conversionRate?: number }
                  | undefined;
                if (!row) return null;

                return (
                  <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
                    <p className="text-sm font-black text-gray-900">{row.salesName || "-"}</p>
                    <div className="mt-2 space-y-1 text-xs font-semibold text-gray-600">
                      <p>Aktivitas: {formatNumber(row.x || 0)}</p>
                      <p>Closing: {formatNumber(row.y || 0)}</p>
                      <p>Konversi: {formatNumber(row.conversionRate || 0, { maximumFractionDigits: 2 })}%</p>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter data={points} fill="#C92C1E" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {points.slice(0, 4).map((point) => (
          <div key={point.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-black text-gray-900">{point.salesName}</p>
            <p className="mt-2 text-xs font-semibold text-gray-500">
              Aktivitas {formatNumber(point.x)} • Closing {formatNumber(point.y)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RechartsDiagram({ item, result }: { item: AnalyticsCatalogItem; result?: AnalyticsQueryResult }) {
  const series = result?.series || [];
  const rows = mergeSeriesRows(series);
  const singleRows = getSingleSeriesRows(series);

  if (item.type === "donut") {
    if (!singleRows.length) return <EmptyDiagramState message="Belum ada data untuk diagram ini." />;

    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={singleRows.map((row) => ({ name: humanizeLabel(row.label), value: row.value }))}
              dataKey="value"
              nameKey="name"
              innerRadius={66}
              outerRadius={96}
              paddingAngle={4}
            >
              {singleRows.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => tooltipValue(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (!rows.length) {
    return <EmptyDiagramState message="Belum ada data diagram untuk periode yang dipilih." />;
  }

  if (item.type === "line") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <defs>
              <linearGradient id={`gradient-${item.module}-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C92C1E" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#C92C1E" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis dataKey="label" tickFormatter={humanizeLabel} tick={{ fontSize: 11, fill: "#6B7280" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(value) => formatNumber(Number(value))} />
            <Tooltip
              formatter={(value, name) => [tooltipValue(value), String(name)]}
              labelFormatter={(value) => humanizeLabel(String(value))}
            />
            <Legend />
            {series.map((serie, index) => (
              <Line
                key={serie.key}
                type="monotone"
                dataKey={serie.key}
                name={serie.label}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={3}
                dot={{ r: 3, fill: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (item.type === "horizontal_bar") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 32 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#F3F4F6" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(value) => formatNumber(Number(value))} />
            <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 11, fill: "#4B5563" }} tickFormatter={humanizeLabel} />
            <Tooltip
              formatter={(value, name) => [tooltipValue(value), String(name)]}
              labelFormatter={(value) => humanizeLabel(String(value))}
            />
            <Legend />
            {series.map((serie, index) => (
              <Bar key={serie.key} dataKey={serie.key} name={serie.label} fill={CHART_COLORS[index % CHART_COLORS.length]} radius={[0, 10, 10, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={humanizeLabel} />
          <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(value) => formatNumber(Number(value))} />
          <Tooltip
            formatter={(value, name) => [tooltipValue(value), String(name)]}
            labelFormatter={(value) => humanizeLabel(String(value))}
          />
          <Legend />
          {series.map((serie, index) => (
            <Bar
              key={serie.key}
              dataKey={serie.key}
              name={serie.label}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              radius={item.type === "stacked_bar" ? 0 : [10, 10, 0, 0]}
              stackId={item.type === "stacked_bar" ? "total" : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DiagramChart({ item, result }: { item: AnalyticsCatalogItem; result?: AnalyticsQueryResult }) {
  if (item.type === "choropleth_map") {
    const metricLabel = item.module === "outlets" ? "outlet" : "owner";
    return <AnalyticsProvinceMap result={result} metricLabel={metricLabel} />;
  }

  if (item.type === "funnel") return <FunnelDiagram result={result} />;
  if (item.type === "sankey") return <SankeyLikeDiagram result={result} />;
  if (item.type === "heatmap") return <HeatmapDiagram result={result} />;
  if (item.type === "waterfall") return <WaterfallDiagram result={result} />;
  if (item.type === "scatter") return <ScatterDiagram result={result} />;
  return <RechartsDiagram item={item} result={result} />;
}

function DiagramCard({
  state,
  selectedMetric,
  activeFilterLabel,
  onMetricChange,
  onRetry,
}: {
  state: DiagramViewState;
  selectedMetric?: string;
  activeFilterLabel: string;
  onMetricChange: (metric: string) => void;
  onRetry: () => void;
}) {
  const item = state.item;
  const result = state.result;
  const chartCaptureRef = useRef<HTMLDivElement | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!item) return;
      setExportError(null);
      setExportingFormat(format);
      try {
        if (format === "excel") {
          exportDiagramAsExcel(item, result, activeFilterLabel);
          return;
        }

        const node = chartCaptureRef.current;
        if (!node) throw new Error("Area diagram belum siap untuk diekspor.");

        if (format === "pdf") {
          await exportDiagramAsPdf(node, item, result, activeFilterLabel);
          return;
        }

        await exportDiagramAsImage(node, item, format);
      } catch (error) {
        setExportError(error instanceof Error ? error.message : "Gagal mengekspor diagram.");
      } finally {
        setExportingFormat(null);
      }
    },
    [activeFilterLabel, item, result],
  );

  if (!item) return null;

  const allowMetricSelector =
    Boolean(item.supported_metrics?.length) && !usesAllMetricsByDefault(item);
  const supportedMetrics = item.supported_metrics || [];

  return (
    <div className="overflow-hidden rounded-[30px] border border-gray-200/70 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-[linear-gradient(135deg,#fff_0%,#fff9f8_55%,#fef2f2_100%)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">{item.module}</p>
            <h3 className="mt-1 text-lg font-black text-gray-900">{item.name}</h3>
            <p className="mt-2 max-w-3xl text-xs font-medium text-gray-500">{item.function}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {allowMetricSelector ? (
              <select
                value={selectedMetric || ""}
                onChange={(event) => onMetricChange(event.target.value)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-gray-600 outline-none transition focus:border-[#C92C1E]"
              >
                {supportedMetrics.map((metric) => (
                  <option key={metric} value={metric}>
                    {humanizeMetric(metric)}
                  </option>
                ))}
              </select>
            ) : null}
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-gray-500">
              {item.type.replaceAll("_", " ")}
            </span>
            <ComparisonChip result={result} />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {state.isLoading ? (
          <DiagramSkeleton />
        ) : state.error ? (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-black text-red-700">Gagal memuat diagram</p>
              <p className="mt-1 text-xs font-medium text-red-600">{state.error}</p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-2xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#A82216]"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-gray-100 bg-[#FCFCFC] px-4 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C92C1E]">Ekspor Diagram</p>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Unduh visual diagram atau data tabelnya untuk kebutuhan laporan dan presentasi.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ExportButton
                  label={exportingFormat === "png" ? "Export PNG..." : "PNG"}
                  disabled={Boolean(exportingFormat)}
                  onClick={() => void handleExport("png")}
                />
                <ExportButton
                  label={exportingFormat === "jpg" ? "Export JPG..." : "JPG"}
                  disabled={Boolean(exportingFormat)}
                  onClick={() => void handleExport("jpg")}
                />
                <ExportButton
                  label={exportingFormat === "pdf" ? "Export PDF..." : "PDF"}
                  disabled={Boolean(exportingFormat)}
                  onClick={() => void handleExport("pdf")}
                />
                <ExportButton
                  label={exportingFormat === "excel" ? "Export Excel..." : "Excel"}
                  disabled={Boolean(exportingFormat)}
                  onClick={() => void handleExport("excel")}
                />
              </div>
            </div>

            {exportError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                {exportError}
              </div>
            ) : null}

            <div
              ref={chartCaptureRef}
              className="overflow-hidden rounded-[28px] border border-red-100 bg-[linear-gradient(180deg,#fff_0%,#fffaf8_42%,#ffffff_100%)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-red-100 bg-white/90 px-5 py-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                    {item.module} • {item.key}
                  </p>
                  <h4 className="mt-1 text-base font-black text-gray-900">{item.name}</h4>
                  <p className="mt-1 text-xs font-medium text-gray-500">Periode: {activeFilterLabel}</p>
                </div>
                {result?.comparison?.enabled ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-right">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Delta</p>
                    <p className="mt-1 text-sm font-black text-emerald-800">
                      {result.comparison.delta_percent !== undefined
                        ? `${result.comparison.delta_percent > 0 ? "+" : ""}${formatNumber(result.comparison.delta_percent, {
                            maximumFractionDigits: 2,
                          })}%`
                        : `${result.comparison.delta && result.comparison.delta > 0 ? "+" : ""}${formatNumber(
                            result.comparison.delta,
                            { maximumFractionDigits: 2 },
                          )}`}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="p-5">
                <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-[0_18px_50px_-38px_rgba(201,44,30,0.45)]">
                  <DiagramChart item={item} result={result} />
                </div>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-4">
              <div className="rounded-[22px] border border-gray-100 bg-gray-50/90 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">Tujuan</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-700">{item.purpose}</p>
              </div>
              <div className="rounded-[22px] border border-gray-100 bg-gray-50/90 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">Cara Membaca</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-700">{item.how_to_read}</p>
              </div>
              <div className="rounded-[22px] border border-red-100 bg-red-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C92C1E]">Insight</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-800">
                  {result?.insight?.summary || item.analysis_goal}
                </p>
              </div>
              <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Kesimpulan</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-800">
                  {result?.insight?.conclusion || result?.insight?.recommendation || "Belum ada kesimpulan tambahan dari backend analytics."}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Sprint14g1Board({
  heroLabel,
  title,
  description,
  sections,
}: Sprint14g1BoardProps) {
  const allDiagrams = useMemo(() => sections.flatMap((section) => section.diagrams), [sections]);
  const [draftFilters, setDraftFilters] = useState<FilterState>(getDefaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(getDefaultFilters());
  const [catalogMap, setCatalogMap] = useState<Record<string, AnalyticsCatalogItem>>({});
  const [diagramStates, setDiagramStates] = useState<Record<string, DiagramViewState>>({});
  const [metricSelections, setMetricSelections] = useState<MetricSelections>({});
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadedCount = Object.values(diagramStates).filter((item) => item.result && !item.error).length;
  const failedCount = Object.values(diagramStates).filter((item) => Boolean(item.error)).length;

  const initializeDiagramStates = useCallback(
    (catalog: Record<string, AnalyticsCatalogItem>) => {
      const initial: Record<string, DiagramViewState> = {};
      const metricMap: MetricSelections = {};
      for (const diagram of allDiagrams) {
        const key = diagramKey(diagram.module, diagram.key);
        metricMap[key] = getDefaultMetric(catalog[key]);
        initial[key] = {
          item: catalog[key],
          isLoading: true,
        };
      }
      setDiagramStates(initial);
      setMetricSelections(metricMap);
    },
    [allDiagrams],
  );

  const loadCatalog = useCallback(async () => {
    setIsCatalogLoading(true);
    setCatalogError(null);
    try {
      const items = await fetchAnalyticsCatalog();
      const nextMap = items.reduce<Record<string, AnalyticsCatalogItem>>((acc, item) => {
        acc[diagramKey(item.module, item.key)] = item;
        return acc;
      }, {});
      setCatalogMap(nextMap);
      initializeDiagramStates(nextMap);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "Gagal memuat katalog analytics.");
    } finally {
      setIsCatalogLoading(false);
    }
  }, [initializeDiagramStates]);

  const runQueries = useCallback(
    async (
      filters: FilterState,
      specificDiagram?: Sprint14g1DiagramConfig,
      metricOverrides?: Record<string, string>,
    ) => {
      const targets = specificDiagram ? [specificDiagram] : allDiagrams;

      setIsRefreshing(true);
      setDiagramStates((current) => {
        const next = { ...current };
        for (const target of targets) {
          const key = diagramKey(target.module, target.key);
          next[key] = {
            item: catalogMap[key],
            result: current[key]?.result,
            error: undefined,
            isLoading: true,
          };
        }
        return next;
      });

      const results = await Promise.allSettled(
        targets.map(async (target) => {
          const key = diagramKey(target.module, target.key);
          const item = catalogMap[key];
          if (!item) throw new Error("Metadata diagram tidak ditemukan di catalog.");
          const metric = metricOverrides?.[key] || metricSelections[key] || getDefaultMetric(item);
          const payload = buildQueryPayload(filters, metric);
          const result = await queryAnalyticsDiagram(target.module, target.key, payload);
          return { key, item, result };
        }),
      );

      setDiagramStates((current) => {
        const next = { ...current };
        results.forEach((entry, index) => {
          const target = targets[index];
          const key = diagramKey(target.module, target.key);
          if (entry.status === "fulfilled") {
            next[key] = { item: entry.value.item, result: entry.value.result, isLoading: false };
          } else {
            next[key] = {
              item: catalogMap[key],
              result: current[key]?.result,
              isLoading: false,
              error: entry.reason instanceof Error ? entry.reason.message : "Gagal memuat diagram.",
            };
          }
        });
        return next;
      });

      setIsRefreshing(false);
    },
    [allDiagrams, catalogMap, metricSelections],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCatalog();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCatalog]);

  useEffect(() => {
    if (!isCatalogLoading && !catalogError && Object.keys(catalogMap).length > 0) {
      const timer = window.setTimeout(() => {
        void runQueries(appliedFilters);
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [appliedFilters, catalogError, catalogMap, isCatalogLoading, runQueries]);

  const summaryCards = useMemo<BoardSummaryCard[]>(
    () => [
      {
        label: "Diagram Aktif",
        value: allDiagrams.length,
        description: "Diagram Sprint 14g1 pada modul ini",
        tone: "primary",
      },
      {
        label: "Diagram Berhasil",
        value: loadedCount,
        description: "Berhasil dimuat dari backend analytics",
      },
      {
        label: "Diagram Gagal",
        value: failedCount,
        description: "Perlu cek data atau request diagram",
      },
      {
        label: "Periode",
        value: filterLabel(appliedFilters),
        description: appliedFilters.comparePrevious ? "Dengan comparison periode sebelumnya" : "Tanpa comparison",
      },
    ],
    [allDiagrams.length, appliedFilters, failedCount, loadedCount],
  );
  const activeFilterLabel = useMemo(() => filterLabel(appliedFilters), [appliedFilters]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[30px] border border-gray-200/70 bg-white shadow-sm">
        <div className="bg-[linear-gradient(135deg,#fff_0%,#fff8f5_52%,#fee2e2_100%)] px-5 py-5 md:px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#C92C1E]">{heroLabel}</p>
          <h2 className="mt-2 text-2xl font-black text-gray-900">{title}</h2>
          <p className="mt-2 max-w-4xl text-sm font-medium leading-relaxed text-gray-600">{description}</p>
        </div>

        <div className="grid gap-3 border-t border-gray-100 bg-white p-5 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard key={card.label} card={card} />
          ))}
        </div>
      </div>

      <div className="rounded-[30px] border border-gray-200/70 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">Filter Global</p>
            <h3 className="mt-2 text-lg font-black text-gray-900">Atur rentang data analytics</h3>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Satu filter dipakai ke seluruh diagram pada modul ini agar pembacaan dashboard tetap konsisten.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "month_range", label: "Bulanan" },
              { value: "date_range", label: "Harian" },
              { value: "year_range", label: "Tahunan" },
            ].map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setDraftFilters((current) => ({ ...current, mode: mode.value as FilterMode }))}
                className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                  draftFilters.mode === mode.value
                    ? "bg-[#C92C1E] text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-500 hover:border-[#C92C1E] hover:text-[#C92C1E]"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {draftFilters.mode === "month_range" && (
              <>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">Bulan dari</span>
                  <input
                    type="month"
                    value={draftFilters.monthFrom}
                    onChange={(event) => setDraftFilters((current) => ({ ...current, monthFrom: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">Bulan sampai</span>
                  <input
                    type="month"
                    value={draftFilters.monthTo}
                    onChange={(event) => setDraftFilters((current) => ({ ...current, monthTo: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100"
                  />
                </label>
              </>
            )}

            {draftFilters.mode === "date_range" && (
              <>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">Tanggal dari</span>
                  <input
                    type="date"
                    value={draftFilters.dateFrom}
                    onChange={(event) => setDraftFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">Tanggal sampai</span>
                  <input
                    type="date"
                    value={draftFilters.dateTo}
                    onChange={(event) => setDraftFilters((current) => ({ ...current, dateTo: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100"
                  />
                </label>
              </>
            )}

            {draftFilters.mode === "year_range" && (
              <>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">Tahun dari</span>
                  <input
                    type="number"
                    min={2000}
                    value={draftFilters.yearFrom}
                    onChange={(event) => setDraftFilters((current) => ({ ...current, yearFrom: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-500">Tahun sampai</span>
                  <input
                    type="number"
                    min={2000}
                    value={draftFilters.yearTo}
                    onChange={(event) => setDraftFilters((current) => ({ ...current, yearTo: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100"
                  />
                </label>
              </>
            )}

            <div className="flex flex-col justify-end gap-3">
              <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={draftFilters.comparePrevious}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, comparePrevious: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                />
                Bandingkan dengan periode sebelumnya
              </label>

              <button
                type="button"
                onClick={() => setAppliedFilters({ ...draftFilters })}
                disabled={isCatalogLoading || isRefreshing}
                className="rounded-2xl bg-[#C92C1E] px-4 py-3 text-sm font-black text-white transition hover:bg-[#A82216] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshing ? "Memuat Analytics..." : "Terapkan Filter"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {catalogError ? (
        <div className="rounded-[30px] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="text-base font-black">Gagal memuat katalog analytics</p>
          <p className="mt-2 text-sm font-medium">{catalogError}</p>
          <button
            type="button"
            onClick={loadCatalog}
            className="mt-4 rounded-2xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#A82216]"
          >
            Muat Ulang Catalog
          </button>
        </div>
      ) : isCatalogLoading ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-[30px] border border-gray-200/70 bg-white p-5 shadow-sm">
              <DiagramSkeleton />
            </div>
          ))}
        </div>
      ) : (
        sections.map((section) => (
          <section key={section.id} className="space-y-4">
            <div className="rounded-[30px] border border-gray-200/70 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">{section.id}</p>
              <h3 className="mt-2 text-xl font-black text-gray-900">{section.title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600">{section.description}</p>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              {section.diagrams.map((diagram) => {
                const key = diagramKey(diagram.module, diagram.key);
                const state = diagramStates[key];
                if (!state?.item) return null;

                return (
                  <DiagramCard
                    key={key}
                    state={state}
                    selectedMetric={metricSelections[key]}
                    activeFilterLabel={activeFilterLabel}
                    onMetricChange={(metric) => {
                      setMetricSelections((current) => ({ ...current, [key]: metric }));
                      void runQueries(appliedFilters, diagram, { [key]: metric });
                    }}
                    onRetry={() => runQueries(appliedFilters, diagram)}
                  />
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
