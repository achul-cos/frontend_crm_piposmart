"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export type TableRowsPerPage = number | "all";

type TablePaginationFooterProps = {
  currentPage: number;
  totalItems: number;
  rowsPerPage: TableRowsPerPage;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: TableRowsPerPage) => void;
  totalPages?: number;
  rowsPerPageOptions?: number[];
  className?: string;
};

const DEFAULT_ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100, 1000, 2000, 5000, 10000];

function clampPage(page: number, totalPages: number) {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.trunc(page)), Math.max(1, totalPages));
}

export function getTableTotalPages(totalItems: number, rowsPerPage: TableRowsPerPage) {
  if (rowsPerPage === "all") return 1;
  return Math.max(1, Math.ceil(totalItems / Math.max(rowsPerPage, 1)));
}

export function getTablePageRange(
  currentPage: number,
  totalItems: number,
  rowsPerPage: TableRowsPerPage,
) {
  if (totalItems <= 0) return { start: 0, end: 0 };
  if (rowsPerPage === "all") return { start: 1, end: totalItems };

  return {
    start: (currentPage - 1) * rowsPerPage + 1,
    end: Math.min(currentPage * rowsPerPage, totalItems),
  };
}

function PageJumpInput({
  currentPage,
  totalPages,
  onSubmit,
}: {
  currentPage: number;
  totalPages: number;
  onSubmit: (page: number) => void;
}) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  const submitPageInput = () => {
    const nextPage = Number(pageInput);
    const safePage = clampPage(nextPage, totalPages);
    onSubmit(safePage);
    setPageInput(String(safePage));
  };

  return (
    <input
      type="number"
      min={1}
      max={totalPages}
      value={pageInput}
      onChange={(event) => setPageInput(event.target.value)}
      onBlur={submitPageInput}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          submitPageInput();
          event.currentTarget.blur();
        }
      }}
      className="h-6 w-14 border-0 bg-transparent text-center text-xs font-black text-[#C92C1E] outline-none"
    />
  );
}

export default function TablePaginationFooter({
  currentPage,
  totalItems,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  totalPages,
  rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE_OPTIONS,
  className = "",
}: TablePaginationFooterProps) {
  const resolvedTotalPages =
    totalPages ?? getTableTotalPages(totalItems, rowsPerPage);
  const safeCurrentPage = clampPage(currentPage, resolvedTotalPages);
  const { start, end } = getTablePageRange(
    safeCurrentPage,
    totalItems,
    rowsPerPage,
  );
  const goToPage = (page: number) => {
    onPageChange(clampPage(page, resolvedTotalPages));
  };

  const pageButtonClass =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div
      data-table-pagination-manual="true"
      className={`flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 p-4 lg:flex-row lg:items-center lg:justify-between ${className}`}
    >
      <p className="text-xs font-bold text-gray-500">
        Menampilkan{" "}
        <span className="font-black text-gray-900">
          {start.toLocaleString("id-ID")} - {end.toLocaleString("id-ID")}
        </span>{" "}
        dari{" "}
        <span className="font-black text-gray-900">
          {totalItems.toLocaleString("id-ID")}
        </span>{" "}
        data
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={rowsPerPage}
          onChange={(event) => {
            const value = event.target.value;
            onRowsPerPageChange(value === "all" ? "all" : Number(value));
          }}
          className="h-8 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
        >
          {rowsPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option} / halaman
            </option>
          ))}
          <option value="all">Semua data</option>
        </select>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(1)}
            disabled={safeCurrentPage <= 1}
            className={pageButtonClass}
            title="Halaman pertama"
            aria-label="Halaman pertama"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goToPage(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            className={pageButtonClass}
            title="Halaman sebelumnya"
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2">
          <span className="text-[11px] font-bold text-gray-500">Hal.</span>
          <PageJumpInput
            key={`${safeCurrentPage}-${resolvedTotalPages}`}
            currentPage={safeCurrentPage}
            totalPages={resolvedTotalPages}
            onSubmit={goToPage}
          />
          <span className="text-[11px] font-bold text-gray-500">
            / {resolvedTotalPages.toLocaleString("id-ID")}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= resolvedTotalPages}
            className={pageButtonClass}
            title="Halaman berikutnya"
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goToPage(resolvedTotalPages)}
            disabled={safeCurrentPage >= resolvedTotalPages}
            className={pageButtonClass}
            title="Halaman terakhir"
            aria-label="Halaman terakhir"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
