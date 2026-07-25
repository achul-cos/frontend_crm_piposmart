"use client";

import React from "react";

/**
 * Kontrol paginasi bersama.
 *
 * Diangkat dari `app/menu/laporan-penjualan/components/Pagination.tsx` —
 * gaya visualnya dipertahankan persis supaya tampilan tidak berubah, tapi
 * sekarang bisa dipakai tabel mana pun. Halaman laporan penjualan tetap
 * memakai salinan lokalnya sampai dimigrasikan pada FE-04.
 */
type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange?: (rows: number) => void;
  /** Ditampilkan saat halaman berikutnya sedang diambil dari server. */
  isFetching?: boolean;
};

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  isFetching = false,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, totalItems);
  const buttonClass =
    "h-8 rounded-lg border border-gray-100 bg-white px-3 text-[11px] font-black text-gray-400 transition hover:bg-gray-50 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-4 rounded-b-2xl border-t border-gray-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-bold text-gray-400">
        Menampilkan{" "}
        <span className="text-gray-700">
          {start} - {end}
        </span>{" "}
        dari <span className="text-gray-700">{totalItems}</span> data
        {isFetching && <span className="ml-2 text-gray-300">memuat…</span>}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onRowsPerPageChange && (
          <select
            value={rowsPerPage}
            onChange={(event) => {
              onRowsPerPageChange(Number(event.target.value));
              onPageChange(1);
            }}
            className="h-8 cursor-pointer rounded-lg border border-gray-100 bg-gray-50/50 px-2 text-[11px] font-black text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
          >
            {[10, 25, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value} / halaman
              </option>
            ))}
          </select>
        )}

        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className={buttonClass}
        >
          Awal
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className={buttonClass}
        >
          Prev
        </button>

        <div className="flex h-8 items-center justify-center rounded-lg bg-red-50 px-3 text-[11px] font-black text-[#C92C1E]">
          {currentPage} / {totalPages}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className={buttonClass}
        >
          Next
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className={buttonClass}
        >
          Akhir
        </button>
      </div>
    </div>
  );
}
