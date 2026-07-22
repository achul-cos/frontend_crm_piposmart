import React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type SortField =
  | "namaPromo"
  | "paket"
  | "kategoriNasabah"
  | "tenor"
  | "hargaPromo"
  | "status"
  | "jumlahClosing"
  | "periodeStart";

export type SortDirection = "asc" | "desc";

export function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={`skeleton-${i}`} className="animate-pulse">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={`skel-${i}-${j}`} className="px-4 py-3.5">
              <div className="h-4 rounded-lg bg-gray-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function ThSortable({
  label,
  field,
  onSort,
  sortField,
  sortDir,
}: {
  label: string;
  field: SortField;
  onSort: (field: SortField) => void;
  sortField: SortField;
  sortDir: SortDirection;
}) {
  const active = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      className="cursor-pointer select-none px-4 py-3 text-[11px] font-black uppercase tracking-wide text-white/90 transition hover:text-white"
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-white" /> : <ChevronDown className="h-3.5 w-3.5 text-white" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-white/50" />
        )}
      </span>
    </th>
  );
}

export default function SortPage() { return null; }
