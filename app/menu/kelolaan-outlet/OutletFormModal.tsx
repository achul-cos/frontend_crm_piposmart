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
import ScreenPortal from "@/app/components/ui/ScreenPortal";
import { useLocation } from "@/app/lib/useLocation";

const modalInputClass =
  "w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(201,44,30,0.1)] disabled:bg-gray-100 disabled:text-gray-400";

const modalSelectClass =
  "w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition-all focus:border-[#C92C1E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(201,44,30,0.1)] disabled:bg-gray-100 disabled:text-gray-400";

const modalTextareaClass =
  "w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:shadow-[0_0_0_4px_rgba(201,44,30,0.1)] disabled:bg-gray-100 disabled:text-gray-400";

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
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
    <ScreenPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 md:p-6">
        <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl max-h-[90vh]">
          
          {/* Header - Premium gradient & layout */}
          <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-white px-8 py-6 border-b border-gray-100 flex-shrink-0">
            <div className="absolute top-0 right-0 p-4">
               <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/50 text-gray-400 backdrop-blur-sm transition-all hover:bg-white hover:text-gray-700 hover:shadow-sm"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C92C1E] to-red-600 text-white shadow-lg shadow-red-200/50">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="pt-1">
                <h3 className="text-xl font-bold tracking-tight text-gray-900">
                  {mode === "edit" ? "Edit Data Outlet" : "Tambah Outlet Baru"}
                </h3>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  {mode === "edit"
                    ? "Perbarui informasi detail lokasi usaha outlet."
                    : "Pendaftaran outlet baru. Kode outlet akan dibuat otomatis jika dikosongkan."}
                </p>
              </div>
            </div>
          </div>

          {/* Form Body - Scrollable */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden p-8">
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/80 p-4 text-red-800 backdrop-blur-sm animate-in slide-in-from-top-2">
                <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-semibold">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  Owner <span className="text-[#C92C1E]">*</span>
                </span>
                <OwnerSearchPicker value={owner} onChange={setOwner} disabled={mode === "edit"} />
              </label>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
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
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
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

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
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
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
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
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
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
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
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
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
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
                      <option key={v.id} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
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
          </form>

          {/* Footer Actions */}
          <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-gray-100 bg-white px-8 py-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSaving}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-[#C92C1E] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-[#b02619] disabled:opacity-50 disabled:shadow-none"
            >
              {isSaving ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Menyimpan...
                </>
              ) : (
                <>
                  {mode === "edit" ? "Simpan Perubahan" : "Simpan Outlet"}
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </ScreenPortal>
  );
}
