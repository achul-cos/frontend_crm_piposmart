"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Multi-select ala Excel untuk tabel: klik checkbox toggle satu baris,
 * shift+klik pilih rentang dari baris terakhir diklik (anchor) sampai baris
 * saat ini. Anchor disnapshot ke variabel lokal sebelum setState supaya tidak
 * terbaca stale di dalam updater (React menjalankan updater setelah baris
 * berikutnya sempat menimpa ref).
 */
export function useBulkSelect<T extends { id: number }>(rows: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const anchorRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    anchorRef.current = null;
  }, []);

  const toggleRow = useCallback(
    (id: number, shiftKey: boolean) => {
      const anchor = anchorRef.current;

      if (shiftKey && anchor !== null) {
        const anchorIndex = rows.findIndex((row) => row.id === anchor);
        const targetIndex = rows.findIndex((row) => row.id === id);
        if (anchorIndex !== -1 && targetIndex !== -1) {
          const [start, end] =
            anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
          const rangeIds = rows.slice(start, end + 1).map((row) => row.id);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            rangeIds.forEach((rangeId) => next.add(rangeId));
            return next;
          });
          return;
        }
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      anchorRef.current = id;
    },
    [rows],
  );

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (rows.length > 0 && rows.every((row) => prev.has(row.id))) {
        return new Set();
      }
      return new Set(rows.map((row) => row.id));
    });
    anchorRef.current = null;
  }, [rows]);

  const isSelected = useCallback((id: number) => selectedIds.has(id), [selectedIds]);
  const isAllSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected,
    isAllSelected,
    toggleRow,
    toggleAll,
    clear,
  };
}
