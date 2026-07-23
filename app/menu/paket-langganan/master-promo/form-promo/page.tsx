"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X, Tag, Zap, Package2 } from "lucide-react";
import {
  type MasterPaket,
  type MasterPromo,
  type KategoriNasabah,
  type JenisPromo,
  type PromoStatus,
  MASTER_ALAT,
  TENOR_OPTIONS_PL,
  generatePromoIdPL,
  formatRupiahPL,
  calcHargaNormal,
  calcHargaPromo,
  getAktifPakets,
} from "@/app/lib/paket-langganan-data";

// ============================================================
// FORM DATA TYPE
// ============================================================

export type PromoFormData = {
  namaPromo: string;
  paketId: string;
  kategoriNasabah: KategoriNasabah;
  jenisPromo: JenisPromo;
  tenor: number;
  bonus: number;
  diskon: number;
  bundlingItems: string[];
  status: PromoStatus;
};

function getEmptyPromoForm(defaultPaketId: string): PromoFormData {
  return {
    namaPromo: "",
    paketId: defaultPaketId,
    kategoriNasabah: "baru",
    jenisPromo: "reguler",
    tenor: 1,
    bonus: 0,
    diskon: 0,
    bundlingItems: [],
    status: "draft",
  };
}

function promoToForm(promo: MasterPromo): PromoFormData {
  return {
    namaPromo: promo.namaPromo,
    paketId: promo.paketId,
    kategoriNasabah: promo.kategoriNasabah,
    jenisPromo: promo.jenisPromo,
    tenor: promo.tenor,
    bonus: promo.bonus,
    diskon: promo.diskon,
    bundlingItems: [...promo.bundlingItems],
    status: promo.status,
  };
}

// ============================================================
// FIELD GROUP
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
      {error && <p className="text-[10px] font-bold text-red-500">{error}</p>}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function FormPromoDrawer({
  mode,
  existingPromo,
  pakets,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  existingPromo: MasterPromo | null;
  pakets: MasterPaket[];
  onClose: () => void;
  onSave: (promo: MasterPromo) => void;
}) {
  const aktifPakets = useMemo(() => getAktifPakets(pakets), [pakets]);
  const defaultPaketId = existingPromo?.paketId || aktifPakets[0]?.id || "";

  const [form, setForm] = useState<PromoFormData>(() =>
    existingPromo ? promoToForm(existingPromo) : getEmptyPromoForm(defaultPaketId)
  );
  const [errors, setErrors] = useState<Partial<Record<keyof PromoFormData, string>>>({});
  const [visible, setVisible] = useState(false);

  // Slide-in animation
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  // Auto-calculated values
  const selectedPaket = useMemo(
    () => pakets.find((p) => p.id === form.paketId),
    [pakets, form.paketId]
  );

  const hargaNormal = useMemo(
    () => calcHargaNormal(selectedPaket?.hargaPerBulan ?? 0, form.tenor),
    [selectedPaket, form.tenor]
  );

  const hargaPromo = useMemo(
    () => calcHargaPromo(hargaNormal, form.diskon),
    [hargaNormal, form.diskon]
  );

  const updateField = <K extends keyof PromoFormData>(key: K, value: PromoFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleDiskonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    updateField("diskon", Number(raw) || 0);
  };

  const toggleBundlingItem = (item: string) => {
    setForm((prev) => ({
      ...prev,
      bundlingItems: prev.bundlingItems.includes(item)
        ? prev.bundlingItems.filter((i) => i !== item)
        : [...prev.bundlingItems, item],
    }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof PromoFormData, string>> = {};
    if (!form.namaPromo.trim()) errs.namaPromo = "Nama promo wajib diisi";
    if (!form.paketId) errs.paketId = "Paket wajib dipilih";
    if (form.diskon > hargaNormal) errs.diskon = "Diskon tidak boleh melebihi harga normal";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const now = new Date().toISOString().split("T")[0];
    const promo: MasterPromo = {
      id: existingPromo?.id || generatePromoIdPL(),
      namaPromo: form.namaPromo.trim(),
      paketId: form.paketId,
      kategoriNasabah: form.kategoriNasabah,
      jenisPromo: form.jenisPromo,
      tenor: form.tenor,
      bonus: form.bonus,
      hargaNormal,
      diskon: form.diskon,
      hargaPromo,
      bundlingItems: form.jenisPromo === "bundling" ? form.bundlingItems : [],
      status: form.status,
      createdAt: existingPromo?.createdAt || now,
      updatedAt: now,
    };
    onSave(promo);
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
        className={`fixed inset-y-0 right-0 z-10 flex w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-250 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#C92C1E]">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">
                {mode === "create" ? "Tambah Promo Baru" : "Edit Promo"}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Master Promo
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-5">

              {/* — SECTION: Data Promo — */}
              <div className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                  Data Promo
                </span>
              </div>

              {/* Paket */}
              <FieldGroup label="Paket" error={errors.paketId} required>
                {aktifPakets.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700">
                    Tidak ada paket aktif. Tambahkan paket terlebih dahulu.
                  </div>
                ) : (
                  <select
                    value={form.paketId}
                    onChange={(e) => updateField("paketId", e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-800 outline-none transition focus:border-[#C92C1E]"
                  >
                    {aktifPakets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.namaPaket} — {formatRupiahPL(p.hargaPerBulan)}/bln
                      </option>
                    ))}
                  </select>
                )}
              </FieldGroup>

              {/* Nama Promo */}
              <FieldGroup label="Nama Promo" error={errors.namaPromo} required>
                <input
                  type="text"
                  value={form.namaPromo}
                  onChange={(e) => updateField("namaPromo", e.target.value)}
                  placeholder="Contoh: 12 + 1 Bulan Basic, Starter Pro..."
                  className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-bold text-gray-800 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]/20 ${
                    errors.namaPromo ? "border-red-400 bg-red-50" : "border-gray-200"
                  }`}
                />
              </FieldGroup>

              {/* Kategori & Jenis */}
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Kategori Nasabah" required>
                  <select
                    value={form.kategoriNasabah}
                    onChange={(e) =>
                      updateField("kategoriNasabah", e.target.value as KategoriNasabah)
                    }
                    className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-800 outline-none transition focus:border-[#C92C1E]"
                  >
                    <option value="baru">Baru</option>
                    <option value="existing">Existing</option>
                    <option value="all">New &amp; Existing</option>
                  </select>
                </FieldGroup>

                <FieldGroup label="Jenis Promo" required>
                  <select
                    value={form.jenisPromo}
                    onChange={(e) =>
                      updateField("jenisPromo", e.target.value as JenisPromo)
                    }
                    className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-800 outline-none transition focus:border-[#C92C1E]"
                  >
                    <option value="reguler">Reguler</option>
                    <option value="bundling">Bundling</option>
                  </select>
                </FieldGroup>
              </div>

              {/* Tenor & Bonus */}
              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Tenor (bulan)" required>
                  <select
                    value={form.tenor}
                    onChange={(e) => updateField("tenor", Number(e.target.value))}
                    className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-800 outline-none transition focus:border-[#C92C1E]"
                  >
                    {TENOR_OPTIONS_PL.map((t) => (
                      <option key={t} value={t}>
                        {t} bulan
                      </option>
                    ))}
                  </select>
                </FieldGroup>

                <FieldGroup label="Bonus (bulan)">
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={form.bonus}
                    onChange={(e) =>
                      updateField("bonus", Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-800 outline-none transition focus:border-[#C92C1E]"
                  />
                </FieldGroup>
              </div>

              {/* Diskon */}
              <FieldGroup label="Diskon (Rp)" error={errors.diskon}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={form.diskon === 0 ? "" : form.diskon.toLocaleString("id-ID")}
                    onChange={handleDiskonChange}
                    placeholder="0"
                    className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-3 text-sm font-bold text-gray-800 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]/20 ${
                      errors.diskon ? "border-red-400 bg-red-50" : "border-gray-200"
                    }`}
                  />
                </div>
              </FieldGroup>

              {/* — Pricing Preview (auto-calculated) — */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3">
                  Kalkulasi Otomatis
                </p>
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>
                    Harga Normal{" "}
                    <span className="text-gray-400">
                      ({formatRupiahPL(selectedPaket?.hargaPerBulan ?? 0)} × {form.tenor} bln)
                    </span>
                    :
                  </span>
                  <span className="font-black text-gray-700">{formatRupiahPL(hargaNormal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>Diskon:</span>
                  <span className="font-black text-red-500">− {formatRupiahPL(form.diskon)}</span>
                </div>
                <div className="my-2 border-t border-dashed border-gray-200" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wide text-gray-800">
                    Harga Promo:
                  </span>
                  <span className="text-lg font-black text-[#C92C1E]">
                    {formatRupiahPL(hargaPromo)}
                  </span>
                </div>
                {form.bonus > 0 && (
                  <p className="text-[10px] font-bold text-emerald-600">
                    ✓ Total masa aktif: {form.tenor + form.bonus} bulan (termasuk {form.bonus} bulan bonus)
                  </p>
                )}
              </div>

              {/* Status */}
              <FieldGroup label="Status" required>
                <div className="flex gap-2">
                  {(["aktif", "draft", "nonaktif"] as PromoStatus[]).map((s) => {
                    const active = form.status === s;
                    const colorMap: Record<PromoStatus, string> = {
                      aktif: active
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 text-gray-400 hover:border-gray-300",
                      draft: active
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-gray-200 text-gray-400 hover:border-gray-300",
                      nonaktif: active
                        ? "border-gray-400 bg-gray-100 text-gray-700"
                        : "border-gray-200 text-gray-400 hover:border-gray-300",
                    };
                    return (
                      <label
                        key={s}
                        className={`flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-xs font-bold transition ${colorMap[s]}`}
                      >
                        <input
                          type="radio"
                          name="promoStatus"
                          value={s}
                          checked={active}
                          onChange={() => updateField("status", s)}
                          className="sr-only"
                        />
                        {s === "aktif" ? "Aktif" : s === "draft" ? "Draft" : "Nonaktif"}
                      </label>
                    );
                  })}
                </div>
              </FieldGroup>

              {/* — SECTION: Peralatan Bundling (conditional) — */}
              {form.jenisPromo === "bundling" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3">
                    <Package2 className="h-4 w-4 text-violet-600 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-violet-700">
                      Peralatan Bundling
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {MASTER_ALAT.map((alat) => {
                      const checked = form.bundlingItems.includes(alat);
                      return (
                        <label
                          key={alat}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                            checked
                              ? "border-violet-300 bg-violet-50 text-violet-800"
                              : "border-gray-200 text-gray-500 hover:border-violet-200 hover:bg-violet-50/40"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                              checked
                                ? "border-violet-500 bg-violet-500"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {checked && (
                              <svg
                                className="h-2.5 w-2.5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleBundlingItem(alat)}
                            className="sr-only"
                          />
                          <span className="truncate">{alat}</span>
                        </label>
                      );
                    })}
                  </div>

                  {form.bundlingItems.length > 0 && (
                    <p className="text-[10px] font-bold text-violet-600">
                      {form.bundlingItems.length} peralatan dipilih:{" "}
                      {form.bundlingItems.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50/60 px-6 py-4">
            <p className="max-w-[160px] text-[10px] font-bold leading-tight text-gray-400">
              Pastikan data promo sudah benar sebelum disimpan.
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
                {mode === "create" ? "Tambah Promo" : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
