"use client";

import React, { useEffect, useState } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import {
  fetchCustomerInteractions,
  getSalesList,
  type InteractionItem,
  type UserResponse,
} from "@/app/lib/api";

export default function InteractPage() {
  usePageTitle("Interact | CRM Piposmart");

  const [interactions, setInteractions] = useState<InteractionItem[]>([]);
  const [salesList, setSalesList] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [salesFilter, setSalesFilter] = useState<string>("");
  const [scoreFilter, setScoreFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [interactData, salesData] = await Promise.all([
        fetchCustomerInteractions({
          page,
          limit,
          type: typeFilter || undefined,
          sales_id: salesFilter ? Number(salesFilter) : undefined,
          score: scoreFilter ? Number(scoreFilter) : undefined,
          interaction_from: dateFrom || undefined,
          interaction_to: dateTo || undefined,
        }),
        getSalesList(),
      ]);

      setInteractions(interactData.items || []);
      setTotalItems(interactData.pagination?.total || 0);
      setSalesList(salesData || []);
    } catch (err) {
      console.error("Failed to load interact data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter, salesFilter, scoreFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  const formatDateTime = (str?: string) => {
    if (!str) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(str));
  };

  const formatDate = (str?: string) => {
    if (!str) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
    }).format(new Date(str));
  };

  const getScoreBadge = (score?: number | null) => {
    if (score === 3) return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">3 (Langganan)</span>;
    if (score === 2) return <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold">2 (Potensial)</span>;
    if (score === 1) return <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-bold">1 (Kemungkinan)</span>;
    return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">0 (Tidak Potensial)</span>;
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
              <span className="text-[#C92C1E]">Interact</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Riwayat Aktivitas & Interaksi</h1>
            <p className="mt-1 text-sm text-gray-500">
              Pantau seluruh riwayat call, chat, remark, dan status follow-up kustomer dari tim sales.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 shadow-sm">
              <span className="text-gray-400">Tanggal Interaksi:</span>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="bg-transparent focus:outline-none text-gray-700 cursor-pointer" />
              <span className="text-gray-300">s/d</span>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="bg-transparent focus:outline-none text-gray-700 cursor-pointer" />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 shadow-sm focus:outline-none focus:border-[#C92C1E]"
            >
              <option value="">Semua Tipe (Call/Chat)</option>
              <option value="CALL">Call Saja</option>
              <option value="CHAT">Chat Saja</option>
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

            <select
              value={scoreFilter}
              onChange={(e) => { setScoreFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 shadow-sm focus:outline-none focus:border-[#C92C1E]"
            >
              <option value="">Semua Skor</option>
              <option value="3">3 (Langganan)</option>
              <option value="2">2 (Potensial)</option>
              <option value="1">1 (Kemungkinan)</option>
              <option value="0">0 (Tidak Potensial)</option>
            </select>
          </div>
        </div>

        {/* Table Workspace */}
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm text-gray-600">
            <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-y border-gray-200">
              <tr>
                <th className="px-4 py-4">Waktu Interaksi</th>
                <th className="px-4 py-4">Kustomer & PIC</th>
                <th className="px-4 py-4 text-center">Tipe</th>
                <th className="px-4 py-4 text-center">Skor & Remark</th>
                <th className="px-4 py-4">Catatan & Respon</th>
                <th className="px-4 py-4">Tanggal FU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-bold italic">Memuat data interaksi...</td>
                </tr>
              ) : interactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-bold italic">Tidak ada data interaksi yang sesuai dengan filter.</td>
                </tr>
              ) : (
                interactions.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{formatDateTime(row.interaction_at)}</div>
                      <div className="text-xs text-gray-500 mt-1">Durasi: {row.duration_seconds ? `${row.duration_seconds}s` : "-"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-black text-gray-900">{row.contact_name || "-"}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{row.contact_phone || "-"}</div>
                      <div className="text-xs font-bold text-[#C92C1E] mt-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        {row.sales?.name || "Tanpa PIC"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${row.type === 'CALL' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {row.type}
                      </span>
                      <div className="text-[10px] text-gray-500 mt-1 font-bold">{row.status_after}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="mb-1.5">{getScoreBadge(row.score_after)}</div>
                      <span className="text-xs font-bold text-gray-700">{row.remark_label || "-"}</span>
                    </td>
                    <td className="px-4 py-4 max-w-xs">
                      {row.customer_response && (
                        <div className="mb-2">
                          <span className="text-[10px] font-black uppercase text-gray-400 block mb-0.5">Respon:</span>
                          <span className="text-xs text-gray-700 line-clamp-2">{row.customer_response}</span>
                        </div>
                      )}
                      {row.note && (
                        <div>
                          <span className="text-[10px] font-black uppercase text-gray-400 block mb-0.5">Catatan:</span>
                          <span className="text-xs text-gray-700 line-clamp-2">{row.note}</span>
                        </div>
                      )}
                      {!row.customer_response && !row.note && <span className="text-gray-400 italic text-xs">-</span>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{formatDate(row.follow_up_at || "")}</div>
                      <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">{row.follow_up_note || "-"}</div>
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
