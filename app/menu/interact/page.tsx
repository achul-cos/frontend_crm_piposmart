"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Search } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { getProfile } from "@/app/lib/api";
import { AnimatedListItem } from "@/app/components/motion/primitives";
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";
import ReportExportButton from "@/app/components/export/ReportExportButton";
import { useInteractionListQuery, useInteractSalesListQuery } from "@/app/lib/queries/interact";
import AnalyticsTabSkeleton from "@/app/components/skeleton/AnalyticsTabSkeleton";

const AnalyticsTab = dynamic(() => import("./AnalyticsTab"), {
  ssr: false,
  loading: () => <AnalyticsTabSkeleton sections={2} />,
});

export default function InteractPage() {
  usePageTitle("Interact | CRM Piposmart");

  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");
  const [currentRole, setCurrentRole] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("piposmart_user_role") || ""
      : ""
  );
  const [typeFilter, setTypeFilter] = useState("");
  const [salesFilter, setSalesFilter] = useState("");
  const [scoreFilter, setScoreFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
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
        // pakai fallback localStorage bila profile gagal dimuat
      });
  }, []);

  const interactionListParams = useMemo(
    () => ({
      page,
      limit,
      type: typeFilter || undefined,
      sales_id: !isSales && salesFilter ? Number(salesFilter) : undefined,
      score: scoreFilter ? Number(scoreFilter) : undefined,
      interaction_from: dateFrom || undefined,
      interaction_to: dateTo || undefined,
    }),
    [page, typeFilter, salesFilter, scoreFilter, dateFrom, dateTo, isSales]
  );

  const { data: interactData, isLoading } = useInteractionListQuery(interactionListParams);
  const { data: salesListData } = useInteractSalesListQuery(!isSales);

  const interactions = interactData?.items || [];
  const salesList = salesListData || [];
  const totalItems = interactData?.pagination?.total || 0;

  const totalPages = Math.ceil(totalItems / limit) || 1;
  const typeFilterLabel =
    typeFilter === "CALL"
      ? "Call Saja"
      : typeFilter === "CHAT"
        ? "Chat Saja"
        : typeFilter === "CALL_CHAT"
          ? "Call + Chat"
          : "Semua Tipe";
  const scoreFilterLabel =
    scoreFilter === "3"
      ? "Skor 3"
      : scoreFilter === "2"
        ? "Skor 2"
        : scoreFilter === "1"
          ? "Skor 1"
          : scoreFilter === "0"
            ? "Skor 0"
            : "Semua Skor";

  const visibleSalesFilter = useMemo(() => !isSales, [isSales]);

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
    if (score === 3) return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">3 (Langganan)</span>;
    if (score === 2) return <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800">2 (Potensial)</span>;
    if (score === 1) return <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800">1 (Kemungkinan)</span>;
    return <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">0 (Tidak Potensial)</span>;
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "CALL":
        return "bg-blue-100 text-blue-700";
      case "CHAT":
        return "bg-emerald-100 text-emerald-700";
      case "CALL_CHAT":
        return "bg-violet-100 text-violet-700";
      default:
        return "bg-gray-100 text-gray-700";
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
            <span className="text-[#C92C1E]">Interact</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Riwayat Aktivitas & Interaksi</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Pantau seluruh riwayat call, chat, remark, dan status follow-up kustomer dari tim sales dengan mode tabel dan analitik.
          </p>
        </div>
      </div>

      <QuickInfoCardGrid>
        <QuickInfoCard
          label="Total Interaksi"
          value={totalItems}
          description="Jumlah riwayat interaksi sesuai filter aktif."
          tone="accent"
          silhouette="interact"
        />
        <QuickInfoCard
          label="Ditampilkan"
          value={interactions.length}
          description="Baris interaksi pada halaman aktif saat ini."
          tone="emerald"
        />
        <QuickInfoCard
          label="Tipe Aktif"
          value={typeFilterLabel}
          description={`Filter skor: ${scoreFilterLabel}.`}
          tone="rose"
        />
        <QuickInfoCard
          label="Halaman"
          value={
            <>
              {page} <span className="text-base font-bold opacity-70">/ {totalPages}</span>
            </>
          }
          description="Posisi halaman aktif dari total riwayat."
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
          Data Interaksi
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
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
          {/* Table Header */}
          <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Daftar Interaksi</h2>
              <p className="mt-1 text-sm text-gray-500">Data seluruh aktivitas interaksi.</p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3">
              <ReportExportButton
                reportKey="activities"
                filters={{
                  date_from: dateFrom || undefined,
                  date_to: dateTo || undefined,
                  sales_id: !isSales && salesFilter ? salesFilter : undefined,
                }}
                label="Export Interaksi"
                loadingLabel="Menyiapkan Export..."
                successMessage="File interaksi sedang diunduh."
                className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="border-b border-gray-50 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3 w-full">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm">
                <span className="text-gray-400">Tanggal Interaksi:</span>
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
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm focus:border-[#C92C1E] focus:outline-none"
              >
                <option value="">Semua Tipe (Call/Chat)</option>
                <option value="CALL">Call Saja</option>
                <option value="CHAT">Chat Saja</option>
                <option value="CALL_CHAT">Call + Chat</option>
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
                  Menampilkan riwayat interaksi milik Anda
                </div>
              )}

              <select
                value={scoreFilter}
                onChange={(e) => {
                  setScoreFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm focus:border-[#C92C1E] focus:outline-none"
              >
                <option value="">Semua Skor</option>
                <option value="3">3 (Langganan)</option>
                <option value="2">2 (Potensial)</option>
                <option value="1">1 (Kemungkinan)</option>
                <option value="0">0 (Tidak Potensial)</option>
              </select>
            </div>
          </div>
          
          {/* Search */}
          <div className="border-b border-gray-100 px-4 py-3 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari interaksi..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                />
              </div>
            </div>
          </div>

          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm text-gray-600">
              <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-4">Waktu Interaksi</th>
                  <th className="px-4 py-4">Kustomer & PIC</th>
                  <th className="px-4 py-4 text-center">Tipe</th>
                  <th className="px-4 py-4 text-center">Skor & Remark</th>
                  <th className="px-4 py-4 font-bold">Catatan & Respon</th>
                  <th className="px-4 py-4 font-bold">Tanggal FU</th>
                  <th className="px-4 py-4 text-center font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                      Memuat data interaksi...
                    </td>
                  </tr>
                ) : interactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                      Tidak ada data interaksi yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  interactions.map((row, rowIndex) => (
                    <AnimatedListItem
                      as="tr"
                      key={row.id}
                      index={rowIndex}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="font-bold text-gray-900">{formatDateTime(row.interaction_at)}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          Durasi: {row.duration_seconds ? `${row.duration_seconds}s` : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-black text-gray-900">{row.contact_name || "-"}</div>
                        <div className="mt-0.5 text-xs text-gray-500">{row.contact_phone || "-"}</div>
                        <div className="mt-1.5 flex items-center gap-1 text-xs font-bold text-[#C92C1E]">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          {row.sales?.name || "Tanpa PIC"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${getTypeBadgeClass(row.type)}`}
                        >
                          {row.type}
                        </span>
                        <div className="mt-2 flex flex-col items-center gap-1 text-[10px] font-bold">
                          {row.call_status ? (
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                              Call: {row.call_status}
                            </span>
                          ) : null}
                          {row.chat_status ? (
                            <span className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-fuchsia-700">
                              Chat: {row.chat_status}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-gray-500">{row.status_after}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="mb-1.5">{getScoreBadge(row.score_after)}</div>
                        <span className="text-xs font-bold text-gray-700">{row.remark_label || "-"}</span>
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        {row.customer_response && (
                          <div className="mb-2">
                            <span className="mb-0.5 block text-[10px] font-black uppercase text-gray-400">Respon:</span>
                            <span className="line-clamp-2 text-xs text-gray-700">{row.customer_response}</span>
                          </div>
                        )}
                        {row.note && (
                          <div>
                            <span className="mb-0.5 block text-[10px] font-black uppercase text-gray-400">Catatan:</span>
                            <span className="line-clamp-2 text-xs text-gray-700">{row.note}</span>
                          </div>
                        )}
                        {!row.customer_response && !row.note && <span className="text-xs italic text-gray-400">-</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="font-bold text-gray-900">{formatDate(row.follow_up_at || "")}</div>
                        <div className="mt-1 max-w-[150px] truncate text-xs text-gray-500">{row.follow_up_note || "-"}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Link
                          href={`/menu/interact/${row.id}`}
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
