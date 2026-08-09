"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import {
  RowActionButton,
  RowActionGroup,
  EditActionButton,
  ToggleActiveActionButton,
} from "@/app/components/table/RowActionButton";
import SalesFormModal, {
  type SalesFormState,
  type SalesItem,
  type SalesStatus,
} from "./SalesFormModal";
import AnalyticsTab from './AnalyticsTab';
import { authFetchJson } from '@/app/lib/api';
import { formatPhoneDisplay } from '@/app/lib/phone';
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";

const EMPTY_FORM: SalesFormState = {
  name: "",
  email: "",
  phone: "",
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authFetchJson<T>(path, options);
}

async function listSales() {
  const response = await apiFetch<{
    data?: SalesItem[] | { items?: SalesItem[] };
  }>("/sales");

  if (Array.isArray(response.data)) return response.data;
  return response.data?.items || [];
}

async function createSales(payload: {
  name: string;
  email: string;
  phone?: string;
}) {
  return apiFetch<{
    data?: {
      user?: SalesItem;
      temporary_password?: string;
    };
  }>("/sales", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      phone: payload.phone || undefined,
    }),
  });
}

async function updateSales(
  sales: SalesItem,
  payload: {
    name: string;
    email: string;
    phone?: string;
  },
) {
  return apiFetch<{ data?: SalesItem }>(`/sales/${sales.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      phone: payload.phone || undefined,
    }),
  });
}

async function activateSales(id: number) {
  return apiFetch<{ data?: SalesItem }>(`/sales/${id}/activate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

async function deactivateSales(id: number) {
  return apiFetch<{ data?: SalesItem }>(`/sales/${id}/deactivate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

async function resetSalesPassword(id: number) {
  return apiFetch<{
    data?: {
      user?: SalesItem;
      temporary_password?: string;
    };
  }>(`/sales/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

function getRealtimeStatus(item: SalesItem): SalesStatus {
  const rawStatus = String(item.status || "").toUpperCase();

  const hasDeactivatedAt =
    item.deactivated_at !== null &&
    item.deactivated_at !== undefined &&
    String(item.deactivated_at).trim() !== "";

  const isExplicitInactive =
    rawStatus === "INACTIVE" ||
    rawStatus === "NONACTIVE" ||
    rawStatus === "NON_AKTIF" ||
    rawStatus === "NON AKTIF" ||
    rawStatus === "DEACTIVATED" ||
    rawStatus === "DISABLED";

  const isExplicitActive =
    rawStatus === "ACTIVE" || rawStatus === "AKTIF" || rawStatus === "ENABLED";

  if (item.is_active === false) return "INACTIVE";
  if (item.is_active === true) return "ACTIVE";

  if (hasDeactivatedAt || isExplicitInactive) return "INACTIVE";
  if (isExplicitActive) return "ACTIVE";

  return "ACTIVE";
}

function normalizeSales(item: SalesItem): SalesItem {
  return {
    ...item,
    role: "SALES",
    status: getRealtimeStatus(item),
    name: item.name || "",
    email: item.email || "",
    phone: item.phone || "",
    deactivated_at: item.deactivated_at || null,
    is_active: item.is_active ?? null,
  };
}

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<"data" | "analytics">("data");
  const [sales, setSales] = useState<SalesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<SalesFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formTemporaryPassword, setFormTemporaryPassword] = useState("");
  const [editingSales, setEditingSales] = useState<SalesItem | null>(null);
  const [selectedSales, setSelectedSales] = useState<SalesItem | null>(null);

  const totalSales = sales.length;
  const activeSales = sales.filter((item) => item.status === "ACTIVE").length;
  const inactiveSales = sales.filter((item) => item.status === "INACTIVE").length;

  const filteredSales = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return sales.filter((item) => {
      if (!keyword) return true;

      return [
        item.name || "",
        item.email || "",
        item.phone || "",
        item.status || "",
        item.role || "SALES",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [sales, search]);

  const loadSales = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setPageError("");

    try {
      const items = await listSales();
      setSales(items.map((item) => normalizeSales(item)));
    } catch (error) {
      setPageError(getErrorMessage(error));
      setSales([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void loadSales();
    }, 0);

    const interval = window.setInterval(() => {
      void loadSales(false);
    }, 10000);

    const handleFocus = () => {
      void loadSales(false);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadSales]);

  const openCreateModal = () => {
    setEditingSales(null);
    setForm({
      name: "",
      email: "",
      phone: "",
    });
    setFormError("");
    setFormTemporaryPassword("");
    setShowModal(true);
  };

  const openEditModal = (item: SalesItem) => {
    setEditingSales(item);
    setForm({
      name: item.name || "",
      email: item.email || "",
      phone: item.phone || "",
    });
    setFormError("");
    setFormTemporaryPassword("");
    setShowModal(true);
  };

  const closeFormModal = () => {
    setShowModal(false);
    setEditingSales(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormTemporaryPassword("");
  };

  const handleSubmitSales = async () => {
    setFormError("");
    setFormTemporaryPassword("");

    if (!form.name.trim()) {
      setFormError("Nama sales wajib diisi.");
      return;
    }

    if (!form.email.trim()) {
      setFormError("Email sales wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
      };

      const response = editingSales
        ? await updateSales(editingSales, payload)
        : await createSales(payload);

      if (!editingSales && response.data?.temporary_password) {
        setFormTemporaryPassword(response.data.temporary_password);
      }

      await loadSales(false);

      if (editingSales) {
        closeFormModal();
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: SalesItem) => {
    setPageError("");
    setPageSuccess("");
    setTemporaryPassword("");

    try {
      if (item.status === "ACTIVE") {
        await deactivateSales(item.id);
        setPageSuccess(`Sales ${item.name || item.email} berhasil dinonaktifkan.`);
      } else {
        await activateSales(item.id);
        setPageSuccess(`Sales ${item.name || item.email} berhasil diaktifkan.`);
      }

      await loadSales(false);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  };

  const handleResetPassword = async (item: SalesItem) => {
    setPageError("");
    setPageSuccess("");
    setTemporaryPassword("");

    try {
      const response = await resetSalesPassword(item.id);
      const tempPassword = response.data?.temporary_password || "";

      if (tempPassword) {
        setTemporaryPassword(tempPassword);
        setPageSuccess(`Password sales ${item.name || item.email} berhasil direset.`);
      } else {
        setPageSuccess(`Password sales ${item.name || item.email} berhasil direset.`);
      }

      await loadSales(false);
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-[#C92C1E]">Sales</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Sales
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manajemen akun Sales, status aktif, dan reset password.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700"
          >
            + Buat Sales
          </button>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {pageError}
        </div>
      ) : null}

      {pageSuccess ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {pageSuccess}
        </div>
      ) : null}

      {temporaryPassword ? (
        <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">
          Temporary password:{" "}
          <span className="font-black text-orange-900">{temporaryPassword}</span>
        </div>
      ) : null}

      <QuickInfoCardGrid columns={3}>
        <QuickInfoCard
          label="Total Sales"
          value={totalSales}
          description="Seluruh akun sales yang terdaftar."
          tone="accent"
          silhouette="briefcase"
        />
        <QuickInfoCard
          label="Sales Aktif"
          value={activeSales}
          description="Akun sales yang sedang aktif bekerja."
          tone="emerald"
        />
        <QuickInfoCard
          label="Sales Nonaktif"
          value={inactiveSales}
          description="Akun sales yang sedang nonaktif."
          tone="rose"
        />
      </QuickInfoCardGrid>

      <div className="flex flex-col gap-4 rounded-2xl border border-red-100 bg-[linear-gradient(135deg,#fff_0%,#fff7f5_100%)] p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-[10px] font-black uppercase text-[#C92C1E]">
            Mitra Sales & Lead Afiliasi
          </span>
          <h3 className="mt-2 text-lg font-black text-gray-900">
            Kelola Mitra & Tambah Lead Afiliasi
          </h3>
          <p className="mt-1 text-xs font-medium text-gray-500">
            Sales dapat mengatur mitra yang dinaungi, menugaskan PIC, dan mereferensikan Lead berafiliasi dengan Mitra.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/menu/mitra-sales"
            className="rounded-xl bg-[#C92C1E] px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:bg-red-700"
          >
            Kelola Mitra Sales →
          </Link>
          <Link
            href="/menu/lead?action=create"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 shadow-xs transition-all hover:bg-gray-50 hover:text-[#C92C1E]"
          >
            + Tambah Lead Baru
          </Link>
        </div>
      </div>

      <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="flex text-sm font-bold">
          {[
            { value: "data", label: "Data Sales" },
            { value: "analytics", label: "Analitik" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as "data" | "analytics")}
              className={`flex items-center gap-1.5 rounded-lg px-5 py-2.5 transition-all ${
                activeTab === tab.value
                  ? "bg-white text-[#C92C1E] shadow-sm"
                  : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "data" ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-4">
          <div>
            <p className="text-sm font-black text-gray-900">Daftar Sales</p>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Klik baris sales untuk melihat detail.
            </p>
          </div>

          <input
            value={search || ""}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, email, nomor HP, atau status"
            className="min-w-[260px] rounded-lg border border-gray-200 bg-[#FAFAFA] px-3 py-2 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm text-gray-600">
            <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-4 font-bold">Sales</th>
                <th className="px-4 py-4 font-bold">Email</th>
                <th className="px-4 py-4 font-bold">Nomor HP</th>
                <th className="px-4 py-4 font-bold">Status</th>
                <th className="px-4 py-4 text-center font-bold">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-gray-500">
                    Memuat data sales...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-gray-500">
                    Belum ada data sales.
                  </td>
                </tr>
              ) : (
                filteredSales.map((item) => (
                  <tr
                    key={`sales-${item.id}`}
                    onClick={() => setSelectedSales(item)}
                    className="cursor-pointer transition-colors hover:bg-red-50/40"
                    title="Klik untuk lihat detail sales"
                  >
                    <td className="px-4 py-4">
                      <p className="font-black text-gray-900">{item.name || "-"}</p>
                      <p className="mt-1 text-xs text-gray-400">ID #{item.id}</p>
                    </td>

                    <td className="px-4 py-4 font-bold text-gray-800">
                      {item.email || "-"}
                    </td>

                    <td className="px-4 py-4">{item.phone ? formatPhoneDisplay(item.phone) : "-"}</td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            item.status === "ACTIVE"
                              ? "bg-emerald-500"
                              : "bg-gray-400"
                          }`}
                        />
                        {item.status === "ACTIVE" ? "AKTIF" : "NON AKTIF"}
                      </span>
                    </td>

                    <td
                      className="px-4 py-4 text-center"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <RowActionGroup>
                        <EditActionButton
                          title="Edit Sales"
                          onClick={() => openEditModal(item)}
                        />

                        <ToggleActiveActionButton
                          active={item.status === "ACTIVE"}
                          onClick={() => void handleToggleStatus(item)}
                        />

                        <RowActionButton
                          icon={KeyRound}
                          tone="edit"
                          title="Reset Password"
                          onClick={() => void handleResetPassword(item)}
                        />
                      </RowActionGroup>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <AnalyticsTab />
      )}

      <SalesFormModal
        open={showModal}
        form={form}
        formError={formError}
        temporaryPassword={formTemporaryPassword}
        saving={saving}
        editingSales={editingSales}
        setForm={setForm}
        onClose={closeFormModal}
        onSubmit={handleSubmitSales}
      />

      {selectedSales ? (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70"
          onClick={() => setSelectedSales(null)}
        >
          <div className="flex min-h-full items-center justify-center p-4 md:p-6">
            <div
              className="app-modal-panel w-full max-w-2xl rounded-[32px] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="app-modal-header px-5 py-4 md:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                      Detail Sales
                    </p>
                    <h2 className="mt-2 text-lg font-black text-slate-950 md:text-xl">
                      {selectedSales.name || "-"}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Informasi akun sales Piposmart.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSales(null)}
                    className="app-modal-close rounded-2xl px-4 py-2 text-xs font-black transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              <div className="app-modal-body grid grid-cols-1 gap-3 p-5 md:grid-cols-2 md:p-6">
                {[
                  ["Nama", selectedSales.name || "-"],
                  ["Email", selectedSales.email || "-"],
                  ["Nomor HP", selectedSales.phone ? formatPhoneDisplay(selectedSales.phone) : "-"],
                  ["Role", "SALES"],
                  [
                    "Status",
                    selectedSales.status === "ACTIVE" ? "AKTIF" : "NON AKTIF",
                  ],
                  [
                    "Nonaktif Pada",
                    selectedSales.deactivated_at
                      ? String(selectedSales.deactivated_at)
                      : "-",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-black text-gray-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


