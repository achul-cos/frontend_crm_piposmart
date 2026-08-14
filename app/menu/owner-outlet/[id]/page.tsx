"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  authFetchJson,
  findRelatedLead,
  fetchOwnerDetail,
  type BackendOwner,
  type BackendLead,
  fetchOwnerOutlets,
  type BackendOutlet,
  bulkCreateOwnerOutlets,
  bulkUpdateOwnerOutlets,
  bulkSoftDeleteOwnerOutlets,
  fetchOwnerSubscriptions,
  type OwnerSubscriptionItem,
  listOwnerTransfers,
  type TransferItem,
  type WalletPaymentItem,
} from "@/app/lib/api";
import { formatPhoneDisplay } from "@/app/lib/phone";
import { useLocation } from "@/app/lib/useLocation";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import OwnerOverviewCard from "../OwnerOverviewCard";
import { useFeedback } from "@/app/components/feedback/FeedbackContext";
import { ViewActionButton, EditActionButton, DeleteActionButton, RowActionGroup } from "@/app/components/table/RowActionButton";

function formatIndonesianDate(value?: string | null, includeTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  
  const formatted = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);

  return includeTime ? `${formatted} WIB` : formatted;
}

function formatRupiah(value?: string | number | null) {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) return String(value || "-");

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatLabel(value?: string | null) {
  if (!value) return "-";

  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown[] }).items)) {
    return (payload as { items: T[] }).items;
  }
  return [];
}

async function fetchOwnerTopups(ownerId: number): Promise<WalletPaymentItem[]> {
  const response = await authFetchJson<{ data?: { items?: WalletPaymentItem[] } | WalletPaymentItem[] }>(
    `/wallet-payments/all?owner_id=${ownerId}&payment_type=TOPUP&sort=-paid_at`,
  );

  return normalizeItems<WalletPaymentItem>(response.data);
}

function paymentStatusBadgeClass(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "ACCEPTED":
    case "PAID":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "PENDING":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    case "EXPIRED":
      return "bg-gray-100 text-gray-500 border border-gray-200";
    default:
      return "bg-gray-50 text-gray-600 border border-gray-200";
  }
}

function transferStatusBadgeClass(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "MATCHED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "SUGGESTED":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "REJECTED_MATCH":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    default:
      return "bg-gray-100 text-gray-500 border border-gray-200";
  }
}

function subscriptionStatusBadgeClass(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE":
    case "COMPLETED":
    case "PAID":
    case "RECONCILED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "PENDING":
    case "PENDING_RECONCILIATION":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

export default function OwnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  usePageTitle("Detail Owner");
  const router = useRouter();
  const { showSuccess, showError, confirm, withLoading } = useFeedback();
  const resolvedParams = use(params);
  const ownerId = Number(resolvedParams.id);
  
  const [owner, setOwner] = useState<BackendOwner | null>(null);
  const [lead, setLead] = useState<BackendLead | null>(null);
  const [outlets, setOutlets] = useState<BackendOutlet[]>([]);
  const [topups, setTopups] = useState<WalletPaymentItem[]>([]);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<OwnerSubscriptionItem[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ownerRes, outletsData, topupData, transferData, subData, leadData] = await Promise.all([
        fetchOwnerDetail(ownerId),
        fetchOwnerOutlets(ownerId),
        fetchOwnerTopups(ownerId).catch(() => []),
        listOwnerTransfers(ownerId, { all: true }).then((result) => result.items || []).catch(() => []),
        fetchOwnerSubscriptions(ownerId).catch(() => []),
        findRelatedLead({ ownerId }).catch(() => null),
      ]);
      setOwner(ownerRes.data);
      setLead(leadData);
      setOutlets(outletsData);
      setTopups(topupData);
      setTransfers(transferData);
      setSubscriptions(subData);
    } catch (err) {
      console.error("Gagal memuat detail:", err);
    } finally {
      setIsLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId || isNaN(ownerId)) {
      router.replace("/menu/owner-outlet");
      return;
    }

    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData, ownerId, router]);

  const submitAddOutlet = async () => {
    setIsSubmitting(true);
    try {
      await withLoading(async () => {
        await bulkCreateOwnerOutlets(ownerId, [addForm]);
        const outletsData = await fetchOwnerOutlets(ownerId);
        setOutlets(outletsData);
      }, { label: "Menyimpan outlet baru..." });

      showSuccess({
        title: "Outlet berhasil ditambahkan",
        message: "Outlet baru berhasil disimpan untuk owner ini.",
      });
      setIsAddModalOpen(false);
      setAddForm({ code: "", name: "", phone: "", province: "", city: "", district: "", sub_district: "", address: "" });
    } catch (err: unknown) {
      console.error("Gagal menambah outlet:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Periksa kembali data (Kode Outlet mungkin sudah terpakai).";
      showError({
        title: "Gagal menambahkan outlet",
        message: "Sistem gagal menyimpan outlet baru.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau kode outlet sudah terpakai.",
        solution: "Periksa kembali data outlet dan koneksi Anda, lalu coba lagi.",
        technicalDetails: errorMessage,
        onRetry: () => void submitAddOutlet(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      showError({
        title: "Data belum lengkap",
        message: "Nama Outlet wajib diisi.",
        solution: "Lengkapi nama outlet terlebih dahulu.",
      });
      return;
    }

    void submitAddOutlet();
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

  const submitEditOutlet = async () => {
    setIsEditSubmitting(true);
    try {
      await withLoading(async () => {
        await bulkUpdateOwnerOutlets(ownerId, [editForm]);
        const outletsData = await fetchOwnerOutlets(ownerId);
        setOutlets(outletsData);
      }, { label: "Menyimpan perubahan outlet..." });

      showSuccess({
        title: "Outlet berhasil diperbarui",
        message: "Perubahan data outlet berhasil disimpan.",
      });
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      console.error("Gagal memperbarui outlet:", err);
      const errorMessage = err instanceof Error ? err.message : "Silakan coba lagi.";
      showError({
        title: "Gagal memperbarui outlet",
        message: "Sistem gagal menyimpan perubahan outlet.",
        cause: "Bisa disebabkan oleh koneksi bermasalah atau kode outlet sudah dipakai outlet lain.",
        solution: "Periksa kembali data outlet dan koneksi Anda, lalu coba lagi.",
        technicalDetails: errorMessage,
        onRetry: () => void submitEditOutlet(),
      });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      showError({
        title: "Data belum lengkap",
        message: "Nama Outlet wajib diisi.",
        solution: "Lengkapi nama outlet terlebih dahulu.",
      });
      return;
    }

    void submitEditOutlet();
  };

  const handleDeleteClick = async (outletId: number) => {
    const ok = await confirm({
      title: "Hapus Outlet",
      message: "Apakah Anda yakin ingin menghapus outlet ini?",
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;

    try {
      await withLoading(() => bulkSoftDeleteOwnerOutlets(ownerId, [outletId]), {
        label: "Menghapus outlet...",
      });
      showSuccess({
        title: "Outlet berhasil dihapus",
        message: "Outlet berhasil dihapus dari data owner ini.",
      });
      const outletsData = await fetchOwnerOutlets(ownerId);
      setOutlets(outletsData);
    } catch (err) {
      console.error("Gagal menghapus outlet:", err);
      showError({
        title: "Gagal menghapus outlet",
        message: "Sistem gagal menghapus outlet ini.",
        cause: "Bisa disebabkan oleh koneksi bermasalah.",
        solution: "Periksa koneksi Anda dan coba lagi.",
        technicalDetails: err instanceof Error ? err.message : String(err),
        onRetry: () => void handleDeleteClick(outletId),
      });
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
          <OwnerOverviewCard ownerId={ownerId} />

          {/* Level 1: Ringkasan (Quick Stats) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="app-accent-surface rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <p className="app-accent-kicker text-xs font-bold uppercase tracking-wider mb-1">Total Outlet Terdaftar</p>
                <h2 className="text-3xl font-black">{outlets.length.toLocaleString("id-ID")}</h2>
              </div>
              <svg className="app-accent-decor absolute -bottom-4 -right-4 w-28 h-28 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
              <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h3l2 2h5a2 2 0 012 2v8a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900 leading-tight">Relasi Lead</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Koneksi owner ini dengan pipeline lead</p>
              </div>
            </div>
            <div className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-900">
                  {lead ? lead.outlet?.name || lead.owner?.name || lead.code : "Lead belum ditemukan"}
                </p>
                <p className="text-xs font-medium text-gray-500">
                  {lead
                    ? `Kode lead ${lead.code} • stage ${formatLabel(lead.stage)} • status ${formatLabel(lead.status)}`
                    : "Owner ini belum memiliki relasi lead yang bisa dibuka dari halaman detail."}
                </p>
              </div>
              {lead ? (
                <Link
                  href={`/menu/lead/${lead.id}`}
                  className="inline-flex items-center justify-center rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-[#A82216]"
                >
                  Lihat Detail Lead
                </Link>
              ) : null}
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
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nama Owner</span>
                <span className="font-bold text-gray-900">{owner.name}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Brand</span>
                <span className="font-bold text-gray-900">{owner.brand_name || "-"}</span>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tanggal Dibuat</span>
                <span className="font-bold text-gray-900">{formatIndonesianDate(owner.created_at)}</span>
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
                <span className="font-bold text-gray-900">{owner.phone ? formatPhoneDisplay(owner.phone) : "-"}</span>
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
                      <th className="px-6 py-4">Tgl. Dibuat</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-xs">
                    {outlets.map((outlet) => (
                      <tr key={outlet.id} className="transition-colors hover:bg-red-50/30 group">
                        <td className="px-6 py-4 font-bold text-gray-900">{outlet.code || "-"}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{outlet.name}</td>
                        <td className="px-6 py-4 text-gray-600 font-medium">{outlet.phone ? formatPhoneDisplay(outlet.phone) : "-"}</td>
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          {[outlet.sub_district, outlet.district, outlet.city, outlet.province].filter(Boolean).join(", ") || "-"}
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">{outlet.address || "-"}</td>
                        <td className="px-6 py-4 text-gray-600 font-medium whitespace-nowrap">{formatIndonesianDate(outlet.created_at)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-tight ${
                            (outlet.status || "ACTIVE") === "ACTIVE" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${(outlet.status || "ACTIVE") === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                            {outlet.status || "ACTIVE"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <RowActionGroup>
                            <ViewActionButton href={`/menu/kelolaan-outlet/detail?id=${outlet.id}`} title="Lihat Detail Outlet" />
                            <EditActionButton onClick={() => handleEditClick(outlet)} title="Edit Outlet" />
                            <DeleteActionButton onClick={() => handleDeleteClick(outlet.id)} title="Hapus Outlet" />
                          </RowActionGroup>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Level 5: Riwayat Top Up */}
          <div className="w-full bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                  <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-9 4h16a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900 leading-tight">Riwayat Top Up</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">PERMINTAAN TOP UP DAN STATUS VERIFIKASI PEMBAYARAN</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-red-50 text-[#C92C1E] px-3 py-1 rounded-full border border-red-200">
                {topups.length} Top Up
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {topups.length === 0 ? (
                <div className="text-center py-12 bg-white">
                  <p className="text-gray-500 text-xs font-medium">Belum ada riwayat top up untuk owner ini.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/80 uppercase text-gray-500 text-[10px] font-black tracking-wider border-b-2 border-[#C92C1E]">
                    <tr>
                      <th className="px-6 py-4">Kode Top Up</th>
                      <th className="px-6 py-4">Channel</th>
                      <th className="px-6 py-4">Tanggal</th>
                      <th className="px-6 py-4 text-right">Nominal</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Transfer Efektif</th>
                      <th className="px-6 py-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-xs">
                    {topups.map((topup) => (
                      <tr key={topup.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {topup.code || `PAY-${topup.id}`}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-800">
                          {topup.payment_channel || topup.channel || "-"}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700 whitespace-nowrap">
                          {formatIndonesianDate(topup.paid_at || topup.created_at, true)}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-gray-900">
                          {formatRupiah(topup.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${paymentStatusBadgeClass(topup.status)}`}>
                            {topup.status || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700 whitespace-nowrap">
                          {formatIndonesianDate(topup.effective_transfer_date, true)}
                        </td>
                        <td className="px-6 py-4">
                          <RowActionGroup>
                            <ViewActionButton href={`/menu/wallets/payments/${topup.id}`} title="Lihat Detail Top Up" />
                          </RowActionGroup>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Level 6: Riwayat Transfer */}
          <div className="w-full bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                  <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a5 5 0 10-10 0v2M5 9h14l-1 10a2 2 0 01-2 2H8a2 2 0 01-2-2L5 9z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900 leading-tight">Riwayat Transfer</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">BUKTI TRANSFER BANK OWNER DAN STATUS MATCHING-NYA</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-red-50 text-[#C92C1E] px-3 py-1 rounded-full border border-red-200">
                {transfers.length} Transfer
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {transfers.length === 0 ? (
                <div className="text-center py-12 bg-white">
                  <p className="text-gray-500 text-xs font-medium">Belum ada riwayat transfer untuk owner ini.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/80 uppercase text-gray-500 text-[10px] font-black tracking-wider border-b-2 border-[#C92C1E]">
                    <tr>
                      <th className="px-6 py-4">Kode Transfer</th>
                      <th className="px-6 py-4">Tanggal Transfer</th>
                      <th className="px-6 py-4 text-right">Nominal</th>
                      <th className="px-6 py-4">Status Match</th>
                      <th className="px-6 py-4">Sumber</th>
                      <th className="px-6 py-4">External Ref</th>
                      <th className="px-6 py-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-xs">
                    {transfers.map((transfer) => (
                      <tr key={transfer.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">
                          TRF-{transfer.id}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700 whitespace-nowrap">
                          {formatIndonesianDate(transfer.transfer_date, true)}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-gray-900">
                          {formatRupiah(transfer.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${transferStatusBadgeClass(transfer.match_status)}`}>
                            {formatLabel(transfer.match_status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-800">
                          {formatLabel(transfer.source)}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700">
                          {transfer.external_reference || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <RowActionGroup>
                            <ViewActionButton href={`/menu/wallets/transfers/${transfer.id}`} title="Lihat Detail Transfer" />
                          </RowActionGroup>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Level 7: Riwayat Pembelian Paket */}
          <div className="w-full bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                  <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900 leading-tight">Riwayat Pembelian Paket</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">ORDER PEMBELIAN LANGGANAN PADA OWNER INI</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-red-50 text-[#C92C1E] px-3 py-1 rounded-full border border-red-200">
                {subscriptions.length} Pesanan
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {subscriptions.length === 0 ? (
                <div className="text-center py-12 bg-white">
                  <p className="text-gray-500 text-xs font-medium">Belum ada riwayat pembelian paket untuk owner ini.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/80 uppercase text-gray-500 text-[10px] font-black tracking-wider border-b-2 border-[#C92C1E]">
                    <tr>
                      <th className="px-6 py-4">Kode Order</th>
                      <th className="px-6 py-4">Tipe Order</th>
                      <th className="px-6 py-4">Nama Outlet</th>
                      <th className="px-6 py-4">Paket / Plan</th>
                      <th className="px-6 py-4">Tanggal Order</th>
                      <th className="px-6 py-4">Periode</th>
                      <th className="px-6 py-4 text-right">Total Bayar</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-xs">
                    {subscriptions.map((sub) => {
                      const numTotal = Number(sub.total_amount || sub.amount || 0);

                      return (
                        <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900">
                            {sub.code || `ORDER-${sub.id}`}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              sub.order_type === "UPGRADE" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                            }`}>
                              {sub.order_type || "NEW"}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-800">{sub.outlet_name || "-"}</td>
                          <td className="px-6 py-4 font-bold text-gray-800">
                            {[sub.package_name, sub.plan_name].filter(Boolean).join(" - ") || "-"}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-700 whitespace-nowrap">
                            {formatIndonesianDate(sub.purchased_at || sub.created_at, true)}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-700 whitespace-nowrap">
                            {formatIndonesianDate(sub.start_date)} - {formatIndonesianDate(sub.end_date)}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-gray-900">
                            {formatRupiah(numTotal)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${subscriptionStatusBadgeClass(sub.status)}`}>
                              {formatLabel(sub.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <RowActionGroup>
                              <ViewActionButton href={`/menu/subscribe/orders/${sub.id}`} title="Lihat Detail Order Langganan" />
                            </RowActionGroup>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Level 8: Riwayat Perubahan */}
          <div className="w-full bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
                  <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900 leading-tight">Riwayat Perubahan</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">LOG PERUBAHAN DATA OWNER, TERMASUK DARI SINKRONISASI ADMIN DASHBOARD LAMA</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-red-50 text-[#C92C1E] px-3 py-1 rounded-full border border-red-200">
                {historyItems.length} Perubahan
              </span>
            </div>

            <div className="flex-1">
              {historyItems.length === 0 ? (
                <div className="text-center py-12 bg-white">
                  <p className="text-gray-500 text-xs font-medium">Belum ada riwayat perubahan untuk owner ini.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {historyItems.map((item) => (
                    <div key={item.id} className="p-5 flex items-start justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            {item.action}
                          </span>
                          <span className="text-xs font-bold text-gray-700">
                            {item.actor?.name || "Sistem/Scraper"}
                          </span>
                        </div>
                        {item.before && item.after && (
                          <p className="text-xs text-gray-500 mt-2 break-words">
                            {Object.keys(item.after)
                              .filter((key) => JSON.stringify((item.before as Record<string, unknown>)[key]) !== JSON.stringify((item.after as Record<string, unknown>)[key]))
                              .map((key) => (
                                <span key={key} className="block">
                                  <span className="font-bold text-gray-700">{key}</span>: &quot;{String((item.before as Record<string, unknown>)[key] ?? "")}&quot; &rarr; &quot;{String((item.after as Record<string, unknown>)[key] ?? "")}&quot;
                                </span>
                              ))}
                          </p>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        {formatIndonesianDate(item.created_at, true)}
                      </div>
                    </div>
                  ))}
                </div>
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
          
          <div className="app-modal-panel relative z-10 w-full max-w-lg rounded-2xl shadow-2xl transition-all">
            <div className="app-modal-header flex items-center justify-between px-6 py-4">
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
                className="app-modal-close rounded-xl p-2 transition-colors"
                disabled={isSubmitting}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="app-modal-body p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Kode Outlet <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional — Otomatis jika kosong)</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.code}
                    onChange={(e) => setAddForm({...addForm, code: e.target.value})}
                    placeholder="Kosongkan untuk otomatis (OTL-XXXXX)"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#C92C1E] focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-gray-900"
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
                  disabled={isSubmitting || !addForm.name.trim()}
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
          
          <div className="app-modal-panel relative z-10 w-full max-w-lg rounded-2xl shadow-2xl transition-all">
            <div className="app-modal-header flex items-center justify-between px-6 py-4">
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
                className="app-modal-close rounded-xl p-2 transition-colors"
                disabled={isEditSubmitting}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="app-modal-body p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Kode Outlet <span className="text-gray-400 text-[10px] normal-case tracking-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.code}
                    onChange={(e) => setEditForm({...editForm, code: e.target.value})}
                    placeholder="Contoh: OUT-001"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all text-gray-900"
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
                  disabled={isEditSubmitting || !editForm.name.trim()}
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
