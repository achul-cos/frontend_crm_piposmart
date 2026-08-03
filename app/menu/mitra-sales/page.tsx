"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import {
  createPartner,
  deactivatePartner,
  listPartners,
  listPartnerTypes,
  updatePartner,
  type PartnerItem,
  type PartnerTypeItem,
} from "@/app/lib/api";
import MitraSalesFormModal, {
  type PartnerFormState,
} from "./MitraSalesFormModal";
import AnalyticsTab from "./AnalyticsTab";

type TableMode =
  | "PARTNER_TYPES"
  | "ACTIVE_PARTNERS"
  | "INACTIVE_PARTNERS"
  | "ANALYTICS";

const PAGE_SIZE = 20;

const EMPTY_PARTNER_FORM: PartnerFormState = {
  partnerTypeId: "",
  code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  bankAccount: "",
  status: "ACTIVE",
  selfAssignPic: false,
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

function isValidEmail(value: string) {
  const email = value.trim();

  if (!email) return true;

  return (
    email.includes("@") &&
    email.indexOf("@") > 0 &&
    email.indexOf("@") < email.length - 1
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value?: string | number | null) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatFlatCommission(partnerType?: PartnerTypeItem | null) {
  if (!partnerType) return "-";

  const value = Number(partnerType.commission_value || 0);

  return partnerType.commission_mode === "PERCENTAGE"
    ? `${value}%`
    : formatMoney(value);
}

function getStatusBadgeClass(status?: string) {
  if (status === "ACTIVE") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  return "border-gray-200 bg-gray-100 text-gray-500";
}

export default function MitraSalesPage() {
  usePageTitle("Mitra Sales");

  const [tableMode, setTableMode] = useState<TableMode>("PARTNER_TYPES");
  const [partnerTypes, setPartnerTypes] = useState<PartnerTypeItem[]>([]);
  const [partners, setPartners] = useState<PartnerItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [typeSearch, setTypeSearch] = useState("");
  const [page, setPage] = useState(1);

  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(
    null,
  );
  const [partnerForm, setPartnerForm] =
    useState<PartnerFormState>(EMPTY_PARTNER_FORM);
  const [partnerFormError, setPartnerFormError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadMaster = async () => {
      setLoadingMaster(true);
      setPageError("");

      try {
        const result = await listPartnerTypes();

        if (cancelled) return;

        setPartnerTypes(result.items || []);
      } catch (error) {
        if (!cancelled) {
          setPageError(getErrorMessage(error));
          setPartnerTypes([]);
        }
      } finally {
        if (!cancelled) setLoadingMaster(false);
      }
    };

    void loadMaster();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setPageError("");

      try {
        const result = await listPartners({
          search: appliedSearch,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        });

        if (cancelled) return;

        setPartners(result.items || []);
      } catch (error) {
        if (!cancelled) {
          setPageError(getErrorMessage(error));
          setPartners([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [appliedSearch, page]);

  const filteredPartners = useMemo(() => {
    return partners.filter((partner) =>
      typeFilter === "ALL" ? true : partner.partner_type?.code === typeFilter,
    );
  }, [partners, typeFilter]);

  const activePartners = useMemo(() => {
    return filteredPartners.filter((partner) => partner.status === "ACTIVE");
  }, [filteredPartners]);

  const inactivePartners = useMemo(() => {
    return filteredPartners.filter((partner) => partner.status === "INACTIVE");
  }, [filteredPartners]);

  const visiblePartners = useMemo(() => {
    return tableMode === "ACTIVE_PARTNERS" ? activePartners : inactivePartners;
  }, [activePartners, inactivePartners, tableMode]);

  const filteredPartnerTypes = useMemo(() => {
    const keyword = typeSearch.trim().toLowerCase();

    if (!keyword) return partnerTypes;

    return partnerTypes.filter((item) =>
      [
        item.code,
        item.name,
        item.description || "",
        item.commission_mode,
        item.commission_value,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [partnerTypes, typeSearch]);

  const refreshPartners = async () => {
    const result = await listPartners({
      search: appliedSearch,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });

    setPartners(result.items || []);
  };

  const openCreatePartnerModal = () => {
    setEditingPartner(null);
    setPartnerForm(EMPTY_PARTNER_FORM);
    setPartnerFormError("");
    setPageSuccess("");
    setShowPartnerModal(true);
  };

  const openEditPartnerModal = (partner: PartnerItem) => {
    setEditingPartner(partner);

    setPartnerForm({
      partnerTypeId: String(partner.partner_type?.id || ""),
      code: partner.code || "",
      name: partner.name || "",
      phone: partner.phone || "",
      email: partner.email || "",
      address: partner.address || "",
      bankAccount: "",
      status: partner.status || "ACTIVE",
      selfAssignPic: false,
    });

    setPartnerFormError("");
    setPageSuccess("");
    setShowPartnerModal(true);
  };

  const closePartnerModal = () => {
    setShowPartnerModal(false);
    setEditingPartner(null);
    setPartnerForm(EMPTY_PARTNER_FORM);
    setPartnerFormError("");
  };

  const handlePartnerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setPartnerFormError("");
    setPageError("");
    setPageSuccess("");

    if (!partnerForm.name.trim()) {
      setPartnerFormError("Nama mitra wajib diisi.");
      return;
    }

    if (!editingPartner && !partnerForm.partnerTypeId) {
      setPartnerFormError("Jenis mitra wajib dipilih.");
      return;
    }

    if (!editingPartner && !partnerForm.code.trim()) {
      setPartnerFormError("Code mitra wajib diisi.");
      return;
    }

    if (partnerForm.email.trim() && !isValidEmail(partnerForm.email)) {
      setPartnerFormError("Format email wajib menggunakan tanda @.");
      return;
    }

    setSaving(true);

    try {
      if (editingPartner) {
        await updatePartner(editingPartner.id, {
          name: partnerForm.name.trim(),
          phone: partnerForm.phone.trim() || undefined,
          email: partnerForm.email.trim() || undefined,
          address: partnerForm.address.trim() || undefined,
          bank_account: partnerForm.bankAccount.trim() || undefined,
          status: partnerForm.status,
        });

        setPageSuccess("Mitra berhasil diperbarui.");
      } else {
        await createPartner({
          partner_type_id: Number(partnerForm.partnerTypeId),
          code: partnerForm.code.trim().toUpperCase(),
          name: partnerForm.name.trim(),
          phone: partnerForm.phone.trim() || undefined,
          email: partnerForm.email.trim() || undefined,
          address: partnerForm.address.trim() || undefined,
          bank_account: partnerForm.bankAccount.trim() || undefined,
          status: partnerForm.status,
          self_assign_pic: partnerForm.selfAssignPic || undefined,
        });

        setPageSuccess("Mitra berhasil ditambahkan.");
      }

      closePartnerModal();
      await refreshPartners();
    } catch (error) {
      setPartnerFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivatePartner = async (partner: PartnerItem) => {
    if (!window.confirm(`Nonaktifkan mitra ${partner.name}?`)) return;

    setSaving(true);
    setPageError("");
    setPageSuccess("");

    try {
      await deactivatePartner(partner.id);
      setPageSuccess("Mitra berhasil dinonaktifkan.");
      await refreshPartners();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleRestorePartner = async (partner: PartnerItem) => {
    if (!window.confirm(`Pulihkan mitra ${partner.name}?`)) return;

    setSaving(true);
    setPageError("");
    setPageSuccess("");

    try {
      await updatePartner(partner.id, { status: "ACTIVE" });
      setPageSuccess("Mitra berhasil dipulihkan.");
      await refreshPartners();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(searchDraft.trim());
  };

  const tabItems: { key: TableMode; label: string }[] = [
    { key: "PARTNER_TYPES", label: "Jenis Mitra" },
    { key: "ACTIVE_PARTNERS", label: "Mitra Aktif" },
    { key: "INACTIVE_PARTNERS", label: "Mitra Non Aktif" },
    { key: "ANALYTICS", label: "Analitik" },
  ];

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg
                className="h-3 w-3 shrink-0"
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
              <span className="text-[#C92C1E]">Mitra Sales</span>
            </div>

            <h1 className="break-words text-2xl font-black tracking-tight text-gray-900">
              Mitra Sales
            </h1>

            <p className="mt-1 break-words text-sm text-gray-500">
              Kelola mitra milik Sales, lihat jenis mitra, dan pantau analitik
              performa mitra.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreatePartnerModal}
            disabled={partnerTypes.length === 0 || loadingMaster}
            className="rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            + Tambah Mitra
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">
            Total Mitra
          </p>
          <h2 className="text-3xl font-black">{filteredPartners.length}</h2>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-colors hover:border-[#C92C1E]">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Mitra Aktif
          </p>
          <h2 className="text-3xl font-black text-gray-900">
            {activePartners.length}
          </h2>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-colors hover:border-[#C92C1E]">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Mitra Nonaktif
          </p>
          <h2 className="text-3xl font-black text-gray-900">
            {inactivePartners.length}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Jenis Mitra
          </p>
          <h2 className="text-2xl font-black text-gray-900">
            {partnerTypes.length}
          </h2>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Referensi jenis mitra yang dapat dipakai untuk onboarding mitra baru.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Data Ditampilkan
          </p>
          <h2 className="text-2xl font-black text-gray-900">
            {tableMode === "PARTNER_TYPES"
              ? filteredPartnerTypes.length
              : tableMode === "ANALYTICS"
                ? partnerTypes.length + filteredPartners.length
                : visiblePartners.length}
          </h2>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Sesuai tab dan filter yang sedang aktif.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="grid grid-cols-2 gap-1 text-sm font-bold md:flex">
          {tabItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTableMode(item.key)}
              className={`rounded-lg px-4 py-2.5 transition-all ${
                tableMode === item.key
                  ? "bg-white text-[#C92C1E] shadow-sm"
                  : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tableMode === "ANALYTICS" ? (
        <AnalyticsTab />
      ) : tableMode === "PARTNER_TYPES" ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
          <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/50 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-gray-900">
                Referensi Jenis Mitra
              </p>
              <p className="mt-1 text-xs font-medium text-gray-400">
                Jenis mitra tampil sebagai referensi untuk Sales.
              </p>
            </div>

            <input
              value={typeSearch}
              onChange={(event) => setTypeSearch(event.target.value)}
              placeholder="Cari jenis mitra"
              className="w-full rounded-lg border border-gray-200 bg-[#FAFAFA] px-3 py-2 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 md:max-w-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 p-4">
            {loadingMaster ? (
              <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
                Memuat jenis mitra...
              </div>
            ) : filteredPartnerTypes.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
                Jenis mitra tidak ditemukan.
              </div>
            ) : (
              filteredPartnerTypes.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-black text-gray-900">{item.name}</p>
                      <p className="mt-1 text-xs font-bold text-gray-400">
                        {item.code}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <span className="w-max rounded-full bg-red-50 px-3 py-1 text-[10px] font-black text-[#C92C1E]">
                        {item.commission_mode}
                      </span>

                      <Link
                        href={`/menu/mitra-sales/jenis-mitra/${item.id}`}
                        className="w-max rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-600 transition hover:bg-blue-100"
                      >
                        Detail
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                        Mode
                      </p>
                      <p className="mt-1 text-sm font-black text-gray-900">
                        {item.commission_mode || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                        Komisi Dasar
                      </p>
                      <p className="mt-1 text-sm font-black text-gray-900">
                        {formatFlatCommission(item)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                        Deskripsi
                      </p>
                      <p className="mt-1 text-sm font-bold text-gray-600">
                        {item.description || "Belum ada deskripsi."}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
          <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/50 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-black text-gray-900">
                {tableMode === "ACTIVE_PARTNERS"
                  ? "Daftar Mitra Aktif"
                  : "Daftar Mitra Non Aktif"}
              </p>
              <p className="mt-1 text-xs font-medium text-gray-400">
                Data mitra yang dikelola dari halaman Mitra Sales.
              </p>
            </div>

            <form
              onSubmit={handleSearch}
              className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_220px_auto]"
            >
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Cari nama atau code mitra"
                className="rounded-lg border border-gray-200 bg-[#FAFAFA] px-3 py-2 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              />

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-lg border border-gray-200 bg-[#FAFAFA] px-3 py-2 text-sm font-bold text-gray-900 focus:border-[#C92C1E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
              >
                <option value="ALL">Semua Type</option>
                {partnerTypes.map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.name || item.code}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="rounded-lg bg-[#C92C1E] px-4 py-2 text-sm font-black text-white transition-colors hover:bg-red-700"
              >
                Cari
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4">
            {loading ? (
              <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
                Memuat data mitra...
              </div>
            ) : visiblePartners.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
                Data mitra tidak ditemukan.
              </div>
            ) : (
              visiblePartners.map((partner) => (
                <div
                  key={partner.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-red-100 hover:bg-red-50/20"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-base font-black text-gray-900">
                        {partner.name || "-"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-gray-400">
                        {partner.code || `ID #${partner.id}`}
                      </p>
                    </div>

                    <span
                      className={`w-max rounded-full border px-3 py-1 text-[10px] font-black ${getStatusBadgeClass(
                        partner.status,
                      )}`}
                    >
                      {partner.status || "-"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                        Jenis Mitra
                      </p>
                      <p className="mt-1 text-sm font-black text-gray-900">
                        {partner.partner_type?.name || "-"}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-gray-400">
                        {partner.partner_type?.code || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                        Kontak
                      </p>
                      <p className="mt-1 text-sm font-black text-gray-900">
                        {partner.phone || "-"}
                      </p>
                      <p className="mt-1 break-words text-[11px] font-bold text-gray-400">
                        {partner.email || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                        Komisi Dasar
                      </p>
                      <p className="mt-1 text-sm font-black text-gray-900">
                        {formatFlatCommission(partner.partner_type)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                        Updated
                      </p>
                      <p className="mt-1 text-sm font-black text-gray-900">
                        {formatDateTime(partner.updated_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                        Alamat
                      </p>
                      <p className="mt-1 break-words text-sm font-black text-gray-900">
                        {partner.address || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:justify-end">
                    <Link
                      href={`/menu/mitra-sales/detail?id=${partner.id}`}
                      className="rounded-lg bg-blue-50 px-3 py-2 text-center text-xs font-black text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                    >
                      Detail & PIC
                    </Link>

                    {tableMode === "ACTIVE_PARTNERS" ? (
                      <>
                        <Link
                          href={`/menu/mitra-sales/detail?id=${partner.id}&tab=referral`}
                          className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-black text-[#C92C1E] transition-colors hover:bg-red-100"
                        >
                          + Lead Afiliasi
                        </Link>

                        <button
                          type="button"
                          onClick={() => openEditPartnerModal(partner)}
                          className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-black text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-700"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDeactivatePartner(partner)}
                          disabled={saving}
                          className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-black text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Nonaktif
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleRestorePartner(partner)}
                        disabled={saving}
                        className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Pulihkan
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 p-4 sm:flex-row">
            <span className="text-xs font-bold text-gray-500">
              Halaman {page}
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>

              <button
                disabled={partners.length < PAGE_SIZE}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      )}

      <MitraSalesFormModal
        open={showPartnerModal}
        editingPartner={editingPartner}
        partnerTypes={partnerTypes}
        form={partnerForm}
        formError={partnerFormError}
        saving={saving}
        setForm={setPartnerForm}
        onClose={closePartnerModal}
        onSubmit={handlePartnerSubmit}
      />
    </div>
  );
}