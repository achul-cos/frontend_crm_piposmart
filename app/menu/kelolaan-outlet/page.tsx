"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  listGlobalOutlets,
  listOutletSubscriptionStatuses,
  restoreOutletForOwner,
  forceDeleteOutletForOwner,
  bulkUpdateOutletsForOwner,
  bulkTrashOutletsForOwner,
  bulkForceDeleteOutletsForOwner,
  type OutletOverviewItem,
  type OutletSubscriptionStatusItem,
  type BackendOutlet,
} from "@/app/lib/api";
import { useBulkSelect } from "@/app/lib/hooks/useBulkSelect";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import OutletFormModal from "./OutletFormModal";
import OutletAnalytics from "./OutletAnalytics";
import BulkEditOutletModal, { type BulkEditFields } from "./BulkEditOutletModal";

type TableState = "umum" | "langganan" | "sampah" | "analytics";

const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "NOT_SUBSCRIBE", label: "Tidak Berlangganan" },
  { value: "NEW", label: "Baru" },
  { value: "BERLANGGANAN", label: "Berlangganan" },
  { value: "JATUH_TEMPO", label: "Jatuh Tempo" },
  { value: "EXPIRED", label: "Kedaluwarsa" },
];

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatRupiah(value?: string): string {
  const num = Number(value || 0);
  return `Rp ${num.toLocaleString("id-ID")}`;
}

// Bulk mutation backend hanya expose endpoint owner-scoped
// (`/owners/:owner_id/outlets/bulk*`) — baris terpilih di tabel global bisa
// lintas-owner, jadi dikelompokkan per owner_id lebih dulu di sini, lalu
// dieksekusi satu request per grup. Hasil diagregasi (sukses/gagal) supaya
// kegagalan sebagian owner tidak menyembunyikan sukses sebagian yang lain.
async function runBulkByOwner(
  items: OutletOverviewItem[],
  action: (ownerId: number, ids: number[]) => Promise<unknown>,
): Promise<{ successCount: number; failCount: number }> {
  const groups = new Map<number, number[]>();
  for (const item of items) {
    const ownerId = item.owner.id;
    if (!ownerId) continue;
    if (!groups.has(ownerId)) groups.set(ownerId, []);
    groups.get(ownerId)!.push(item.id);
  }
  let successCount = 0;
  for (const [ownerId, ids] of groups) {
    try {
      await action(ownerId, ids);
      successCount += ids.length;
    } catch {
      // Kegagalan satu grup owner tidak menghentikan grup lain.
    }
  }
  return { successCount, failCount: items.length - successCount };
}

export default function KelolaanOutletPage() {
  usePageTitle("Outlet");
  const [isAdmin, setIsAdmin] = useState(false);
  const [tableState, setTableState] = useState<TableState>("umum");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [month, setMonth] = useState(currentMonthValue());
  const [page, setPage] = useState(1);
  const limit = 10;

  const [overviewItems, setOverviewItems] = useState<OutletOverviewItem[]>([]);
  const [subscriptionItems, setSubscriptionItems] = useState<OutletSubscriptionStatusItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState<{ mode: "create" | "edit"; outlet?: BackendOutlet } | null>(
    null,
  );
  const [restoreTarget, setRestoreTarget] = useState<{ id: number; ownerId: number; name: string } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; ownerId: number; name: string } | null>(
    null,
  );
  const [isActing, setIsActing] = useState(false);

  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkTrashConfirm, setBulkTrashConfirm] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [bulkResultMessage, setBulkResultMessage] = useState<string | null>(null);

  const bulkSelect = useBulkSelect(overviewItems);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = localStorage.getItem("piposmart_user_role") || "";
    setIsAdmin(role === "" || role === "ADMIN");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Selection tidak dipertahankan lintas halaman/tab/filter — baris yang
  // ter-render berubah, jadi ID terpilih lama bisa jadi tidak relevan lagi.
  useEffect(() => {
    bulkSelect.clear();
    setBulkResultMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableState, page, search, subscriptionStatus, month]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const visibleCount =
    tableState === "langganan"
      ? subscriptionItems.length
      : tableState === "analytics"
        ? 0
        : overviewItems.length;
  const activeTabLabel =
    tableState === "umum"
      ? "Informasi Umum"
      : tableState === "langganan"
        ? "Langganan Outlet"
        : tableState === "sampah"
          ? "Sampah Outlet"
          : "Analitik Outlet";
  const activeTabDescription =
    tableState === "umum"
      ? "Data outlet aktif lintas owner."
      : tableState === "langganan"
        ? "Rekap status langganan per outlet."
        : tableState === "sampah"
          ? "Riwayat outlet yang sudah dihapus sementara."
          : "Dashboard diagram analitik khusus modul outlet.";

  const loadData = useMemo(
    () => async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (tableState === "analytics") {
          setOverviewItems([]);
          setSubscriptionItems([]);
          setTotal(0);
        } else if (tableState === "langganan") {
          const res = await listOutletSubscriptionStatuses({
            q: search || undefined,
            subscription_status: subscriptionStatus || undefined,
            month,
            page,
            limit,
          });
          setSubscriptionItems(res.items);
          setTotal(res.pagination.total);
        } else {
          const scope = tableState === "sampah" ? "trash" : "active";
          const res = await listGlobalOutlets(
            { q: search || undefined, page, limit },
            scope,
          );
          setOverviewItems(res.items);
          setTotal(res.pagination.total);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data outlet.");
      } finally {
        setIsLoading(false);
      }
    },
    [tableState, search, subscriptionStatus, month, page],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const changeTableState = (next: TableState) => {
    setTableState(next);
    setPage(1);
  };

  const refetch = () => void loadData();

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setIsActing(true);
    try {
      await restoreOutletForOwner(restoreTarget.ownerId, restoreTarget.id);
      setRestoreTarget(null);
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memulihkan outlet.");
    } finally {
      setIsActing(false);
    }
  };

  const handleForceDelete = async () => {
    if (!deleteTarget) return;
    setIsActing(true);
    try {
      await forceDeleteOutletForOwner(deleteTarget.ownerId, deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus outlet secara permanen.");
    } finally {
      setIsActing(false);
    }
  };

  const selectedItems = overviewItems.filter((item) => bulkSelect.isSelected(item.id));

  const handleBulkEditSubmit = async (fields: BulkEditFields) => {
    setIsBulkActing(true);
    const result = await runBulkByOwner(selectedItems, (ownerId, ids) =>
      bulkUpdateOutletsForOwner(
        ownerId,
        ids.map((id) => ({ id, ...fields })),
      ),
    );
    setIsBulkActing(false);
    setShowBulkEdit(false);
    bulkSelect.clear();
    setBulkResultMessage(
      result.failCount > 0
        ? `${result.successCount} outlet berhasil diubah, ${result.failCount} gagal.`
        : `${result.successCount} outlet berhasil diubah.`,
    );
    refetch();
  };

  const handleBulkTrash = async () => {
    setIsBulkActing(true);
    const result = await runBulkByOwner(selectedItems, (ownerId, ids) =>
      bulkTrashOutletsForOwner(ownerId, ids),
    );
    setIsBulkActing(false);
    setBulkTrashConfirm(false);
    bulkSelect.clear();
    setBulkResultMessage(
      result.failCount > 0
        ? `${result.successCount} outlet dipindahkan ke sampah, ${result.failCount} gagal.`
        : `${result.successCount} outlet dipindahkan ke sampah.`,
    );
    refetch();
  };

  const handleBulkForceDelete = async () => {
    setIsBulkActing(true);
    const result = await runBulkByOwner(selectedItems, (ownerId, ids) =>
      bulkForceDeleteOutletsForOwner(ownerId, ids),
    );
    setIsBulkActing(false);
    setBulkDeleteConfirm(false);
    bulkSelect.clear();
    setBulkResultMessage(
      result.failCount > 0
        ? `${result.successCount} outlet dihapus permanen, ${result.failCount} gagal.`
        : `${result.successCount} outlet dihapus permanen.`,
    );
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-[#C92C1E]">Outlet</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Manajemen Outlet</h1>
            <p className="mt-1 text-sm text-gray-500">
              Data seluruh outlet lintas owner untuk informasi umum, status langganan, dan sampah outlet.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
          <div className="relative z-10">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">Total Outlet</p>
            <h2 className="text-3xl font-black">{total}</h2>
          </div>
          <svg className="absolute -bottom-4 -right-4 h-28 w-28 text-white opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V5a3 3 0 016 0v2M8 11h8m-8 4h8" />
          </svg>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-colors hover:border-[#C92C1E]">
          <div className="relative z-10">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">Data Ditampilkan</p>
            <h2 className="text-3xl font-black text-gray-900">{visibleCount}</h2>
            <p className="mt-1 text-xs text-gray-500">Jumlah baris pada halaman aktif saat ini.</p>
          </div>
          <div className="absolute right-0 top-0 p-5">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-colors hover:border-[#C92C1E]">
          <div className="relative z-10">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">Tab Aktif</p>
            <h2 className="text-xl font-black text-gray-900">{activeTabLabel}</h2>
            <p className="mt-1 text-xs text-gray-500">{activeTabDescription}</p>
          </div>
          <div className="absolute right-0 top-0 p-5">
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#C92C1E]"></span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
          <div className="flex text-sm font-bold">
            {(
              [
                { key: "umum" as const, label: "Informasi Umum" },
                { key: "langganan" as const, label: "Langganan" },
                { key: "sampah" as const, label: "Sampah" },
                { key: "analytics" as const, label: "Analitik" },
              ]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => changeTableState(tab.key)}
                className={`rounded-lg px-5 py-2.5 transition-all ${
                  tableState === tab.key
                    ? "bg-white text-[#C92C1E] shadow-sm"
                    : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {tableState === "analytics" ? (
          <OutletAnalytics />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-4">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Cari kode outlet, nama outlet, atau owner..."
                  className="min-w-[220px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                />

                {tableState === "langganan" && (
                  <>
                    <select
                      value={subscriptionStatus}
                      onChange={(event) => {
                        setSubscriptionStatus(event.target.value);
                        setPage(1);
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                    >
                      {SUBSCRIPTION_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="month"
                      value={month}
                      onChange={(event) => {
                        setMonth(event.target.value);
                        setPage(1);
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                    />
                  </>
                )}
              </div>

              {isAdmin && tableState !== "sampah" && (
                <button
                  type="button"
                  onClick={() => setShowForm({ mode: "create" })}
                  className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Outlet
                </button>
              )}
            </div>

            {bulkResultMessage && (
              <div className="border-b border-green-100 bg-green-50 px-4 py-3">
                <p className="text-xs font-bold text-green-800">{bulkResultMessage}</p>
              </div>
            )}

            {isAdmin && bulkSelect.selectedCount > 0 && tableState !== "langganan" && (
              <div className="flex flex-wrap items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-3">
                <span className="text-sm font-bold text-[#C92C1E]">
                  {bulkSelect.selectedCount} outlet dipilih
                </span>
                <div className="ml-auto flex flex-wrap gap-2">
                  {tableState === "umum" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowBulkEdit(true)}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
                      >
                        Ubah Bulk
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkTrashConfirm(true)}
                        className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-50"
                      >
                        Pindahkan ke Sampah
                      </button>
                    </>
                  )}
                  {tableState === "sampah" && (
                    <button
                      type="button"
                      onClick={() => setBulkDeleteConfirm(true)}
                      className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-50"
                    >
                      Hapus Permanen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={bulkSelect.clear}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
                  >
                    Batal Pilih
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              {isLoading ? (
                <p className="p-8 text-center text-sm font-medium text-gray-400">Memuat data...</p>
              ) : error ? (
                <p className="p-8 text-center text-sm font-medium text-red-600">{error}</p>
              ) : tableState === "langganan" ? (
                <SubscriptionTable items={subscriptionItems} />
              ) : (
                <OverviewTable
                  items={overviewItems}
                  scope={tableState}
                  isAdmin={isAdmin}
                  bulkSelect={bulkSelect}
                  onEdit={(outlet) => setShowForm({ mode: "edit", outlet })}
                  onRestore={(outlet) =>
                    setRestoreTarget({ id: outlet.id, ownerId: outlet.owner.id || 0, name: outlet.name })
                  }
                  onForceDelete={(outlet) =>
                    setDeleteTarget({ id: outlet.id, ownerId: outlet.owner.id || 0, name: outlet.name })
                  }
                />
              )}
            </div>

            {!isLoading && !error && (
              <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 p-4 sm:flex-row">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">Total {total} Outlet</span>
                  <span className="text-xs text-gray-500">
                    Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1}&ndash;{Math.min(page * limit, total)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-xs font-bold text-gray-700">Halaman {page} / {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <OutletFormModal
          mode={showForm.mode}
          outlet={showForm.outlet}
          onClose={() => setShowForm(null)}
          onSaved={() => {
            setShowForm(null);
            refetch();
          }}
        />
      )}

      {showBulkEdit && (
        <BulkEditOutletModal
          items={selectedItems}
          onClose={() => setShowBulkEdit(false)}
          onSubmit={handleBulkEditSubmit}
        />
      )}

      {restoreTarget && (
        <ConfirmDialog
          title="Pulihkan Outlet?"
          message={`"${restoreTarget.name}" akan dipulihkan dan aktif kembali.`}
          confirmLabel="Pulihkan"
          isBusy={isActing}
          onClose={() => setRestoreTarget(null)}
          onConfirm={() => void handleRestore()}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Hapus Permanen?"
          message={`"${deleteTarget.name}" akan dihapus PERMANEN dan tidak bisa dipulihkan lagi.`}
          confirmLabel="Hapus Permanen"
          danger
          isBusy={isActing}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleForceDelete()}
        />
      )}

      {bulkTrashConfirm && (
        <ConfirmDialog
          title="Pindahkan ke Sampah?"
          message={`${bulkSelect.selectedCount} outlet terpilih akan dipindahkan ke sampah.`}
          confirmLabel="Pindahkan"
          isBusy={isBulkActing}
          onClose={() => setBulkTrashConfirm(false)}
          onConfirm={() => void handleBulkTrash()}
        />
      )}

      {bulkDeleteConfirm && (
        <ConfirmDialog
          title="Hapus Permanen?"
          message={`${bulkSelect.selectedCount} outlet terpilih akan dihapus PERMANEN dan tidak bisa dipulihkan lagi.`}
          confirmLabel="Hapus Permanen"
          danger
          isBusy={isBulkActing}
          onClose={() => setBulkDeleteConfirm(false)}
          onConfirm={() => void handleBulkForceDelete()}
        />
      )}
    </div>
  );
}

type BulkSelectApi = ReturnType<typeof useBulkSelect<OutletOverviewItem>>;

function OverviewTable({
  items,
  scope,
  isAdmin,
  bulkSelect,
  onEdit,
  onRestore,
  onForceDelete,
}: {
  items: OutletOverviewItem[];
  scope: TableState;
  isAdmin: boolean;
  bulkSelect: BulkSelectApi;
  onEdit: (outlet: BackendOutlet) => void;
  onRestore: (outlet: OutletOverviewItem) => void;
  onForceDelete: (outlet: OutletOverviewItem) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="p-8 text-center text-sm font-medium text-gray-400">
        Tidak ada data outlet yang cocok.
      </p>
    );
  }

  return (
    <table className="w-full min-w-[1000px] text-left text-sm text-gray-600">
      <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
        <tr>
          {isAdmin && (
            <th className="w-12 px-4 py-4 text-center">
              <input
                type="checkbox"
                checked={bulkSelect.isAllSelected}
                onChange={() => {}}
                onClick={(event) => {
                  event.preventDefault();
                  bulkSelect.toggleAll();
                }}
                className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
              />
            </th>
          )}
          <th className="px-4 py-4 font-bold">Kode Outlet</th>
          <th className="px-4 py-4 font-bold">Nama Outlet</th>
          <th className="px-4 py-4 font-bold">Owner</th>
          <th className="px-4 py-4 font-bold">Kota / Provinsi</th>
          <th className="px-4 py-4 font-bold">Saldo Owner</th>
          <th className="px-4 py-4 text-center font-bold">Status</th>
          <th className="px-4 py-4 text-center font-bold">Aksi</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {items.map((item) => (
          <tr
            key={item.id}
            className={`transition-colors hover:bg-gray-50 ${
              bulkSelect.isSelected(item.id) ? "bg-red-50/60" : ""
            }`}
          >
            {isAdmin && (
              <td className="px-4 py-4 align-top text-center">
                <input
                  type="checkbox"
                  checked={bulkSelect.isSelected(item.id)}
                  onChange={() => {}}
                  onClick={(event) => {
                    event.preventDefault();
                    bulkSelect.toggleRow(item.id, event.shiftKey);
                  }}
                  className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                />
              </td>
            )}
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.code}</td>
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.name}</td>
            <td className="px-4 py-4 align-top">
              {item.owner.name || "—"}
              {item.owner.code && <span className="text-gray-400"> ({item.owner.code})</span>}
            </td>
            <td className="px-4 py-4 align-top">
              {item.city || "—"}
              {item.province ? `, ${item.province}` : ""}
            </td>
            <td className="px-4 py-4 align-top text-sm font-semibold text-gray-700">
              {item.owner.id ? (
                <Link
                  href={`/menu/owner-outlet/${item.owner.id}`}
                  className="text-[#C92C1E] underline decoration-dotted underline-offset-2 hover:text-red-700"
                >
                  Lihat saldo owner
                </Link>
              ) : (
                "—"
              )}
            </td>
            <td className="px-4 py-4 align-top text-center">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-tight ${
                  item.status === "ACTIVE"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-100 text-gray-500"
                }`}
              >
                {item.status}
              </span>
            </td>
            <td className="px-4 py-4 align-top text-center">
              <div className="flex items-center justify-center gap-2">
                <Link
                  href={`/menu/kelolaan-outlet/detail?id=${item.id}`}
                  className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                  title="Lihat Detail Outlet"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </Link>
                {isAdmin && scope === "umum" && (
                  <button
                    type="button"
                    onClick={() =>
                      onEdit({
                        id: item.id,
                        owner_id: item.owner.id,
                        code: item.code,
                        name: item.name,
                        phone: item.phone || "",
                        province: item.province,
                        city: item.city,
                      })
                    }
                    className="rounded-lg bg-orange-50 p-2 text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-700"
                    title="Edit Outlet"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                {isAdmin && scope === "sampah" && (
                  <>
                    <button
                      type="button"
                      onClick={() => onRestore(item)}
                      className="rounded-lg bg-emerald-50 p-2 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                      title="Pulihkan Outlet"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onForceDelete(item)}
                      className="rounded-lg bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      title="Hapus Permanen"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SubscriptionTable({ items }: { items: OutletSubscriptionStatusItem[] }) {
  if (items.length === 0) {
    return (
      <p className="p-8 text-center text-sm font-medium text-gray-400">
        Tidak ada data langganan yang cocok untuk bulan ini.
      </p>
    );
  }

  return (
    <table className="w-full min-w-[1020px] text-left text-sm text-gray-600">
      <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
        <tr>
          <th className="px-4 py-4 font-bold">Kode Outlet</th>
          <th className="px-4 py-4 font-bold">Nama Outlet</th>
          <th className="px-4 py-4 font-bold">Owner</th>
          <th className="px-4 py-4 font-bold">Paket / Plan</th>
          <th className="px-4 py-4 text-center font-bold">Status Langganan</th>
          <th className="px-4 py-4 font-bold">Sisa Hari</th>
          <th className="px-4 py-4 font-bold">Berakhir</th>
          <th className="px-4 py-4 text-center font-bold">Aksi</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {items.map((item) => (
          <tr key={item.outlet_id} className="transition-colors hover:bg-gray-50">
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.outlet_code}</td>
            <td className="px-4 py-4 align-top font-medium text-gray-900">{item.outlet_name}</td>
            <td className="p-3 align-top">{item.owner.name || "—"}</td>
            <td className="px-4 py-4 align-top">
              {item.package_plan.package_name || "—"}
              {item.package_plan.plan_name ? ` / ${item.package_plan.plan_name}` : ""}
            </td>
            <td className="px-4 py-4 align-top text-center">
              <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight text-[#C92C1E]">
                {item.subscription_status_label}
              </span>
            </td>
            <td className="px-4 py-4 align-top">{item.remaining_days_display}</td>
            <td className="px-4 py-4 align-top">{item.last_subscription_end_display}</td>
            <td className="px-4 py-4 align-top text-center">
              <Link
                href={`/menu/kelolaan-outlet/detail?id=${item.outlet_id}`}
                className="inline-flex rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                title="Lihat Detail Outlet"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  isBusy,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  isBusy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <h3 className={`text-lg font-black ${danger ? "text-red-600" : "text-gray-900"}`}>{title}</h3>
        <p className="text-xs text-gray-600">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-600"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={`rounded-xl px-4 py-2 text-xs font-black text-white ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[#C92C1E] hover:bg-[#A82216]"
            }`}
          >
            {isBusy ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
