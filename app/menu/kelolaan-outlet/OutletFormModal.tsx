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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-black text-gray-900">
          {mode === "edit" ? "Ubah Outlet" : "Tambah Outlet"}
        </h3>

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
            disabled={isSaving}
            className="rounded-xl bg-[#C92C1E] px-4 py-2 text-xs font-black text-white hover:bg-[#A82216] disabled:cursor-not-allowed disabled:bg-gray-400"
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
