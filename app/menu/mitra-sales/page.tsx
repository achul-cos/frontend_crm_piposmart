"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Eye, UserRoundCog, Search, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { formatPhoneDisplay } from "@/app/lib/phone";
import {
  RowActionButton,
  RowActionGroup,
  ViewActionButton,
  EditActionButton,
  ToggleActiveActionButton,
} from "@/app/components/table/RowActionButton";
import TablePaginationFooter from "@/app/components/table/TablePaginationFooter";
import type { PartnerItem, PartnerTypeItem } from "@/app/lib/api";
import {
  useCreatePartner,
  useDeactivatePartner,
  usePartnerTypesQuery,
  usePartnersQuery,
  useUpdatePartner,
  useRestorePartner,
  usePermanentDeletePartner,
} from "@/app/lib/queries/mitraSales";
import MitraSalesFormModal, {
  type PartnerFormState,
} from "./MitraSalesFormModal";
import PartnerTypeModal from "./PartnerTypeModal";
import AnalyticsTab from "./AnalyticsTab";
import { PartnerActivityBadge } from "@/app/components/PartnerActivityBadge";
import { PartnerPICLabel } from "@/app/components/PartnerPICLabel";
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";
import { useFeedback } from "@/app/components/feedback/FeedbackContext";
import { AnimatedListItem } from "@/app/components/motion/primitives";

type TableMode =
  | "PARTNER_TYPES"
  | "ACTIVE_PARTNERS"
  | "INACTIVE_PARTNERS"
  | "TRASH_PARTNERS"
  | "ANALYTICS";

const PAGE_SIZE = 20;

const EMPTY_PARTNER_FORM: PartnerFormState = {
  partnerTypeId: "",
  code: "",
  name: "",
  phone: "",
  email: "",
  province: "",
  city: "",
  district: "",
  subDistrict: "",
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

  const { confirm, withLoading } = useFeedback();
  const [tableMode, setTableMode] = useState<TableMode>("PARTNER_TYPES");
  const [mitraPage, setMitraPage] = useState(1);

  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [typeSearch, setTypeSearch] = useState("");
  const [selectedPartnerTypeIds, setSelectedPartnerTypeIds] = useState<number[]>([]);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");
  const hasMoved = useRef(false);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      hasMoved.current = false;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleToggleSelectRow = useCallback((id: number) => {
    setSelectedPartnerIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  }, []);

  const handleRowMouseDown = (id: number, currentlySelected: boolean) => {
    setIsDragging(true);
    hasMoved.current = false;
    const mode = currentlySelected ? "deselect" : "select";
    setDragMode(mode);

    setSelectedPartnerIds((prev) => {
      if (mode === "select" && !prev.includes(id)) return [...prev, id];
      if (mode === "deselect" && prev.includes(id)) {
        return prev.filter((selectedId) => selectedId !== id);
      }
      return prev;
    });
  };

  const handleRowMouseEnter = (id: number) => {
    if (!isDragging) return;

    if (hasMoved.current) {
      setSelectedPartnerIds((prev) => {
        if (dragMode === "select" && !prev.includes(id)) return [...prev, id];
        if (dragMode === "deselect" && prev.includes(id)) {
          return prev.filter((selectedId) => selectedId !== id);
        }
        return prev;
      });
    }
    hasMoved.current = true;
  };

  const [page, setPage] = useState(1);

  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(
    null,
  );
  const [partnerForm, setPartnerForm] =
    useState<PartnerFormState>(EMPTY_PARTNER_FORM);
  const [partnerFormError, setPartnerFormError] = useState("");

  const partnersParams = useMemo(
    () => ({
      search: appliedSearch,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [appliedSearch, page],
  );

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<PartnerTypeItem | null>(null);

  const {
    data: partnerTypesData,
    isLoading: loadingMaster,
    error: partnerTypesError,
  } = usePartnerTypesQuery();
  const partnerTypes: PartnerTypeItem[] = partnerTypesData?.items || [];

  const {
    data: partnersData,
    isLoading: loading,
    error: partnersError,
  } = usePartnersQuery(partnersParams);
  const partners: PartnerItem[] = partnersData?.items || [];

  const {
    data: trashPartnersData,
    isLoading: loadingTrash,
  } = usePartnersQuery({ trash: true, search: appliedSearch });
  const trashPartners: PartnerItem[] = trashPartnersData?.items || [];

  const loadError = partnerTypesError || partnersError;
  const effectivePageError = pageError || (loadError ? getErrorMessage(loadError) : "");

  const createPartnerMutation = useCreatePartner();
  const updatePartnerMutation = useUpdatePartner();
  const deactivatePartnerMutation = useDeactivatePartner();
  const restorePartnerMutation = useRestorePartner();
  const permanentDeletePartnerMutation = usePermanentDeletePartner();

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

  const filteredTrashPartners = useMemo(() => {
    return trashPartners.filter((partner) =>
      typeFilter === "ALL" ? true : partner.partner_type?.code === typeFilter,
    );
  }, [trashPartners, typeFilter]);

  const visiblePartners = useMemo(() => {
    if (tableMode === "ACTIVE_PARTNERS") return activePartners;
    if (tableMode === "INACTIVE_PARTNERS") return inactivePartners;
    if (tableMode === "TRASH_PARTNERS") return filteredTrashPartners;
    return activePartners;
  }, [activePartners, inactivePartners, filteredTrashPartners, tableMode]);

  useEffect(() => { setMitraPage(1); }, [appliedSearch, tableMode, typeFilter]);

  const [mitraPageSize, setMitraPageSize] = useState(10);
  const mitraTotalItems = visiblePartners.length;
  const effectiveMitraPageSize = mitraPageSize === 0 ? Math.max(mitraTotalItems, 1) : mitraPageSize;
  const mitraTotalPages = mitraPageSize === 0 ? 1 : Math.max(1, Math.ceil(mitraTotalItems / mitraPageSize));
  const paginatedMitra = useMemo(() => {
    const start = (mitraPage - 1) * effectiveMitraPageSize;
    return visiblePartners.slice(start, start + effectiveMitraPageSize);
  }, [visiblePartners, mitraPage, effectiveMitraPageSize]);

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

  const openCreateTypeModal = () => {
    setEditingType(null);
    setShowTypeModal(true);
  };

  const openEditTypeModal = (typeItem: PartnerTypeItem) => {
    setEditingType(typeItem);
    setShowTypeModal(true);
  };

  const handleSoftDeletePartner = async (partner: PartnerItem) => {
    const isConfirmed = await confirm({
      title: "Pindahkan ke Tempat Sampah",
      message: `Apakah Anda yakin ingin memindahkan mitra "${partner.name}" ke Tempat Sampah? Data masih dapat dipulihkan kembali dari Tempat Sampah.`,
      confirmLabel: "Pindahkan ke Sampah",
      cancelLabel: "Batal",
      danger: true,
    });
    if (!isConfirmed) return;

    try {
      await withLoading(
        () => deactivatePartnerMutation.mutateAsync(partner.id),
        { label: "Memindahkan mitra ke Tempat Sampah..." },
      );
      setPageSuccess(`Mitra "${partner.name}" berhasil dipindahkan ke Tempat Sampah.`);
    } catch (err: any) {
      setPageError(getErrorMessage(err));
    }
  };

  const handleRestorePartnerAction = async (partner: PartnerItem) => {
    const isConfirmed = await confirm({
      title: "Pulihkan Data Mitra",
      message: `Apakah Anda yakin ingin memulihkan mitra "${partner.name}" kembali ke daftar mitra aktif?`,
      confirmLabel: "Pulihkan Mitra",
      cancelLabel: "Batal",
    });
    if (!isConfirmed) return;

    try {
      await withLoading(
        () => restorePartnerMutation.mutateAsync(partner.id),
        { label: "Memulihkan mitra..." },
      );
      setPageSuccess(`Mitra "${partner.name}" berhasil dipulihkan kembali.`);
    } catch (err: any) {
      setPageError(getErrorMessage(err));
    }
  };

  const handlePermanentDeletePartnerAction = async (partner: PartnerItem) => {
    const isConfirmed = await confirm({
      title: "Hapus Permanen Mitra",
      message: `PERINGATAN: Apakah Anda yakin ingin MENGHAPUS PERMANEN mitra "${partner.name}"? Data yang dihapus permanen TIDAK DAPAT DIPULIHKAN LAGI.`,
      confirmLabel: "Hapus Permanen",
      cancelLabel: "Batal",
      danger: true,
    });
    if (!isConfirmed) return;

    try {
      await withLoading(
        () => permanentDeletePartnerMutation.mutateAsync(partner.id),
        { label: "Menghapus mitra secara permanen..." },
      );
      setPageSuccess(`Mitra "${partner.name}" berhasil dihapus secara permanen.`);
    } catch (err: any) {
      setPageError(getErrorMessage(err));
    }
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
      province: partner.province || "",
      city: partner.city || "",
      district: partner.district || "",
      subDistrict: partner.sub_district || "",
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
        await updatePartnerMutation.mutateAsync({
          id: editingPartner.id,
          payload: {
            name: partnerForm.name.trim(),
            phone: partnerForm.phone.trim() || undefined,
            email: partnerForm.email.trim() || undefined,
            province: partnerForm.province.trim() || undefined,
            city: partnerForm.city.trim() || undefined,
            district: partnerForm.district.trim() || undefined,
            sub_district: partnerForm.subDistrict.trim() || undefined,
            address: partnerForm.address.trim() || undefined,
            bank_account: partnerForm.bankAccount.trim() || undefined,
            status: partnerForm.status,
          },
        });

        setPageSuccess("Mitra berhasil diperbarui.");
      } else {
        await createPartnerMutation.mutateAsync({
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
    } catch (error) {
      setPartnerFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivatePartner = async (partner: PartnerItem) => {
    const ok = await confirm({
      title: "Nonaktifkan Mitra",
      message: `Nonaktifkan mitra ${partner.name}? Mitra ini tidak akan bisa dipakai untuk referral baru sampai diaktifkan kembali.`,
      confirmLabel: "Nonaktifkan",
      danger: true,
    });
    if (!ok) return;

    setSaving(true);
    setPageError("");
    setPageSuccess("");

    try {
      await withLoading(() => deactivatePartnerMutation.mutateAsync(partner.id), {
        label: "Menonaktifkan mitra...",
      });
      setPageSuccess("Mitra berhasil dinonaktifkan.");
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleRestorePartner = async (partner: PartnerItem) => {
    const ok = await confirm({
      title: "Pulihkan Mitra",
      message: `Pulihkan mitra ${partner.name} menjadi aktif kembali?`,
      confirmLabel: "Pulihkan",
    });
    if (!ok) return;

    setSaving(true);
    setPageError("");
    setPageSuccess("");

    try {
      await withLoading(
        () => updatePartnerMutation.mutateAsync({ id: partner.id, payload: { status: "ACTIVE" } }),
        { label: "Memulihkan mitra..." },
      );
      setPageSuccess("Mitra berhasil dipulihkan.");
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
    { key: "TRASH_PARTNERS", label: "Tempat Sampah" },
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
              Kelola mitra lihat jenis mitra, dan pantau analitik
              performa mitra.
            </p>
          </div>
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

      <QuickInfoCardGrid columns={3}>
        <QuickInfoCard
          label="Total Mitra"
          value={filteredPartners.length}
          description="Data mitra yang masuk pada filter aktif."
          tone="accent"
          silhouette="people"
        />
        <QuickInfoCard
          label="Mitra Aktif"
          value={activePartners.length}
          description="Mitra aktif yang bisa ditangani sales."
          tone="emerald"
        />
        <QuickInfoCard
          label="Mitra Nonaktif"
          value={inactivePartners.length}
          description="Mitra yang sedang nonaktif pada modul ini."
          tone="rose"
        />
      </QuickInfoCardGrid>

      <QuickInfoCardGrid columns={2}>
        <QuickInfoCard
          label="Jenis Mitra"
          value={partnerTypes.length}
          description="Referensi jenis mitra untuk onboarding."
          tone="violet"
          valueClassName="text-[2rem] md:text-[2.15rem]"
        />
        <QuickInfoCard
          label="Data Ditampilkan"
          value={
            tableMode === "PARTNER_TYPES"
              ? filteredPartnerTypes.length
              : tableMode === "ANALYTICS"
                ? partnerTypes.length + filteredPartners.length
                : visiblePartners.length
          }
          description="Sesuai tab dan filter yang sedang aktif."
          tone="sky"
          valueClassName="text-[2rem] md:text-[2.15rem]"
        />
      </QuickInfoCardGrid>

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
          <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Referensi & Pengelolaan Jenis Mitra
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Kelola jenis mitra, komisi dasar, dan deskripsi mitra.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openCreateTypeModal}
                className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Jenis Mitra
              </button>
            </div>
          </div>

          <div className="border-b border-gray-50 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={typeSearch}
                  onChange={(event) => setTypeSearch(event.target.value)}
                  placeholder="Cari jenis mitra..."
                  className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                />
              </div>
            </div>
          </div>

          <div className="relative w-full">
            <div className="flex flex-col">
              <div className="overflow-x-auto">
                <table data-table-pagination-manual="true" className="w-full min-w-[800px] text-left text-sm text-gray-600">
              <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={filteredPartnerTypes.length > 0 && selectedPartnerTypeIds.length === filteredPartnerTypes.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPartnerTypeIds(filteredPartnerTypes.map(pt => pt.id));
                        } else {
                          setSelectedPartnerTypeIds([]);
                        }
                      }}
                      className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                    />
                  </th>
                  <th className="px-4 py-4 font-bold">Kode</th>
                  <th className="px-4 py-4 font-bold">Jenis Mitra</th>
                  <th className="px-4 py-4 font-bold">Komisi Dasar</th>
                  <th className="px-4 py-4 font-bold">Deskripsi</th>
                  <th className="px-4 py-4 text-center font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loadingMaster ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      Memuat jenis mitra...
                    </td>
                  </tr>
                ) : filteredPartnerTypes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      Jenis mitra tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredPartnerTypes.map((item) => (
                    <tr key={item.id} className={`transition-colors hover:bg-gray-50 ${selectedPartnerTypeIds.includes(item.id) ? "bg-red-50/50" : ""}`}>
                      <td className="w-12 px-4 py-4 text-center align-top">
                        <input
                          type="checkbox"
                          checked={selectedPartnerTypeIds.includes(item.id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedPartnerTypeIds(prev =>
                              checked ? [...prev, item.id] : prev.filter(id => id !== item.id)
                            );
                          }}
                          className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                        />
                      </td>
                      <td className="px-4 py-4 align-top font-medium text-gray-900">
                        {item.code}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          Mode dasar {item.commission_mode}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top font-medium text-gray-900">
                        {formatFlatCommission(item)}
                      </td>
                      <td className="px-4 py-4 align-top max-w-[200px]">
                        <p className="truncate whitespace-normal text-xs leading-relaxed text-gray-600">
                          {item.description || "Belum ada deskripsi."}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center align-top">
                        <RowActionGroup>
                          <ViewActionButton
                            href={`/menu/mitra-sales/jenis-mitra/${item.id}`}
                            title="Detail"
                          />
                          <EditActionButton
                            onClick={() => openEditTypeModal(item)}
                            title="Edit Jenis Mitra"
                          />
                        </RowActionGroup>
                      </td>
                    </tr>
                  ))
                )}
                  </tbody>
                </table>
          <TablePaginationFooter
            currentPage={mitraPage}
            totalItems={mitraTotalItems}
            rowsPerPage={mitraPageSize === 0 ? "all" : mitraPageSize}
            totalPages={mitraTotalPages}
            onPageChange={setMitraPage}
            onRowsPerPageChange={(nextPageSize) => {
              setMitraPageSize(nextPageSize === "all" ? 0 : nextPageSize);
              setMitraPage(1);
            }}
          />

          {false && mitraTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="text-xs font-medium text-gray-500">
                  Menampilkan <span className="font-bold text-gray-900">{mitraTotalItems === 0 ? 0 : (mitraPage - 1) * mitraPageSize + 1}</span> hingga{" "}
                  <span className="font-bold text-gray-900">{Math.min(mitraPage * mitraPageSize, mitraTotalItems)}</span> dari{" "}
                  <span className="font-bold text-gray-900">{mitraTotalItems}</span> data
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                  <select
                    value={mitraPageSize}
                    onChange={(e) => {
                      setMitraPageSize(Number(e.target.value));
                      setMitraPage(1);
                    }}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-[#C92C1E] focus:outline-none"
                  >
                    {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMitraPage((p) => Math.max(1, p - 1))}
                  disabled={mitraPage === 1}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <span className="text-xs font-bold text-gray-700">Halaman {mitraPage} / {mitraTotalPages}</span>
                <button
                  onClick={() => setMitraPage((p) => Math.min(mitraTotalPages, p + 1))}
                  disabled={mitraPage === mitraTotalPages}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
              </div>
            </div>
          </div>
        </div>
      ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
          <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {tableMode === "ACTIVE_PARTNERS"
                    ? "Daftar Mitra Aktif"
                    : tableMode === "INACTIVE_PARTNERS"
                    ? "Daftar Mitra Non Aktif"
                    : "Tempat Sampah Data Mitra"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {tableMode === "TRASH_PARTNERS"
                    ? "Data mitra di tempat sampah akan otomatis dihapus permanen setelah 30 hari."
                    : "Data mitra yang dikelola dari halaman Mitra Sales."}
                </p>
              </div>
              {tableMode !== "TRASH_PARTNERS" && (
                <div className="flex w-full flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={openCreatePartnerModal}
                    disabled={partnerTypes.length === 0 || loadingMaster}
                    className="flex items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Mitra
                  </button>
                </div>
              )}
            </div>

            <div className="border-b border-gray-50 px-6 py-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex flex-col gap-1.5 w-full md:w-auto">
                  <span className="text-xs font-semibold text-black">Jenis Mitra</span>
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#C92C1E] focus:outline-none focus:ring-1 focus:ring-[#C92C1E] h-9"
                  >
                    <option value="ALL">Semua Jenis</option>
                    {partnerTypes.map((type) => (
                      <option key={type.id} value={type.code}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-50 px-6 py-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <form onSubmit={handleSearch} className="relative flex-1 flex gap-3">
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      placeholder="Cari nama, PIC, atau email..."
                      className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#C92C1E] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 shrink-0"
                  >
                    Cari
                  </button>
                </form>
              </div>
            </div>

          <div className="relative w-full">
            <div className="flex flex-col">
              <div className="overflow-x-auto">
                <table data-table-pagination-manual="true" className="w-full min-w-[920px] text-left text-sm text-gray-600">
              <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={
                        visiblePartners.length > 0 &&
                        selectedPartnerIds.length === visiblePartners.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPartnerIds(visiblePartners.map(p => p.id));
                        } else {
                          setSelectedPartnerIds([]);
                        }
                      }}
                      className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                    />
                  </th>
                  <th className="px-4 py-4 font-bold">Mitra</th>
                  <th className="px-4 py-4 font-bold">PIC</th>
                  <th className="px-4 py-4 font-bold">Jenis Mitra</th>
                  <th className="px-4 py-4 font-bold">Kontak</th>
                  <th className="px-4 py-4 font-bold">Komisi Dasar</th>
                  <th className="px-4 py-4 font-bold">Status</th>
                  <th className="px-4 py-4 font-bold">Alamat</th>
                  <th className="px-4 py-4 text-center font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {(tableMode === "TRASH_PARTNERS" ? loadingTrash : loading) ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                      Memuat data mitra...
                    </td>
                  </tr>
                ) : paginatedMitra.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                      {tableMode === "TRASH_PARTNERS"
                        ? "Tidak ada data di tempat sampah."
                        : "Data mitra tidak ditemukan."}
                    </td>
                  </tr>
                ) : (
                  paginatedMitra.map((partner) => {
                    const isSelected = selectedPartnerIds.includes(partner.id);
                    return (
                      <tr
                        key={partner.id}
                        className={`transition-colors cursor-pointer select-none ${
                          isSelected
                            ? "bg-red-50/50 hover:bg-red-50/70"
                            : "hover:bg-gray-50"
                        }`}
                        onMouseDown={(e) => {
                          if ((e.target as HTMLElement).closest('button, a')) return;
                          if (e.button !== 0) return;
                          handleRowMouseDown(partner.id, isSelected);
                        }}
                        onMouseEnter={() => {
                          handleRowMouseEnter(partner.id);
                        }}
                      >
                        <td
                          className="w-12 px-4 py-4 text-center align-top cursor-pointer"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelectRow(partner.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E] pointer-events-none"
                          />
                        </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-1">
                          <p className="font-bold text-gray-900">{partner.name || "-"}</p>
                          <p className="text-xs text-gray-400">{partner.code || `ID #${partner.id}`}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <PartnerPICLabel partnerId={partner.id} />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-bold text-gray-900">{partner.partner_type?.name || "-"}</p>
                        <p className="mt-1 text-xs text-gray-400">{partner.partner_type?.code || "-"}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900">{partner.phone ? formatPhoneDisplay(partner.phone) : "-"}</p>
                        <p className="mt-1 text-xs text-gray-400">{partner.email || "-"}</p>
                      </td>
                      <td className="px-4 py-4 align-top font-medium text-gray-900">
                        {formatFlatCommission(partner.partner_type)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {tableMode === "TRASH_PARTNERS" ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-200">
                              Dihapus (Sampah)
                            </span>
                            {partner.deleted_at && (() => {
                              const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - new Date(partner.deleted_at).getTime()) / (1000 * 60 * 60 * 24)));
                              return (
                                <span className="text-[11px] font-semibold text-amber-600">
                                  ⏳ Hapus permanen dlm {daysLeft} hari
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <PartnerActivityBadge partnerId={partner.id} />
                        )}
                      </td>
                      <td className="px-4 py-4 align-top max-w-[200px]">
                        <p className="truncate whitespace-normal text-xs leading-relaxed text-gray-600">
                          {[partner.address, partner.sub_district, partner.district, partner.city, partner.province].filter(Boolean).join(", ") || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <RowActionGroup>
                          {tableMode === "TRASH_PARTNERS" ? (
                            <>
                              <RowActionButton
                                icon={RefreshCw}
                                tone="restore"
                                title="Pulihkan Data Mitra"
                                onClick={() => void handleRestorePartnerAction(partner)}
                                disabled={saving}
                              />
                              <RowActionButton
                                icon={Trash2}
                                tone="delete"
                                title="Hapus Permanen"
                                onClick={() => void handlePermanentDeletePartnerAction(partner)}
                                disabled={saving}
                              />
                            </>
                          ) : (
                            <>
                              <RowActionButton
                                icon={Eye}
                                tone="view"
                                title="Detail & PIC"
                                href={`/menu/mitra-sales/detail?id=${partner.id}`}
                              />
                              <RowActionButton
                                icon={UserRoundCog}
                                tone="view"
                                title="Lead Afiliasi"
                                href={`/menu/mitra-sales/detail?id=${partner.id}&tab=referral`}
                              />
                              <EditActionButton
                                onClick={() => openEditPartnerModal(partner)}
                              />
                              <RowActionButton
                                icon={Trash2}
                                tone="delete"
                                title="Pindahkan ke Tempat Sampah"
                                onClick={() => void handleSoftDeletePartner(partner)}
                                disabled={saving}
                              />
                            </>
                          )}
                        </RowActionGroup>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

          <TablePaginationFooter
            currentPage={mitraPage}
            totalItems={mitraTotalItems}
            rowsPerPage={mitraPageSize === 0 ? "all" : mitraPageSize}
            totalPages={mitraTotalPages}
            onPageChange={setMitraPage}
            onRowsPerPageChange={(nextPageSize) => {
              setMitraPageSize(nextPageSize === "all" ? 0 : nextPageSize);
              setMitraPage(1);
            }}
          />

          {false && mitraTotalPages > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-gray-50/50 p-4 sm:flex-row">
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-500">
                  Menampilkan {mitraTotalItems === 0 ? 0 : (mitraPage - 1) * mitraPageSize + 1}–{Math.min(mitraPage * mitraPageSize, mitraTotalItems)} dari {mitraTotalItems} data
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                  <select
                    value={mitraPageSize}
                    onChange={(e) => {
                      setMitraPageSize(Number(e.target.value));
                      setMitraPage(1);
                    }}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMitraPage((p) => Math.max(1, p - 1))}
                  disabled={mitraPage <= 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <span className="text-xs font-bold text-gray-700">Halaman {mitraPage} / {mitraTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setMitraPage((p) => Math.min(mitraTotalPages, p + 1))}
                  disabled={mitraPage >= mitraTotalPages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
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

      <PartnerTypeModal
        open={showTypeModal}
        editingType={editingType}
        onClose={() => setShowTypeModal(false)}
      />
    </div>
  );
}
