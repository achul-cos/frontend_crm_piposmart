"use client";

import React, { useEffect, useState } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import {
  fetchClosings,
  getSalesList,
  type ClosingItem,
  type UserResponse,
} from "@/app/lib/api";

export default function ClosingPage() {
  usePageTitle("Closing | CRM Piposmart");

  const [closings, setClosings] = useState<ClosingItem[]>([]);
  const [salesList, setSalesList] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [salesFilter, setSalesFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Pagination
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
    // Debounce for search
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

  const formatCurrency = (amount: string, currency: string = "IDR") => {
    const value = parseFloat(amount || "0");
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_RECONCILIATION":
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-[10px] font-black uppercase">Pending Rekonsiliasi</span>;
      case "CONFIRMED":
        return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Berhasil</span>;
      case "REJECTED":
        return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Ditolak</span>;
      case "CANCELED":
        return <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Dibatalkan</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">{status}</span>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-sans text-[#1C1C1E]">
      {/* Menu Header */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b-2 border-[#C92C1E] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
              <span>Menu</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#C92C1E]">Closing</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Data Closing & Penjualan</h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola dan pantau semua data closing langganan dari kustomer.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="pl-3 pr-2 text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Cari owner atau kode..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="py-1.5 pr-3 text-xs font-bold text-gray-700 bg-transparent focus:outline-none w-48"
              />
            </div>

            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 shadow-sm">
              <span className="text-gray-400">Tgl Closing:</span>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="bg-transparent focus:outline-none text-gray-700 cursor-pointer" />
              <span className="text-gray-300">s/d</span>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="bg-transparent focus:outline-none text-gray-700 cursor-pointer" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 shadow-sm focus:outline-none focus:border-[#C92C1E]"
            >
              <option value="">Semua Status</option>
              <option value="PENDING_RECONCILIATION">Pending Rekonsiliasi</option>
              <option value="CONFIRMED">Berhasil (Confirmed)</option>
              <option value="REJECTED">Ditolak (Rejected)</option>
            </select>

            <select
              value={salesFilter}
              onChange={(e) => { setSalesFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 shadow-sm focus:outline-none focus:border-[#C92C1E]"
            >
              <option value="">Semua PIC Sales</option>
              {salesList.map((sales) => (
                <option key={sales.id} value={sales.id}>{sales.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Workspace */}
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left text-sm text-gray-600">
            <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-y border-gray-200">
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
                  <td colSpan={5} className="p-8 text-center text-gray-400 font-bold italic">Memuat data closing...</td>
                </tr>
              ) : closings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 font-bold italic">Tidak ada data closing yang sesuai dengan filter.</td>
                </tr>
              ) : (
                closings.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-bold text-[#C92C1E]">{row.code || "-"}</div>
                      <div className="text-xs text-gray-500 mt-1">{formatDateTime(row.closed_at)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-black text-gray-900">{row.owner?.name || row.lead?.name || "-"}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Kode: {row.owner?.code || row.lead?.code || "-"}</div>
                      <div className="text-xs font-bold text-gray-600 mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        PIC: {row.sales?.name || "Tanpa PIC"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900">{row.plan?.name || "Custom Plan"}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Paket: <span className="font-semibold">{row.package?.name || "-"}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Tenor: <span className="font-semibold">{row.tenure_months ? `${row.tenure_months} Bulan` : (row.duration_days ? `${row.duration_days} Hari` : "-")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 min-w-[220px]">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-gray-500">Harga Dasar:</span>
                        <span className="font-bold">{formatCurrency(row.base_price || "0")}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] mb-1 text-red-500">
                        <span>Diskon:</span>
                        <span className="font-bold">-{formatCurrency(row.discount_amount || "0")}</span>
                      </div>
                      {parseFloat(row.additional_charge || "0") > 0 && (
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="text-gray-500">Biaya Tambahan:</span>
                          <span className="font-bold">{formatCurrency(row.additional_charge || "0")}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[10px] mb-2 text-purple-600">
                        <span>Kode Unik:</span>
                        <span className="font-bold">+{row.unique_transfer_code || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-1.5">
                        <span className="font-bold text-gray-700">Total Akhir:</span>
                        <span className="font-black text-gray-900 text-sm">{formatCurrency(row.final_amount)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getStatusBadge(row.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-100 bg-white px-4 py-3 flex items-center justify-between">
            <div className="text-xs text-gray-500 font-medium">
              Menampilkan <span className="font-bold text-gray-900">{(page - 1) * limit + 1}</span> hingga <span className="font-bold text-gray-900">{Math.min(page * limit, totalItems)}</span> dari <span className="font-bold text-gray-900">{totalItems}</span> riwayat
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
