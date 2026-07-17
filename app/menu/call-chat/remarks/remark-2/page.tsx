"use client";

import { useEffect, useState } from "react";
import type { NasabahItem } from "../../page";
import type { RemarkOption } from "../page";

type Remark2UpdatePayload = {
  callStatus: string;
  chatStatus: string;
  tanggalFu: string;
  remarks: string;
  scor: number;
  noted: string;
};

export type Remark2TrainingPayload = {
  hasTraining: boolean;
  trainingTime: string;
  sessionType: string;
  isTrainingTimeEdited?: boolean;
};

export const REMARK_2_LABEL = "Remarks 2 - Trial, Demo, Interaktif";

export const REMARK_2_OPTIONS: RemarkOption[] = [
  { value: "2_trial_demo_interaktif", label: "(2) Trial, Demo, Interaktif", tone: "yellow" },
];

export const TRAINING_SESSION_OPTIONS: RemarkOption[] = [
  { value: "online_call", label: "online (call)", tone: "yellow" },
  { value: "online_chat", label: "online (chat)", tone: "yellow" },
  { value: "online_buku_panduan", label: "online (Buku Panduan)", tone: "yellow" },
  { value: "offline_diluar_laundry_customer", label: "offline (diluar laundry customer)", tone: "green" },
  { value: "offline_laundry_customer", label: "offline (laundry customer)", tone: "green" },
  { value: "offline_mitra_regional", label: "offline (mitra regional)", tone: "green" },
];

export function getTrainingTimeNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || "00";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}:${getPart("second")}`;
}

export function formatTrainingDateTime(value: string) {
  if (!value) return "-";

  const [datePart, timePart = "00:00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = "00"] = timePart.split(":");

  if (!year || !month || !day) return value;

  const parsedDate = new Date(year, month - 1, day, Number(hour || 0), Number(minute || 0), Number(second || 0));

  return (
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsedDate) + " WIB"
  );
}

const MONTH_INDEX_ID: Record<string, number> = {
  januari: 0,
  jan: 0,
  februari: 1,
  feb: 1,
  maret: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  agustus: 7,
  agu: 7,
  september: 8,
  sep: 8,
  oktober: 9,
  okt: 9,
  november: 10,
  nov: 10,
  desember: 11,
  des: 11,
};

export function getTrainingSessionTimestamp(sessionText: string) {
  const normalized = sessionText.toLowerCase();

  const monthMatch = normalized.match(
    /(\d{1,2})\s+(januari|jan|februari|feb|maret|mar|april|apr|mei|juni|jun|juli|jul|agustus|agu|september|sep|oktober|okt|november|nov|desember|des)\s+(\d{4}).*?(\d{1,2})[.:](\d{2})/,
  );

  if (monthMatch) {
    const [, day, monthName, year, hour, minute] = monthMatch;
    return new Date(
      Number(year),
      MONTH_INDEX_ID[monthName] ?? 0,
      Number(day),
      Number(hour),
      Number(minute),
    ).getTime();
  }

  const isoMatch = normalized.match(/(\d{4})-(\d{2})-(\d{2})t(\d{2}):(\d{2})/);

  if (isoMatch) {
    const [, year, month, day, hour, minute] = isoMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ).getTime();
  }

  return Number.MAX_SAFE_INTEGER;
}

export function sortTrainingSessionsBySchedule(sessions: string[]) {
  return [...sessions].sort(
    (firstSession, secondSession) =>
      getTrainingSessionTimestamp(firstSession) - getTrainingSessionTimestamp(secondSession),
  );
}

export function getDefaultTrainingPayload(): Remark2TrainingPayload {
  return {
    hasTraining: false,
    trainingTime: getTrainingTimeNow(),
    sessionType: "",
    isTrainingTimeEdited: false,
  };
}

export function getTrainingSessionLabel(value: string) {
  return TRAINING_SESSION_OPTIONS.find((item) => item.value === value)?.label || "";
}

export function applyRemark2Action(
  customer: NasabahItem,
  payload: Remark2UpdatePayload,
  trainingPayload: Remark2TrainingPayload,
): NasabahItem {
  const nextTrainingSessions = [...(customer.trainingSessions || [])];
  const nextTrainingSessionText =
    trainingPayload.hasTraining && trainingPayload.sessionType
      ? `${getTrainingSessionLabel(trainingPayload.sessionType)}, ${formatTrainingDateTime(trainingPayload.trainingTime)}`
      : "";

  // Riwayat lama tetap disimpan. Kalau ada update training baru, tambahkan sebagai riwayat baru.
  if (nextTrainingSessionText) {
    nextTrainingSessions.push(nextTrainingSessionText);
  }

  const sortedTrainingSessions = sortTrainingSessionsBySchedule(nextTrainingSessions);

  return {
    ...customer,
    ...payload,
    pic: customer.pic,
    totalFu: Number(customer.totalFu || 0) + 1,
    trainingStatus: sortedTrainingSessions.length > 0 ? "Sudah Training" : "Customer belum training",
    trainingSessions: sortedTrainingSessions,
    trainingPlan: {
      hasTraining: trainingPayload.hasTraining,
      trainingTime: trainingPayload.trainingTime,
      sessionType: trainingPayload.sessionType,
    },
  };
}

const getToneClass = (tone?: RemarkOption["tone"]) => {
  if (tone === "green") return "border-emerald-200 bg-emerald-100 text-emerald-800";
  if (tone === "yellow") return "border-yellow-200 bg-yellow-100 text-yellow-800";
  if (tone === "blue") return "border-blue-200 bg-blue-100 text-blue-800";
  return "border-red-200 bg-red-100 text-red-700";
};

function TrainingSessionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = TRAINING_SESSION_OPTIONS.find((item) => item.value === value);

  return (
    <div className="relative space-y-2">
      <label className="text-xs font-black uppercase tracking-wider text-gray-500">
        Jenis Sesi
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-xl border border-gray-300 bg-white p-1.5 text-xs font-black text-gray-700 outline-none transition focus:border-[#C92C1E]"
      >
        <span
          className={`flex min-h-[30px] flex-1 items-center justify-center rounded-lg border px-2.5 py-1.5 ${
            selectedOption ? getToneClass(selectedOption.tone) : "border-gray-200 bg-gray-50 text-gray-500"
          }`}
        >
          {selectedOption?.label || "none"}
        </span>
        <span className="px-2 text-gray-500">⌄</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className="mb-1.5 flex w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-black text-gray-500 transition hover:scale-[1.005]"
          >
            none
          </button>

          {TRAINING_SESSION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`mb-1.5 flex w-full items-center justify-center rounded-lg border px-2.5 py-1.5 text-xs font-black transition hover:scale-[1.005] ${getToneClass(option.tone)}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Remark2TrainingSection({
  value,
  onChange,
  existingSessions = [],
}: {
  value: Remark2TrainingPayload;
  onChange: (value: Remark2TrainingPayload) => void;
  existingSessions?: string[];
}) {
  const updateValue = (nextValue: Partial<Remark2TrainingPayload>) => {
    onChange({
      ...value,
      ...nextValue,
    });
  };

  const newTrainingPreview =
    value.hasTraining && value.sessionType
      ? `${getTrainingSessionLabel(value.sessionType)}, ${formatTrainingDateTime(value.trainingTime)}`
      : "";

  const timelineSessions = sortTrainingSessionsBySchedule([
    ...existingSessions,
    ...(newTrainingPreview ? [newTrainingPreview] : []),
  ]);

  const existingSessionSet = new Set(existingSessions);

  useEffect(() => {
    if (!value.hasTraining || value.isTrainingTimeEdited) return;

    const timer = window.setInterval(() => {
      onChange({
        ...value,
        trainingTime: getTrainingTimeNow(),
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [value, onChange]);

  return (
    <section className="space-y-4 pt-4">
      <h3 className="text-center text-2xl font-black tracking-tight text-gray-900">
        Laporan Training Customer
      </h3>

      <div className="relative ml-1 space-y-0">
        <div className="absolute left-[7px] top-4 h-[calc(100%-16px)] border-l-2 border-dotted border-emerald-400" />

        <div className="relative z-10 flex min-h-10 items-center gap-3 text-xs font-black text-gray-700">
          <span className="h-4 w-4 rounded-full border-2 border-emerald-500 bg-yellow-100" />
          Customer belum training
        </div>

        {timelineSessions.map((session, index) => {
          const isPreviousTraining = existingSessionSet.has(session);

          return (
            <div
              key={`training-session-${session}-${index}`}
              className="relative z-10 flex min-h-10 items-center gap-3 text-xs font-black text-gray-700"
            >
              <span
                className={`h-4 w-4 rounded-full border-2 border-emerald-500 ${
                  isPreviousTraining ? "bg-yellow-100" : "bg-white"
                }`}
              />
              <span>{session}</span>
            </div>
          );
        })}
      </div>

      <label className="flex items-center gap-3 text-xs font-black text-gray-700">
        <input
          type="checkbox"
          checked={value.hasTraining}
          onChange={(event) => {
            const checked = event.target.checked;

            onChange({
              hasTraining: checked,
              trainingTime: getTrainingTimeNow(),
              sessionType: checked ? value.sessionType : "",
              isTrainingTimeEdited: false,
            });
          }}
          className="h-5 w-5 rounded border-2 border-emerald-400 accent-emerald-500"
        />
        Pada sesi ini terdapat rencana Training *centang jika ingin menambahkan data training
      </label>

      {value.hasTraining && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-gray-500">
              Waktu Training
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                step="1"
                value={value.trainingTime}
                onChange={(event) =>
                  updateValue({
                    trainingTime: event.target.value,
                    isTrainingTimeEdited: true,
                  })
                }
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-[#C92C1E]"
              />

              <button
                type="button"
                onClick={() =>
                  updateValue({
                    trainingTime: getTrainingTimeNow(),
                    isTrainingTimeEdited: false,
                  })
                }
                className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-black text-[#C92C1E] hover:bg-red-100"
              >
                Real Time
              </button>
            </div>

            <p className="text-[10px] font-bold text-gray-400">
              {value.isTrainingTimeEdited
                ? "Jadwal manual dari kalender. Klik Real Time untuk mengikuti waktu sekarang."
                : "Jadwal mengikuti waktu sekarang secara real time."}
            </p>

            <p className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-black text-gray-600">
              Preview jadwal: <span className="text-[#C92C1E]">{formatTrainingDateTime(value.trainingTime)}</span>
            </p>
          </div>

          <TrainingSessionSelect
            value={value.sessionType}
            onChange={(sessionType) => updateValue({ sessionType })}
          />
        </div>
      )}
    </section>
  );
}