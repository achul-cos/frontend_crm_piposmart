"use client";

import React, { useState, useEffect } from "react";
import { X, Package } from "lucide-react";
import {
  type MasterPaket,
  type PaketStatus,
  generatePaketId,
  formatRupiahPL,
} from "@/app/lib/paket-langganan-data";

// ============================================================
// TYPES
// ============================================================

export type PaketFormData = {
  namaPaket: string;
  hargaPerBulan: number;
  status: PaketStatus;
};

function getEmptyPaketForm(): PaketFormData {
  return { namaPaket: "", hargaPerBulan: 0, status: "aktif" };
}

function paketToForm(paket: MasterPaket): PaketFormData {
  return {
    namaPaket: paket.namaPaket,
    hargaPerBulan: paket.hargaPerBulan,
    status: paket.status,
  };
}

// ============================================================
// FIELD GROUP HELPER
// ============================================================

function FieldGroup({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[10px] font-bold text-red-500">{error}</p>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function FormPaketDrawer({
  mode,
  existingPaket,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  existingPaket: MasterPaket | null;
  onClose: () => void;
  onSave: (paket: MasterPaket) => void;
}) {
  const [form, setForm] = useState<PaketFormData>(() =>
    existingPaket ? paketToForm(existingPaket) : getEmptyPaketForm()
  );
  const [errors, setErrors] = useState<Partial<Record<keyof PaketFormData, string>>>({});
  const [visible, setVisible] = useState(false);

  // Slide-in animation on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  // Currency input handler
  const handleHargaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, hargaPerBulan: Number(raw) || 0 }));
    setErrors((prev) => ({ ...prev, hargaPerBulan: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof PaketFormData, string>> = {};
    if (!form.namaPaket.trim()) errs.namaPaket = "Nama paket wajib diisi";
    if (form.hargaPerBulan <= 0) errs.hargaPerBulan = "Harga per bulan harus lebih dari 0";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const now = new Date().toISOString().split("T")[0];
    const paket: MasterPaket = {
      id: existingPaket?.id || generatePaketId(),
      namaPaket: form.namaPaket.trim(),
      hargaPerBulan: form.hargaPerBulan,
      status: form.status,
      createdAt: existingPaket?.createdAt || now,
      updatedAt: now,
    };
    onSave(paket);
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-250 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Drawer Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-10 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-250 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#C92C1E]">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">
                {mode === "create" ? "Tambah Paket Baru" : "Edit Paket"}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Master Paket
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-gray-200 p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-5">
              {/* Section Label */}
              <div className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                  Data Paket
                </span>
              </div>

              {/* Nama Paket */}
              <FieldGroup label="Nama Paket" error={errors.namaPaket} required>
                <input
                  type="text"
                  value={form.namaPaket}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, namaPaket: e.target.value }));
                    setErrors((prev) => ({ ...prev, namaPaket: undefined }));
                  }}
                  placeholder="Contoh: Basic, Business, Pro..."
                  className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-bold text-gray-800 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]/20 ${
                    errors.namaPaket ? "border-red-400 bg-red-50" : "border-gray-200"
                  }`}
                />
              </FieldGroup>

              {/* Harga per Bulan */}
              <FieldGroup
                label="Harga per Bulan (Rp)"
                error={errors.hargaPerBulan}
                required
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={
                      form.hargaPerBulan === 0
                        ? ""
                        : form.hargaPerBulan.toLocaleString("id-ID")
                    }
                    onChange={handleHargaChange}
                    placeholder="Contoh: 78.000"
                    className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-3 text-sm font-bold text-gray-800 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]/20 ${
                      errors.hargaPerBulan ? "border-red-400 bg-red-50" : "border-gray-200"
                    }`}
                  />
                </div>
                {form.hargaPerBulan > 0 && (
                  <p className="mt-1 text-[10px] font-bold text-emerald-600">
                    {formatRupiahPL(form.hargaPerBulan)} / bulan
                  </p>
                )}
              </FieldGroup>

              {/* Status */}
              <FieldGroup label="Status" required>
                <div className="flex gap-3">
                  {(["aktif", "nonaktif"] as PaketStatus[]).map((s) => (
                    <label
                      key={s}
                      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                        form.status === s
                          ? s === "aktif"
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : "border-gray-400 bg-gray-100 text-gray-700"
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={form.status === s}
                        onChange={() =>
                          setForm((prev) => ({ ...prev, status: s }))
                        }
                        className="sr-only"
                      />
                      <span
                        className={`h-2 w-2 rounded-full ${
                          s === "aktif" ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                      />
                      {s === "aktif" ? "Aktif" : "Nonaktif"}
                    </label>
                  ))}
                </div>
              </FieldGroup>

              {/* Info note */}
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                <p className="text-[11px] font-bold leading-relaxed text-amber-700">
                  💡 Harga per bulan paket ini akan menjadi acuan perhitungan
                  <strong> Harga Normal</strong> pada setiap promo yang dibuat.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50/60 px-6 py-4">
            <p className="text-[10px] font-bold leading-tight text-gray-400 max-w-[180px]">
              Pastikan data paket sudah benar sebelum disimpan.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#C92C1E] px-5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216] active:scale-[0.98]"
              >
                {mode === "create" ? "Tambah Paket" : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
