import React, { useCallback, useEffect, useState } from "react";
import { getImportBatches, ImportBatchResponse } from "@/app/lib/api";
import ScreenPortal from "@/app/components/ui/ScreenPortal";

interface ImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: (batch: ImportBatchResponse) => void;
  profile: string;
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  UPLOADED: { label: "Menunggu Validasi", badgeClass: "border border-blue-100 bg-blue-50 text-blue-700" },
  VALIDATING: { label: "Sedang Validasi", badgeClass: "border border-indigo-100 bg-indigo-50 text-indigo-700" },
  VALIDATED: { label: "Siap Commit", badgeClass: "border border-amber-100 bg-amber-50 text-amber-700" },
  VALIDATION_FAILED: { label: "Validasi Gagal", badgeClass: "border border-red-100 bg-red-50 text-red-700" },
  COMMITTING: { label: "Sedang Menyimpan", badgeClass: "border border-purple-100 bg-purple-50 text-purple-700" },
  COMMITTED: { label: "Selesai", badgeClass: "border border-emerald-100 bg-emerald-50 text-emerald-700" },
  COMMIT_FAILED: { label: "Commit Gagal", badgeClass: "border border-red-100 bg-red-50 text-red-700" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    badgeClass: "border border-gray-200 bg-gray-100 text-gray-600",
  };

  const dotClass =
    status === "COMMITTED"
      ? "bg-emerald-500"
      : status === "VALIDATION_FAILED" || status === "COMMIT_FAILED"
        ? "bg-red-500"
        : status === "VALIDATED"
          ? "bg-amber-500"
          : status === "COMMITTING"
            ? "bg-purple-500 animate-pulse"
            : status === "VALIDATING"
              ? "bg-indigo-500 animate-pulse"
              : "bg-blue-500";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${cfg.badgeClass}`}
    >
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotClass}`} />
      {cfg.label}
    </span>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";

  return new Date(dateStr).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ImportHistoryModal({
  isOpen,
  onClose,
  onResume,
  profile,
}: ImportHistoryModalProps) {
  const [batches, setBatches] = useState<ImportBatchResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await getImportBatches({ profile, limit: 20 });
      setBatches(resp?.items || []);
    } catch (err) {
      console.error("Gagal memuat riwayat import", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOpen, loadHistory]);

  if (!isOpen) return null;

  const isResumable = (status: string) =>
    ["UPLOADED", "VALIDATING", "VALIDATED", "COMMITTING"].includes(status);

  return (
    <ScreenPortal>
      <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-0">
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="flex min-h-full items-center justify-center">
          <div className="app-modal-panel relative z-10 w-full max-w-3xl rounded-[32px] shadow-2xl transition-all xl:max-w-4xl">
            <div className="app-modal-header flex items-center justify-between px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Riwayat Import</h3>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Daftar proses import yang pernah dilakukan
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-medium">Memuat riwayat...</span>
              </div>
            ) : batches.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500">Belum ada riwayat import.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-gray-600">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase text-gray-500">
                      <th className="px-4 py-3">Nama File</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Valid / Invalid / Commit</th>
                      <th className="px-4 py-3">Waktu Upload</th>
                      <th className="px-4 py-3">Waktu Selesai</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {batches.map((batch) => (
                      <tr key={batch.id} className="transition-colors hover:bg-gray-50/80">
                        <td className="px-4 py-3">
                          <div
                            className="max-w-[200px] truncate font-medium text-gray-900"
                            title={batch.original_filename}
                          >
                            {decodeURIComponent(batch.original_filename || batch.code)}
                          </div>
                          <div className="mt-0.5 text-[10px] text-gray-400">{batch.code}</div>
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge status={batch.status} />
                          {(batch.status === "VALIDATION_FAILED" || batch.status === "COMMIT_FAILED") &&
                          batch.error_message ? (
                              <p
                                className="mt-1 max-w-[180px] line-clamp-2 text-[10px] text-red-500"
                                title={batch.error_message}
                              >
                                {batch.error_message}
                              </p>
                            ) : null}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2 text-xs font-bold">
                            <span className="text-emerald-600">{batch.valid_rows || 0} valid</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-red-500">{batch.invalid_rows || 0} error</span>
                            {(batch.committed_rows ?? 0) > 0 ? (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-indigo-600">{batch.committed_rows} saved</span>
                              </>
                            ) : null}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                          <div>{formatDate(batch.uploaded_at)}</div>
                          {batch.uploaded_by ? (
                            <div className="mt-0.5 text-[10px] text-gray-400">
                              oleh {batch.uploaded_by.name}
                            </div>
                          ) : null}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                          {batch.committed_at ? (
                            <div>
                              <div>{formatDate(batch.committed_at)}</div>
                              {batch.committed_by ? (
                                <div className="mt-0.5 text-[10px] text-gray-400">
                                  oleh {batch.committed_by.name}
                                </div>
                              ) : null}
                            </div>
                          ) : batch.validated_at ? (
                            <div>
                              <div>{formatDate(batch.validated_at)}</div>
                              <div className="mt-0.5 text-[10px] text-gray-400">selesai validasi</div>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => onResume(batch)}
                            className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors ${
                              isResumable(batch.status)
                                ? "border-red-100 bg-red-50 text-[#C92C1E] hover:bg-red-100 hover:text-red-800"
                                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                          >
                            {isResumable(batch.status) ? "Lanjutkan" : "Lihat"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </ScreenPortal>
  );
}
