"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from "recharts";

interface ReportItem {
  id: number;
  bulan: string;
  tanggal: string;
  pic: string;
  totalRespon: number;
  totalNoRespon: number;
  grandTotal: number;
}

const ALL_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function LandingDashboard() {
  const [totalKelolaan, setTotalKelolaan] = useState<string>("Loading...");
  const [totalReportLog, setTotalReportLog] = useState<string>("Loading...");
  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const [loadingCharts, setLoadingCharts] = useState<boolean>(true);
  
  const [loggedInUser, setLoggedInUser] = useState<string>("Satria");
  const [userRole, setUserRole] = useState<string>("Sales");

  const currentYear = new Date().getFullYear();
  const [startMonth, setStartMonth] = useState("Januari");
  const [endMonth, setEndMonth] = useState("Desember");

  // Ambil data session user
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPic = localStorage.getItem("user_pic");
      const savedRole = localStorage.getItem("user_role");
      if (savedPic) setLoggedInUser(savedPic.split(" ")[0]);
      if (savedRole) setUserRole(savedRole);
    }
  }, []);

  // Fetch statistik gabungan secara Real-Time dari Backend Go kamu
  const fetchDashboardStats = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    try {
      setLoadingCharts(true);
      
      // 1. Ambil data Kelolaan Akun
      const resKelolaan = await fetch(`${baseUrl}/api/kelolaan`);
      if (resKelolaan.ok) {
        const data = await resKelolaan.json();
        setTotalKelolaan(`${data?.length || 0} Akun`);
      } else {
        setTotalKelolaan("0 Akun");
      }

      // 2. Ambil data Report Log Harian
      const resReport = await fetch(`${baseUrl}/api/report`);
      if (resReport.ok) {
        const data = await resReport.json();
        setReportData(data || []);
        setTotalReportLog(`${data?.length || 0} Log Aktivitas`);
      } else {
        setTotalReportLog("0 Log");
      }
    } catch (error) {
      setTotalKelolaan("Offline");
      setTotalReportLog("Offline");
    } finally {
      setLoadingCharts(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Filter bulan aktif berdasarkan pilihan user
  const visibleMonths = useMemo(() => {
    const startIdx = ALL_MONTHS.indexOf(startMonth);
    const endIdx = ALL_MONTHS.indexOf(endMonth);
    if (startIdx <= endIdx) return ALL_MONTHS.slice(startIdx, endIdx + 1);
    return ALL_MONTHS.slice(endIdx, startIdx + 1);
  }, [startMonth, endMonth]);

  // Agregasi Data Grafik Batang: Akumulasi per-bulan dari log report
  const dataGrafikBar = useMemo(() => {
    const rekap: Record<string, { name: string; "Respon Positif": number; "Tidak Merespon": number }> = {};
    
    visibleMonths.forEach(m => {
      rekap[m] = { name: m, "Respon Positif": 0, "Tidak Merespon": 0 };
    });

    reportData.forEach((item: any) => {
      const bln = item.bulan || "Januari";
      if (rekap[bln]) {
        rekap[bln]["Respon Positif"] += item.totalRespon || 0;
        rekap[bln]["Tidak Merespon"] += item.totalNoRespon || 0;
      }
    });

    return Object.values(rekap);
  }, [reportData, visibleMonths]);

  // Hitung total akumulasi untuk box summary atas
  const akumulasiMetriks = useMemo(() => {
    let totalRespon = 0;
    let totalNoRespon = 0;
    reportData.forEach((item: any) => {
      if (visibleMonths.includes(item.bulan)) {
        totalRespon += item.totalRespon || 0;
        totalNoRespon += item.totalNoRespon || 0;
      }
    });
    return { totalRespon, totalNoRespon };
  }, [reportData, visibleMonths]);

  return (
    <div className="space-y-8 bg-[#FAF9F6] min-h-screen text-[#1C1C1E]">
      
      {/* WELCOME BANNER LANDING */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">CRM Pusat Kontrol</h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">PT. PIPOSMART DIGITAL INDONESIA • Panel Utama Monitoring Data Kelolaan & Kinerja Lapangan.</p>
          <div className="text-xs text-gray-400 font-bold mt-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Logged in: <span className="text-sm font-black text-[#C92C1E]">{loggedInUser}</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full border border-red-100 bg-red-50 text-[#C92C1E] uppercase">{userRole}</span>
          </div>
        </div>

        {/* CONTROLLER FILTER TREN BULANAN */}
        <div className="flex items-center gap-2 bg-[#F2F2F7] p-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 w-full lg:w-auto justify-between lg:justify-end">
          <span className="text-[10px] font-black text-gray-400 uppercase ml-1">Tren Visual:</span>
          <div className="flex items-center gap-1.5">
            <select value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="bg-white border rounded p-1 text-gray-700 focus:outline-none cursor-pointer">
              {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="text-gray-400 font-medium">s/d</span>
            <select value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="bg-white border rounded p-1 text-gray-700 focus:outline-none cursor-pointer">
              {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* METRICS CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/menu/data-kelolaan" className="block group bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:border-gray-400 transition-all">
          <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Data Kelolaan</dt>
          <dd className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 group-hover:text-[#C92C1E] transition-colors">{totalKelolaan}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 rounded text-gray-600">Database Profil</span>
          </dd>
        </Link>

        <Link href="/menu/report" className="block group bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:border-gray-400 transition-all">
          <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider">Aktivitas Laporan Harian</dt>
          <dd className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900 group-hover:text-[#C92C1E] transition-colors">{totalReportLog}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 rounded text-gray-600">Log Terinput</span>
          </dd>
        </Link>

        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider">Respon Positif Terakumulasi</dt>
          <dd className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">{akumulasiMetriks.totalRespon} Call/Chat</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">Closing Leads</span>
          </dd>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Mengabaikan (No Respon)</dt>
          <dd className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-red-600">{akumulasiMetriks.totalNoRespon} Tele-log</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-700 rounded">Dropped/Pending</span>
          </dd>
        </div>
      </div>

      {/* TREN GRAFIK UTAMA */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col space-y-4">
        <div>
          <h3 className="text-md font-black uppercase tracking-tight text-gray-900">📊 Grafik Tren Efektivitas Tele-Marketing Tim Hunter ({currentYear})</h3>
          <p className="text-[11px] text-gray-400 font-medium">Visualisasi perbandingan volume calon nasabah yang merespon positif vs tidak merespon di setiap bulan buku.</p>
        </div>

        <div className="w-full h-80">
          {loadingCharts ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm font-bold animate-pulse">Memuat matriks tren analitik...</div>
          ) : dataGrafikBar.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">Tidak ada rekaman log aktivitas pada periode bulan terpilih.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataGrafikBar} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#1C1C1E" style={{ fontSize: "11px", fontWeight: "bold" }} />
                <YAxis stroke="#8E8E93" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
                <Bar dataKey="Respon Positif" fill="#34C759" radius={[4, 4, 0, 0]} maxBarSize={25} />
                <Bar dataKey="Tidak Merespon" fill="#C92C1E" radius={[4, 4, 0, 0]} maxBarSize={25} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 🧭 AKSES DIRECT QUICK NAVIGASI */}
      <div className="space-y-4">
        <h3 className="text-md font-black uppercase tracking-tight text-gray-900">🧭 Akses Cepat Menu Utama</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/menu/data-kelolaan" className="group block border border-gray-200 rounded-2xl p-5 bg-white shadow-sm hover:border-[#C92C1E] transition-all">
            <div className="w-9 h-9 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h4 className="font-bold text-[#1D1D1F] group-hover:text-[#C92C1E] transition-colors text-sm uppercase">Kelola Database Utama</h4>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">Kelola profil data kemitraan, bank kualifikasi, filter wilayah, dan kelengkapan email legalitas.</p>
          </Link>

          <Link href="/menu/report" className="group block border border-gray-200 rounded-2xl p-5 bg-white shadow-sm hover:border-[#C92C1E] transition-all">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#C92C1E] flex items-center justify-center mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h4 className="font-bold text-[#1D1D1F] group-hover:text-[#C92C1E] transition-colors text-sm uppercase">Buka Log Perform Report</h4>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">Buka tabel log performa tele-marketing harian, import matriks berkas Excel massal, atau tambah data manual.</p>
          </Link>
        </div>
      </div>

    </div>
  );
}