import React from "react";
import { X, CalendarDays } from "lucide-react";
import { getStatusBadge } from "./TransactionTable";
import { SalesTransaction } from "../types";
import { formatRupiah } from "../utils";

type TransactionDetailDrawerProps = {
  selectedTrx: SalesTransaction | null;
  setSelectedTrx: (trx: SalesTransaction | null) => void;
};

export default function TransactionDetailDrawer({ selectedTrx, setSelectedTrx }: TransactionDetailDrawerProps) {
  if (!selectedTrx) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedTrx(null)} />
      <div className="relative z-50 flex w-full max-w-lg max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl font-sans text-[#1C1C1E] overflow-hidden">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-gray-900">
              <span className="text-[#C92C1E]">Detail</span> Transaksi
            </h2>
            {getStatusBadge(selectedTrx.statusBerlangganan)}
          </div>
          <button 
            onClick={() => setSelectedTrx(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Customer Info */}
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-gray-400">Informasi Customer</h3>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Nama Customer</p>
                  <p className="font-black text-gray-900">{selectedTrx.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Kode Owner</p>
                  <p className="font-black text-amber-600">{selectedTrx.kodeOwner}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">PIC</p>
                  <p className="font-black text-gray-900">{selectedTrx.pic}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Tanggal Closing</p>
                  <p className="font-black text-gray-900">{selectedTrx.tanggalClosing}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Package Info */}
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-gray-400">Detail Paket & Promo</h3>
            <div className="rounded-xl border border-red-100 bg-red-50/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-black text-[#C92C1E]">
                  {selectedTrx.snapshot.namaPaket}
                </span>
                <span className="rounded border border-red-200 px-2 py-0.5 text-[10px] font-black text-red-600">
                  ID: {selectedTrx.snapshot.promoId}
                </span>
              </div>
              <p className="text-lg font-black text-gray-900">{selectedTrx.snapshot.namaPromo}</p>
              <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">{selectedTrx.snapshot.jenisPromo}</p>
            </div>
          </div>

          {/* Periode */}
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-gray-400">Periode Langganan</h3>
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="flex items-center gap-3 mb-3">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-black text-gray-900">{selectedTrx.waktuMulai} - {selectedTrx.waktuBerakhir}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white">
                  Durasi {selectedTrx.snapshot.tenor} Bln
                </span>
                {selectedTrx.snapshot.bonus > 0 && (
                  <span className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-white">
                    + Bonus {selectedTrx.snapshot.bonus} Bln
                  </span>
                )}
                <span className="rounded-lg border border-blue-200 bg-blue-100 px-2.5 py-1 text-[11px] font-black text-blue-700">
                  Total {(selectedTrx.snapshot.tenor + selectedTrx.snapshot.bonus) * 30} Hari
                </span>
              </div>
            </div>
          </div>

          {/* Pembayaran */}
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-gray-400">Informasi Pembayaran</h3>
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-500">Harga Normal</span>
                <span className="font-bold text-gray-400 line-through">{formatRupiah(selectedTrx.snapshot.hargaNormal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-gray-500">Diskon Promo</span>
                <span className="font-black text-emerald-600">-{formatRupiah(selectedTrx.snapshot.diskonPromo)}</span>
              </div>
              {selectedTrx.snapshot.potonganTambahan > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-gray-500">Diskon Manual</span>
                  <span className="font-black text-emerald-600">-{formatRupiah(selectedTrx.snapshot.potonganTambahan)}</span>
                </div>
              )}
              {selectedTrx.snapshot.kodeUnik > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-gray-500">Kode Unik Transfer</span>
                  <span className="font-black text-amber-600">+{formatRupiah(selectedTrx.snapshot.kodeUnik)}</span>
                </div>
              )}
              <div className="mt-4 border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest text-gray-500">Total Bayar</span>
                <span className="text-2xl font-black text-[#C92C1E]">{formatRupiah(selectedTrx.hargaAktual)}</span>
              </div>
            </div>
          </div>

          {/* Bundling */}
          {selectedTrx.snapshot.bundlingItems && selectedTrx.snapshot.bundlingItems.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-gray-400">Barang Bundling</h3>
              <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                <ul className="list-disc pl-4 text-sm font-bold text-violet-900 space-y-1">
                  {selectedTrx.snapshot.bundlingItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
