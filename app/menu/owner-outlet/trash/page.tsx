"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchOwners,
  restoreOwner,
  bulkForceDeleteOwners,
  type BackendOwner,
} from "@/app/lib/api";
import { formatPhoneDisplay } from "@/app/lib/phone";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import ColumnVisibilityControl from "@/app/components/table/ColumnVisibilityControl";
import { useFeedback } from "@/app/components/feedback/FeedbackContext";
import {
  RowActionGroup,
  RestoreActionButton,
  DeleteActionButton,
} from "@/app/components/table/RowActionButton";
import {
  AutocompleteFilter,
  WalletBalanceCell,
  getOwnerStatus,
  getOwnerStatusBadgeStyle,
  SortableHeader,
} from "../OwnerTableColumns";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export default function OwnerTrashPage() {
  usePageTitle("Owner Terhapus");
  const router = useRouter();
  const { showSuccess, showError, confirm, withLoading } = useFeedback();

  const [owners, setOwners] = useState<BackendOwner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("-updated_at");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filters, setFilters] = useState({
    name: "",
    brand_name: "",
    phone: "",
    city: "",
  });
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<number[]>([]);

  const loadOwners = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchOwners({
        scope: "trash",
        page: pagination.page,
        limit: pagination.limit,
        q: search,
        name: filters.name,
        brand_name: filters.brand_name,
        phone: filters.phone,
        city: filters.city,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        created_from: startDate || undefined,
        created_to: endDate || undefined,
        sort,
      });
      setOwners(res.data.items);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Gagal memuat data owner terhapus:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filters, startDate, endDate, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOwners();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOwners]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadOwners();
  };

  const handleRestoreOwner = async (ownerId: number) => {
    const ok = await confirm({
      title: "Pulihkan Owner",
      message: "Apakah Anda yakin ingin memulihkan owner ini dari sampah?",
      confirmLabel: "Pulihkan",
    });
    if (!ok) return;

    try {
      await withLoading(() => restoreOwner(ownerId), { label: "Memulihkan owner..." });
      showSuccess({
        title: "Owner berhasil dipulihkan",
        message: "Data owner berhasil dikembalikan ke daftar utama.",
      });
      setSelectedOwnerIds((prev) => prev.filter((id) => id !== ownerId));
      loadOwners();
    } catch (err: unknown) {
      showError({
        title: "Gagal memulihkan owner",
        message: "Sistem gagal memulihkan owner ini.",
        cause: "Bisa disebabkan oleh koneksi bermasalah.",
        solution: "Periksa koneksi Anda dan coba lagi.",
        technicalDetails: getErrorMessage(err, "Gagal memulihkan owner"),
        onRetry: () => void handleRestoreOwner(ownerId),
      });
    }
  };

  const handlePermanentDeleteOwner = async (ownerId: number) => {
    const ok = await confirm({
      title: "Hapus Permanen",
      message: "Yakin ingin menghapus permanen owner ini? Data ini tidak bisa dipulihkan lagi setelah dihapus.",
      confirmLabel: "Hapus Permanen",
      danger: true,
    });
    if (!ok) return;

    try {
      await withLoading(() => bulkForceDeleteOwners([ownerId]), {
        label: "Menghapus owner permanen...",
      });
      showSuccess({
        title: "Owner berhasil dihapus permanen",
        message: "Data owner telah dihapus secara permanen.",
      });
      setSelectedOwnerIds((prev) => prev.filter((id) => id !== ownerId));
      loadOwners();
    } catch (err: unknown) {
      showError({
        title: "Gagal menghapus permanen owner",
        message: "Sistem gagal menghapus permanen owner ini.",
        cause: "Bisa disebabkan oleh koneksi bermasalah.",
        solution: "Periksa koneksi Anda dan coba lagi.",
        technicalDetails: getErrorMessage(err, "Gagal menghapus permanen owner"),
        onRetry: () => void handlePermanentDeleteOwner(ownerId),
      });
    }
  };

  const handleBulkRestore = async () => {
    if (selectedOwnerIds.length === 0) return;

    const ok = await confirm({
      title: "Pulihkan Owner Terpilih",
      message: `Apakah Anda yakin ingin memulihkan ${selectedOwnerIds.length} owner terpilih?`,
      confirmLabel: "Pulihkan",
    });
    if (!ok) return;

    try {
      await withLoading(
        () => Promise.all(selectedOwnerIds.map((id) => restoreOwner(id))),
        { label: "Memulihkan owner terpilih..." },
      );
      showSuccess({
        title: "Owner berhasil dipulihkan",
        message: `${selectedOwnerIds.length} owner berhasil dipulihkan.`,
      });
      setSelectedOwnerIds([]);
      setPagination((prev) => ({ ...prev, page: 1 }));
      loadOwners();
    } catch (err: unknown) {
      showError({
        title: "Gagal memulihkan owner terpilih",
        message: "Sistem gagal memulihkan owner yang dipilih.",
        cause: "Bisa disebabkan oleh koneksi bermasalah.",
        solution: "Periksa koneksi Anda dan coba lagi.",
        technicalDetails: getErrorMessage(err, "Gagal memulihkan owner terpilih."),
        onRetry: () => void handleBulkRestore(),
      });
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedOwnerIds.length === 0) return;

    const ok = await confirm({
      title: "Hapus Permanen Owner Terpilih",
      message: `Yakin ingin menghapus permanen ${selectedOwnerIds.length} owner terpilih? Data ini tidak bisa dipulihkan lagi setelah dihapus.`,
      confirmLabel: "Hapus Permanen",
      danger: true,
    });
    if (!ok) return;

    try {
      await withLoading(() => bulkForceDeleteOwners(selectedOwnerIds), {
        label: "Menghapus owner terpilih secara permanen...",
      });
      showSuccess({
        title: "Owner berhasil dihapus permanen",
        message: `${selectedOwnerIds.length} owner berhasil dihapus permanen.`,
      });
      setSelectedOwnerIds([]);
      setPagination((prev) => ({ ...prev, page: 1 }));
      loadOwners();
    } catch (err: unknown) {
      showError({
        title: "Gagal menghapus permanen owner terpilih",
        message: "Sistem gagal menghapus permanen owner yang dipilih.",
        cause: "Bisa disebabkan oleh koneksi bermasalah.",
        solution: "Periksa koneksi Anda dan coba lagi.",
        technicalDetails: getErrorMessage(err, "Gagal menghapus permanen owner terpilih."),
        onRetry: () => void handleBulkPermanentDelete(),
      });
    }
  };

  const handleEmptyTrash = async () => {
    if (pagination.total === 0) return;

    const ok = await confirm({
      title: "Kosongkan Sampah Owner",
      message: `Yakin ingin mengosongkan seluruh sampah owner (${pagination.total} data)? Data tidak bisa dipulihkan lagi setelah ini.`,
      confirmLabel: "Kosongkan",
      danger: true,
    });
    if (!ok) return;

    try {
      await withLoading(async () => {
        const all = await fetchOwners({ scope: "trash", page: 1, limit: 9999 });
        const allIds = all.data.items.map((o) => o.id);
        if (allIds.length > 0) {
          await bulkForceDeleteOwners(allIds);
        }
      }, { label: "Mengosongkan sampah owner..." });

      showSuccess({
        title: "Sampah owner dikosongkan",
        message: "Seluruh data owner terhapus berhasil dihapus permanen.",
      });
      setSelectedOwnerIds([]);
      setPagination((prev) => ({ ...prev, page: 1 }));
      loadOwners();
    } catch (err: unknown) {
      showError({
        title: "Gagal mengosongkan sampah owner",
        message: "Sistem gagal mengosongkan sampah owner.",
        cause: "Bisa disebabkan oleh koneksi bermasalah.",
        solution: "Periksa koneksi Anda dan coba lagi.",
        technicalDetails: getErrorMessage(err, "Gagal mengosongkan sampah owner"),
        onRetry: () => void handleEmptyTrash(),
      });
    }
  };

  const uniqueNames = Array.from(new Set(owners.map((o) => o.name).filter(Boolean))) as string[];
  const uniqueBrands = Array.from(new Set(owners.map((o) => o.brand_name).filter(Boolean))) as string[];
  const uniquePhones = Array.from(new Set(owners.map((o) => o.phone).filter(Boolean))) as string[];
  const uniqueCities = Array.from(new Set(owners.map((o) => o.city).filter(Boolean))) as string[];

  const filterInputs = (
    <div className="grid grid-cols-2 gap-4 w-full md:grid-cols-3 lg:grid-cols-6">
      <AutocompleteFilter
        label="Nama Owner"
        placeholder="Filter Nama..."
        value={filters.name || ""}
        onChange={(val) => {
          setFilters((prev) => ({ ...prev, name: val }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        options={uniqueNames}
      />
      <AutocompleteFilter
        label="Brand"
        placeholder="Filter Brand..."
        value={filters.brand_name || ""}
        onChange={(val) => {
          setFilters((prev) => ({ ...prev, brand_name: val }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        options={uniqueBrands}
      />
      <AutocompleteFilter
        label="Kontak"
        placeholder="Filter Kontak..."
        value={filters.phone || ""}
        onChange={(val) => {
          setFilters((prev) => ({ ...prev, phone: val }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        options={uniquePhones}
      />
      <AutocompleteFilter
        label="Wilayah / Lokasi"
        placeholder="Semua Wilayah"
        value={filters.city || ""}
        onChange={(val) => {
          setFilters((prev) => ({ ...prev, city: val }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        options={uniqueCities}
      />
      <label className="flex flex-col gap-1.5 w-full">
        <span className="text-xs font-semibold text-black">Dari Tanggal</span>
        <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]" />
      </label>
      <label className="flex flex-col gap-1.5 w-full">
        <span className="text-xs font-semibold text-black">Sampai Tanggal</span>
        <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPagination((prev) => ({ ...prev, page: 1 })); }} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]" />
      </label>
    </div>
  );

  const searchBox = (
    <div className="flex w-full items-center gap-3">
      <form onSubmit={handleSearch} className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input type="text" placeholder="Cari kode owner, nama owner, email, telepon, outlet, wilayah, brand, dll..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination((prev) => ({ ...prev, page: 1 })); }} className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]" />
      </form>
      <ColumnVisibilityControl tableId="owner-table-trash" storageKey="column-visibility:owner-table-trash" buttonLabel="Kolom" />
    </div>
  );

  const actionButtons = (
    <>
      {selectedOwnerIds.length > 0 && (
        <>
          <button onClick={handleBulkRestore} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition-all hover:bg-emerald-50">
            Pulihkan Terpilih ({selectedOwnerIds.length})
          </button>
          <button onClick={handleBulkPermanentDelete} className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-50">
            <TrashIcon className="h-4 w-4" /> Hapus Permanen ({selectedOwnerIds.length})
          </button>
        </>
      )}
      <button onClick={() => router.push("/menu/owner-outlet")} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50">
        ← Kembali Ke Daftar Owner
      </button>
      <button
        onClick={handleEmptyTrash}
        disabled={pagination.total === 0}
        className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <TrashIcon className="h-4 w-4" /> Kosongkan Sampah
      </button>
    </>
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
              <span>Menu</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
              <span>Owner</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#C92C1E]">Owner Terhapus</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <TrashIcon className="h-5 w-5 text-[#C92C1E]" />
              Owner Terhapus
            </h1>
            <p className="mt-1 text-sm text-gray-500 max-w-3xl">
              Data owner yang telah dihapus dan dapat dipulihkan kembali. Pilih data lalu gunakan tombol Pulihkan untuk mengembalikannya, atau Hapus Permanen untuk menghapusnya selamanya.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex flex-col rounded-2xl border border-gray-200/60 bg-white shadow-xs">
        <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Daftar Owner Terhapus</h2>
            <p className="mt-1 text-sm text-gray-500">Data owner yang berada di sampah dan menunggu untuk dipulihkan atau dihapus permanen.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full">
            {actionButtons}
          </div>
        </div>

        <div className="border-b border-gray-50 px-6 py-4">
          <div className="flex flex-wrap items-start gap-4">
            {filterInputs}
          </div>
        </div>

        <div className="border-b border-gray-50 px-6 py-4">
          {searchBox}
        </div>

        <div className="relative w-full">
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <table id="owner-table-trash" data-column-visibility-manual="true" className="w-full min-w-[1080px] text-left text-sm text-gray-600">
                <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="w-12 px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={owners.length > 0 && selectedOwnerIds.length === owners.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOwnerIds(owners.map((owner) => owner.id));
                          } else {
                            setSelectedOwnerIds([]);
                          }
                        }}
                        className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                      />
                    </th>
                    <th className="w-12 px-4 py-4 text-center font-bold">No.</th>
                    <SortableHeader sortKey="code" label="Kode Owner" sort={sort} setSort={setSort} />
                    <SortableHeader sortKey="name" label="Nama Owner" sort={sort} setSort={setSort} />
                    <SortableHeader sortKey="brand_name" label="Brand" sort={sort} setSort={setSort} />
                    <SortableHeader sortKey="phone" label="Kontak" sort={sort} setSort={setSort} />
                    <SortableHeader sortKey="city" label="Lokasi" sort={sort} setSort={setSort} />
                    <th className="px-4 py-4 font-bold text-left">Saldo Aplikasi</th>
                    <SortableHeader sortKey="created_at" label="Tgl. Dibuat" sort={sort} setSort={setSort} />
                    <SortableHeader sortKey="status" label="Status" sort={sort} setSort={setSort} />
                    <SortableHeader sortKey="outlet_count" label="Outlet" sort={sort} setSort={setSort} />
                    <th className="px-4 py-4 text-center font-bold">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-10 text-center text-gray-500">
                        Memuat data...
                      </td>
                    </tr>
                  ) : owners.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-10 text-center text-gray-500">
                        Tidak ada data owner terhapus.
                      </td>
                    </tr>
                  ) : (
                    owners.map((owner, idx) => {
                      const isSelected = selectedOwnerIds.includes(owner.id);

                      return (
                        <tr
                          key={owner.id}
                          className={`transition-colors ${
                            isSelected ? "bg-red-50/40 hover:bg-red-50/60" : "hover:bg-gray-50"
                          }`}
                        >
                          <td
                            className="px-4 py-4 text-center cursor-pointer"
                            onClick={() => {
                              setSelectedOwnerIds((prev) =>
                                prev.includes(owner.id)
                                  ? prev.filter((id) => id !== owner.id)
                                  : [...prev, owner.id]
                              );
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E] cursor-pointer"
                            />
                          </td>

                          <td className="px-4 py-4 text-center font-bold text-gray-900">
                            {(pagination.page - 1) * pagination.limit + idx + 1}
                          </td>
                          <td className="px-4 py-4 align-top font-bold text-gray-900 whitespace-nowrap">
                            {owner.code || "-"}
                          </td>
                          <td className="px-4 py-4 align-top font-bold text-gray-900">
                            {owner.name}
                          </td>
                          <td className="px-4 py-4 align-top">
                            {owner.brand_name || "-"}
                          </td>
                          <td className="px-4 py-4 align-top">{owner.phone ? formatPhoneDisplay(owner.phone) : "-"}</td>
                          <td className="px-4 py-4 align-top">
                            {[owner.sub_district, owner.district, owner.city, owner.province].filter(Boolean).join(", ") || "-"}
                          </td>
                          <td className="px-4 py-4 align-top text-left whitespace-nowrap font-semibold">
                            <WalletBalanceCell ownerId={owner.id} />
                          </td>
                          <td className="px-4 py-4 align-top whitespace-nowrap">
                            {owner.created_at ? new Date(owner.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                          </td>
                          <td className="px-4 py-4 text-center align-top">
                            {(() => {
                              const st = getOwnerStatus(owner);
                              return (
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${getOwnerStatusBadgeStyle(st)}`}
                                >
                                  {st}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-4 text-center align-top">
                            <span className="inline-flex items-center justify-center rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                              {owner.outlet_count || 0}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <RowActionGroup>
                              <RestoreActionButton
                                onClick={() => handleRestoreOwner(owner.id)}
                                title="Pulihkan Owner"
                              />
                              <DeleteActionButton
                                onClick={() => handlePermanentDeleteOwner(owner.id)}
                                title="Hapus Permanen"
                                permanent
                              />
                            </RowActionGroup>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 p-4 sm:flex-row">
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-500">
                  Menampilkan {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} data
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) =>
                      setPagination((prev) => ({
                        ...prev,
                        limit: Number(e.target.value),
                        page: 1,
                      }))
                    }
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-[#C92C1E] focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-xs font-medium text-gray-500">baris</span>
                </div>
              </div>

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
        </div>
      </div>
    </div>
  );
}
