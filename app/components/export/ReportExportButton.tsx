"use client";

import { useState } from "react";
import {
  createReportExport,
  downloadReportExportFile,
  type ReportExportFilters,
  type ReportExportKey,
  waitForReportExport,
} from "@/app/lib/api";
import { useFeedback } from "@/app/components/feedback/FeedbackContext";

function parseFilename(disposition: string | null, fallback: string) {
  if (!disposition) return fallback;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return fallback;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  window.URL.revokeObjectURL(url);
  anchor.remove();
}

export default function ReportExportButton({
  reportKey,
  filters = {},
  label = "Export Excel",
  loadingLabel = "Menyiapkan...",
  successTitle = "Export siap",
  successMessage = "File export sedang diunduh.",
  className,
  disabled = false,
}: {
  reportKey: ReportExportKey;
  filters?: ReportExportFilters;
  label?: string;
  loadingLabel?: string;
  successTitle?: string;
  successMessage?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { showError, showSuccess } = useFeedback();
  const [isExporting, setIsExporting] = useState(false);

  const handleClick = async () => {
    setIsExporting(true);

    try {
      const created = await createReportExport(reportKey, "XLSX", filters);
      const completed = await waitForReportExport(created.id);
      const { blob, disposition } = await downloadReportExportFile(completed.id);
      const filename = parseFilename(
        disposition,
        completed.file_name || `${reportKey}_${completed.id}.xlsx`,
      );

      triggerDownload(blob, filename);
      showSuccess({
        title: successTitle,
        message: successMessage,
      });
    } catch (error) {
      showError({
        title: "Export gagal",
        message: "Sistem belum berhasil menyiapkan file export.",
        cause: "Request export gagal, file belum selesai dibuat, atau unduhan ditolak oleh server.",
        solution: "Coba lagi beberapa saat. Jika masalah berulang, periksa filter aktif atau log backend report export.",
        technicalDetails: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled || isExporting}
      className={className}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v10m0 0l-4-4m4 4l4-4M4 20h16" />
      </svg>
      {isExporting ? loadingLabel : label}
    </button>
  );
}
