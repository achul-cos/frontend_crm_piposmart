"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import {
  fetchTrainings,
  getSalesList,
  getProfile,
  type TrainingItem,
  type UserResponse,
} from "@/app/lib/api";
import AnalyticsTab from "./AnalyticsTab";
import CalendarTab from "./CalendarTab";

export default function TrainingPage() {
  usePageTitle("Training | CRM Piposmart");

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"list" | "calendar" | "analytics">("list");
  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [salesList, setSalesList] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("piposmart_user_role") || ""
      : ""
  );
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [salesFilter, setSalesFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;
  const isSales = currentRole.toUpperCase() === "SALES";

  useEffect(() => {
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
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [trainingData, salesData] = await Promise.all([
        fetchTrainings({
          page,
          limit,
          status: statusFilter || undefined,
          training_type: typeFilter || undefined,
          sales_id: !isSales && salesFilter ? Number(salesFilter) : undefined,
          scheduled_from: dateFrom || undefined,
          scheduled_to: dateTo || undefined,
        }),
        isSales
          ? Promise.resolve<UserResponse[]>([])
          : getSalesList().catch((err) => {
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
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, typeFilter, salesFilter, dateFrom, dateTo, isSales]);

  const totalPages = Math.ceil(totalItems / limit) || 1;
  const visibleSalesFilter = useMemo(() => !isSales, [isSales]);

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
        return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">Scheduled</span>;
      case "COMPLETED":
        return <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Completed</span>;
      case "CANCELED":
        return <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">Canceled</span>;
      default:
        return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden space-y-6 font-sans text-[#1C1C1E]">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="border-b-2 border-[#C92C1E] p-5">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
            <span>Menu</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Training</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Jadwal & Riwayat Training</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Satukan daftar training, kalender eksekusi, dan board analitik dalam satu workspace.
          </p>
        </div>
      </div>

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
          Daftar Training
          </button>
          <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all ${
            activeTab === "calendar"
              ? "bg-white text-[#C92C1E] shadow-sm"
              : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
          }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Kalender
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
        <AnalyticsTab />
      ) : activeTab === "calendar" ? (
        <CalendarTab trainings={trainings} onSelectTraining={(t) => router.push(`/menu/training/${t.id}`)} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-4">
            <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm">
                <span className="text-gray-400">Jadwal:</span>
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
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELED">Canceled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm focus:border-[#C92C1E] focus:outline-none"
              >
                <option value="">Semua Tipe (Offline/Online)</option>
                <option value="OFFLINE">Offline (Di Tempat)</option>
                <option value="ONLINE">Online (Virtual)</option>
              </select>

              {visibleSalesFilter ? (
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
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm">
                  Menampilkan riwayat training milik Anda
                </div>
              )}
            </div>
          </div>

          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm text-gray-600">
              <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
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
                    <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                      Memuat data training...
                    </td>
                  </tr>
                ) : trainings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                      Tidak ada data training yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  trainings.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="font-bold text-gray-900">{formatDateTime(row.scheduled_at)}</div>
                        {row.status === "COMPLETED" && (
                          <div className="mt-1 text-[10px] font-bold text-emerald-600">
                            Selesai: {formatDateTime(row.completed_at || "")}
                          </div>
                        )}
                        {row.status === "CANCELED" && (
                          <div className="mt-1 text-[10px] font-bold text-red-600">
                            Batal: {formatDateTime(row.canceled_at || "")}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {row.owner_name ? (
                          <div>
                            <div className="flex items-center gap-1 text-sm font-bold text-gray-900">
                              <svg className="h-3.5 w-3.5 shrink-0 text-[#C92C1E]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              {row.owner_name}
                            </div>
                            {row.lead_code && <div className="mt-0.5 font-mono text-[10px] text-gray-400">#{row.lead_code}</div>}
                          </div>
                        ) : (
                          <span className="text-xs italic text-gray-400">Tanpa Kustomer</span>
                        )}
                        <div className="mt-1.5 flex items-center gap-1 text-xs font-bold text-[#C92C1E]">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          PIC: {row.sales?.name || "Tanpa PIC"}
                        </div>
                        <div className="mt-0.5 text-[10px] text-gray-400">SPV: {row.supervisor?.name || "-"}</div>
                      </td>
                      <td className="px-4 py-4 text-center">{getStatusBadge(row.status)}</td>
                      <td className="max-w-[200px] px-4 py-4">
                        <span
                          className={`mb-1 inline-block rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                            row.training_type === "ONLINE" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {row.training_type}
                        </span>
                        <div className="truncate text-xs text-gray-700" title={row.location || row.meeting_url || ""}>
                          {row.training_type === "ONLINE" ? (
                            row.meeting_url ? (
                              <a href={row.meeting_url} target="_blank" className="text-blue-600 hover:underline">
                                Link Meeting
                              </a>
                            ) : (
                              "-"
                            )
                          ) : (
                            row.location || "-"
                          )}
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        {row.status === "COMPLETED" && row.result_note && (
                          <div>
                            <span className="mb-0.5 block text-[10px] font-black uppercase text-emerald-600">Hasil:</span>
                            <span className="line-clamp-2 text-xs text-gray-700">{row.result_note}</span>
                          </div>
                        )}
                        {row.status === "CANCELED" && row.cancel_reason && (
                          <div>
                            <span className="mb-0.5 block text-[10px] font-black uppercase text-red-600">Alasan Batal:</span>
                            <span className="line-clamp-2 text-xs text-gray-700">{row.cancel_reason}</span>
                          </div>
                        )}
                        {row.status === "SCHEDULED" && row.note && (
                          <div>
                            <span className="mb-0.5 block text-[10px] font-black uppercase text-gray-400">Catatan:</span>
                            <span className="line-clamp-2 text-xs text-gray-700">{row.note}</span>
                          </div>
                        )}
                        {!row.result_note && !row.cancel_reason && (!row.note || row.status !== "SCHEDULED") && (
                          <span className="text-xs italic text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Link
                          href={`/menu/training/${row.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 px-3 py-1.5 text-xs font-bold text-blue-600 transition-colors hover:border-blue-200 hover:bg-blue-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
