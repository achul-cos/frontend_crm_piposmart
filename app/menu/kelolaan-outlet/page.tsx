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
import OutletFormModal from "./OutletFormModal";
import OutletAnalytics from "./OutletAnalytics";
import BulkEditOutletModal, { type BulkEditFields } from "./BulkEditOutletModal";

type TableState = "umum" | "langganan" | "sampah";
type ViewMode = "table" | "analytics";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<ViewMode>("table");
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

  const loadData = useMemo(
    () => async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (tableState === "langganan") {
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
    <div className="mx-auto max-w-7xl space-y-5 font-sans text-[#1C1C1E]">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Kelolaan Outlet</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Data seluruh outlet lintas-owner: informasi umum, status langganan, dan riwayat sampah.
          </p>
        </div>
        <div className="flex gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setView("table")}
            className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
              view === "table" ? "bg-[#C92C1E] text-white" : "text-gray-500 hover:text-[#C92C1E]"
            }`}
          >
            Tabel
          </button>
          <button
            type="button"
            onClick={() => setView("analytics")}
            className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
              view === "analytics" ? "bg-[#C92C1E] text-white" : "text-gray-500 hover:text-[#C92C1E]"
            }`}
          >
            Analitik
          </button>
        </div>
      </div>

      {view === "analytics" ? (
        <OutletAnalytics />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200/60 bg-white p-4 shadow-xs">
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 text-xs font-black">
              {(
                [
                  { key: "umum" as const, label: "Informasi Umum" },
                  { key: "langganan" as const, label: "Langganan" },
                  { key: "sampah" as const, label: "Sampah" },
                ]
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => changeTableState(tab.key)}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    tableState === tab.key
                      ? "bg-[#C92C1E] text-white"
                      : "text-gray-500 hover:text-[#C92C1E]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari kode outlet, nama, atau owner..."
              className="min-w-[220px] flex-1 rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-bold outline-none focus:border-[#C92C1E]"
            />

            {tableState === "langganan" && (
              <>
                <select
                  value={subscriptionStatus}
                  onChange={(event) => {
                    setSubscriptionStatus(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-bold outline-none focus:border-[#C92C1E]"
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
                  className="rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-bold outline-none focus:border-[#C92C1E]"
                />
              </>
            )}

            {isAdmin && tableState !== "sampah" && (
              <button
                type="button"
                onClick={() => setShowForm({ mode: "create" })}
                className="ml-auto rounded-xl bg-[#C92C1E] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#A82216]"
              >
                + Tambah Outlet
              </button>
            )}
          </div>

          {bulkResultMessage && (
            <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-[11px] font-bold text-green-800">
              {bulkResultMessage}
            </p>
          )}

          {isAdmin && bulkSelect.selectedCount > 0 && tableState !== "langganan" && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#C92C1E]/30 bg-red-50 p-3">
              <span className="text-xs font-black text-[#C92C1E]">
                {bulkSelect.selectedCount} outlet dipilih
              </span>
              <div className="ml-auto flex gap-2">
                {tableState === "umum" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowBulkEdit(true)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black hover:border-[#C92C1E]/40 hover:text-[#C92C1E]"
                    >
                      Ubah Bulk
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkTrashConfirm(true)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black text-red-600 hover:border-red-400"
                    >
                      Pindahkan ke Sampah
                    </button>
                  </>
                )}
                {tableState === "sampah" && (
                  <button
                    type="button"
                    onClick={() => setBulkDeleteConfirm(true)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black text-red-600 hover:border-red-400"
                  >
                    Hapus Permanen
                  </button>
                )}
                <button
                  type="button"
                  onClick={bulkSelect.clear}
                  className="rounded-lg px-3 py-1.5 text-[10px] font-black text-gray-500 hover:text-gray-700"
                >
                  Batal Pilih
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-gray-200/60 bg-white shadow-xs">
            {isLoading ? (
              <p className="p-8 text-center text-xs font-bold text-gray-400">Memuat data...</p>
            ) : error ? (
              <p className="p-8 text-center text-xs font-bold text-red-600">{error}</p>
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
            <div className="flex items-center justify-between px-1 text-xs text-gray-500">
              <span>
                Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1}&ndash;
                {Math.min(page * limit, total)} dari {total} data
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-bold disabled:opacity-40"
                >
                  &larr; Sebelumnya
                </button>
                <span>
                  Halaman {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-bold disabled:opacity-40"
                >
                  Berikutnya &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
      <p className="p-8 text-center text-xs font-bold text-gray-400">
        Tidak ada data outlet yang cocok.
      </p>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50 text-[10px] font-black uppercase text-gray-500">
          {isAdmin && (
            <th className="w-8 p-3">
              <input
                type="checkbox"
                checked={bulkSelect.isAllSelected}
                onChange={() => {}}
                onClick={(event) => {
                  event.preventDefault();
                  bulkSelect.toggleAll();
                }}
                className="h-3.5 w-3.5 accent-[#C92C1E]"
              />
            </th>
          )}
          <th className="p-3 text-left">Kode Outlet</th>
          <th className="p-3 text-left">Nama Outlet</th>
          <th className="p-3 text-left">Owner</th>
          <th className="p-3 text-left">Kota / Provinsi</th>
          <th className="p-3 text-left">Saldo Wallet</th>
          <th className="p-3 text-left">Status</th>
          <th className="p-3 text-right">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
              bulkSelect.isSelected(item.id) ? "bg-red-50/60" : ""
            }`}
          >
            {isAdmin && (
              <td className="p-3">
                <input
                  type="checkbox"
                  checked={bulkSelect.isSelected(item.id)}
                  onChange={() => {}}
                  onClick={(event) => {
                    event.preventDefault();
                    bulkSelect.toggleRow(item.id, event.shiftKey);
                  }}
                  className="h-3.5 w-3.5 accent-[#C92C1E]"
                />
              </td>
            )}
            <td className="p-3 font-black">{item.code}</td>
            <td className="p-3">{item.name}</td>
            <td className="p-3">
              {item.owner.name || "—"}
              {item.owner.code && <span className="text-gray-400"> ({item.owner.code})</span>}
            </td>
            <td className="p-3">
              {item.city || "—"}
              {item.province ? `, ${item.province}` : ""}
            </td>
            <td className="p-3 font-mono">{formatRupiah(item.wallet?.balance)}</td>
            <td className="p-3">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  item.status === "ACTIVE"
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {item.status}
              </span>
            </td>
            <td className="p-3 text-right">
              <div className="flex justify-end gap-2">
                <Link
                  href={`/menu/kelolaan-outlet/detail?id=${item.id}`}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-black hover:border-[#C92C1E]/40 hover:text-[#C92C1E]"
                >
                  Detail
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
                    className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-black hover:border-[#C92C1E]/40 hover:text-[#C92C1E]"
                  >
                    Ubah
                  </button>
                )}
                {isAdmin && scope === "sampah" && (
                  <>
                    <button
                      type="button"
                      onClick={() => onRestore(item)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-black hover:border-green-400 hover:text-green-700"
                    >
                      Pulihkan
                    </button>
                    <button
                      type="button"
                      onClick={() => onForceDelete(item)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-black text-red-600 hover:border-red-400"
                    >
                      Hapus Permanen
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
      <p className="p-8 text-center text-xs font-bold text-gray-400">
        Tidak ada data langganan yang cocok untuk bulan ini.
      </p>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50 text-[10px] font-black uppercase text-gray-500">
          <th className="p-3 text-left">Kode Outlet</th>
          <th className="p-3 text-left">Nama Outlet</th>
          <th className="p-3 text-left">Owner</th>
          <th className="p-3 text-left">Paket / Plan</th>
          <th className="p-3 text-left">Status Langganan</th>
          <th className="p-3 text-left">Sisa Hari</th>
          <th className="p-3 text-left">Berakhir</th>
          <th className="p-3 text-right">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.outlet_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
            <td className="p-3 font-black">{item.outlet_code}</td>
            <td className="p-3">{item.outlet_name}</td>
            <td className="p-3">{item.owner.name || "—"}</td>
            <td className="p-3">
              {item.package_plan.package_name || "—"}
              {item.package_plan.plan_name ? ` / ${item.package_plan.plan_name}` : ""}
            </td>
            <td className="p-3">
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-[#C92C1E]">
                {item.subscription_status_label}
              </span>
            </td>
            <td className="p-3">{item.remaining_days_display}</td>
            <td className="p-3">{item.last_subscription_end_display}</td>
            <td className="p-3 text-right">
              <Link
                href={`/menu/kelolaan-outlet/detail?id=${item.outlet_id}`}
                className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-black hover:border-[#C92C1E]/40 hover:text-[#C92C1E]"
              >
                Detail
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
