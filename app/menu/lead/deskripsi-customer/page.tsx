"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getLeadInteractions, getLeadTrainings, getLeadClosings, fetchOwnerOutlets } from "@/app/lib/api";

type CallHistoryItem = {
  waktuCall: string;
  picSales: string;
  remark: string;
  conclusion?: string;
};

type TrainingHistoryItem = {
  waktuTraining: string;
  lokasiTraining: string;
};

type PurchaseHistoryItem = {
  paket: string;
  waktuMulai: string;
  waktuBerakhir: string;
  hargaAktual: number;
  snapshot?: {
    paketId: string;
    namaPaket: string;
    hargaPaketBulanan: number;
    promoId: string;
    namaPromo: string;
    tenor: number;
    bonus: number;
    hargaNormal: number;
    diskonPromo: number;
    hargaPromo: number;
    jenisPromo: string;
    bundlingItems: string[];
    potonganTambahan: number;
    kodeUnik: number;
  };
};

type NasabahItem = {
  no?: number;
  ownerId?: number;
  kodeOwner?: string;
  namaOwner?: string;
  projectBrand?: string;
  outlet?: string;
  outlets?: { namaOutlet: string; noHpOutlet?: string }[];
  noHpOwner?: string;
  noHpOutlet?: string;
  sumberCustomer?: string;
  sumberNasabah?: string;
  pic?: string;
  remarks?: string;
  scor?: number;
  statusAkun?: string;
  kodeMitra?: string;
  namaMitra?: string;
  ownerMitra?: string;
  kategoriMitra?: string;
  tanggalFu?: string;
  totalFu?: number;
  noted?: string;
  callStatus?: string;
  chatStatus?: string;
  callHistories?: CallHistoryItem[];
  trainingSessions?: string[];
  trainingHistories?: TrainingHistoryItem[];
  salesPlan?: {
    packageType: string;
    durationMonth: number;
    packagePrice: number;
    transferCode: number;
    discount: number;
    actualSale: number;
  };
  purchaseHistories?: PurchaseHistoryItem[];
};

const FALLBACK_CUSTOMER: NasabahItem = {
  no: 1,
  kodeOwner: "#1111",
  namaOwner: "Nama Owner",
  projectBrand: "Nama Brand",
  outlet: "Nama outlet",
  noHpOwner: "08123956789",
  noHpOutlet: "08123456789",
  sumberCustomer: "",
  pic: "Sales B",
  remarks: "3",
  scor: 3,
  statusAkun: "Berlangganan",
  kodeMitra: "#1423",
  namaMitra: "PT. Cuci Baju Sentosa",
  ownerMitra: "Wati Wati",
  kategoriMitra: "Mitra Referral",
  tanggalFu: "30 Jul 2026, 16.30 WIB",
  totalFu: 4,
  callHistories: [],
  trainingHistories: [],
  purchaseHistories: [],
};

const getRemarkLabel = (item: NasabahItem) => {
  const value = String(item.remarks ?? item.scor ?? "0");

  if (value === "3") return "Langganan (3)";
  if (value === "2") return "Potensial (2)";
  if (value === "1") return "Kemungkinan Potensial (1)";

  return "Tidak Potensial (0)";
};

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const getToneClass = (text: string) => {
  const lower = text.toLowerCase();

  if (lower.includes("(0)") || lower.includes("tidak")) {
    return "border-red-100 bg-red-100 text-red-700";
  }

  if (lower.includes("incoming") || lower.includes("(1)")) {
    return "border-blue-100 bg-blue-100 text-blue-700";
  }

  if (lower.includes("trial") || lower.includes("(2)") || lower.includes("offline")) {
    return "border-yellow-100 bg-yellow-100 text-yellow-800";
  }

  if (lower.includes("(3)") || lower.includes("berlangganan") || lower.includes("online")) {
    return "border-emerald-100 bg-emerald-100 text-emerald-700";
  }

  if (lower.includes("business")) {
    return "border-yellow-100 bg-yellow-100 text-yellow-800";
  }

  return "border-gray-100 bg-gray-100 text-gray-700";
};

const getSumberCustomerValue = (item: NasabahItem) => {
  return item.sumberNasabah || item.sumberCustomer || "-";
};


const isValidOwnerOutletName = (value?: string) => {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (!normalizedValue) return false;

  return ![
    "-",
    "nama outlet",
    "nama outlet aktif",
    "nothing laundry",
    "tampilkan jika ada",
  ].includes(normalizedValue);
};

const getSumberTagClass = (value?: string) => {
  const lower = String(value || "").toLowerCase();

  if (lower.includes("instagram") || lower.includes("ig")) {
    return "border-pink-200 bg-pink-50 text-pink-700";
  }

  if (lower.includes("facebook") || lower.includes("fb")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (lower.includes("tiktok") || lower.includes("tik tok")) {
    return "border-gray-300 bg-gray-900 text-white";
  }

  if (lower.includes("mitra")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (lower.includes("playstore") || lower.includes("play store")) {
    return "border-red-200 bg-red-50 text-[#C92C1E]";
  }

  return "border-gray-200 bg-gray-50 text-gray-600";
};

const normalizePhone = (phone?: string) => {
  const digitsOnly = String(phone || "").replace(/\D/g, "");

  if (!digitsOnly) return "";
  if (digitsOnly.startsWith("0")) return `62${digitsOnly.slice(1)}`;
  if (digitsOnly.startsWith("62")) return digitsOnly;

  return digitsOnly;
};

const PHONE_COUNTRY_OPTIONS = [
  { code: "ID", flag: "🇮🇩", dialCode: "+62", placeholder: "812-3456-7890" },
  { code: "MY", flag: "🇲🇾", dialCode: "+60", placeholder: "12-345-6789" },
  { code: "SG", flag: "🇸🇬", dialCode: "+65", placeholder: "8123-4567" },
  { code: "TH", flag: "🇹🇭", dialCode: "+66", placeholder: "81-234-5678" },
  { code: "PH", flag: "🇵🇭", dialCode: "+63", placeholder: "912-345-6789" },
  { code: "VN", flag: "🇻🇳", dialCode: "+84", placeholder: "91-234-5678" },
  { code: "BN", flag: "🇧🇳", dialCode: "+673", placeholder: "712-3456" },
  { code: "KH", flag: "🇰🇭", dialCode: "+855", placeholder: "12-345-678" },
  { code: "LA", flag: "🇱🇦", dialCode: "+856", placeholder: "20-1234-5678" },
  { code: "MM", flag: "🇲🇲", dialCode: "+95", placeholder: "9-123-456789" },
  { code: "TL", flag: "🇹🇱", dialCode: "+670", placeholder: "7721-2345" },
  { code: "US", flag: "🇺🇸", dialCode: "+1", placeholder: "123-456-7890" },
  { code: "CA", flag: "🇨🇦", dialCode: "+1", placeholder: "123-456-7890" },
  { code: "MX", flag: "🇲🇽", dialCode: "+52", placeholder: "55-1234-5678" },
  { code: "BR", flag: "🇧🇷", dialCode: "+55", placeholder: "11-91234-5678" },
  { code: "AR", flag: "🇦🇷", dialCode: "+54", placeholder: "9-11-1234-5678" },
  { code: "CL", flag: "🇨🇱", dialCode: "+56", placeholder: "9-1234-5678" },
  { code: "CO", flag: "🇨🇴", dialCode: "+57", placeholder: "300-123-4567" },
  { code: "GB", flag: "🇬🇧", dialCode: "+44", placeholder: "7700-900123" },
  { code: "FR", flag: "🇫🇷", dialCode: "+33", placeholder: "6-12-34-56-78" },
  { code: "DE", flag: "🇩🇪", dialCode: "+49", placeholder: "1512-3456789" },
  { code: "IT", flag: "🇮🇹", dialCode: "+39", placeholder: "312-345-6789" },
  { code: "ES", flag: "🇪🇸", dialCode: "+34", placeholder: "612-345-678" },
  { code: "NL", flag: "🇳🇱", dialCode: "+31", placeholder: "6-12345678" },
  { code: "BE", flag: "🇧🇪", dialCode: "+32", placeholder: "470-12-34-56" },
  { code: "CH", flag: "🇨🇭", dialCode: "+41", placeholder: "78-123-45-67" },
  { code: "SE", flag: "🇸🇪", dialCode: "+46", placeholder: "70-123-45-67" },
  { code: "NO", flag: "🇳🇴", dialCode: "+47", placeholder: "412-34-567" },
  { code: "DK", flag: "🇩🇰", dialCode: "+45", placeholder: "20-12-34-56" },
  { code: "FI", flag: "🇫🇮", dialCode: "+358", placeholder: "40-123-4567" },
  { code: "IE", flag: "🇮🇪", dialCode: "+353", placeholder: "85-123-4567" },
  { code: "PT", flag: "🇵🇹", dialCode: "+351", placeholder: "912-345-678" },
  { code: "PL", flag: "🇵🇱", dialCode: "+48", placeholder: "512-345-678" },
  { code: "TR", flag: "🇹🇷", dialCode: "+90", placeholder: "532-123-4567" },
  { code: "RU", flag: "🇷🇺", dialCode: "+7", placeholder: "912-345-6789" },
  { code: "CN", flag: "🇨🇳", dialCode: "+86", placeholder: "138-0013-8000" },
  { code: "JP", flag: "🇯🇵", dialCode: "+81", placeholder: "90-1234-5678" },
  { code: "KR", flag: "🇰🇷", dialCode: "+82", placeholder: "10-1234-5678" },
  { code: "IN", flag: "🇮🇳", dialCode: "+91", placeholder: "98765-43210" },
  { code: "PK", flag: "🇵🇰", dialCode: "+92", placeholder: "300-1234567" },
  { code: "BD", flag: "🇧🇩", dialCode: "+880", placeholder: "1712-345678" },
  { code: "LK", flag: "🇱🇰", dialCode: "+94", placeholder: "71-234-5678" },
  { code: "SA", flag: "🇸🇦", dialCode: "+966", placeholder: "50-123-4567" },
  { code: "AE", flag: "🇦🇪", dialCode: "+971", placeholder: "50-123-4567" },
  { code: "QA", flag: "🇶🇦", dialCode: "+974", placeholder: "3312-3456" },
  { code: "KW", flag: "🇰🇼", dialCode: "+965", placeholder: "500-12345" },
  { code: "OM", flag: "🇴🇲", dialCode: "+968", placeholder: "9212-3456" },
  { code: "AU", flag: "🇦🇺", dialCode: "+61", placeholder: "412-345-678" },
  { code: "NZ", flag: "🇳🇿", dialCode: "+64", placeholder: "21-123-4567" },
  { code: "ZA", flag: "🇿🇦", dialCode: "+27", placeholder: "82-123-4567" },
  { code: "EG", flag: "🇪🇬", dialCode: "+20", placeholder: "100-123-4567" },
  { code: "NG", flag: "🇳🇬", dialCode: "+234", placeholder: "803-123-4567" },
  { code: "KE", flag: "🇰🇪", dialCode: "+254", placeholder: "712-345-678" },
  { code: "MA", flag: "🇲🇦", dialCode: "+212", placeholder: "612-345678" },
];

const getPhoneCountryByNumber = (phone?: string) => {
  const rawValue = String(phone || "").trim();
  const digitsOnly = rawValue.replace(/\D/g, "");

  if (!digitsOnly) return PHONE_COUNTRY_OPTIONS[0];

  if (rawValue.startsWith("+")) {
    const sortedCountries = [...PHONE_COUNTRY_OPTIONS].sort(
      (a, b) => b.dialCode.length - a.dialCode.length,
    );

    return (
      sortedCountries.find((country) =>
        digitsOnly.startsWith(country.dialCode.replace(/\D/g, "")),
      ) || PHONE_COUNTRY_OPTIONS[0]
    );
  }

  if (digitsOnly.startsWith("0")) {
    return PHONE_COUNTRY_OPTIONS[0];
  }

  const sortedCountries = [...PHONE_COUNTRY_OPTIONS].sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  );

  return (
    sortedCountries.find((country) =>
      digitsOnly.startsWith(country.dialCode.replace(/\D/g, "")),
    ) || PHONE_COUNTRY_OPTIONS[0]
  );
};

const formatNationalByPlaceholder = (value: string, placeholder: string) => {
  const digitsOnly = value.replace(/\D/g, "");
  const groups = placeholder.split("-").map((group) => group.replace(/\D/g, "").length);
  const formattedGroups: string[] = [];
  let cursor = 0;

  groups.forEach((groupLength) => {
    if (cursor >= digitsOnly.length) return;

    const nextValue = digitsOnly.slice(cursor, cursor + groupLength);

    if (nextValue) {
      formattedGroups.push(nextValue);
    }

    cursor += groupLength;
  });

  if (cursor < digitsOnly.length) {
    formattedGroups.push(digitsOnly.slice(cursor));
  }

  return formattedGroups.join("-");
};

const formatPhoneWithDash = (phone?: string) => {
  const rawValue = String(phone || "").trim();
  const digitsOnly = rawValue.replace(/\D/g, "");

  if (!digitsOnly) return "-";

  const country = getPhoneCountryByNumber(rawValue);
  const dialCodeDigits = country.dialCode.replace(/\D/g, "");

  const nationalNumber =
    rawValue.startsWith("+") || digitsOnly.startsWith(dialCodeDigits)
      ? digitsOnly.slice(dialCodeDigits.length)
      : digitsOnly.startsWith("0")
        ? digitsOnly.slice(1)
        : digitsOnly;

  const formattedNational = formatNationalByPlaceholder(
    nationalNumber,
    country.placeholder,
  );

  return formattedNational
    ? `${country.dialCode} ${formattedNational}`
    : country.dialCode;
};

const openWhatsApp = (phone?: string) => {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    alert("Nomor belum tersedia.");
    return;
  }

  window.open(`https://wa.me/${normalizedPhone}`, "_blank", "noopener,noreferrer");
};

const UserAvatarIcon = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0"
    />
  </svg>
);







const ChatBubbleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h5.25M21 12c0 4.142-4.03 7.5-9 7.5a10.7 10.7 0 01-3.58-.61L3 20.25l1.58-4.11A6.93 6.93 0 013 12c0-4.142 4.03-7.5 9-7.5s9 3.358 9 7.5z" />
  </svg>
);


const findOutletPhoneByName = (
  outlets: { namaOutlet: string; noHpOutlet?: string }[],
  outletName?: string,
) => {
  const normalizedOutletName = String(outletName || "").trim().toLowerCase();

  if (!normalizedOutletName) return "";

  return (
    outlets.find(
      (outletItem) =>
        String(outletItem.namaOutlet || "").trim().toLowerCase() === normalizedOutletName,
    )?.noHpOutlet || ""
  );
};


function InfoInput({
  label,
  value,
  action,
}: {
  label: string;
  value?: string;
  action?: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <div className="flex gap-2">
        <input
          value={value || "-"}
          readOnly
          className="min-w-0 flex-1 rounded-lg border border-red-100 bg-white px-2.5 py-2 text-[11px] font-bold text-gray-700 outline-none"
        />

        {action}
      </div>
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black ${getToneClass(
        String(children),
      )}`}
    >
      {children}
    </span>
  );
}

function SourceTag({ value }: { value?: string }) {
  const safeValue = value && value.trim() ? value.trim() : "-";

  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-wide text-gray-500">
        Sumber Owner
      </span>

      <div className="rounded-lg border border-red-100 bg-white px-2.5 py-2">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black ${getSumberTagClass(
            safeValue,
          )}`}
        >
          #{safeValue}
        </span>
      </div>
    </label>
  );
}



function OutletNameList({
  outlets,
  activeOutlet,
  onSelect,
}: {
  outlets: string[];
  activeOutlet?: string;
  onSelect: (outlet: string) => void;
}) {
  if (outlets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-red-100 bg-red-50/40 px-3 py-3 text-[11px] font-bold text-gray-400">
        Belum ada outlet yang tersimpan untuk owner ini.
      </div>
    );
  }

  return (
    <div className="space-y-2">

      <div className="flex max-w-md flex-wrap gap-2 rounded-lg border border-red-100 bg-white px-2.5 py-2">
        {outlets.map((outlet, index) => {
          const isActive = outlet === activeOutlet;

          return (
            <button
              key={`${outlet}-${index}`}
              type="button"
              onClick={() => onSelect(outlet)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-black transition-none ${
                isActive
                  ? "border-[#C92C1E]/30 bg-red-50 text-[#C92C1E]"
                  : "border-gray-200 bg-gray-50 text-gray-600"
              }`}
            >
              {outlet}
            </button>
          );
        })}
      </div>
    </div>
  );
}


function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 border-t border-red-100 pt-4 text-center">
      <h2 className="text-lg font-black tracking-tight text-[#C92C1E]">
        {children}
      </h2>
    </div>
  );
}

function Timeline({
  items,
  color = "emerald",
}: {
  items: string[];
  color?: "emerald" | "orange";
}) {
  const lineColor = color === "orange" ? "border-orange-400" : "border-emerald-400";

  return (
    <div className="relative ml-1 space-y-0">
      <div className={`absolute left-[6px] top-4 h-[calc(100%-16px)] border-l-2 border-dotted ${lineColor}`} />

      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className="relative z-10 flex min-h-8 items-center gap-2.5 text-[11px] font-black text-gray-700"
        >
          <span className="h-3.5 w-3.5 rounded-full border-2 border-emerald-500 bg-yellow-100" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function DeskripsiLanggananContent() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");
  const [customer, setCustomer] = useState<NasabahItem>(FALLBACK_CUSTOMER);
  const [showAllComments, setShowAllComments] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [realOutlets, setRealOutlets] = useState<{namaOutlet: string, noHpOutlet: string}[]>([]);
  const [editCustomer, setEditCustomer] = useState<NasabahItem>(FALLBACK_CUSTOMER);


  useEffect(() => {
    if (typeof window === "undefined") return;

    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
    document.documentElement.style.overflow = "";
    document.documentElement.style.height = "";

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
    };
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem("piposmart_nasabah_data");

    if (!cached) return;

    try {
      const parsed = JSON.parse(cached);
      const listData: NasabahItem[] = Array.isArray(parsed) ? parsed : [];
      const selectedCustomer =
        listData.find((item) => String(item.no) === String(customerId)) || listData[0];

      if (selectedCustomer) {
        setCustomer({
          ...FALLBACK_CUSTOMER,
          ...selectedCustomer,
        });
      }
    } catch {
      setCustomer(FALLBACK_CUSTOMER);
    }
  }, [customerId]);

  useEffect(() => {
    if (customer.ownerId) {
      fetchOwnerOutlets(customer.ownerId).then(data => {
        if (data) {
          setRealOutlets(data.map(o => ({
            namaOutlet: o.name,
            noHpOutlet: o.phone || ""
          })));
        }
      }).catch(console.error);
    }
  }, [customer.ownerId]);

  // Load real interaction & training history from backend
  useEffect(() => {
    const id = Number(customerId);
    if (!id || isNaN(id)) return;

    Promise.all([
      getLeadInteractions(id).catch(() => []),
      getLeadTrainings(id).catch(() => []),
      getLeadClosings(id).catch(() => []),
    ]).then(([interactions, trainings, closings]) => {
      if (interactions.length > 0 || trainings.length > 0 || closings.length > 0) {
        const callHistories: CallHistoryItem[] = interactions.map((i) => ({
          waktuCall: new Date(i.interaction_at).toLocaleString("id-ID"),
          picSales: i.sales?.name || i.supervisor?.name || "-",
          remark: i.remark_label || (i.remark_score !== undefined && i.remark_score !== null
            ? String(i.remark_score)
            : "-"),
          conclusion: i.note || "-",
        }));

        const trainingHistories: TrainingHistoryItem[] = trainings.map((t) => ({
          waktuTraining: t.scheduled_at
            ? new Date(t.scheduled_at).toLocaleString("id-ID")
            : "-",
          lokasiTraining: t.location || t.training_type || "-",
        }));

        const purchaseHistories: PurchaseHistoryItem[] = closings.map((c: any) => {
          let waktuMulai = "-";
          let waktuBerakhir = "-";

          if (c.closed_at) {
             const startDate = new Date(c.closed_at);
             waktuMulai = startDate.toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' });
             
             if (c.duration_days) {
               const endDate = new Date(startDate);
               endDate.setDate(endDate.getDate() + c.duration_days);
               waktuBerakhir = endDate.toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' });
             } else if (c.plan_snapshot?.duration_days) {
               const endDate = new Date(startDate);
               endDate.setDate(endDate.getDate() + c.plan_snapshot.duration_days);
               waktuBerakhir = endDate.toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' });
             }
          }

          let snapshot: PurchaseHistoryItem['snapshot'] = undefined;
          
          if (c.plan_snapshot || c.package_snapshot) {
             snapshot = {
                paketId: c.package?.code || c.package_snapshot?.code || "-",
                namaPaket: c.package?.name || c.package_snapshot?.name || "-",
                hargaPaketBulanan: Number(c.package_snapshot?.price || 0),
                promoId: c.promotion?.code || c.promotion_snapshot?.code || "-",
                namaPromo: c.plan?.name || c.plan_snapshot?.name || "-",
                tenor: c.tenure_months || c.plan_snapshot?.tenure_months || 0,
                bonus: 0,
                hargaNormal: Number(c.base_price || c.plan_snapshot?.price || 0),
                diskonPromo: Number(c.discount_amount || 0),
                hargaPromo: Number(c.base_price || 0) - Number(c.discount_amount || 0),
                jenisPromo: c.promotion_snapshot?.type || "Standard",
                bundlingItems: [],
                potonganTambahan: 0,
                kodeUnik: Number(c.unique_transfer_code || 0)
             };
          }

          return {
            paket: c.plan?.name || c.package?.name || "-",
            waktuMulai,
            waktuBerakhir,
            hargaAktual: Number(c.final_amount) || 0,
            snapshot
          };
        });

        setCustomer(prev => ({
          ...prev,
          callHistories: callHistories.length > 0 ? callHistories : prev.callHistories,
          trainingHistories: trainingHistories.length > 0 ? trainingHistories : prev.trainingHistories,
          purchaseHistories: purchaseHistories.length > 0 ? purchaseHistories : prev.purchaseHistories,
          totalFu: callHistories.length || prev.totalFu,
        }));
      }
    });
  }, [customerId]);


  const callHistories = useMemo(() => {
    return customer.callHistories || [];
  }, [customer]);

  const visibleCallComments = showAllComments
    ? callHistories.slice().reverse()
    : callHistories.slice().reverse().slice(0, 3);

  const trainingHistories = useMemo(() => {
    if (customer.trainingHistories?.length) return customer.trainingHistories;

    if (customer.trainingSessions?.length) {
      return customer.trainingSessions.map((session) => {
        const [lokasiTraining, ...dateParts] = session.split(",");

        return {
          lokasiTraining: lokasiTraining?.trim() || "-",
          waktuTraining: dateParts.join(",").trim() || "-",
        };
      });
    }

    return [];
  }, [customer]);

  const purchaseHistories = useMemo(() => {
    if (customer.purchaseHistories?.length) return customer.purchaseHistories;

    if (customer.salesPlan) {
      return [
        {
          paket: customer.salesPlan.packageType || "Business",
          waktuMulai: "17 Juni 2026",
          waktuBerakhir: "17 Desember 2026",
          hargaAktual: customer.salesPlan.actualSale || 0,
        },
      ];
    }

    return [];
  }, [customer]);

  const ownerOutlets = useMemo(() => {
    if (realOutlets.length > 0) {
      return realOutlets;
    }

    const fallbackOutlets = isValidOwnerOutletName(customer.outlet)
      ? [
          {
            namaOutlet: customer.outlet as string,
            noHpOutlet: customer.noHpOutlet || "",
          },
        ]
      : [];

    if (typeof window === "undefined") return fallbackOutlets;

    const kodeOwner = String(customer.kodeOwner || "").trim();

    if (!kodeOwner) {
      return fallbackOutlets;
    }

    const cached = localStorage.getItem("piposmart_nasabah_data");

    if (!cached) {
      return fallbackOutlets;
    }

    try {
      const parsed = JSON.parse(cached);
      const listData: NasabahItem[] = Array.isArray(parsed) ? parsed : [];

      const outletsFromData = listData
        .filter((item) => String(item.kodeOwner || "").trim() === kodeOwner)
        .flatMap((item) => {
          const outletList = item.outlets?.length
            ? item.outlets.map((outletItem) => ({
                namaOutlet: outletItem.namaOutlet,
                noHpOutlet: outletItem.noHpOutlet || item.noHpOutlet || "",
              }))
            : [];

          return [
            ...outletList,
            ...(isValidOwnerOutletName(item.outlet)
              ? [
                  {
                    namaOutlet: item.outlet as string,
                    noHpOutlet: item.noHpOutlet || "",
                  },
                ]
              : []),
          ];
        })
        .map((outletItem) => ({
          namaOutlet: String(outletItem.namaOutlet || "").trim(),
          noHpOutlet: String(outletItem.noHpOutlet || "").trim(),
        }))
        .filter((outletItem) => isValidOwnerOutletName(outletItem.namaOutlet));

      const combinedOutlets = [
        ...outletsFromData,
        ...fallbackOutlets,
      ];

      return Array.from(
        new Map(
          combinedOutlets.map((outletItem) => [
            outletItem.namaOutlet.toLowerCase(),
            outletItem,
          ]),
        ).values(),
      );
    } catch {
      return fallbackOutlets;
    }
  }, [customer.kodeOwner, customer.outlet, customer.noHpOutlet, realOutlets]);

  const ownerOutletNames = useMemo(() => {
    return ownerOutlets.map((outletItem) => outletItem.namaOutlet);
  }, [ownerOutlets]);

  const handleSelectOutlet = (selectedOutlet: string) => {
    const selectedOutletPhone = findOutletPhoneByName(ownerOutlets, selectedOutlet);

    const nextOwner = {
      ...customer,
      outlet: selectedOutlet,
      noHpOutlet: selectedOutletPhone || customer.noHpOutlet || "",
    };

    setCustomer(nextOwner);

    const cached = localStorage.getItem("piposmart_nasabah_data");

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const listData: NasabahItem[] = Array.isArray(parsed) ? parsed : [];
        const nextData = listData.map((item) =>
          String(item.no) === String(nextOwner.no)
            ? nextOwner
            : String(item.kodeOwner || "").trim() === String(nextOwner.kodeOwner || "").trim() &&
                String(item.outlet || "").trim().toLowerCase() ===
                  selectedOutlet.trim().toLowerCase()
              ? {
                  ...item,
                  noHpOutlet: selectedOutletPhone || item.noHpOutlet || "",
                }
              : item,
        );

        localStorage.setItem("piposmart_nasabah_data", JSON.stringify(nextData));
      } catch {
        localStorage.setItem("piposmart_nasabah_data", JSON.stringify([nextOwner]));
      }
    }
  };

  const openEditModal = () => {
    const sourceValue = getSumberCustomerValue(customer);

    setEditCustomer({
      ...customer,
      sumberCustomer: sourceValue,
      sumberNasabah: sourceValue,
    });
    setIsEditOpen(true);
  };

  const updateEditField = <K extends keyof NasabahItem>(
    field: K,
    value: NasabahItem[K],
  ) => {
    setEditCustomer((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateEditSource = (value: string) => {
    setEditCustomer((prev) => ({
      ...prev,
      sumberCustomer: value,
      sumberNasabah: value,
    }));
  };

  const handleSaveEdit = () => {
    const sourceValue = getSumberCustomerValue(editCustomer);
    const selectedOutletPhone = findOutletPhoneByName(ownerOutlets, editCustomer.outlet);

    const nextOwner = {
      ...customer,
      ...editCustomer,
      noHpOutlet: selectedOutletPhone || editCustomer.noHpOutlet || "",
      sumberCustomer: sourceValue,
      sumberNasabah: sourceValue,
    };

    setCustomer(nextOwner);

    const cached = localStorage.getItem("piposmart_nasabah_data");

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const listData: NasabahItem[] = Array.isArray(parsed) ? parsed : [];
        const nextData = listData.map((item) =>
          String(item.no) === String(nextOwner.no)
            ? nextOwner
            : String(item.kodeOwner || "").trim() === String(nextOwner.kodeOwner || "").trim() &&
                String(item.outlet || "").trim().toLowerCase() ===
                  String(nextOwner.outlet || "").trim().toLowerCase()
              ? {
                  ...item,
                  noHpOutlet: nextOwner.noHpOutlet,
                }
              : item,
        );

        localStorage.setItem("piposmart_nasabah_data", JSON.stringify(nextData));
      } catch {
        localStorage.setItem("piposmart_nasabah_data", JSON.stringify([nextOwner]));
      }
    } else {
      localStorage.setItem("piposmart_nasabah_data", JSON.stringify([nextOwner]));
    }

    setIsEditOpen(false);
  };

  return (
    <div className="mx-auto min-min-h-screen max-w-5xl space-y-4 rounded-[28px] border border-red-100 bg-[#FFF8F6] p-4 pb-12 text-gray-900 shadow-sm">
      <div className="flex items-center justify-end">
        <Link
          href="/menu/lead"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#C92C1E] bg-[#C92C1E] px-5 py-2.5 text-sm font-black text-white shadow-md transition-all duration-200 hover:bg-[#A82216] hover:shadow-lg active:translate-y-0 active:scale-[0.98]"
        >
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Kembali
        </Link>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-red-100 bg-white p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-[#C92C1E]">
            <UserAvatarIcon className="h-7 w-7" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black uppercase tracking-tight">
              {customer.namaOwner || "Nama Owner"}
            </h1>
            <p className="mt-1 text-base font-black text-gray-600">
              {customer.projectBrand || "Nama Brand"}
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="rounded-lg border border-red-100 bg-red-50/40 px-2.5 py-1.5 text-[11px] font-black">
                kode owner : <span className="text-[#C92C1E]">{customer.kodeOwner || "#1111"}</span>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50/40 px-2.5 py-1.5 text-[11px] font-black">
                PIC Sales : <span className="text-[#C92C1E]">{customer.pic || "Nama PIC"}</span>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50/40 px-2.5 py-1.5 text-[11px] font-black">
                Mitra : <span className="text-[#C92C1E]">{customer.kategoriMitra || "tampilkan jika ada"}</span>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50/40 px-2.5 py-1.5 text-[11px] font-black">
                skor owner : <span className="text-[#C92C1E]">{getRemarkLabel(customer)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={openEditModal}
            className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-xs font-black text-blue-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
          >
            Edit
          </button>
          <button
            onClick={() => openWhatsApp(customer.noHpOwner || customer.noHpOutlet)}
            className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-xs font-black text-emerald-700 shadow-sm transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
          >
            Call 📞
          </button>
        </div>
      </section>

      <SectionTitle>Detail Owner</SectionTitle>

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-red-100 bg-white p-4 lg:grid-cols-2">
        <InfoInput label="Kode Owner" value={customer.kodeOwner || "#1111"} />
        <InfoInput label="Nama Owner" value={customer.namaOwner || "Nama Owner"} />
        <InfoInput
          label="Nomor Handphone Owner"
          value={formatPhoneWithDash(customer.noHpOwner || "08123956789")}
          action={
            <button
              onClick={() => openWhatsApp(customer.noHpOwner)}
              className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-100 px-3 text-[10px] font-black text-emerald-700 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-200 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
            >
              hubungi 📞
            </button>
          }
        />
        <InfoInput label="Nama Brand" value={customer.projectBrand || "Nama Brand"} />

        <label className="block space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wide text-gray-500">
            Nama-Nama Outlet Owner
          </span>

          <OutletNameList
            outlets={ownerOutletNames}
            activeOutlet={customer.outlet}
            onSelect={handleSelectOutlet}
          />

          <p className="text-[10px] font-medium text-gray-400">
            Klik nama outlet untuk memilih outlet aktif owner ini.
          </p>
        </label>

        <InfoInput
          label="Nomor Handphone Outlet"
          value={formatPhoneWithDash(customer.noHpOutlet || "08123456789")}
          action={
            <button
              onClick={() => openWhatsApp(customer.noHpOutlet)}
              className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-100 px-3 text-[10px] font-black text-emerald-700 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-200 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
            >
              hubungi 📞
            </button>
          }
        />
        <SourceTag value={getSumberCustomerValue(customer)} />
      </section>

      <SectionTitle>Detail Mitra</SectionTitle>

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-red-100 bg-white p-4 lg:grid-cols-2">
        <InfoInput label="Kode Mitra" value={customer.kodeMitra || "#1423"} />
        <InfoInput label="Nama Mitra" value={customer.namaMitra || "PT. Cuci Baju Sentosa"} />
        <InfoInput label="Owner Mitra" value={customer.ownerMitra || "Wati Wati"} />
        <InfoInput label="Kategori Mitra" value={customer.kategoriMitra || "Mitra Referral"} />
      </section>

      <SectionTitle>Riwayat Call n Chat</SectionTitle>

      <section className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-red-50 text-[#C92C1E]">
            <tr>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">No</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">Waktu Call</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">PIC Sales</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">Remark</th>
            </tr>
          </thead>
          <tbody>
            {callHistories.length === 0 ? (
              <tr>
                <td colSpan={4} className="border border-red-100 px-2.5 py-5 text-center text-sm font-bold text-gray-400">
                  Belum ada riwayat call n chat.
                </td>
              </tr>
            ) : (
              callHistories.map((item, index) => (
                <tr key={`${item.waktuCall}-${index}`}>
                  <td className="border border-red-100 px-2.5 py-2 text-center font-black">{index + 1}</td>
                  <td className="border border-red-100 px-2.5 py-2 font-bold">{item.waktuCall}</td>
                  <td className="border border-red-100 px-2.5 py-2 text-center">
                    <Badge>{item.picSales}</Badge>
                  </td>
                  <td className="border border-red-100 px-2.5 py-2">
                    <Badge>{item.remark}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-red-100 bg-white p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-black text-[#C92C1E]"><ChatBubbleIcon /> Comment Call And Chat</p>

        <div className="space-y-4">
          {callHistories.length === 0 ? (
            <p className="rounded-xl bg-red-50/40 px-3 py-4 text-center text-xs font-bold text-gray-400">
              Belum ada comment call and chat.
            </p>
          ) : (
            visibleCallComments.map((item, index) => (
                <div key={`${item.waktuCall}-comment-${index}`} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-black text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <UserAvatarIcon className="h-4 w-4 text-[#4C2B7A]" />
                      {item.picSales}
                    </span>
                    <span>{item.waktuCall}</span>
                  </div>

                  <p className="rounded-xl bg-red-50/40 px-3 py-2 text-xs font-medium leading-relaxed text-gray-600">
                    {item.conclusion || "Belum ada komentar call dan chat."}
                  </p>
                </div>
              ))
          )}
        </div>

        {callHistories.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllComments((prev) => !prev)}
            className="mx-auto mt-4 block cursor-pointer rounded-full px-3 py-1.5 text-xs font-black text-gray-500 transition-all duration-200 hover:bg-red-50 hover:text-[#C92C1E] active:translate-y-0 active:scale-[0.98]"
          >
            {showAllComments ? "Show Less ˄" : "Show More ˅"}
          </button>
        )}
      </section>

      <SectionTitle>Riwayat Training</SectionTitle>

      <Timeline
        items={[
          "Owner belum training",
          ...trainingHistories.map(
            (item) => `${item.lokasiTraining}, ${item.waktuTraining}`,
          ),
        ]}
      />

      <section className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-red-50 text-[#C92C1E]">
            <tr>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">No</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">Waktu Training</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">Lokasi Training</th>
            </tr>
          </thead>
          <tbody>
            {trainingHistories.length === 0 ? (
              <tr>
                <td colSpan={3} className="border border-red-100 px-2.5 py-5 text-center text-sm font-bold text-gray-400">
                  Belum ada riwayat training.
                </td>
              </tr>
            ) : (
              trainingHistories.map((item, index) => (
                <tr key={`${item.waktuTraining}-${index}`}>
                  <td className="border border-red-100 px-2.5 py-2 text-center font-black">{index + 1}</td>
                  <td className="border border-red-100 px-2.5 py-2 font-bold">{item.waktuTraining}</td>
                  <td className="border border-red-100 px-2.5 py-2">
                    <Badge>{item.lokasiTraining}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <SectionTitle>Riwayat Pembelian</SectionTitle>

      <Timeline
        color="orange"
        items={purchaseHistories.map(
          (item) =>
            `Paket ${item.paket}, Dimulai ${item.waktuMulai}, Berakhir ${item.waktuBerakhir}`,
        )}
      />

      <section className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
        {purchaseHistories.length === 0 ? (
          <div className="p-5 text-center text-sm font-bold text-gray-400">
            Belum ada riwayat pembelian.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {purchaseHistories.map((item, index) => {
              if (item.snapshot) {
                const s = item.snapshot;
                return (
                  <div key={index} className="p-5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge>{s.namaPaket}</Badge>
                          <span className="text-xs font-bold text-gray-400">ID: {s.promoId}</span>
                        </div>
                        <h4 className="text-lg font-black text-gray-900">{s.namaPromo}</h4>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                          {s.jenisPromo}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-400">Total Bayar</p>
                        <p className="text-xl font-black text-[#C92C1E]">{formatRupiah(item.hargaAktual)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Periode Aktif</p>
                        <p className="text-sm font-bold text-gray-800">{item.waktuMulai} - {item.waktuBerakhir}</p>
                        <p className="text-xs font-bold text-blue-600 mt-0.5">
                          {s.tenor} Bulan {s.bonus > 0 ? `+ ${s.bonus} Bln Bonus` : ''} 
                          ({(s.tenor + s.bonus) * 30} Hari)
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Rincian Harga</p>
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Harga Normal</span>
                            <span className="font-bold text-gray-400 line-through">{formatRupiah(s.hargaNormal)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Diskon Promo</span>
                            <span className="font-bold text-emerald-600">-{formatRupiah(s.diskonPromo)}</span>
                          </div>
                          {s.potonganTambahan > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Diskon Manual</span>
                              <span className="font-bold text-emerald-600">-{formatRupiah(s.potonganTambahan)}</span>
                            </div>
                          )}
                          {s.kodeUnik > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Kode Unik</span>
                              <span className="font-bold text-amber-600">+{formatRupiah(s.kodeUnik)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {s.bundlingItems && s.bundlingItems.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Barang Bundling</p>
                          <ul className="list-disc pl-4 text-xs font-bold text-violet-700">
                            {s.bundlingItems.map((bi, i) => (
                              <li key={i}>{bi}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Fallback for old transaction format without snapshot
              return (
                <div key={index} className="p-5 flex justify-between items-center hover:bg-gray-50/50">
                  <div>
                    <Badge>{item.paket}</Badge>
                    <p className="text-sm font-bold text-gray-800 mt-2">{item.waktuMulai} - {item.waktuBerakhir}</p>
                    <p className="text-xs font-bold text-gray-400 mt-1">Format transaksi lama (Tidak ada detail snapshot)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400">Harga Aktual</p>
                    <p className="text-lg font-black text-[#C92C1E]">{formatRupiah(item.hargaAktual)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {isEditOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/40 p-3 sm:p-6">
          <div className="mx-auto my-6 flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-red-100 bg-white shadow-2xl">
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                  Edit Data
                </p>
                <h2 className="text-xl font-black text-gray-950">
                  Detail Owner & Mitra
                </h2>
                <p className="mt-1 text-xs font-bold text-gray-400">
                  Hanya ubah identitas owner dan mitra. Riwayat tetap dari Call & Chat.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="cursor-pointer rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-[#C92C1E] transition-all duration-200 hover:bg-red-100 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-red-100 bg-[#FFF8F6] p-4">
                <h3 className="mb-3 text-sm font-black text-[#C92C1E]">
                  Detail Owner
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Nama Owner
                    </span>
                    <input
                      value={editCustomer.namaOwner || ""}
                      onChange={(event) => updateEditField("namaOwner", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Nama Brand
                    </span>
                    <input
                      value={editCustomer.projectBrand || ""}
                      onChange={(event) => updateEditField("projectBrand", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Outlet Aktif
                    </span>
                    <select
                      value={isValidOwnerOutletName(editCustomer.outlet) ? editCustomer.outlet : ""}
                      onChange={(event) => {
                        const selectedOutlet = event.target.value;
                        updateEditField("outlet", selectedOutlet);
                        updateEditField("noHpOutlet", findOutletPhoneByName(ownerOutlets, selectedOutlet));
                      }}
                      className="w-full max-w-xs cursor-pointer rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-[#C92C1E]"
                    >
                      <option value="">Pilih outlet owner</option>
                      {ownerOutlets.map((outletItem, index) => (
                        <option
                          key={`${outletItem.namaOutlet}-active-${index}`}
                          value={outletItem.namaOutlet}
                        >
                          {outletItem.namaOutlet}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-2 md:col-span-2">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Nama-Nama Outlet Owner
                    </span>

                    <OutletNameList
                      outlets={ownerOutletNames}
                      activeOutlet={editCustomer.outlet}
                      onSelect={(outlet) => {
                        updateEditField("outlet", outlet);
                        updateEditField("noHpOutlet", findOutletPhoneByName(ownerOutlets, outlet));
                      }}
                    />
                  </div>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Sumber Owner
                    </span>
                    <input
                      value={getSumberCustomerValue(editCustomer)}
                      onChange={(event) => updateEditSource(event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      No HP Owner
                    </span>
                    <input
                      value={formatPhoneWithDash(editCustomer.noHpOwner || "")}
                      onChange={(event) => updateEditField("noHpOwner", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      No HP Outlet
                    </span>
                    <input
                      value={formatPhoneWithDash(editCustomer.noHpOutlet || "")}
                      onChange={(event) => updateEditField("noHpOutlet", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-red-100 bg-[#FFF8F6] p-4">
                <h3 className="mb-3 text-sm font-black text-[#C92C1E]">
                  Detail Mitra
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Kode Mitra
                    </span>
                    <input
                      value={editCustomer.kodeMitra || ""}
                      onChange={(event) => updateEditField("kodeMitra", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Nama Mitra
                    </span>
                    <input
                      value={editCustomer.namaMitra || ""}
                      onChange={(event) => updateEditField("namaMitra", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Owner Mitra
                    </span>
                    <input
                      value={editCustomer.ownerMitra || ""}
                      onChange={(event) => updateEditField("ownerMitra", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Kategori Mitra
                    </span>
                    <input
                      value={editCustomer.kategoriMitra || ""}
                      onChange={(event) => updateEditField("kategoriMitra", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="cursor-pointer rounded-xl bg-[#C92C1E] px-4 py-2 text-xs font-black text-white shadow-sm transition-all duration-200 hover:bg-[#A82216] hover:shadow-md active:translate-y-0 active:scale-[0.98]"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeskripsiLanggananPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-bold text-gray-500">Memuat detail...</div>}>
      <DeskripsiLanggananContent />
    </Suspense>
  );
}