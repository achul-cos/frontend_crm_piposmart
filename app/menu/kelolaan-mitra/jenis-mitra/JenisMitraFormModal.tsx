"use client";

import { useEffect, useMemo, useState } from "react";

type JenisMitraForm = {
  jenisMitra: string;
  paketBerlangganan: string;
  hargaBerlangganan: number;
  komisi: number;
};

type PaketOption = {
  label: string;
  harga: number;
};

const emptyForm: JenisMitraForm = {
  jenisMitra: "",
  paketBerlangganan: "",
  hargaBerlangganan: 0,
  komisi: 0,
};

const DEFAULT_PAKET_LANGGANAN_OPTIONS: PaketOption[] = [
  { label: "Basic (12 Bulan)", harga: 858000 },
  { label: "Business (12 Bulan)", harga: 1298000 },
  { label: "Business (18 Bulan)", harga: 1999000 },
  { label: "Business (24 Bulan)", harga: 2596000 },
  { label: "Pro (12 Bulan)", harga: 1688000 },
  { label: "Pro (18 Bulan)", harga: 2688000 },
  { label: "Pro (24 Bulan)", harga: 3368000 },
];

const PAKET_LANGGANAN_STORAGE_KEYS = [
  "piposmart_paket_langganan_data",
  "piposmart_paket_langganan",
  "piposmart_master_paket_langganan",
  "piposmart_paket_data",
  "piposmart_subscription_packages",
];

const normalizePaketLanggananOptions = (items: unknown): PaketOption[] => {
  if (!Array.isArray(items)) return [];

  const options = items
    .map((item: any) => {
      const namaPaket =
        item?.paketBerlangganan ||
        item?.paketLangganan ||
        item?.namaPaket ||
        item?.nama ||
        item?.name ||
        item?.title ||
        "";

      const durasi = item?.durasi || item?.masaAktif || item?.bulan || "";
      const label = String(namaPaket || "").includes("Bulan")
        ? String(namaPaket || "").trim()
        : `${String(namaPaket || "").trim()}${durasi ? ` (${durasi})` : ""}`.trim();

      const harga = Number(
        item?.hargaBerlangganan ||
          item?.harga ||
          item?.hargaPaket ||
          item?.price ||
          item?.nominal ||
          item?.amount ||
          0,
      );

      if (!label || !harga) return null;

      return { label, harga } as PaketOption;
    })
    .filter(Boolean) as PaketOption[];

  const unique = new Map<string, PaketOption>();
  options.forEach((option) => unique.set(option.label, option));

  return Array.from(unique.values());
};

const getPaketLanggananFromStorage = () => {
  for (const key of PAKET_LANGGANAN_STORAGE_KEYS) {
    const cached = localStorage.getItem(key);

    if (!cached) continue;

    try {
      const parsed = JSON.parse(cached);
      const normalized = normalizePaketLanggananOptions(parsed);

      if (normalized.length > 0) return normalized;
    } catch {
      continue;
    }
  }

  return DEFAULT_PAKET_LANGGANAN_OPTIONS;
};

const formatRupiah = (value: number) => {
  if (!value) return "Rp0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const parseRupiahInput = (value: string) => {
  return Number(String(value || "").replace(/\D/g, ""));
};

const formatNumberInput = (value: string | number) => {
  const number = typeof value === "number" ? value : parseRupiahInput(value);

  if (!number) return "";

  return new Intl.NumberFormat("id-ID").format(number);
};

export default function JenisMitraFormModal({
  open = false,
  mode = "create",
  initialForm = emptyForm,
  onClose = () => {},
  onSave = () => {},
}: {
  open?: boolean;
  mode?: "create" | "edit";
  initialForm?: JenisMitraForm;
  onClose?: () => void;
  onSave?: (payload: JenisMitraForm) => void;
}) {
  const [form, setForm] = useState<JenisMitraForm>(initialForm);
  const [paketLanggananOptions, setPaketLanggananOptions] = useState<PaketOption[]>(
    DEFAULT_PAKET_LANGGANAN_OPTIONS,
  );

  useEffect(() => {
    if (open) {
      setPaketLanggananOptions(getPaketLanggananFromStorage());
    }

    setForm(initialForm);
  }, [initialForm, open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const selectedPaket = useMemo(() => {
    return paketLanggananOptions.find((item) => item.label === form.paketBerlangganan) || null;
  }, [form.paketBerlangganan]);

  const updateForm = <K extends keyof JenisMitraForm>(key: K, value: JenisMitraForm[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePaketChange = (value: string) => {
    const paket = paketLanggananOptions.find((item) => item.label === value);

    setForm((prev) => ({
      ...prev,
      paketBerlangganan: value,
      hargaBerlangganan: paket?.harga || 0,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.jenisMitra.trim()) {
      alert("Nama jenis mitra wajib diisi.");
      return;
    }

    if (!form.paketBerlangganan.trim()) {
      alert("Paket langganan wajib dipilih.");
      return;
    }

    if (!form.hargaBerlangganan) {
      alert("Harga paket wajib diisi.");
      return;
    }

    if (!form.komisi) {
      alert("Komisi wajib diisi.");
      return;
    }

    onSave({
      jenisMitra: form.jenisMitra.trim(),
      paketBerlangganan: form.paketBerlangganan.trim(),
      hargaBerlangganan: Number(form.hargaBerlangganan || 0),
      komisi: Number(form.komisi || 0),
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-6 w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#C92C1E] via-[#E54837] to-[#FF8A65] p-5 text-white">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/15" />
          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/10" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">
                {mode === "edit" ? "Edit Jenis Mitra" : "Tambah Jenis Mitra"}
              </h2>
              <p className="mt-1 max-w-lg text-xs font-medium leading-5 text-white/80">
                Isi nama jenis mitra, pilih Paket Langganan, lalu isi komisi.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white transition hover:bg-white/30"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          <section className="rounded-3xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-black text-gray-900">Data Jenis Mitra</h3>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Bulan dan harga otomatis mengikuti Paket Langganan yang dipilih.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Nama Jenis Mitra
                </span>
                <input
                  value={form.jenisMitra}
                  onChange={(event) => updateForm("jenisMitra", event.target.value)}
                  placeholder="Contoh: Referal"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Paket Langganan
                </span>
                <select
                  value={form.paketBerlangganan}
                  onChange={(event) => handlePaketChange(event.target.value)}
                  className="w-full cursor-pointer rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                >
                  <option value="">Pilih Paket Langganan</option>
                  {paketLanggananOptions.map((paket) => (
                    <option key={paket.label} value={paket.label}>
                      {paket.label} — {formatRupiah(paket.harga)}
                    </option>
                  ))}
                </select>
              </label>

              {selectedPaket && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                    Paket Terpilih
                  </p>
                  <p className="mt-1 text-sm font-black text-gray-900">
                    {selectedPaket.label}
                  </p>
                  <p className="mt-1 text-xs font-bold text-gray-500">
                    Harga otomatis: {formatRupiah(selectedPaket.harga)}
                  </p>
                </div>
              )}

              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Harga Paket
                </span>
                <input
                  value={formatNumberInput(form.hargaBerlangganan)}
                  readOnly
                  placeholder="Otomatis dari Paket Langganan"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-500 outline-none"
                />
              </label>

              <label className="rounded-3xl border border-red-100 bg-red-50 p-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                  Komisi
                </span>
                <input
                  value={formatNumberInput(form.komisi)}
                  onChange={(event) => updateForm("komisi", parseRupiahInput(event.target.value))}
                  placeholder="Contoh: 150.000"
                  className="mt-2 w-full rounded-2xl border border-red-100 bg-white px-4 py-3 text-xs font-black text-[#C92C1E] outline-none focus:border-[#C92C1E]"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-red-100 bg-red-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
              Ringkasan
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <p className="text-[10px] font-black uppercase text-red-400">Jenis Mitra</p>
                <p className="mt-1 text-sm font-black text-gray-900">{form.jenisMitra || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-red-400">Paket</p>
                <p className="mt-1 text-sm font-black text-gray-900">{form.paketBerlangganan || "-"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-red-400">Komisi</p>
                <p className="mt-1 text-sm font-black text-[#C92C1E]">{formatRupiah(form.komisi)}</p>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-gray-200 px-5 py-3 text-xs font-black text-gray-500 transition hover:bg-gray-50"
            >
              Batal
            </button>

            <button
              type="submit"
              className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white transition hover:bg-[#A82216]"
            >
              {mode === "edit" ? "Simpan Perubahan" : "Simpan Jenis Mitra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}