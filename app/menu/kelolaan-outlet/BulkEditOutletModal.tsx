"use client";

import { useState } from "react";
import type { OutletOverviewItem } from "@/app/lib/api";

export interface BulkEditFields {
  phone?: string;
  province?: string;
  city?: string;
  address?: string;
}

/**
 * Bulk edit HANYA untuk field yang aman disamakan lintas banyak outlet
 * sekaligus (telepon/provinsi/kota/alamat). Kode & Nama outlet sengaja TIDAK
 * disediakan di sini — keduanya identitas unik per outlet, menyamakan
 * nilainya lewat bulk edit akan merusak data, bukan memperbaikinya.
 */
export default function BulkEditOutletModal({
  items,
  onClose,
  onSubmit,
}: {
  items: OutletOverviewItem[];
  onClose: () => void;
  onSubmit: (fields: BulkEditFields) => Promise<void>;
}) {
  const [enabledFields, setEnabledFields] = useState<Record<keyof BulkEditFields, boolean>>({
    phone: false,
    province: false,
    city: false,
    address: false,
  });
  const [values, setValues] = useState<BulkEditFields>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerCount = new Set(items.map((item) => item.owner.id).filter(Boolean)).size;
  const anyEnabled = Object.values(enabledFields).some(Boolean);

  const handleSubmit = async () => {
    if (!anyEnabled) {
      setError("Pilih minimal satu field yang ingin diubah.");
      return;
    }
    const fields: BulkEditFields = {};
    if (enabledFields.phone) fields.phone = (values.phone || "").trim();
    if (enabledFields.province) fields.province = (values.province || "").trim();
    if (enabledFields.city) fields.city = (values.city || "").trim();
    if (enabledFields.address) fields.address = (values.address || "").trim();

    setIsSaving(true);
    setError(null);
    try {
      await onSubmit(fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan bulk.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h3 className="text-lg font-black text-gray-900">Ubah {items.length} Outlet Sekaligus</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Data akan diterapkan ke {items.length} outlet dari {ownerCount} owner berbeda. Kode & nama
            outlet tidak bisa diubah lewat bulk edit.
          </p>
        </div>

        <div className="space-y-3">
          <BulkField
            label="Telepon"
            enabled={enabledFields.phone}
            value={values.phone || ""}
            onToggle={(v) => setEnabledFields((prev) => ({ ...prev, phone: v }))}
            onChange={(v) => setValues((prev) => ({ ...prev, phone: v }))}
            placeholder="6281234567890"
          />
          <BulkField
            label="Provinsi"
            enabled={enabledFields.province}
            value={values.province || ""}
            onToggle={(v) => setEnabledFields((prev) => ({ ...prev, province: v }))}
            onChange={(v) => setValues((prev) => ({ ...prev, province: v }))}
          />
          <BulkField
            label="Kota"
            enabled={enabledFields.city}
            value={values.city || ""}
            onToggle={(v) => setEnabledFields((prev) => ({ ...prev, city: v }))}
            onChange={(v) => setValues((prev) => ({ ...prev, city: v }))}
          />
          <BulkField
            label="Alamat"
            enabled={enabledFields.address}
            value={values.address || ""}
            onToggle={(v) => setEnabledFields((prev) => ({ ...prev, address: v }))}
            onChange={(v) => setValues((prev) => ({ ...prev, address: v }))}
          />
        </div>

        {error && <p className="text-xs font-bold text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-600"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving || !anyEnabled}
            className="rounded-xl bg-[#C92C1E] px-4 py-2 text-xs font-black text-white hover:bg-[#A82216] disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isSaving ? "Menyimpan..." : "Terapkan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkField({
  label,
  enabled,
  value,
  onToggle,
  onChange,
  placeholder,
}: {
  label: string;
  enabled: boolean;
  value: string;
  onToggle: (enabled: boolean) => void;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onToggle(event.target.checked)}
        className="mt-2.5 h-3.5 w-3.5 accent-[#C92C1E]"
      />
      <div className="flex-1 space-y-1">
        <label className="text-[10px] font-black uppercase text-gray-400">{label}</label>
        <input
          type="text"
          value={value}
          disabled={!enabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-bold outline-none focus:border-[#C92C1E] disabled:bg-gray-50 disabled:text-gray-300"
        />
      </div>
    </div>
  );
}
