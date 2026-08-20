"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import type { Sprint14g1Section } from "@/app/components/analytics/Sprint14g1Board";
import { getProfile } from "@/app/lib/api";
import { AnimatedListItem } from "@/app/components/motion/primitives";
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";
import ReportExportButton from "@/app/components/export/ReportExportButton";
import TablePaginationFooter from "@/app/components/table/TablePaginationFooter";
import {
  useClosingListQuery,
  useClosingSalesListQuery,
} from "@/app/lib/queries/closing";
import AnalyticsTabSkeleton from "@/app/components/skeleton/AnalyticsTabSkeleton";

const Sprint14g1Board = dynamic(
  () => import("@/app/components/analytics/Sprint14g1Board"),
  {
    ssr: false,
    loading: () => <AnalyticsTabSkeleton sections={2} />,
  },
);

type ClosingColumnKey =
  | "code"
  | "date"
  | "customer_pic"
  | "package"
  | "pricing"
  | "status";

type ClosingColumnDefinition = {
  key: ClosingColumnKey;
  label: string;
  description: string;
};

const closingColumnDefinitions: ClosingColumnDefinition[] = [
  {
    key: "code",
    label: "Kode",
    description: "Kode closing transaksi",
  },
  {
    key: "date",
    label: "Tanggal",
    description: "Waktu closing transaksi",
  },
  {
    key: "customer_pic",
    label: "Kustomer & PIC",
    description: "Owner/lead dan PIC sales",
  },
  {
    key: "package",
    label: "Paket Langganan",
    description: "Plan, paket, dan tenor",
  },
  {
    key: "pricing",
    label: "Rincian Harga",
    description: "Base price, diskon, biaya tambahan, total",
  },
  {
    key: "status",
    label: "Status",
    description: "Status closing saat ini",
  },
];

const closingColumnStorageKey = "piposmart_closing_visible_columns";

const sections: Sprint14g1Section[] = [
  {
    id: "closing-trend",
    title: "Tren dan Distribusi Closing",
    description:
      "Memantau pertumbuhan closing, sebaran status, dan perubahan nilai transaksi secara berkala.",
    diagrams: [
      { module: "closings", key: "closing-trend" },
      { module: "closings", key: "status-distribution" },
      { module: "closings", key: "average-ticket-size-trend" },
      { module: "closings", key: "closing-amount-waterfall" },
    ],
  },
  {
    id: "closing-composition",
    title: "Komposisi Penjualan",
    description:
      "Melihat paket, tenor, dan kontribusi tim terhadap transaksi closing yang berhasil dikonfirmasi.",
    diagrams: [
      { module: "closings", key: "closing-by-package" },
      { module: "closings", key: "closing-by-tenure" },
      { module: "closings", key: "closing-by-sales" },
      { module: "closings", key: "closing-by-supervisor" },
    ],
  },
];

export default function ClosingPage() {
  usePageTitle("Closing | CRM Piposmart");

  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");
  const [currentRole, setCurrentRole] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("piposmart_user_role") || ""
      : ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [salesFilter, setSalesFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedFilters, setDebouncedFilters] = useState({
    searchQuery: "",
    statusFilter: "",
    salesFilter: "",
    dateFrom: "",
    dateTo: "",
  });
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ClosingColumnKey[]>(() => [
    "date",
    "customer_pic",
    "package",
    "pricing",
    "status",
  ]);
  const [limit, setLimit] = useState(10);
  const isSales = currentRole.toUpperCase() === "SALES";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const timer = window.setTimeout(() => {
      const stored = localStorage.getItem(closingColumnStorageKey);
      if (!stored) return;

      try {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return;

        const allowed = new Set(closingColumnDefinitions.map((column) => column.key));
        const sanitized = parsed.filter(
          (item): item is ClosingColumnKey =>
            typeof item === "string" && allowed.has(item as ClosingColumnKey)
        );

        if (sanitized.length > 0) {
          setVisibleColumns(sanitized);
        }
      } catch {
        // abaikan preference lama yang rusak
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getProfile()
        .then((profile) => {
          if (profile.role) {
            setCurrentRole(profile.role);
            if (typeof window !== "undefined") {
              localStorage.setItem("piposmart_user_role", profile.role);
            }
          }
        })
        .catch(() => {
          // pakai fallback localStorage
        });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(closingColumnStorageKey, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters({ searchQuery, statusFilter, salesFilter, dateFrom, dateTo });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, salesFilter, dateFrom, dateTo]);

  const closingListParams = useMemo(
    () => ({
      page,
      limit: limit === 0 ? undefined : limit,
      all: limit === 0,
      q: debouncedFilters.searchQuery || undefined,
      status: debouncedFilters.statusFilter || undefined,
      sales_id: !isSales && debouncedFilters.salesFilter ? Number(debouncedFilters.salesFilter) : undefined,
      closed_from: debouncedFilters.dateFrom || undefined,
      closed_to: debouncedFilters.dateTo || undefined,
    }),
    [page, limit, debouncedFilters, isSales]
  );

  const { data: closingData, isLoading } = useClosingListQuery(closingListParams);
  const { data: salesListData } = useClosingSalesListQuery(!isSales);

  const closings = closingData?.items || [];
  const salesList = salesListData || [];
  const totalItems = closingData?.pagination?.total || 0;

  const totalPages = limit === 0 ? 1 : Math.ceil(totalItems / limit) || 1;
  const visibleSalesFilter = useMemo(() => !isSales, [isSales]);
  const visibleColumnCount = visibleColumns.length;
  const statusFilterLabel =
    statusFilter === "PENDING_RECONCILIATION"
      ? "Pending Rekonsiliasi"
      : statusFilter === "CONFIRMED"
        ? "Confirmed"
        : statusFilter === "REJECTED"
          ? "Rejected"
          : "Semua Status";

  const isColumnVisible = (key: ClosingColumnKey) => visibleColumns.includes(key);

  const toggleColumnVisibility = (key: ClosingColumnKey) => {
    setVisibleColumns((current) => {
      if (current.includes(key)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== key);
      }

      return closingColumnDefinitions
        .map((column) => column.key)
        .filter((columnKey) => current.includes(columnKey) || columnKey === key);
    });
  };

  const formatDateTime = (str?: string) => {
    if (!str) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(str));
  };

  const formatCurrency = (amount: string, currency = "IDR") => {
    const value = parseFloat(amount || "0");
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_RECONCILIATION":
        return <span className="rounded bg-yellow-100 px-2 py-0.5 text-[10px] font-black uppercase text-yellow-800">Pending Rekonsiliasi</span>;
      case "CONFIRMED":
        return <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">Berhasil</span>;
      case "REJECTED":
        return <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase text-red-700">Ditolak</span>;
      case "CANCELED":
        return <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-black uppercase text-gray-700">Dibatalkan</span>;
      default:
        return <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="w-full space-y-6 font-sans text-[#1C1C1E]">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="border-b-2 border-[#C92C1E] p-5">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
            <span>Menu</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Closing</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-gray-900">Closing Sales</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Pantau transaksi closing harian sambil tetap punya akses ke board analitik untuk membaca tren penjualan.
          </p>
        </div>
      </div>

      <QuickInfoCardGrid>
        <QuickInfoCard
          label="Total Closing"
          value={totalItems}
          description="Jumlah closing sesuai filter aktif."
          tone="accent"
          silhouette="closing"
        />
        <QuickInfoCard
          label="Ditampilkan"
          value={closings.length}
          description="Baris closing pada halaman aktif saat ini."
          tone="emerald"
        />
        <QuickInfoCard
          label="Status Aktif"
          value={statusFilterLabel}
          description="Status filter yang sedang dipakai."
          tone="amber"
        />
        <QuickInfoCard
          label="Halaman"
          value={
            <>
              {page} <span className="text-base font-bold opacity-70">/ {totalPages}</span>
            </>
          }
          description="Posisi halaman aktif dari total closing."
          tone="sky"
        />
      </QuickInfoCardGrid>

      <div className="max-w-full overflow-x-auto">
        <div className="inline-flex min-w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
          <button
          onClick={() => setActiveTab("list")}
          className={`rounded-lg px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "list"
              ? "bg-white text-[#C92C1E] shadow-sm"
              : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
          }`}
        >
          Data Closing
          </button>
          <button
          onClick={() => setActiveTab("analytics")}
          className={`rounded-lg px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "analytics"
              ? "bg-white text-[#C92C1E] shadow-sm"
              : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
          }`}
        >
          Analitik
          </button>
        </div>
      </div>

      {activeTab === "analytics" ? (
        <Sprint14g1Board
          heroLabel="Analytics Closing"
          title="Monitoring Closing Sales"
          description="Seluruh diagram di halaman ini fokus pada performa closing yang sudah dibentuk dari proses penjualan: tren transaksi, status, nilai rata-rata, komposisi paket, tenor, hingga kontribusi sales dan supervisor."
          sections={sections}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
          <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Daftar Closing</h2>
              <p className="mt-1 text-sm text-gray-500">
                Daftar seluruh riwayat closing yang terdaftar dalam sistem.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3">
              <ReportExportButton
                reportKey="closings"
                filters={{
                  q: debouncedFilters.searchQuery || undefined,
                  status: debouncedFilters.statusFilter || undefined,
                  sales_id: !isSales && debouncedFilters.salesFilter ? debouncedFilters.salesFilter : undefined,
                  date_from: debouncedFilters.dateFrom || undefined,
                  date_to: debouncedFilters.dateTo || undefined,
                }}
                label="Export Data"
                loadingLabel="Menyiapkan Export..."
                successMessage="File closing sedang diunduh."
                className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          <div className="border-b border-gray-50 px-6 py-4">
            <div className="flex flex-wrap items-start gap-4">
              <label className="flex flex-col gap-1.5 w-full md:w-auto">
                <span className="text-xs font-semibold text-black">Tgl Closing Mulai</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                />
              </label>
              <label className="flex flex-col gap-1.5 w-full md:w-auto">
                <span className="text-xs font-semibold text-black">Tgl Closing Sampai</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                />
              </label>

              <div className="flex flex-col gap-1.5 w-full md:w-auto">
                <span className="text-xs font-semibold text-black">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                >
                  <option value="">Semua Status</option>
                  <option value="PENDING_RECONCILIATION">Pending Rekonsiliasi</option>
                  <option value="CONFIRMED">Berhasil (Confirmed)</option>
                  <option value="REJECTED">Ditolak (Rejected)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 w-full md:w-auto">
                <span className="text-xs font-semibold text-black">PIC Sales</span>
                {visibleSalesFilter ? (
                  <select
                    value={salesFilter}
                    onChange={(e) => {
                      setSalesFilter(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                  >
                    <option value="">Semua PIC Sales</option>
                    {salesList.map((sales) => (
                      <option key={sales.id} value={sales.id}>
                        {sales.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 h-9 flex items-center">
                    Data Anda
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-b border-gray-50 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Cari owner atau kode..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                />
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsColumnMenuOpen((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-600 shadow-sm transition hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Kolom
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-500">
                    {visibleColumnCount}/{closingColumnDefinitions.length}
                  </span>
                </button>

                {isColumnMenuOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
                    <div className="mb-3 border-b border-gray-100 pb-3">
                      <p className="text-sm font-black text-gray-900">Atur Kolom Tabel</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Sembunyikan atau tampilkan kolom seperti di Excel. Minimal satu kolom harus tetap aktif.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {closingColumnDefinitions.map((column) => {
                        const checked = isColumnVisible(column.key);
                        const isLastVisible = checked && visibleColumns.length === 1;

                        return (
                          <label
                            key={column.key}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition ${
                              checked
                                ? "border-[#C92C1E]/20 bg-[#FFF7F5]"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            } ${isLastVisible ? "opacity-80" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isLastVisible}
                              onChange={() => toggleColumnVisibility(column.key)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-black text-gray-800">{column.label}</p>
                              <p className="mt-0.5 text-[11px] text-gray-500">{column.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                      <button
                        type="button"
                        onClick={() => setVisibleColumns(closingColumnDefinitions.map((column) => column.key))}
                        className="text-xs font-black text-[#C92C1E] transition hover:text-[#a92217]"
                      >
                        Tampilkan Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsColumnMenuOpen(false)}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-black text-white transition hover:bg-black"
                      >
                        Selesai
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="w-full max-w-full overflow-x-auto">
            <table data-column-visibility-manual="true" data-table-pagination-manual="true" className="w-full min-w-[1040px] text-left text-sm text-gray-600">
              <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                <tr>
                  {isColumnVisible("code") ? <th className="px-4 py-4">Kode</th> : null}
                  {isColumnVisible("date") ? <th className="px-4 py-4">Tanggal</th> : null}
                  {isColumnVisible("customer_pic") ? <th className="px-4 py-4">Kustomer & PIC</th> : null}
                  {isColumnVisible("package") ? <th className="px-4 py-4">Paket Langganan</th> : null}
                  {isColumnVisible("pricing") ? <th className="px-4 py-4">Rincian Harga</th> : null}
                  {isColumnVisible("status") ? <th className="px-4 py-4 text-center">Status</th> : null}
                  <th className="px-4 py-4 text-center font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={visibleColumnCount + 1} className="p-8 text-center text-gray-400 italic">
                      Memuat data closing...
                    </td>
                  </tr>
                ) : closings.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumnCount + 1} className="p-8 text-center text-gray-400 italic">
                      Tidak ada data closing yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  closings.map((row, rowIndex) => (
                    <AnimatedListItem
                      as="tr"
                      key={row.id}
                      index={rowIndex}
                      className="transition-colors hover:bg-gray-50"
                    >
                      {isColumnVisible("code") ? (
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="font-bold text-[#C92C1E]">{row.code || "-"}</div>
                        </td>
                      ) : null}
                      {isColumnVisible("date") ? (
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="font-bold text-gray-900">{formatDateTime(row.closed_at)}</div>
                        </td>
                      ) : null}
                      {isColumnVisible("customer_pic") ? (
                        <td className="px-4 py-4">
                          <div className="font-black text-gray-900">{row.owner?.name || row.lead?.name || "-"}</div>
                          <div className="mt-0.5 text-[10px] text-gray-400">Kode: {row.owner?.code || row.lead?.code || "-"}</div>
                          <div className="mt-1.5 flex items-center gap-1 text-xs font-bold text-gray-600">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            PIC: {row.sales?.name || "Tanpa PIC"}
                          </div>
                        </td>
                      ) : null}
                      {isColumnVisible("package") ? (
                        <td className="px-4 py-4">
                          <div className="font-bold text-gray-900">{row.plan?.name || "Custom Plan"}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            Paket: <span className="font-semibold">{row.package?.name || "-"}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500">
                            Tenor:{" "}
                            <span className="font-semibold">
                              {row.tenure_months
                                ? `${row.tenure_months} Bulan`
                                : row.duration_days
                                  ? `${row.duration_days} Hari`
                                  : "-"}
                            </span>
                          </div>
                        </td>
                      ) : null}
                      {isColumnVisible("pricing") ? (
                        <td className="min-w-[220px] px-4 py-4">
                          <div className="mb-1 flex items-center justify-between text-[10px]">
                            <span className="text-gray-500">Harga Dasar:</span>
                            <span className="font-bold">{formatCurrency(row.base_price || "0")}</span>
                          </div>
                          <div className="mb-1 flex items-center justify-between text-[10px] text-red-500">
                            <span>Diskon:</span>
                            <span className="font-bold">-{formatCurrency(row.discount_amount || "0")}</span>
                          </div>
                          {parseFloat(row.additional_charge || "0") > 0 && (
                            <div className="mb-1 flex items-center justify-between text-[10px]">
                              <span className="text-gray-500">Biaya Tambahan:</span>
                              <span className="font-bold">{formatCurrency(row.additional_charge || "0")}</span>
                            </div>
                          )}
                          <div className="mb-2 flex items-center justify-between text-[10px] text-purple-600">
                            <span>Kode Unik:</span>
                            <span className="font-bold">+{row.unique_transfer_code || 0}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-gray-100 pt-1.5 text-xs">
                            <span className="font-bold text-gray-700">Total Akhir:</span>
                            <span className="text-sm font-black text-gray-900">{formatCurrency(row.final_amount)}</span>
                          </div>
                        </td>
                      ) : null}
                      {isColumnVisible("status") ? (
                        <td className="px-4 py-4 text-center">{getStatusBadge(row.status)}</td>
                      ) : null}
                      <td className="px-4 py-4 text-center">
                        <Link
                          href={`/menu/closing/${row.id}`}
                          className="inline-flex rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                          title="Detail"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </td>
                    </AnimatedListItem>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePaginationFooter
            currentPage={page}
            totalItems={totalItems}
            rowsPerPage={limit === 0 ? "all" : limit}
            totalPages={totalPages}
            onPageChange={setPage}
            onRowsPerPageChange={(nextLimit) => {
              setLimit(nextLimit === "all" ? 0 : nextLimit);
              setPage(1);
            }}
          />

          {false && totalPages > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 p-4 sm:flex-row">
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-500">
                  Menampilkan {totalItems === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, totalItems)} dari {totalItems} data
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <span className="text-xs font-bold text-gray-700">Halaman {page} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
