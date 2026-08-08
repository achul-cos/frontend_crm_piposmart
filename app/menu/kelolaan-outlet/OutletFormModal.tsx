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
import { useLocation } from "@/app/lib/useLocation";

const modalInputClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400";

const modalSelectClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400";

const modalTextareaClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400";

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
  
  const {
    provinces,
    cities,
    districts,
    villages,
    loadCitiesByProvinceName,
    loadDistrictsByCityName,
    loadVillagesByDistrictName,
    loadAllForEdit,
    loadingProvinces,
    loadingCities,
    loadingDistricts,
    loadingVillages,
  } = useLocation();

  const [code, setCode] = useState(outlet?.code || "");
  const [name, setName] = useState(outlet?.name || "");
  const [phone, setPhone] = useState(outlet?.phone || "");
  const [province, setProvince] = useState(outlet?.province || "");
  const [city, setCity] = useState(outlet?.city || "");
  const [district, setDistrict] = useState(outlet?.district || "");
  const [subDistrict, setSubDistrict] = useState(outlet?.sub_district || "");
  const [address, setAddress] = useState(outlet?.address || "");
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mode edit: ambil data owner & lokasi
  useEffect(() => {
    if (mode === "edit") {
      if (outlet?.owner_id) {
        fetchOwnerDetail(outlet.owner_id)
          .then((res) => setOwner(res.data))
          .catch(() => {});
      }
      if (outlet?.province) {
        loadAllForEdit(outlet.province, outlet.city, outlet.district);
      }
    }
  }, [mode, outlet, loadAllForEdit]);

  const handleSubmit = async () => {
    if (!owner) {
      setError("Owner wajib dipilih.");
      return;
    }
    if (!name.trim()) {
      setError("Nama Outlet wajib diisi.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      code: code.trim() || undefined,
      name: name.trim(),
      phone: phone.trim() || undefined,
      province: province.trim() || undefined,
      city: city.trim() || undefined,
      district: district.trim() || undefined,
      sub_district: subDistrict.trim() || undefined,
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
      <div className="w-full md:w-[640px] max-w-full flex flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl transition-all">
        <div className="flex-shrink-0 border-b border-slate-100 bg-[linear-gradient(135deg,#fff_0%,#fff8f5_55%,#fee2e2_100%)] px-6 py-5">
          <h3 className="text-xl font-black text-slate-950">
            {mode === "edit" ? "Edit Data Outlet" : "Tambah Outlet Baru"}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1">
            {mode === "edit"
              ? "Perbarui informasi detail lokasi usaha outlet."
              : "Pendaftaran outlet baru. Kode outlet opsional dan akan terisi otomatis jika dikosongkan."}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[75vh]">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
              Data Outlet
            </p>

            <div className="mt-4 space-y-4">
              <label className="space-y-2 block">
                <span className="text-[11px] font-black uppercase tracking-wide text-black">
                  Owner <span className="text-[#C92C1E]">*</span>
                </span>
                <OwnerSearchPicker value={owner} onChange={setOwner} disabled={mode === "edit"} />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Nama Outlet <span className="text-[#C92C1E]">*</span>
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Toko Kopi Sejahtera Pusat"
                    className={modalInputClass}
                    required
                    disabled={isSaving}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Kode Outlet (Opsional)
                  </span>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Biarkan kosong untuk auto-generate"
                    className={modalInputClass}
                    disabled={isSaving}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Nomor Telepon Outlet
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className={modalInputClass}
                    disabled={isSaving}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Provinsi Outlet
                  </span>
                  <select
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value);
                      setCity("");
                      setDistrict("");
                      setSubDistrict("");
                      loadCitiesByProvinceName(e.target.value);
                    }}
                    className={modalSelectClass}
                    disabled={isSaving || loadingProvinces}
                  >
                    <option value="">Pilih Provinsi</option>
                    {provinces.map((p) => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Kota/Kabupaten Outlet
                  </span>
                  <select
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setDistrict("");
                      setSubDistrict("");
                      loadDistrictsByCityName(e.target.value);
                    }}
                    className={modalSelectClass}
                    disabled={isSaving || !province || loadingCities}
                  >
                    <option value="">Pilih Kota/Kabupaten</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Kecamatan Outlet
                  </span>
                  <select
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setSubDistrict("");
                      loadVillagesByDistrictName(e.target.value);
                    }}
                    className={modalSelectClass}
                    disabled={isSaving || !city || loadingDistricts}
                  >
                    <option value="">Pilih Kecamatan</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Kelurahan/Desa Outlet
                  </span>
                  <select
                    value={subDistrict}
                    onChange={(e) => setSubDistrict(e.target.value)}
                    className={modalSelectClass}
                    disabled={isSaving || !district || loadingVillages}
                  >
                    <option value="">Pilih Kelurahan/Desa</option>
                    {villages.map((v) => (
                      <option key={v.id} value={v.name}>{v.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2 block">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Alamat Lengkap Outlet
                </span>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Masukkan detail alamat outlet..."
                  rows={3}
                  className={modalTextareaClass}
                  disabled={isSaving}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50/80 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="rounded-2xl bg-[#C92C1E] px-6 py-3 text-xs font-black text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isSaving ? "Menyimpan..." : mode === "edit" ? "Simpan Perubahan" : "Simpan Outlet"}
          </button>
        </div>
      </div>
    </div>
  );
}
