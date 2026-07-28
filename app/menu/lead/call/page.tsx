"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getCatalogPackages, getCatalogPlans, getEligiblePromotions, type CatalogPackage, type CatalogPlan, type CatalogPromotion } from "@/app/lib/api";
import RemarkOptionsSection, {
  getRemarkLabelFromValue,
  getRemarkScoreFromValue,
} from "./remarks/page";
import { applyRemark0Action } from "./remarks/remark-0/page";
import { applyRemark1Action } from "./remarks/remark-1/page";
import Remark2TrainingSection, {
  applyRemark2Action,
  getDefaultTrainingPayload,
  type Remark2TrainingPayload,
} from "./remarks/remark-2/page";
import Remark3SalesSection, {
  applyRemark3Action,
  getDefaultSalesPayload,
  type Remark3SalesPayload,
} from "./remarks/remark-3/page";

export interface CallCustomer {
  no: number;
  namaOwner?: string;
  outlet?: string;
  kodeOwner?: string;
  pic?: string;
  noHpOwner?: string;
  noHpOutlet?: string;
  callStatus?: string;
  chatStatus?: string;
  tanggalFu?: string;
  totalFu?: number;
  noted?: string;
  remarks?: string;
  scor?: number;
  statusAkun?: string;
  finalisasiClosing?: string;
  nominal?: number;
  callHistories?: {
    waktuCall: string;
    picSales: string;
    remark: string;
    conclusion?: string;
  }[];
  trainingSessions?: string[];
  trainingHistories?: {
    waktuTraining: string;
    lokasiTraining: string;
  }[];
  purchaseHistories?: {
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
  }[];
}

export interface CallFormResult {
  customerId: number;
  nextCustomer: CallCustomer;
  rawPayload: {
    callStatus: string;
    chatStatus: string;
    selectedRemarkScore: string;
    conclusion: string;
    followUpDate: string;
    callTime: string;
    trainingPayload?: Remark2TrainingPayload;
    salesPayload?: Remark3SalesPayload;
  };
}

const CALL_STATUS_OPTIONS = [
  "",
  "ENGAGE",
  "CONTACTED",
  "NO ANSWER",
  "BUSY",
  "WRONG NUMBER",
  "NO CALL",
];

const CHAT_STATUS_OPTIONS = [
  "",
  "INTEREST",
  "REPLIED",
  "OPENED",
  "PENDING",
  "NO RESPONSE",
  "NO CHAT",
];

const getCallStatusClass = (value: string) => {
  const upper = value.toUpperCase();

  if (upper === "ENGAGE" || upper === "CONTACTED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 focus:border-emerald-500";
  }

  if (upper === "NO ANSWER" || upper === "BUSY") {
    return "border-yellow-200 bg-yellow-50 text-yellow-800 focus:border-yellow-500";
  }

  if (upper === "WRONG NUMBER") {
    return "border-red-200 bg-red-50 text-red-700 focus:border-red-500";
  }

  if (upper === "NO CALL") {
    return "border-gray-200 bg-gray-50 text-gray-500 focus:border-gray-400";
  }

  return "border-gray-200 bg-white text-gray-700 focus:border-[#C92C1E]";
};

const getChatStatusClass = (value: string) => {
  const upper = value.toUpperCase();

  if (upper === "INTEREST" || upper === "REPLIED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 focus:border-emerald-500";
  }

  if (upper === "OPENED" || upper === "PENDING") {
    return "border-yellow-200 bg-yellow-50 text-yellow-800 focus:border-yellow-500";
  }

  if (upper === "NO RESPONSE") {
    return "border-red-200 bg-red-50 text-red-700 focus:border-red-500";
  }

  if (upper === "NO CHAT") {
    return "border-gray-200 bg-gray-50 text-gray-500 focus:border-gray-400";
  }

  return "border-gray-200 bg-white text-gray-700 focus:border-[#C92C1E]";
};

const getTodayInputDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getCurrentDateTimeLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const formatDateTime = (value: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getLastCallDate = (customer: CallCustomer | null) => {
  if (!customer) return "-";

  const lastHistory = customer.callHistories?.[customer.callHistories.length - 1];

  return lastHistory?.waktuCall || customer.tanggalFu || "-";
};

const getScoreLabel = (score?: number | string) => {
  const value = String(score ?? "");

  if (value === "0") return "Tidak Potensi (0)";
  if (value === "1") return "Kemungkinan (1)";
  if (value === "2") return "Potensi (2)";
  if (value === "3") return "Langganan (3)";

  return "-";
};

export const normalizeWhatsAppNumber = (phone?: string) => {
  const rawPhone = phone?.trim() || "";
  const digitsOnly = rawPhone.replace(/\D/g, "");

  if (!digitsOnly) return "";

  if (digitsOnly.startsWith("0")) {
    return `62${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.startsWith("62")) {
    return digitsOnly;
  }

  if (rawPhone.startsWith("+")) {
    return digitsOnly;
  }

  return digitsOnly;
};

export const getWhatsAppUrl = (phone?: string) => {
  const number = normalizeWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}` : "";
};

export const formatCustomerPhoneDisplay = (phone?: string) => {
  const digitsOnly = String(phone || "").replace(/\D/g, "");

  if (!digitsOnly) return "-";

  const nationalNumber = digitsOnly.startsWith("62")
    ? digitsOnly.slice(2)
    : digitsOnly.startsWith("0")
      ? digitsOnly.slice(1)
      : digitsOnly;

  if (!nationalNumber) return "-";

  if (nationalNumber.length <= 3) return nationalNumber;

  if (nationalNumber.length <= 7) {
    return `${nationalNumber.slice(0, 3)}-${nationalNumber.slice(3)}`;
  }

  return `${nationalNumber.slice(0, 3)}-${nationalNumber.slice(3, 7)}-${nationalNumber.slice(7, 11)}${nationalNumber.length > 11 ? `-${nationalNumber.slice(11)}` : ""}`;
};

const openWhatsAppCustomer = (phone?: string) => {
  const url = getWhatsAppUrl(phone);

  if (!url) {
    alert("Nomor WhatsApp customer belum tersedia.");
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
};

export default function CallPage({
  customer,
  onClose,
  onSave,
}: {
  customer: CallCustomer | null;
  onClose: () => void;
  onSave: (result: CallFormResult) => void;
}) {
  const [callStatus, setCallStatus] = useState("");
  const [chatStatus, setChatStatus] = useState("");
  const [followUpDate, setFollowUpDate] = useState(getTodayInputDate());
  const [callTime, setCallTime] = useState(getCurrentDateTimeLocal());
  const [selectedRemark, setSelectedRemark] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [trainingPayload, setTrainingPayload] = useState<Remark2TrainingPayload>(
    getDefaultTrainingPayload(),
  );
  const [salesPayload, setSalesPayload] = useState<Remark3SalesPayload>(
    getDefaultSalesPayload(),
  );
  const [catalogPackages, setCatalogPackages] = useState<CatalogPackage[]>([]);
  const [catalogPlans, setCatalogPlans] = useState<CatalogPlan[]>([]);
  const [eligiblePromotions, setEligiblePromotions] = useState<CatalogPromotion[]>([]);

  // Load catalog packages & all plans once on mount
  useEffect(() => {
    getCatalogPackages().then(setCatalogPackages).catch(console.error);
    getCatalogPlans().then((plans) => {
      setCatalogPlans(plans);
      // Pre-select first plan
      if (plans.length > 0) {
        setSalesPayload(prev => ({ ...prev, planId: prev.planId ?? plans[0].id }));
      }
    }).catch(console.error);
  }, []);

  // When planId changes, reload eligible promotions
  useEffect(() => {
    if (salesPayload.planId) {
      getEligiblePromotions(salesPayload.planId)
        .then(setEligiblePromotions)
        .catch(() => setEligiblePromotions([]));
    } else {
      setEligiblePromotions([]);
    }
  }, [salesPayload.planId]);

  useEffect(() => {
    if (!customer) return;

    // Setiap popup call dibuka, status harus mulai dari none.
    // Jangan ambil callStatus/chatStatus lama dari customer, supaya remarks belum terbuka.
    setCallStatus("");
    setChatStatus("");
    setFollowUpDate(getTodayInputDate());
    setCallTime(getCurrentDateTimeLocal());
    setSelectedRemark("");
    setConclusion("");
    setTrainingPayload(getDefaultTrainingPayload());
    setSalesPayload(getDefaultSalesPayload());
  }, [customer]);

  useEffect(() => {
    if (!customer) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [customer]);

  const customerPhone = customer?.noHpOwner || customer?.noHpOutlet || "";
  const whatsappUrl = useMemo(() => getWhatsAppUrl(customerPhone), [customerPhone]);

  const selectedRemarkScore = getRemarkScoreFromValue(selectedRemark);
  const selectedRemarkLabel = getRemarkLabelFromValue(selectedRemark);

  const isStatusComplete = callStatus.trim() !== "" && chatStatus.trim() !== "";
  const canShowRemarks = isStatusComplete;
  const canShowConclusion = canShowRemarks && selectedRemark !== "";
  const canSave =
    canShowConclusion &&
    conclusion.trim() !== "" &&
    (!trainingPayload.hasTraining || trainingPayload.sessionType !== "");
  const formattedCustomerPhone = formatCustomerPhoneDisplay(customerPhone);

  if (!customer) return null;

  const resetForm = () => {
    setCallStatus("");
    setChatStatus("");
    setFollowUpDate(getTodayInputDate());
    setCallTime(getCurrentDateTimeLocal());
    setSelectedRemark("");
    setConclusion("");
    setTrainingPayload(getDefaultTrainingPayload());
    setSalesPayload(getDefaultSalesPayload());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSave) {
      alert("Lengkapi Status Call, Status Chat, Remarks, dan Kesimpulan terlebih dahulu.");
      return;
    }

    const baseUpdate: CallCustomer = {
      ...customer,
      callStatus,
      chatStatus,
      tanggalFu: followUpDate,
      remarks: selectedRemarkScore,
      scor: Number(selectedRemarkScore || 0),
      noted: `${selectedRemarkLabel} - ${conclusion.trim()}`,
      callHistories: [
        ...(customer.callHistories || []),
        {
          waktuCall: formatDateTime(callTime),
          picSales: customer.pic || "-",
          remark: selectedRemarkLabel,
          conclusion: conclusion.trim(),
        },
      ],
    };

    let nextCustomer = baseUpdate;

    if (selectedRemarkScore === "0") {
      nextCustomer = applyRemark0Action(baseUpdate);
    } else if (selectedRemarkScore === "1") {
      nextCustomer = applyRemark1Action(baseUpdate);
    } else if (selectedRemarkScore === "2") {
      nextCustomer = applyRemark2Action(baseUpdate, trainingPayload, callTime);
    } else if (selectedRemarkScore === "3") {
      nextCustomer = applyRemark3Action(baseUpdate, salesPayload);
    } else {
      nextCustomer = {
        ...baseUpdate,
        totalFu: Number(customer.totalFu || 0) + 1,
      };
    }

    onSave({
      customerId: customer.no,
      nextCustomer,
      rawPayload: {
        callStatus,
        chatStatus,
        selectedRemarkScore,
        conclusion: conclusion.trim(),
        followUpDate,
        callTime: callTime,
        trainingPayload: selectedRemarkScore === "2" ? trainingPayload : undefined,
        salesPayload: selectedRemarkScore === "3" ? salesPayload : undefined,
      }
    });

    resetForm();
  };

  const handleChangeCallStatus = (value: string) => {
    setCallStatus(value);
    setSelectedRemark("");
    setConclusion("");
    setTrainingPayload(getDefaultTrainingPayload());
    setSalesPayload(getDefaultSalesPayload());
  };

  const handleChangeChatStatus = (value: string) => {
    setChatStatus(value);
    setSelectedRemark("");
    setConclusion("");
    setTrainingPayload(getDefaultTrainingPayload());
    setSalesPayload(getDefaultSalesPayload());
  };

  const handleSelectRemark = (value: string) => {
    setSelectedRemark(value);
    setConclusion("");
    setTrainingPayload(getDefaultTrainingPayload());
    setSalesPayload(getDefaultSalesPayload());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={handleClose} />

      <div className="relative z-10 flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 bg-gray-50 px-6 py-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
              Call & Chat Customer
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-gray-900">
              Form Laporan Aktivitas Lead
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Catat hasil call, chat, follow-up, training, hingga closing customer.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Tutup"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex flex-1 flex-col bg-gray-50/60">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <div className="rounded-3xl bg-gradient-to-br from-[#C92C1E] via-[#B62619] to-[#8F1D14] p-5 text-white shadow-lg">
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                    <UserIcon className="h-8 w-8 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-100/90">
                      Profil Customer
                    </p>
                    <h3 className="mt-1 truncate text-2xl font-black tracking-tight">
                      {customer.namaOwner || "Nama Customer"}
                    </h3>
                    <p className="mt-1 truncate text-sm font-bold text-red-100">
                      {customer.outlet || "Nama Outlet"}
                    </p>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <SmallInfo label="Kode Owner" value={customer.kodeOwner || "-"} inverted />
                      <SmallInfo label="PIC Sales" value={customer.pic || "-"} inverted />
                      <SmallInfo label="Status Akun" value={customer.statusAkun || "-"} inverted />
                      <SmallInfo
                        label="Skor Customer"
                        value={getScoreLabel(customer.scor ?? customer.remarks)}
                        inverted
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Terakhir Call" value={getLastCallDate(customer)} inverted />
                  <MiniStat label="Total Call" value={`${Number(customer.totalFu || 0)}`} large inverted />
                  <MiniStat label="No. Owner" value={formattedCustomerPhone} inverted />
                  <MiniStat label="WA Ready" value={whatsappUrl ? "Tersedia" : "Tidak Ada"} inverted />
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${isStatusComplete ? "border-emerald-200 bg-emerald-50" : "border-red-100 bg-white"}`}>
                <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${isStatusComplete ? "text-emerald-600" : "text-[#C92C1E]"}`}>
                  Tahap 1
                </p>
                <h4 className="mt-1 text-sm font-black text-gray-900">Lengkapi status call dan chat</h4>
                <p className="mt-1 text-xs text-gray-500">
                  Status ini menjadi pintu pembuka untuk memilih remark customer.
                </p>
              </div>
              <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${canShowRemarks ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
                <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${canShowRemarks ? "text-amber-700" : "text-gray-400"}`}>
                  Tahap 2
                </p>
                <h4 className="mt-1 text-sm font-black text-gray-900">Pilih remark customer</h4>
                <p className="mt-1 text-xs text-gray-500">
                  Tentukan customer invalid, kemungkinan, potensial, atau closing.
                </p>
              </div>
              <div className={`rounded-2xl border p-4 shadow-sm transition-colors ${canSave ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white"}`}>
                <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${canSave ? "text-emerald-600" : "text-gray-400"}`}>
                  Tahap 3
                </p>
                <h4 className="mt-1 text-sm font-black text-gray-900">Isi kesimpulan dan simpan</h4>
                <p className="mt-1 text-xs text-gray-500">
                  Pastikan tindak lanjut sudah jelas sebelum laporan disimpan.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/70 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
                <h3 className="text-base font-black text-gray-900">Informasi Aktivitas</h3>
                <p className="mt-1 text-[11px] font-medium text-gray-500">
                  Lengkapi waktu, kontak, dan status komunikasi customer.
                </p>
              </div>

              <div className="grid gap-4 p-5 lg:grid-cols-2">
                <FieldWrapper label="Waktu Aktivitas" icon={<ClockIcon className="h-4 w-4" />}>
                  <input
                    type="datetime-local"
                    value={callTime}
                    onChange={(event) => setCallTime(event.target.value)}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-red-100"
                  />
                </FieldWrapper>

                <FieldWrapper label="Tanggal Follow Up" icon={<CalendarIcon className="h-4 w-4" />}>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(event) => setFollowUpDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-red-100"
                  />
                </FieldWrapper>

                <FieldWrapper label="Nomor Owner" icon={<ContactIcon className="h-4 w-4" />}>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={formattedCustomerPhone}
                      className="h-11 min-w-0 flex-1 cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => openWhatsAppCustomer(customerPhone)}
                      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      Hubungi
                    </button>
                  </div>
                </FieldWrapper>

                <FieldWrapper label="Link WhatsApp" icon={<WhatsAppIcon className="h-4 w-4" />}>
                  <input
                    readOnly
                    value={whatsappUrl || "Nomor WhatsApp belum tersedia"}
                    className="h-11 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-500 outline-none"
                  />
                </FieldWrapper>

                <FieldWrapper label="Status Call" icon={<PhoneIcon className="h-4 w-4" />}>
                  <select
                    value={callStatus}
                    onChange={(event) => handleChangeCallStatus(event.target.value)}
                    className={`h-11 w-full cursor-pointer rounded-xl border px-4 text-sm font-black outline-none transition focus:ring-2 focus:ring-red-100 ${getCallStatusClass(
                      callStatus,
                    )}`}
                  >
                    {CALL_STATUS_OPTIONS.map((item) => (
                      <option key={item || "empty"} value={item}>
                        {item || "none"}
                      </option>
                    ))}
                  </select>
                </FieldWrapper>

                <FieldWrapper label="Status Chat" icon={<ChatIcon className="h-4 w-4" />}>
                  <select
                    value={chatStatus}
                    onChange={(event) => handleChangeChatStatus(event.target.value)}
                    className={`h-11 w-full cursor-pointer rounded-xl border px-4 text-sm font-black outline-none transition focus:ring-2 focus:ring-red-100 ${getChatStatusClass(
                      chatStatus,
                    )}`}
                  >
                    {CHAT_STATUS_OPTIONS.map((item) => (
                      <option key={item || "empty"} value={item}>
                        {item || "none"}
                      </option>
                    ))}
                  </select>
                </FieldWrapper>
              </div>
            </div>

            {!isStatusComplete && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-4 text-center text-sm font-bold text-gray-400 shadow-sm">
                Pilih <span className="text-[#C92C1E]">Status Call</span> dan <span className="text-[#C92C1E]">Status Chat</span> terlebih dahulu untuk membuka bagian remarks.
              </div>
            )}

            {canShowRemarks && (
              <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-black text-gray-900">Remarks Customer</h3>
                  <p className="mt-1 text-[11px] font-medium text-gray-500">
                    Pilih hasil follow-up berdasarkan kondisi customer saat ini.
                  </p>
                </div>
                <RemarkOptionsSection value={selectedRemark} onChange={handleSelectRemark} />
              </div>
            )}

            {selectedRemarkScore === "2" && selectedRemark && (
              <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-black text-gray-900">Rencana Training / Demo</h3>
                  <p className="mt-1 text-[11px] font-medium text-gray-500">
                    Customer potensial biasanya membutuhkan demo atau training sebelum lanjut.
                  </p>
                </div>
                <Remark2TrainingSection
                  customer={customer}
                  value={trainingPayload}
                  onChange={setTrainingPayload}
                />
              </div>
            )}

            {selectedRemarkScore === "3" && selectedRemark && (
              <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-black text-gray-900">Data Closing Penjualan</h3>
                  <p className="mt-1 text-[11px] font-medium text-gray-500">
                    Lengkapi paket, plan, dan promo untuk menyiapkan closing customer.
                  </p>
                </div>
                <Remark3SalesSection
                  value={salesPayload}
                  onChange={setSalesPayload}
                  backendPackages={catalogPackages}
                  backendPlans={catalogPlans}
                  backendPromotions={eligiblePromotions}
                />
              </div>
            )}

            {canShowConclusion && (
              <div className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm">
                <label className="block text-sm font-black text-gray-900">
                  Kesimpulan Aktivitas
                </label>
                <p className="mt-1 text-[11px] font-medium text-gray-500">
                  Ringkas hasil percakapan dan langkah selanjutnya agar mudah ditinjau kembali.
                </p>

                <textarea
                  value={conclusion}
                  onChange={(event) => setConclusion(event.target.value)}
                  rows={5}
                  placeholder="Contoh: Customer tertarik paket Business 12 bulan, meminta follow-up lagi 3 hari ke depan."
                  className="mt-3 w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-red-100"
                />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-gray-500">
                {!canSave ? "Form belum lengkap. Lengkapi status, remark, dan kesimpulan untuk menyimpan." : "Form siap disimpan ke laporan aktivitas lead."}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={!canSave}
                  className="rounded-xl bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#A82216] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Simpan Laporan Call
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25A2.25 2.25 0 0 0 21.75 19.5v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a1.125 1.125 0 0 0-1.173.417l-.97 1.293a1.125 1.125 0 0 1-1.21.38 12.035 12.035 0 0 1-7.143-7.143 1.125 1.125 0 0 1 .38-1.21l1.293-.97c.36-.27.527-.728.417-1.173L6.963 3.102A1.125 1.125 0 0 0 5.872 2.25H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3.75h5.25M21 12c0 4.142-4.03 7.5-9 7.5a10.4 10.4 0 0 1-3.438-.574L3 20.25l1.324-4.238A6.96 6.96 0 0 1 3 12c0-4.142 4.03-7.5 9-7.5s9 3.358 9 7.5Z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ContactIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25m10.5-2.25v2.25M3.75 8.25h16.5M4.5 6.75h15A1.5 1.5 0 0 1 21 8.25v10.5A1.5 1.5 0 0 1 19.5 20.25h-15A1.5 1.5 0 0 1 3 18.75V8.25A1.5 1.5 0 0 1 4.5 6.75Z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 4.142-4.03 7.5-9 7.5a10.4 10.4 0 0 1-3.438-.574L3 20.25l1.324-4.238A6.96 6.96 0 0 1 3 12c0-4.142 4.03-7.5 9-7.5s9 3.358 9 7.5Z" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-3.31 0-6 2.02-6 4.5V20h12v-1.5c0-2.48-2.69-4.5-6-4.5Z" />
    </svg>
  );
}

function SmallInfo({ label, value, inverted }: { label: string; value: string; inverted?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs shadow-sm ${inverted ? "border-white/15 bg-white/10 backdrop-blur-sm" : "border-gray-200 bg-white"}`}>
      <span className={`font-black ${inverted ? "text-red-100" : "text-gray-700"}`}>{label} : </span>
      <span className={`font-black ${inverted ? "text-white" : "text-[#C92C1E]"}`}>{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  large,
  inverted,
}: {
  label: string;
  value: string;
  large?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className={`flex min-h-[96px] flex-col items-center justify-center rounded-2xl border p-3 text-center shadow-sm ${inverted ? "border-white/15 bg-white/10 backdrop-blur-sm" : "border-red-100 bg-white"}`}>
      <p className={`text-[10px] font-black uppercase tracking-wide ${inverted ? "text-red-100" : "text-gray-400"}`}>{label}</p>
      <p className={`mt-2 font-black ${large ? "text-2xl" : "text-xs"} ${inverted ? "text-white" : "text-[#C92C1E]"}`}>
        {value}
      </p>
    </div>
  );
}

function FieldWrapper({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
        {icon && <span className="text-[#C92C1E]">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}
