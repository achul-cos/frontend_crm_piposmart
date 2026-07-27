"use client";

import React from "react";
import type { CallCustomer } from "../../page";

export type Remark2TrainingPayload = {
  hasTraining: boolean;
  schedule: string;
  sessionType: string;
};

export const REMARK_2_OPTIONS = [
  {
    value: "trial-demo-interaktif",
    label: "(2) Trial, Demo, Interaktif",
    score: "2",
  },
];

const TRAINING_SESSION_OPTIONS = [
  "",
  "online (call)",
  "online (chat)",
  "online (Buku Panduan)",
  "offline (diluar laundry customer)",
  "offline (laundry customer)",
  "offline (mitra regional)",
];

export const getDefaultTrainingPayload = (): Remark2TrainingPayload => ({
  hasTraining: false,
  schedule: "",
  sessionType: "",
});

const formatDateTime = (value: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function Remark2TrainingSection({
  customer,
  value,
  onChange,
}: {
  customer: CallCustomer;
  value: Remark2TrainingPayload;
  onChange: (value: Remark2TrainingPayload) => void;
}) {
  if (!value) return null;

  const existingSessions = customer?.trainingSessions || [];
  const previewTime = formatDateTime(value.schedule);

  return (
    <div className="space-y-3 rounded-2xl border border-yellow-200 bg-yellow-50/70 p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <TrainingIcon className="mt-0.5 h-5 w-5 shrink-0 text-yellow-700" />

        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-yellow-800">
            Fungsi Remark 2
          </p>
          <h3 className="text-base font-black text-yellow-950">
            Laporan Training Customer
          </h3>
          <p className="mt-1 text-[11px] font-bold text-yellow-900/60">
            Remark 2 dipakai untuk customer trial, demo, atau sudah masuk tahap training.
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-yellow-200 bg-white p-3 text-xs font-black text-yellow-800 shadow-sm">
        <input
          type="checkbox"
          checked={value.hasTraining}
          onChange={(event) =>
            onChange({
              ...value,
              hasTraining: event.target.checked,
              schedule: event.target.checked ? value.schedule : "",
              sessionType: event.target.checked ? value.sessionType : "",
            })
          }
          className="h-4 w-4 accent-yellow-600"
        />
        Customer dijadwalkan training
      </label>

      {value.hasTraining && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-yellow-800">
              Waktu Training
            </label>

            <input
              type="datetime-local"
              value={value.schedule}
              onChange={(event) =>
                onChange({
                  ...value,
                  schedule: event.target.value,
                })
              }
              className="h-10 w-full cursor-pointer rounded-xl border border-yellow-200 bg-white px-3 text-xs font-black text-gray-700 outline-none transition focus:border-yellow-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-yellow-800">
              Jenis Sesi
            </label>

            <select
              value={value.sessionType}
              onChange={(event) =>
                onChange({
                  ...value,
                  sessionType: event.target.value,
                })
              }
              className="h-10 w-full cursor-pointer rounded-xl border border-yellow-200 bg-white px-3 text-xs font-black text-gray-700 outline-none transition focus:border-yellow-600"
            >
              {TRAINING_SESSION_OPTIONS.map((item) => (
                <option key={item || "empty"} value={item}>
                  {item || "Pilih Jenis Sesi"}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-yellow-200 bg-white p-3 shadow-sm">
        <p className="text-[10px] font-black uppercase text-yellow-800">
          Riwayat / Preview Training
        </p>

        <div className="mt-2 space-y-2">
          {existingSessions.length === 0 && !value.hasTraining ? (
            <p className="text-[11px] font-bold italic text-gray-400">
              Customer belum memiliki jadwal training.
            </p>
          ) : (
            <>
              {existingSessions.map((session, index) => (
                <div
                  key={`${session}-${index}`}
                  className="flex items-start gap-2 text-xs font-bold text-gray-600"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-yellow-500" />
                  <span>{session}</span>
                </div>
              ))}

              {value.hasTraining && value.sessionType && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-50 px-2 py-1.5 text-xs font-black text-yellow-800">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full border border-yellow-700 bg-white" />
                  <span>
                    {value.sessionType} • {previewTime}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function applyRemark2Action(
  customer: CallCustomer,
  payload: Remark2TrainingPayload,
  fallbackCallTime: string,
): CallCustomer {
  const trainingTime = payload.schedule || fallbackCallTime;
  const nextTrainingSessions = [...(customer.trainingSessions || [])];
  const nextTrainingHistories = [...(customer.trainingHistories || [])];

  if (payload.hasTraining && payload.sessionType) {
    nextTrainingSessions.push(`${payload.sessionType} • ${formatDateTime(trainingTime)}`);
    nextTrainingHistories.push({
      waktuTraining: formatDateTime(trainingTime),
      lokasiTraining: payload.sessionType,
    });
  }

  return {
    ...customer,
    totalFu: Number(customer.totalFu || 0) + 1,
    remarks: "2",
    scor: 2,
    trainingSessions: nextTrainingSessions,
    trainingHistories: nextTrainingHistories,
  };
}

function TrainingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0A50.57 50.57 0 0 0 12 13.489a50.57 50.57 0 0 0 7.74-3.342m-15.48 0L12 3.75l7.74 6.397" />
    </svg>
  );
}

export default Remark2TrainingSection;