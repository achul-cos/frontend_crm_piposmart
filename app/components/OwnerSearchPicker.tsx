"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useRef, useState } from "react";
import { fetchOwners, type BackendOwner } from "@/app/lib/api";

/**
 * Pemilihan Owner untuk form Outlet — search-as-you-type (kode & nama),
 * BUKAN dropdown. Wajib pilih salah satu hasil pencarian sebelum submit
 * (owner adalah field wajib untuk membuat/mengedit outlet).
 */
export default function OwnerSearchPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: BackendOwner | null;
  onChange: (owner: BackendOwner | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BackendOwner[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetchOwners({ q: query.trim(), limit: 8 });
        setResults(res.data.items);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSelect = (owner: BackendOwner) => {
    onChange(owner);
    setQuery("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
  };

  if (value && !isOpen) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-gray-900">
            {value.code} &middot; {value.name}
          </p>
          <p className="truncate text-[10px] text-gray-500">{value.brand_name || "—"}</p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-[10px] font-bold text-[#C92C1E] hover:underline"
          >
            Ganti
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        placeholder="Cari kode atau nama owner..."
        className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-bold text-black outline-none focus:border-[#C92C1E]"
      />

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {isLoading ? (
            <p className="p-3 text-xs font-bold text-gray-400">Mencari...</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-xs font-bold text-gray-400">
              Tidak ada owner yang cocok.
            </p>
          ) : (
            results.map((owner) => (
              <button
                key={owner.id}
                type="button"
                onClick={() => handleSelect(owner)}
                className="block w-full border-b border-gray-100 p-2.5 text-left last:border-0 hover:bg-red-50"
              >
                <p className="text-xs font-black text-gray-900">
                  {owner.code} &middot; {owner.name}
                </p>
                <p className="text-[10px] text-gray-500">{owner.brand_name || "—"}</p>
              </button>
            ))
          )}
        </div>
      )}
      {isOpen && query.trim().length > 0 && query.trim().length < 2 && (
        <p className="mt-1 text-[10px] text-gray-400">Ketik minimal 2 karakter.</p>
      )}
    </div>
  );
}
