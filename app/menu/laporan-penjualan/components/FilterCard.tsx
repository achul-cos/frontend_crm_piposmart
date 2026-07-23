import React from "react";
import { Search } from "lucide-react";

type FilterCardProps = {
  search: string;
  setSearch: (val: string) => void;
  filterPic: string;
  setFilterPic: (val: string) => void;
  filterPaket: string;
  setFilterPaket: (val: string) => void;
  filterPromo: string;
  setFilterPromo: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  picOptions: string[];
  paketOptions: { value: string; label: string }[];
  promoOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  dateType: string;
  setDateType: (val: string) => void;
  presetRange: string;
  setPresetRange: (val: string) => void;
  dateDari: string;
  setDateDari: (val: string) => void;
  dateSampai: string;
  setDateSampai: (val: string) => void;
  onDateBlur: () => void;
};

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[] | string[];
  placeholder: string;
}) {
  return (
    <div className="relative flex-1 min-w-[140px]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-8 text-[11px] font-bold text-gray-700 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]/20"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const label = typeof o === "string" ? o : o.label;
          return (
            <option key={val} value={val}>
              {label}
            </option>
          );
        })}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export default function FilterCard({
  search, setSearch,
  filterPic, setFilterPic,
  filterPaket, setFilterPaket,
  filterPromo, setFilterPromo,
  filterStatus, setFilterStatus,
  picOptions, paketOptions, promoOptions, statusOptions,
  dateType, setDateType,
  presetRange, setPresetRange,
  dateDari, setDateDari,
  dateSampai, setDateSampai,
  onDateBlur
}: FilterCardProps) {
  return (
    <div className="border-b border-gray-100 bg-gray-50/50 p-3 space-y-3">
      {/* --- First Row: Main Filters --- */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Cari Customer atau ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-[11px] font-medium text-gray-900 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]/20"
          />
        </div>

        <FilterSelect value={filterPic} onChange={setFilterPic} options={picOptions} placeholder="Semua PIC" />
        <FilterSelect value={filterPaket} onChange={setFilterPaket} options={paketOptions} placeholder="Semua Paket" />
        <FilterSelect value={filterPromo} onChange={setFilterPromo} options={promoOptions} placeholder="Semua Promo" />
        <FilterSelect value={filterStatus} onChange={setFilterStatus} options={statusOptions} placeholder="Semua Status" />
      </div>

      {/* --- Second Row: Date Filters --- */}
      <div className="flex flex-wrap items-end gap-3 border-t border-gray-200/60 pt-3">
        {/* Jenis Tanggal */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Acuan Tanggal</label>
          <FilterSelect 
            value={dateType} 
            onChange={setDateType} 
            options={[
              { value: "tanggalClosing", label: "Tanggal Closing" },
              { value: "waktuMulai", label: "Tanggal Mulai" },
              { value: "waktuBerakhir", label: "Tanggal Berakhir" },
            ]} 
            placeholder="Pilih Jenis Tanggal" 
          />
        </div>

        {/* Preset Range */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Rentang Cepat</label>
          <FilterSelect 
            value={presetRange} 
            onChange={setPresetRange} 
            options={["Semua", "Hari Ini", "Kemarin", "7 Hari Terakhir", "30 Hari Terakhir", "Bulan Ini", "Bulan Lalu", "Bulan Depan", "Tahun Ini", "Custom"]} 
            placeholder="Semua Waktu" 
          />
        </div>

        {/* Custom Range */}
        <div className="flex flex-col gap-1.5 flex-none">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Atur Manual (Dari - Sampai)</label>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-0.5 pr-2 focus-within:border-[#C92C1E] focus-within:ring-1 focus-within:ring-[#C92C1E]/20 transition-all">
            <input
              type="date"
              value={dateDari}
              onChange={(e) => setDateDari(e.target.value)}
              onBlur={onDateBlur}
              className="h-7 w-[110px] bg-transparent px-2 text-[11px] font-bold text-gray-700 outline-none"
            />
            <span className="text-[10px] font-black text-gray-300">-</span>
            <input
              type="date"
              value={dateSampai}
              onChange={(e) => setDateSampai(e.target.value)}
              onBlur={onDateBlur}
              className="h-7 w-[110px] bg-transparent px-2 text-[11px] font-bold text-gray-700 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
