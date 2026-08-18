"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { restoreOutletForOwner, bulkForceDeleteOutletsForOwner, listGlobalOutlets, type OutletOverviewItem } from "@/app/lib/api";

export default function OutletTrashPage() {
  const [trashData, setTrashData] = useState<OutletOverviewItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

  const fetchTrashData = () => {
    setIsLoading(true);
    listGlobalOutlets({ limit: 1000 }, "trash")
      .then((res) => {
        setTrashData(res.items || []);
      })
      .catch((err) => {
        console.error("Gagal memuat data trash outlet:", err);
        setTrashData([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchTrashData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredTrash = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    if (!keyword) return trashData;

    return trashData.filter((item) =>
      item.code?.toLowerCase().includes(keyword) ||
      item.name?.toLowerCase().includes(keyword) ||
      item.owner?.name?.toLowerCase().includes(keyword) ||
      item.city?.toLowerCase().includes(keyword) ||
      item.phone?.toLowerCase().includes(keyword)
    );
  }, [trashData, searchTerm]);

  const filteredIds = useMemo(
    () => filteredTrash.map((item) => item.id),
    [filteredTrash],
  );

  const isAllFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (filteredIds.length === 0) return;

    if (isAllFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const runBulkByOwner = async (
    items: OutletOverviewItem[],
    action: (ownerId: number, ids: number[]) => Promise<unknown>,
  ) => {
    const groups = new Map<number, number[]>();
    for (const item of items) {
      const ownerId = item.owner?.id;
      if (!ownerId) continue;
      if (!groups.has(ownerId)) groups.set(ownerId, []);
      groups.get(ownerId)!.push(item.id);
    }
    for (const [ownerId, ids] of groups) {
      try {
        await action(ownerId, ids);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRestoreRow = async (item: OutletOverviewItem) => {
    const ownerId = item.owner?.id;
    if (!ownerId) return;
    setActingId(item.id);
    try {
      await restoreOutletForOwner(ownerId, item.id);
      fetchTrashData();
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
    } catch (err) {
      console.error(err);
      alert("Gagal memulihkan outlet.");
    } finally {
      setActingId(null);
    }
  };

  const handleForceDeleteRow = async (item: OutletOverviewItem) => {
    const ownerId = item.owner?.id;
    if (!ownerId) return;
    if (!confirm(`Yakin hapus permanen "${item.name}"? Tidak bisa dipulihkan.`)) return;
    setActingId(item.id);
    try {
      await bulkForceDeleteOutletsForOwner(ownerId, [item.id]);
      fetchTrashData();
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus outlet secara permanen.");
    } finally {
      setActingId(null);
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedIds.length === 0) {
      alert("Pilih data yang ingin dipulihkan dulu.");
      return;
    }

    const selectedSet = new Set(selectedIds);
    const restoreItems = trashData.filter((item) => selectedSet.has(item.id));

    if (restoreItems.length === 0) return;

    await runBulkByOwner(restoreItems, (ownerId, ids) => 
      Promise.all(ids.map(id => restoreOutletForOwner(ownerId, id)))
    );
    
    alert(`${restoreItems.length} data berhasil dipulihkan.`);
    fetchTrashData();
    setSelectedIds([]);
  };

  const handleDeletePermanentSelected = async () => {
    if (selectedIds.length === 0) {
      alert("Pilih data yang ingin dihapus permanen dulu.");
      return;
    }

    const yakin = confirm(
      `Yakin ingin menghapus permanen ${selectedIds.length} data? Data ini tidak bisa di-undo lagi.`
    );

    if (!yakin) return;

    const selectedSet = new Set(selectedIds);
    const deletedItems = trashData.filter((item) => selectedSet.has(item.id));

    await runBulkByOwner(deletedItems, (ownerId, ids) =>
      bulkForceDeleteOutletsForOwner(ownerId, ids)
    );

    alert(`${selectedSet.size} data berhasil dihapus permanen.`);
    fetchTrashData();
    setSelectedIds([]);
  };

  const handleEmptyTrash = async () => {
    if (trashData.length === 0) return;

    const yakin = confirm(
      `Yakin ingin mengosongkan seluruh riwayat hapus (${trashData.length} data)? Data tidak bisa dipulihkan lagi.`
    );

    if (!yakin) return;

    await runBulkByOwner(trashData, (ownerId, ids) =>
      bulkForceDeleteOutletsForOwner(ownerId, ids)
    );

    alert("Riwayat hapus berhasil dikosongkan.");
    fetchTrashData();
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6 font-sans text-[#1C1C1E] max-w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/60 shadow-xs">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <svg
              className="w-6 h-6 text-[#C92C1E]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Riwayat Hapus Data Outlet
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Data outlet yang dihapus dari tabel utama bisa dipulihkan dari halaman ini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/menu/kelolaan-outlet"
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            ← Kembali Ke Tabel
          </Link>

          <button
            onClick={handleEmptyTrash}
            disabled={trashData.length === 0}
            className="px-4 py-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-black hover:bg-red-100 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Kosongkan Trash
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="relative w-full lg:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Cari data terhapus..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 p-2 pl-9 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:bg-white focus:border-[#C92C1E] transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleToggleSelectAll}
            disabled={filteredTrash.length === 0}
            className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black hover:bg-gray-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAllFilteredSelected
              ? "Batal Pilih Semua"
              : `Pilih Semua Tampilan (${filteredTrash.length})`}
          </button>

          <button
            onClick={handleRestoreSelected}
            disabled={selectedIds.length === 0}
            className="px-3.5 py-2 bg-emerald-600 border border-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            Pulihkan Terpilih ({selectedIds.length})
          </button>

          <button
            onClick={handleDeletePermanentSelected}
            disabled={selectedIds.length === 0}
            className="px-3.5 py-2 bg-red-600 border border-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Hapus Permanen ({selectedIds.length})
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden w-full">
        <table className="w-full text-left text-xs md:text-sm font-semibold text-gray-600 border-collapse table-auto">
          <thead>
            <tr className="bg-[#C92C1E] text-white uppercase text-[10px] md:text-[11px] tracking-wider font-black">
              <th className="p-3 text-center">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={handleToggleSelectAll}
                  className="h-4 w-4 cursor-pointer accent-white"
                />
              </th>
              <th className="p-3 text-center">No</th>
              <th className="p-3 text-center">Kode Outlet</th>
              <th className="p-3">Nama Outlet</th>
              <th className="p-3">Owner</th>
              <th className="p-3">Kontak</th>
              <th className="p-3">Lokasi</th>
              <th className="p-3 text-center">Tgl Dihapus</th>
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500 font-bold">
                  Memuat data...
                </td>
              </tr>
            ) : filteredTrash.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-400 font-bold italic">
                  Tidak ada data terhapus.
                </td>
              </tr>
            ) : (
              filteredTrash.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => handleToggleSelectRow(row.id)}
                  className={`border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${
                    selectedIds.includes(row.id)
                      ? "bg-red-100/70 hover:bg-red-100"
                      : "hover:bg-gray-50/80"
                  }`}
                >
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => handleToggleSelectRow(row.id)}
                      className="h-4 w-4 cursor-pointer accent-[#C92C1E]"
                    />
                  </td>
                  <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                  <td className="p-3 text-center font-mono font-bold text-gray-700">{row.code || "-"}</td>
                  <td className="p-3 font-black text-gray-900 whitespace-normal break-words">{row.name || "-"}</td>
                  <td className="p-3 font-bold text-gray-700 whitespace-normal break-words">{row.owner?.name || "-"}</td>
                  <td className="p-3 font-mono text-gray-700 break-all">{row.phone || "-"}</td>
                  <td className="p-3 text-gray-500 whitespace-normal break-words">{row.city || row.province || "-"}</td>
                  <td className="p-3 text-center font-mono text-gray-600">
                    {row.updated_at ? new Date(row.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                  </td>
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        disabled={actingId === row.id}
                        onClick={() => void handleRestoreRow(row)}
                        className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Pulihkan Outlet"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        disabled={actingId === row.id}
                        onClick={() => void handleForceDeleteRow(row)}
                        className="rounded-lg bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Hapus Permanen"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
