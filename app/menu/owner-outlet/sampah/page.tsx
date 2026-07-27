"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchOwners,
  type BackendOwner,
  createOwner,
  uploadImportFile,
  getImportBatch,
  commitImportBatch,
  type ImportBatchResponse,
  updateOwner,
  restoreOwner,
  softDeleteOwner,
  bulkSoftDeleteOwners,
} from "@/app/lib/api";
import { useLocation } from "@/app/lib/useLocation";
import * as XLSX from "xlsx";

export default function OwnerOutletTrashPage() {
  const router = useRouter();
  const [owners, setOwners] = useState<BackendOwner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [search, setSearch] = useState("");
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<number[]>([]);

  // Import Excel Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBatch, setImportBatch] = useState<ImportBatchResponse | null>(null);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Add Owner Modal State
  const [isAddOwnerModalOpen, setIsAddOwnerModalOpen] = useState(false);
  const [isAddOwnerSubmitting, setIsAddOwnerSubmitting] = useState(false);
  const [addOwnerForm, setAddOwnerForm] = useState({
    code: "",
    name: "",
    brand_name: "",
    phone: "",
    province: "",
    city: "",
    address: "",
  });

  // Edit Owner Modal State
  const [isEditOwnerModalOpen, setIsEditOwnerModalOpen] = useState(false);
  const [isEditOwnerSubmitting, setIsEditOwnerSubmitting] = useState(false);
  const [editOwnerForm, setEditOwnerForm] = useState({
    id: 0,
    code: "",
    name: "",
    brand_name: "",
    phone: "",
    province: "",
    city: "",
    address: "",
  });

  const { provinces, cities, loadCitiesByProvinceName, loadingProvinces, loadingCities } = useLocation();

  useEffect(() => {
    if (isEditOwnerModalOpen && editOwnerForm.province && provinces.length > 0) {
      loadCitiesByProvinceName(editOwnerForm.province);
    }
  }, [isEditOwnerModalOpen, editOwnerForm.province, provinces]);

  const loadOwners = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchOwners({
        page: pagination.page,
        limit: pagination.limit,
        q: search,
        status: "DELETED",
      });
      setOwners(res.data.items);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Gagal memuat data owner:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    loadOwners();
  }, [loadOwners]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadOwners();
  };

  const handleAddOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addOwnerForm.code.trim() || !addOwnerForm.name.trim()) {
      alert("Kode dan Nama Owner wajib diisi.");
      return;
    }
    
    setIsAddOwnerSubmitting(true);
    try {
      await createOwner(addOwnerForm);
      alert("Owner berhasil ditambahkan");
      setIsAddOwnerModalOpen(false);
      setAddOwnerForm({
        code: "", name: "", brand_name: "", phone: "", province: "", city: "", address: ""
      });
      loadOwners();
    } catch (err: any) {
      alert(err.message || "Gagal menambahkan owner");
    } finally {
      setIsAddOwnerSubmitting(false);
    }
  };

  const handleOpenEditOwner = (owner: BackendOwner) => {
    setEditOwnerForm({
      id: owner.id,
      code: owner.code,
      name: owner.name,
      brand_name: owner.brand_name || "",
      phone: owner.phone || "",
      province: owner.province || "",
      city: owner.city || "",
      address: owner.address || "",
    });
    if (owner.province) {
      loadCitiesByProvinceName(owner.province);
    }
    setIsEditOwnerModalOpen(true);
  };

  const handleEditOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOwnerForm.code.trim() || !editOwnerForm.name.trim()) {
      alert("Kode dan Nama Owner wajib diisi.");
      return;
    }

    setIsEditOwnerSubmitting(true);
    try {
      await updateOwner(editOwnerForm.id, {
        code: editOwnerForm.code,
        name: editOwnerForm.name,
        brand_name: editOwnerForm.brand_name,
        phone: editOwnerForm.phone,
        province: editOwnerForm.province,
        city: editOwnerForm.city,
        address: editOwnerForm.address,
      });
      alert("Owner berhasil diupdate");
      setIsEditOwnerModalOpen(false);
      loadOwners();
    } catch (err: any) {
      alert(err.message || "Gagal update owner");
    } finally {
      setIsEditOwnerSubmitting(false);
    }
  };

  const handleDeleteOwner = async (ownerId: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus owner ini?")) return;
    try {
      await softDeleteOwner(ownerId);
      loadOwners();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus owner");
    }
  };

  const handleRestoreOwner = async (ownerId: number) => {
    if (!confirm("Apakah Anda yakin ingin merestore owner ini?")) return;
    try {
      await restoreOwner(ownerId);
      loadOwners();
    } catch (err: any) {
      alert(err.message || "Gagal merestore owner");
    }
  };

  const handleExportExcel = () => {
    const activeOwners = owners.filter(o => o.status === "ACTIVE");
    if (activeOwners.length === 0) {
      alert("Tidak ada data owner aktif untuk di-export.");
      return;
    }
    const dataToExport = activeOwners.map(o => ({
      "Kode Owner": o.code,
      "Nama Owner": o.name,
      "Brand/Usaha": o.brand_name || "-",
      "Kontak": o.phone || "-",
      "Provinsi": o.province || "-",
      "Kota/Kabupaten": o.city || "-",
      "Alamat Lengkap": o.address || "-",
      "Total Outlet": o.outlet_count || 0
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Owner");
    XLSX.writeFile(workbook, `Data_Owner_Aktif_${new Date().getTime()}.xlsx`);
  };

  const handleBulkDelete = async () => {
    if (selectedOwnerIds.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedOwnerIds.length} owner terpilih?`)) return;
    
    try {
      await bulkSoftDeleteOwners(selectedOwnerIds);
      setSelectedOwnerIds([]);
      loadOwners();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus owner terpilih.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setImportError(null);
    }
  };

  const handleUploadClick = async () => {
    if (!importFile) return;
    setIsImportLoading(true);
    setImportError(null);
    try {
      const resp = await uploadImportFile(importFile, "OWNER_OUTLET");
      setImportBatch(resp);
      pollImportStatus(resp.id);
    } catch (err: any) {
      setImportError(err.message || "Gagal mengunggah file");
      setIsImportLoading(false);
    }
  };

  const pollImportStatus = async (batchId: number) => {
    try {
      const resp = await getImportBatch(batchId);
      setImportBatch(resp);
      if (resp.status === "VALIDATING" || resp.status === "UPLOADED") {
        setTimeout(() => pollImportStatus(batchId), 2000);
      } else {
        setIsImportLoading(false);
      }
    } catch (err: any) {
      setImportError(err.message || "Gagal mengecek status import");
      setIsImportLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importBatch) return;
    setIsImportLoading(true);
    try {
      await commitImportBatch(importBatch.id);
      alert("Data berhasil disimpan!");
      setIsImportModalOpen(false);
      resetImportState();
      loadOwners();
    } catch (err: any) {
      setImportError(err.message || "Gagal menyimpan data import");
    } finally {
      setIsImportLoading(false);
    }
  };

  const resetImportState = () => {
    setImportFile(null);
    setImportBatch(null);
    setImportError(null);
    setIsImportLoading(false);
  };

  const handleViewOutlets = (owner: BackendOwner) => {
    router.push(`/menu/owner-outlet/${owner.id}`);
  };

  const activeCount = owners.filter(o => o.status === "ACTIVE").length;
  const inactiveCount = owners.length - activeCount;

  return (
    <div className="space-y-6">
      
      {/* Menu Header */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b-2 border-[#C92C1E] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
              <span>Menu</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#C92C1E]">Owner & Outlet</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Akun Owner Terhapus (Sampah)</h1>
          </div>
          
          <button 
            onClick={() => router.push('/menu/owner-outlet')}
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 shadow-sm"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali
          </button>
        </div>
      </div>

      {/* Information Cards - Modern Minimalist Red Dominant */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#C92C1E] to-[#A82216] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">Total Owner</p>
            <h2 className="text-3xl font-black">{pagination.total}</h2>
          </div>
          <svg className="absolute -bottom-4 -right-4 w-28 h-28 text-white opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.001 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-[#C92C1E] transition-colors">
          <div className="relative z-10">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Owner Aktif</p>
            <h2 className="text-3xl font-black text-gray-900">{activeCount}</h2>
          </div>
          <div className="absolute top-0 right-0 p-5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-[#C92C1E] transition-colors">
          <div className="relative z-10">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Owner Non-Aktif</p>
            <h2 className="text-3xl font-black text-gray-900">{inactiveCount}</h2>
          </div>
          <div className="absolute top-0 right-0 p-5">
             <span className="flex h-3 w-3 relative">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari Owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] min-w-[200px] text-gray-700"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#C92C1E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Cari
            </button>
          </form>
          
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            {selectedOwnerIds.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-100 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Hapus Permanen Terpilih ({selectedOwnerIds.length})
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-xs uppercase text-gray-500 border-b-2 border-[#C92C1E]">
              <tr>
                <th className="px-4 py-4 font-bold text-center w-12">
                  <input 
                    type="checkbox" 
                    checked={owners.length > 0 && selectedOwnerIds.length === owners.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedOwnerIds(owners.map(o => o.id));
                      else setSelectedOwnerIds([]);
                    }}
                    className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                  />
                </th>
                <th className="px-4 py-4 font-bold">Kode</th>
                <th className="px-4 py-4 font-bold">Nama Owner</th>
                <th className="px-4 py-4 font-bold">Brand</th>
                <th className="px-4 py-4 font-bold">Kontak</th>
                <th className="px-4 py-4 font-bold">Lokasi</th>
                <th className="px-4 py-4 font-bold text-center">Status</th>
                <th className="px-4 py-4 font-bold text-center">Outlet</th>
                <th className="px-4 py-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-[#C92C1E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : owners.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                    Tidak ada data owner ditemukan.
                  </td>
                </tr>
              ) : (
                owners.map((owner) => (
                  <tr 
                    key={owner.id} 
                    onClick={() => handleViewOutlets(owner)}
                    className="transition-colors cursor-pointer hover:bg-red-50/30"
                  >
                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedOwnerIds.includes(owner.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedOwnerIds([...selectedOwnerIds, owner.id]);
                            else setSelectedOwnerIds(selectedOwnerIds.filter(id => id !== owner.id));
                          }}
                          className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                        />
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-900">{owner.code}</td>
                    <td className="px-4 py-4 font-medium text-gray-900">{owner.name}</td>
                    <td className="px-4 py-4">{owner.brand_name || "-"}</td>
                    <td className="px-4 py-4">{owner.phone}</td>
                    <td className="px-4 py-4">{owner.city ? `${owner.city}, ${owner.province || ""}` : "-"}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${
                        owner.status === "ACTIVE" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {owner.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 font-bold px-2 py-1 rounded-md text-xs">
                        {owner.outlet_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOutlets(owner);
                          }}
                          className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                          title="Lihat Detail Owner & Outlet"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenEditOwner(owner); }} 
                            className="rounded-lg bg-orange-50 p-2 text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-700" 
                            title="Edit Owner"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          {owner.status !== "ACTIVE" ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRestoreOwner(owner.id); }} 
                              className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700" 
                              title="Restore Owner"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteOwner(owner.id); }} 
                              className="rounded-lg bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700" 
                              title="Hapus Owner"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 p-4">
          <span className="text-xs text-gray-500">
            Total {pagination.total} Owner
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-xs font-bold text-gray-700">Halaman {pagination.page}</span>
            <button
              disabled={owners.length < pagination.limit}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
      
      {/* Modal Tambah Owner */}
      {isAddOwnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div 
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => !isAddOwnerSubmitting && setIsAddOwnerModalOpen(false)} 
          />
          
          <div className="relative z-10 w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Tambah Owner Baru
                </h3>
                <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mt-1">
                  Pendaftaran pemilik baru
                </p>
              </div>
              <button
                onClick={() => !isAddOwnerSubmitting && setIsAddOwnerModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                disabled={isAddOwnerSubmitting}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddOwnerSubmit} className="p-6">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Kode Owner <span className="text-[#C92C1E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={addOwnerForm.code}
                    onChange={(e) => setAddOwnerForm({...addOwnerForm, code: e.target.value})}
                    placeholder="Contoh: OWN-001"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                    required
                    disabled={isAddOwnerSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Nama Owner <span className="text-[#C92C1E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={addOwnerForm.name}
                    onChange={(e) => setAddOwnerForm({...addOwnerForm, name: e.target.value})}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                    required
                    disabled={isAddOwnerSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Nama Brand / Usaha <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={addOwnerForm.brand_name}
                    onChange={(e) => setAddOwnerForm({...addOwnerForm, brand_name: e.target.value})}
                    placeholder="Contoh: Toko Kopi Sejahtera"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                    disabled={isAddOwnerSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Nomor Kontak <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                  </label>
                  <input
                    type="tel"
                    value={addOwnerForm.phone}
                    onChange={(e) => setAddOwnerForm({...addOwnerForm, phone: e.target.value})}
                    placeholder="Contoh: 081234567890"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                    disabled={isAddOwnerSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Provinsi <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                    </label>
                    <select
                      value={addOwnerForm.province}
                      onChange={(e) => {
                        setAddOwnerForm({...addOwnerForm, province: e.target.value, city: ""});
                        loadCitiesByProvinceName(e.target.value);
                      }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 bg-white"
                      disabled={isAddOwnerSubmitting || loadingProvinces}
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
                      value={addOwnerForm.city}
                      onChange={(e) => setAddOwnerForm({...addOwnerForm, city: e.target.value})}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 bg-white"
                      disabled={isAddOwnerSubmitting || !addOwnerForm.province || loadingCities}
                    >
                      <option value="">Pilih Kota/Kabupaten</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Alamat Lengkap <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                  </label>
                  <textarea
                    value={addOwnerForm.address}
                    onChange={(e) => setAddOwnerForm({...addOwnerForm, address: e.target.value})}
                    placeholder="Masukkan detail alamat owner..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 resize-none"
                    disabled={isAddOwnerSubmitting}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddOwnerModalOpen(false)}
                  disabled={isAddOwnerSubmitting}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddOwnerSubmitting || !addOwnerForm.name.trim() || !addOwnerForm.code.trim()}
                  className="rounded-xl bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAddOwnerSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menyimpan Owner...
                    </>
                  ) : (
                    "Simpan Owner Baru"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Owner */}
      {isEditOwnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div 
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => !isEditOwnerSubmitting && setIsEditOwnerModalOpen(false)} 
          />
          
          <div className="relative z-10 w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Edit Data Owner
                </h3>
                <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mt-1">
                  Perbarui informasi pemilik
                </p>
              </div>
              <button
                onClick={() => !isEditOwnerSubmitting && setIsEditOwnerModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                disabled={isEditOwnerSubmitting}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditOwnerSubmit} className="p-6">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Kode Owner <span className="text-[#C92C1E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editOwnerForm.code}
                    onChange={(e) => setEditOwnerForm({...editOwnerForm, code: e.target.value})}
                    placeholder="Contoh: OWN-001"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                    required
                    disabled={isEditOwnerSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Nama Owner <span className="text-[#C92C1E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={editOwnerForm.name}
                    onChange={(e) => setEditOwnerForm({...editOwnerForm, name: e.target.value})}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                    required
                    disabled={isEditOwnerSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Nama Brand / Usaha <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={editOwnerForm.brand_name}
                    onChange={(e) => setEditOwnerForm({...editOwnerForm, brand_name: e.target.value})}
                    placeholder="Contoh: Toko Kopi Sejahtera"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                    disabled={isEditOwnerSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Nomor Kontak <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                  </label>
                  <input
                    type="tel"
                    value={editOwnerForm.phone}
                    onChange={(e) => setEditOwnerForm({...editOwnerForm, phone: e.target.value})}
                    placeholder="Contoh: 081234567890"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
                    disabled={isEditOwnerSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Provinsi <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                    </label>
                    <select
                      value={editOwnerForm.province}
                      onChange={(e) => {
                        setEditOwnerForm({...editOwnerForm, province: e.target.value, city: ""});
                        loadCitiesByProvinceName(e.target.value);
                      }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 bg-white"
                      disabled={isEditOwnerSubmitting || loadingProvinces}
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
                      value={editOwnerForm.city}
                      onChange={(e) => setEditOwnerForm({...editOwnerForm, city: e.target.value})}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 bg-white"
                      disabled={isEditOwnerSubmitting || !editOwnerForm.province || loadingCities}
                    >
                      <option value="">Pilih Kota/Kabupaten</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Alamat Lengkap <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                  </label>
                  <textarea
                    value={editOwnerForm.address}
                    onChange={(e) => setEditOwnerForm({...editOwnerForm, address: e.target.value})}
                    placeholder="Masukkan detail alamat owner..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900 resize-none"
                    disabled={isEditOwnerSubmitting}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditOwnerModalOpen(false)}
                  disabled={isEditOwnerSubmitting}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isEditOwnerSubmitting || !editOwnerForm.name.trim() || !editOwnerForm.code.trim()}
                  className="rounded-xl bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isEditOwnerSubmitting ? (
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

      {/* Modal Import Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div 
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => !isImportLoading && setIsImportModalOpen(false)} 
          />
          
          <div className="relative z-10 w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Import Excel
                </h3>
                <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mt-1">
                  Unggah data owner & outlet massal
                </p>
              </div>
              <button
                onClick={() => !isImportLoading && setIsImportModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                disabled={isImportLoading}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {importError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                  {importError}
                </div>
              )}

              {!importBatch || importBatch.status === "UPLOADED" || importBatch.status === "VALIDATING" ? (
                <>
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Silakan unggah file Excel (.xlsx) dengan mengikuti format yang ditentukan. Jika belum memiliki formatnya, Anda dapat mengunduh template berikut:
                    </p>
                    <a 
                      href="/api/v1/imports/template/owner" 
                      target="_blank"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#C92C1E] bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        // Buat file Excel sederhana jika endpoint belum ada,
                        // atau arahkan pengguna untuk membuat file dengan header tertentu.
                        alert("Pastikan file Excel Anda memiliki kolom header berikut pada baris pertama:\n\nKODE | NAMA | TELEPON | EMAIL | NAMA_BRAND | PROVINSI | KOTA | ALAMAT");
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Lihat Format Template
                    </a>
                  </div>

                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#C92C1E] transition-colors relative">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isImportLoading}
                    />
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-bold text-gray-700">
                      {importFile ? importFile.name : "Klik atau seret file Excel ke sini"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Hanya menerima file .xlsx</p>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleUploadClick}
                      disabled={!importFile || isImportLoading}
                      className="rounded-xl bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isImportLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Memvalidasi Data...
                        </>
                      ) : (
                        "Unggah & Validasi"
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                      <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Validasi Selesai</h4>
                    <p className="text-sm text-gray-600">
                      Sistem telah memeriksa isi file yang Anda unggah.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase">Total</p>
                      <p className="text-xl font-black text-gray-900 mt-1">{importBatch.total_rows}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-600 uppercase">Valid</p>
                      <p className="text-xl font-black text-emerald-700 mt-1">{importBatch.valid_rows}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl text-center border border-red-100">
                      <p className="text-xs font-bold text-red-600 uppercase">Error</p>
                      <p className="text-xl font-black text-red-700 mt-1">{importBatch.invalid_rows}</p>
                    </div>
                  </div>

                  {importBatch.invalid_rows > 0 && (
                    <div className="mb-6 p-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl text-sm font-medium">
                      Terdapat {importBatch.invalid_rows} baris dengan format yang salah atau data duplikat. Anda tetap bisa menyimpan {importBatch.valid_rows} data yang valid.
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => resetImportState()}
                      disabled={isImportLoading}
                      className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleCommitImport}
                      disabled={isImportLoading || importBatch.valid_rows === 0}
                      className="rounded-xl bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isImportLoading ? "Menyimpan..." : "Simpan Data Valid"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

