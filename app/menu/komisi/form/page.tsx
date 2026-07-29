"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";

export type KomisiFormMode = "TARGET_BULK" | "KPI_DEFINITION" | "RECOMPUTE";

export type KomisiFormState = {
  mode: KomisiFormMode;
  periodYear: number;
  periodMonth: number;
  metricCode: string;
  targetValue: string;
  weight: string;
  thresholdAchieved: string;
  thresholdNear: string;
};

export type KpiRankingItem = {
  id?: number;
  sales_id?: number;
  sales_code?: string;
  sales_name?: string;
  name?: string;
  total_score?: string;
  classification?: "ACHIEVED" | "NEAR_ACHIEVED" | "NOT_ACHIEVED" | string;
  rank_position?: number;
  period_year?: number;
  period_month?: number;
};

export type SalesTargetItem = {
  id?: number;
  sales_id?: number;
  sales_name?: string;
  metric_code?: string;
  target_value?: string;
  period_year?: number;
  period_month?: number;
};

export type KpiDefinitionItem = {
  id: number;
  metric_code?: string;
  period_year?: number;
  period_month?: number;
  weight?: string;
  threshold_achieved?: string;
  threshold_near?: string;
  is_active?: boolean;
};

export type KpiJobItem = {
  id: number;
  status?: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | string;
  attempts?: number;
  max_attempts?: number;
  last_error?: string;
};

const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100";

const selectClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100";

function getTitle(mode: KomisiFormMode) {
  if (mode === "TARGET_BULK") return "Bulk Set Target Sales";
  if (mode === "KPI_DEFINITION") return "Tambah KPI Definition";
  return "Recompute KPI";
}

function getDescription(mode: KomisiFormMode) {
  if (mode === "TARGET_BULK") {
    return "Set target bulanan untuk seluruh Sales aktif. Bulk-set tidak menimpa target yang sudah ada.";
  }

  if (mode === "KPI_DEFINITION") {
    return "Buat definisi KPI berdasarkan metric, weight, dan threshold. Total weight aktif per periode harus 100%.";
  }

  return "Trigger recompute KPI melalui worker job queue untuk periode yang dipilih.";
}

export default function KomisiFormModal({
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
  mode: KomisiFormMode;
  form: KomisiFormState;
  formError: string;
  saving: boolean;
  setForm: Dispatch<SetStateAction<KomisiFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center overflow-y-auto p-4 md:p-6">
        <div
          className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#fff_0%,#fff8f5_55%,#fee2e2_100%)] px-5 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                  Komisi
                </p>

                <h2 className="mt-2 text-lg font-black text-slate-950 md:text-xl">
                  {getTitle(mode)}
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  {getDescription(mode)}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="space-y-5 p-5 md:p-6"
          >
            {formError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {formError}
              </div>
            ) : null}

            <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Periode
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Tahun
                  </span>
                  <input
                    type="number"
                    value={form.periodYear || ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        periodYear: Number(event.target.value),
                      }))
                    }
                    className={inputClass}
                    placeholder="2026"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Bulan
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={form.periodMonth || ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        periodMonth: Number(event.target.value),
                      }))
                    }
                    className={inputClass}
                    placeholder="7"
                  />
                </label>
              </div>
            </div>

            {mode !== "RECOMPUTE" ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                  Metric
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                      Metric Code
                    </span>
                    <select
                      value={form.metricCode || "CONFIRMED_CLOSING_COUNT"}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          metricCode: event.target.value,
                        }))
                      }
                      className={selectClass}
                    >
                      <option value="CONFIRMED_CLOSING_COUNT">
                        CONFIRMED_CLOSING_COUNT
                      </option>
                      <option value="CALL_COUNT">CALL_COUNT</option>
                      <option value="CHAT_COUNT">CHAT_COUNT</option>
                      <option value="TRAINING_COUNT">TRAINING_COUNT</option>
                    </select>
                  </label>

                  {mode === "TARGET_BULK" ? (
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                        Target Value
                      </span>
                      <input
                        value={form.targetValue || ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            targetValue: event.target.value,
                          }))
                        }
                        className={inputClass}
                        placeholder="Contoh: 5"
                      />
                    </label>
                  ) : null}

                  {mode === "KPI_DEFINITION" ? (
                    <>
                      <label className="space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                          Weight
                        </span>
                        <input
                          value={form.weight || ""}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              weight: event.target.value,
                            }))
                          }
                          className={inputClass}
                          placeholder="100.00"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                          Threshold Achieved
                        </span>
                        <input
                          value={form.thresholdAchieved || ""}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              thresholdAchieved: event.target.value,
                            }))
                          }
                          className={inputClass}
                          placeholder="100.00"
                        />
                      </label>

                      <label className="space-y-2 md:col-span-2">
                        <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                          Threshold Near Achieved
                        </span>
                        <input
                          value={form.thresholdNear || ""}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              thresholdNear: event.target.value,
                            }))
                          }
                          className={inputClass}
                          placeholder="80.00"
                        />
                      </label>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-dashed border-red-100 bg-red-50/70 px-4 py-3 text-xs font-bold leading-5 text-[#C92C1E]">
              {mode === "TARGET_BULK"
                ? "Bulk target hanya membuat target yang belum ada dan tidak menimpa data lama."
                : mode === "KPI_DEFINITION"
                  ? "Recompute akan gagal kalau total weight aktif pada periode ini tidak tepat 100%."
                  : "Recompute berjalan async melalui job queue worker. Status job bisa dicek setelah submit."}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {saving
                  ? "Menyimpan..."
                  : mode === "TARGET_BULK"
                    ? "Simpan Target"
                    : mode === "KPI_DEFINITION"
                      ? "Simpan Definition"
                      : "Jalankan Recompute"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}