"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    subtitle: "Potensi belum di-follow up lanjut",
    options: REMARK_1_OPTIONS,
  },
  {
    score: "2",
    title: "Remark 2",
    subtitle: "Follow up aktif / janji temu",
    options: REMARK_2_OPTIONS,
  },
  {
    score: "3",
    title: "Remark 3",
    subtitle: "Closing / siap transaksi",
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

function getRemarkDotClass(score: string) {
  if (score === "0") return "bg-[#EF4444]";
  if (score === "1") return "bg-[#3B82F6]";
  if (score === "2") return "bg-[#F59E0B]";
  if (score === "3") return "bg-[#10B981]";
  return "bg-gray-300";
}

function getRemarkHeaderClass(score: string) {
  if (score === "0") return "border-red-200 bg-red-50/70 text-red-700";
  if (score === "1") return "border-blue-200 bg-blue-50/70 text-blue-700";
  if (score === "2") return "border-amber-200 bg-amber-50/70 text-amber-800";
  if (score === "3") return "border-emerald-200 bg-emerald-50/70 text-emerald-800";
  return "border-gray-200 bg-white text-gray-700 hover:border-gray-300";
}

function getRemarkGroupButtonClass(score: string, active: boolean) {
  if (active) {
    if (score === "0") return "border-red-300 bg-red-100 text-red-700 shadow-2xs font-black";
    if (score === "1") return "border-blue-300 bg-blue-100 text-blue-700 shadow-2xs font-black";
    if (score === "2") return "border-amber-300 bg-amber-100 text-amber-800 shadow-2xs font-black";
    if (score === "3") return "border-emerald-300 bg-emerald-100 text-emerald-800 shadow-2xs font-black";
  }

  return "border-transparent bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900";
}

function getRemarkOptionClass(score: string, active: boolean) {
  if (active) {
    if (score === "0") return "border-red-300 bg-[#EF4444] text-white shadow-xs font-black";
    if (score === "1") return "border-blue-300 bg-[#3B82F6] text-white shadow-xs font-black";
    if (score === "2") return "border-amber-300 bg-[#F59E0B] text-white shadow-xs font-black";
    if (score === "3") return "border-emerald-300 bg-[#10B981] text-white shadow-xs font-black";
  }

  if (score === "0") return "border-red-100 bg-red-50/40 text-red-700 hover:bg-red-50 hover:border-red-200";
  if (score === "1") return "border-blue-100 bg-blue-50/40 text-blue-700 hover:bg-blue-50 hover:border-blue-200";
  if (score === "2") return "border-amber-100 bg-amber-50/40 text-amber-800 hover:bg-amber-50 hover:border-amber-200";
  if (score === "3") return "border-emerald-100 bg-emerald-50/40 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-200";

  return "border-gray-200 bg-white text-gray-700 hover:bg-gray-50";
}

function RemarkOptionsSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedScore = getRemarkScoreFromValue(value);
  const selectedLabel = getRemarkLabelFromValue(value);

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [activeGroupScore, setActiveGroupScore] = useState<RemarkScore>(
    (selectedScore as RemarkScore) || "0",
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedScore) return;

    const timer = window.setTimeout(() => {
      setActiveGroupScore(selectedScore as RemarkScore);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedScore]);

  const updatePosition = useCallback(() => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;

    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: 99999,
      top: `${rect.bottom + 8}px`,
      maxHeight: `${Math.max(200, spaceBelow - 20)}px`,
      width: `${Math.max(rect.width, 320)}px`,
      maxWidth: "calc(100vw - 32px)",
    };

    const desiredLeft = rect.left;
    const maxLeft = window.innerWidth - Math.min(540, window.innerWidth - 32) - 16;
    style.left = `${Math.max(16, Math.min(desiredLeft, maxLeft))}px`;

    setMenuStyle(style);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollResize = () => {
      updatePosition();
    };

    window.addEventListener("resize", handleScrollResize);
    window.addEventListener("scroll", handleScrollResize, true);
    return () => {
      window.removeEventListener("resize", handleScrollResize);
      window.removeEventListener("scroll", handleScrollResize, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
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

  const dropdownMenu = isOpen && (
    <div
      ref={menuRef}
      style={menuStyle}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 border-b border-gray-100 bg-gray-50/80 p-2.5">
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

      <div className="p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
            {activeGroup.title} — {activeGroup.subtitle}
          </p>

          <p className="text-[10px] font-bold text-gray-400">
            Pilih kategori ({activeGroup.options.length} opsi)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
          {activeGroup.options.map((item) => {
            const active = value === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  handleSelectOption(item.value, String(item.score))
                }
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs sm:text-sm font-bold transition-all shadow-2xs ${getRemarkOptionClass(
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
  );

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

        {mounted && isOpen ? createPortal(dropdownMenu, document.body) : null}
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
