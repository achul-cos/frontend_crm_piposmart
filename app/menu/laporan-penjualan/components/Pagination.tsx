import React from "react";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  rowsPerPage: number;
  onPageChange: (p: number) => void;
  onRowsPerPageChange?: (p: number) => void;
};

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: PaginationProps) {
  if (totalItems === 0) return null;
  const start = (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, totalItems);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 px-5 py-4 bg-white rounded-b-2xl">
      <p className="text-xs font-bold text-gray-400">
        Menampilkan <span className="text-gray-700">{start} - {end}</span> dari <span className="text-gray-700">{totalItems}</span> data
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onRowsPerPageChange && (
          <select
            value={rowsPerPage}
            onChange={(e) => {
              onRowsPerPageChange(Number(e.target.value));
              onPageChange(1); // Reset page to 1 when changing rows per page
            }}
            className="h-8 cursor-pointer rounded-lg border border-gray-100 bg-gray-50/50 px-2 text-[11px] font-black text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
          >
            {[10, 25, 50, 100].map((val) => (
              <option key={val} value={val}>
                {val} / halaman
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="h-8 rounded-lg border border-gray-100 bg-white px-3 text-[11px] font-black text-gray-400 transition hover:bg-gray-50 disabled:opacity-40"
        >
          Awal
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="h-8 rounded-lg border border-gray-100 bg-white px-3 text-[11px] font-black text-gray-400 transition hover:bg-gray-50 disabled:opacity-40"
        >
          Prev
        </button>
        
        <div className="flex h-8 items-center justify-center rounded-lg bg-red-50 px-3 text-[11px] font-black text-[#C92C1E]">
          {currentPage} / {totalPages}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="h-8 rounded-lg border border-gray-100 bg-white px-3 text-[11px] font-black text-gray-400 transition hover:bg-gray-50 disabled:opacity-40"
        >
          Next
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="h-8 rounded-lg border border-gray-100 bg-white px-3 text-[11px] font-black text-gray-400 transition hover:bg-gray-50 disabled:opacity-40"
        >
          Akhir
        </button>
      </div>
    </div>
  );
}
