"use client";

import { useState } from "react";
import type { OutletOverviewItem } from "@/app/lib/api";
import ScreenPortal from "@/app/components/ui/ScreenPortal";

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
    <ScreenPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 md:p-6">
        <div className="app-modal-panel w-full max-w-3xl rounded-[32px] shadow-2xl transition-all xl:max-w-4xl">
          <div className="app-modal-header px-5 py-4 md:px-6">
            <h3 className="text-lg font-black text-slate-950">Ubah {items.length} Outlet Sekaligus</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Data akan diterapkan ke {items.length} outlet dari {ownerCount} owner berbeda. Kode & nama
              outlet tidak bisa diubah lewat bulk edit.
            </p>
          </div>

          <div className="app-modal-body flex-1 min-h-0 space-y-4 p-5 md:p-6">
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
          </div>

          <div className="app-modal-footer flex flex-shrink-0 justify-end gap-2 px-5 py-4 md:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSaving || !anyEnabled}
              className="rounded-2xl bg-[#C92C1E] px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isSaving ? "Menyimpan..." : "Terapkan"}
            </button>
          </div>
        </div>
      </div>
    </ScreenPortal>
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
