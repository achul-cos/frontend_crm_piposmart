import React, { useEffect, useState } from "react";
import { getImportBatches, ImportBatchResponse } from "@/app/lib/api";

interface ImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: (batch: ImportBatchResponse) => void;
  profile: string;
}

// Konfigurasi tampilan per status sesuai Sprint 14
const STATUS_CONFIG: Record<string, { label: string; color: string; badgeClass: string }> = {
  UPLOADED:          { label: "Menunggu Validasi", color: "blue",   badgeClass: "bg-blue-50 text-blue-700 border border-blue-100" },
  VALIDATING:        { label: "Sedang Validasi",   color: "indigo", badgeClass: "bg-indigo-50 text-indigo-700 border border-indigo-100" },
  VALIDATED:         { label: "Siap Commit",        color: "amber",  badgeClass: "bg-amber-50 text-amber-700 border border-amber-100" },
  VALIDATION_FAILED: { label: "Validasi Gagal",     color: "red",    badgeClass: "bg-red-50 text-red-700 border border-red-100" },
  COMMITTING:        { label: "Sedang Menyimpan",   color: "purple", badgeClass: "bg-purple-50 text-purple-700 border border-purple-100" },
  COMMITTED:         { label: "Selesai",             color: "green",  badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  COMMIT_FAILED:     { label: "Commit Gagal",        color: "red",    badgeClass: "bg-red-50 text-red-700 border border-red-100" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, badgeClass: "bg-gray-100 text-gray-600 border border-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${cfg.badgeClass}`}>
      {/* dot indikator */}
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        status === "COMMITTED"         ? "bg-emerald-500" :
        status === "VALIDATION_FAILED" ? "bg-red-500" :
        status === "COMMIT_FAILED"     ? "bg-red-500" :
        status === "VALIDATED"         ? "bg-amber-500" :
        status === "COMMITTING"        ? "bg-purple-500 animate-pulse" :
        status === "VALIDATING"        ? "bg-indigo-500 animate-pulse" :
        "bg-blue-500"
      }`} />
      {cfg.label}
    </span>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ImportHistoryModal({ isOpen, onClose, onResume, profile }: ImportHistoryModalProps) {
  const [batches, setBatches] = useState<ImportBatchResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const resp = await getImportBatches({ profile, limit: 20 });
      setBatches(resp?.items || []);
    } catch (err) {
      console.error("Gagal memuat riwayat import", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isResumable = (status: string) =>
    ["UPLOADED", "VALIDATING", "VALIDATED", "COMMITTING"].includes(status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full md:w-[50vw] max-w-[50vw] h-[70vh] max-h-[70vh] transform overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl transition-all flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div>
            <h3 className="text-lg font-black text-gray-900">Riwayat Import</h3>
            <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mt-0.5">
              Daftar proses import yang pernah dilakukan
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm font-medium">Memuat riwayat...</span>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 font-medium">Belum ada riwayat import.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-bold uppercase text-gray-500 border-b border-gray-200">
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
                    <tr key={batch.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Nama file */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 max-w-[200px] truncate" title={batch.original_filename}>
                          {decodeURIComponent(batch.original_filename || batch.code)}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{batch.code}</div>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <StatusBadge status={batch.status} />
                        {/* Tampilkan error message jika gagal */}
                        {(batch.status === "VALIDATION_FAILED" || batch.status === "COMMIT_FAILED") && batch.error_message && (
                          <p className="text-[10px] text-red-500 mt-1 max-w-[180px] line-clamp-2" title={batch.error_message}>
                            {batch.error_message}
                          </p>
                        )}
                      </td>

                      {/* Statistik baris */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs font-bold">
                          <span className="text-emerald-600">{batch.valid_rows || 0} valid</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-red-500">{batch.invalid_rows || 0} error</span>
                          {(batch.committed_rows ?? 0) > 0 && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="text-indigo-600">{batch.committed_rows} saved</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Waktu upload */}
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        <div>{formatDate(batch.uploaded_at)}</div>
                        {batch.uploaded_by && (
                          <div className="text-[10px] text-gray-400 mt-0.5">oleh {batch.uploaded_by.name}</div>
                        )}
                      </td>

                      {/* Waktu selesai (commit atau validasi) */}
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {batch.committed_at ? (
                          <div>
                            <div>{formatDate(batch.committed_at)}</div>
                            {batch.committed_by && (
                              <div className="text-[10px] text-gray-400 mt-0.5">oleh {batch.committed_by.name}</div>
                            )}
                          </div>
                        ) : batch.validated_at ? (
                          <div>
                            <div>{formatDate(batch.validated_at)}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">selesai validasi</div>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Tombol aksi */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => onResume(batch)}
                          className={`text-sm font-bold transition-colors px-3 py-1.5 rounded-lg border ${
                            isResumable(batch.status)
                              ? "text-[#C92C1E] hover:text-red-800 bg-red-50 border-red-100 hover:bg-red-100"
                              : "text-gray-600 hover:text-gray-900 bg-gray-50 border-gray-200 hover:bg-gray-100"
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
  );
}
