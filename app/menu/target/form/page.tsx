"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageTitle } from '@/app/lib/hooks/usePageTitle';
import { authFetchJson } from '@/app/lib/api';

export type TargetFormMode = "TARGET_BULK" | "KPI_DEFINITION" | "RECOMPUTE";

export interface TargetFormState {
  mode: TargetFormMode;
  periodYear: number;
  periodMonth: number;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-black text-slate-900">
          {mode === "TARGET_BULK"
            ? "Bulk Target Sales"
            : mode === "KPI_DEFINITION"
            ? "KPI Definition"
            : "Recompute KPI"}
        </h3>
        {formError ? (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
            {formError}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500">Tahun Periode</label>
            <input
              type="number"
              value={form.periodYear}
              onChange={(e) => setForm((prev) => ({ ...prev, periodYear: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">Bulan Periode (1-12)</label>
            <input
              type="number"
              min={1}
              max={12}
              value={form.periodMonth}
              onChange={(e) => setForm((prev) => ({ ...prev, periodMonth: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold"
            />
          </div>

          {mode === "TARGET_BULK" || mode === "KPI_DEFINITION" ? (
            <div>
              <label className="text-xs font-bold text-slate-500">Metric Code</label>
              <input
                type="text"
                value={form.metricCode}
                onChange={(e) => setForm((prev) => ({ ...prev, metricCode: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold"
              />
            </div>
          ) : null}

          {mode === "TARGET_BULK" ? (
            <div>
              <label className="text-xs font-bold text-slate-500">Target Value</label>
              <input
                type="text"
                value={form.targetValue}
                onChange={(e) => setForm((prev) => ({ ...prev, targetValue: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold"
              />
            </div>
          ) : null}

          {mode === "KPI_DEFINITION" ? (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500">Weight (%)</label>
                <input
                  type="text"
                  value={form.weight}
                  onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Threshold Achieved</label>
                <input
                  type="text"
                  value={form.thresholdAchieved}
                  onChange={(e) => setForm((prev) => ({ ...prev, thresholdAchieved: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Threshold Near</label>
                <input
                  type="text"
                  value={form.thresholdNear}
                  onChange={(e) => setForm((prev) => ({ ...prev, thresholdNear: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs font-bold"
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="rounded-xl bg-[#C92C1E] px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Memproses..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_PERIOD = {
  periodYear: new Date().getFullYear(),
  periodMonth: new Date().getMonth() + 1,
};

const EMPTY_FORM: TargetFormState = {
  mode: "TARGET_BULK",
  periodYear: DEFAULT_PERIOD.periodYear,
  periodMonth: DEFAULT_PERIOD.periodMonth,
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

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authFetchJson<T>(path, options);
}

function unwrapList<T>(response: { data?: T[] | { items?: T[] } }) {
  if (Array.isArray(response.data)) return response.data;
  return response.data?.items || [];
}

async function getKpiRanking(periodYear: number, periodMonth: number) {
  const response = await apiFetch<{
    data?: KpiRankingItem[] | { items?: KpiRankingItem[] };
  }>(`/kpi/ranking?period_year=${periodYear}&period_month=${periodMonth}`);

  return unwrapList(response);
}

async function getKpiResults(periodYear: number, periodMonth: number) {
  const response = await apiFetch<{
    data?: KpiRankingItem[] | { items?: KpiRankingItem[] };
  }>(`/kpi/results?period_year=${periodYear}&period_month=${periodMonth}`);

  return unwrapList(response);
}

async function getSalesTargets(periodYear: number, periodMonth: number) {
  const response = await apiFetch<{
    data?: SalesTargetItem[] | { items?: SalesTargetItem[] };
  }>(`/sales-targets?period_year=${periodYear}&period_month=${periodMonth}`);

  return unwrapList(response);
}

async function getKpiDefinitions(periodYear: number, periodMonth: number) {
  const response = await apiFetch<{
    data?: KpiDefinitionItem[] | { items?: KpiDefinitionItem[] };
  }>(`/kpi-definitions?period_year=${periodYear}&period_month=${periodMonth}`);

  return unwrapList(response);
}

async function getKpiJob(jobId: number) {
  const response = await apiFetch<{ data?: KpiJobItem }>(`/kpi/jobs/${jobId}`);
  return response.data;
}

async function bulkSetTarget(payload: {
  periodYear: number;
  periodMonth: number;
  metricCode: string;
  targetValue: string;
}) {
  return apiFetch<{
    data?: {
      eligible_sales?: number;
      created?: number;
      skipped?: number;
    };
  }>("/sales-targets/bulk", {
    method: "POST",
    body: JSON.stringify({
      period_year: payload.periodYear,
      period_month: payload.periodMonth,
      metric_code: payload.metricCode,
      target_value: payload.targetValue,
    }),
  });
}

async function createKpiDefinition(payload: {
  periodYear: number;
  periodMonth: number;
  metricCode: string;
  weight: string;
  thresholdAchieved: string;
  thresholdNear: string;
}) {
  return apiFetch<{ data?: KpiDefinitionItem }>("/kpi-definitions", {
    method: "POST",
    body: JSON.stringify({
      period_year: payload.periodYear,
      period_month: payload.periodMonth,
      metric_code: payload.metricCode,
      weight: payload.weight,
      threshold_achieved: payload.thresholdAchieved,
      threshold_near: payload.thresholdNear,
    }),
  });
}

async function deactivateKpiDefinition(id: number) {
  return apiFetch<{ data?: KpiDefinitionItem }>(`/kpi-definitions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      is_active: false,
    }),
  });
}

async function triggerRecompute(payload: {
  periodYear: number;
  periodMonth: number;
}) {
  return apiFetch<{ data?: KpiJobItem }>("/kpi/recompute", {
    method: "POST",
    body: JSON.stringify({
      period_year: payload.periodYear,
      period_month: payload.periodMonth,
    }),
  });
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

  const [periodYear, setPeriodYear] = useState(DEFAULT_PERIOD.periodYear);
  const [periodMonth, setPeriodMonth] = useState(DEFAULT_PERIOD.periodMonth);

  const [ranking, setRanking] = useState<KpiRankingItem[]>([]);
  const [targets, setTargets] = useState<SalesTargetItem[]>([]);
  const [definitions, setDefinitions] = useState<KpiDefinitionItem[]>([]);
  const [lastJob, setLastJob] = useState<KpiJobItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [formMode, setFormMode] = useState<TargetFormMode>("TARGET_BULK");
  const [form, setForm] = useState<TargetFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [selectedRanking, setSelectedRanking] =
    useState<KpiRankingItem | null>(null);

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

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setPageError("");

    try {
      const [rankingResult, targetResult, definitionResult] =
        await Promise.allSettled([
          getKpiRanking(periodYear, periodMonth),
          getSalesTargets(periodYear, periodMonth),
          getKpiDefinitions(periodYear, periodMonth),
        ]);

      if (rankingResult.status === "fulfilled") {
        setRanking(rankingResult.value);
      } else {
        const fallbackResults = await getKpiResults(periodYear, periodMonth);
        setRanking(fallbackResults);
      }

      setTargets(
        targetResult.status === "fulfilled" ? targetResult.value : [],
      );

      setDefinitions(
        definitionResult.status === "fulfilled" ? definitionResult.value : [],
      );
    } catch (error) {
      setPageError(getErrorMessage(error));
      setRanking([]);
      setTargets([]);
      setDefinitions([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [periodMonth, periodYear]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void loadData();
    }, 0);

    const interval = window.setInterval(() => {
      void loadData(false);
    }, 10000);

    const handleFocus = () => {
      void loadData(false);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadData]);

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

    if (formMode === "TARGET_BULK") {
      if (!form.metricCode.trim()) {
        setFormError("Metric code wajib diisi.");
        return;
      }

      if (!form.targetValue.trim()) {
        setFormError("Target value wajib diisi.");
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
        const response = await bulkSetTarget({
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

      if (formMode === "KPI_DEFINITION") {
        await createKpiDefinition({
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
        const response = await triggerRecompute({
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

      await loadData(false);
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
      await deactivateKpiDefinition(item.id);
      setPageSuccess("KPI definition berhasil dinonaktifkan.");
      await loadData(false);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  };

  const handleCheckJob = async () => {
    if (!lastJob?.id) return;

    setPageError("");
    setPageSuccess("");

    try {
      const job = await getKpiJob(lastJob.id);
      setLastJob(job || null);
      setPageSuccess(`Status job terbaru: ${job?.status || "-"}`);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
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
              <span className="text-[#C92C1E]">Target</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Target
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitoring target Sales, KPI, recompute worker, dan ranking
              performa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openModal("TARGET_BULK")}
              className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-black text-orange-700 transition hover:bg-orange-100"
            >
              + Bulk Target
            </button>

            <button
              type="button"
              onClick={() => openModal("KPI_DEFINITION")}
              className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-[#C92C1E] transition hover:bg-red-100"
            >
              + KPI Definition
            </button>

            <button
              type="button"
              onClick={() => openModal("RECOMPUTE")}
              className="rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700"
            >
              Recompute KPI
            </button>
          </div>
        </div>
      </div>

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">
            Total Ranking
          </p>
          <h2 className="text-3xl font-black">{ranking.length}</h2>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Achieved
          </p>
          <h2 className="text-3xl font-black text-gray-900">
            {achievedCount}
          </h2>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Near Achieved
          </p>
          <h2 className="text-3xl font-black text-gray-900">{nearCount}</h2>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Not Achieved
          </p>
          <h2 className="text-3xl font-black text-gray-900">
            {notAchievedCount}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Periode Aktif
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input
              type="number"
              value={periodYear}
              onChange={(event) => setPeriodYear(Number(event.target.value))}
              className="rounded-xl border border-gray-200 bg-[#FAFAFA] px-3 py-2 text-sm font-black text-gray-900 outline-none focus:border-[#C92C1E]"
            />
            <input
              type="number"
              min={1}
              max={12}
              value={periodMonth}
              onChange={(event) => setPeriodMonth(Number(event.target.value))}
              className="rounded-xl border border-gray-200 bg-[#FAFAFA] px-3 py-2 text-sm font-black text-gray-900 outline-none focus:border-[#C92C1E]"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Active Weight
          </p>
          <h2
            className={`mt-2 text-3xl font-black ${
              totalWeight === 100 ? "text-emerald-700" : "text-[#C92C1E]"
            }`}
          >
            {totalWeight.toFixed(2)}%
          </h2>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Total weight aktif harus 100% sebelum recompute sukses.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Last Job
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
              <button
                type="button"
                onClick={handleCheckJob}
                className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-200"
              >
                Cek Job
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm font-bold text-gray-400">
              Belum ada job recompute.
            </p>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-4">
          <div>
            <p className="text-sm font-black text-gray-900">
              Ranking KPI Sales
            </p>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Klik baris untuk melihat detail score dan klasifikasi.
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
                    Belum ada data ranking KPI.
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

                    <td className="px-4 py-4">
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
          <div className="border-b border-gray-100 bg-gray-50/50 p-4">
            <p className="text-sm font-black text-gray-900">
              Sales Target
            </p>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Target bulanan per metric.
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
                      Belum ada target.
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
                      <td className="px-4 py-4">{item.metric_code || "-"}</td>
                      <td className="px-4 py-4">{item.target_value || "-"}</td>
                      <td className="px-4 py-4">
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
              KPI Definition
            </p>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Weight dan threshold per metric.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm text-gray-600">
              <thead className="border-b border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-4">Metric</th>
                  <th className="px-4 py-4">Weight</th>
                  <th className="px-4 py-4">Threshold</th>
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
                      <td className="px-4 py-4">{item.weight || "0.00"}%</td>
                      <td className="px-4 py-4">
                        {item.threshold_achieved || "100.00"} /{" "}
                        {item.threshold_near || "80.00"}
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
              className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#fff_0%,#fff8f5_55%,#fee2e2_100%)] px-5 py-4 md:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                      Detail Ranking
                    </p>
                    <h2 className="mt-2 text-lg font-black text-slate-950 md:text-xl">
                      {selectedRanking.sales_name ||
                        selectedRanking.name ||
                        "-"}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Detail KPI Sales untuk periode {periodMonth}/{periodYear}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedRanking(null)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 md:p-6">
                {[
                  ["Rank", `#${selectedRanking.rank_position || "-"}`],
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
    </div>
  );
}

