"use client";

// Shared presentational pieces used by both the main Owner table
// (app/menu/owner-outlet/page.tsx) and the Owner trash table
// (app/menu/owner-outlet/trash/page.tsx) so the two stay visually/structurally
// identical without duplicating the same markup twice.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getOwnerOverview, type BackendOwner } from "@/app/lib/api";

export function AutocompleteFilter({
  label,
  placeholder,
  value,
  onChange,
  options,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const uniqueOptions = useMemo(() => Array.from(new Set(options.filter(Boolean))), [options]);

  const filteredOptions = uniqueOptions.filter((opt) =>
    opt.toLowerCase().startsWith(value.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="flex flex-col gap-1.5 w-full relative">
      <span className="text-xs font-semibold text-black">{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
      />
      {isOpen && value && filteredOptions.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {filteredOptions.map((opt, idx) => (
            <li
              key={`${opt}-${idx}`}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className="cursor-pointer px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-red-50 hover:text-[#C92C1E]"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WalletBalanceCell({ ownerId }: { ownerId: number }) {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOwnerOverview(ownerId)
      .then((res) => {
        if (!cancelled) setBalance(res.balance.wallet.balance);
      })
      .catch(() => {
        if (!cancelled) setBalance("-");
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  if (balance === null) return <span className="text-gray-400 text-xs">Memuat...</span>;
  if (balance === "-") return <span className="text-gray-400 text-xs">-</span>;

  const amount = Number(balance || 0);
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

  return <span className="font-bold text-gray-900">{formatted}</span>;
}

export function getOwnerStatus(owner: BackendOwner) {
  const st = (owner.subscription_status || owner.status || "").toUpperCase();
  if (st === "SUBSCRIBE" || st === "BERLANGGANAN" || st === "ACTIVE") return "BERLANGGANAN";
  if (st === "NEW" || st === "BARU") return "NEW";
  if (st === "AKAN_JATUH_TEMPO" || st === "AKAN JATUH TEMPO") return "AKAN JATUH TEMPO";
  if (st === "JATUH_TEMPO" || st === "JATUH TEMPO") return "JATUH TEMPO";
  if (st === "TELAH_JATUH_TEMPO" || st === "TELAH JATUH TEMPO") return "TELAH JATUH TEMPO";
  if (st === "EXPIRED" || st === "UNSUBSCRIBE") return "UNSUBSCRIBE";
  if (st === "NOT_SUBSCRIBE" || st === "NOT SUBSCRIBE" || st === "TIDAK BERLANGGANAN") return "TIDAK BERLANGGANAN";
  if (st === "TRIAL") return "TRIAL";
  return st || "TIDAK BERLANGGANAN";
}

export function getOwnerStatusBadgeStyle(status: string) {
  const st = (status || "").toUpperCase();
  if (st.includes("BERLANGGANAN") || st === "SUBSCRIBE" || st === "ACTIVE") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (st === "TRIAL" || st === "NEW" || st === "BARU") {
    return "border border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border border-red-200 bg-red-50 text-red-700 font-bold";
}

// Sortable `<th>` used by both tables — clicking toggles asc/desc on `sortKey`.
export function SortableHeader({
  sortKey,
  label,
  sort,
  setSort,
}: {
  sortKey: string;
  label: string;
  sort: string;
  setSort: (next: string) => void;
}) {
  const isSorted = sort.replace("-", "") === sortKey;
  const isDesc = sort.startsWith("-");
  return (
    <th
      className="px-4 py-4 font-bold cursor-pointer hover:text-red-700 transition-colors"
      onClick={() => setSort(sort === sortKey ? `-${sortKey}` : sortKey)}
      title={`Urutkan berdasarkan ${label}`}
    >
      <div className="flex items-center gap-2">
        {label}
        <div className="-space-y-1 flex flex-col opacity-40">
          <svg className={`h-2.5 w-2.5 ${isSorted && !isDesc ? "text-[#C92C1E] opacity-100" : ""}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <svg className={`h-2.5 w-2.5 ${isSorted && isDesc ? "text-[#C92C1E] opacity-100" : ""}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </th>
  );
}
