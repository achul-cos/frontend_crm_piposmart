"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Filter,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { listLeads, type ListLeadsParams } from "@/app/lib/api/leads";
import { softDeleteOwner } from "@/app/lib/api/owners";
import { toNasabahItems, displayValue } from "@/app/lib/mappers/nasabah";
import { useSession } from "@/app/lib/auth/session";
import { can } from "@/app/lib/auth/rbac";
import Badge, { stageTone } from "@/app/components/ui/Badge";
import Pagination from "@/app/components/ui/Pagination";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/app/components/ui/states";

/**
 * Kelolaan Customer — versi terintegrasi (Sprint FE-01, alur tulis Sprint
 * FE-02).
 *
 * Membaca data ASLI dari `GET /api/v1/leads`. Paginasi, pencarian, dan filter
 * dikirim ke server (bukan memfilter array di memory seperti versi mock).
 *
 * Tambah/Edit memakai halaman `./form` (dibangun sesi paralel, sudah
 * dimigrasikan FE-02 dari pola auth lama ke `app/lib/api/*`). Hapus memanggil
 * soft-delete langsung dari sini. Versi mock lama tetap tersimpan di
 * `./_legacy` sebagai referensi.
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

export default function DataKelolaanPage() {
  const { permissions } = useSession();
  const canManageOwners = can("owners.manage", permissions);
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [ownership, setOwnership] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    ownerId: number;
    namaOwner: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await softDeleteOwner(deleteTarget.ownerId);
      // Data berpindah ke Trash (soft-delete), bukan hilang permanen — bisa
      // dipulihkan lewat halaman Trash. Invalidate supaya tabel refetch dan
      // baris yang baru dihapus langsung hilang dari tampilan default.
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Gagal menghapus data.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
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

        {canManageOwners && (
          <div className="flex items-center gap-2">
            <Link
              href="/menu/data-kelolaan/trash"
              className="flex h-10 items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-4 text-xs font-black text-gray-500 transition hover:bg-gray-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Trash
            </Link>
            <Link
              href="/menu/data-kelolaan/form"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-[#C92C1E] px-4 text-xs font-black text-white transition hover:bg-[#A82216]"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Owner
            </Link>
          </div>
        )}
      </div>

      {/* Nilai kosong: field yang belum punya sumber data di backend */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="text-xs font-semibold text-amber-800">
          Nilai bertanda <span className="mx-1 font-black">—</span> berarti
          field tersebut belum memiliki sumber data di backend pada sprint
          ini.
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
                      {canManageOwners && item.leadId ? (
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/menu/data-kelolaan/form?id=${item.leadId}`}
                            className="text-gray-500 transition hover:scale-110 hover:text-[#C92C1E]"
                            title="Edit profil owner"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              item.ownerId &&
                              setDeleteTarget({
                                ownerId: item.ownerId,
                                namaOwner: item.namaOwner || item.kodeOwner,
                              })
                            }
                            disabled={!item.ownerId}
                            className="text-gray-500 transition hover:scale-110 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                            title={
                              item.ownerId
                                ? "Hapus owner (soft-delete)"
                                : "ID owner tidak tersedia"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-gray-300">
                          —
                        </span>
                      )}
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-gray-900">
              Hapus Owner?
            </h3>
            <p className="mt-2 text-sm font-medium text-gray-500">
              <span className="font-black text-gray-700">
                {deleteTarget.namaOwner}
              </span>{" "}
              akan dipindah ke Trash (soft-delete) — masih bisa dipulihkan
              lewat halaman Trash.
            </p>

            {deleteError && (
              <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
