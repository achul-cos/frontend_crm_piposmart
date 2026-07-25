import React from "react";
import { AlertTriangle } from "lucide-react";
import { type PromoItem } from "@/app/lib/promo-data";

export default function DeleteDialog({
  promo,
  onConfirm,
  onCancel,
}: {
  promo: PromoItem;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="text-center text-lg font-black text-gray-900">Hapus Promo?</h3>
        <p className="mt-2 text-center text-sm font-medium text-gray-500">
          Promo <span className="font-black text-gray-700">&quot;{promo?.namaPromo}&quot;</span> akan
          dihapus permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 cursor-pointer"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
