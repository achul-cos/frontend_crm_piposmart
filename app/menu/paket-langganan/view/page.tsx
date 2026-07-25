import React from "react";
import { Eye, X, Package, Users, CalendarDays, Sparkles, Clock, Pencil } from "lucide-react";
import {
  type PromoItem,
  PAKET_LABELS,
  KATEGORI_LABELS,
  formatRupiah,
  formatCompactRupiah,
  formatDateID,
} from "@/app/lib/promo-data";
import { StatusBadge } from "../badge/page";

export function InfoCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "purple" | "gray" | "amber" | "teal";
}) {
  const styles: Record<string, string> = {
    blue: "border-blue-100 bg-blue-50/50 text-blue-600",
    purple: "border-purple-100 bg-purple-50/50 text-purple-600",
    gray: "border-gray-100 bg-gray-50/50 text-gray-500",
    amber: "border-amber-100 bg-amber-50/50 text-amber-600",
    teal: "border-teal-100 bg-teal-50/50 text-teal-600",
  };
  return (
    <div className={`rounded-2xl border p-3 ${styles[color]}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1 text-base font-black text-gray-900">{value}</p>
    </div>
  );
}

export default function ViewDrawer({
  promo,
  onClose,
  onEdit,
}: {
  promo: PromoItem;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!promo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#C92C1E]">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#C92C1E]">Detail</p>
              <h2 className="text-base font-black text-gray-900">Detail Promo</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            {/* Promo Name + Status */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Nama Promo</p>
                  <h3 className="mt-1 text-lg font-black text-gray-900">{promo.namaPromo}</h3>
                </div>
              </div>
            </div>

            {/* Package & Category */}
            <div className="grid grid-cols-2 gap-3">
              <InfoCard icon={<Package className="h-4 w-4" />} label="Paket" value={PAKET_LABELS[promo.paket]} color="blue" />
              <InfoCard icon={<Users className="h-4 w-4" />} label="Kategori Nasabah" value={KATEGORI_LABELS[promo.kategoriNasabah]} color="purple" />
            </div>

            {/* Tenor & Bonus & Total */}
            <div className="grid grid-cols-3 gap-3">
              <InfoCard icon={<CalendarDays className="h-4 w-4" />} label="Tenor" value={`${promo.tenor} bln`} color="gray" />
              <InfoCard icon={<Sparkles className="h-4 w-4" />} label="Bonus" value={`${promo.bonus} bln`} color="amber" />
              <InfoCard icon={<Clock className="h-4 w-4" />} label="Total Aktif" value={`${promo.totalMasaAktif} bln`} color="teal" />
            </div>

            {/* Pricing */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-gray-400">Informasi Harga</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-500">Harga Normal</span>
                  <span className="font-black text-gray-400 line-through">{formatRupiah(promo.hargaNormal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-gray-500">Diskon</span>
                  <span className="font-black text-red-500">-{formatRupiah(promo.diskon)}</span>
                </div>
                <div className="border-t border-dashed border-gray-200 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-gray-700">Harga Promo</span>
                    <span className="text-xl font-black text-[#C92C1E]">{formatRupiah(promo.hargaPromo)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Jumlah Closing</p>
                <p className="mt-1 text-2xl font-black text-emerald-700">{promo.jumlahClosing}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Total Revenue</p>
                <p className="mt-1 text-lg font-black text-blue-700">{formatCompactRupiah(promo.totalRevenue)}</p>
              </div>
            </div>

            {/* Meta */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-gray-400">Informasi Sistem</p>
              <div className="space-y-2 text-xs font-bold text-gray-500">
                <div className="flex justify-between">
                  <span>Dibuat oleh</span>
                  <span className="font-black text-gray-700">{promo.createdBy}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal dibuat</span>
                  <span className="font-black text-gray-700">{formatDateID(promo.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Terakhir diperbarui</span>
                  <span className="font-black text-gray-700">{formatDateID(promo.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4">
          <button
            onClick={onEdit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#A82518] active:scale-[0.98] cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
            Edit Promo
          </button>
        </div>
      </div>
    </div>
  );
}
