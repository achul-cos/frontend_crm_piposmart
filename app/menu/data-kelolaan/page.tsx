"use client";

import React, { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Filter, Lock, RefreshCw, Search } from "lucide-react";

import { listLeads, type ListLeadsParams } from "@/app/lib/api/leads";
import { toNasabahItems, displayValue } from "@/app/lib/mappers/nasabah";
import Badge, { stageTone } from "@/app/components/ui/Badge";
import Pagination from "@/app/components/ui/Pagination";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/app/components/ui/states";

/**
 * Kelolaan Customer — versi terintegrasi (Sprint FE-01).
 *
 * Membaca data ASLI dari `GET /api/v1/leads`. Paginasi, pencarian, dan filter
 * dikirim ke server (bukan memfilter array di memory seperti versi mock).
 *
 * Scope FE-01 sengaja READ-ONLY: tombol tulis (tambah/edit/hapus/assign)
 * dinonaktifkan dan diberi keterangan "tersedia di FE-02". Ini menjaga
 * kejujuran — begitu tabel menampilkan data asli, tidak boleh ada aksi yang
 * diam-diam menulis ke localStorage. Versi mock yang lama tetap tersimpan di
 * `./legacy` sebagai referensi migrasi.
 */

const STAGE_OPTIONS = [
  { value: "", label: "Semua Stage" },
  { value: "NEW", label: "Baru" },
  { value: "POSSIBLE", label: "Kemungkinan Potensial" },
  { value: "POTENTIAL", label: "Potensial" },
  { value: "CLOSING", label: "Berlangganan" },
  { value: "INVALID", label: "Tidak Potensial" },
];

const OWNERSHIP_OPTIONS = [
  { value: "", label: "Semua Kepemilikan" },
  { value: "assigned", label: "Sudah Ada PIC" },
  { value: "unassigned", label: "Belum Ada PIC" },
];

function DisabledActionHint() {
  return (
    <span
      className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gray-300"
      title="Alur tulis (tambah/edit/hapus/assign) tersedia mulai Sprint FE-02"
    >
      <Lock className="h-3 w-3" />
      FE-02
    </span>
  );
}

export default function DataKelolaanPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [ownership, setOwnership] = useState("");

  const params = useMemo<ListLeadsParams>(
    () => ({
      page,
      limit,
      q: query || undefined,
      stage: stage || undefined,
      ownership: ownership || undefined,
    }),
    [page, limit, query, stage, ownership],
  );

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["leads", params],
    queryFn: () => listLeads(params),
    placeholderData: keepPreviousData,
  });

  const items = useMemo(
    () => toNasabahItems(data?.items ?? [], (page - 1) * limit),
    [data, page, limit],
  );

  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Kelolaan Customer
          </h1>
          <Badge tone="success">Data Live • API</Badge>
        </div>
        <p className="text-sm font-semibold text-gray-400">
          Menampilkan lead pelanggan langsung dari database backend
          (`/api/v1/leads`). Paginasi dan filter diproses di server.
        </p>
      </div>

      {/* Banner mode read-only */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="text-xs font-semibold text-amber-800">
          Mode baca-saja (Sprint FE-01). Aksi tambah, edit, hapus, dan
          penugasan PIC akan diaktifkan pada Sprint FE-02. Nilai bertanda
          <span className="mx-1 font-black">—</span>
          berarti field tersebut belum memiliki sumber data di backend pada
          sprint ini.
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form onSubmit={submitSearch} className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari kode / nama owner / brand / telepon…"
              className="h-10 w-full rounded-xl border border-gray-100 bg-gray-50/50 pl-9 pr-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-red-200 focus:bg-white"
            />
          </form>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-300" />
            <select
              value={stage}
              onChange={(event) => {
                setPage(1);
                setStage(event.target.value);
              }}
              className="h-10 cursor-pointer rounded-xl border border-gray-100 bg-gray-50/50 px-3 text-xs font-black text-gray-600 outline-none transition focus:border-red-200 focus:bg-white"
            >
              {STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={ownership}
              onChange={(event) => {
                setPage(1);
                setOwnership(event.target.value);
              }}
              className="h-10 cursor-pointer rounded-xl border border-gray-100 bg-gray-50/50 px-3 text-xs font-black text-gray-600 outline-none transition focus:border-red-200 focus:bg-white"
            >
              {OWNERSHIP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void refetch()}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-3 text-xs font-black text-gray-500 transition hover:bg-gray-50"
              title="Muat ulang"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <DisabledActionHint />
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <TableSkeleton rows={limit > 10 ? 10 : limit} columns={7} />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Tidak ada lead"
            description="Tidak ada data yang cocok dengan filter saat ini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Kode Owner</th>
                  <th className="px-4 py-3">Nama Owner</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Telepon</th>
                  <th className="px-4 py-3">PIC Sales</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Skor</th>
                  <th className="px-4 py-3">Follow-up</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr
                    key={item.leadId ?? item.kodeBaris}
                    className="transition hover:bg-red-50/30"
                  >
                    <td className="px-4 py-3 text-xs font-bold text-gray-400">
                      {item.no}
                    </td>
                    <td className="px-4 py-3 font-black text-gray-700">
                      {item.kodeOwner || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {item.namaOwner || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.projectBrand || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {item.noHpOwner || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.pic || (
                        <span className="text-gray-300">Belum ada PIC</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={stageTone(item.statusAkun)}>
                        {item.statusAkun}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center font-black text-gray-700">
                      {item.scor}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-500">
                      {displayValue(item, "tanggalFu")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DisabledActionHint />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            rowsPerPage={limit}
            onPageChange={setPage}
            onRowsPerPageChange={setLimit}
            isFetching={isFetching}
          />
        )}
      </div>
    </div>
  );
}
