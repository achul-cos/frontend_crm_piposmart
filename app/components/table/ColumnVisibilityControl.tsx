"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TableColumn = {
  index: number;
  label: string;
};

type ColumnVisibilityControlProps = {
  tableId: string;
  storageKey: string;
  buttonLabel?: string;
  description?: string;
};

function readHeaderLabel(cell: Element, fallback: string) {
  const text = (cell.textContent || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function shouldHideByDefault(label: string) {
  const normalized = label.replace(/\s+/g, " ").trim().toLowerCase();

  if (normalized === "kode owner") {
    return false;
  }

  if (["payment", "wallet", "ledger"].includes(normalized)) {
    return true;
  }

  if (normalized.startsWith("kode")) {
    return true;
  }

  return false;
}

export default function ColumnVisibilityControl({
  tableId,
  storageKey,
  buttonLabel = "Kolom",
  description = "Sembunyikan atau tampilkan kolom tabel sesuai kebutuhan.",
}: ColumnVisibilityControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<number[]>([]);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedPreferenceRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const table = document.getElementById(tableId);
    if (!table) return;

    const updateColumns = () => {
      const headers = Array.from(
        table.querySelectorAll("thead tr:first-child th")
      ).map((cell, index) => ({
        index: index + 1,
        label: readHeaderLabel(cell, `Kolom ${index + 1}`),
      }));

      setColumns(headers);

      let initialHidden: number[] | null = null;
      if (!hasLoadedPreferenceRef.current) {
        hasLoadedPreferenceRef.current = true;
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const allowed = new Set(headers.map((c) => c.index));
              initialHidden = parsed.filter(
                (v): v is number => typeof v === "number" && allowed.has(v)
              );
            }
          } catch {}
        }
        
        if (initialHidden === null) {
          initialHidden = headers
            .filter((c) => shouldHideByDefault(c.label))
            .map((c) => c.index);
        }
      }

      setHiddenColumns((current) => {
        if (initialHidden !== null) {
          return initialHidden;
        }
        const allowed = new Set(headers.map((c) => c.index));
        return current.filter((idx) => allowed.has(idx));
      });
    };

    // Initial update
    const frame = window.requestAnimationFrame(updateColumns);

    // Watch for dynamic changes in the table header
    const thead = table.querySelector("thead");
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(updateColumns);
    });

    if (thead) {
      observer.observe(thead, { childList: true, subtree: true });
    } else {
      observer.observe(table, { childList: true, subtree: true });
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [tableId, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || columns.length === 0) return;
    if (!hasLoadedPreferenceRef.current) return;
    localStorage.setItem(storageKey, JSON.stringify(hiddenColumns));
  }, [columns, hiddenColumns, storageKey]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const updateMenuPosition = () => {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: Math.max(window.innerWidth - rect.right, 16),
      });
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        buttonRef.current?.contains(target ?? null) ||
        menuRef.current?.contains(target ?? null)
      ) {
        return;
      }
      setIsOpen(false);
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  const visibleCount = columns.length - hiddenColumns.length;

  const styleContent = useMemo(() => {
    return hiddenColumns
      .map(
        (index) => `
#${tableId} thead tr > *:nth-child(${index}),
#${tableId} tbody tr > *:nth-child(${index}) {
  display: none !important;
}
`
      )
      .join("\n");
  }, [hiddenColumns, tableId]);

  const toggleColumn = (index: number) => {
    setHiddenColumns((current) => {
      if (current.includes(index)) {
        return current.filter((item) => item !== index);
      }

      if (visibleCount <= 1) {
        return current;
      }

      return [...current, index].sort((a, b) => a - b);
    });
  };

  if (columns.length === 0) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-400 opacity-60 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
      >
        <svg className="h-4 w-4 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {buttonLabel}
      </button>
    );
  }

  return (
    <div className="relative">
      {styleContent ? <style>{styleContent}</style> : null}

      <button
        type="button"
        ref={buttonRef}
        onClick={() => setIsOpen((current) => !current)}
        className="column-visibility-trigger inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <svg className="h-4 w-4 text-gray-400 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {buttonLabel}
        <span className="column-visibility-count rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-500 dark:bg-slate-800 dark:text-slate-300">
          {visibleCount}/{columns.length}
        </span>
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="column-visibility-menu fixed z-[9999] w-80 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
              style={{
                top: `${menuPosition.top}px`,
                right: `${menuPosition.right}px`,
                maxHeight: "min(70vh, 32rem)",
              }}
            >
              <div className="mb-3 border-b border-gray-100 pb-3 dark:border-slate-800">
                <p className="text-sm font-black text-gray-900 dark:text-slate-50">Atur Kolom Tabel</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-300">{description}</p>
              </div>

              <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "calc(min(70vh, 32rem) - 6.5rem)" }}>
                {columns.map((column) => {
                  const checked = !hiddenColumns.includes(column.index);
                  const isLastVisible = checked && visibleCount === 1;

                  return (
                    <label
                      key={column.index}
                      className={`column-visibility-item flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 transition ${
                        checked
                          ? "border-[#C92C1E]/20 bg-[#FFF7F5] dark:border-red-500/30 dark:bg-red-500/10"
                          : "border-gray-200 bg-white hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                      } ${isLastVisible ? "opacity-80" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isLastVisible}
                        onChange={() => toggleColumn(column.index)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-800 dark:text-slate-100">{column.label}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setHiddenColumns([])}
                  className="text-xs font-black text-[#C92C1E] transition hover:text-[#a92217] dark:hover:text-red-300"
                >
                  Tampilkan Semua
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="column-visibility-done rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-black text-white transition hover:bg-gray-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Selesai
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
