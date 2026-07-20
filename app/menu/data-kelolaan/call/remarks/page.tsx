"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { REMARK_0_OPTIONS } from "./remark-0/page";
import { REMARK_1_OPTIONS } from "./remark-1/page";
import { REMARK_2_OPTIONS } from "./remark-2/page";
import { REMARK_3_OPTIONS } from "./remark-3/page";

type RemarkScore = "0" | "1" | "2" | "3";

type RemarkOption = {
  value: string;
  label: string;
  score: RemarkScore | string;
};

type RemarkGroup = {
  score: RemarkScore;
  title: string;
  subtitle: string;
  options: RemarkOption[];
};

const REMARK_GROUPS: RemarkGroup[] = [
  {
    score: "0",
    title: "Remark 0",
    subtitle: "Tidak potensi / invalid",
    options: REMARK_0_OPTIONS,
  },
  {
    score: "1",
    title: "Remark 1",
    subtitle: "Kemungkinan",
    options: REMARK_1_OPTIONS,
  },
  {
    score: "2",
    title: "Remark 2",
    subtitle: "Trial / demo / training",
    options: REMARK_2_OPTIONS,
  },
  {
    score: "3",
    title: "Remark 3",
    subtitle: "Berlangganan",
    options: REMARK_3_OPTIONS,
  },
];

const REMARK_OPTIONS = REMARK_GROUPS.flatMap((group) => group.options);

export const getRemarkScoreFromValue = (value: string) => {
  const target = REMARK_OPTIONS.find((item) => item.value === value);

  return target?.score || "";
};

export const getRemarkLabelFromValue = (value: string) => {
  const target = REMARK_OPTIONS.find((item) => item.value === value);

  return target?.label || "";
};

const getRemarkHeaderClass = (score: string) => {
  if (score === "0") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (score === "1") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (score === "2") {
    return "border-yellow-200 bg-yellow-50 text-yellow-800";
  }

  if (score === "3") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-gray-200 bg-white text-gray-500";
};

const getRemarkGroupButtonClass = (score: string, active: boolean) => {
  if (active) {
    if (score === "0") return "border-red-400 bg-red-100 text-red-800";
    if (score === "1") return "border-blue-400 bg-blue-100 text-blue-800";
    if (score === "2") return "border-yellow-400 bg-yellow-100 text-yellow-900";
    if (score === "3") return "border-emerald-400 bg-emerald-100 text-emerald-800";
  }

  if (score === "0") return "border-red-100 bg-white text-red-700 hover:bg-red-50";
  if (score === "1") return "border-blue-100 bg-white text-blue-700 hover:bg-blue-50";
  if (score === "2") return "border-yellow-100 bg-white text-yellow-800 hover:bg-yellow-50";
  if (score === "3") return "border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50";

  return "border-gray-100 bg-white text-gray-600 hover:bg-gray-50";
};

const getRemarkOptionClass = (score: string, active: boolean) => {
  if (active) {
    return "border-[#C92C1E] bg-[#C92C1E] text-white";
  }

  if (score === "0") return "border-red-100 bg-red-50 text-red-700 hover:bg-red-100";
  if (score === "1") return "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100";
  if (score === "2") return "border-yellow-100 bg-yellow-50 text-yellow-800 hover:bg-yellow-100";
  if (score === "3") return "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";

  return "border-gray-100 bg-gray-50 text-gray-600";
};

const getRemarkDotClass = (score: string) => {
  if (score === "0") return "bg-red-500";
  if (score === "1") return "bg-blue-500";
  if (score === "2") return "bg-yellow-500";
  if (score === "3") return "bg-emerald-500";

  return "bg-gray-300";
};

function RemarkOptionsSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectedScore = getRemarkScoreFromValue(value);
  const selectedLabel = getRemarkLabelFromValue(value);

  const [isOpen, setIsOpen] = useState(false);
  const [activeGroupScore, setActiveGroupScore] = useState<RemarkScore>(
    (selectedScore as RemarkScore) || "0",
  );

  useEffect(() => {
    if (selectedScore) {
      setActiveGroupScore(selectedScore as RemarkScore);
    }
  }, [selectedScore]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return;

      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeGroup = useMemo(() => {
    return (
      REMARK_GROUPS.find((group) => group.score === activeGroupScore) ||
      REMARK_GROUPS[0]
    );
  }, [activeGroupScore]);

  const handleSelectOption = (nextValue: string, score: string) => {
    setActiveGroupScore(score as RemarkScore);
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
        Remarks
      </label>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm font-black transition ${getRemarkHeaderClass(
            selectedScore,
          )}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${getRemarkDotClass(
                selectedScore,
              )}`}
            />

            <span className="line-clamp-1 min-w-0">
              {selectedLabel || "Pilih Remarks"}
            </span>
          </span>

          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 transition ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 z-50 mt-2 min-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
            <div className="grid gap-2 border-b border-gray-100 bg-gray-50 p-2 sm:grid-cols-4">
              {REMARK_GROUPS.map((group) => {
                const active = activeGroupScore === group.score;

                return (
                  <button
                    key={group.score}
                    type="button"
                    onClick={() => setActiveGroupScore(group.score)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${getRemarkGroupButtonClass(
                      group.score,
                      active,
                    )}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${getRemarkDotClass(
                          group.score,
                        )}`}
                      />
                      <p className="text-xs font-black">{group.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                  {activeGroup.title}
                </p>

                <p className="text-[10px] font-bold text-gray-400">
                  Pilih kategori
                </p>
              </div>

              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {activeGroup.options.map((item) => {
                  const active = value === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        handleSelectOption(item.value, String(item.score))
                      }
                      className={`flex min-h-10 w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-black transition ${getRemarkOptionClass(
                        String(item.score),
                        active,
                      )}`}
                    >
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          active ? "bg-white" : getRemarkDotClass(String(item.score))
                        }`}
                      />
                      <span className="whitespace-normal leading-snug">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2.5"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export default RemarkOptionsSection;