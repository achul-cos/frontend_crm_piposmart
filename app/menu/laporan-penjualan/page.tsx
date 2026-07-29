"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Download, FileSpreadsheet, FileText, RotateCcw } from "lucide-react";

import { SalesTransaction } from "./types";
import { generateDummyTransactions, differenceInDays, getPresetDateRange } from "./utils";
import { LIST_PIC } from "../lead/dummy/page";
import { INITIAL_PAKETS, INITIAL_MASTER_PROMOS } from "@/app/lib/paket-langganan-data";

import FilterCard from "./components/FilterCard";
import TransactionTable from "./components/TransactionTable";
import TransactionTableSkeleton from "./components/TransactionTableSkeleton";
import TransactionDetailDrawer from "./components/TransactionDetailDrawer";
import Pagination from "./components/Pagination";
import AnalyticsTab from "./AnalyticsTab";

export default function LaporanPenjualanPage() {
  const [activeTab, setActiveTab] = useState<"report" | "analytics">("report");
  const [selectedTrx, setSelectedTrx] = useState<SalesTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Header Filter States (Checklists / Arrays)
  const [search, setSearch] = useState("");
  const [filterPic, setFilterPic] = useState("");
  const [filterPaket, setFilterPaket] = useState("");
  const [filterPromo, setFilterPromo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Date Filter States
  const [dateType, setDateType] = useState("tanggalClosing");
  const [presetRange, setPresetRange] = useState("Semua");
  const [dateDari, setDateDari] = useState("");
  const [dateSampai, setDateSampai] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const transactions = useMemo(() => generateDummyTransactions(), []);

  // Reset promo filter when paket filter changes to prevent invalid promo selection
  useEffect(() => {
    setFilterPromo("");
  }, [filterPaket]);

  // Handlers for Date Changes
  useEffect(() => {
    if (presetRange !== "Custom" && presetRange !== "Semua") {
      const [dari, sampai] = getPresetDateRange(presetRange);
      setDateDari(dari);
      setDateSampai(sampai);
    } else if (presetRange === "Semua") {
      setDateDari("");
      setDateSampai("");
    }
  }, [presetRange]);

  const handleDateDariChange = (val: string) => {
    setDateDari(val);
    setPresetRange("Custom");
  };

  const handleDateSampaiChange = (val: string) => {
    setDateSampai(val);
    setPresetRange("Custom");
  };

  const handleDateBlur = () => {
    if (dateDari && dateSampai && dateDari > dateSampai) {
      const temp = dateDari;
      setDateDari(dateSampai);
      setDateSampai(temp);
    }
  };

  // Reset page to 1 when any filter changes
  React.useEffect(() => {
    setPage(1);
  }, [search, filterPic, filterPaket, filterPromo, filterStatus, dateDari, dateSampai, dateType]);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setFilterPic("");
    setFilterPaket("");
    setFilterPromo("");
    setFilterStatus("");
    setDateType("tanggalClosing");
    setPresetRange("Semua");
    setDateDari("");
    setDateSampai("");
    setPage(1);
  }, []);

  // Filter & Sort data
  const filteredAndSorted = useMemo(() => {
    const today = new Date();
    let data = [...transactions];



    // 2. Apply Header Filters
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (t) =>
          t.customerName.toLowerCase().includes(q) ||
          t.kodeOwner.toLowerCase().includes(q)
      );
    }
    if (filterPic) data = data.filter((t) => t.pic === filterPic);
    if (filterPaket) data = data.filter((t) => t.snapshot.paketId === filterPaket);
    if (filterPromo) data = data.filter((t) => t.snapshot.promoId === filterPromo);
    if (filterStatus) data = data.filter((t) => t.statusBerlangganan === filterStatus);

    // 3. Date Range Filter
    if (dateDari || dateSampai) {
      data = data.filter((t) => {
        let targetDate = t.tanggalClosing;
        if (dateType === "waktuMulai") targetDate = t.waktuMulai;
        else if (dateType === "waktuBerakhir") targetDate = t.waktuBerakhir;
        
        const target = targetDate.split("T")[0]; // ensure YYYY-MM-DD
        
        let isValid = true;
        if (dateDari) isValid = isValid && (target >= dateDari);
        if (dateSampai) isValid = isValid && (target <= dateSampai);
        
        return isValid;
      });
    }

    // 4. Sorting
    // Sort by Tanggal Closing DESC
    data.sort((a, b) => new Date(b.tanggalClosing).getTime() - new Date(a.tanggalClosing).getTime());

    return data;
  }, [transactions, search, filterPic, filterPaket, filterPromo, filterStatus, dateDari, dateSampai, dateType]);

  // Filter options mapping
  const picOptions = LIST_PIC.filter((p: string) => p.includes("(Sales)"));
  const paketOptions = useMemo(() => INITIAL_PAKETS.map((p) => ({ value: p.id, label: p.namaPaket })), []);
  const promoOptions = useMemo(() => {
    let promos = INITIAL_MASTER_PROMOS;
    if (filterPaket) {
      promos = promos.filter((p) => p.paketId === filterPaket);
    }
    return promos.map((p) => ({ value: p.id, label: p.namaPromo }));
  }, [filterPaket]);
  const statusOptions = [{ value: "Aktif", label: "Aktif" }, { value: "Expired", label: "Expired" }];

  // Initial loading simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Pagination Logic
  const totalPages = Math.ceil(filteredAndSorted.length / rowsPerPage) || 1;
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredAndSorted.slice(start, start + rowsPerPage);
  }, [filteredAndSorted, safePage, rowsPerPage]);

  return (
    <div className="space-y-4 font-sans text-[#1C1C1E] p-4">
      {/* === PAGE HEADER === */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#C92C1E]">
              Menu
            </p>
            <h1 className="text-2xl font-black text-gray-950">Laporan Penjualan</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-500 shadow-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          {transactions.filter(t => t.statusBerlangganan !== "Expired").length} langganan aktif · {transactions.length} total transaksi
        </div>
      </div>

      <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="flex text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={`rounded-lg px-5 py-2.5 transition-all ${
              activeTab === "report"
                ? "bg-white text-[#C92C1E] shadow-sm"
                : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
            }`}
          >
            Laporan Penjualan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`rounded-lg px-5 py-2.5 transition-all ${
              activeTab === "analytics"
                ? "bg-white text-[#C92C1E] shadow-sm"
                : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
            }`}
          >
            Analitik 14g5
          </button>
        </div>
      </div>

      {activeTab === "report" ? (
        <>
      {/* === TOOLBAR === */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end mb-2">
        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4 text-gray-400" />
            Reset Filter
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export
          </button>
        </div>
      </div>

      {/* === TABLE CARD === */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <FilterCard
          search={search}
          setSearch={setSearch}
          filterPic={filterPic}
          setFilterPic={setFilterPic}
          filterPaket={filterPaket}
          setFilterPaket={setFilterPaket}
          filterPromo={filterPromo}
          setFilterPromo={setFilterPromo}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          picOptions={picOptions}
          paketOptions={paketOptions}
          promoOptions={promoOptions}
          statusOptions={[
            { value: "New", label: "New" },
            { value: "Berlangganan", label: "Berlangganan" },
            { value: "Jatuh Tempo", label: "Jatuh Tempo" },
            { value: "Expired", label: "Expired" }
          ]}
          dateType={dateType}
          setDateType={setDateType}
          presetRange={presetRange}
          setPresetRange={setPresetRange}
          dateDari={dateDari}
          setDateDari={handleDateDariChange}
          dateSampai={dateSampai}
          setDateSampai={handleDateSampaiChange}
          onDateBlur={handleDateBlur}
        />

        {isLoading ? (
          <TransactionTableSkeleton />
        ) : (
          <TransactionTable
            filtered={paginated}
            setSelectedTrx={setSelectedTrx}
            startIndex={(safePage - 1) * rowsPerPage}
          />
        )}

        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filteredAndSorted.length}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </div>

      {/* === DETAIL DRAWER === */}
      <TransactionDetailDrawer
        selectedTrx={selectedTrx}
        setSelectedTrx={setSelectedTrx}
      />
        </>
      ) : (
        <AnalyticsTab />
      )}
    </div>
  );
}
