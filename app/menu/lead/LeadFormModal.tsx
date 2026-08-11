"use client";

import React, { useEffect, useState } from "react";
import OwnerSearchPicker from "@/app/components/OwnerSearchPicker";
import {
  createOwner,
  updateOwner,
  bulkCreateOwnerOutlets,
  fetchOwnerOutlets,
  getSalesList,
  getSupervisorList,
  assignSalesToLead,
  assignSupervisorToLead,
  getLead,
  createLead,
  isAdminRole,
  isSupervisorRole,
  type BackendOwner,
  type CreateLeadRequest,
  type UserResponse,
} from "@/app/lib/api";

type OwnerOutletItem = {
  namaOutlet: string;
  noHpOutlet: string;
};

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
  outlets?: OwnerOutletItem[];
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

const getToday = () => new Date().toISOString().split("T")[0];

const getCurrentMonthName = () => {
  const bulanIndonesia = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return bulanIndonesia[new Date().getMonth()];
};

const getCurrentYear = () => String(new Date().getFullYear());

const SUMBER_NASABAH_OPTIONS = [
  { value: "Instagram", label: "Instagram", tone: "pink" },
  { value: "Facebook", label: "Facebook", tone: "blue" },
  { value: "Tiktok", label: "Tiktok", tone: "dark" },
  { value: "Playstore", label: "Playstore", tone: "red" },
  { value: "MANUAL", label: "Manual Input", tone: "green" },
];

const getSumberTagClass = (tone?: string) => {
  if (tone === "pink") return "border-pink-200 bg-pink-50 text-pink-700";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-700";
  if (tone === "dark") return "border-gray-300 bg-gray-900 text-white";
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-700";

  return "border-red-200 bg-red-50 text-[#C92C1E]";
};

const PHONE_COUNTRY_OPTIONS = [
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dialCode: "+62", placeholder: "812-3456-7890" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", dialCode: "+60", placeholder: "12-345-6789" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", dialCode: "+65", placeholder: "8123-4567" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", dialCode: "+66", placeholder: "81-234-5678" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", dialCode: "+63", placeholder: "912-345-6789" },
];

const removeLeadingTrunkZero = (value: string) => {
  return value.replace(/^0+/, "");
};

const isValidInternationalPhone = (value?: string) => {
  const phone = value?.trim() || "";
  return /^\+\d{1,3}\d{6,14}$/.test(phone);
};

const REQUIRED_PROFILE_FIELDS = [
  { key: "kodeOwner", label: "Kode Owner" },
  { key: "namaOwner", label: "Nama Owner" },
  { key: "projectBrand", label: "Nama Brand" },
  { key: "noHpOwner", label: "Nomor Telepon Owner" },
] as const;

type ProfileFieldKey = (typeof REQUIRED_PROFILE_FIELDS)[number]["key"];
type ProfileValidationErrors = Partial<Record<ProfileFieldKey | "outlet" | "pic", string>>;

const getProfileFieldErrors = (item: Partial<NasabahItem>) => {
  const errors: ProfileValidationErrors = {};

  REQUIRED_PROFILE_FIELDS.forEach(({ key, label }) => {
    const value = item[key];

    if (typeof value !== "string" || value.trim() === "") {
      errors[key] = `${label} wajib diisi.`;
    }
  });

  if (!errors.noHpOwner && !isValidInternationalPhone(item.noHpOwner)) {
    errors.noHpOwner = "Nomor Telepon Owner belum valid. Sertakan kode negara (contoh +62812...).";
  }

  return errors;
};

function FieldIcon({ type }: { type: "code" | "user" | "brand" | "outlet" | "phone" | "sales" }) {
  const className = "h-4 w-4 text-[#C92C1E]";

  if (type === "code") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h6m-6 5h10M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
      </svg>
    );
  }

  if (type === "user") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
      </svg>
    );
  }

  if (type === "brand") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 21V8.25A2.25 2.25 0 016.75 6h10.5a2.25 2.25 0 012.25 2.25V21M8.25 6V3.75h7.5V6M8.25 11.25h.008M12 11.25h.008M15.75 11.25h.008M8.25 15h.008M12 15h.008M15.75 15h.008" />
      </svg>
    );
  }

  if (type === "outlet") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 4l7.5 6.5M6.75 9.5V20.25h10.5V9.5M9.75 20.25v-6h4.5v6" />
      </svg>
    );
  }

  if (type === "phone") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372a1.125 1.125 0 00-.852-1.091l-4.423-1.106a1.125 1.125 0 00-1.173.417l-.97 1.293a1.125 1.125 0 01-1.21.38 12.035 12.035 0 01-7.143-7.143 1.125 1.125 0 01.38-1.21l1.293-.97a1.125 1.125 0 00.417-1.173L6.963 3.102A1.125 1.125 0 005.872 2.25H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM3.75 21a8.25 8.25 0 0116.5 0M18.75 8.25h2.25M19.875 7.125v2.25" />
    </svg>
  );
}

export default function LeadFormModal({ isOpen, onClose, onSuccess, initialEditId = null }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void; initialEditId?: number | null }) {
  const [editId, setEditId] = useState<number | null>(null);

  // Owner Selection Mode: "EXISTING" (Search/Pop-up) or "NEW"
  const [ownerMode, setOwnerMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [selectedOwner, setSelectedOwner] = useState<BackendOwner | null>(null);

  // Kepemilikan & Assignment (Sprint 5)
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | null>(null);
  const [selectedSalesId, setSelectedSalesId] = useState<number | null>(null);

  const [formInput, setFormInput] = useState<Partial<NasabahItem>>({
    kodeOwner: "",
    namaOwner: "",
    projectBrand: "",
    outlet: "",
    noHpOwner: "",
    noHpOutlet: "",
    pic: "No PIC",
    totalFu: 0,
    tanggalFu: getToday(),
    tahun: getCurrentYear(),
    bulan: getCurrentMonthName(),
    tanggalDibagikan: getToday(),
    statusAkun: "Akun Baru",
    kodeBaris: "",
    createDateProject: getToday(),
    expiredDate: "",
    totalTransaksi: 0,
    scor: 0,
    callStatus: "PENDING",
    chatStatus: "PENDING",
    validitas: "VALID",
    remarks: "0",
    sumberNasabah: "Instagram",
    finalisasiClosing: "",
    skemaId: "",
    nominal: 0,
    noted: "",
  });

  const [validationErrors, setValidationErrors] = useState<ProfileValidationErrors>({});
  const [outletRows, setOutletRows] = useState<OwnerOutletItem[]>([]);
  const [salesList, setSalesList] = useState<UserResponse[]>([]);
  const [supervisorList, setSupervisorList] = useState<UserResponse[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loggedInRole] = useState(() => {
    if (typeof window === "undefined") return "SALES";
    return localStorage.getItem("piposmart_user_role") || "SALES";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userRole = localStorage.getItem("piposmart_user_role") || "SALES";
    const userIsAdmin = isAdminRole(userRole);
    const userIsSupervisor = isSupervisorRole(userRole);
    const timer = window.setTimeout(() => {
      if (userIsAdmin) {
        getSupervisorList().then(setSupervisorList).catch(console.error);
        getSalesList().then(setSalesList).catch(console.error);
      } else if (userIsSupervisor) {
        getSalesList().then(setSalesList).catch(console.error);
        setSupervisorList([]);
      } else {
        setSupervisorList([]);
        setSalesList([]);
      }

      const idParam = initialEditId ? String(initialEditId) : null;
      if (!idParam) return;

      const targetNo = Number(idParam);
      setEditId(targetNo);

      getLead(targetNo)
        .then((leadData) => {
          if (leadData?.owner && leadData.owner.id) {
            const ownerObj = leadData.owner as unknown as BackendOwner;
            setSelectedOwner(ownerObj);
            setOwnerMode("EXISTING");
            setFormInput((prev) => ({
              ...prev,
              ownerId: leadData.owner?.id,
              kodeOwner: leadData.owner?.code || "",
              namaOwner: leadData.owner?.name || "",
              projectBrand: leadData.owner?.brand_name || "",
              noHpOwner: leadData.owner?.phone || "",
            }));

            fetchOwnerOutlets(leadData.owner.id)
              .then((outletsData) => {
                if (outletsData && outletsData.length > 0) {
                  setOutletRows(
                    outletsData.map((o) => ({
                      namaOutlet: o.name,
                      noHpOutlet: o.phone || "",
                    })),
                  );
                }
              })
              .catch(console.error);
          }
        })
        .catch(console.error);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialEditId]);

  // When an existing Owner is selected via OwnerSearchPicker pop-up
  const handleSelectExistingOwner = (owner: BackendOwner | null) => {
    setSelectedOwner(owner);

    if (owner) {
      setFormInput((prev) => ({
        ...prev,
        ownerId: owner.id,
        kodeOwner: owner.code || "",
        namaOwner: owner.name || "",
        projectBrand: owner.brand_name || "",
        noHpOwner: owner.phone || "",
      }));

      fetchOwnerOutlets(owner.id)
        .then((outletsData) => {
          if (outletsData && outletsData.length > 0) {
            setOutletRows(
              outletsData.map((o) => ({
                namaOutlet: o.name,
                noHpOutlet: o.phone || "",
              })),
            );
          } else {
            setOutletRows([{ namaOutlet: "", noHpOutlet: "" }]);
          }
        })
        .catch(() => setOutletRows([{ namaOutlet: "", noHpOutlet: "" }]));
    } else {
      setFormInput((prev) => ({
        ...prev,
        ownerId: undefined,
        kodeOwner: "",
        namaOwner: "",
        projectBrand: "",
        noHpOwner: "",
      }));
      setOutletRows([{ namaOutlet: "", noHpOutlet: "" }]);
    }
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    setFormInput((prev) => ({
      ...prev,
      [name]: value,
    }));

    setValidationErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const updateFormField = <K extends keyof NasabahItem>(
    field: K,
    value: NasabahItem[K],
  ) => {
    setFormInput((prev) => ({
      ...prev,
      [field]: value,
    }));

    setValidationErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const handleAddOutletRow = () => {
    setOutletRows((prev) => [...prev, { namaOutlet: "", noHpOutlet: "" }]);
    setValidationErrors((prev) => ({ ...prev, outlet: "" }));
  };

  const handleUpdateOutletRow = (
    index: number,
    field: keyof OwnerOutletItem,
    value: string,
  ) => {
    setOutletRows((prev) => {
      const nextRows = [...prev];
      nextRows[index] = { ...nextRows[index], [field]: value };
      return nextRows;
    });
  };

  const handleRemoveOutletRow = (index: number) => {
    setOutletRows((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    const errors = getProfileFieldErrors(formInput);

    if (Object.values(errors).some(Boolean)) {
      setValidationErrors(errors);
      setIsSaving(false);
      return;
    }

    setValidationErrors({});

    try {
      if (editId !== null) {
        // Edit existing lead
        let actualOwnerId = selectedOwner?.id || formInput.ownerId;

        if (!actualOwnerId) {
          const leadData = await getLead(editId);
          if (leadData?.owner?.id) actualOwnerId = leadData.owner.id;
        }

        if (actualOwnerId) {
          await updateOwner(actualOwnerId, {
            code: formInput.kodeOwner || "",
            name: formInput.namaOwner || "",
            brand_name: formInput.projectBrand || "",
            phone: formInput.noHpOwner || "",
          });
        }

        // Apply Assignment Sprint 5
        if (selectedSupervisorId) {
          await assignSupervisorToLead(editId, selectedSupervisorId).catch(console.error);
        }
        if (selectedSalesId) {
          await assignSalesToLead(editId, selectedSalesId).catch(console.error);
        }

        alert("Data profil Lead dan kepemilikan assignment berhasil diperbarui!");
      } else {
        // Create new lead Sprint 5
        let finalOwnerId = selectedOwner?.id;

        if (ownerMode === "NEW" || !finalOwnerId) {
          // Create Owner first
          const createdOwner = await createOwner({
            code: formInput.kodeOwner || `OWN-${Date.now().toString().slice(-4)}`,
            name: formInput.namaOwner || "Owner Baru",
            brand_name: formInput.projectBrand || "Brand Baru",
            phone: formInput.noHpOwner || "+628120000000",
          });
          finalOwnerId = createdOwner.data.id;

          // Create Outlets
          if (finalOwnerId && outletRows.length > 0) {
            const validOutlets = outletRows.filter((o) => o.namaOutlet.trim());
            if (validOutlets.length > 0) {
              await bulkCreateOwnerOutlets(
                finalOwnerId,
                validOutlets.map((o, idx) => ({
                  code: `${formInput.kodeOwner || "OUT"}-${idx + 1}`,
                  name: o.namaOutlet,
                  phone: o.noHpOutlet,
                })),
              ).catch(console.error);
            }
          }
        }

        // Create Lead Sprint 5 Endpoint
        const leadPayload: CreateLeadRequest = {
          owner_id: finalOwnerId,
          source_type: formInput.sumberNasabah || "MANUAL",
          source_reference: "Tambah Data Manual",
          supervisor_id: selectedSupervisorId || undefined,
          sales_id: selectedSalesId || undefined,
          initial_score: formInput.scor || 0,
        };

        const createdLead = await createLead(leadPayload);

        // Execute Sprint 5 Assignment if explicit Supervisor or Sales is chosen
        if (createdLead?.id) {
          if (selectedSupervisorId) {
            await assignSupervisorToLead(createdLead.id, selectedSupervisorId).catch(console.error);
          }
          if (selectedSalesId) {
            await assignSalesToLead(createdLead.id, selectedSalesId).catch(console.error);
          }
        }

        alert("Data Prospek (Lead) dan Kepemilikan Assignment (Sprint 5) berhasil ditambahkan!");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Gagal menyimpan lead:", err);
      alert(`Gagal menyimpan data lead: ${err instanceof Error ? err.message : "Terjadi kesalahan."}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="app-modal-panel relative w-full max-w-lg rounded-2xl shadow-xl">
        <div className="app-modal-header p-6">
          <div className="mx-auto font-sans text-[#1C1C1E]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-black text-gray-900">
            <svg
              className="h-5 w-5 text-[#C92C1E]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a8.97 8.97 0 003.75.78M18 18.72a8.97 8.97 0 01-3.75.78M18 18.72v-3.47m-3.75 4.25a8.97 8.97 0 01-3.75-.78m3.75.78v-3.47m-3.75 2.69a8.97 8.97 0 01-3.75.78M10.5 18.72v-3.47m0 3.47a8.97 8.97 0 003.75.78M6.75 19.5A8.97 8.97 0 013 18.72v-3.47m3.75 4.25v-3.47M3 15.25c0-1.24 2.239-2.25 5-2.25s5 1.01 5 2.25m-10 0c0 1.24 2.239 2.25 5 2.25s5-1.01 5-2.25m2.25 0c0-1.24 2.239-2.25 5-2.25s5 1.01 5 2.25m-10 0c0 1.24 2.239-2.25 5-2.25s5-1.01 5-2.25M8 10.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm8 0a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
              />
            </svg>
            {editId !== null ? "Edit Lead & Assignment" : "Tambah Lead & Assignment"}
                </h1>
                <p className="mt-0.5 text-xs font-medium text-gray-500">
                  Form penambahan Lead & pembagian kepemilikan (Sprint 5 Lead Assignment).
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="app-modal-close inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-black shadow-sm transition hover:border-[#C92C1E]/30 hover:text-[#C92C1E]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Batal</span>
              </button>
            </div>
          </div>
        </div>

        <div className="app-modal-body p-6">
          <form
            onSubmit={handleSave}
            className="space-y-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"
          >
        {/* SECTION 1: SELEKSI OWNER (Sprint 5 Owner Picker) */}
        <div className="space-y-4 rounded-2xl border border-red-100 bg-red-50/30 p-4 md:p-5">
          <div className="flex items-center justify-between border-b border-red-100 pb-3">
            <div>
              <span className="text-xs font-black uppercase text-[#C92C1E]">
                1. Data Owner Nasabah (Sprint 5)
              </span>
              <p className="text-[11px] font-medium text-gray-500">
                Pilih Owner dari data tersimpan atau buat Profil Owner baru.
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          {editId === null ? (
            <div className="flex rounded-2xl border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setOwnerMode("EXISTING")}
                className={`flex-1 rounded-xl py-2 text-xs font-black transition ${
                  ownerMode === "EXISTING"
                    ? "bg-[#C92C1E] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Pilih Owner dari Data
              </button>
              <button
                type="button"
                onClick={() => {
                  setOwnerMode("NEW");
                  setSelectedOwner(null);
                }}
                className={`flex-1 rounded-xl py-2 text-xs font-black transition ${
                  ownerMode === "NEW"
                    ? "bg-[#C92C1E] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                + Buat Owner Baru
              </button>
            </div>
          ) : null}

          {/* Pop-up Owner Picker */}
          {ownerMode === "EXISTING" ? (
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
                Pencarian Data Owner *
              </label>
              <OwnerSearchPicker
                value={selectedOwner}
                onChange={handleSelectExistingOwner}
              />
            </div>
          ) : null}

          {/* Form Fields Owner */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">
                Kode Owner *
              </label>
              <input
                type="text"
                value={formInput.kodeOwner || ""}
                onChange={handleInputChange}
                name="kodeOwner"
                placeholder="Contoh: OWN-001"
                className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-[#C92C1E] focus:bg-white"
              />
              {validationErrors.kodeOwner ? (
                <p className="mt-1 text-[10px] font-bold text-red-600">
                  {validationErrors.kodeOwner}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">
                Nama Owner *
              </label>
              <input
                type="text"
                value={formInput.namaOwner || ""}
                onChange={handleInputChange}
                name="namaOwner"
                placeholder="Contoh: Amanda Artha"
                className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-[#C92C1E] focus:bg-white"
              />
              {validationErrors.namaOwner ? (
                <p className="mt-1 text-[10px] font-bold text-red-600">
                  {validationErrors.namaOwner}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">
                Nama Brand / Usaha *
              </label>
              <input
                type="text"
                value={formInput.projectBrand || ""}
                onChange={handleInputChange}
                name="projectBrand"
                placeholder="Contoh: Azzahra Laundry"
                className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-[#C92C1E] focus:bg-white"
              />
              {validationErrors.projectBrand ? (
                <p className="mt-1 text-[10px] font-bold text-red-600">
                  {validationErrors.projectBrand}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-black uppercase text-gray-500">
                Nomor Telepon Owner (Format +62) *
              </label>
              <input
                type="text"
                value={formInput.noHpOwner || ""}
                onChange={(e) => updateFormField("noHpOwner", e.target.value)}
                placeholder="+6281234567890"
                className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-[#C92C1E] focus:bg-white"
              />
              {validationErrors.noHpOwner ? (
                <p className="mt-1 text-[10px] font-bold text-red-600">
                  {validationErrors.noHpOwner}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* SECTION 2: KEPEMILIKAN & ASSIGNMENT (Sprint 5 Assignment Flow) */}
        <div className="space-y-4 rounded-2xl border border-amber-100 bg-amber-50/40 p-4 md:p-5">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <div>
              <span className="text-xs font-black uppercase text-amber-700">
                2. Kepemilikan & Assignment (Sprint 5)
              </span>
              <p className="text-[11px] font-medium text-gray-500">
                Tentukan pembagian Lead ke Supervisor atau Sales.
              </p>
            </div>

            <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[10px] font-black text-amber-800">
              Role: {loggedInRole}
            </span>
          </div>

          <div className="space-y-3">
            {/* Supervisor Picker (for Admin & Supervisor) */}
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
                Kepemilikan Supervisor
              </label>
              <select
                value={selectedSupervisorId || ""}
                onChange={(e) =>
                  setSelectedSupervisorId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-[#C92C1E]"
              >
                <option value="">-- Pilih Supervisor (Opsional) --</option>
                {supervisorList.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name} ({sup.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Sales PIC Picker (for Admin, Supervisor & Sales) */}
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
                Kepemilikan Sales / PIC Terkait
              </label>
              <select
                value={selectedSalesId || ""}
                onChange={(e) =>
                  setSelectedSalesId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-[#C92C1E]"
              >
                <option value="">-- Pilih Sales (Opsional) --</option>
                {salesList.map((sales) => (
                  <option key={sales.id} value={sales.id}>
                    {sales.name} ({sales.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
                Sumber Prospek (Source)
              </label>
              <select
                value={formInput.sumberNasabah || "Instagram"}
                onChange={(e) => updateFormField("sumberNasabah", e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-[#C92C1E]"
              >
                {SUMBER_NASABAH_OPTIONS.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 px-5 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-2xl bg-[#C92C1E] px-7 py-3 text-xs font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isSaving
              ? "Memproses..."
              : editId !== null
              ? "Simpan Perubahan Lead"
              : "Simpan Lead & Assignment (Sprint 5)"}
          </button>
        </div>
      </form>
        </div>
      </div>
    </div>
  );
}
