"use client";

import { useState } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

interface SopItem {
  id: number;
  tipe: string;
  label: string;
  keterangan: string;
  urutan: number;
}

const INITIAL_SOP_DATA: {
  indikatorPotensi: SopItem[];
  kewajibanBisnis: SopItem[];
  indikatorTidakPotensi: SopItem[];
  todoSales: SopItem[];
  todoCs: SopItem[];
  modulCall: SopItem[];
  modulChat: SopItem[];
  reasons: SopItem[];
} = {
  indikatorPotensi: [
    { id: 1, tipe: "potensi", label: "✓", keterangan: "Nasabah responsif dan interaktif selama masa trial.", urutan: 1 },
    { id: 2, tipe: "potensi", label: "✓", keterangan: "Terdapat rencana demo atau training lanjutan.", urutan: 2 },
    { id: 3, tipe: "potensi", label: "✓", keterangan: "Nasabah aktif membahas harga atau skema langganan aplikasi.", urutan: 3 },
    { id: 4, tipe: "potensi", label: "✓", keterangan: "Terjadi peningkatan transaksi selama masa penggunaan.", urutan: 4 },
    { id: 5, tipe: "potensi", label: "✓", keterangan: "Memberikan rekomendasi rekan atau mitra.", urutan: 5 },
    { id: 6, tipe: "potensi", label: "✓", keterangan: "Memiliki progres komunikasi yang mengarah pada closing.", urutan: 6 },
  ],
  kewajibanBisnis: [
    { id: 101, tipe: "wajib_bisnis", label: "•", keterangan: "Melakukan follow up secara berkala dan terjadwal.", urutan: 1 },
    { id: 102, tipe: "wajib_bisnis", label: "•", keterangan: "Mencatat perkembangan pada kolom call dan chat.", urutan: 2 },
    { id: 103, tipe: "wajib_bisnis", label: "•", keterangan: "Mengarahkan ke proses closing atau upgrade paket.", urutan: 3 },
  ],
  indikatorTidakPotensi: [
    { id: 7, tipe: "tidak_potensi", label: "✕", keterangan: "Akun nasabah teridentifikasi sebagai akun testing atau akun karyawan.", urutan: 1 },
    { id: 8, tipe: "tidak_potensi", label: "✕", keterangan: "Telah dilakukan follow up maksimal 5 kali, baik call maupun chat, tanpa respons.", urutan: 2 },
    { id: 9, tipe: "tidak_potensi", label: "✕", keterangan: "Status chat “centang 1” tanpa respons selama 2–3 hari berturut-turut.", urutan: 3 },
    { id: 10, tipe: "tidak_potensi", label: "✕", keterangan: "Nasabah secara langsung meminta untuk tidak dihubungi kembali.", urutan: 4 },
    { id: 11, tipe: "tidak_potensi", label: "✕", keterangan: "Nomor tidak aktif atau tidak dapat dihubungi selama 2–3 hari berturut-turut.", urutan: 5 },
    { id: 12, tipe: "tidak_potensi", label: "✕", keterangan: "Menolak karena harga tidak sesuai setelah penawaran resmi diberikan.", urutan: 6 },
    { id: 13, tipe: "tidak_potensi", label: "✕", keterangan: "Transaksi outlet tidak bertambah baik selama masa trial maupun setelah masa trial.", urutan: 7 },
  ],
  todoSales: [
    { id: 14, tipe: "todo_sales", label: "1.", keterangan: "Follow up data kelolaan 50 data.", urutan: 1 },
    { id: 15, tipe: "todo_sales", label: "2.", keterangan: "Follow up data nasabah new download, project list, dan outlet.", urutan: 2 },
    { id: 16, tipe: "todo_sales", label: "3.", keterangan: "Follow up data nasabah potensi.", urutan: 3 },
    { id: 17, tipe: "todo_sales", label: "4.", keterangan: "Follow up data nasabah jatuh tempo.", urutan: 4 },
    { id: 18, tipe: "todo_sales", label: "5.", keterangan: "Follow up mitra kelolaan.", urutan: 5 },
    { id: 19, tipe: "todo_sales", label: "6.", keterangan: "Posting konten harian di story WhatsApp.", urutan: 6 },
    { id: 20, tipe: "todo_sales", label: "7.", keterangan: "Posting konten di Instagram, TikTok, dan Facebook.", urutan: 7 },
    { id: 21, tipe: "todo_sales", label: "8.", keterangan: "Follow up nasabah yang belum memberikan rating dan logo laundry.", urutan: 8 },
    { id: 22, tipe: "todo_sales", label: "9.", keterangan: "Daily report follow up data kelolaan ke WA Group.", urutan: 9 },
    { id: 23, tipe: "todo_sales", label: "10.", keterangan: "Daily report follow up data jatuh tempo ke WA Group.", urutan: 10 },
    { id: 24, tipe: "todo_sales", label: "11.", keterangan: "Pengisian data kelolaan: data kelolaan, report follow up, data kelolaan mitra, data KPI, dan report penjualan.", urutan: 11 },
  ],
  todoCs: [
    { id: 25, tipe: "todo_cs", label: "1.", keterangan: "Follow up data nasabah existing (jatuh tempo dan berlangganan).", urutan: 1 },
    { id: 26, tipe: "todo_cs", label: "2.", keterangan: "Follow up data nasabah non-registrasi akun (user temp).", urutan: 2 },
    { id: 27, tipe: "todo_cs", label: "3.", keterangan: "Follow up data nasabah unsubscribe.", urutan: 3 },
  ],
  modulCall: [
    { id: 28, tipe: "call", label: "1. Call Contacted", keterangan: "Telepon memanggil atau tidak tersambung dengan nomor atau nasabah yang dituju. Contoh: nomor tidak aktif atau nomor diblokir.", urutan: 1 },
    { id: 29, tipe: "call", label: "2. Call Connected", keterangan: "Telepon masuk dan berdering tetapi nasabah tidak merespons. Nomor nasabah aktif.", urutan: 2 },
    { id: 30, tipe: "call", label: "3. Call Engage", keterangan: "Nasabah mengangkat telepon tetapi tidak ada percakapan lanjut, misalnya diputus sepihak atau nasabah sedang sibuk.", urutan: 3 },
    { id: 31, tipe: "call", label: "4. Call Interest", keterangan: "Nasabah tertarik dan masuk pembahasan lanjut mengenai penggunaan aplikasi, fitur, harga berlangganan, atau sudah ada gambaran paket.", urutan: 4 },
    { id: 32, tipe: "call", label: "5. Call Prospek", keterangan: "Nasabah potensi dan sudah sampai tahap training demo aplikasi melalui online meeting maupun visit ke laundry.", urutan: 5 },
    { id: 33, tipe: "call", label: "6. Call Uninterest", keterangan: "Nasabah tidak tertarik setelah ada percakapan lanjut, misalnya keberatan harga, memakai aplikasi lain, atau fitur tidak sesuai.", urutan: 6 },
    { id: 34, tipe: "call", label: "7. No Call", keterangan: "Sales atau CS tidak melakukan panggilan ke nasabah.", urutan: 7 },
  ],
  modulChat: [
    { id: 35, tipe: "chat", label: "1. Chat Send", keterangan: "Chat centang 1 atau tidak terkirim. Contoh: nomor tidak aktif atau nomor diblokir.", urutan: 1 },
    { id: 36, tipe: "chat", label: "2. Chat Delivered", keterangan: "Chat centang 2 atau terkirim tetapi nasabah tidak merespons. Nomor nasabah aktif.", urutan: 2 },
    { id: 37, tipe: "chat", label: "3. Chat Engage", keterangan: "Nasabah membalas pesan tetapi tidak ada percakapan lanjut, misalnya diputus sepihak atau nasabah sedang sibuk.", urutan: 3 },
    { id: 38, tipe: "chat", label: "4. Chat Interest", keterangan: "Nasabah tertarik dan masuk pembahasan lanjut mengenai penggunaan aplikasi, fitur, harga berlangganan, atau sudah ada gambaran paket.", urutan: 4 },
    { id: 39, tipe: "chat", label: "5. Chat Prospek", keterangan: "Nasabah potensi dan sudah sampai tahap training demo aplikasi melalui online meeting maupun visit ke laundry.", urutan: 5 },
    { id: 40, tipe: "chat", label: "6. Chat Uninterest", keterangan: "Nasabah tidak tertarik setelah ada percakapan lanjut, misalnya keberatan harga, memakai aplikasi lain, atau fitur tidak sesuai.", urutan: 6 },
    { id: 41, tipe: "chat", label: "7. No Chat", keterangan: "Sales atau CS tidak melakukan chat ke nasabah.", urutan: 7 },
  ],
  reasons: [
    { id: 42, tipe: "reason", label: "01", keterangan: "Nomor sudah diblokir.", urutan: 1 },
    { id: 43, tipe: "reason", label: "02", keterangan: "WhatsApp tidak aktif atau centang 1 selama 2–3 hari.", urutan: 2 },
    { id: 44, tipe: "reason", label: "03", keterangan: "Nasabah meminta tidak dihubungi lagi.", urutan: 3 },
  ],
};

export default function SopKelolaanPage() {
  usePageTitle("SOP");

  const [activeTab, setActiveTab] = useState<"klasifikasi" | "modul">("klasifikasi");
  const [loading] = useState(false);
  const [indikatorPotensi] = useState<SopItem[]>(INITIAL_SOP_DATA.indikatorPotensi);
  const [kewajibanBisnis] = useState<SopItem[]>(INITIAL_SOP_DATA.kewajibanBisnis);
  const [indikatorTidakPotensi] = useState<SopItem[]>(INITIAL_SOP_DATA.indikatorTidakPotensi);
  const [todoSales] = useState<SopItem[]>(INITIAL_SOP_DATA.todoSales);
  const [todoCs] = useState<SopItem[]>(INITIAL_SOP_DATA.todoCs);
  const [modulCall] = useState<SopItem[]>(INITIAL_SOP_DATA.modulCall);
  const [modulChat] = useState<SopItem[]>(INITIAL_SOP_DATA.modulChat);
  const [reasons] = useState<SopItem[]>(INITIAL_SOP_DATA.reasons);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 border-b-2 border-[#C92C1E] p-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#C92C1E]">SOP</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Manajemen SOP</h1>
            <p className="mt-1 text-sm text-gray-500">
              Panduan master manajemen terpadu proses operasional internal PT PIPOSMART DIGITAL INDONESIA.
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-fit rounded-xl border border-gray-200/60 bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("klasifikasi")}
          className={`cursor-pointer rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-all ${
            activeTab === "klasifikasi" ? "bg-white text-[#C92C1E] shadow-sm" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Klasifikasi Nasabah & To Do List
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("modul")}
          className={`cursor-pointer rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-all ${
            activeTab === "modul" ? "bg-white text-[#C92C1E] shadow-sm" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Modul Call & Chat CS
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse py-24 text-center text-sm font-bold text-gray-400">
          Menghubungkan ke master database SOP pusat...
        </div>
      ) : (
        <>
          {activeTab === "klasifikasi" && (
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-7">
                <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
                  <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-4">
                    <h2 className="text-base font-black text-emerald-800">Kategori Nasabah Potensi</h2>
                  </div>
                  <div className="space-y-4 p-6">
                    <p className="text-[13px] font-medium leading-relaxed text-gray-500">
                      Nasabah dapat dikategorikan sebagai nasabah potensi apabila memenuhi indikator berikut:
                    </p>
                    <ul className="space-y-2.5 text-[13px] font-semibold text-gray-600">
                      {indikatorPotensi.map((item) => (
                        <li key={item.id} className="flex items-start gap-2.5 rounded-lg p-1">
                          <span className="mt-0.5 shrink-0 text-emerald-600">{item.label}</span>
                          <span className="flex-1">{item.keterangan}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 rounded-xl border border-red-100 bg-red-50/40 p-4">
                      <span className="mb-2 block text-[11px] font-black uppercase text-[#C92C1E]">
                        Untuk nasabah potensi, tim bisnis wajib:
                      </span>
                      <ul className="space-y-1.5 text-[12px] font-semibold leading-relaxed text-gray-600">
                        {kewajibanBisnis.map((item) => (
                          <li key={item.id} className="flex items-start gap-2">
                            <span className="shrink-0 text-[#C92C1E]">{item.label}</span>
                            <span className="flex-1">{item.keterangan}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
                  <div className="border-b border-rose-100 bg-rose-50 px-6 py-4">
                    <h2 className="text-base font-black text-rose-800">Kategori Nasabah Tidak Potensi (Ditarik)</h2>
                  </div>
                  <div className="space-y-4 p-6">
                    <p className="text-[13px] font-medium leading-relaxed text-gray-500">
                      Nasabah ditarik dari daftar aktif apabila memenuhi kriteria berikut:
                    </p>
                    <ul className="space-y-2.5 text-[13px] font-semibold text-gray-600">
                      {indikatorTidakPotensi.map((item) => (
                        <li key={item.id} className="flex items-start gap-2.5 rounded-lg p-1">
                          <span className="mt-0.5 shrink-0 text-rose-600">{item.label}</span>
                          <span className="flex-1">{item.keterangan}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-5 overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm xl:col-span-5">
                <div className="rounded-2xl border border-amber-200/60 bg-amber-50 p-3 text-center">
                  <h3 className="text-sm font-black uppercase tracking-wide text-amber-900">To Do List Sales & CS</h3>
                </div>

                <div className="space-y-3">
                  <h4 className="flex items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700">
                    Tim Sales
                  </h4>
                  <div className="divide-y divide-gray-100 pl-1">
                    {todoSales.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 rounded-lg px-1 py-2.5 text-[12.5px] font-semibold text-gray-600">
                        <span className="shrink-0 font-bold text-[#C92C1E]">{item.label}</span>
                        <span className="flex-1 leading-relaxed">{item.keterangan}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="flex items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700">
                    Tim CS
                  </h4>
                  <div className="divide-y divide-gray-100 pl-1">
                    {todoCs.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 rounded-lg px-1 py-2.5 text-[12.5px] font-semibold text-gray-600">
                        <span className="shrink-0 font-bold text-[#C92C1E]">{item.label}</span>
                        <span className="flex-1 leading-relaxed">{item.keterangan}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "modul" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
                  <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                    <h3 className="text-base font-black text-gray-800">Modul Call CS</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {modulCall.map((item) => (
                      <div key={item.id} className="flex flex-col items-start gap-4 rounded-lg p-4 sm:flex-row">
                        <div className="flex w-full flex-1 flex-col gap-2 text-[13px] sm:flex-row sm:gap-6">
                          <div className="shrink-0 font-bold text-[#C92C1E] sm:w-1/3">{item.label}</div>
                          <div className="flex-1 font-semibold leading-relaxed text-gray-600">{item.keterangan}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
                  <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                    <h3 className="text-base font-black text-gray-800">Modul Chat CS</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {modulChat.map((item) => (
                      <div key={item.id} className="flex flex-col items-start gap-4 rounded-lg p-4 sm:flex-row">
                        <div className="flex w-full flex-1 flex-col gap-2 text-[13px] sm:flex-row sm:gap-6">
                          <div className="shrink-0 font-bold text-[#C92C1E] sm:w-1/3">{item.label}</div>
                          <div className="flex-1 font-semibold leading-relaxed text-gray-600">{item.keterangan}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm">
                <h3 className="mb-3 flex items-center gap-1.5 text-base font-black text-rose-800">
                  <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Alasan Utama Label &quot;No Call / No Chat&quot; (Reason)
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {reasons.map((item) => (
                    <div key={item.id} className="relative rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                      <span className="block text-lg font-bold text-gray-800">{item.label}</span>
                      <span className="mt-1 block text-[12px] font-semibold text-gray-600">{item.keterangan}</span>
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
