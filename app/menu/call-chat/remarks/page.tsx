"use client";

import { useState, type ReactNode } from "react";
import { REMARK_0_OPTIONS } from "./remark-0/page";
import { REMARK_1_OPTIONS } from "./remark-1/page";
import { REMARK_2_OPTIONS } from "./remark-2/page";
import { REMARK_3_OPTIONS } from "./remark-3/page";

export type RemarkTone = "red" | "yellow" | "green" | "blue";

export type RemarkOption = {
  value: string;
  label: string;
  tone: RemarkTone;
};

export const REMARK_OPTIONS: RemarkOption[] = [
  ...REMARK_0_OPTIONS,
  ...REMARK_1_OPTIONS,
  ...REMARK_2_OPTIONS,
  ...REMARK_3_OPTIONS,
];

export const getRemarkScoreFromValue = (value: string) => {
  if (value.startsWith("3_")) return 3;
  if (value.startsWith("2_")) return 2;
  if (value.startsWith("1_")) return 1;
  return 0;
};

export const getRemarkLabelFromValue = (value: string) => {
  return REMARK_OPTIONS.find((item) => item.value === value)?.label || "";
};

const getToneClass = (tone?: RemarkTone) => {
  if (tone === "green") return "border-emerald-200 bg-emerald-100 text-emerald-800";
  if (tone === "yellow") return "border-yellow-200 bg-yellow-100 text-yellow-800";
  if (tone === "blue") return "border-blue-200 bg-blue-100 text-blue-800";
  return "border-red-200 bg-red-100 text-red-700";
};

export default function RemarkOptionsSection({
  value,
  onChange,
  label = "Remarks",
  placeholder = "none",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  icon?: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = REMARK_OPTIONS.find((item) => item.value === value);

  return (
    <div className="relative space-y-2">
      <label className="text-xs font-black uppercase tracking-wider text-gray-500">
        {label}
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
          {selectedOption?.label || placeholder}
        </span>
        <span className="px-2 text-gray-500">⌄</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-44 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
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

          {REMARK_OPTIONS.map((option) => (
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