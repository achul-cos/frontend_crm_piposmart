"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchOwnerDetail,
  type BackendOwner,
  fetchOwnerOutlets,
  type BackendOutlet,
  bulkCreateOwnerOutlets,
  bulkUpdateOwnerOutlets,
  bulkSoftDeleteOwnerOutlets,
  type ImportRowError,
  type ImportBatchResponse,
} from "@/app/lib/api";
import { useLocation } from "@/app/lib/useLocation";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

export default function OwnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  usePageTitle("Detail Owner");
  const router = useRouter();
  const resolvedParams = use(params);
  const ownerId = Number(resolvedParams.id);
  
  const [owner, setOwner] = useState<BackendOwner | null>(null);
  const [outlets, setOutlets] = useState<BackendOutlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    code: "",
    name: "",
    phone: "",
    province: "",
    city: "",
    district: "",
    sub_district: "",
    address: "",
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    id: 0,
    code: "",
    name: "",
    phone: "",
    province: "",
    city: "",
    district: "",
    sub_district: "",
    address: "",
  });

  const { provinces, cities, districts, villages, loadCitiesByProvinceName, loadDistrictsByCityName, loadVillagesByDistrictName, loadAllForEdit, loadingProvinces, loadingCities, loadingDistricts, loadingVillages } = useLocation();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ownerRes, outletsData] = await Promise.all([
        fetchOwnerDetail(ownerId),
        fetchOwnerOutlets(ownerId)
      ]);
      setOwner(ownerRes.data);
      setOutlets(outletsData);
    } catch (err) {
      console.error("Gagal memuat detail:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ownerId || isNaN(ownerId)) {
      router.replace("/menu/owner-outlet");
      return;
    }
    loadData();
  }, [ownerId, router]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.code.trim() || !addForm.name.trim()) {
      alert("Kode dan Nama Outlet wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await bulkCreateOwnerOutlets(ownerId, [addForm]);
      alert("Outlet berhasil ditambahkan!");
      setIsAddModalOpen(false);
      setAddForm({ code: "", name: "", phone: "", province: "", city: "", district: "", sub_district: "", address: "" });
      // Reload outlets
      const outletsData = await fetchOwnerOutlets(ownerId);
      setOutlets(outletsData);
    } catch (err: any) {
      console.error("Gagal menambah outlet:", err);
      const errorMessage = err?.message || "Periksa kembali data (Kode Outlet mungkin sudah terpakai).";
      alert(`Gagal menambahkan outlet. ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (outlet: BackendOutlet) => {
    setEditForm({
      id: outlet.id,
      code: outlet.code || "",
      name: outlet.name || "",
      phone: outlet.phone || "",
      province: outlet.province || "",
      city: outlet.city || "",
      district: outlet.district || "",
      sub_district: outlet.sub_district || "",
      address: outlet.address || "",
    });
    loadAllForEdit(outlet.province, outlet.city, outlet.district);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.code.trim() || !editForm.name.trim()) {
      alert("Kode dan Nama Outlet wajib diisi.");
      return;
    }

    setIsEditSubmitting(true);
    try {
      await bulkUpdateOwnerOutlets(ownerId, [editForm]);
      alert("Outlet berhasil diperbarui!");
      setIsEditModalOpen(false);
      // Reload outlets
      const outletsData = await fetchOwnerOutlets(ownerId);
      setOutlets(outletsData);
    } catch (err: any) {
      console.error("Gagal memperbarui outlet:", err);
      const errorMessage = err?.message || "Silakan coba lagi.";
      alert(`Gagal memperbarui outlet. ${errorMessage}`);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteClick = async (outletId: number) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus outlet ini?")) {
      try {
        await bulkSoftDeleteOwnerOutlets(ownerId, [outletId]);
        alert("Outlet berhasil dihapus.");
        const outletsData = await fetchOwnerOutlets(ownerId);
        setOutlets(outletsData);
      } catch (err) {
        console.error("Gagal menghapus outlet:", err);
        alert("Gagal menghapus outlet.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
            <span>Menu</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <button onClick={() => router.push("/menu/owner-outlet")} className="hover:text-[#C92C1E] transition-colors">
              Owner
            </button>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Detail Data</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isLoading ? "Memuat Data..." : owner ? `Detail Owner: ${owner.name}` : "Data Tidak Ditemukan"}
          </h1>
        </div>
        <button
          onClick={() => router.push("/menu/owner-outlet")}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#C92C1E] flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Daftar
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20 text-gray-500 gap-3 bg-white rounded-2xl border border-gray-200/60 shadow-sm">
          <svg className="animate-spin h-6 w-6 text-[#C92C1E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-semibold text-sm">Mengambil rincian data...</span>
        </div>
      ) : !owner ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Owner Tidak Ditemukan</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">Data owner yang Anda cari mungkin telah dihapus atau ID tidak valid.</p>
          <button
            onClick={() => router.push("/menu/owner-outlet")}
            className="rounded-lg bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 inline-flex items-center gap-2"
          >
            Kembali ke Halaman Utama
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Level 1: Ringkasan (Quick Stats) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-[#C92C1E] to-[#A82216] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">Total Outlet Terdaftar</p>
                <h2 className="text-3xl font-black">{outlets.length}</h2>
              </div>
              <svg className="absolute -bottom-4 -right-4 w-28 h-28 text-white opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-[#C92C1E] transition-colors">
              <div className="relative z-10">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Kode Owner</p>
                <h2 className="text-3xl font-black text-gray-900">{owner.code}</h2>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-[#C92C1E] transition-colors">
              <div className="relative z-10">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Status Owner</p>
                <h2 className="text-3xl font-black text-gray-900">{owner.status}</h2>
              </div>
              <div className="absolute top-0 right-0 p-5">
                <span className="flex h-3 w-3 relative">
                  {owner.status === "ACTIVE" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${owner.status === "ACTIVE" ? "bg-emerald-500" : "bg-red-500"}`}></span>
                </span>
              </div>
            </div>
          </div>

          {/* Level 2: Informasi Dasar */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
              <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900 leading-tight">Informasi Dasar</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Identitas owner</p>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nama Owner</span>
                <span className="font-bold text-gray-900">{owner.name}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Brand</span>
                <span className="font-bold text-gray-900">{owner.brand_name || "-"}</span>
              </div>
            </div>
          </div>

          {/* Level 3: Kontak & Lokasi */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
              <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900 leading-tight">Kontak &amp; Lokasi</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cara menghubungi dan alamat owner</p>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 border-b border-gray-50">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nomor Kontak</span>
                <span className="font-bold text-gray-900">{owner.phone || "-"}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Provinsi</span>
                <span className="font-bold text-gray-900">{owner.province || "-"}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kota/Kabupaten</span>
                <span className="font-bold text-gray-900">{owner.city || "-"}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kecamatan</span>
                <span className="font-bold text-gray-900">{owner.district || "-"}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kelurahan</span>
                <span className="font-bold text-gray-900">{owner.sub_district || "-"}</span>
              </div>
            </div>
            <div className="px-5 pb-5 pt-3">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Alamat Lengkap</span>
                <span className="font-bold text-gray-900">{owner.address || "-"}</span>
              </div>
            </div>
          </div>

          {/* Level 4: Daftar Outlet */}
          <div className="w-full bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 p-2.5 rounded-xl border border-red-100 hidden sm:block">
                  <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900 leading-tight">Daftar Outlet</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Daftar lokasi usaha milik {owner.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 flex items-center gap-2 shrink-0 shadow-sm shadow-red-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Outlet
              </button>
            </div>
            
            <div className="flex-1 overflow-x-auto">
              {outlets.length === 0 ? (
                <div className="text-center py-20 bg-white">
                  <div className="mx-auto h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                    <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Belum Ada Outlet</h3>
                  <p className="text-gray-500 text-xs font-medium">Owner ini belum mendaftarkan outlet apapun.</p>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-5 text-[#C92C1E] font-bold text-xs hover:underline flex items-center justify-center gap-1 mx-auto"
                  >
                    Klik Tambah Outlet di sini <span aria-hidden="true">&rarr;</span>
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/80 uppercase text-gray-500 text-[10px] font-black tracking-wider border-b-2 border-[#C92C1E]">
                    <tr>
                      <th className="px-6 py-4">Kode</th>
                      <th className="px-6 py-4">Nama Outlet</th>
                      <th className="px-6 py-4">Kontak</th>
                      <th className="px-6 py-4">Lokasi</th>
                      <th className="px-6 py-4">Alamat Lengkap</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-xs">
                    {outlets.map((outlet) => (
                      <tr key={outlet.id} className="transition-colors hover:bg-red-50/30 group">
                        <td className="px-6 py-4 font-bold text-gray-900">{outlet.code || "-"}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{outlet.name}</td>
                        <td className="px-6 py-4 text-gray-600 font-medium">{outlet.phone || "-"}</td>
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          {[outlet.sub_district, outlet.district, outlet.city, outlet.province].filter(Boolean).join(", ") || "-"}
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">{outlet.address || "-"}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-tight ${
                            (outlet.status || "ACTIVE") === "ACTIVE" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${(outlet.status || "ACTIVE") === "ACTIVE" ? "bg-emerald-500" : "bg-red-500"}`}></span>
                            {outlet.status || "ACTIVE"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-100 sm:opacity-100 transition-opacity">
                            <Link 
                              href={`/menu/kelolaan-outlet/detail?id=${outlet.id}`}
                              className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700" 
                              title="Lihat Detail Outlet"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                            <button 
                              onClick={() => handleEditClick(outlet)}
                              className="rounded-lg bg-orange-50 p-2 text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-700" 
                              title="Edit Outlet"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(outlet.id)}
                              className="rounded-lg bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600" 
                              title="Hapus Outlet"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Outlet */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div 
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => !isSubmitting && setIsAddModalOpen(false)} 
          />
          
          <div className="relative z-10 w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Tambah Outlet Baru
                </h3>
                <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mt-1">
                  Untuk Owner: <span className="text-[#C92C1E]">{owner?.name}</span>
                </p>
              </div>
              <button
                onClick={() => !isSubmitting && setIsAddModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Kode Outlet <span className="text-[#C92C1E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.code}
                    onChange={(e) => setAddForm({...addForm, code: e.target.value})}
                    placeholder="Contoh: OUT-001"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Nama Outlet <span className="text-[#C92C1E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({...addForm, name: e.target.value})}
                    placeholder="Contoh: Cabang Jakarta Pusat"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Nomor Kontak <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                  </label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({...addForm, phone: e.target.value})}
                    placeholder="Contoh: 081234567890"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Provinsi <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                    </label>
                    <select
                      value={addForm.province}
                      onChange={(e) => {
                        setAddForm({...addForm, province: e.target.value, city: "", district: "", sub_district: ""});
                        loadCitiesByProvinceName(e.target.value);
                      }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 bg-white"
                      disabled={isSubmitting || loadingProvinces}
                    >
                      <option value="">Pilih Provinsi</option>
                      {provinces.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Kota/Kabupaten <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                    </label>
                    <select
                      value={addForm.city}
                      onChange={(e) => {
                        setAddForm({...addForm, city: e.target.value, district: "", sub_district: ""});
                        loadDistrictsByCityName(e.target.value);
                      }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 bg-white"
                      disabled={isSubmitting || !addForm.province || loadingCities}
                    >
                      <option value="">Pilih Kota/Kabupaten</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Kecamatan <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                    </label>
                    <select
                      value={addForm.district}
                      onChange={(e) => {
                        setAddForm({...addForm, district: e.target.value, sub_district: ""});
                        loadVillagesByDistrictName(e.target.value);
                      }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 bg-white"
                      disabled={isSubmitting || !addForm.city || loadingDistricts}
                    >
                      <option value="">Pilih Kecamatan</option>
                      {districts.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Kelurahan/Desa <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                    </label>
                    <select
                      value={addForm.sub_district}
                      onChange={(e) => setAddForm({...addForm, sub_district: e.target.value})}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 bg-white"
                      disabled={isSubmitting || !addForm.district || loadingVillages}
                    >
                      <option value="">Pilih Kelurahan/Desa</option>
                      {villages.map(v => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Alamat Lengkap <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                  </label>
                  <textarea
                    value={addForm.address}
                    onChange={(e) => setAddForm({...addForm, address: e.target.value})}
                    placeholder="Masukkan detail alamat outlet..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 resize-none"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !addForm.name.trim() || !addForm.code.trim()}
                  className="rounded-xl bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menyimpan Outlet...
                    </>
                  ) : (
                    "Simpan Outlet Baru"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Outlet */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div 
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => !isEditSubmitting && setIsEditModalOpen(false)} 
          />
          
          <div className="relative z-10 w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Edit Outlet
                </h3>
                <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mt-1">
                  Untuk Owner: <span className="text-orange-600">{owner?.name}</span>
                </p>
              </div>
              <button
                onClick={() => !isEditSubmitting && setIsEditModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                disabled={isEditSubmitting}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Kode Outlet <span className="text-[#C92C1E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.code}
                    onChange={(e) => setEditForm({...editForm, code: e.target.value})}
                    placeholder="Contoh: OUT-001"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all text-gray-900"
                    required
                    disabled={isEditSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Nama Outlet <span className="text-[#C92C1E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    placeholder="Contoh: Cabang Jakarta Pusat"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all text-gray-900"
                    required
                    disabled={isEditSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Nomor Kontak <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    placeholder="Contoh: 081234567890"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all text-gray-900"
                    disabled={isEditSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Provinsi <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                    </label>
                    <select
                      value={editForm.province}
                      onChange={(e) => {
                        setEditForm({...editForm, province: e.target.value, city: "", district: "", sub_district: ""});
                        loadCitiesByProvinceName(e.target.value);
                      }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all text-gray-900 bg-white"
                      disabled={isEditSubmitting || loadingProvinces}
                    >
                      <option value="">Pilih Provinsi</option>
                      {provinces.map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Kota/Kabupaten <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                    </label>
                    <select
                      value={editForm.city}
                      onChange={(e) => {
                        setEditForm({...editForm, city: e.target.value, district: "", sub_district: ""});
                        loadDistrictsByCityName(e.target.value);
                      }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all text-gray-900 bg-white"
                      disabled={isEditSubmitting || !editForm.province || loadingCities}
                    >
                      <option value="">Pilih Kota/Kabupaten</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Kecamatan <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                    </label>
                    <select
                      value={editForm.district}
                      onChange={(e) => {
                        setEditForm({...editForm, district: e.target.value, sub_district: ""});
                        loadVillagesByDistrictName(e.target.value);
                      }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all text-gray-900 bg-white"
                      disabled={isEditSubmitting || !editForm.city || loadingDistricts}
                    >
                      <option value="">Pilih Kecamatan</option>
                      {districts.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Kelurahan/Desa <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                    </label>
                    <select
                      value={editForm.sub_district}
                      onChange={(e) => setEditForm({...editForm, sub_district: e.target.value})}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all text-gray-900 bg-white"
                      disabled={isEditSubmitting || !editForm.district || loadingVillages}
                    >
                      <option value="">Pilih Kelurahan/Desa</option>
                      {villages.map(v => (
                        <option key={v.id} value={v.name}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Alamat Lengkap <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                  </label>
                  <textarea
                    value={editForm.address}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    placeholder="Masukkan detail alamat outlet..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all text-gray-900 resize-none"
                    disabled={isEditSubmitting}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isEditSubmitting}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting || !editForm.name.trim() || !editForm.code.trim()}
                  className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isEditSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
