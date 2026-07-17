"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GrafikCustomer from "./grafik/page";
import { generateDummyCustomers, LIST_PIC } from "./dummy/page";
import CallPage, { CallFormResult, openWhatsAppCustomer } from "./call/page";

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

type EditModalMode = "profil" | "scoring";

const LIST_BULAN = [
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

const LIST_SKOR = [
  { value: "0", label: "Tidak Potensial (0)", scor: 0 },
  { value: "1", label: "Kemungkinan Potensial (1)", scor: 1 },
  { value: "2", label: "Potensial (2)", scor: 2 },
  { value: "3", label: "Langganan (3)", scor: 3 },
];


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
    return value.slice(dialCode.length).replace(/\D/g, "");
  }

  if (dialCode === "+62" && value.startsWith("0")) {
    return value.slice(1).replace(/\D/g, "");
  }

  return value.replace(/\D/g, "");
};

const buildInternationalPhone = (dialCode: string, value: string) => {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 14);
  return digitsOnly ? `${dialCode}${digitsOnly}` : dialCode;
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



const paketOptions = ["", "Basic", "Business", "Pro", "Bundling & Alat"];
const sumberOptions = ["Instagram", "Facebook", "Tiktok", "Mitra", "Playstore"];
const callOptions = ["PENDING", "CONTACTED", "NO CALL"];
const chatOptions = ["PENDING", "PROSPECT", "DELIVERED", "NO CHAT"];
const validitasOptions = ["VALID", "INVALID"];

const getCustomerFilterDate = (item: Partial<NasabahItem>) => {
  return (
    item.tanggalFu ||
    item.createDateProject ||
    item.tanggalDibagikan ||
    ""
  );
};

const getCustomerFilterMonth = (item: Partial<NasabahItem>) => {
  const dateValue = getCustomerFilterDate(item);

  if (dateValue && dateValue.includes("-")) {
    const monthIndex = Number(dateValue.split("-")[1]) - 1;
    return LIST_BULAN[monthIndex] || item.bulan || "";
  }

  return item.bulan || "";
};

const DATA_PACKET_MASTER: Record<string, { id_skema: string; nama_promo: string; total_penjualan: number }[]> = {
  Basic: [
    { id_skema: "basic_24", nama_promo: "24 Bulan Basic", total_penjualan: 1716000 },
    { id_skema: "basic_18", nama_promo: "18 Bulan Basic", total_penjualan: 1398000 },
    { id_skema: "basic_12", nama_promo: "12 Bulan Basic", total_penjualan: 858000 },
    { id_skema: "basic_9", nama_promo: "9 Bulan Basic", total_penjualan: 702000 },
    { id_skema: "basic_1", nama_promo: "1 Bulan Basic", total_penjualan: 78000 },
  ],
  Business: [
    { id_skema: "biz_24", nama_promo: "24 Bulan Business", total_penjualan: 2596000 },
    { id_skema: "biz_18", nama_promo: "18 Bulan Business", total_penjualan: 1998000 },
    { id_skema: "biz_12", nama_promo: "12 Bulan Business", total_penjualan: 1298000 },
    { id_skema: "biz_9", nama_promo: "9 Bulan Business", total_penjualan: 998000 },
    { id_skema: "biz_6", nama_promo: "6 Bulan Business", total_penjualan: 708000 },
    { id_skema: "biz_1", nama_promo: "1 Bulan Business", total_penjualan: 118000 },
  ],
  Pro: [
    { id_skema: "pro_24", nama_promo: "24 Bulan Pro", total_penjualan: 3368000 },
    { id_skema: "pro_18", nama_promo: "18 Bulan Pro", total_penjualan: 2688000 },
    { id_skema: "pro_12", nama_promo: "12 Bulan Pro", total_penjualan: 1688000 },
    { id_skema: "pro_9", nama_promo: "9 Bulan Pro", total_penjualan: 1368000 },
    { id_skema: "pro_6", nama_promo: "6 Bulan Pro", total_penjualan: 1008000 },
    { id_skema: "pro_1", nama_promo: "1 Bulan Pro", total_penjualan: 168000 },
  ],
  "Bundling & Alat": [
    { id_skema: "bund_starter", nama_promo: "Paket Starter Pro", total_penjualan: 2078000 },
    { id_skema: "bund_pos_pro", nama_promo: "POS Bundle Pro", total_penjualan: 5288000 },
    { id_skema: "bund_jagoan_biz", nama_promo: "Jagoan Business", total_penjualan: 1598000 },
    { id_skema: "bund_pos_biz", nama_promo: "POS Bundle Business", total_penjualan: 4798000 },
  ],
};


const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-3.5 h-3.5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18" />
  </svg>
);


const CallIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5A2.25 2.25 0 0021 19.5v-1.066a1.5 1.5 0 00-1.033-1.428l-4.2-1.4a1.5 1.5 0 00-1.64.43l-.826.826a11.25 11.25 0 01-6.164-6.164l.826-.826a1.5 1.5 0 00.43-1.64l-1.4-4.2A1.5 1.5 0 005.566 3H4.5A2.25 2.25 0 002.25 5.25v1.5z"
    />
  </svg>
);


function getQuickSkorBadgeClass(item: NasabahItem) {
  const value = String(item.remarks ?? item.scor ?? "0");

  if (value === "3") return "bg-blue-100 text-blue-700";
  if (value === "2") return "bg-yellow-100 text-yellow-800";
  if (value === "1") return "bg-orange-100 text-orange-800";

  return "bg-red-100 text-red-700";
}

function PicBadge({
  value,
  color = "red",
}: {
  value: string;
  color?: "red" | "green";
}) {
  const colorClass =
    color === "green"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : "bg-red-50 border-red-200 text-[#C92C1E]";

  return (
    <span
      className={`inline-flex max-w-[150px] items-center justify-center rounded-full border px-2.5 py-1 text-center text-[10px] font-black uppercase tracking-tight ${colorClass}`}
      title={value || "-"}
    >
      <span className="truncate">{value || "-"}</span>
    </span>
  );
}

function getSkorLabelFromItem(item: NasabahItem) {
  const remarksValue = String(item.remarks ?? "");
  const skor = LIST_SKOR.find((row) => row.value === remarksValue);
  if (skor) return skor.label;

  if (item.scor === 3) return "Langganan (3)";
  if (item.scor === 2) return "Potensial (2)";
  if (item.scor === 1) return "Kemungkinan Potensial (1)";

  return "Tidak Potensial (0)";
}

function SkorBadge({ item }: { item: NasabahItem }) {
  return (
    <span
      className={`inline-flex max-w-[180px] items-center justify-center rounded-md px-2 py-1 text-center text-[10px] font-black ${getQuickSkorBadgeClass(item)}`}
      title={getSkorLabelFromItem(item)}
    >
      <span className="truncate">{getSkorLabelFromItem(item)}</span>
    </span>
  );
}



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


export default function DataKelolaanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dataNasabah, setDataNasabah] = useState<NasabahItem[]>([]);

  const [viewMode, setViewMode] = useState<"merah" | "hijau">("merah");
  const [filterMode, setFilterMode] = useState<"harian" | "bulanan">("harian");

  const [searchKodeOwner, setSearchKodeOwner] = useState("");
  const [searchNamaOwner, setSearchNamaOwner] = useState("");
  const [searchNamaOutlet, setSearchNamaOutlet] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [startMonthFilter, setStartMonthFilter] = useState("");
  const [endMonthFilter, setEndMonthFilter] = useState("");
  const [picFilter, setPicFilter] = useState("Semua");
  const [skorFilter, setSkorFilter] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionAction, setSelectionAction] = useState<"edit" | "delete" | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [trashCount, setTrashCount] = useState(0);

  const [modalMode, setModalMode] = useState<EditModalMode>("profil");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NasabahItem | null>(null);
  const [profileValidationErrors, setProfileValidationErrors] = useState<ProfileValidationErrors>({});
  const [callModalItem, setCallModalItem] = useState<NasabahItem | null>(null);

  const [bulkPicModalOpen, setBulkPicModalOpen] = useState(false);
  const [bulkSelectedPic, setBulkSelectedPic] = useState("");

  const loggedInUser = "Satria";
  const loggedInRole = "Admin";

  useEffect(() => {
    const cached = localStorage.getItem("piposmart_nasabah_data");
    if (cached) {
      try {
        setDataNasabah(JSON.parse(cached));
      } catch {
        setDataNasabah([]);
      }
    }

    const deletedCached = localStorage.getItem("piposmart_deleted_nasabah_data");
    if (deletedCached) {
      try {
        const parsedDeleted = JSON.parse(deletedCached);
        setTrashCount(Array.isArray(parsedDeleted) ? parsedDeleted.length : 0);
      } catch {
        setTrashCount(0);
      }
    }
  }, []);

  const saveDataNasabah = (nextData: NasabahItem[]) => {
    setDataNasabah(nextData);
    localStorage.setItem("piposmart_nasabah_data", JSON.stringify(nextData));
  };

  const handleGenerateDummy = () => {
    const mockExcelData: NasabahItem[] = generateDummyCustomers(1000);

    saveDataNasabah(mockExcelData);
    setTrashCount(0);
    localStorage.removeItem("piposmart_deleted_nasabah_data");

    alert("Berhasil inject 1000 data dummy customer.");
  };

  const handleExportData = () => {
    if (dataNasabah.length === 0) {
      alert("Tidak ada data kelolaan untuk diexport.");
      return;
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataNasabah, null, 2),
    )}`;

    const downloadElement = document.createElement("a");
    downloadElement.setAttribute("href", jsonString);
    downloadElement.setAttribute("download", "piposmart_backup_nasabah.json");
    document.body.appendChild(downloadElement);
    downloadElement.click();
    downloadElement.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();

    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");

      fileReader.onload = (event) => {
        try {
          const parsedData = JSON.parse(event.target?.result as string);

          if (Array.isArray(parsedData)) {
            saveDataNasabah(parsedData);
            setTrashCount(0);
            localStorage.removeItem("piposmart_deleted_nasabah_data");
            alert("Sakti! File database nasabah berhasil diimport masuk sistem.");
          } else {
            alert("Gagal: Struktur format dalam file bukan array data nasabah.");
          }
        } catch {
          alert("Gagal membaca berkas. Pastikan file berupa JSON cadangan resmi.");
        }
      };
    }
  };

  const handleStartSelectionMode = (action: "edit" | "delete") => {
    setSelectionMode(true);
    setSelectionAction(action);
    setSelectedIds([]);
  };

  const handleCancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectionAction(null);
    setSelectedIds([]);
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id],
    );
  };

  const handleHapusDataTerpilih = () => {
    if (selectedIds.length === 0) {
      alert("Belum ada data yang dipilih untuk dihapus.");
      return;
    }

    const yakin = confirm(
      `Yakin ingin memindahkan ${selectedIds.length} data yang dipilih ke Riwayat Hapus? Data masih bisa dipulihkan dari halaman Trash.`,
    );

    if (!yakin) return;

    const selectedSet = new Set(selectedIds);
    const deletedItems = dataNasabah.filter((item) => selectedSet.has(item.no));
    const nextData = dataNasabah.filter((item) => !selectedSet.has(item.no));

    const oldTrashRaw = localStorage.getItem("piposmart_deleted_nasabah_data");
    let oldTrash: NasabahItem[] = [];

    if (oldTrashRaw) {
      try {
        const parsed = JSON.parse(oldTrashRaw);
        oldTrash = Array.isArray(parsed) ? parsed : [];
      } catch {
        oldTrash = [];
      }
    }

    const oldTrashIds = new Set(oldTrash.map((item) => item.no));
    const nextTrash = [
      ...deletedItems.filter((item) => !oldTrashIds.has(item.no)),
      ...oldTrash,
    ];

    saveDataNasabah(nextData);
    setTrashCount(nextTrash.length);
    localStorage.setItem("piposmart_deleted_nasabah_data", JSON.stringify(nextTrash));

    setSelectedIds([]);
    setSelectionMode(false);

    alert(`${deletedItems.length} data dipindahkan ke Riwayat Hapus.`);
  };

  const handleHapusSatuData = (item: NasabahItem) => {
    const yakin = confirm(
      `Yakin ingin memindahkan data "${item.namaOwner}" ke Riwayat Hapus?`,
    );

    if (!yakin) return;

    const oldTrashRaw = localStorage.getItem("piposmart_deleted_nasabah_data");
    let oldTrash: NasabahItem[] = [];

    if (oldTrashRaw) {
      try {
        const parsed = JSON.parse(oldTrashRaw);
        oldTrash = Array.isArray(parsed) ? parsed : [];
      } catch {
        oldTrash = [];
      }
    }

    const nextData = dataNasabah.filter((row) => row.no !== item.no);
    const nextTrash = [item, ...oldTrash.filter((row) => row.no !== item.no)];

    saveDataNasabah(nextData);
    setTrashCount(nextTrash.length);
    localStorage.setItem("piposmart_deleted_nasabah_data", JSON.stringify(nextTrash));

    alert("Data dipindahkan ke Riwayat Hapus.");
  };

  const handleOpenCallAction = (item: NasabahItem) => {
    openWhatsAppCustomer(item.noHpOwner || item.noHpOutlet);
    setCallModalItem(item);
  };

  const handleSaveCallResult = (result: CallFormResult) => {
    const nextData = dataNasabah.map((item) =>
      item.no === result.customerId
        ? {
            ...item,
            callStatus: result.callStatus,
            chatStatus: result.chatStatus,
            tanggalFu: result.followUpDate,
            totalFu: Number(item.totalFu || 0) + 1,
            noted: result.note,
          }
        : item,
    );

    saveDataNasabah(nextData);
    setCallModalItem(null);

    alert("Hasil call berhasil disimpan.");
  };

  const openBulkPicModal = () => {
    if (selectedIds.length === 0) {
      alert("Pilih data customer terlebih dahulu.");
      return;
    }

    setBulkSelectedPic("");
    setBulkPicModalOpen(true);
  };

  const closeBulkPicModal = () => {
    setBulkPicModalOpen(false);
    setBulkSelectedPic("");
  };

  const handleSaveBulkPic = (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedIds.length === 0) {
      alert("Belum ada data yang dipilih.");
      return;
    }

    if (!bulkSelectedPic) {
      alert("Pilih PIC Sales terlebih dahulu.");
      return;
    }

    const selectedSet = new Set(selectedIds);
    const nextData = dataNasabah.map((item) =>
      selectedSet.has(item.no) ? { ...item, pic: bulkSelectedPic } : item,
    );

    saveDataNasabah(nextData);
    closeBulkPicModal();
    setSelectedIds([]);
    setSelectionMode(false);
    setSelectionAction(null);

    alert(`${selectedSet.size} data berhasil diganti ke PIC ${bulkSelectedPic}.`);
  };

  const daftarPicUnik = useMemo(() => {
    const setPic = new Set<string>();

    dataNasabah.forEach((item) => {
      if (item.pic) setPic.add(item.pic);
    });

    return Array.from(setPic).sort();
  }, [dataNasabah]);

  const filteredData = useMemo(() => {
    return dataNasabah.filter((item) => {
      const kodeKeyword = searchKodeOwner.toLowerCase().trim();
      const namaKeyword = searchNamaOwner.toLowerCase().trim();
      const outletKeyword = searchNamaOutlet.toLowerCase().trim();

      const matchesSearch =
        (kodeKeyword === "" ||
          item.kodeOwner?.toLowerCase().includes(kodeKeyword)) &&
        (namaKeyword === "" ||
          item.namaOwner?.toLowerCase().includes(namaKeyword)) &&
        (outletKeyword === "" ||
          item.outlet?.toLowerCase().includes(outletKeyword));

      const matchesPic = picFilter === "Semua" || item.pic === picFilter;
      const matchesSkor =
        skorFilter === "Semua" ||
        String(item.remarks ?? item.scor ?? "0") === skorFilter;

      let matchesFilter = true;

      if (filterMode === "harian") {
        const itemDate = getCustomerFilterDate(item);

        if (!itemDate) {
          matchesFilter = false;
        }

        if (startDateFilter && itemDate < startDateFilter) matchesFilter = false;
        if (endDateFilter && itemDate > endDateFilter) matchesFilter = false;
      } else {
        if (startMonthFilter || endMonthFilter) {
          const itemMonthIndex = LIST_BULAN.indexOf(getCustomerFilterMonth(item));
          const startIndex = startMonthFilter
            ? LIST_BULAN.indexOf(startMonthFilter)
            : 0;
          const endIndex = endMonthFilter
            ? LIST_BULAN.indexOf(endMonthFilter)
            : 11;

          if (itemMonthIndex !== -1) {
            if (itemMonthIndex < startIndex || itemMonthIndex > endIndex) {
              matchesFilter = false;
            }
          }
        }
      }

      return matchesSearch && matchesPic && matchesSkor && matchesFilter;
    });
  }, [
    dataNasabah,
    searchKodeOwner,
    searchNamaOwner,
    searchNamaOutlet,
    picFilter,
    skorFilter,
    startDateFilter,
    endDateFilter,
    startMonthFilter,
    endMonthFilter,
    filterMode,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    viewMode,
    filterMode,
    searchKodeOwner,
    searchNamaOwner,
    searchNamaOutlet,
    picFilter,
    skorFilter,
    startDateFilter,
    endDateFilter,
    startMonthFilter,
    endMonthFilter,
    rowsPerPage,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startDataIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endDataIndex = Math.min(startDataIndex + rowsPerPage, filteredData.length);

  const paginatedData = useMemo(
    () => filteredData.slice(startDataIndex, endDataIndex),
    [filteredData, startDataIndex, endDataIndex],
  );

  const currentPageIds = useMemo(
    () => paginatedData.map((item) => item.no),
    [paginatedData],
  );

  const isAllCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAllCurrentPage = () => {
    if (currentPageIds.length === 0) return;

    if (isAllCurrentPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
  };

  const formatTgl = (str: string) => {
    if (!str || str.trim() === "") return "-";

    if (str.includes("-")) {
      const parts = str.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
    }

    return str;
  };

  const formatRupiah = (value: number) => {
    if (!value || value === 0) return "-";

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getSkorLabel = (item: NasabahItem) => {
    const remarksValue = String(item.remarks ?? "");
    const skor = LIST_SKOR.find((row) => row.value === remarksValue);
    if (skor) return skor.label;

    if (item.scor === 3) return "Langganan (3)";
    if (item.scor === 2) return "Potensial (2)";
    if (item.scor === 1) return "Kemungkinan Potensial (1)";

    return "Tidak Potensial (0)";
  };

  const getSkorBadgeClass = (item: NasabahItem) => {
    const value = String(item.remarks ?? item.scor ?? "0");

    if (value === "3") return "bg-blue-100 text-blue-700";
    if (value === "2") return "bg-yellow-100 text-yellow-800";
    if (value === "1") return "bg-orange-100 text-orange-800";

    return "bg-red-100 text-red-700";
  };

  const openEditModal = (item: NasabahItem, mode: EditModalMode) => {
    setEditingItem({ ...item });
    setModalMode(mode);
    setProfileValidationErrors({});
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setProfileValidationErrors({});
    setEditModalOpen(false);
  };

  const updateEditingField = <K extends keyof NasabahItem>(
    field: K,
    value: NasabahItem[K],
  ) => {
    setEditingItem((prev) => (prev ? { ...prev, [field]: value } : prev));

    setProfileValidationErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const handleSaveEditModal = (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingItem) return;

    if (modalMode === "profil") {
      const errors = getProfileFieldErrors(editingItem);

      if (Object.values(errors).some(Boolean)) {
        setProfileValidationErrors(errors);
        return;
      }

      setProfileValidationErrors({});
    }

    const nextData = dataNasabah.map((item) =>
      item.no === editingItem.no ? editingItem : item,
    );

    saveDataNasabah(nextData);
    closeEditModal();

    alert(
      modalMode === "profil"
        ? "Data profil berhasil diperbarui."
        : "Data scoring berhasil diperbarui.",
    );
  };

  const updateScoringPackage = (packageName: string) => {
    const listSkema = DATA_PACKET_MASTER[packageName] || [];
    const skemaPertama = listSkema.length > 0 ? listSkema[0] : null;

    setEditingItem((prev) =>
      prev
        ? {
            ...prev,
            finalisasiClosing: packageName,
            skemaId: skemaPertama?.id_skema || "",
            nominal: skemaPertama?.total_penjualan || 0,
          }
        : prev,
    );
  };

  const updateScoringSkema = (skemaId: string) => {
    if (!editingItem) return;

    const listSkema = DATA_PACKET_MASTER[editingItem.finalisasiClosing || ""] || [];
    const targetSkema = listSkema.find((item) => item.id_skema === skemaId);

    setEditingItem((prev) =>
      prev
        ? {
            ...prev,
            skemaId,
            nominal: targetSkema?.total_penjualan || prev.nominal || 0,
          }
        : prev,
    );
  };

  const currentSkemaList =
    editingItem && editingItem.finalisasiClosing
      ? DATA_PACKET_MASTER[editingItem.finalisasiClosing] || []
      : [];

  return (
    <div className="space-y-6 font-sans text-[#1C1C1E] max-w-full overflow-hidden">
      {/* ACTION TOP BAR */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200/60 shadow-xs">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Data Kelolaan Nasabah
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Workspace Monitoring Kemitraan PT. PIPOSMART DIGITAL INDONESIA.
          </p>
          <div className="text-xs text-gray-400 font-bold mt-1.5 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <UserIcon />
              Logged in:{" "}
              <span className="text-[#C92C1E] font-black">{loggedInUser}</span>
            </div>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full border border-red-200 bg-red-50 text-[#C92C1E] uppercase tracking-wider shadow-sm">
              {loggedInRole}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleImportData}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <UploadIcon />
            Import Data
          </button>

          <button
            onClick={handleExportData}
            className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <DownloadIcon />
            Export Data
          </button>

          <button
            onClick={handleGenerateDummy}
            className="px-3.5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <RefreshIcon />
            Inject 1000 Dummy
          </button>

          <Link
            href="/menu/data-kelolaan/form"
            className="px-4 py-2.5 bg-[#C92C1E] text-white rounded-xl text-xs font-black hover:bg-[#A82216] transition shadow-sm flex items-center gap-1.5"
          >
            <PlusIcon />
            Tambah Data Manual
          </Link>
        </div>
      </div>

      {/* PANEL FILTER & SEARCHING */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start">
          <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
            <button
              onClick={() => {
                setFilterMode("harian");
                setStartMonthFilter("");
                setEndMonthFilter("");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                filterMode === "harian"
                  ? "bg-[#C92C1E] text-white shadow-md"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Harian
            </button>
            <button
              onClick={() => {
                setFilterMode("bulanan");
                setStartDateFilter("");
                setEndDateFilter("");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                filterMode === "bulanan"
                  ? "bg-[#C92C1E] text-white shadow-md"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Bulanan
            </button>
          </div>

          {filterMode === "harian" ? (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600">
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="bg-transparent focus:outline-none text-gray-700 cursor-pointer"
              />
              <span className="text-gray-300">s/d</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="bg-transparent focus:outline-none text-gray-700 cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600">
              <select
                value={startMonthFilter}
                onChange={(e) => setStartMonthFilter(e.target.value)}
                className="bg-transparent focus:outline-none text-gray-700 font-bold cursor-pointer"
              >
                <option value="">Awal...</option>
                {LIST_BULAN.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <span className="text-gray-300">s/d</span>
              <select
                value={endMonthFilter}
                onChange={(e) => setEndMonthFilter(e.target.value)}
                className="bg-transparent focus:outline-none text-gray-700 font-bold cursor-pointer"
              >
                <option value="">Akhir...</option>
                {LIST_BULAN.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl w-full lg:w-auto shadow-inner justify-end">
          <button
            onClick={() => setViewMode("merah")}
            className={`px-5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
              viewMode === "merah"
                ? "bg-[#C92C1E] text-white shadow-md"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Profil
          </button>
          <button
            onClick={() => setViewMode("hijau")}
            className={`px-5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
              viewMode === "hijau"
                ? "bg-emerald-700 text-white shadow-md"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Scoring
          </button>
        </div>
      </div>

      {/* TABLE WORKSPACE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div>
              <p className="text-xs font-black text-gray-800 uppercase">
                {viewMode === "merah" ? "Tabel Profil Nasabah" : "Tabel Scoring Nasabah"}
              </p>
              <p className="text-[11px] text-gray-400 font-medium">
                Edit tetap muncul di depan layar sebagai modal, bukan pindah halaman.
              </p>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/menu/data-kelolaan/trash"
              className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black hover:bg-gray-50 transition cursor-pointer flex items-center gap-1.5"
            >
              <TrashIcon className="w-3.5 h-3.5 text-gray-500" />
              Riwayat Hapus ({trashCount})
            </Link>

            {!selectionMode ? (
              <>
                <button
                  onClick={() => handleStartSelectionMode("edit")}
                  className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-black hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1.5"
                >
                  <EditIcon className="w-3.5 h-3.5" />
                  Pilih untuk Edit PIC
                </button>

                <button
                  onClick={() => handleStartSelectionMode("delete")}
                  className="px-3.5 py-2 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-black hover:bg-red-100 transition cursor-pointer flex items-center gap-1.5"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Pilih untuk Hapus
                </button>
              </>
            ) : (
              <>
                <div
                  className={`px-3.5 py-2 rounded-xl text-xs font-black ${
                    selectionAction === "edit"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  Mode: {selectionAction === "edit" ? "Edit PIC" : "Hapus Data"}
                </div>

                <button
                  onClick={handleCancelSelectionMode}
                  className="px-3.5 py-2 bg-gray-900 border border-gray-900 text-white rounded-xl text-xs font-black hover:bg-black transition cursor-pointer"
                >
                  Batal Pilih
                </button>

                <button
                  onClick={handleToggleSelectAllCurrentPage}
                  disabled={currentPageIds.length === 0}
                  className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black hover:bg-gray-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isAllCurrentPageSelected
                    ? "Batal Pilih Semua"
                    : `Pilih Semua Halaman Ini (${currentPageIds.length})`}
                </button>

                {selectionAction === "edit" && (
                  <button
                    onClick={openBulkPicModal}
                    disabled={selectedIds.length === 0}
                    className="px-3.5 py-2 bg-emerald-600 border border-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Edit PIC Terpilih ({selectedIds.length})
                  </button>
                )}

                {selectionAction === "delete" && (
                  <button
                    onClick={handleHapusDataTerpilih}
                    disabled={selectedIds.length === 0}
                    className="px-3.5 py-2 bg-red-600 border border-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Hapus Terpilih ({selectedIds.length})
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm font-semibold text-gray-600 border-collapse table-auto">
            <thead>
              <tr
                className={`text-white uppercase text-[10px] md:text-[11px] tracking-wider font-black transition-colors duration-300 ${
                  viewMode === "merah" ? "bg-[#C92C1E]" : "bg-emerald-700"
                }`}
              >
                {selectionMode && (
                  <th className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleSelectAllCurrentPage}
                      className="h-4 w-4 cursor-pointer accent-white"
                      title="Pilih semua data di halaman ini"
                    />
                  </th>
                )}

                {viewMode === "merah" ? (
                  <>
                    <th className="p-3 text-center align-top">No</th>
                    <th className="p-3 text-center align-top min-w-[140px]">
                      <div className="space-y-2">
                        <span>Kode Owner</span>
                        <input
                          type="text"
                          value={searchKodeOwner}
                          onChange={(e) => setSearchKodeOwner(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Kode"
                          className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                        />
                      </div>
                    </th>
                    <th className="p-3 align-top min-w-[180px]">
                      <div className="space-y-2">
                        <span>Nama Owner</span>
                        <input
                          type="text"
                          value={searchNamaOwner}
                          onChange={(e) => setSearchNamaOwner(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Nama"
                          className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                        />
                      </div>
                    </th>
                    <th className="p-3 align-top min-w-[180px]">
                      <div className="space-y-2">
                        <span>Nama Outlet</span>
                        <input
                          type="text"
                          value={searchNamaOutlet}
                          onChange={(e) => setSearchNamaOutlet(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Outlet"
                          className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                        />
                      </div>
                    </th>
                    <th className="p-3 text-center align-top min-w-[150px]">
                      <div className="space-y-2">
                        <span>PIC Sales</span>
                        <select
                          value={picFilter}
                          onChange={(e) => setPicFilter(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                        >
                          <option value="Semua">Semua PIC</option>
                          {LIST_PIC.map((pic) => (
                            <option key={pic} value={pic}>
                              {pic}
                            </option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="p-3 text-center align-top min-w-[170px]">
                      <div className="space-y-2">
                        <span>Skor</span>
                        <select
                          value={skorFilter}
                          onChange={(e) => setSkorFilter(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                        >
                          <option value="Semua">Semua Skor</option>
                          {LIST_SKOR.map((skor) => (
                            <option key={skor.value} value={skor.value}>
                              {skor.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="p-3 text-center align-top">Action</th>
                  </>
                ) : (
                  <>
                    <th className="p-3 text-center align-top">No</th>
                    <th className="p-3 text-center align-top min-w-[140px]">
                      <div className="space-y-2">
                        <span>Kode Owner</span>
                        <input
                          type="text"
                          value={searchKodeOwner}
                          onChange={(e) => setSearchKodeOwner(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Kode"
                          className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                      </div>
                    </th>
                    <th className="p-3 align-top min-w-[180px]">
                      <div className="space-y-2">
                        <span>Nama Owner</span>
                        <input
                          type="text"
                          value={searchNamaOwner}
                          onChange={(e) => setSearchNamaOwner(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Search Nama"
                          className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                      </div>
                    </th>
                    <th className="p-3 text-center align-top min-w-[150px]">
                      <div className="space-y-2">
                        <span>PIC Sales</span>
                        <select
                          value={picFilter}
                          onChange={(e) => setPicFilter(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        >
                          <option value="Semua">Semua PIC</option>
                          {LIST_PIC.map((pic) => (
                            <option key={pic} value={pic}>
                              {pic}
                            </option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="p-3 text-center align-top">Expired Date</th>
                    <th className="p-3 text-center">Total Transaksi</th>
                    <th className="p-3 text-center align-top min-w-[170px]">
                      <div className="space-y-2">
                        <span>Skor</span>
                        <select
                          value={skorFilter}
                          onChange={(e) => setSkorFilter(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        >
                          <option value="Semua">Semua Skor</option>
                          {LIST_SKOR.map((skor) => (
                            <option key={skor.value} value={skor.value}>
                              {skor.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="p-3">Status Call</th>
                    <th className="p-3">Status Chat</th>
                    <th className="p-3 text-center">Validitas</th>
                    <th className="p-3">Remarks</th>
                    <th className="p-3">Sumber Nasabah</th>
                    <th className="p-3">Finalisasi Paket</th>
                    <th className="p-3 text-right">Nominal Closing</th>
                    <th className="p-3">Catatan</th>
                    <th className="p-3 text-center">Action</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={(viewMode === "merah" ? 7 : 16) + (selectionMode ? 1 : 0)}
                    className="p-8 text-center text-gray-400 font-bold italic"
                  >
                    Data tidak ditemukan pada rentang filter ini.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => (
                  <tr
                    key={row.no || idx}
                    onClick={() => {
                      if (selectionMode) {
                        handleToggleSelectRow(row.no);
                        return;
                      }

                      router.push(`/menu/data-kelolaan/deskripsi-customer?id=${row.no}`);
                    }}
                    className={`border-b border-gray-100 last:border-0 transition-colors cursor-pointer ${
                      selectedIds.includes(row.no)
                        ? "bg-red-100/70 hover:bg-red-100"
                        : "hover:bg-gray-50/80"
                    }`}
                  >
                    {selectionMode && (
                      <td
                        className="p-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.no)}
                          onChange={() => handleToggleSelectRow(row.no)}
                          className="h-4 w-4 cursor-pointer accent-[#C92C1E]"
                        />
                      </td>
                    )}

                    {viewMode === "merah" ? (
                      <>
                        <td className="p-3 text-center text-gray-400 font-bold">
                          {startDataIndex + idx + 1}
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-gray-700 bg-gray-50/20">
                          {row.kodeOwner || "-"}
                        </td>

                        <td className="p-3 font-black text-gray-900 whitespace-normal break-words">
                          {row.namaOwner || "-"}
                        </td>

                        <td className="p-3 text-gray-500 whitespace-normal break-words">
                          {row.outlet || "-"}
                        </td>

                        <td className="p-3 text-center">
                          <PicBadge value={row.pic || ""} color="red" />
                        </td>

                        <td className="p-3 text-center">
                          <SkorBadge item={row} />
                        </td>

                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleOpenCallAction(row)}
                              className="text-gray-600 hover:text-green-600 hover:scale-110 transition"
                              title="Call via WhatsApp"
                            >
                              <CallIcon className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(row, "profil")}
                              className="text-gray-600 hover:text-[#C92C1E] hover:scale-110 transition"
                              title="Edit profil"
                            >
                              <EditIcon className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHapusSatuData(row)}
                              className="text-gray-500 hover:text-red-600 hover:scale-110 transition"
                              title="Hapus data"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-center text-gray-400 font-bold">
                          {startDataIndex + idx + 1}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-gray-700">
                          {row.kodeOwner || "-"}
                        </td>
                        <td className="p-3 font-black text-gray-900 whitespace-normal break-words">
                          {row.namaOwner || "-"}
                        </td>
                        <td className="p-3 text-center">
                          <PicBadge value={row.pic || ""} color="green" />
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-gray-600">
                          {formatTgl(row.expiredDate)}
                        </td>
                        <td className="p-3 text-center font-bold text-gray-900">
                          {row.totalTransaksi}
                        </td>
                        <td className="p-3 text-center">
                          <SkorBadge item={row} />
                        </td>
                        <td className="p-3">
                          <span
                            className={
                              row.callStatus === "NO CALL"
                                ? "text-[#C92C1E] font-bold"
                                : "text-emerald-600 font-bold"
                            }
                          >
                            {row.callStatus || "-"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-700 font-bold">
                            {row.chatStatus || "-"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-1 py-0.5 font-bold rounded text-[10px] ${
                              row.validitas === "VALID"
                                ? "bg-emerald-700 text-white"
                                : "bg-red-600 text-white"
                            }`}
                          >
                            {row.validitas || "-"}
                          </span>
                        </td>
                        <td className="p-3 whitespace-normal break-words max-w-[120px]">
                          <span
                            className={`inline-flex items-center justify-center px-2 py-1 text-[10px] font-black rounded-md text-center whitespace-normal ${getSkorBadgeClass(row)}`}
                          >
                            {getSkorLabel(row)}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider border bg-gray-50 border-gray-200 text-gray-600">
                            {row.sumberNasabah || "Instagram"}
                          </span>
                        </td>
                        <td className="p-3 font-black text-gray-800 whitespace-normal break-words">
                          {row.finalisasiClosing || "Tanpa Paket"}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700">
                          {formatRupiah(row.nominal)}
                        </td>
                        <td className="p-3 text-gray-400 whitespace-normal break-words text-[11px]">
                          {row.noted || "-"}
                        </td>
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleOpenCallAction(row)}
                              className="text-gray-600 hover:text-green-600 hover:scale-110 transition"
                              title="Call via WhatsApp"
                            >
                              <CallIcon className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(row, "scoring")}
                              className="text-gray-600 hover:text-emerald-700 hover:scale-110 transition"
                              title="Edit scoring"
                            >
                              <EditIcon className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHapusSatuData(row)}
                              className="text-gray-500 hover:text-red-600 hover:scale-110 transition"
                              title="Hapus data"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs font-bold text-gray-500">
            Menampilkan{" "}
            <span className="font-black text-gray-900">
              {filteredData.length === 0 ? 0 : startDataIndex + 1}
            </span>{" "}
            -{" "}
            <span className="font-black text-gray-900">{endDataIndex}</span>{" "}
            dari{" "}
            <span className="font-black text-[#C92C1E]">{filteredData.length}</span>{" "}
            data
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={rowsPerPage}
              onChange={(event) => setRowsPerPage(Number(event.target.value))}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 outline-none"
            >
              <option value={10}>10 / halaman</option>
              <option value={25}>25 / halaman</option>
              <option value={50}>50 / halaman</option>
              <option value={100}>100 / halaman</option>
            </select>

            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Awal
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>

            <span className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-[#C92C1E]">
              {safeCurrentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Akhir
            </button>
          </div>
        </div>
      </div>


      <GrafikCustomer dataNasabah={dataNasabah} />

      <CallPage
        customer={callModalItem}
        onClose={() => setCallModalItem(null)}
        onSave={handleSaveCallResult}
      />

      {/* MODAL EDIT PIC DATA TERPILIH */}
      {bulkPicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  Edit PIC Data Terpilih
                </h2>
                <p className="text-xs font-medium text-gray-400">
                  Pilih PIC Sales baru untuk {selectedIds.length} data customer yang dicentang.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBulkPicModal}
                className="h-9 w-9 rounded-full bg-gray-100 font-black text-gray-600 hover:bg-gray-200"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveBulkPic} className="space-y-4 p-5">
              <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4">
                <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                  <FieldIcon type="sales" />
                  PIC Sales Baru
                </label>

                <select
                  value={bulkSelectedPic}
                  onChange={(event) => setBulkSelectedPic(event.target.value)}
                  required
                  className="w-full cursor-pointer rounded-xl border border-red-100 bg-white p-3 text-xs font-black text-gray-700 outline-none focus:border-[#C92C1E]"
                >
                  <option value="">Pilih PIC Sales</option>
                  {LIST_PIC.map((pic) => (
                    <option key={pic} value={pic}>
                      {pic}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-[11px] font-medium text-gray-400">
                  Setelah disimpan, semua data yang dicentang akan berubah ke PIC yang dipilih.
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={closeBulkPicModal}
                  className="rounded-xl border px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#C92C1E] px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#A82216]"
                >
                  Simpan PIC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT PROFIL / SCORING */}
      {editModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-gray-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {modalMode === "profil" ? "Edit Profil Nasabah" : "Edit Scoring Nasabah"}
                </h2>
                <p className="text-xs text-gray-400 font-medium">
                  {modalMode === "profil"
                    ? "Form ini hanya mengubah data utama profil customer."
                    : "Form ini hanya mengubah atribut scoring."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-black"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="p-5 space-y-4">
              {modalMode === "profil" ? (
                <div className="p-4 bg-red-50/30 border border-red-100 rounded-xl space-y-3">
                  <span className="text-[10px] font-black text-[#C92C1E] uppercase tracking-wider block">
                    Atribut Profil Nasabah
                  </span>

                  <div className="grid grid-cols-1 gap-3">
                    <FormInput
                      label="Kode Owner *"
                      icon="code"
                      value={editingItem.kodeOwner || ""}
                      onChange={(value) => updateEditingField("kodeOwner", value)}
                      error={profileValidationErrors.kodeOwner}
                    />
                    <FormInput
                      label="Nama Owner *"
                      icon="user"
                      value={editingItem.namaOwner || ""}
                      onChange={(value) => updateEditingField("namaOwner", value)}
                      error={profileValidationErrors.namaOwner}
                    />
                    <FormInput
                      label="Nama Brand *"
                      icon="brand"
                      value={editingItem.projectBrand || ""}
                      onChange={(value) => updateEditingField("projectBrand", value)}
                      error={profileValidationErrors.projectBrand}
                    />
                    <FormInput
                      label="Nama Outlet *"
                      icon="outlet"
                      value={editingItem.outlet || ""}
                      onChange={(value) => updateEditingField("outlet", value)}
                      error={profileValidationErrors.outlet}
                    />
                    <PhoneInput
                      label="Nomor Telepon Owner *"
                      value={editingItem.noHpOwner || ""}
                      onChange={(value) => updateEditingField("noHpOwner", value)}
                      error={profileValidationErrors.noHpOwner}
                    />
                    <PhoneInput
                      label="Nomor Telepon Outlet *"
                      value={editingItem.noHpOutlet || ""}
                      onChange={(value) => updateEditingField("noHpOutlet", value)}
                      error={profileValidationErrors.noHpOutlet}
                    />
                    <FormSelect
                      label="PIC Sales *"
                      icon="sales"
                      required
                      value={editingItem.pic || ""}
                      options={LIST_PIC}
                      onChange={(value) => updateEditingField("pic", value)}
                      error={profileValidationErrors.pic}
                    />
                    <FormSelect
                      label="Skor / Remarks *"
                      icon="sales"
                      value={String(editingItem.remarks ?? "0")}
                      options={LIST_SKOR.map((item) => item.value)}
                      getLabel={(value) => LIST_SKOR.find((item) => item.value === value)?.label || value}
                      onChange={(value) => {
                        const selected = LIST_SKOR.find((item) => item.value === value);
                        updateEditingField("remarks", value);
                        updateEditingField("scor", selected?.scor ?? 0);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-xl space-y-3">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">
                    Atribut Scoring & Closing
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormInput label="Expired Date" type="date" value={editingItem.expiredDate || ""} onChange={(value) => updateEditingField("expiredDate", value)} />
                    <FormInput label="Total Transaksi" type="number" value={String(editingItem.totalTransaksi || 0)} onChange={(value) => updateEditingField("totalTransaksi", Number(value) || 0)} />
                    <FormSelect
                      label="Skor / Remarks"
                      value={String(editingItem.remarks ?? "0")}
                      options={LIST_SKOR.map((item) => item.value)}
                      getLabel={(value) => LIST_SKOR.find((item) => item.value === value)?.label || value}
                      onChange={(value) => {
                        const selected = LIST_SKOR.find((item) => item.value === value);
                        updateEditingField("remarks", value);
                        updateEditingField("scor", selected?.scor ?? 0);
                      }}
                    />
                    <FormSelect label="Validitas" value={editingItem.validitas || "VALID"} options={validitasOptions} onChange={(value) => updateEditingField("validitas", value)} />
                    <FormSelect label="Call Status" value={editingItem.callStatus || "PENDING"} options={callOptions} onChange={(value) => updateEditingField("callStatus", value)} />
                    <FormSelect label="Chat Status" value={editingItem.chatStatus || "PENDING"} options={chatOptions} onChange={(value) => updateEditingField("chatStatus", value)} />
                    <FormSelect label="Sumber Nasabah" value={editingItem.sumberNasabah || "Instagram"} options={sumberOptions} onChange={(value) => updateEditingField("sumberNasabah", value)} />
                    <FormSelect label="Kategori Paket Closing" value={editingItem.finalisasiClosing || ""} options={paketOptions} getLabel={(value) => value || "Tanpa Paket"} onChange={updateScoringPackage} />

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Nama Promo / Skema Tenor
                      </label>
                      <select
                        value={editingItem.skemaId || ""}
                        onChange={(event) => updateScoringSkema(event.target.value)}
                        className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-600 font-bold text-gray-700 cursor-pointer"
                      >
                        <option value="">Tanpa Skema</option>
                        {currentSkemaList.map((skema) => (
                          <option key={skema.id_skema} value={skema.id_skema}>
                            {skema.nama_promo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <FormInput label="Nominal Closing" type="number" value={String(editingItem.nominal || 0)} onChange={(value) => updateEditingField("nominal", Number(value) || 0)} />

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">
                        Catatan / Noted
                      </label>
                      <input
                        type="text"
                        value={editingItem.noted || ""}
                        onChange={(event) => updateEditingField("noted", event.target.value)}
                        className="w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 border rounded-xl font-bold text-gray-500 hover:bg-gray-50 text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-extrabold text-xs rounded-xl shadow-sm cursor-pointer ${
                    modalMode === "profil"
                      ? "bg-[#C92C1E] hover:bg-[#A82216]"
                      : "bg-emerald-700 hover:bg-emerald-800"
                  }`}
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

  const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCountry =
      PHONE_COUNTRY_OPTIONS.find((country) => country.code === event.target.value) ||
      PHONE_COUNTRY_OPTIONS[0];

    setSelectedCountryCode(nextCountry.code);
    onChange(buildInternationalPhone(nextCountry.dialCode, nationalNumber));
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(buildInternationalPhone(selectedCountry.dialCode, event.target.value));
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
          value={nationalNumber}
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
          Tersimpan sebagai: {value || `${selectedCountry.dialCode}...`}
        </p>
      )}
    </div>
  );
}


function FormInput({
  label,
  value,
  onChange,
  type = "text",
  icon = "code",
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: "code" | "user" | "brand" | "outlet" | "phone" | "sales";
  error?: string;
}) {
  const isRequired = label.includes("*");

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
        <FieldIcon type={icon} />
        {label}
      </label>
      <input
        required={isRequired}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E] font-bold ${
          error ? "border-red-500 bg-red-50" : "border-gray-200"
        }`}
      />
      {error && (
        <p className="text-[10px] font-bold text-red-600">{error}</p>
      )}
    </div>
  );
}

function FormSelect({
  label,
  value,
  options,
  onChange,
  getLabel,
  icon = "sales",
  required = false,
  error,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  getLabel?: (value: string) => string;
  icon?: "code" | "user" | "brand" | "outlet" | "phone" | "sales";
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
        <FieldIcon type={icon} />
        {label}
      </label>
      <select
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E] font-bold text-gray-700 cursor-pointer ${
          error ? "border-red-500 bg-red-50" : "border-gray-200"
        }`}
      >
        {options.map((option) => (
          <option key={option || "empty-option"} value={option}>
            {getLabel ? getLabel(option) : option}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-[10px] font-bold text-red-600">{error}</p>
      )}
    </div>
  );
}