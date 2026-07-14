"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface NasabahItem {
  totalFu: number;
  tanggalFu: string;
  tahun: string;
  bulan: string;
  no: number;
  pic: string;
  tanggalDibagikan: string;
  statusAkun: string;
  kodeBaris: string;
  kodeOwner: string;
  namaOwner: string;
  projectBrand: string;
  outlet: string;
  noHpOwner: string;
  noHpOutlet: string;
  createDateProject: string;
  expiredDate: string;
  totalTransaksi: number;
  scor: number;
  callStatus: string;
  chatStatus: string;
  validitas: string;
  remarks: string; 
  sumberNasabah: string;
  finalisasiClosing: string;
  skemaId?: string;
  nominal: number;
  noted: string;
}

const DATA_PACKET_MASTER: Record<string, any[]> = {
  "Basic": [
    { id_skema: "basic_24", nama_promo: "24 Bulan Basic", tenor_bulan: "24", total_penjualan: 1716000 },
    { id_skema: "basic_18", nama_promo: "18 Bulan Basic", tenor_bulan: "18", total_penjualan: 1398000 },
    { id_skema: "basic_12", nama_promo: "12 Bulan Basic", tenor_bulan: "12", total_penjualan: 858000 },
    { id_skema: "basic_9", nama_promo: "9 Bulan Basic", tenor_bulan: "9", total_penjualan: 702000 },
    { id_skema: "basic_1", nama_promo: "1 Bulan Basic", tenor_bulan: "1", total_penjualan: 78000 }
  ],
  "Business": [
    { id_skema: "biz_24", nama_promo: "24 Bulan Business", tenor_bulan: "24", total_penjualan: 2596000 },
    { id_skema: "biz_18", nama_promo: "18 Bulan Business", tenor_bulan: "18", total_penjualan: 1998000 },
    { id_skema: "biz_12", nama_promo: "12 Bulan Business", tenor_bulan: "12", total_penjualan: 1298000 },
    { id_skema: "biz_9", nama_promo: "9 Bulan Business", tenor_bulan: "9", total_penjualan: 998000 },
    { id_skema: "biz_6", nama_promo: "6 Bulan Business", tenor_bulan: "6", total_penjualan: 708000 },
    { id_skema: "biz_1", nama_promo: "1 Bulan Business", tenor_bulan: "1", total_penjualan: 118000 }
  ],
  "Pro": [
    { id_skema: "pro_24", nama_promo: "24 Bulan Pro", tenor_bulan: "24", total_penjualan: 3368000 },
    { id_skema: "pro_18", nama_promo: "18 Bulan Pro", tenor_bulan: "2688000", total_penjualan: 2688000 },
    { id_skema: "pro_12", nama_promo: "12 Bulan Pro", tenor_bulan: "12", total_penjualan: 1688000 },
    { id_skema: "pro_9", nama_promo: "9 Bulan Pro", tenor_bulan: "9", total_penjualan: 1368000 },
    { id_skema: "pro_6", nama_promo: "6 Bulan Pro", tenor_bulan: "6", total_penjualan: 1008000 },
    { id_skema: "pro_1", nama_promo: "1 Bulan Pro", tenor_bulan: "1", total_penjualan: 168000 }
  ],
  "Bundling & Alat": [
    { id_skema: "bund_starter", nama_promo: "Paket Starter Pro (JAGOAN PRO)", tenor_bulan: "12", total_penjualan: 2078000 },
    { id_skema: "bund_pos_pro", nama_promo: "POS Bundle Pro", tenor_bulan: "12", total_penjualan: 5288000 },
    { id_skema: "bund_jagoan_biz", nama_promo: "Jagoan Business", tenor_bulan: "12", total_penjualan: 1598000 },
    { id_skema: "bund_pos_biz", nama_promo: "POS Bundle Business", tenor_bulan: "12", total_penjualan: 4798000 }
  ]
};

export default function FormInputDummyPage() {
  const router = useRouter();
  const [editId, setEditId] = useState<number | null>(null);
  
  const [formInput, setFormInput] = useState<Partial<NasabahItem>>({
    totalFu: 1,
    tanggalFu: "",
    tahun: "2026",
    bulan: "Juni",
    pic: "Satria",
    statusAkun: "Akun Baru",
    kodeBaris: "",
    kodeOwner: "",
    namaOwner: "",
    projectBrand: "",
    outlet: "",
    noHpOwner: "",
    noHpOutlet: "",
    createDateProject: "",
    expiredDate: "",
    totalTransaksi: 0,
    scor: 0,
    callStatus: "PENDING",
    chatStatus: "PENDING",
    validitas: "VALID",
    remarks: "0",
    sumberNasabah: "Instagram", // Default selection
    finalisasiClosing: "Basic",
    skemaId: "basic_24",
    nominal: 1716000,
    noted: ""
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get("id");
      if (idParam) {
        const targetNo = Number(idParam);
        setEditId(targetNo);
        
        const cached = localStorage.getItem("piposmart_nasabah_data");
        if (cached) {
          const list: NasabahItem[] = JSON.parse(cached);
          const matchItem = list.find(item => item.no === targetNo);
          if (matchItem) setFormInput(matchItem);
        }
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormInput((prev) => {
      const nextForm = { ...prev, [name]: value };

      if (name === "finalisasiClosing") {
        const listSkemaTersedia = DATA_PACKET_MASTER[value] || [];
        const skemaPertama = listSkemaTersedia.length > 0 ? listSkemaTersedia[0].id_skema : "";
        nextForm.skemaId = skemaPertama;
        
        const targetSkema = listSkemaTersedia.find(s => s.id_skema === skemaPertama);
        if (targetSkema) nextForm.nominal = targetSkema.total_penjualan;
      }

      if (name === "skemaId") {
        const listSkemaTersedia = DATA_PACKET_MASTER[nextForm.finalisasiClosing || "Basic"] || [];
        const targetSkema = listSkemaTersedia.find(s => s.id_skema === value);
        if (targetSkema) nextForm.nominal = targetSkema.total_penjualan;
      }

      return nextForm;
    });
  };

  const handleSaveData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInput.namaOwner || !formInput.noHpOwner) {
      alert("Nama Owner dan Nomor HP wajib diisi!");
      return;
    }

    const cached = localStorage.getItem("piposmart_nasabah_data");
    let currentList: NasabahItem[] = cached ? JSON.parse(cached) : [];

    if (editId !== null) {
      currentList = currentList.map(item => item.no === editId ? (formInput as NasabahItem) : item);
      alert("Data Kelolaan berhasil diperbarui.");
    } else {
      const itemBaru: NasabahItem = {
        ...(formInput as NasabahItem),
        no: currentList.length + 6,
        tanggalDibagikan: formInput.tanggalDibagikan || new Date().toISOString().split('T')[0],
        createDateProject: formInput.createDateProject || new Date().toISOString().split('T')[0]
      };
      currentList.push(itemBaru);
      alert("Record data baru berhasil ditambahkan.");
    }

    localStorage.setItem("piposmart_nasabah_data", JSON.stringify(currentList));
    router.push("/menu/data-kelolaan");
  };


  const listTenorTersedia = DATA_PACKET_MASTER[formInput.finalisasiClosing || "Basic"] || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-[#1C1C1E]">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-200/60 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {editId !== null ? "Edit Data Kelolaan" : "Tambah Data Kelolaan Baru"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Workspace pengisian parameter kriteria data harian Piposmart Digital Indonesia.</p>
        </div>
        <Link href="/menu/data-kelolaan" className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5">
          ← Kembali Ke Tabel
        </Link>
      </div>

      <form onSubmit={handleSaveData} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
        
        {/* SUB FORM: SISI MERAH */}
        <div className="p-4 bg-red-50/30 border border-red-100 rounded-xl space-y-3">
          <span className="text-[10px] font-black text-[#C92C1E] uppercase tracking-wider block">🔴 ATRIBUT SISI MERAH (PROFIL & LOG AKTIVITAS)</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Kode Owner *</label>
              <input type="text" name="kodeOwner" value={formInput.kodeOwner || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E] font-bold" placeholder="ex: 18907" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Nama Owner Nasabah *</label>
              <input type="text" name="namaOwner" value={formInput.namaOwner || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E]" placeholder="ex: Amanda Artha" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">PIC Penanggung Jawab *</label>
              <select name="pic" value={formInput.pic || "Satria"} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none cursor-pointer font-black text-[#C92C1E]">
                <option value="Satria">Satria</option>
                <option value="Lydia">Lydia</option>
                <option value="Laura">Laura</option>
                <option value="Fenya">Fenya</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Kalender Tanggal Follow Up (FU)</label>
              <input type="date" name="tanggalFu" value={formInput.tanggalFu || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E] font-bold text-gray-700 cursor-pointer" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Total Kuantitas FU</label>
              <input type="number" name="totalFu" value={formInput.totalFu || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E]" placeholder="ex: 5" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Pilihan Bulan Laporan</label>
              <select name="bulan" value={formInput.bulan || "Juni"} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none cursor-pointer font-bold text-gray-700">
                <option value="Januari">Januari</option><option value="Februari">Februari</option><option value="Maret">Maret</option><option value="April">April</option><option value="Mei">Mei</option><option value="Juni">Juni</option><option value="Juli">Juli</option><option value="Agustus">Agustus</option><option value="September">September</option><option value="Oktober">Oktober</option><option value="November">November</option><option value="Desember">Desember</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Tahun Laporan</label>
              <input type="text" name="tahun" value={formInput.tahun || "2026"} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E] font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">No. HP Owner *</label>
              <input type="text" name="noHpOwner" value={formInput.noHpOwner || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E]" placeholder="ex: 08524026xxx" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Status Kelompok Akun</label>
              <select name="statusAkun" value={formInput.statusAkun || "Akun Baru"} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none cursor-pointer font-bold text-gray-700">
                <option value="Akun Baru">Akun Baru</option><option value="Outlet Baru">Outlet Baru</option><option value="Referral Mitra">Referral Mitra</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Project / Brand</label>
              <input type="text" name="projectBrand" value={formInput.projectBrand || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Nama Unit Outlet</label>
              <input type="text" name="outlet" value={formInput.outlet || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">No. HP Outlet</label>
              <input type="text" name="noHpOutlet" value={formInput.noHpOutlet || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Kode Baris</label>
              <input type="text" name="kodeBaris" value={formInput.kodeBaris || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Tanggal Dibagikan</label>
              <input type="date" name="tanggalDibagikan" value={formInput.tanggalDibagikan || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Create Date Project</label>
              <input type="date" name="createDateProject" value={formInput.createDateProject || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E]" />
            </div>
          </div>
        </div>

        {/* SUB FORM: SISI HIJAU */}
        <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-xl space-y-3">
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">🟢 ATRIBUT SISI HIJAU (SCORING & INTEGRASI KATALOG CLOSING)</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-emerald-800 uppercase">Kategori Paket Closing</label>
              <select name="finalisasiClosing" value={formInput.finalisasiClosing || "Basic"} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-600 font-black text-gray-800 cursor-pointer">
                <option value="Basic">Basic</option><option value="Business">Business</option><option value="Pro">Pro</option><option value="Bundling & Alat">Bundling & Alat</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-emerald-800 uppercase">Nama Promo / Skema Tenor</label>
              <select name="skemaId" value={formInput.skemaId || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-600 font-bold text-gray-700 cursor-pointer">
                {listTenorTersedia.map((skema) => (
                  <option key={skema.id_skema} value={skema.id_skema}>{skema.nama_promo}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-[#C92C1E] uppercase">Nominal Harga Deal (Terhitung Otomatis Standar Katalog)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 font-bold text-xs">Rp</span>
                <input type="text" value={new Intl.NumberFormat("id-ID").format(formInput.nominal || 0)} disabled className="w-full bg-red-50/50 border border-red-200 p-2.5 pl-9 rounded-xl text-sm font-black text-[#C92C1E] cursor-not-allowed focus:outline-none shadow-2xs" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Expired Date / Total Transaksi</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" name="expiredDate" value={formInput.expiredDate || ""} onChange={handleInputChange} className="bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-600" />
                <input type="number" name="totalTransaksi" value={formInput.totalTransaksi || ""} onChange={handleInputChange} className="bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-600" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Scor & Remarks Evaluasi</label>
              <div className="grid grid-cols-2 gap-2">
                <select name="scor" value={formInput.scor || 0} onChange={handleInputChange} className="bg-white border p-2.5 rounded-xl text-xs focus:outline-none cursor-pointer">
                  <option value={0}>Scor: 0</option><option value={1}>Scor: 1</option><option value={2}>Scor: 2</option><option value={3}>Scor: 3</option>
                </select>
                <select name="remarks" value={formInput.remarks || "0"} onChange={handleInputChange} className="bg-white border p-2.5 rounded-xl text-xs focus:outline-none cursor-pointer">
                  <option value="0">(0) Tidak Merespon</option><option value="1">(1) New Download</option><option value="2">(2) Prospek Potensial</option><option value="3">(3) Berlangganan</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Log Telekomunikasi (Call & Chat)</label>
              <div className="grid grid-cols-2 gap-2">
                <select name="callStatus" value={formInput.callStatus || "PENDING"} onChange={handleInputChange} className="bg-white border p-2.5 rounded-xl text-xs focus:outline-none cursor-pointer">
                  <option value="PENDING">CALL: PENDING</option><option value="CONTACTED">CALL: CONTACTED</option><option value="NO CALL">CALL: NO CALL</option>
                </select>
                <select name="chatStatus" value={formInput.chatStatus || "PENDING"} onChange={handleInputChange} className="bg-white border p-2.5 rounded-xl text-xs focus:outline-none cursor-pointer">
                  <option value="PENDING">CHAT: PENDING</option><option value="PROSPECT">CHAT: PROSPECT</option><option value="DELIVERED">CHAT: DELIVERED</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Validitas & Sumber Nasabah Media</label>
              <div className="grid grid-cols-2 gap-2">
                <select name="validitas" value={formInput.validitas || "VALID"} onChange={handleInputChange} className="bg-white border p-2.5 rounded-xl text-xs focus:outline-none cursor-pointer">
                  <option value="VALID">VALID</option><option value="INVALID">INVALID</option>
                </select>
                
                {/* 🌟 FIX UTAMA: Mengubah inputan teks manual menjadi select dropdown sesuai gambar */}
                <select 
                  name="sumberNasabah" 
                  value={formInput.sumberNasabah || "Instagram"} 
                  onChange={handleInputChange} 
                  className="bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-600 font-bold text-gray-700 cursor-pointer"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Tiktok">Tiktok</option>
                  <option value="Mitra">Mitra</option>
                  <option value="Playstore">Playstore</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Noted / Keterangan Khas Lapangan</label>
              <input type="text" name="noted" value={formInput.noted || ""} onChange={handleInputChange} className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-600" />
            </div>
          </div>
        </div>

        {/* ACTION ZONE FOOTER */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div className="text-[11px] font-medium text-gray-400">
            Penghapusan data sekarang dilakukan dari halaman tabel agar bisa memilih banyak data sekaligus.
          </div>
          <button type="submit" className="px-6 py-2.5 bg-[#C92C1E] hover:bg-[#A82216] text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm">
            {editId !== null ? "💾 Perbarui Perubahan" : "💾 Daftarkan Data Kelolaan"}
          </button>
        </div>

      </form>
    </div>
  );
}