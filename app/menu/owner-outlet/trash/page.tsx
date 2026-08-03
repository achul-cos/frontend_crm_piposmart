"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { restoreOwner, hardDeleteOwner, fetchOwners, bulkForceDeleteOwners } from "@/app/lib/api";

interface NasabahItem {
  ownerId?: number;
  totalFu: number;
  tanggalFu: string;
  tahun: string;
  bulan: string;
  no: number;
  pic: string;
  tanggalDibagikan: string;
  statusAkun: string;
  kodeBaris: string;
  kodeOwner: string;
  namaOwner: string;
  projectBrand: string;
  outlet: string;
  noHpOwner: string;
  noHpOutlet: string;
  createDateProject: string;
  expiredDate: string;
  totalTransaksi: number;
  scor: number;
  callStatus: string;
  chatStatus: string;
  validitas: string;
  remarks: string;
  sumberNasabah: string;
  finalisasiClosing: string;
  skemaId?: string;
  nominal: number;
  noted: string;
}

export default function DataKelolaanTrashPage() {
  const [trashData, setTrashData] = useState<NasabahItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchTrashData = () => {
    fetchOwners({ scope: "trash", limit: 1000 })
      .then((res) => {
        const mapped = res.data.items.map((owner) => ({
          no: owner.id,
          ownerId: owner.id,
          pic: "-",
          kodeOwner: owner.code,
          namaOwner: owner.name,
          projectBrand: owner.brand_name || "-",
          outlet: owner.outlet_count ? `${owner.outlet_count} Outlet` : "-",
          noHpOwner: owner.phone,
          totalFu: 0,
          tanggalFu: owner.updated_at || "",
          tahun: owner.updated_at ? owner.updated_at.substring(0, 4) : "-",
          bulan: owner.updated_at ? owner.updated_at.substring(5, 7) : "-",
          tanggalDibagikan: "",
          statusAkun: owner.status,
          kodeBaris: "",
          noHpOutlet: "",
          createDateProject: owner.created_at || "",
          expiredDate: "",
          totalTransaksi: 0,
          scor: 0,
          callStatus: "",
          chatStatus: "",
          validitas: "",
          remarks: "",
          sumberNasabah: "",
          finalisasiClosing: "",
          nominal: 0,
          noted: "",
        }));
        setTrashData(mapped);
      })
      .catch((err) => {
        console.error("Gagal memuat data trash:", err);
        setTrashData([]);
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
      item.kodeOwner?.toLowerCase().includes(keyword) ||
      item.namaOwner?.toLowerCase().includes(keyword) ||
      item.projectBrand?.toLowerCase().includes(keyword) ||
      item.outlet?.toLowerCase().includes(keyword) ||
      item.pic?.toLowerCase().includes(keyword) ||
      item.noHpOwner?.toLowerCase().includes(keyword)
    );
  }, [trashData, searchTerm]);

  const filteredIds = useMemo(
    () => filteredTrash.map((item) => item.no),
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

  const handleRestoreSelected = () => {
    if (selectedIds.length === 0) {
      alert("Pilih data yang ingin dipulihkan dulu.");
      return;
    }

    const selectedSet = new Set(selectedIds);
    const restoreItems = trashData.filter((item) => selectedSet.has(item.no));

    if (restoreItems.length === 0) {
      alert("Data yang dipilih tidak ditemukan di riwayat hapus.");
      return;
    }

    // Call API to restore
    const restoreOwnerIds = restoreItems.map(item => item.ownerId).filter((id): id is number => id !== undefined);
    if (restoreOwnerIds.length > 0) {
      Promise.all(restoreOwnerIds.map(id => restoreOwner(id)))
        .then(() => {
          alert(`${restoreItems.length} data berhasil dipulihkan.`);
          fetchTrashData();
          setSelectedIds([]);
        })
        .catch((err) => {
          console.error(err);
          alert("Gagal memulihkan data.");
        });
    }
  };

  const handleDeletePermanentSelected = () => {
    if (selectedIds.length === 0) {
      alert("Pilih data yang ingin dihapus permanen dulu.");
      return;
    }

    const yakin = confirm(
      `Yakin ingin menghapus permanen ${selectedIds.length} data? Data ini tidak bisa di-undo lagi.`
    );

    if (!yakin) return;

    const selectedSet = new Set(selectedIds);
    const deletedItems = trashData.filter((item) => selectedSet.has(item.no));

    // Call API to hard delete
    const hardDeleteOwnerIds = deletedItems.map(item => item.ownerId).filter((id): id is number => id !== undefined);
    if (hardDeleteOwnerIds.length > 0) {
      bulkForceDeleteOwners(hardDeleteOwnerIds)
        .then(() => {
          alert(`${selectedSet.size} data berhasil dihapus permanen.`);
          fetchTrashData();
          setSelectedIds([]);
        })
        .catch((err) => {
          console.error(err);
          alert("Gagal menghapus permanen data.");
        });
    }
  };

  const handleEmptyTrash = () => {
    if (trashData.length === 0) return;

    const yakin = confirm(
      `Yakin ingin mengosongkan seluruh riwayat hapus (${trashData.length} data)? Data tidak bisa dipulihkan lagi.`
    );

    if (!yakin) return;

    const deletedItems = [...trashData];

    // Call API to hard delete all
    const hardDeleteOwnerIds = deletedItems.map(item => item.ownerId).filter((id): id is number => id !== undefined);
    if (hardDeleteOwnerIds.length > 0) {
      bulkForceDeleteOwners(hardDeleteOwnerIds)
        .then(() => {
          alert("Riwayat hapus berhasil dikosongkan.");
          fetchTrashData();
          setSelectedIds([]);
        })
        .catch((err) => {
          console.error(err);
          alert("Gagal mengosongkan riwayat hapus.");
        });
    }
  };

  const formatTgl = (str: string) => {
    if (!str || str.trim() === "") return "-";
    if (str.includes("-")) {
      const parts = str.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
    }
    return str;
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
            Riwayat Hapus Data Kelolaan
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Data yang dihapus dari tabel utama bisa dipulihkan dari halaman ini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/menu/owner-outlet"
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
              <th className="p-3 text-center">PIC</th>
              <th className="p-3">Nama Owner</th>
              <th className="p-3 text-center">Kode Owner</th>
              <th className="p-3">Project / Brand</th>
              <th className="p-3">Outlet</th>
              <th className="p-3">No. HP Owner</th>
              <th className="p-3 text-center">Tanggal FU</th>
              <th className="p-3 text-center">Bulan</th>
              <th className="p-3 text-center">Tahun</th>
            </tr>
          </thead>

          <tbody>
            {filteredTrash.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-gray-400 font-bold italic">
                  Tidak ada data terhapus.
                </td>
              </tr>
            ) : (
              filteredTrash.map((row, idx) => (
                <tr
                  key={`${row.no}-${idx}`}
                  onClick={() => handleToggleSelectRow(row.no)}
                  className={`border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${
                    selectedIds.includes(row.no)
                      ? "bg-red-100/70 hover:bg-red-100"
                      : "hover:bg-gray-50/80"
                  }`}
                >
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.no)}
                      onChange={() => handleToggleSelectRow(row.no)}
                      className="h-4 w-4 cursor-pointer accent-[#C92C1E]"
                    />
                  </td>
                  <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-[10px] rounded-full border uppercase tracking-tight whitespace-nowrap ${
                      !row.pic || row.pic === "-" || row.pic.toLowerCase() === "no pic"
                        ? "bg-slate-100 border-slate-200 text-slate-500 font-medium"
                        : "bg-blue-50 border-blue-200 text-blue-700 font-black"
                    }`}>
                      {row.pic || "Belum Ada PIC"}
                    </span>
                  </td>
                  <td className="p-3 font-black text-gray-900 whitespace-normal break-words">{row.namaOwner || "-"}</td>
                  <td className="p-3 text-center font-mono font-bold text-gray-700">{row.kodeOwner || "-"}</td>
                  <td className="p-3 font-bold text-gray-700 whitespace-normal break-words">{row.projectBrand || "-"}</td>
                  <td className="p-3 text-gray-500 whitespace-normal break-words">{row.outlet || "-"}</td>
                  <td className="p-3 font-mono text-gray-700 break-all">{row.noHpOwner || "-"}</td>
                  <td className="p-3 text-center font-mono text-gray-600">{formatTgl(row.tanggalFu)}</td>
                  <td className="p-3 text-center text-gray-500">{row.bulan || "-"}</td>
                  <td className="p-3 text-center text-gray-500">{row.tahun || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
