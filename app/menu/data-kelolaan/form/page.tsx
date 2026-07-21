"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIST_PIC } from "../dummy/page";

interface NasabahItem {
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

const LIST_SKOR = [
  { value: "0", label: "Tidak Potensial (0)", scor: 0 },
  { value: "1", label: "Kemungkinan Potensial (1)", scor: 1 },
  { value: "2", label: "Potensial (2)", scor: 2 },
  { value: "3", label: "Langganan (3)", scor: 3 },
];

const SUMBER_NASABAH_OPTIONS = [
  { value: "Instagram", label: "Instagram", tone: "pink" },
  { value: "Facebook", label: "Facebook", tone: "blue" },
  { value: "Tiktok", label: "Tiktok", tone: "dark" },
  { value: "Mitra", label: "Mitra", tone: "green" },
  { value: "Playstore", label: "Playstore", tone: "red" },
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
  { code: "VN", name: "Vietnam", flag: "🇻🇳", dialCode: "+84", placeholder: "91-234-5678" },
  { code: "BN", name: "Brunei", flag: "🇧🇳", dialCode: "+673", placeholder: "712-3456" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭", dialCode: "+855", placeholder: "12-345-678" },
  { code: "LA", name: "Laos", flag: "🇱🇦", dialCode: "+856", placeholder: "20-1234-5678" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲", dialCode: "+95", placeholder: "9-123-456789" },
  { code: "TL", name: "Timor-Leste", flag: "🇹🇱", dialCode: "+670", placeholder: "7721-2345" },

  { code: "US", name: "United States", flag: "🇺🇸", dialCode: "+1", placeholder: "123-456-7890" },
  { code: "CA", name: "Canada", flag: "🇨🇦", dialCode: "+1", placeholder: "123-456-7890" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", dialCode: "+52", placeholder: "55-1234-5678" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", dialCode: "+55", placeholder: "11-91234-5678" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dialCode: "+54", placeholder: "9-11-1234-5678" },
  { code: "CL", name: "Chile", flag: "🇨🇱", dialCode: "+56", placeholder: "9-1234-5678" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", dialCode: "+57", placeholder: "300-123-4567" },

  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44", placeholder: "7700-900123" },
  { code: "FR", name: "France", flag: "🇫🇷", dialCode: "+33", placeholder: "6-12-34-56-78" },
  { code: "DE", name: "Germany", flag: "🇩🇪", dialCode: "+49", placeholder: "1512-3456789" },
  { code: "IT", name: "Italy", flag: "🇮🇹", dialCode: "+39", placeholder: "312-345-6789" },
  { code: "ES", name: "Spain", flag: "🇪🇸", dialCode: "+34", placeholder: "612-345-678" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", dialCode: "+31", placeholder: "6-12345678" },
  { code: "BE", name: "Belgium", flag: "🇧🇪", dialCode: "+32", placeholder: "470-12-34-56" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", dialCode: "+41", placeholder: "78-123-45-67" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", dialCode: "+46", placeholder: "70-123-45-67" },
  { code: "NO", name: "Norway", flag: "🇳🇴", dialCode: "+47", placeholder: "412-34-567" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", dialCode: "+45", placeholder: "20-12-34-56" },
  { code: "FI", name: "Finland", flag: "🇫🇮", dialCode: "+358", placeholder: "40-123-4567" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", dialCode: "+353", placeholder: "85-123-4567" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dialCode: "+351", placeholder: "912-345-678" },
  { code: "PL", name: "Poland", flag: "🇵🇱", dialCode: "+48", placeholder: "512-345-678" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", dialCode: "+90", placeholder: "532-123-4567" },
  { code: "RU", name: "Russia", flag: "🇷🇺", dialCode: "+7", placeholder: "912-345-6789" },

  { code: "CN", name: "China", flag: "🇨🇳", dialCode: "+86", placeholder: "138-0013-8000" },
  { code: "JP", name: "Japan", flag: "🇯🇵", dialCode: "+81", placeholder: "90-1234-5678" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", dialCode: "+82", placeholder: "10-1234-5678" },
  { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91", placeholder: "98765-43210" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", dialCode: "+92", placeholder: "300-1234567" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", dialCode: "+880", placeholder: "1712-345678" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", placeholder: "71-234-5678" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", dialCode: "+966", placeholder: "50-123-4567" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", dialCode: "+971", placeholder: "50-123-4567" },
  { code: "QA", name: "Qatar", flag: "🇶🇦", dialCode: "+974", placeholder: "3312-3456" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", dialCode: "+965", placeholder: "500-12345" },
  { code: "OM", name: "Oman", flag: "🇴🇲", dialCode: "+968", placeholder: "9212-3456" },

  { code: "AU", name: "Australia", flag: "🇦🇺", dialCode: "+61", placeholder: "412-345-678" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", dialCode: "+64", placeholder: "21-123-4567" },

  { code: "ZA", name: "South Africa", flag: "🇿🇦", dialCode: "+27", placeholder: "82-123-4567" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", dialCode: "+20", placeholder: "100-123-4567" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dialCode: "+234", placeholder: "803-123-4567" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", dialCode: "+254", placeholder: "712-345-678" },
  { code: "MA", name: "Morocco", flag: "🇲🇦", dialCode: "+212", placeholder: "612-345678" },
];

const getPhoneCountryByDialCode = (phone?: string) => {
  const value = phone?.trim() || "";

  return (
    PHONE_COUNTRY_OPTIONS.find((country) => value.startsWith(country.dialCode)) ||
    PHONE_COUNTRY_OPTIONS[0]
  );
};

const stripDialCode = (phone?: string, dialCode = "+62") => {
  const value = phone?.trim() || "";

  if (value.startsWith(dialCode)) {
    return removeLeadingTrunkZero(value.slice(dialCode.length).replace(/\D/g, ""));
  }

  return removeLeadingTrunkZero(value.replace(/\D/g, ""));
};

const removeLeadingTrunkZero = (value: string) => {
  return value.replace(/^0+/, "");
};

const buildInternationalPhone = (dialCode: string, value: string) => {
  const digitsOnly = removeLeadingTrunkZero(value.replace(/\D/g, "")).slice(0, 14);
  return digitsOnly ? `${dialCode}${digitsOnly}` : dialCode;
};

const getPhonePatternGroups = (placeholder: string) => {
  return placeholder.split("-").map((group) => group.replace(/\D/g, "").length);
};

const formatPhoneNumberByCountry = (value: string, placeholder: string) => {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 14);
  const groups = getPhonePatternGroups(placeholder);

  if (!digitsOnly) return "";

  const formattedGroups: string[] = [];
  let cursor = 0;

  groups.forEach((groupLength) => {
    if (cursor >= digitsOnly.length) return;

    const nextGroup = digitsOnly.slice(cursor, cursor + groupLength);

    if (nextGroup) {
      formattedGroups.push(nextGroup);
    }

    cursor += groupLength;
  });

  if (cursor < digitsOnly.length) {
    formattedGroups.push(digitsOnly.slice(cursor));
  }

  return formattedGroups.join("-");
};

const isValidInternationalPhone = (value?: string) => {
  const phone = value?.trim() || "";
  return /^\+\d{1,3}\d{6,14}$/.test(phone);
};

const REQUIRED_PROFILE_FIELDS = [
  { key: "kodeOwner", label: "Kode Owner" },
  { key: "namaOwner", label: "Nama Owner" },
  { key: "projectBrand", label: "Nama Brand" },
  { key: "outlet", label: "Nama Outlet" },
  { key: "noHpOwner", label: "Nomor Telepon Owner" },
  { key: "noHpOutlet", label: "Nomor Telepon Outlet" },
  { key: "pic", label: "PIC Sales" },
] as const;

type ProfileFieldKey = (typeof REQUIRED_PROFILE_FIELDS)[number]["key"];
type ProfileValidationErrors = Partial<Record<ProfileFieldKey, string>>;

const getProfileFieldErrors = (item: Partial<NasabahItem>) => {
  const errors: ProfileValidationErrors = {};

  REQUIRED_PROFILE_FIELDS.forEach(({ key, label }) => {
    const value = item[key];

    if (typeof value !== "string" || value.trim() === "") {
      errors[key] = `${label} wajib diisi.`;
    }
  });

  if (!errors.noHpOwner && !isValidInternationalPhone(item.noHpOwner)) {
    errors.noHpOwner = "Nomor Telepon Owner belum valid. Pilih negara lalu isi nomor telepon.";
  }

  if (!errors.noHpOutlet && !isValidInternationalPhone(item.noHpOutlet)) {
    errors.noHpOutlet = "Nomor Telepon Outlet belum valid. Pilih negara lalu isi nomor telepon.";
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


export default function FormInputDummyPage() {
  const router = useRouter();
  const [editId, setEditId] = useState<number | null>(null);

  const [formInput, setFormInput] = useState<Partial<NasabahItem>>({
    kodeOwner: "",
    namaOwner: "",
    projectBrand: "",
    outlet: "",
    noHpOwner: "",
    noHpOutlet: "",
    pic: "No PIC",

    // Default data agar struktur lama tetap aman
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");

    if (!idParam) return;

    const targetNo = Number(idParam);
    setEditId(targetNo);

    const cached = localStorage.getItem("piposmart_nasabah_data");
    if (!cached) return;

    try {
      const list: NasabahItem[] = JSON.parse(cached);
      const matchItem = list.find((item) => item.no === targetNo);

      if (matchItem) {
        setFormInput(matchItem);
      }
    } catch {
      setFormInput((prev) => prev);
    }
  }, []);

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


  const handleSaveData = (event: React.FormEvent) => {
    event.preventDefault();

    const errors = getProfileFieldErrors(formInput);

    if (Object.values(errors).some(Boolean)) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    const cached = localStorage.getItem("piposmart_nasabah_data");
    let currentList: NasabahItem[] = [];

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        currentList = Array.isArray(parsed) ? parsed : [];
      } catch {
        currentList = [];
      }
    }

    if (editId !== null) {
      currentList = currentList.map((item) =>
        item.no === editId
          ? {
              ...item,
              kodeOwner: formInput.kodeOwner || "",
              namaOwner: formInput.namaOwner || "",
              projectBrand: formInput.projectBrand || "",
              outlet: formInput.outlet || "",
              noHpOwner: formInput.noHpOwner || "",
              noHpOutlet: formInput.noHpOutlet || "",
              pic: formInput.pic || "Satria",
              sumberNasabah: formInput.sumberNasabah || "Instagram",
              remarks: formInput.remarks || "0",
              scor: Number(formInput.scor ?? 0),
              tanggalFu: getToday(),
              tahun: getCurrentYear(),
              bulan: getCurrentMonthName(),
              tanggalDibagikan: getToday(),
              createDateProject: getToday(),
            }
          : item,
      );

      alert("Data profil berhasil diperbarui.");
    } else {
      const nextNo =
        currentList.length > 0
          ? Math.max(...currentList.map((item) => Number(item.no) || 0)) + 1
          : 1;

      const itemBaru: NasabahItem = {
        totalFu: 0,
        tanggalFu: getToday(),
        tahun: getCurrentYear(),
        bulan: getCurrentMonthName(),
        no: nextNo,
        pic: formInput.pic || "Satria",
        tanggalDibagikan: getToday(),
        statusAkun: "Akun Baru",
        kodeBaris: "",
        kodeOwner: formInput.kodeOwner || "",
        namaOwner: formInput.namaOwner || "",
        projectBrand: formInput.projectBrand || "",
        outlet: formInput.outlet || "",
        noHpOwner: formInput.noHpOwner || "",
        noHpOutlet: formInput.noHpOutlet || "",
        createDateProject: getToday(),
        expiredDate: "",
        totalTransaksi: 0,
        scor: Number(formInput.scor ?? 0),
        callStatus: "PENDING",
        chatStatus: "PENDING",
        validitas: "VALID",
        remarks: formInput.remarks || "0",
        sumberNasabah: formInput.sumberNasabah || "Instagram",
        finalisasiClosing: "",
        skemaId: "",
        nominal: 0,
        noted: "",
      };

      currentList.push(itemBaru);
      alert("Data profil berhasil ditambahkan.");
    }

    localStorage.setItem("piposmart_nasabah_data", JSON.stringify(currentList));
    router.push("/menu/data-kelolaan");
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 font-sans text-[#1C1C1E]">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {editId !== null ? "Edit Profil Owner" : "Tambah Profil Owner"}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Lengkapi data utama owner agar mudah dikelola, dihubungi, dan difollow up oleh tim sales.
          </p>
        </div>

        <Link
          href="/menu/data-kelolaan"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-700 shadow-sm transition hover:border-[#C92C1E]/30 hover:bg-red-50 hover:text-[#C92C1E]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span>Kembali</span>
        </Link>
      </div>

      <form
        onSubmit={handleSaveData}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-xs"
      >
        <div className="space-y-3 rounded-xl border border-red-100 bg-red-50/30 p-4">
          <span className="block text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
            Data Profil Owner
          </span>

          <div className="grid grid-cols-1 gap-3">
            <FormInput
              label="Kode Owner *"
              icon="code"
              name="kodeOwner"
              value={formInput.kodeOwner || ""}
              onChange={handleInputChange}
              placeholder="Contoh: 18907"
              error={validationErrors.kodeOwner}
            />

            <FormInput
              label="Nama Owner *"
              icon="user"
              name="namaOwner"
              value={formInput.namaOwner || ""}
              onChange={handleInputChange}
              placeholder="Contoh: Amanda Artha"
              error={validationErrors.namaOwner}
            />

            <FormInput
              label="Nama Brand *"
              icon="brand"
              name="projectBrand"
              value={formInput.projectBrand || ""}
              onChange={handleInputChange}
              placeholder="Contoh: Azzahra Laundry"
              error={validationErrors.projectBrand}
            />

            <FormInput
              label="Nama Outlet *"
              icon="outlet"
              name="outlet"
              value={formInput.outlet || ""}
              onChange={handleInputChange}
              placeholder="Contoh: Azzahra Laundry Cabang 1"
              error={validationErrors.outlet}
            />

            <SourceTagSelect
              label="Sumber Nasabah"
              value={formInput.sumberNasabah || "Instagram"}
              onChange={(value) => updateFormField("sumberNasabah", value)}
            />

            <PhoneInput
              label="Nomor Telepon Owner *"
              value={formInput.noHpOwner || ""}
              onChange={(value) => updateFormField("noHpOwner", value)}
              error={validationErrors.noHpOwner}
            />

            <PhoneInput
              label="Nomor Telepon Outlet *"
              value={formInput.noHpOutlet || ""}
              onChange={(value) => updateFormField("noHpOutlet", value)}
              error={validationErrors.noHpOutlet}
            />

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
                <FieldIcon type="sales" />
                PIC Sales *
              </label>
              <select
                required
                name="pic"
                value={formInput.pic || "No PIC"}
                onChange={handleInputChange}
                className={`w-full cursor-pointer rounded-xl border bg-white p-2.5 text-xs font-black text-[#C92C1E] focus:outline-none focus:border-[#C92C1E] ${
                  validationErrors.pic ? "border-red-500 bg-red-50" : "border-gray-200"
                }`}
              >
                {LIST_PIC.map((pic) => (
                  <option key={pic} value={pic}>
                    {pic}
                  </option>
                ))}
              </select>
              {validationErrors.pic && (
                <p className="text-[10px] font-bold text-red-600">
                  {validationErrors.pic}
                </p>
              )}
            </div>

          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="text-[11px] font-medium text-gray-400">
            Pastikan data owner sudah benar sebelum disimpan ke Data Kelolaan.
          </div>

          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-[#C92C1E] px-6 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216]"
          >
            {editId !== null ? "Simpan Perubahan" : "Tambah Owner"}
          </button>
        </div>
      </form>
    </div>
  );
}


function SourceTagSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
        <FieldIcon type="brand" />
        {label}
      </label>

      <div className="flex flex-wrap gap-2 rounded-xl border border-red-100 bg-white p-2.5">
        {SUMBER_NASABAH_OPTIONS.map((option) => {
          const isActive = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-black transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] ${
                isActive
                  ? getSumberTagClass(option.tone)
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:border-red-100 hover:bg-red-50 hover:text-[#C92C1E]"
              }`}
            >
              #{option.label}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] font-medium text-gray-400">
        Sumber terpilih:{" "}
        <span className="font-black text-[#C92C1E]">
          #{value || "Instagram"}
        </span>
      </p>
    </div>
  );
}


function PhoneInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const initialCountry = getPhoneCountryByDialCode(value);
  const [selectedCountryCode, setSelectedCountryCode] = useState(initialCountry.code);

  const selectedCountry =
    PHONE_COUNTRY_OPTIONS.find((country) => country.code === selectedCountryCode) ||
    initialCountry;

  useEffect(() => {
    if (!value) return;

    const detectedCountry = getPhoneCountryByDialCode(value);

    if (value.startsWith(detectedCountry.dialCode)) {
      setSelectedCountryCode((currentCode) => currentCode || detectedCountry.code);
    }
  }, [value]);

  const nationalNumber = stripDialCode(value, selectedCountry.dialCode);
  const formattedNationalNumber = formatPhoneNumberByCountry(
    nationalNumber,
    selectedCountry.placeholder,
  );

  const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCountry =
      PHONE_COUNTRY_OPTIONS.find((country) => country.code === event.target.value) ||
      PHONE_COUNTRY_OPTIONS[0];

    setSelectedCountryCode(nextCountry.code);
    onChange(buildInternationalPhone(nextCountry.dialCode, nationalNumber));
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = removeLeadingTrunkZero(event.target.value.replace(/\D/g, ""));
    onChange(buildInternationalPhone(selectedCountry.dialCode, rawDigits));
  };

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
        <FieldIcon type="phone" />
        {label}
      </label>

      <div
        className={`flex overflow-hidden rounded-xl border bg-white focus-within:border-[#C92C1E] ${
          error ? "border-red-500 bg-red-50" : "border-gray-200"
        }`}
      >
        <select
          value={selectedCountry.code}
          onChange={handleCountryChange}
          className="w-[110px] cursor-pointer border-r bg-gray-50 px-2.5 py-2.5 text-xs font-black text-gray-700 outline-none"
          title="Pilih kode negara"
        >
          {PHONE_COUNTRY_OPTIONS.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.dialCode}
            </option>
          ))}
        </select>

        <input
          required
          type="tel"
          value={formattedNationalNumber}
          onChange={handlePhoneChange}
          inputMode="tel"
          autoComplete="tel"
          placeholder={selectedCountry.placeholder}
          className="min-w-0 flex-1 bg-white px-3 py-2.5 text-xs font-bold outline-none"
          title="Pilih negara lalu isi nomor telepon"
        />
      </div>

      {error ? (
        <p className="text-[10px] font-bold text-red-600">{error}</p>
      ) : (
        <p className="text-[10px] font-medium text-gray-400">
          Tersimpan sebagai: {value || `${selectedCountry.dialCode}...`} · Tampilan: {formattedNationalNumber || selectedCountry.placeholder}
        </p>
      )}
    </div>
  );
}


function FormInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  icon = "code",
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: "code" | "user" | "brand" | "outlet" | "phone" | "sales";
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
        <FieldIcon type={icon} />
        {label}
      </label>
      <input
        required
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white p-2.5 text-xs font-bold focus:outline-none focus:border-[#C92C1E] ${
          error ? "border-red-500 bg-red-50" : "border-gray-200"
        }`}
      />
      {error && (
        <p className="text-[10px] font-bold text-red-600">{error}</p>
      )}
    </div>
  );
}