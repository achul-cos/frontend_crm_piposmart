"use client";

import React, { useEffect, useState } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import Sprint14g1Board, {
  type Sprint14g1Section,
} from "@/app/components/analytics/Sprint14g1Board";
import {
  fetchClosings,
  getSalesList,
  type ClosingItem,
  type UserResponse,
} from "@/app/lib/api";

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
  const [closings, setClosings] = useState<ClosingItem[]>([]);
  const [salesList, setSalesList] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [salesFilter, setSalesFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [closingData, salesData] = await Promise.all([
        fetchClosings({
          page,
          limit,
          q: searchQuery || undefined,
          status: statusFilter || undefined,
          sales_id: salesFilter ? Number(salesFilter) : undefined,
          closed_from: dateFrom || undefined,
          closed_to: dateTo || undefined,
        }),
        getSalesList(),
      ]);

      setClosings(closingData.items || []);
      setTotalItems(closingData.pagination?.total || 0);
      setSalesList(salesData || []);
    } catch (err) {
      console.error("Failed to load closing data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, statusFilter, salesFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

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
    <div className="mx-auto max-w-7xl space-y-6 font-sans text-[#1C1C1E]">
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

      <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
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

      {activeTab === "analytics" ? (
        <Sprint14g1Board
          heroLabel="Analytics Closing"
          title="Monitoring Closing Sales"
          description="Seluruh diagram di halaman ini fokus pada performa closing yang sudah dibentuk dari proses penjualan: tren transaksi, status, nilai rata-rata, komposisi paket, tenor, hingga kontribusi sales dan supervisor."
          sections={sections}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-4">
            <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
              <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="pl-3 pr-2 text-gray-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  className="w-48 bg-transparent py-1.5 pr-3 text-xs font-bold text-gray-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm">
                <span className="text-gray-400">Tgl Closing:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="cursor-pointer bg-transparent text-gray-700 focus:outline-none"
                />
                <span className="text-gray-300">s/d</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="cursor-pointer bg-transparent text-gray-700 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm focus:border-[#C92C1E] focus:outline-none"
              >
                <option value="">Semua Status</option>
                <option value="PENDING_RECONCILIATION">Pending Rekonsiliasi</option>
                <option value="CONFIRMED">Berhasil (Confirmed)</option>
                <option value="REJECTED">Ditolak (Rejected)</option>
              </select>

              <select
                value={salesFilter}
                onChange={(e) => {
                  setSalesFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm focus:border-[#C92C1E] focus:outline-none"
              >
                <option value="">Semua PIC Sales</option>
                {salesList.map((sales) => (
                  <option key={sales.id} value={sales.id}>
                    {sales.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[1300px] text-left text-sm text-gray-600">
              <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-4">Kode & Tanggal</th>
                  <th className="px-4 py-4">Kustomer & PIC</th>
                  <th className="px-4 py-4">Paket Langganan</th>
                  <th className="px-4 py-4">Rincian Harga</th>
                  <th className="px-4 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                      Memuat data closing...
                    </td>
                  </tr>
                ) : closings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                      Tidak ada data closing yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  closings.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="font-bold text-[#C92C1E]">{row.code || "-"}</div>
                        <div className="mt-1 text-xs text-gray-500">{formatDateTime(row.closed_at)}</div>
                      </td>
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
                      <td className="px-4 py-4 text-center">{getStatusBadge(row.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
              <div className="text-xs font-medium text-gray-500">
                Menampilkan <span className="font-bold text-gray-900">{(page - 1) * limit + 1}</span> hingga{" "}
                <span className="font-bold text-gray-900">{Math.min(page * limit, totalItems)}</span> dari{" "}
                <span className="font-bold text-gray-900">{totalItems}</span> riwayat
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
