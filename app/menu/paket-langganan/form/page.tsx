import React, { useState, useMemo } from "react";
import { Tag } from "lucide-react";
import {
  type PromoItem,
  type PromoStatus,
  type PaketType,
  type KategoriNasabah,
  PAKET_OPTIONS,
  KATEGORI_OPTIONS,
  TENOR_OPTIONS,
  STATUS_OPTIONS,
  PACKAGE_PRICES,
  calculateHargaNormal,
  calculateHargaPromo,
  calculateTotalMasaAktif,
  generatePromoId,
  formatRupiah,
} from "@/app/lib/promo-data";

export type FormData = {
  namaPromo: string;
  paket: PaketType;
  kategoriNasabah: KategoriNasabah;
  tenor: number;
  bonus: number;
  hargaNormal: number;
  diskon: number;
  periodeStart: string;
  periodeEnd: string;
  status: PromoStatus;
};

export function getEmptyFormData(): FormData {
  const today = new Date().toISOString().split("T")[0];
  return {
    namaPromo: "",
    paket: "basic",
    kategoriNasabah: "new",
    tenor: 1,
    bonus: 0,
    hargaNormal: calculateHargaNormal("basic", 1),
    diskon: 0,
    periodeStart: today,
    periodeEnd: today,
    status: "draft",
  };
}

export function formDataFromPromo(promo: PromoItem): FormData {
  return {
    namaPromo: promo.namaPromo,
    paket: promo.paket,
    kategoriNasabah: promo.kategoriNasabah,
    tenor: promo.tenor,
    bonus: promo.bonus,
    hargaNormal: promo.hargaNormal,
    diskon: promo.diskon,
    periodeStart: promo.periodeStart,
    periodeEnd: promo.periodeEnd,
    status: promo.status,
  };
}

export function FieldGroup({
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
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
        <Tag className="h-3 w-3" />
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[10px] font-bold text-red-600">{error}</p>}
    </div>
  );
}

export default function FormDrawer({
  mode,
  existingPromo,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  existingPromo: PromoItem | null;
  onClose: () => void;
  onSave: (promo: PromoItem) => void;
}) {
  const [form, setForm] = useState<FormData>(() => {
    if (existingPromo) return formDataFromPromo(existingPromo);
    return getEmptyFormData();
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const hargaPromo = useMemo(
    () => calculateHargaPromo(form.hargaNormal, form.diskon),
    [form.hargaNormal, form.diskon],
  );
  const totalMasaAktif = useMemo(
    () => calculateTotalMasaAktif(form.tenor, form.bonus),
    [form.tenor, form.bonus],
  );

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      if (key === "paket" || key === "tenor") {
        updated.hargaNormal = calculateHargaNormal(updated.paket, updated.tenor);
      }
      return updated;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleRupiahChange = (e: React.ChangeEvent<HTMLInputElement>, field: "hargaNormal" | "diskon") => {
    const rawValue = e.target.value.replace(/\D/g, "");
    updateField(field, Number(rawValue) || 0);
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.namaPromo.trim()) errs.namaPromo = "Nama promo wajib diisi";
    if (form.hargaNormal < 0) errs.hargaNormal = "Harga normal tidak boleh negatif";

    if (form.diskon < 0) errs.diskon = "Diskon tidak boleh negatif";
    if (form.diskon > form.hargaNormal) errs.diskon = "Diskon tidak boleh melebihi harga normal";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const now = new Date().toISOString().split("T")[0];
    const userName = typeof window !== "undefined" ? localStorage.getItem("piposmart_user_name") || "User" : "User";

    const promo: PromoItem = {
      id: existingPromo?.id || generatePromoId(),
      namaPromo: form.namaPromo.trim(),
      paket: form.paket,
      kategoriNasabah: form.kategoriNasabah,
      tenor: form.tenor,
      bonus: form.bonus,
      totalMasaAktif,
      hargaNormal: form.hargaNormal,
      diskon: form.diskon,
      hargaPromo,
      status: form.status,
      periodeStart: form.periodeStart,
      periodeEnd: form.periodeEnd,
      jumlahClosing: existingPromo?.jumlahClosing ?? 0,
      totalRevenue: existingPromo?.totalRevenue ?? 0,
      createdBy: existingPromo?.createdBy ?? userName,
      createdAt: existingPromo?.createdAt ?? now,
      updatedAt: now,
    };

    onSave(promo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl animate-in zoom-in-95">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#C92C1E]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">
                {mode === "create" ? "Tambah Promo Baru" : "Edit Profil Promo"}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Lengkapi data promo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 cursor-pointer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-5">
          <div className="space-y-3 rounded-xl border border-red-100 bg-red-50/30 p-4">
            <span className="block text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
              Data Utama Promo
            </span>

            {/* Nama Promo */}
            <FieldGroup label="Nama Promo" error={errors.namaPromo} required>
              <input
                type="text"
                value={form.namaPromo}
                onChange={(e) => updateField("namaPromo", e.target.value)}
                placeholder="Contoh: Promo Grand Opening Basic 3 Bulan"
                className={`w-full rounded-xl border bg-white p-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#C92C1E] ${errors.namaPromo ? "border-red-500 bg-red-50" : "border-gray-200"}`}
              />
            </FieldGroup>

            {/* Paket & Kategori */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldGroup label="Paket" required>
                <select
                  value={form.paket}
                  onChange={(e) => updateField("paket", e.target.value as PaketType)}
                  className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#C92C1E]"
                >
                  {PAKET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FieldGroup>

              <FieldGroup label="Kategori Nasabah" required>
                <select
                  value={form.kategoriNasabah}
                  onChange={(e) => updateField("kategoriNasabah", e.target.value as KategoriNasabah)}
                  className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#C92C1E]"
                >
                  {KATEGORI_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FieldGroup>
            </div>

            {/* Tenor & Bonus */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldGroup label="Tenor (bulan)" required>
                <select
                  value={form.tenor}
                  onChange={(e) => updateField("tenor", Number(e.target.value))}
                  className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#C92C1E]"
                >
                  {TENOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FieldGroup>

              <FieldGroup label="Bonus (bulan)">
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={form.bonus}
                  onChange={(e) => updateField("bonus", Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#C92C1E]"
                />
              </FieldGroup>
            </div>

            {/* Harga Normal & Diskon */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldGroup label="Harga Normal (Rp)" error={errors.hargaNormal} required>
                <input
                  type="text"
                  value={form.hargaNormal === 0 ? "" : form.hargaNormal.toLocaleString("id-ID")}
                  onChange={(e) => handleRupiahChange(e, "hargaNormal")}
                  className={`w-full rounded-xl border bg-white p-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#C92C1E] ${errors.hargaNormal ? "border-red-500 bg-red-50" : "border-gray-200"}`}
                />
              </FieldGroup>

              <FieldGroup label="Diskon (Rp)" error={errors.diskon}>
                <input
                  type="text"
                  value={form.diskon === 0 ? "" : form.diskon.toLocaleString("id-ID")}
                  onChange={(e) => handleRupiahChange(e, "diskon")}
                  className={`w-full rounded-xl border bg-white p-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#C92C1E] ${errors.diskon ? "border-red-500 bg-red-50" : "border-gray-200"}`}
                />
              </FieldGroup>
            </div>

            {/* Auto-calc Pricing Preview */}
            <div className="mt-2 space-y-1.5 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                <span>Harga Normal:</span>
                <span>{formatRupiah(form.hargaNormal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                <span>Diskon:</span>
                <span className="text-red-500">-{formatRupiah(form.diskon)}</span>
              </div>
              <div className="my-1 border-t border-dashed border-gray-200" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wide text-gray-800">Harga Promo:</span>
                <span className="text-base font-black text-[#C92C1E]">{formatRupiah(hargaPromo)}</span>
              </div>
            </div>


          </div>

            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-2xl">
            <div className="text-[10px] font-bold text-gray-400 max-w-[200px] leading-tight">
              Pastikan data promo sudah benar sebelum disimpan.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-[#C92C1E] px-6 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216]"
              >
                {mode === "create" ? "Tambah Promo" : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
