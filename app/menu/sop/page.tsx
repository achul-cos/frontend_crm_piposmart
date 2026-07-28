"use client";

import React, { useState, useEffect } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

interface SopItem {
  id: number;
  tipe: string;
  label: string;
  keterangan: string;
  urutan: number;
}

export default function SopKelolaanPage() {
  usePageTitle("SOP");
  const [activeTab, setActiveTab] = useState<"klasifikasi" | "modul">("klasifikasi");
  // 🛠️ VERSI DUMMY FE: data dummy langsung tersedia di render pertama,
  // jadi loading selalu false (tidak ada delay jaringan yang perlu ditunggu).
  const [loading] = useState(false);

  // State Manajemen Data SOP Terintegrasi Komplit
  const [indikatorPotensi, setIndikatorPotensi] = useState<SopItem[]>([]);
  const [kewajibanBisnis, setKewajibanBisnis] = useState<SopItem[]>([]);
  const [indikatorTidakPotensi, setIndikatorTidakPotensi] = useState<SopItem[]>([]);
  const [todoSales, setTodoSales] = useState<SopItem[]>([]);
  const [todoCs, setTodoCs] = useState<SopItem[]>([]);
  const [modulCall, setModulCall] = useState<SopItem[]>([]);
  const [modulChat, setModulChat] = useState<SopItem[]>([]);
  const [reasons, setReasons] = useState<SopItem[]>([]);

  // 🛠️ VERSI DUMMY FE: tidak ada fetch ke backend sama sekali.
  // Semua data langsung diisi dari array default di bawah ini. Halaman ini
  // bersifat statis/read-only — tidak ada kemampuan tambah/edit/hapus.
  const initSopDataDummy = () => {
    setIndikatorPotensi([
          { id: 1, tipe: "potensi", label: "✓", keterangan: "Nasabah responsif dan interaktif selama masa trial.", urutan: 1 },
          { id: 2, tipe: "potensi", label: "✓", keterangan: "Terdapat rencana demo atau training lanjutan.", urutan: 2 },
          { id: 3, tipe: "potensi", label: "✓", keterangan: "Nasabah aktif membahas harga atau skema langganan aplikasi.", urutan: 3 },
          { id: 4, tipe: "potensi", label: "✓", keterangan: "Terjadi peningkatan transaksi selama masa penggunaan.", urutan: 4 },
          { id: 5, tipe: "potensi", label: "✓", keterangan: "Memberikan rekomendasi rekan atau mitra.", urutan: 5 },
          { id: 6, tipe: "potensi", label: "✓", keterangan: "Memiliki progres komunikasi yang mengarah pada closing.", urutan: 6 }
        ]);

        setKewajibanBisnis([
          { id: 101, tipe: "wajib_bisnis", label: "•", keterangan: "Melakukan follow up secara berkala dan terjadwal", urutan: 1 },
          { id: 102, tipe: "wajib_bisnis", label: "•", keterangan: "Mencatat perkembangan pada kolom call & chat", urutan: 2 },
          { id: 103, tipe: "wajib_bisnis", label: "•", keterangan: "Mengarahkan ke proses closing atau upgrade paket", urutan: 3 }
        ]);

        setIndikatorTidakPotensi([
          { id: 7, tipe: "tidak_potensi", label: "✕", keterangan: "Akun nasabah teridentifikasi sebagai akun testing atau akun karyawan.", urutan: 1 },
          { id: 8, tipe: "tidak_potensi", label: "✕", keterangan: "Telah dilakukan follow up maksimal 5 (lima) kali baik call maupun chat tanpa respons", urutan: 2 },
          { id: 9, tipe: "tidak_potensi", label: "✕", keterangan: "Status chat “centang 1” tanpa respons selama 2–3 hari berturut-turut", urutan: 3 },
          { id: 10, tipe: "tidak_potensi", label: "✕", keterangan: "Nasabah secara langsung meminta untuk tidak dihubungi kembali", urutan: 4 },
          { id: 11, tipe: "tidak_potensi", label: "✕", keterangan: "Nomor tidak aktif atau tidak dapat dihubungi selama 2–3 hari berturut-turut", urutan: 5 },
          { id: 12, tipe: "tidak_potensi", label: "✕", keterangan: "Menolak karena harga tidak sesuai setelah penawaran resmi diberikan", urutan: 6 },
          { id: 13, tipe: "tidak_potensi", label: "✕", keterangan: "Transaksi outlet tidak bertambah baik selama masa trial maupun setelah masa trial", urutan: 7 }
        ]);

        setTodoSales([
          { id: 14, tipe: "todo_sales", label: "1.", keterangan: "Follow up data kelolaan 50 data", urutan: 1 },
          { id: 15, tipe: "todo_sales", label: "2.", keterangan: "Follow up data nasabah new download - Project list & outlet", urutan: 2 },
          { id: 16, tipe: "todo_sales", label: "3.", keterangan: "Follow up data nasabah potensi", urutan: 3 },
          { id: 17, tipe: "todo_sales", label: "4.", keterangan: "Follow up data nasabah jatuh tempo", urutan: 4 },
          { id: 18, tipe: "todo_sales", label: "5.", keterangan: "Follow up mitra kelolaan", urutan: 5 },
          { id: 19, tipe: "todo_sales", label: "6.", keterangan: "Posting konten harian (Story WhatsApp)", urutan: 6 },
          { id: 20, tipe: "todo_sales", label: "7.", keterangan: "Posting konten di Instagram, Tiktok dan FB.", urutan: 7 },
          { id: 21, tipe: "todo_sales", label: "8.", keterangan: "Follow up nasabah yang belum memberikan rating & logo laundry", urutan: 8 },
          { id: 22, tipe: "todo_sales", label: "9.", keterangan: "Daily report follow up data kelolaan (WA Group)", urutan: 9 },
          { id: 23, tipe: "todo_sales", label: "10.", keterangan: "Daily report follow up data jatuh tempo (WA Group)", urutan: 10 },
          { id: 24, tipe: "todo_sales", label: "11.", keterangan: "Pengisian data kelolaan : Data kelolaan, report follow up, data kelolaan mitra, data kpi, report penjualan.", urutan: 11 }
        ]);

        setTodoCs([
          { id: 25, tipe: "todo_cs", label: "1.", keterangan: "Follow up data nasabah existing (Jatuh tempo & Berlangganan)", urutan: 1 },
          { id: 26, tipe: "todo_cs", label: "2.", keterangan: "Follow up data nasabah non-regustrasi akun (user temp)", urutan: 2 },
          { id: 27, tipe: "todo_cs", label: "3.", keterangan: "Follow up data nasabah unsubscribe", urutan: 3 }
        ]);

        setModulCall([
          { id: 28, tipe: "call", label: "1. Call Contacted", keterangan: "Telepon memanggil atau tidak tersambung dengan nomor atau nasabah yang dituju. Nomor tidak aktif, nomor diblokir.", urutan: 1 },
          { id: 29, tipe: "call", label: "2. Call Connected", keterangan: "Telepon masuk dan berdering tapi nasabah tidak merespon. Nomor nasabah aktif.", urutan: 2 },
          { id: 30, tipe: "call", label: "3. Call Engage", keterangan: "Nasabah mengangkat telepon tapi tidak ada percakapan lanjut (diputuskan sepihak), atau nasabah masih sibuk/sedang di jalan.", urutan: 3 },
          { id: 31, tipe: "call", label: "4. Call Interest", keterangan: "Nasabah tertarik dan masuk pembahasan lanjut mengenai penggunaan aplikasi, fitur-fitur, harga berlangganan, atau sudah ada gambaran paket.", urutan: 4 },
          { id: 32, tipe: "call", label: "5. Call Prospek", keterangan: "Nasabah potensi dan sudah sampai tahap training demo aplikasi melalui online meeting maupun visit ke laundry (Batam).", urutan: 5 },
          { id: 33, tipe: "call", label: "6. Call Uninterest", keterangan: "Nasabah tidak tertarik setelah ada percakapan lanjut (berat di harga, pakai aplikasi lain, atau fitur tidak sesuai).", urutan: 6 },
          { id: 34, tipe: "call", label: "7. No Call", keterangan: "Sales/CS tidak ada menelepon nasabah.", urutan: 7 }
        ]);

        setModulChat([
          { id: 35, tipe: "chat", label: "1. Chat Send", keterangan: "Chat ceklis 1 atau tidak terkirim. Nomor tidak aktif, nomor diblokir.", urutan: 1 },
          { id: 36, tipe: "chat", label: "2. Chat Delivered", keterangan: "Chat ceklis 2 atau terkirim tapi nasabah tidak merespon. Nomor nasabah aktif.", urutan: 2 },
          { id: 37, tipe: "chat", label: "3. Chat Engage", keterangan: "Nasabah membalas pesan tapi tidak ada percakapan lanjut (diputuskan sepihak), atau nasabah masih sibuk/sedang di jalan.", urutan: 3 },
          { id: 38, tipe: "chat", label: "4. Chat Interest", keterangan: "Nasabah tertarik dan masuk pembahasan lanjut mengenai penggunaan aplikasi, fitur-fitur, harga berlangganan, atau sudah ada gambaran paket.", urutan: 4 },
          { id: 39, tipe: "chat", label: "5. Chat Prospek", keterangan: "Nasabah potensi dan sudah sampai tahap training demo aplikasi melalui online meeting maupun visit ke laundry (Batam).", urutan: 5 },
          { id: 40, tipe: "chat", label: "6. Chat Uninterest", keterangan: "Nasabah tidak tertarik setelah ada percakapan lanjut (berat di harga, pakai aplikasi lain, atau fitur tidak sesuai).", urutan: 6 },
          { id: 41, tipe: "chat", label: "7. No Chat", keterangan: "Sales/CS tidak ada chat nasabah.", urutan: 7 }
        ]);

        setReasons([
          { id: 42, tipe: "reason", label: "01", keterangan: "Nomor sudah di blokir", urutan: 1 },
          { id: 43, tipe: "reason", label: "02", keterangan: "WA tidak aktif / ceklis 1 (2-3 hari)", urutan: 2 },
          { id: 44, tipe: "reason", label: "03", keterangan: "Nasabah meminta tidak dihubungi lagi", urutan: 3 }
        ]);
  };

  useEffect(() => {
    initSopDataDummy();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b-2 border-[#C92C1E] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
            <span>Menu</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">SOP</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Manajemen SOP</h1>
          <p className="mt-1 text-sm text-gray-500">Panduan master manajemen terpadu proses operasional internal PT PIPOSMART DIGITAL INDONESIA.</p>
        </div>
        </div>
      </div>

      {/* Tab Navigasi Utama */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit border border-gray-200/60">
        <button
          onClick={() => setActiveTab("klasifikasi")}
          className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer ${activeTab === "klasifikasi" ? "bg-white text-[#C92C1E] shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
        >
          Klasifikasi Nasabah & To Do List
        </button>
        <button
          onClick={() => setActiveTab("modul")}
          className={`px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer ${activeTab === "modul" ? "bg-white text-[#C92C1E] shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
        >
          Modul Call & Chat CS
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24 font-bold text-sm text-gray-400 animate-pulse">Menghubungkan ke master database SOP pusat...</div>
      ) : (
        <>
          {/* TAB 1: KLASIFIKASI NASABAH & TO DO LIST */}
          {activeTab === "klasifikasi" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

              {/* KOLOM KIRI: KELOLAAN KLASIFIKASI NASABAH */}
              <div className="xl:col-span-7 space-y-6">

                {/* Card Nasabah Potensi */}
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                  <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100">
                    <h2 className="text-base font-black text-emerald-800">Kategori Nasabah Potensi</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-[13px] text-gray-500 font-medium leading-relaxed">Nasabah dapat dikategorikan sebagai **Nasabah Potensi** apabila memenuhi indikator berikut:</p>
                    <ul className="space-y-2.5 text-[13px] font-semibold text-gray-600">
                      {indikatorPotensi.map((item) => (
                        <li key={item.id} className="flex items-start gap-2.5 p-1 rounded-lg">
                          <span className="text-emerald-600 mt-0.5 shrink-0">{item.label}</span>
                          <span className="flex-1">{item.keterangan}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="bg-red-50/40 p-4 rounded-xl border border-red-100 mt-4">
                      <span className="text-[11px] font-black text-[#C92C1E] uppercase block mb-2">Untuk nasabah potensi, tim bisnis wajib:</span>
                      <ul className="space-y-1.5 text-[12px] text-gray-600 font-semibold leading-relaxed">
                        {kewajibanBisnis.map((item) => (
                          <li key={item.id} className="flex items-start gap-2">
                            <span className="text-[#C92C1E] shrink-0">{item.label}</span>
                            <span className="flex-1">{item.keterangan}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Card Nasabah Tidak Potensi */}
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                  <div className="bg-rose-50 px-6 py-4 border-b border-rose-100">
                    <h2 className="text-base font-black text-rose-800">Kategori Nasabah Tidak Potensi (Ditarik)</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-[13px] text-gray-500 font-medium leading-relaxed">Nasabah ditarik dari daftar aktif apabila memenuhi kriteria berikut:</p>
                    <ul className="space-y-2.5 text-[13px] font-semibold text-gray-600">
                      {indikatorTidakPotensi.map((item) => (
                        <li key={item.id} className="flex items-start gap-2.5 p-1 rounded-lg">
                          <span className="text-rose-600 mt-0.5 shrink-0">{item.label}</span>
                          <span className="flex-1">{item.keterangan}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>

              {/* KOLOM KANAN: TO DO LIST SALES & CS */}
              <div className="xl:col-span-5 bg-white border border-gray-200/80 rounded-3xl shadow-sm overflow-hidden p-6 space-y-5">
                <div className="text-center bg-amber-50 border border-amber-200/60 p-3 rounded-2xl">
                  <h3 className="text-sm font-black text-amber-900 tracking-wide uppercase">To Do List Sales & CS</h3>
                </div>

                {/* Seksi Team Sales */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-gray-700 flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">Tim Sales</h4>
                  <div className="divide-y divide-gray-100 pl-1">
                    {todoSales.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-start gap-3 text-[12.5px] font-semibold text-gray-600 rounded-lg px-1">
                        <span className="font-bold text-[#C92C1E] shrink-0">{item.label}</span>
                        <span className="flex-1 leading-relaxed">{item.keterangan}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seksi Team CS */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-gray-700 flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">Tim CS</h4>
                  <div className="divide-y divide-gray-100 pl-1">
                    {todoCs.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-start gap-3 text-[12.5px] font-semibold text-gray-600 rounded-lg px-1">
                        <span className="font-bold text-[#C92C1E] shrink-0">{item.label}</span>
                        <span className="flex-1 leading-relaxed">{item.keterangan}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MODUL CALL & CHAT CS */}
          {activeTab === "modul" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Modul Call */}
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-base font-black text-gray-800">Modul Call CS</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {modulCall.map((item) => (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row items-start gap-4 rounded-lg">
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-[13px] flex-1 w-full">
                          <div className="sm:w-1/3 shrink-0 font-bold text-[#C92C1E]">{item.label}</div>
                          <div className="text-gray-600 font-semibold leading-relaxed flex-1">{item.keterangan}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modul Chat */}
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-base font-black text-gray-800">Modul Chat CS</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {modulChat.map((item) => (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row items-start gap-4 rounded-lg">
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-[13px] flex-1 w-full">
                          <div className="sm:w-1/3 shrink-0 font-bold text-[#C92C1E]">{item.label}</div>
                          <div className="text-gray-600 font-semibold leading-relaxed flex-1">{item.keterangan}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Alasan Pemblokiran */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
                <h3 className="text-base font-black text-rose-800 flex items-center gap-1.5 mb-3">
                  <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Alasan Utama Label "No Call / No Chat" (Reason)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {reasons.map((item) => (
                    <div key={item.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center relative">
                      <span className="text-lg font-bold text-gray-800 block">{item.label}</span>
                      <span className="text-[12px] text-gray-600 font-semibold mt-1 block">{item.keterangan}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
