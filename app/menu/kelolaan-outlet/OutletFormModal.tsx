"use client";

import { useEffect, useState } from "react";
import {
  createOutletForOwner,
  updateOutletForOwner,
  fetchOwnerDetail,
  type BackendOwner,
  type BackendOutlet,
} from "@/app/lib/api";
import OwnerSearchPicker from "@/app/components/OwnerSearchPicker";

/**
 * Modal Tambah/Edit Outlet — admin-only (digate di halaman pemanggil,
 * dan ditegakkan ulang di backend `actorCanManageOwners`). Pemilihan Owner
 * WAJIB lewat `OwnerSearchPicker` (search-as-you-type), bukan dropdown.
 */
export default function OutletFormModal({
  mode,
  outlet,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  outlet?: BackendOutlet;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [owner, setOwner] = useState<BackendOwner | null>(
    outlet?.owner_id
      ? { id: outlet.owner_id, code: "", name: "Memuat...", phone: "", brand_name: "", status: "ACTIVE" }
      : null,
  );
  const [code, setCode] = useState(outlet?.code || "");
  const [name, setName] = useState(outlet?.name || "");
  const [phone, setPhone] = useState(outlet?.phone || "");
  const [province, setProvince] = useState(outlet?.province || "");
  const [city, setCity] = useState(outlet?.city || "");
  const [address, setAddress] = useState(outlet?.address || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mode edit: field owner sudah terisi id tapi belum tahu kode/nama —
  // ambil detail owner sekali supaya OwnerSearchPicker menampilkan label
  // yang benar, bukan cuma "Memuat...".
  useEffect(() => {
    if (mode === "edit" && outlet?.owner_id) {
      fetchOwnerDetail(outlet.owner_id)
        .then((res) => setOwner(res.data))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!owner) {
      setError("Owner wajib dipilih.");
      return;
    }
    if (!code.trim() || !name.trim()) {
      setError("Kode dan Nama Outlet wajib diisi.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      code: code.trim(),
      name: name.trim(),
      phone: phone.trim() || undefined,
      province: province.trim() || undefined,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
    };

    try {
      if (mode === "edit" && outlet) {
        await updateOutletForOwner(owner.id, outlet.id, payload);
      } else {
        await createOutletForOwner(owner.id, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan data outlet.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 md:p-6">
      <div className="w-full md:w-[50vw] max-w-[50vw] h-[70vh] max-h-[70vh] flex flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl transition-all">
        <div className="flex-shrink-0 border-b border-slate-100 bg-[linear-gradient(135deg,#fff_0%,#fff8f5_55%,#fee2e2_100%)] px-5 py-4 md:px-6">
          <h3 className="text-lg font-black text-slate-950">
            {mode === "edit" ? "Ubah Outlet" : "Tambah Outlet"}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4">

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-gray-400">Owner *</label>
          <OwnerSearchPicker value={owner} onChange={setOwner} disabled={mode === "edit"} />
        </div>

        <FormField label="Kode Outlet *" value={code} onChange={setCode} placeholder="OUT-00001" />
        <FormField label="Nama Outlet *" value={name} onChange={setName} placeholder="Laundry Cerah Cabang 1" />
        <FormField label="Telepon" value={phone} onChange={setPhone} placeholder="6281234567890" />
        <FormField label="Kota" value={city} onChange={setCity} />
        <FormField label="Provinsi" value={province} onChange={setProvince} />
        <FormField label="Alamat" value={address} onChange={setAddress} />

        </div>

        <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-4 md:px-6 flex justify-end gap-2">
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
            disabled={isSaving}
            className="rounded-2xl bg-[#C92C1E] px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase text-gray-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-bold outline-none focus:border-[#C92C1E]"
      />
    </div>
  );
}
