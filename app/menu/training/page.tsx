"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import {
  fetchTrainings,
  getSalesList,
  type TrainingItem,
  type UserResponse,
} from "@/app/lib/api";
import CalendarTab from "./CalendarTab";

export default function TrainingPage() {
  usePageTitle("Training | CRM Piposmart");

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');

  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [salesList, setSalesList] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
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
      const [trainingData, salesData] = await Promise.all([
        fetchTrainings({
          page,
          limit,
          status: statusFilter || undefined,
          training_type: typeFilter || undefined,
          sales_id: salesFilter ? Number(salesFilter) : undefined,
          scheduled_from: dateFrom || undefined,
          scheduled_to: dateTo || undefined,
        }),
        getSalesList().catch((err) => {
          console.warn("Failed to fetch sales list, user might not have permission:", err);
          return [];
        }),
      ]);

      setTrainings(trainingData.items || []);
      setTotalItems(trainingData.pagination?.total || 0);
      setSalesList(salesData || []);
    } catch (err) {
      console.error("Failed to load training data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, typeFilter, salesFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  const formatDateTime = (str?: string) => {
    if (!str) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(str));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">Scheduled</span>;
      case "COMPLETED":
        return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">Completed</span>;
      case "CANCELED":
        return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">Canceled</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">{status}</span>;
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
              <span className="text-[#C92C1E]">Training</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Jadwal & Riwayat Training</h1>
            <p className="mt-1 text-sm text-gray-500">
              Pantau jadwal demo aplikasi, riwayat pelatihan kustomer, dan laporan penyelesaian.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs / Segmented Control */}
      <div className="flex bg-gray-100 p-1.5 rounded-xl w-max shadow-sm border border-gray-200/50">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'list'
              ? 'bg-white text-[#C92C1E] shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
          }`}
        >
          Daftar Training
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'calendar'
              ? 'bg-white text-[#C92C1E] shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Kalender
        </button>
      </div>

      {activeTab === 'calendar' ? (
        <CalendarTab trainings={trainings} onSelectTraining={(t) => router.push(`/menu/training/${t.id}`)} />
      ) : (
        <>
      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 shadow-sm">
              <span className="text-gray-400">Jadwal:</span>
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
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELED">Canceled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold text-gray-600 shadow-sm focus:outline-none focus:border-[#C92C1E]"
            >
              <option value="">Semua Tipe (Offline/Online)</option>
              <option value="OFFLINE">Offline (Di Tempat)</option>
              <option value="ONLINE">Online (Virtual)</option>
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
          <table className="w-full min-w-[1200px] text-left text-sm text-gray-600">
            <thead className="bg-[#f9fafb] text-xs font-black uppercase text-gray-500 tracking-wider border-y border-gray-200">
              <tr>
                <th className="px-4 py-4">Jadwal Training</th>
                <th className="px-4 py-4">Kustomer & PIC</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-4 py-4">Tipe & Lokasi</th>
                <th className="px-4 py-4">Hasil / Catatan</th>
                <th className="px-4 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-bold italic">Memuat data training...</td>
                </tr>
              ) : trainings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-bold italic">Tidak ada data training yang sesuai dengan filter.</td>
                </tr>
              ) : (
                trainings.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{formatDateTime(row.scheduled_at)}</div>
                      {row.status === "COMPLETED" && (
                        <div className="text-[10px] text-emerald-600 font-bold mt-1">
                          Selesai: {formatDateTime(row.completed_at || "")}
                        </div>
                      )}
                      {row.status === "CANCELED" && (
                        <div className="text-[10px] text-red-600 font-bold mt-1">
                          Batal: {formatDateTime(row.canceled_at || "")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {row.owner_name ? (
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-1 text-sm">
                            <svg className="w-3.5 h-3.5 text-[#C92C1E] shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            {row.owner_name}
                          </div>
                          {row.lead_code && (
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">#{row.lead_code}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Tanpa Kustomer</span>
                      )}
                      <div className="text-xs text-[#C92C1E] font-bold flex items-center gap-1 mt-1.5">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        PIC: {row.sales?.name || "Tanpa PIC"}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">SPV: {row.supervisor?.name || "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getStatusBadge(row.status)}
                    </td>
                    <td className="px-4 py-4 max-w-[200px]">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase inline-block mb-1 ${row.training_type === 'ONLINE' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                        {row.training_type}
                      </span>
                      <div className="text-xs text-gray-700 truncate" title={row.location || row.meeting_url || ""}>
                        {row.training_type === 'ONLINE' ? (row.meeting_url ? <a href={row.meeting_url} target="_blank" className="text-blue-600 hover:underline">Link Meeting</a> : "-") : (row.location || "-")}
                      </div>
                    </td>
                    <td className="px-4 py-4 max-w-xs">
                      {row.status === "COMPLETED" && row.result_note && (
                        <div>
                          <span className="text-[10px] font-black uppercase text-emerald-600 block mb-0.5">Hasil:</span>
                          <span className="text-xs text-gray-700 line-clamp-2">{row.result_note}</span>
                        </div>
                      )}
                      {row.status === "CANCELED" && row.cancel_reason && (
                        <div>
                          <span className="text-[10px] font-black uppercase text-red-600 block mb-0.5">Alasan Batal:</span>
                          <span className="text-xs text-gray-700 line-clamp-2">{row.cancel_reason}</span>
                        </div>
                      )}
                      {row.status === "SCHEDULED" && row.note && (
                        <div>
                          <span className="text-[10px] font-black uppercase text-gray-400 block mb-0.5">Catatan:</span>
                          <span className="text-xs text-gray-700 line-clamp-2">{row.note}</span>
                        </div>
                      )}
                      {!row.result_note && !row.cancel_reason && (!row.note || row.status !== "SCHEDULED") && <span className="text-gray-400 italic text-xs">-</span>}
                    </td>
                    <td className="px-4 py-4 text-center">
                        <Link
                          href={`/menu/training/${row.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 hover:border-blue-200"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Detail
                        </Link>
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
      </>
      )}

    </div>
  );
}
