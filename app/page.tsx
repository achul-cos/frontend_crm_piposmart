"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

type NasabahItem = {
  no: number;
  pic?: string;
  tanggalFu?: string;
  tanggalDibagikan?: string;
  createDateProject?: string;
  statusAkun?: string;
  callStatus?: string;
  chatStatus?: string;
  remarks?: string;
  scor?: number;
  nominal?: number;
  finalisasiClosing?: string;
  totalFu?: number;
};

const LIST_SKOR = [
  { value: "0", label: "Tidak Potensial" },
  { value: "1", label: "Kemungkinan Potensial" },
  { value: "2", label: "Potensial" },
  { value: "3", label: "Langganan" },
];

const getToday = () => new Date().toISOString().split("T")[0];

const getCustomerDate = (item: NasabahItem) => {
  return item.tanggalFu || item.createDateProject || item.tanggalDibagikan || "";
};

const formatRupiah = (value: number) => {
  if (!value) return "Rp0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCompactRupiah = (value: number) => {
  if (!value) return "Rp0";

  if (value >= 1_000_000_000) {
    return `Rp${(value / 1_000_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} M`;
  }

  if (value >= 1_000_000) {
    return `Rp${(value / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} Jt`;
  }

  if (value >= 1_000) {
    return `Rp${(value / 1_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })} Rb`;
  }

  return formatRupiah(value);
};

const getRoleBadgeClass = (role: string) => {
  if (role === "Developer") return "border-red-100 bg-red-50 text-[#C92C1E]";
  if (role === "Supervisor") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-gray-100 bg-gray-50 text-gray-600";
};

const canAccessAllData = (role: string) => {
  return role === "Developer" || role === "Supervisor" || role === "Admin";
};

const normalizePicName = (value?: string) => {
  return String(value || "")
    .replace(/\(.*?\)/g, "")
    .trim()
    .toLowerCase();
};

const isValidPicName = (value?: string) => {
  const normalized = normalizePicName(value);

  return (
    normalized !== "" &&
    normalized !== "invalid" &&
    normalized !== "no pic" &&
    normalized !== "nop ic" &&
    normalized !== "-"
  );
};

const SOP_READ_DELAY_SECONDS = 5;

export default function DashboardOverviewPage() {
  usePageTitle("Dashboard");
  const [dataNasabah, setDataNasabah] = useState<NasabahItem[]>([]);
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("Sales");
  const [isSopOpen, setIsSopOpen] = useState(false);
  const [isSopReady, setIsSopReady] = useState(false);
  const [sopCountdown, setSopCountdown] = useState(SOP_READ_DELAY_SECONDS);

  useEffect(() => {
    const cached = localStorage.getItem("piposmart_nasabah_data");
    const savedUserName = localStorage.getItem("piposmart_user_name");
    const savedUserRole = localStorage.getItem("piposmart_user_role");

    if (savedUserName) setUserName(savedUserName);
    if (savedUserRole) setUserRole(savedUserRole);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setDataNasabah(Array.isArray(parsed) ? parsed : []);
      } catch {
        setDataNasabah([]);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedUserName = localStorage.getItem("piposmart_user_name") || "User";
    const sopSeenKey = `piposmart_sop_seen_${savedUserName}`;
    const hasSeenSopThisLogin = sessionStorage.getItem(sopSeenKey);

    if (!hasSeenSopThisLogin) {
      setIsSopOpen(true);
      setIsSopReady(false);
      setSopCountdown(SOP_READ_DELAY_SECONDS);
    }
  }, []);

  useEffect(() => {
    if (!isSopOpen) return;

    setIsSopReady(false);
    setSopCountdown(SOP_READ_DELAY_SECONDS);

    const countdownTimer = window.setInterval(() => {
      setSopCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(countdownTimer);
          setIsSopReady(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(countdownTimer);
  }, [isSopOpen]);

  const handleCloseSop = () => {
    if (!isSopReady) return;

    if (typeof window !== "undefined") {
      const savedUserName = localStorage.getItem("piposmart_user_name") || "User";
      const sopSeenKey = `piposmart_sop_seen_${savedUserName}`;
      sessionStorage.setItem(sopSeenKey, "true");
    }

    setIsSopOpen(false);
  };

  const isAllAccess = canAccessAllData(userRole);

  const visibleData = useMemo(() => {
    if (isAllAccess) return dataNasabah;

    const normalizedUserName = normalizePicName(userName);

    return dataNasabah.filter((item) => {
      const normalizedPic = normalizePicName(item.pic);

      return (
        normalizedPic === normalizedUserName ||
        normalizedPic.includes(normalizedUserName) ||
        normalizedUserName.includes(normalizedPic)
      );
    });
  }, [dataNasabah, isAllAccess, userName]);

  const stats = useMemo(() => {
    const today = getToday();

    const todayCustomers = visibleData.filter((item) => getCustomerDate(item) === today);
    const prospectCustomers = visibleData.filter((item) => String(item.remarks ?? item.scor ?? "0") === "2");
    const closingCustomers = visibleData.filter((item) => String(item.remarks ?? item.scor ?? "0") === "3");
    const contactedCustomers = visibleData.filter((item) => item.callStatus === "CONTACTED");
    const pendingFollowUp = visibleData.filter(
      (item) =>
        item.callStatus === "PENDING" ||
        item.chatStatus === "PENDING" ||
        item.callStatus === "NO CALL",
    );

    const totalFollowUp = visibleData.reduce(
      (total, item) => total + Number(item.totalFu || 0),
      0,
    );

    const totalClosing = visibleData.reduce(
      (total, item) => total + Number(item.nominal || 0),
      0,
    );

    const picSummary = visibleData.reduce<Record<string, number>>((result, item) => {
      if (!isValidPicName(item.pic)) return result;

      const pic = item.pic || "-";
      result[pic] = (result[pic] || 0) + 1;
      return result;
    }, {});

    const topPic = Object.entries(picSummary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const allFollowUpRanking = Object.entries(
      dataNasabah.reduce<Record<string, { totalFollowUp: number; contacted: number }>>(
        (result, item) => {
          if (!isValidPicName(item.pic)) return result;

          const pic = item.pic || "-";

          if (!result[pic]) {
            result[pic] = {
              totalFollowUp: 0,
              contacted: 0,
            };
          }

          result[pic].totalFollowUp += Number(item.totalFu || 0);

          if (item.callStatus === "CONTACTED") {
            result[pic].contacted += 1;
          }

          return result;
        },
        {},
      ),
    )
      .map(([pic, value]) => ({
        pic,
        totalFollowUp: value.totalFollowUp,
        contacted: value.contacted,
      }))
      .sort((a, b) => b.totalFollowUp - a.totalFollowUp);

    const currentUserRankIndex = allFollowUpRanking.findIndex(
      (item) => normalizePicName(item.pic) === normalizePicName(userName),
    );

    const currentUserRanking =
      currentUserRankIndex >= 0
        ? {
            ...allFollowUpRanking[currentUserRankIndex],
            rank: currentUserRankIndex + 1,
          }
        : null;

    const followUpRanking = allFollowUpRanking.slice(0, 5).map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    const isCurrentUserInTopFive =
      currentUserRanking !== null &&
      followUpRanking.some(
        (item) => normalizePicName(item.pic) === normalizePicName(userName),
      );

    const visibleFollowUpRanking =
      !isAllAccess && currentUserRanking && !isCurrentUserInTopFive
        ? [...followUpRanking.slice(0, 4), currentUserRanking]
        : followUpRanking;

    const skorSummary = LIST_SKOR.map((skor) => ({
      ...skor,
      total: visibleData.filter(
        (item) => String(item.remarks ?? item.scor ?? "0") === skor.value,
      ).length,
    }));

    return {
      totalCustomer: visibleData.length,
      todayCustomer: todayCustomers.length,
      prospectCustomers: prospectCustomers.length,
      closingCustomers: closingCustomers.length,
      contactedCustomers: contactedCustomers.length,
      pendingFollowUp: pendingFollowUp.length,
      totalFollowUp,
      totalClosing,
      topPic,
      followUpRanking: visibleFollowUpRanking,
      skorSummary,
    };
  }, [visibleData]);

  const cardItems = [
    {
      title: isAllAccess ? "Total Customer" : "Total Input Saya",
      value: stats.totalCustomer,
      desc: isAllAccess ? "Seluruh data kelolaan tim" : `Data dengan PIC ${userName}`,
    },
    {
      title: "Customer Hari Ini",
      value: stats.todayCustomer,
      desc: "Berdasarkan tanggal FU / dibuat",
    },
    {
      title: "Potensial",
      value: stats.prospectCustomers,
      desc: "Customer skor potensial",
    },
    {
      title: "Langganan",
      value: stats.closingCustomers,
      desc: "Customer skor langganan",
    },
  ];

  return (
    <>
      {isSopOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 p-4">
          <div className="relative my-4 flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-red-100 bg-white shadow-2xl sm:rounded-[24px]">
            <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#C92C1E]/10" />
            <div className="absolute -bottom-24 -left-24 h-60 w-60 rounded-full bg-orange-100/70" />

            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#C92C1E] via-[#E54837] to-[#FF8A65] px-4 py-4 text-white sm:px-5">
              <div className="absolute right-6 top-6 hidden h-20 w-20 rounded-[24px] border border-white/20 bg-white/10 md:block" />
              <div className="absolute right-12 top-12 hidden h-9 w-9 rounded-2xl bg-white/20 md:block" />

              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] sm:text-[11px]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    SOP Operasional CRM
                  </div>

                  <h2 className="text-lg font-black leading-tight tracking-tight sm:text-xl">
                    Baca SOP Sebelum Masuk Dashboard
                  </h2>

                  <p className="mt-1.5 max-w-xl text-[11px] font-medium leading-5 text-white/85 sm:text-xs">
                    Pahami klasifikasi owner, kewajiban follow up, to do list, serta modul call & chat sebelum mulai mengelola data.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseSop}
                  disabled={!isSopReady}
                  className="w-full shrink-0 rounded-2xl bg-white/15 px-4 py-2 text-xs font-black text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  {isSopReady ? "Tutup" : `${sopCountdown}s`}
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="min-w-0 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-3.5 shadow-sm sm:rounded-2xl">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-xs font-black text-white sm:h-9 sm:w-9 sm:text-xs">01</div>
                  <h3 className="text-xs font-black text-gray-900">Kategori Owner Potensi</h3>
                  <p className="mt-1.5 text-[11px] font-bold leading-4 text-gray-500">
                    Owner responsif, aktif membahas harga/paket, ada rencana demo atau training, transaksi meningkat, dan progres mengarah ke closing.
                  </p>
                </div>

                <div className="min-w-0 rounded-xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-3.5 shadow-sm sm:rounded-2xl">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#C92C1E] text-xs font-black text-white sm:h-9 sm:w-9 sm:text-xs">02</div>
                  <h3 className="text-xs font-black text-gray-900">Kewajiban Tim Bisnis</h3>
                  <p className="mt-1.5 text-[11px] font-bold leading-4 text-gray-500">
                    Follow up berkala, catat perkembangan pada kolom call & chat, lalu arahkan owner ke proses closing atau upgrade paket.
                  </p>
                </div>

                <div className="min-w-0 rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-3.5 shadow-sm sm:rounded-2xl">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-xs font-black text-white sm:h-9 sm:w-9 sm:text-xs">03</div>
                  <h3 className="text-xs font-black text-gray-900">Kategori Tidak Potensi</h3>
                  <p className="mt-1.5 text-[11px] font-bold leading-4 text-gray-500">
                    Tarik dari daftar aktif jika akun testing/karyawan, follow up maksimal 5 kali tanpa respons, WA centang 1 selama 2–3 hari, nomor tidak aktif, atau owner meminta tidak dihubungi.
                  </p>
                </div>

                <div className="min-w-0 rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-3.5 shadow-sm sm:rounded-2xl">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-xs font-black text-white sm:h-9 sm:w-9 sm:text-xs">04</div>
                  <h3 className="text-xs font-black text-gray-900">To Do List Sales</h3>
                  <p className="mt-1.5 text-[11px] font-bold leading-4 text-gray-500">
                    Follow up 50 data kelolaan, new download, owner potensi, data jatuh tempo, mitra kelolaan, rating/logo laundry, dan kirim daily report ke WA Group.
                  </p>
                </div>

                <div className="min-w-0 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-3.5 shadow-sm sm:rounded-2xl">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-xs font-black text-white sm:h-9 sm:w-9 sm:text-xs">05</div>
                  <h3 className="text-xs font-black text-gray-900">To Do List CS</h3>
                  <p className="mt-1.5 text-[11px] font-bold leading-4 text-gray-500">
                    Follow up owner existing, data jatuh tempo, berlangganan, akun non-registrasi atau user temp, serta owner unsubscribe.
                  </p>
                </div>

                <div className="min-w-0 rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-3.5 shadow-sm sm:rounded-2xl">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500 text-xs font-black text-white sm:h-9 sm:w-9 sm:text-xs">06</div>
                  <h3 className="text-xs font-black text-gray-900">Modul Call & Chat</h3>
                  <p className="mt-1.5 max-w-full break-words text-[11px] font-bold leading-4 text-gray-500">
                    Gunakan status call dan chat sesuai kondisi: contacted, connected, engage, interest, prospek, uninterest, no call, send, delivered, dan no chat.
                  </p>
                </div>

                <div className="min-w-0 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-3.5 shadow-sm sm:rounded-2xl sm:col-span-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-800 text-xs font-black text-white sm:h-9 sm:w-9 sm:text-xs">07</div>
                    <div>
                      <h3 className="text-xs font-black text-gray-900">Reason No Call / No Chat</h3>
                      <p className="mt-1.5 text-[11px] font-bold leading-4 text-gray-500">
                        Gunakan reason saat nomor diblokir, WA tidak aktif atau centang 1 selama 2–3 hari, dan owner meminta tidak dihubungi kembali. Jangan biarkan status kosong tanpa alasan yang jelas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-xl border border-red-100 bg-[#FFF8F6] p-4 sm:rounded-3xl sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-[#C92C1E]">Status Baca SOP</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-red-700">
                      Tombol akan aktif setelah countdown selesai. Pastikan isi SOP dipahami sebelum mulai mengelola data.
                    </p>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase text-gray-400">Countdown</p>
                    <p className="text-xl font-black text-[#C92C1E]">{sopCountdown}s</p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#C92C1E] to-[#FF8A65] transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        0,
                        ((SOP_READ_DELAY_SECONDS - sopCountdown) / SOP_READ_DELAY_SECONDS) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseSop}
                disabled={!isSopReady}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-3 text-xs font-black text-white shadow-lg shadow-red-100 transition hover:bg-[#A82216] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
              >
                {isSopReady ? (
                  <>
                    Saya Mengerti, Mulai Kerja
                    <span className="transition group-hover:translate-x-1">→</span>
                  </>
                ) : (
                  `Baca SOP dulu ${sopCountdown}s`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 font-sans text-[#1C1C1E]">
      <section className="overflow-hidden rounded-3xl border border-red-100 bg-white shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-[80px] bg-red-50" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getRoleBadgeClass(userRole)}`}>
                {userRole}
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-950">
                Dashboard Overview
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-gray-500">
                Halo {userName}, ini ringkasan performa data kelolaan CRM Piposmart.
                {isAllAccess
                  ? " Kamu memiliki akses untuk melihat seluruh data tim."
                  : " Akun Sales hanya melihat total data input dan follow up milik sendiri."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/menu/lead"
                className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white shadow-sm hover:bg-[#A82216]"
              >
                Buka Data Kelolaan
              </Link>


            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cardItems.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {item.title}
            </p>
            <p className="mt-3 text-3xl font-black text-gray-950">{item.value}</p>
            <p className="mt-1 text-xs font-medium text-gray-400">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <p className="text-xs font-black text-gray-900">
                Ringkasan Follow Up
              </p>
              <p className="text-xs font-medium text-gray-400">
                {isAllAccess
                  ? "Status call dan chat dari seluruh data customer."
                  : "Status call dan chat dari data customer milik kamu."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <p className="text-[10px] font-black uppercase text-emerald-700">
                Contacted
              </p>
              <p className="mt-2 truncate text-2xl font-black leading-tight text-emerald-700">
                {stats.contactedCustomers}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-amber-100 bg-amber-50/70 p-4">
              <p className="text-[10px] font-black uppercase text-amber-700">
                Pending Follow Up
              </p>
              <p className="mt-2 truncate text-2xl font-black leading-tight text-amber-700">
                {stats.pendingFollowUp}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="text-[10px] font-black uppercase text-blue-700">
                Total Follow Up
              </p>
              <p className="mt-2 truncate text-2xl font-black leading-tight text-blue-700">
                {stats.totalFollowUp}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-red-100 bg-red-50/60 p-4">
              <p className="text-[10px] font-black uppercase text-[#C92C1E]">
                Nominal Closing
              </p>
              <p
                className="mt-2 truncate text-2xl font-black leading-tight text-[#C92C1E]"
                title={formatRupiah(stats.totalClosing)}
              >
                {formatCompactRupiah(stats.totalClosing)}
              </p>
              <p className="mt-1 truncate text-[10px] font-bold text-red-400" title={formatRupiah(stats.totalClosing)}>
                {formatRupiah(stats.totalClosing)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black text-gray-900">Distribusi Skor</p>
          <p className="text-xs font-medium text-gray-400">
            {isAllAccess
              ? "Jumlah customer berdasarkan skor seluruh tim."
              : "Jumlah customer berdasarkan skor data kamu."}
          </p>

          <div className="mt-4 space-y-3">
            {stats.skorSummary.map((item) => (
              <div key={item.value}>
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>{item.label}</span>
                  <span>{item.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#C92C1E]"
                    style={{
                      width: `${stats.totalCustomer ? (item.total / stats.totalCustomer) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black text-gray-900">
              Peringkat Follow Up Sales
            </p>
            <p className="text-xs font-medium text-gray-400">
              Sales bisa melihat posisi mereka dengan jelas. User Invalid / No PIC tidak ditampilkan di peringkat ini.
              Angka yang ditampilkan adalah total follow up, bukan total seluruh data customer.
            </p>
          </div>
          <Link
            href="/menu/lead"
            className="text-xs font-black text-[#C92C1E] hover:underline"
          >
            Kelola customer →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {stats.followUpRanking.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs font-bold text-gray-400">
              Belum ada data follow up. Silakan input follow up terlebih dahulu.
            </div>
          ) : (
            stats.followUpRanking.map((item) => {
              const isMe = normalizePicName(item.pic) === normalizePicName(userName);

              return (
                <div
                  key={`${item.pic}-${item.rank}`}
                  className={`relative overflow-hidden rounded-xl border p-4 ${
                    isMe
                      ? "border-2 border-[#C92C1E] bg-red-50 shadow-md shadow-red-100"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                        item.rank === 1
                          ? "bg-[#C92C1E] text-white"
                          : isMe
                            ? "bg-white text-[#C92C1E]"
                            : "bg-white text-gray-500"
                      }`}
                    >
                      Rank #{item.rank}
                    </p>

                    {isMe && (
                      <span className="rounded-full bg-[#C92C1E] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                        Posisi Kamu
                      </span>
                    )}
                  </div>

                  <p className={`mt-3 truncate text-sm font-black ${isMe ? "text-[#C92C1E]" : "text-gray-900"}`}>
                    {item.pic}
                  </p>

                  <p className={`mt-2 text-4xl font-black leading-none ${isMe ? "text-[#C92C1E]" : "text-gray-900"}`}>
                    {item.totalFollowUp}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase text-gray-400">
                    Total Follow Up
                  </p>

                  <p className="mt-2 text-[11px] font-bold text-gray-500">
                    Contacted: {item.contacted}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>
      </div>
    </>
  );
}

function SopPoint({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "emerald" | "rose" | "amber" | "red" | "indigo";
}) {
  const toneClass = {
    emerald: {
      card: "border-emerald-100 bg-emerald-50/60",
      title: "text-emerald-800",
      dot: "bg-emerald-500",
    },
    rose: {
      card: "border-rose-100 bg-rose-50/70",
      title: "text-rose-800",
      dot: "bg-rose-500",
    },
    amber: {
      card: "border-amber-100 bg-amber-50/70",
      title: "text-amber-900",
      dot: "bg-amber-500",
    },
    red: {
      card: "border-red-100 bg-red-50/70",
      title: "text-[#C92C1E]",
      dot: "bg-[#C92C1E]",
    },
    indigo: {
      card: "border-indigo-100 bg-indigo-50/70",
      title: "text-indigo-800",
      dot: "bg-indigo-500",
    },
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${toneClass.card}`}>
      <p className={`text-sm font-black ${toneClass.title}`}>{title}</p>

      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs font-bold leading-5 text-gray-600">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneClass.dot}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}