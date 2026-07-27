"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLeads, createOwner, updateOwner, bulkCreateOwnerOutlets, fetchOwnerOutlets, getSalesList, getSupervisorList, assignSalesToLead, assignSupervisorToLead, getLead, bulkForceDeleteOutlets, getProfile, type CreateLeadRequest, type UserResponse } from "@/app/lib/api";

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
  { key: "outlet", label: "Outlet" },
  { key: "noHpOwner", label: "Nomor Telepon Owner" },
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


  return errors;
};


const getOwnerProfileByKodeOwner = (kodeOwner: string) => {
  if (typeof window === "undefined") return null;

  const normalizedKodeOwner = kodeOwner.trim();

  if (!normalizedKodeOwner) return null;

  const cached = localStorage.getItem("piposmart_nasabah_data");

  if (!cached) return null;

  try {
    const list: NasabahItem[] = JSON.parse(cached);

    return (
      list.find((item) => String(item.kodeOwner || "").trim() === normalizedKodeOwner) ||
      null
    );
  } catch {
    return null;
  }
};


const buildOutletRowsFromOwner = (owner?: Partial<NasabahItem> | null): OwnerOutletItem[] => {
  const existingOutlets = owner?.outlets || [];

  if (existingOutlets.length > 0) {
    return existingOutlets
      .map((item) => ({
        namaOutlet: item.namaOutlet || "",
        noHpOutlet: item.noHpOutlet || owner?.noHpOutlet || "",
      }))
      .filter((item) => item.namaOutlet.trim());
  }

  if (owner?.outlet && owner.outlet !== owner.projectBrand) {
    return [
      {
        namaOutlet: owner.outlet,
        noHpOutlet: owner.noHpOutlet || "",
      },
    ];
  }

  return [];
};

const normalizeOutletRows = (rows: OwnerOutletItem[]) => {
  return rows
    .map((item) => ({
      namaOutlet: item.namaOutlet.trim(),
      noHpOutlet: item.noHpOutlet.trim(),
    }))
    .filter((item) => item.namaOutlet);
};

const getExistingOutletsByKodeOwner = (kodeOwner?: string) => {
  if (typeof window === "undefined") return [];

  const normalizedKodeOwner = String(kodeOwner || "").trim();

  if (!normalizedKodeOwner) return [];

  const cached = localStorage.getItem("piposmart_nasabah_data");

  if (!cached) return [];

  try {
    const list: NasabahItem[] = JSON.parse(cached);
    const outlets = list
      .filter((item) => String(item.kodeOwner || "").trim() === normalizedKodeOwner)
      .flatMap((item) => {
        if (item.outlets?.length) return item.outlets;
        return item.outlet && item.outlet !== item.projectBrand
          ? [{ namaOutlet: item.outlet, noHpOutlet: item.noHpOutlet || "" }]
          : [];
      })
      .map((item) => ({
        namaOutlet: item.namaOutlet.trim(),
        noHpOutlet: item.noHpOutlet || "",
      }))
      .filter((item) => item.namaOutlet);

    return Array.from(
      new Map(outlets.map((item) => [item.namaOutlet.toLowerCase(), item])).values(),
    );
  } catch {
    return [];
  }
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
  const [outletRows, setOutletRows] = useState<OwnerOutletItem[]>([]);
  const [salesList, setSalesList] = useState<UserResponse[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [supervisorList, setSupervisorList] = useState<UserResponse[]>([]);
  const [loggedInUser, setLoggedInUser] = useState("Satria");
  const [loggedInRole, setLoggedInRole] = useState("Developer");
  const isAdmin = ["Developer", "Admin", "ADMIN", "Direktur"].includes(loggedInRole);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userName = localStorage.getItem("piposmart_user_name") || "Satria";
    const userRole = localStorage.getItem("piposmart_user_role") || "Developer";

    setLoggedInUser(userName);
    setLoggedInRole(userRole);

    const isAdminUser = ["Developer", "Admin", "ADMIN", "Direktur"].includes(userRole);

    if (isAdminUser) {
      getSupervisorList().then(setSupervisorList).catch(console.error);

      if (userRole === "Supervisor" || userRole === "SUPERVISOR") {
        getProfile().then(me => {
          if (me && me.id) {
            setSupervisorList(prev => {
              if (prev.find(s => s.id === me.id)) return prev;
              return [...prev, { id: me.id, name: me.name, role: "SUPERVISOR" } as UserResponse];
            });
          }
        }).catch(console.error);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");

    if (!idParam) {
      // Create mode
      if (!isAdminUser) {
        setFormInput((prev) => ({ ...prev, pic: "No PIC" }));
      }
      return;
    }

    const targetNo = Number(idParam);
    setEditId(targetNo);

    const cached = localStorage.getItem("piposmart_nasabah_data");
    if (!cached) return;

    try {
      const list: NasabahItem[] = JSON.parse(cached);
      const targetItem = list.find((row) => row.no === targetNo);

      if (targetItem) {
        let defaultPic = targetItem.pic;
        if (!defaultPic || defaultPic === "-") {
          defaultPic = "No PIC";
        }
        setFormInput((prev) => ({
          ...prev,
          ...targetItem,
          pic: defaultPic,
        }));
          
        if (targetItem.ownerId) {
          fetchOwnerOutlets(targetItem.ownerId).then(outletsData => {
            if (outletsData && outletsData.length > 0) {
              setOutletRows(outletsData.map(o => ({
                namaOutlet: o.name,
                noHpOutlet: o.phone || ""
              })));
            } else {
              setOutletRows([{ namaOutlet: "", noHpOutlet: "" }]);
            }
          }).catch(console.error);
        } else {
          const outlets = buildOutletRowsFromOwner(targetItem);
          setOutletRows(outlets.length > 0 ? outlets : [{ namaOutlet: "", noHpOutlet: "" }]);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    if (name === "kodeOwner") {
      const matchedOwner = getOwnerProfileByKodeOwner(value);
      const matchedOutlets = buildOutletRowsFromOwner(matchedOwner);

      setFormInput((prev) => ({
        ...prev,
        kodeOwner: value,
        namaOwner: matchedOwner?.namaOwner || "",
        projectBrand: matchedOwner?.projectBrand || "",
        noHpOwner: matchedOwner?.noHpOwner || "",
        noHpOutlet: matchedOutlets[0]?.noHpOutlet || matchedOwner?.noHpOutlet || "",
        pic: matchedOwner?.pic || "No PIC",
        sumberNasabah: matchedOwner?.sumberNasabah || "Instagram",
        outlet: matchedOutlets[0]?.namaOutlet || matchedOwner?.outlet || "",
        outlets: matchedOutlets,
      }));

      setOutletRows(matchedOutlets.length > 0 ? matchedOutlets : [{ namaOutlet: "", noHpOutlet: "" }]);
      setValidationErrors((prev) => ({
        ...prev,
        kodeOwner: "",
        namaOwner: "",
        projectBrand: "",
        outlet: "",
        noHpOwner: "",
        noHpOutlet: "",
      }));

      return;
    }

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
    setOutletRows((prev) => [
      ...prev,
      { namaOutlet: "", noHpOutlet: "" },
    ]);

    setValidationErrors((prev) => ({ ...prev, outlet: "" }));
  };

  const handleUpdateOutletRow = (
    index: number,
    field: keyof OwnerOutletItem,
    value: string,
  ) => {
    setOutletRows((prev) => {
      const nextRows = prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      );
      const normalizedRows = normalizeOutletRows(nextRows);

      setFormInput((current) => ({
        ...current,
        outlet: normalizedRows[0]?.namaOutlet || "",
        outlets: normalizedRows,
        noHpOutlet: normalizedRows[0]?.noHpOutlet || "",
      }));

      return nextRows;
    });

    setValidationErrors((prev) => ({ ...prev, outlet: "" }));
  };

  const handleRemoveOutletRow = (index: number) => {
    setOutletRows((prev) => {
      const nextRows = prev.filter((_, itemIndex) => itemIndex !== index);
      const normalizedRows = normalizeOutletRows(nextRows);

      setFormInput((current) => ({
        ...current,
        outlet: normalizedRows[0]?.namaOutlet || "",
        outlets: normalizedRows,
        noHpOutlet: normalizedRows[0]?.noHpOutlet || "",
      }));

      return nextRows;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    const normalizedOutlets = normalizeOutletRows(outletRows);
    const existingOutlets = getExistingOutletsByKodeOwner(formInput.kodeOwner);
    const mergedOutlets = Array.from(
      new Map(
        [...existingOutlets, ...normalizedOutlets].map((item) => [
          item.namaOutlet.toLowerCase(),
          item,
        ]),
      ).values(),
    );

    const nextFormInput: Partial<NasabahItem> = {
      ...formInput,
      outlet: normalizedOutlets[0]?.namaOutlet || "",
      outlets: mergedOutlets,
      noHpOutlet: normalizedOutlets[0]?.noHpOutlet || "",
    };

    const errors = getProfileFieldErrors(nextFormInput);

    if (normalizedOutlets.length === 0) {
      errors.outlet = "Minimal 1 outlet wajib ditambahkan.";
    }

    const outletWithoutPhone = normalizedOutlets.find(
      (outletItem) => !isValidInternationalPhone(outletItem.noHpOutlet),
    );

    if (outletWithoutPhone) {
      errors.outlet = "Setiap outlet wajib punya nomor telepon outlet yang valid.";
    }

    if (Object.values(errors).some(Boolean)) {
      setValidationErrors(errors);
      setIsSaving(false);
      return;
    }

    setValidationErrors({});

    try {
      if (editId !== null) {
        // Cari actual Owner ID melalui data Lead
        let actualOwnerId = null;
        try {
          const leadData = await getLead(editId);
          if (leadData?.owner?.id) {
            actualOwnerId = leadData.owner.id;
          }
        } catch (e) {
          console.error("Gagal mengambil data Lead", e);
        }

        if (!actualOwnerId) {
          throw new Error("Gagal menemukan ID Owner untuk Lead ini. Pastikan data tersinkronisasi.");
        }

        const payloadUpdate = {
          code: nextFormInput.kodeOwner || "",
          name: nextFormInput.namaOwner || "",
          brand_name: nextFormInput.projectBrand || "",
          phone: nextFormInput.noHpOwner || "",
        };
        await updateOwner(actualOwnerId, payloadUpdate);

        // Hapus outlet lama lalu buat baru agar ter-update dengan benar
        try {
          const existingOutletsData = await fetchOwnerOutlets(actualOwnerId);
          if (existingOutletsData && existingOutletsData.length > 0) {
            const existingIds = existingOutletsData.map(o => o.id);
            await bulkForceDeleteOutlets(actualOwnerId, existingIds);
          }
        } catch (err) {
          console.error("Gagal menghapus outlet lama", err);
        }

        const outletsPayload = normalizedOutlets.map((o, idx) => ({
          code: `${nextFormInput.kodeOwner || "OUT"}-${idx + 1}`,
          name: o.namaOutlet,
          phone: o.noHpOutlet
        }));
        await bulkCreateOwnerOutlets(actualOwnerId, outletsPayload);

        // Jika PIC berubah, assign PIC baru (Admin hanya bisa assign ke Supervisor)
        if (nextFormInput.pic && nextFormInput.pic !== "No PIC") {
          const targetPicUser = supervisorList.find(s => s.name === nextFormInput.pic);
          if (targetPicUser) {
            try {
              await assignSupervisorToLead(editId, targetPicUser.id);
            } catch (err) {
              console.error("Gagal assign PIC", err);
            }
          }
        }

        alert("Data profil dan outlet berhasil diperbarui di backend.");
      } else {
        // 1. Buat Owner
        const payloadCreateOwner = {
          code: nextFormInput.kodeOwner || "",
          name: nextFormInput.namaOwner || "",
          brand_name: nextFormInput.projectBrand || "",
          phone: nextFormInput.noHpOwner || "",
        };
        const createdOwner = await createOwner(payloadCreateOwner);
        const newOwnerId = createdOwner.data.id;

        // 2. Buat Outlet
        if (newOwnerId) {
          const outletsPayload = normalizedOutlets.map((o, idx) => ({
            code: `${nextFormInput.kodeOwner || "OUT"}-${idx + 1}`,
            name: o.namaOutlet,
            phone: o.noHpOutlet
          }));
          await bulkCreateOwnerOutlets(newOwnerId, outletsPayload);
        }

        // 3. Ambil Lead yang otomatis dibuat oleh backend untuk Owner ini
        const leads = await getLeads();
        const autoCreatedLead = leads.find((l: any) => l.owner?.id === newOwnerId);

        // 4. Assign PIC jika dipilih (hanya Supervisor)
        const targetPicUser = nextFormInput.pic !== "No PIC" ? supervisorList.find(s => s.name === nextFormInput.pic) : null;
        if (autoCreatedLead?.id && targetPicUser) {
             await assignSupervisorToLead(autoCreatedLead.id, targetPicUser.id).catch(e => console.error(e));
        }

        // Catatan: source_type (sumberNasabah) saat ini diset otomatis ke "MANUAL" oleh backend
        // dan belum ada endpoint UpdateLead untuk mengubahnya dari frontend.

        alert("Data profil, prospek (Lead), dan outlet berhasil ditambahkan ke backend.");
      }

      router.push("/menu/data-kelolaan");
    } catch (err) {
      console.error("Gagal menyimpan ke backend", err);
      alert(`Gagal menyimpan ke backend: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
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
        onSubmit={handleSave}
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
              placeholder="Isi kode owner, data owner akan auto terisi"
              error={validationErrors.kodeOwner}
            />

            {formInput.kodeOwner && (
              <p className="rounded-xl border border-red-100 bg-red-50/50 px-3 py-2 text-[10px] font-bold text-[#C92C1E]">
                Jika Kode Owner cocok dengan data yang tersimpan, Nama Owner, Nama Brand, nomor telepon, PIC, dan sumber akan terisi otomatis. Jika Kode Owner diubah atau tidak cocok, field otomatis dikosongkan.
              </p>
            )}

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

            <OutletRowsInput
              kodeOwner={formInput.kodeOwner || ""}
              rows={outletRows}
              onAdd={handleAddOutletRow}
              onUpdate={handleUpdateOutletRow}
              onRemove={handleRemoveOutletRow}
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

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
                <FieldIcon type="sales" />
                PIC Sales *
              </label>
              <select
                required
                name="pic"
                value={formInput.pic || (isAdmin ? "No PIC" : loggedInUser)}
                onChange={handleInputChange}
                disabled={!isAdmin}
                className={`w-full rounded-xl border p-2.5 text-xs font-black text-[#C92C1E] focus:outline-none focus:border-[#C92C1E] ${
                  validationErrors.pic ? "border-red-500 bg-red-50" : "border-gray-200"
                } ${isAdmin ? "cursor-pointer bg-white" : "cursor-not-allowed bg-gray-100 opacity-80"}`}
              >
                {isAdmin ? (
                  <>
                    <option value="No PIC">Belum ada PIC</option>
                    {supervisorList.map((pic) => (
                      <option key={`${pic.id}-${pic.name}`} value={pic.name}>
                        {pic.name}
                      </option>
                    ))}
                  </>
                ) : (
                  <option value={formInput.pic || "No PIC"}>{formInput.pic || "No PIC"}</option>
                )}
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
            disabled={isSaving || !isAdmin}
            className={`cursor-pointer rounded-xl px-6 py-2.5 text-xs font-black text-white shadow-sm transition ${
              isSaving || !isAdmin ? "bg-gray-400 cursor-not-allowed" : "bg-[#C92C1E] hover:bg-[#A82216]"
            }`}
          >
            {isSaving ? "Menyimpan..." : (editId !== null ? "Simpan Perubahan" : "Tambah Owner")}
          </button>
        </div>
      </form>
    </div>
  );
}


function OutletRowsInput({
  kodeOwner,
  rows,
  onAdd,
  onUpdate,
  onRemove,
  error,
}: {
  kodeOwner: string;
  rows: OwnerOutletItem[];
  onAdd: () => void;
  onUpdate: (index: number, field: keyof OwnerOutletItem, value: string) => void;
  onRemove: (index: number) => void;
  error?: string;
}) {
  const hasKodeOwner = kodeOwner.trim() !== "";

  return (
    <div className="space-y-2 rounded-xl border border-red-100 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
          <FieldIcon type="outlet" />
          Outlet Owner *
        </label>

        <button
          type="button"
          onClick={onAdd}
          disabled={!hasKodeOwner}
          className="cursor-pointer rounded-full bg-[#C92C1E] px-3 py-1.5 text-[10px] font-black text-white shadow-sm transition hover:bg-[#A82216] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          + Tambah Outlet
        </button>
      </div>

      {!hasKodeOwner && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs font-bold text-gray-400">
          Isi Kode Owner terlebih dahulu, lalu klik tombol tambah outlet.
        </div>
      )}

      {hasKodeOwner && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-red-100 bg-red-50/40 p-3 text-xs font-bold text-gray-400">
          Belum ada outlet. Tekan tombol <span className="text-[#C92C1E]">+ Tambah Outlet</span> untuk menambahkan outlet owner.
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((item, index) => (
            <div
              key={`outlet-${index}`}
              className="space-y-3 rounded-xl border border-red-100 bg-red-50/30 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#C92C1E]">
                  Outlet {index + 1}
                </span>
              </div>

              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-400">
                  Nama Outlet
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.namaOutlet}
                    onChange={(event) => onUpdate(index, "namaOutlet", event.target.value)}
                    placeholder="Contoh: Azzahra Laundry Cabang 1"
                    className={`min-w-0 flex-1 rounded-xl border bg-white p-2.5 text-xs font-bold outline-none focus:border-[#C92C1E] ${
                      error && index === 0 ? "border-red-500 bg-red-50" : "border-gray-200"
                    }`}
                  />

                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      aria-label={`Hapus outlet ${index + 1}`}
                      title="Hapus outlet"
                      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-red-100 bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50 active:scale-95"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.6}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 7h12M9.5 7V5.75A1.75 1.75 0 0111.25 4h1.5a1.75 1.75 0 011.75 1.75V7m-7 0l.7 12.25A1.75 1.75 0 009.95 21h4.1a1.75 1.75 0 001.75-1.75L16.5 7M10.5 11v6M13.5 11v6"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </label>

              <PhoneInput
                label="Nomor Telepon Outlet *"
                value={item.noHpOutlet || ""}
                onChange={(value) => onUpdate(index, "noHpOutlet", value)}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={onAdd}
            className="w-full cursor-pointer rounded-xl border border-dashed border-[#C92C1E]/40 bg-red-50/50 px-4 py-2.5 text-xs font-black text-[#C92C1E] transition hover:bg-red-100"
          >
            + Tambah Lagi
          </button>
        </div>
      )}

      {error ? (
        <p className="text-[10px] font-bold text-red-600">{error}</p>
      ) : (
        <p className="text-[10px] font-medium text-gray-400">
          Setiap outlet bisa punya nomor telepon yang berbeda.
        </p>
      )}
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