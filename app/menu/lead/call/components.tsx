"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getCatalogPackages, getCatalogPlans, getEligiblePromotions, type CatalogPackage, type CatalogPlan, type CatalogPromotion } from "@/app/lib/api";
import RemarkOptionsSection, {
  getRemarkLabelFromValue,
  getRemarkScoreFromValue,
} from "./remarks/components";
import { applyRemark0Action } from "./remarks/remark-0/components";
import { applyRemark1Action } from "./remarks/remark-1/components";
import Remark2TrainingSection, {
  applyRemark2Action,
  getDefaultTrainingPayload,
  type Remark2TrainingPayload,
} from "./remarks/remark-2/components";
import Remark3SalesSection, {
  applyRemark3Action,
  getDefaultSalesPayload,
  type Remark3SalesPayload,
} from "./remarks/remark-3/components";
import { useFeedback, type FeedbackApi } from "@/app/components/feedback/FeedbackContext";
import { formatPhoneDisplay, getWhatsAppUrl } from "@/app/lib/phone";
import ScreenPortal from "@/app/components/ui/ScreenPortal";

export interface CallCustomer {
  no: number;
  namaOwner?: string;
  namaOutlet?: string;
  outlet?: string;
  kodeOwner?: string;
  kodeOutlet?: string;
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

const openWhatsAppCustomer = (phone: string | undefined, showError: FeedbackApi["showError"]) => {
  const url = getWhatsAppUrl(phone);

  if (!url) {
    showError({
      title: "Nomor WhatsApp tidak tersedia",
      message: "Nomor WhatsApp customer belum tersedia.",
      solution: "Lengkapi nomor telepon customer terlebih dahulu.",
    });
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
  const { showError } = useFeedback();
  const [callStatus, setCallStatus] = useState("");
  const [chatStatus, setChatStatus] = useState("");
  const [followUpDate, setFollowUpDate] = useState(getTodayInputDate());
  const [callTime, setCallTime] = useState(getCurrentDateTimeLocal());
  const [selectedRemark, setSelectedRemark] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
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
    const timer = window.setTimeout(() => {
      getCatalogPackages().then(setCatalogPackages).catch(console.error);
      getCatalogPlans()
        .then((plans) => {
          setCatalogPlans(plans);
          if (plans.length > 0) {
            setSalesPayload((prev) => ({ ...prev, planId: prev.planId ?? plans[0].id }));
          }
        })
        .catch(console.error);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // When planId changes, reload eligible promotions
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (salesPayload.planId) {
        getEligiblePromotions(salesPayload.planId)
          .then(setEligiblePromotions)
          .catch(() => setEligiblePromotions([]));
      } else {
        setEligiblePromotions([]);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [salesPayload.planId]);

  useEffect(() => {
    if (!customer) return;

    const timer = window.setTimeout(() => {
      setCallStatus("");
      setChatStatus("");
      setFollowUpDate(getTodayInputDate());
      setCallTime(getCurrentDateTimeLocal());
      setSelectedRemark("");
      setConclusion("");
      setCurrentStep(1);
      setTrainingPayload(getDefaultTrainingPayload());
      setSalesPayload(getDefaultSalesPayload());
    }, 0);

    return () => window.clearTimeout(timer);
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

  const hasCallStatus = callStatus.trim() !== "";
  const hasChatStatus = chatStatus.trim() !== "";
  const isStatusComplete = hasCallStatus || hasChatStatus;
  const canShowRemarks = isStatusComplete;
  const canShowConclusion = canShowRemarks && selectedRemark !== "";
  const canSave =
    canShowConclusion &&
    conclusion.trim() !== "" &&
    (!trainingPayload.hasTraining || trainingPayload.sessionType !== "");
  const formattedCustomerPhone = formatPhoneDisplay(customerPhone);

  if (!customer) return null;

  const resetForm = () => {
    setCallStatus("");
    setChatStatus("");
    setFollowUpDate(getTodayInputDate());
    setCallTime(getCurrentDateTimeLocal());
    setSelectedRemark("");
    setConclusion("");
    setCurrentStep(1);
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
      showError({
        title: "Form belum lengkap",
        message: "Lengkapi minimal salah satu Status Call atau Status Chat, lalu Remarks dan Kesimpulan.",
        solution: "Isi field yang wajib sebelum menyimpan.",
      });
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
    <ScreenPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 md:p-6 backdrop-blur-xs">
        <div className="relative flex w-full max-w-5xl max-h-[92vh] flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header - Premium gradient & layout */}
          <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-white px-8 py-6 border-b border-gray-100 flex-shrink-0">
            <div className="absolute top-0 right-0 p-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-400 backdrop-blur-sm transition-all hover:bg-white hover:text-gray-700 hover:shadow-xs"
                title="Tutup"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C92C1E] to-red-600 text-white shadow-lg shadow-red-200/50">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="pt-0.5">
                <h3 className="text-xl font-bold tracking-tight text-gray-900">
                  Call & Chat Customer
                </h3>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  Form laporan aktivitas komunikasi, follow-up, training, hingga closing customer.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="min-h-0 flex flex-1 flex-col overflow-hidden bg-white">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-8 py-6">
            {/* COMPACT PROFILE CARD - MOCKUP STYLE */}
            <div className="rounded-2xl bg-white border border-red-100 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-6">
                
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E85C4F] text-white">
                    <UserIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-black tracking-tight text-gray-900">
                      {customer.namaOutlet || customer.outlet || "-"}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-[#C92C1E]">
                        {customer.kodeOutlet || customer.kodeOwner || customer.outlet || "KODE"}
                      </span>
                      {customer.statusAkun && (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          {customer.statusAkun}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="hidden h-10 w-px bg-gray-200 lg:block" />

                <div className="flex flex-1 items-center justify-between gap-6 overflow-x-auto pb-2 sm:pb-0">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500">PIC Sales</span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold">
                      {customer.pic && customer.pic !== "-" && customer.pic.toLowerCase() !== "no pic" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-blue-700 font-black">
                          <UserIcon className="h-3.5 w-3.5 text-blue-500" />
                          {customer.pic}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-slate-500 font-medium">
                          <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                          Belum Ada PIC
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500">No. Owner</span>
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-black text-gray-900">
                      <PhoneIcon className="h-3.5 w-3.5 text-gray-400" />
                      {formattedCustomerPhone}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500">WA Ready</span>
                    <div className={`mt-1 text-xs font-black ${whatsappUrl ? "text-emerald-600" : "text-gray-500"}`}>
                      {whatsappUrl ? "Tersedia" : "Tidak"}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <PhoneIcon className="h-3.5 w-3.5 text-[#C92C1E]" />
                      <span className="text-[10px] font-bold text-gray-900">Terakhir Call</span>
                    </div>
                    <div className="mt-1 text-xs font-black text-gray-900">
                      {getLastCallDate(customer)}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-[#C92C1E]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 20h16v-2H4v2Zm2-4h2V6H6v10Zm4 0h2V9h-2v7Zm4 0h2v-4h-2v4Z" />
                      </svg>
                      <span className="text-[10px] font-bold text-gray-900">Total Call</span>
                    </div>
                    <div className="mt-1 text-base font-black text-gray-900">
                      {Number(customer.totalFu || 0)}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* HORIZONTAL STEPPER - MOCKUP STYLE */}
            <div className="flex items-center gap-4 px-2">
              {/* Tahap 1 */}
              <div className="flex flex-1 items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${currentStep >= 1 ? "bg-[#C92C1E] text-white" : "bg-gray-200 text-gray-500"}`}>
                  1
                </div>
                <div>
                  <h4 className={`text-sm font-black ${currentStep >= 1 ? "text-gray-900" : "text-gray-500"}`}>Tahap 1</h4>
                  <p className="text-[10px] font-medium text-gray-500">Lengkapi status call dan chat</p>
                </div>
              </div>
              <div className={`h-px w-16 sm:w-24 lg:w-32 ${currentStep >= 2 ? "bg-[#C92C1E]" : "bg-gray-300"}`} />
              
              {/* Tahap 2 */}
              <div className="flex flex-1 items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${currentStep >= 2 ? "bg-[#C92C1E] text-white" : "bg-gray-200 text-gray-500"}`}>
                  2
                </div>
                <div>
                  <h4 className={`text-sm font-black ${currentStep >= 2 ? "text-gray-900" : "text-gray-500"}`}>Tahap 2</h4>
                  <p className="text-[10px] font-medium text-gray-500">Pilih remark customer</p>
                </div>
              </div>
              <div className={`h-px w-16 sm:w-24 lg:w-32 ${currentStep >= 3 ? "bg-[#C92C1E]" : "bg-gray-300"}`} />

              {/* Tahap 3 */}
              <div className="flex flex-1 items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${currentStep >= 3 ? "bg-[#C92C1E] text-white" : "bg-gray-200 text-gray-500"}`}>
                  3
                </div>
                <div>
                  <h4 className={`text-sm font-black ${currentStep >= 3 ? "text-gray-900" : "text-gray-500"}`}>Tahap 3</h4>
                  <p className="text-[10px] font-medium text-gray-500">Isi kesimpulan dan simpan</p>
                </div>
              </div>
            </div>

            {/* TAHAP 1: Informasi Aktivitas */}
            {currentStep === 1 && (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-gray-100 bg-white px-5 py-4">
                  <h3 className="text-base font-black text-gray-900">Informasi Aktivitas</h3>
                  <p className="mt-0.5 text-xs text-gray-500">Lengkapi waktu, kontak, dan status komunikasi customer.</p>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-2">
                  <FieldWrapper label="Waktu Aktivitas" icon={<ClockIcon className="h-3.5 w-3.5" />} required>
                    <input
                      type="datetime-local"
                      value={callTime}
                      max={new Date().toISOString().slice(0, 16)}
                      onChange={(event) => setCallTime(event.target.value)}
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-red-100"
                    />
                  </FieldWrapper>

                  <FieldWrapper label="Tanggal Follow Up" icon={<CalendarIcon className="h-3.5 w-3.5" />}>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(event) => setFollowUpDate(event.target.value)}
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-red-100"
                    />
                  </FieldWrapper>

                  <FieldWrapper label="Status Call" icon={<PhoneIcon className="h-3.5 w-3.5" />} required>
                    <select
                      value={callStatus}
                      onChange={(event) => handleChangeCallStatus(event.target.value)}
                      className={`h-11 w-full cursor-pointer rounded-xl border px-4 text-sm font-black outline-none transition focus:ring-2 focus:ring-red-100 ${getCallStatusClass(
                        callStatus,
                      )}`}
                    >
                      <option value="" disabled>Pilih status call</option>
                      {CALL_STATUS_OPTIONS.map((item) => (
                        <option key={item || "empty"} value={item}>
                          {item || "none"}
                        </option>
                      ))}
                    </select>
                  </FieldWrapper>

                  <FieldWrapper label="Status Chat" icon={<ChatIcon className="h-3.5 w-3.5" />} required>
                    <select
                      value={chatStatus}
                      onChange={(event) => handleChangeChatStatus(event.target.value)}
                      className={`h-11 w-full cursor-pointer rounded-xl border px-4 text-sm font-black outline-none transition focus:ring-2 focus:ring-red-100 ${getChatStatusClass(
                        chatStatus,
                      )}`}
                    >
                      <option value="" disabled>Pilih status chat</option>
                      {CHAT_STATUS_OPTIONS.map((item) => (
                        <option key={item || "empty"} value={item}>
                          {item || "none"}
                        </option>
                      ))}
                    </select>
                  </FieldWrapper>

                  <FieldWrapper label="Nomor Owner" icon={<ContactIcon className="h-3.5 w-3.5" />}>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={formattedCustomerPhone}
                        className="h-11 min-w-0 flex-1 cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => openWhatsAppCustomer(customerPhone, showError)}
                        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-50 px-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                        Hubungi
                      </button>
                    </div>
                  </FieldWrapper>

                  <FieldWrapper label="Link WhatsApp" icon={<WhatsAppIcon className="h-3.5 w-3.5" />}>
                    <input
                      readOnly
                      value={whatsappUrl || "Nomor WhatsApp belum tersedia"}
                      className="h-11 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-500 outline-none"
                    />
                  </FieldWrapper>
                </div>
              </div>
            )}

            {/* TAHAP 2: Remarks Customer */}
            {currentStep === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-base font-black text-gray-900">Remarks Customer</h3>
                    <p className="mt-0.5 text-xs text-gray-500">Pilih hasil follow-up berdasarkan kondisi customer.</p>
                  </div>
                  <RemarkOptionsSection value={selectedRemark} onChange={handleSelectRemark} />
                </div>

                {selectedRemarkScore === "2" && selectedRemark && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-base font-black text-gray-900">Rencana Training / Demo</h3>
                    </div>
                    <Remark2TrainingSection
                      customer={customer}
                      value={trainingPayload}
                      onChange={setTrainingPayload}
                    />
                  </div>
                )}

                {selectedRemarkScore === "3" && selectedRemark && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-base font-black text-gray-900">Data Closing Penjualan</h3>
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
              </div>
            )}

            {/* TAHAP 3: Kesimpulan */}
            {currentStep === 3 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mb-4">
                  <label className="text-base font-black text-gray-900">
                    Kesimpulan Aktivitas
                  </label>
                  <p className="mt-0.5 text-xs text-gray-500">Ringkas hasil percakapan dan langkah selanjutnya.</p>
                </div>
                <textarea
                  value={conclusion}
                  onChange={(event) => setConclusion(event.target.value)}
                  rows={5}
                  placeholder="Contoh: Customer tertarik paket Business 12 bulan, meminta follow-up lagi 3 hari ke depan."
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 outline-none transition focus:border-[#C92C1E] focus:ring-2 focus:ring-red-100"
                />
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS - MOCKUP STYLE */}
          <div className="flex-shrink-0 flex items-center justify-between border-t border-gray-100 bg-white px-8 py-5 rounded-b-[32px]">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {currentStep === 1 && "Lengkapi status call atau chat untuk melanjutkan."}
              {currentStep === 2 && "Pilih remark yang sesuai untuk customer ini."}
              {currentStep === 3 && "Tulis kesimpulan akhir sebelum menyimpan."}
            </div>

            <div className="flex items-center gap-3">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                >
                  Kembali
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  Batal
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={currentStep === 1 ? !isStatusComplete : !selectedRemark}
                  className="group inline-flex items-center gap-2 rounded-xl bg-[#C92C1E] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-[#b02619] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  Lanjut
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSave}
                  className="group inline-flex items-center gap-2 rounded-xl bg-[#C92C1E] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-[#b02619] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  Simpan Laporan Call
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  </ScreenPortal>
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

function Badge({ icon, label, value, color = "gray" }: { icon: React.ReactNode; label: string; value: string; color?: "gray" | "emerald" | "amber" }) {
  const colorStyles = {
    gray: "bg-gray-50 text-gray-600 border-gray-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <div className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${colorStyles[color]}`}>
      <span className="opacity-60">{icon}</span>
      <span className="opacity-70 font-semibold">{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function FieldWrapper({
  label,
  icon,
  required,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-gray-700">
        {icon && <span className="text-[#C92C1E]">{icon}</span>}
        {label}
        {required && <span className="text-[#C92C1E]">*</span>}
      </label>
      {children}
    </div>
  );
}
