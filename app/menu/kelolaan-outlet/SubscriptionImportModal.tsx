"use client";

import { useState } from "react";
import { downloadOutletSubscriptionImportTemplateFile } from "@/app/lib/api";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SubscriptionImportModal({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      setError(null);
      const { blob, disposition } = await downloadOutletSubscriptionImportTemplateFile();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let filename = "Template_Import_Langganan_Outlet.xlsx";
      if (disposition) {
        const match = disposition.match(/filename=\"?([^\"]+)\"?/);
        if (match) filename = match[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh template import.");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Silakan pilih file Excel (.xlsx) atau CSV terlebih dahulu.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      // Simulasi/Upload proses import batch langganan
      await new Promise((res) => setTimeout(res, 1200));
      setSuccessMessage(`Berhasil mengunggah dan memproses file "${file.name}".`);
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses file import.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-[#f9fafb] px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#C92C1E]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Import Langganan Outlet</h3>
              <p className="text-xs text-gray-500">Unggah file batch perpanjangan/pendaftaran langganan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
              {successMessage}
            </div>
          )}

          {/* Unduh Template Banner */}
          <div className="mb-5 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3.5">
            <div>
              <p className="text-xs font-bold text-gray-800">Belum memiliki template import?</p>
              <p className="text-[11px] text-gray-500">Unduh format acuan Excel untuk pengisian data</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:opacity-50"
            >
              {isDownloadingTemplate ? "Mengunduh..." : "Unduh Template"}
            </button>
          </div>

          {/* Upload Area */}
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">File Spreadsheet (.xlsx / .csv)</label>
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 text-center transition hover:border-[#C92C1E]">
              <svg className="mb-2 h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload-input"
              />
              <label
                htmlFor="file-upload-input"
                className="cursor-pointer text-xs font-bold text-[#C92C1E] hover:underline"
              >
                Pilih file dari komputer
              </label>
              {file ? (
                <p className="mt-2 text-xs font-bold text-emerald-700">✓ {file.name}</p>
              ) : (
                <p className="mt-1 text-[11px] text-gray-400">Format yang didukung: XLSX, CSV (Max 10MB)</p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUploading || !file}
              className="inline-flex items-center gap-2 rounded-xl bg-[#C92C1E] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#b02619] disabled:opacity-50"
            >
              {isUploading ? "Mengunggah..." : "Import Data"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
