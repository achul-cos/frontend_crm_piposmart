"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { PartnerTypeItem } from "@/app/lib/api";
import { useCreatePartnerTypeMutation, useUpdatePartnerTypeMutation } from "@/app/lib/queries/mitra";
import { useFeedback } from "@/app/components/feedback/FeedbackContext";
import ScreenPortal from "@/app/components/ui/ScreenPortal";

interface PartnerTypeModalProps {
  open: boolean;
  editingType?: PartnerTypeItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function formatThousandDots(val: string | number | undefined | null) {
  if (val === undefined || val === null || val === "") return "";
  const num = String(val).replace(/\D/g, "");
  if (!num) return "";
  return new Intl.NumberFormat("id-ID").format(Number(num));
}

export default function PartnerTypeModal({
  open,
  editingType,
  onClose,
  onSuccess,
}: PartnerTypeModalProps) {
  const { showSuccess, showError } = useFeedback();
  const createTypeMutation = useCreatePartnerTypeMutation();
  const updateTypeMutation = useUpdatePartnerTypeMutation();

  const [form, setForm] = useState({
    name: "",
    code: "",
    commissionMode: "FIXED" as "FIXED" | "PERCENTAGE",
    commissionValue: "0",
    description: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingType) {
      setForm({
        name: editingType.name || "",
        code: editingType.code || "",
        commissionMode: (editingType.commission_mode as "FIXED" | "PERCENTAGE") || "FIXED",
        commissionValue: editingType.commission_value || "0",
        description: editingType.description || "",
      });
    } else {
      setForm({
        name: "",
        code: "",
        commissionMode: "FIXED",
        commissionValue: "0",
        description: "",
      });
    }
    setError("");
  }, [editingType, open]);

  if (!open) return null;

  const isSaving = createTypeMutation.isPending || updateTypeMutation.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Nama Jenis Mitra wajib diisi");
      return;
    }

    try {
      if (editingType) {
        await updateTypeMutation.mutateAsync({
          typeId: editingType.id,
          payload: {
            name: form.name.trim(),
            commission_mode: form.commissionMode,
            commission_value: form.commissionValue || "0",
            description: form.description.trim(),
          },
        });
        showSuccess({
          title: "Berhasil",
          message: "Jenis Mitra berhasil diperbarui",
        });
      } else {
        await createTypeMutation.mutateAsync({
          name: form.name.trim(),
          code: form.code.trim() ? form.code.trim().toUpperCase() : form.name.trim().toUpperCase().replace(/\s+/g, "_"),
          commission_mode: form.commissionMode,
          commission_value: form.commissionValue || "0",
          description: form.description.trim(),
        });
        showSuccess({
          title: "Berhasil",
          message: "Jenis Mitra baru berhasil ditambahkan",
        });
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errMsg = err?.message || "Gagal menyimpan Jenis Mitra.";
      setError(errMsg);
      showError({ title: "Gagal menyimpan Jenis Mitra", message: errMsg });
    }
  };

  return (
    <ScreenPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-[24px] bg-white shadow-2xl overflow-hidden border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {editingType ? "Edit Jenis Mitra" : "Tambah Jenis Mitra Baru"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur informasi jenis mitra dan skema komisi dasar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700 flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Nama Jenis Mitra <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Distributor, Agent, Reseller"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-[#C92C1E]/10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Kode Jenis Mitra <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  disabled={Boolean(editingType)}
                  placeholder="Otomatis jika kosong"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase text-slate-800 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-[#C92C1E]/10 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Mode Komisi Dasar</label>
                <select
                  value={form.commissionMode}
                  onChange={(e) => setForm({ ...form, commissionMode: e.target.value as "FIXED" | "PERCENTAGE" })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-[#C92C1E]/10"
                >
                  <option value="FIXED">FIXED (Nominal Rp)</option>
                  <option value="PERCENTAGE">PERCENTAGE (%)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nilai Komisi Dasar</label>
                <div className="relative">
                  {form.commissionMode === "FIXED" && (
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                  )}
                  <input
                    type="text"
                    value={
                      form.commissionMode === "FIXED"
                        ? formatThousandDots(form.commissionValue)
                        : form.commissionValue
                    }
                    onChange={(e) => {
                      const rawVal = e.target.value.replace(/\./g, "");
                      setForm({ ...form, commissionValue: rawVal });
                    }}
                    placeholder={
                      form.commissionMode === "FIXED" ? "Nominal komisi" : "Persentase komisi"
                    }
                    className={`w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-[#C92C1E]/10 ${
                      form.commissionMode === "FIXED" ? "pl-10" : ""
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Deskripsi (Opsional)</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi singkat mengenai jenis mitra ini..."
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm text-slate-800 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-[#C92C1E]/10"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/20 transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {isSaving ? "Menyimpan..." : "Simpan Jenis Mitra"}
            </button>
          </div>
        </form>
      </div>
      </div>
    </ScreenPortal>
  );
}
