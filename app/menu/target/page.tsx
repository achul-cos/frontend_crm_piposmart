"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { frontendEnv } from "@/app/lib/env";
import ImportHistoryModal from "@/app/components/ImportHistoryModal";
import type { Sprint14g1Section } from "@/app/components/analytics/Sprint14g1Board";
import AnalyticsTabSkeleton from "@/app/components/skeleton/AnalyticsTabSkeleton";
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";
import {
  uploadImportFile,
  getImportBatch,
  commitImportBatch,
  downloadImportErrors,
  ImportBatchResponse,
} from "@/app/lib/api";
import {
  getKpiJob,
  useBulkSetTargetMutation,
  useCheckKpiJobMutation,
  useCreateKpiDefinitionMutation,
  useDeactivateKpiDefinitionMutation,
  useKpiDefinitionsQuery,
  useKpiRankingQuery,
  useSalesTargetsQuery,
  useTriggerRecomputeMutation,
  useOverrideTargetMutation,
} from "@/app/lib/queries/target";

const Sprint14g1Board = dynamic(
  () => import("@/app/components/analytics/Sprint14g1Board"),
  {
    ssr: false,
    loading: () => <AnalyticsTabSkeleton sections={2} />,
  },
);

export type TargetFormMode =
  | "TARGET_BULK"
  | "TARGET_OVERRIDE"
  | "KPI_DEFINITION"
  | "RECOMPUTE";

export interface TargetFormState {
  mode: TargetFormMode;
  periodYear: number;
  periodMonth: number;
  salesId: string;
  metricCode: string;
  targetValue: string;
  weight: string;
  thresholdAchieved: string;
  thresholdNear: string;
}

export interface KpiDefinitionItem {
  id: number;
  metric_code?: string;
  weight?: string;
  threshold_achieved?: string;
  threshold_near?: string;
  is_active?: boolean;
}

export interface KpiJobItem {
  id?: number;
  status?: string;
  attempts?: number;
  max_attempts?: number;
  last_error?: string;
}

export interface KpiRankingItem {
  id?: number;
  sales_id?: number;
  sales_name?: string;
  sales_code?: string;
  name?: string;
  rank_position?: number;
  total_score?: string;
  classification?: string;
  period_year?: number;
  period_month?: number;
}

export interface SalesTargetItem {
  id?: number;
  sales_id?: number;
  sales_name?: string;
  metric_code?: string;
  target_value?: string;
  period_month?: number;
  period_year?: number;
}

const analyticsSections: Sprint14g1Section[] = [
  {
    id: "target-performance",
    title: "Progress Target Sales",
    description:
      "Membandingkan target dan realisasi penjualan agar supervisor cepat melihat gap per sales dan progres target periode berjalan.",
    diagrams: [
      { module: "targets", key: "target-vs-actual" },
      { module: "targets", key: "target-burnup" },
    ],
  },
  {
    id: "kpi-performance",
    title: "KPI dan Efektivitas Aktivitas",
    description:
      "Melihat ranking KPI dan hubungan aktivitas dengan hasil closing agar coaching lebih tepat sasaran.",
    diagrams: [
      { module: "kpi", key: "leaderboard" },
      { module: "kpi", key: "activity-vs-closing-scatter" },
    ],
  },
];

function TargetFormModal({
  open,
  mode,
  form,
  formError,
  saving,
  setForm,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: TargetFormMode;
  form: TargetFormState;
  formError: string;
  saving: boolean;
  setForm: React.Dispatch<React.SetStateAction<TargetFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div
        className="app-modal-panel flex w-full max-w-3xl rounded-[32px] shadow-2xl transition-all xl:max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="app-modal-header px-5 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                Target & KPI
              </p>
              <h2 className="mt-1.5 text-lg font-black text-slate-950 md:text-xl">
                {mode === "TARGET_BULK"
                  ? "Bulk Target Sales"
                  : mode === "TARGET_OVERRIDE"
                  ? "Override Target Per Sales"
                  : mode === "KPI_DEFINITION"
                  ? "KPI Definition"
                  : "Recompute KPI Worker"}
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {mode === "TARGET_BULK"
                  ? "Set target sekaligus untuk semua akun sales aktif."
                  : mode === "TARGET_OVERRIDE"
                  ? "Ubah target spesifik untuk satu akun sales tertentu."
                  : mode === "KPI_DEFINITION"
                  ? "Konfigurasi bobot dan threshold nilai pencapaian KPI."
                  : "Jalankan worker untuk menghitung ulang skor KPI periode berjalan."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="app-modal-close rounded-2xl px-4 py-2 text-xs font-black transition"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="app-modal-body flex-1 space-y-4 p-5 md:p-6">
          {formError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-600">
              {formError}
            </div>
          ) : null}

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Tahun Periode</label>
            <input
              type="number"
              value={form.periodYear}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, periodYear: Number(e.target.value) }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
            />
          </div>

          {mode === "TARGET_BULK" || mode === "TARGET_OVERRIDE" ? (
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Bulan Periode</label>
              <input
                type="number"
                value={form.periodMonth}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, periodMonth: Number(e.target.value) }))
                }
                placeholder="1-12"
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
              />
            </div>
          ) : null}

          {mode === "TARGET_OVERRIDE" ? (
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Sales ID</label>
              <input
                type="number"
                value={form.salesId}
                onChange={(e) => setForm((prev) => ({ ...prev, salesId: e.target.value }))}
                placeholder="Contoh ID: 12"
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
              />
            </div>
          ) : null}

          {mode === "TARGET_BULK" || mode === "TARGET_OVERRIDE" || mode === "KPI_DEFINITION" ? (
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Metric Code</label>
              <input
                type="text"
                value={form.metricCode}
                onChange={(e) => setForm((prev) => ({ ...prev, metricCode: e.target.value }))}
                placeholder="CONFIRMED_CLOSING_COUNT"
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
              />
            </div>
          ) : null}

          {mode === "TARGET_BULK" || mode === "TARGET_OVERRIDE" ? (
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Target Value</label>
              <input
                type="text"
                value={form.targetValue}
                onChange={(e) => setForm((prev) => ({ ...prev, targetValue: e.target.value }))}
                placeholder="5"
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
              />
            </div>
          ) : null}

          {mode === "KPI_DEFINITION" ? (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Weight (%)</label>
                <input
                  type="text"
                  value={form.weight}
                  onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                  placeholder="100.00"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Threshold Achieved (%)</label>
                <input
                  type="text"
                  value={form.thresholdAchieved}
                  onChange={(e) => setForm((prev) => ({ ...prev, thresholdAchieved: e.target.value }))}
                  placeholder="100.00"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Threshold Near (%)</label>
                <input
                  type="text"
                  value={form.thresholdNear}
                  onChange={(e) => setForm((prev) => ({ ...prev, thresholdNear: e.target.value }))}
                  placeholder="80.00"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="app-modal-footer flex flex-shrink-0 justify-end gap-3 px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="rounded-2xl bg-[#C92C1E] px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Memproses..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SalesTargetImportModal({
  open,
  onClose,
  onOpenHistory,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onOpenHistory: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState("TARGET");
  const [targetSalesUserId, setTargetSalesUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [batch, setBatch] = useState<ImportBatchResponse | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setSheetName("TARGET");
      setTargetSalesUserId("");
      setError("");
      setBatch(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (batch && ["UPLOADED", "VALIDATING", "COMMITTING"].includes(batch.status)) {
      timer = setTimeout(async () => {
        try {
          const updated = await getImportBatch(batch.id);
          setBatch(updated);
          if (updated.status === "COMMITTED") {
            onSuccess();
          }
        } catch (e) {
          console.error("Polling import status error", e);
        }
      }, 1500);
    }
    return () => clearTimeout(timer);
  }, [batch, onSuccess]);

  if (!open) return null;

  const handleUpload = async () => {
    if (!file) {
      setError("Pilih file Excel (.xlsx) terlebih dahulu.");
      return;
    }
    if (!sheetName.trim()) {
      setError("Nama sheet wajib diisi untuk profil SALES_TARGET (contoh: TARGET).");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const salesIdNum = targetSalesUserId.trim() ? Number(targetSalesUserId) : undefined;
      const res = await uploadImportFile(file, "SALES_TARGET", sheetName.trim(), salesIdNum);
      setBatch(res);
    } catch (e: any) {
      setError(e.message || "Gagal mengunggah file import.");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!batch) return;
    setError("");
    setLoading(true);
    try {
      const res = await commitImportBatch(batch.id);
      setBatch(res);
    } catch (e: any) {
      setError(e.message || "Gagal commit batch import.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadErrors = async () => {
    if (!batch) return;
    try {
      await downloadImportErrors(batch.id);
    } catch (e: any) {
      setError(e.message || "Gagal mendownload laporan error.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div
        className="app-modal-panel flex w-full max-w-3xl rounded-[32px] shadow-2xl transition-all xl:max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="app-modal-header px-5 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                Import Excel (Sprint 15)
              </p>
              <h2 className="mt-1.5 text-lg font-black text-slate-950 md:text-xl">
                Import Target Sales
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Profil <span className="font-bold text-slate-700">SALES_TARGET</span> — Unggah file PBGC / Excel Target Sales
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="app-modal-close rounded-2xl px-4 py-2 text-xs font-black transition"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="app-modal-body flex-1 space-y-4 p-5 md:p-6">
            {error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-600">
                {error}
              </div>
            ) : null}

            {!batch ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">File Excel (.xlsx)</label>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Nama Sheet Excel (Wajib per profil SALES_TARGET)
                  </label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Contoh: TARGET"
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Target Sales User ID (Opsional)
                  </label>
                  <input
                    type="number"
                    value={targetSalesUserId}
                    onChange={(e) => setTargetSalesUserId(e.target.value)}
                    placeholder="Contoh: 12"
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E]"
                  />
                  <p className="mt-1 text-[10px] font-bold text-slate-400">
                    Isi ID akun Sales jika file sheet tidak mencantumkan ID Sales per baris.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900">{batch.original_filename}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">Kode: {batch.code}</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black text-blue-700">
                      {batch.status}
                    </span>
                  </div>

                  {batch.progress_percentage !== undefined ? (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>{batch.progress_percentage}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-[#C92C1E] transition-all duration-300"
                          style={{ width: `${batch.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                    <div className="rounded-xl bg-white p-2.5 border border-slate-200">
                      <span className="block text-[10px] text-slate-400">Total</span>
                      <span className="text-slate-900 font-black">{batch.total_rows}</span>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-2.5 border border-emerald-200">
                      <span className="block text-[10px] text-emerald-600">Valid</span>
                      <span className="text-emerald-700 font-black">{batch.valid_rows}</span>
                    </div>
                    <div className="rounded-xl bg-red-50 p-2.5 border border-red-200">
                      <span className="block text-[10px] text-red-600">Invalid</span>
                      <span className="text-red-700 font-black">{batch.invalid_rows}</span>
                    </div>
                  </div>
                </div>

                {batch.invalid_rows > 0 ? (
                  <div className="flex items-center justify-between rounded-2xl bg-amber-50 p-3.5 border border-amber-200">
                    <span className="text-xs font-bold text-amber-800">
                      Terdapat {batch.invalid_rows} baris bermasalah.
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadErrors}
                      className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-amber-700 transition"
                    >
                      Unduh File Error
                    </button>
                  </div>
                ) : null}

                {batch.error_message ? (
                  <div className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-600">
                    {batch.error_message}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-4 md:px-6 flex justify-between items-center">
            <button
              type="button"
              onClick={onOpenHistory}
              className="text-xs font-black text-purple-600 hover:underline flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Lihat Riwayat Import</span>
            </button>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                {!batch ? "Batal" : "Tutup"}
              </button>

              {!batch ? (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={loading}
                  className="rounded-2xl bg-[#C92C1E] px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Mengunggah..." : "Unggah & Validasi"}
                </button>
              ) : batch.status === "VALIDATED" ? (
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={loading || batch.valid_rows === 0}
                  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "Commit Data Import"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
  );
}

const API_BASE_URL = frontendEnv.apiBaseUrl;

const DEFAULT_PERIOD = {
  periodYear: new Date().getFullYear(),
  periodMonth: new Date().getMonth() + 1,
};

const EMPTY_FORM: TargetFormState = {
  mode: "TARGET_BULK",
  periodYear: DEFAULT_PERIOD.periodYear,
  periodMonth: DEFAULT_PERIOD.periodMonth,
  salesId: "",
  metricCode: "CONFIRMED_CLOSING_COUNT",
  targetValue: "5",
  weight: "100.00",
  thresholdAchieved: "100.00",
  thresholdNear: "80.00",
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

function getClassificationLabel(classification?: string) {
  if (classification === "ACHIEVED") return "TERCAPAI";
  if (classification === "NEAR_ACHIEVED") return "HAMPIR TERCAPAI";
  if (classification === "NOT_ACHIEVED") return "BELUM TERCAPAI";
  return classification || "-";
}

function getClassificationClass(classification?: string) {
  if (classification === "ACHIEVED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (classification === "NEAR_ACHIEVED") {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-red-50 text-[#C92C1E]";
}

function getJobClass(status?: string) {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "bg-red-50 text-[#C92C1E]";
  if (status === "RUNNING") return "bg-blue-50 text-blue-700";
  return "bg-orange-50 text-orange-700";
}

export default function TargetPage() {
  usePageTitle("Target");

  const [activeSubMenu, setActiveSubMenu] = useState<"OPERATIONS" | "ANALYTICS">("OPERATIONS");
  const [periodYear, setPeriodYear] = useState(DEFAULT_PERIOD.periodYear);
  const [periodMonth, setPeriodMonth] = useState(DEFAULT_PERIOD.periodMonth);

  const rankingQuery = useKpiRankingQuery(periodYear, periodMonth);
  const targetsQuery = useSalesTargetsQuery(periodYear, periodMonth);
  const definitionsQuery = useKpiDefinitionsQuery(periodYear, periodMonth);

  const ranking = rankingQuery.data ?? [];
  const targets = targetsQuery.data ?? [];
  const definitions = definitionsQuery.data ?? [];
  const [lastJob, setLastJob] = useState<KpiJobItem | null>(null);
  const bulkSetTargetMutation = useBulkSetTargetMutation();
  const overrideTargetMutation = useOverrideTargetMutation();
  const createKpiDefinitionMutation = useCreateKpiDefinitionMutation();
  const deactivateDefinitionMutation = useDeactivateKpiDefinitionMutation();
  const triggerRecomputeMutation = useTriggerRecomputeMutation();
  const checkJobMutation = useCheckKpiJobMutation();

  const loading =
    (rankingQuery.isLoading && !ranking.length) ||
    (targetsQuery.isLoading && !targets.length) ||
    (definitionsQuery.isLoading && !definitions.length);
  const loadData = useCallback(async () => {
    await Promise.all([
      rankingQuery.refetch(),
      targetsQuery.refetch(),
      definitionsQuery.refetch(),
    ]);
  }, [rankingQuery, targetsQuery, definitionsQuery]);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [formMode, setFormMode] = useState<TargetFormMode>("TARGET_BULK");
  const [form, setForm] = useState<TargetFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportHistoryModalOpen, setIsImportHistoryModalOpen] = useState(false);

  const [selectedRanking, setSelectedRanking] = useState<KpiRankingItem | null>(null);

  const achievedCount = ranking.filter(
    (item) => item.classification === "ACHIEVED",
  ).length;

  const nearCount = ranking.filter(
    (item) => item.classification === "NEAR_ACHIEVED",
  ).length;

  const notAchievedCount = ranking.filter(
    (item) => item.classification === "NOT_ACHIEVED",
  ).length;

  const filteredRanking = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return ranking.filter((item) => {
      if (!keyword) return true;

      return [
        item.sales_name || "",
        item.sales_code || "",
        item.total_score || "",
        item.classification || "",
        item.rank_position || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [ranking, search]);

  const totalWeight = useMemo(() => {
    return definitions
      .filter((item) => item.is_active !== false)
      .reduce((total, item) => total + Number(item.weight || 0), 0);
  }, [definitions]);

  const openModal = (mode: TargetFormMode) => {
    setFormMode(mode);
    setForm({
      ...EMPTY_FORM,
      mode,
      periodYear,
      periodMonth,
    });
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError("");
    setSaving(false);
  };

  const handleSubmit = async () => {
    setFormError("");
    setPageError("");
    setPageSuccess("");

    if (!form.periodYear) {
      setFormError("Tahun periode wajib diisi.");
      return;
    }

    if (!form.periodMonth || form.periodMonth < 1 || form.periodMonth > 12) {
      setFormError("Bulan periode wajib diisi dari 1 sampai 12.");
      return;
    }

    if (formMode === "TARGET_BULK" || formMode === "TARGET_OVERRIDE") {
      if (!form.metricCode.trim()) {
        setFormError("Metric code wajib diisi.");
        return;
      }

      if (!form.targetValue.trim()) {
        setFormError("Target value wajib diisi.");
        return;
      }
    }

    if (formMode === "TARGET_OVERRIDE") {
      if (!form.salesId.trim() || Number.isNaN(Number(form.salesId))) {
        setFormError("Sales ID wajib diisi dengan angka valid.");
        return;
      }
    }

    if (formMode === "KPI_DEFINITION") {
      if (!form.metricCode.trim()) {
        setFormError("Metric code wajib diisi.");
        return;
      }

      if (!form.weight.trim()) {
        setFormError("Weight wajib diisi.");
        return;
      }
    }

    setSaving(true);

    try {
      if (formMode === "TARGET_BULK") {
        const response = await bulkSetTargetMutation.mutateAsync({
          periodYear: Number(form.periodYear),
          periodMonth: Number(form.periodMonth),
          metricCode: form.metricCode.trim(),
          targetValue: form.targetValue.trim(),
        });

        setPageSuccess(
          `Target bulk berhasil disimpan. Eligible sales: ${
            response.data?.eligible_sales ?? "-"
          }, created: ${response.data?.created ?? "-"}.`,
        );
      }

      if (formMode === "TARGET_OVERRIDE") {
        await overrideTargetMutation.mutateAsync({
          salesId: Number(form.salesId),
          payload: {
            periodYear: Number(form.periodYear),
            periodMonth: Number(form.periodMonth),
            metricCode: form.metricCode.trim(),
            targetValue: form.targetValue.trim(),
          },
        });

        setPageSuccess(`Target Sales ID #${form.salesId} berhasil di-override.`);
      }

      if (formMode === "KPI_DEFINITION") {
        await createKpiDefinitionMutation.mutateAsync({
          periodYear: Number(form.periodYear),
          periodMonth: Number(form.periodMonth),
          metricCode: form.metricCode.trim(),
          weight: form.weight.trim(),
          thresholdAchieved: form.thresholdAchieved.trim() || "100.00",
          thresholdNear: form.thresholdNear.trim() || "80.00",
        });

        setPageSuccess("KPI definition berhasil dibuat.");
      }

      if (formMode === "RECOMPUTE") {
        const response = await triggerRecomputeMutation.mutateAsync({
          periodYear: Number(form.periodYear),
          periodMonth: Number(form.periodMonth),
        });

        setLastJob(response.data || null);
        setPageSuccess(
          `Recompute KPI berhasil dikirim ke worker. Job ID: ${
            response.data?.id || "-"
          }.`,
        );
      }

      setPeriodYear(Number(form.periodYear));
      setPeriodMonth(Number(form.periodMonth));

      await loadData();
      closeModal();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateDefinition = async (item: KpiDefinitionItem) => {
    setPageError("");
    setPageSuccess("");

    try {
      await deactivateDefinitionMutation.mutateAsync(item.id);
      setPageSuccess("KPI definition berhasil dinonaktifkan.");
      await loadData();
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  };

  const handleCheckJob = async () => {
    if (!lastJob?.id) return;

    setPageError("");
    setPageSuccess("");

    try {
      const job = await checkJobMutation.mutateAsync(lastJob.id);
      setLastJob(job || null);
      setPageSuccess(`Status job terbaru: ${job?.status || "-"}`);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-[#C92C1E]">Target & KPI (Sprint 15)</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Sales Target, KPI, dan Ranking
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manajemen Target Bulanan, Override Per Sales, Import Target Excel (Sprint 15), KPI Worker Recompute, dan Leaderboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Import Target Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportHistoryModalOpen(true)}
              className="rounded-xl bg-purple-50 px-3.5 py-2 text-xs font-black text-purple-700 transition hover:bg-purple-100 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Riwayat Import</span>
            </button>

            <button
              type="button"
              onClick={() => openModal("TARGET_BULK")}
              className="rounded-xl bg-orange-50 px-3.5 py-2 text-xs font-black text-orange-700 transition hover:bg-orange-100"
            >
              + Bulk Target
            </button>

            <button
              type="button"
              onClick={() => openModal("TARGET_OVERRIDE")}
              className="rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100"
            >
              + Override Target
            </button>

            <button
              type="button"
              onClick={() => openModal("KPI_DEFINITION")}
              className="rounded-xl bg-red-50 px-3.5 py-2 text-xs font-black text-[#C92C1E] transition hover:bg-red-100"
            >
              + KPI Definition
            </button>

            <button
              type="button"
              onClick={() => openModal("RECOMPUTE")}
              className="rounded-xl bg-[#C92C1E] px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700"
            >
              ⚡ Recompute KPI
            </button>
          </div>
        </div>

        {/* Sub Menu Tabs */}
        <div className="flex flex-wrap gap-2 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={() => setActiveSubMenu("OPERATIONS")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
              activeSubMenu === "OPERATIONS"
                ? "bg-[#C92C1E] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>Kelola Target, KPI & Ranking</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubMenu("ANALYTICS")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
              activeSubMenu === "ANALYTICS"
                ? "bg-[#C92C1E] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span>Analitik & Progress Board</span>
          </button>
        </div>
      </div>

      {activeSubMenu === "ANALYTICS" ? (
        <Sprint14g1Board
          heroLabel="Analytics Target"
          title="Target, KPI, dan Efektivitas Sales"
          description="Analitik pada halaman target berfungsi sebagai control room supervisor untuk mengecek capaian target, ranking KPI, dan hubungan antara aktivitas follow-up dengan hasil closing."
          sections={analyticsSections}
        />
      ) : (
        <>
          {pageError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {pageError}
            </div>
          ) : null}

          {pageSuccess ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {pageSuccess}
            </div>
          ) : null}

          {/* Metric Cards Summary */}
          <QuickInfoCardGrid>
            <QuickInfoCard
              label="Total Ranking Sales"
              value={ranking.length}
              description="Jumlah sales yang masuk ranking periode aktif."
              tone="accent"
              silhouette="target"
            />
            <QuickInfoCard
              label="Achieved (>= 100%)"
              value={achievedCount}
              description="Target yang sudah tercapai atau terlampaui."
              tone="emerald"
            />
            <QuickInfoCard
              label="Near Achieved (>= 80%)"
              value={nearCount}
              description="Target yang hampir tercapai."
              tone="amber"
            />
            <QuickInfoCard
              label="Not Achieved (< 80%)"
              value={notAchievedCount}
              description="Target yang masih tertinggal jauh."
              tone="rose"
            />
          </QuickInfoCardGrid>

          <div className="hidden grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">
                Total Ranking Sales
              </p>
              <h2 className="text-3xl font-black">{ranking.length}</h2>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                Achieved (≥ 100%)
              </p>
              <h2 className="text-3xl font-black text-emerald-700">{achievedCount}</h2>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                Near Achieved (≥ 80%)
              </p>
              <h2 className="text-3xl font-black text-orange-600">{nearCount}</h2>
            </div>

            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                Not Achieved (&lt; 80%)
              </p>
              <h2 className="text-3xl font-black text-[#C92C1E]">{notAchievedCount}</h2>
            </div>
          </div>

          {/* Settings Bar */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                Periode Aktif Evaluasi
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Tahun</label>
                  <input
                    type="number"
                    value={periodYear}
                    onChange={(event) => setPeriodYear(Number(event.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-[#FAFAFA] px-3 py-2 text-sm font-black text-gray-900 outline-none focus:border-[#C92C1E]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Bulan (1-12)</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={periodMonth}
                    onChange={(event) => setPeriodMonth(Number(event.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-[#FAFAFA] px-3 py-2 text-sm font-black text-gray-900 outline-none focus:border-[#C92C1E]"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Weight Definisi
              </p>
              <h2
                className={`mt-2 text-3xl font-black ${
                  totalWeight === 100 ? "text-emerald-700" : "text-[#C92C1E]"
                }`}
              >
                {totalWeight.toFixed(2)}%
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-400">
                Total weight aktif wajib 100% agar worker recompute berhasil.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                Worker Job Terakhir
              </p>
              {lastJob ? (
                <div className="mt-2 space-y-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black ${getJobClass(
                      lastJob.status,
                    )}`}
                  >
                    {lastJob.status || "-"}
                  </span>
                  <p className="text-xs font-bold text-gray-500">
                    Job ID #{lastJob.id} • Attempts {lastJob.attempts || 0}/
                    {lastJob.max_attempts || "-"}
                  </p>
                  {lastJob.last_error ? (
                    <p className="text-[11px] font-bold text-red-600 truncate">{lastJob.last_error}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleCheckJob}
                    className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-200"
                  >
                    Cek Status Job
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm font-bold text-gray-400">
                  Belum ada job recompute.
                </p>
              )}
            </div>
          </div>

          {/* Ranking & Leaderboard Table */}
          <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-4">
              <div>
                <p className="text-sm font-black text-gray-900">
                  Ranking & Leaderboard KPI Sales
                </p>
                <p className="mt-1 text-xs font-medium text-gray-400">
                  Ranking dihitung otomatis lewat window function RANK() per periode.
                </p>
              </div>

              <input
                value={search || ""}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama sales, kode, score, atau klasifikasi"
                className="min-w-[280px] rounded-lg border border-gray-200 bg-[#FAFAFA] px-3 py-2 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm text-gray-600">
                <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-4 font-bold">Rank</th>
                    <th className="px-4 py-4 font-bold">Sales</th>
                    <th className="px-4 py-4 font-bold">Total Score</th>
                    <th className="px-4 py-4 font-bold">Classification</th>
                    <th className="px-4 py-4 font-bold">Periode</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-14 text-center text-gray-500"
                      >
                        Memuat ranking KPI...
                      </td>
                    </tr>
                  ) : filteredRanking.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-14 text-center text-gray-500"
                      >
                        Belum ada data ranking KPI untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredRanking.map((item, index) => (
                      <tr
                        key={`${item.sales_id || index}-${
                          item.rank_position || index
                        }`}
                        onClick={() => setSelectedRanking(item)}
                        className="cursor-pointer transition-colors hover:bg-red-50/40"
                      >
                        <td className="px-4 py-4">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-sm font-black text-[#C92C1E]">
                            #{item.rank_position || index + 1}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-black text-gray-900">
                            {item.sales_name || item.name || "-"}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {item.sales_code || `Sales ID #${item.sales_id || "-"}`}
                          </p>
                        </td>

                        <td className="px-4 py-4 font-black text-gray-900">
                          {item.total_score || "0.00"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black ${getClassificationClass(
                              item.classification,
                            )}`}
                          >
                            {getClassificationLabel(item.classification)}
                          </span>
                        </td>

                        <td className="px-4 py-4 font-bold">
                          {item.period_month || periodMonth}/
                          {item.period_year || periodYear}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tables Grid: Sales Target & KPI Definitions */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
              <div className="border-b border-gray-100 bg-gray-50/50 p-4">
                <p className="text-sm font-black text-gray-900">
                  Target Bulanan Sales (`/sales-targets`)
                </p>
                <p className="mt-1 text-xs font-medium text-gray-400">
                  Target per Sales ID dan Metric.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm text-gray-600">
                  <thead className="border-b border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-4 py-4">Sales</th>
                      <th className="px-4 py-4">Metric</th>
                      <th className="px-4 py-4">Target</th>
                      <th className="px-4 py-4">Periode</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {targets.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-10 text-center text-gray-400"
                        >
                          Belum ada target di-set.
                        </td>
                      </tr>
                    ) : (
                      targets.slice(0, 8).map((item, index) => (
                        <tr
                          key={`${item.sales_id || index}-${
                            item.metric_code || index
                          }`}
                        >
                          <td className="px-4 py-4 font-black text-gray-900">
                            {item.sales_name || item.sales_id || "-"}
                          </td>
                          <td className="px-4 py-4 font-bold">{item.metric_code || "-"}</td>
                          <td className="px-4 py-4 font-bold text-gray-900">{item.target_value || "-"}</td>
                          <td className="px-4 py-4 font-bold">
                            {item.period_month || periodMonth}/
                            {item.period_year || periodYear}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
              <div className="border-b border-gray-100 bg-gray-50/50 p-4">
                <p className="text-sm font-black text-gray-900">
                  KPI Definitions (`/kpi-definitions`)
                </p>
                <p className="mt-1 text-xs font-medium text-gray-400">
                  Weight dan threshold evaluasi per metric.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm text-gray-600">
                  <thead className="border-b border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-4 py-4">Metric</th>
                      <th className="px-4 py-4">Weight</th>
                      <th className="px-4 py-4">Threshold Achieved / Near</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {definitions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-gray-400"
                        >
                          Belum ada KPI definition.
                        </td>
                      </tr>
                    ) : (
                      definitions.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4 font-black text-gray-900">
                            {item.metric_code || "-"}
                          </td>
                          <td className="px-4 py-4 font-bold">{item.weight || "0.00"}%</td>
                          <td className="px-4 py-4 font-bold">
                            {item.threshold_achieved || "100.00"}% /{" "}
                            {item.threshold_near || "80.00"}%
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-black ${
                                item.is_active === false
                                  ? "bg-gray-100 text-gray-500"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {item.is_active === false ? "NON AKTIF" : "AKTIF"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {item.is_active === false ? (
                              <span className="text-xs font-bold text-gray-300">
                                -
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeactivateDefinition(item)
                                }
                                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-200"
                              >
                                Nonaktifkan
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <TargetFormModal
            open={showModal}
            mode={formMode}
            form={form}
            formError={formError}
            saving={saving}
            setForm={setForm}
            onClose={closeModal}
            onSubmit={handleSubmit}
          />

          {selectedRanking ? (
            <div
              className="fixed inset-0 z-50 bg-slate-950/70"
              onClick={() => setSelectedRanking(null)}
            >
              <div className="flex min-h-full items-center justify-center p-4 md:p-6">
                <div
                  className="app-modal-panel w-full max-w-2xl rounded-[32px] shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="app-modal-header px-5 py-4 md:px-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                          Detail Ranking Sales
                        </p>
                        <h2 className="mt-2 text-lg font-black text-slate-950 md:text-xl">
                          {selectedRanking.sales_name ||
                            selectedRanking.name ||
                            "-"}
                        </h2>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          Detail evaluasi KPI Sales periode {periodMonth}/{periodYear}.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedRanking(null)}
                        className="app-modal-close rounded-2xl px-4 py-2 text-xs font-black transition"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>

                  <div className="app-modal-body grid grid-cols-1 gap-3 p-5 md:grid-cols-2 md:p-6">
                    {[
                      ["Rank Position", `#${selectedRanking.rank_position || "-"}`],
                      ["Sales Code", selectedRanking.sales_code || "-"],
                      ["Total Score", selectedRanking.total_score || "0.00"],
                      [
                        "Classification",
                        getClassificationLabel(selectedRanking.classification),
                      ],
                      [
                        "Periode",
                        `${selectedRanking.period_month || periodMonth}/${
                          selectedRanking.period_year || periodYear
                        }`,
                      ],
                      ["Sales ID", selectedRanking.sales_id || "-"],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                      >
                        <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                          {label}
                        </p>
                        <p className="mt-1 text-sm font-black text-gray-900">
                          {String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      <SalesTargetImportModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onOpenHistory={() => {
          setIsImportModalOpen(false);
          setIsImportHistoryModalOpen(true);
        }}
        onSuccess={() => {
          void loadData();
        }}
      />

      <ImportHistoryModal
        isOpen={isImportHistoryModalOpen}
        onClose={() => setIsImportHistoryModalOpen(false)}
        profile="SALES_TARGET"
        onResume={() => {
          setIsImportHistoryModalOpen(false);
          setIsImportModalOpen(true);
        }}
      />
    </div>
  );
}


