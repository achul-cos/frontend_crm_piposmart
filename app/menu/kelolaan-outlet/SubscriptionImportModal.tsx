"use client";

import { useState, useRef } from "react";
import { downloadOutletSubscriptionImportTemplateFile } from "@/app/lib/api";
import ScreenPortal from "@/app/components/ui/ScreenPortal";

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
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Format file tidak didukung. Harap unggah file XLSX atau CSV.");
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
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
    <ScreenPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 md:p-6">
        <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
          
          {/* Header - Premium gradient & layout */}
          <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-white px-8 py-6 border-b border-gray-100">
            <div className="absolute top-0 right-0 p-4">
               <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/50 text-gray-400 backdrop-blur-sm transition-all hover:bg-white hover:text-gray-700 hover:shadow-sm"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C92C1E] to-red-600 text-white shadow-lg shadow-red-200/50">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="pt-1">
                <h3 className="text-xl font-bold tracking-tight text-gray-900">Import Langganan</h3>
                <p className="mt-1 text-sm font-medium text-gray-500">Unggah file batch perpanjangan atau langganan baru</p>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 space-y-4 px-8 py-6">
            {/* Alerts */}
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/80 p-4 text-red-800 backdrop-blur-sm">
                <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-semibold">{error}</p>
              </div>
            )}
            {successMessage && (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-emerald-800 backdrop-blur-sm">
                <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-semibold">{successMessage}</p>
              </div>
            )}

            {/* Unduh Template Banner */}
            <div className="group flex items-center justify-between overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-white p-4 transition-all hover:border-blue-200 hover:shadow-md hover:shadow-blue-50">
              <div>
                <p className="text-sm font-bold text-gray-800">Belum memiliki template?</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500">Gunakan format standar untuk kelancaran import</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-600 shadow-sm ring-1 ring-blue-200/50 transition-all hover:bg-blue-50 hover:ring-blue-300 disabled:opacity-50"
              >
                {isDownloadingTemplate ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Mengunduh...
                  </span>
                ) : (
                  <>
                    <svg className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Unduh Template
                  </>
                )}
              </button>
            </div>

            {/* Upload Area */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-800">File Spreadsheet</label>
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                  isDragging 
                    ? "border-[#C92C1E] bg-red-50/50 shadow-inner" 
                    : file 
                      ? "border-emerald-300 bg-emerald-50/30 hover:border-emerald-400" 
                      : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm ring-4 ring-emerald-50">
                      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{file.name}</p>
                    <p className="mt-1 text-xs font-medium text-emerald-600">Siap untuk diimpor</p>
                    
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="absolute top-3 right-3 rounded-full p-2 text-gray-400 transition-colors hover:bg-white hover:text-red-500 hover:shadow-sm"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors duration-300 ${isDragging ? 'bg-red-100 text-[#C92C1E] scale-110' : 'bg-white text-gray-400 shadow-sm group-hover:scale-105 group-hover:text-[#C92C1E]'}`}>
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-gray-700">
                      <span className="text-[#C92C1E]">Pilih file</span> atau seret dan lepas ke sini
                    </p>
                    <p className="mt-1.5 text-xs font-medium text-gray-400">Format didukung: XLSX, CSV (Max 10MB)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUploading || !file}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-[#C92C1E] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-[#b02619] disabled:opacity-50 disabled:shadow-none"
              >
                {isUploading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    Mulai Import
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ScreenPortal>
  );
}
