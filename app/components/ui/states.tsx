"use client";

import React from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

import { ApiError } from "@/app/lib/api/client";

/**
 * Kerangka tabel saat memuat.
 * Diangkat dari pola `laporan-penjualan/components/TransactionTableSkeleton.tsx`
 * agar bisa dipakai seluruh tabel, bukan hanya laporan penjualan.
 */
export function TableSkeleton({
  rows = 8,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="animate-pulse space-y-2 p-5" aria-busy="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <div
              key={columnIndex}
              className="h-9 flex-1 rounded-lg bg-gray-100"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title = "Belum ada data",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <Inbox className="h-10 w-10 text-gray-300" />
      <p className="text-sm font-black text-gray-700">{title}</p>
      {description && (
        <p className="max-w-md text-xs font-semibold text-gray-400">
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Tampilan kegagalan pemanggilan API.
 *
 * Menampilkan `request_id` dari backend. Itu bukan hiasan: backend
 * menyertakan `request_id` di setiap response dan mencatatnya di log, jadi
 * satu ID ini cukup untuk menemukan jejak error yang tepat saat pengguna
 * melapor.
 */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const isApiError = error instanceof ApiError;
  const message =
    isApiError || error instanceof Error
      ? error.message
      : "Terjadi kesalahan yang tidak diketahui.";

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <AlertTriangle className="h-10 w-10 text-[#C92C1E]" />
      <div className="space-y-1">
        <p className="text-sm font-black text-gray-800">Gagal memuat data</p>
        <p className="max-w-lg text-xs font-semibold text-gray-500">
          {message}
        </p>
        {isApiError && error.code && (
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Kode: {error.code}
            {error.requestId ? ` • Request ID: ${error.requestId}` : ""}
          </p>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-xl border border-red-100 bg-red-50/60 px-4 py-2 text-xs font-black text-[#C92C1E] transition hover:bg-red-50"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-bold text-gray-400">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {label}
    </span>
  );
}
