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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/25 p-3">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col rounded-[22px] bg-white p-3 shadow-sm">
        <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
            Call & Chat Customer
          </p>

          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-2 text-xs font-black text-[#C92C1E] shadow-sm transition hover:bg-red-50"
          >
            <ArrowRightIcon className="h-4 w-4" />
            Kembali
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overscroll-contain overflow-y-auto rounded-[22px] border border-red-100 bg-gray-50 p-4"
        >
          <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[72px_1fr_170px]">
              <div className="flex h-[92px] w-[72px] items-center justify-center rounded-2xl border border-red-100 bg-white shadow-sm">
                <UserIcon className="h-8 w-8 text-[#C92C1E]" />
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-black uppercase tracking-wide text-gray-950">
                  {customer.namaOwner || "Nama Customer"}
                </h2>
                <p className="mt-1 text-sm font-black text-gray-500">
                  {customer.outlet || "Nama Outlet"}
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <SmallInfo label="Kode Owner" value={customer.kodeOwner || "-"} />
                  <SmallInfo label="PIC Sales" value={customer.pic || "-"} />
                  <SmallInfo label="Mitra" value={customer.statusAkun || "-"} />
                  <SmallInfo
                    label="Skor Customer"
                    value={getScoreLabel(customer.scor ?? customer.remarks)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Terakhir Call" value={getLastCallDate(customer)} />
                <MiniStat label="Total Call" value={`${Number(customer.totalFu || 0)}`} large />
              </div>
            </div>

            <div className="my-4 h-px bg-gray-200" />

            <h3 className="text-center text-xl font-black text-gray-950">
              Laporan Call Customer
            </h3>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <FieldWrapper label="Waktu" icon={<ClockIcon className="h-4 w-4" />}>
                <input
                  type="datetime-local"
                  value={callTime}
                  onChange={(event) => setCallTime(event.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-black text-gray-700 outline-none transition focus:border-[#C92C1E]"
                />
              </FieldWrapper>

              <FieldWrapper label="Nomor Owner" icon={<ContactIcon className="h-4 w-4" />}>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={formatCustomerPhoneDisplay(customerPhone)}
                    className="h-10 min-w-0 flex-1 cursor-not-allowed rounded-xl border border-gray-200 bg-white px-3 text-xs font-black text-gray-700 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => openWhatsAppCustomer(customerPhone)}
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-100 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-200"
                  >
                    Hubungi
                  </button>
                </div>
              </FieldWrapper>

              <FieldWrapper label="Status Call" icon={<PhoneIcon className="h-4 w-4" />}>
                <select
                  value={callStatus}
                  onChange={(event) => handleChangeCallStatus(event.target.value)}
                  className={`h-10 w-full cursor-pointer rounded-xl border px-3 text-center text-xs font-black outline-none transition ${getCallStatusClass(
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
                  className={`h-10 w-full cursor-pointer rounded-xl border px-3 text-center text-xs font-black outline-none transition ${getChatStatusClass(
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

              <FieldWrapper label="Tanggal Follow Up" icon={<CalendarIcon className="h-4 w-4" />}>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(event) => setFollowUpDate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-black text-gray-700 outline-none transition focus:border-[#C92C1E]"
                />
              </FieldWrapper>

              <FieldWrapper label="Link WhatsApp" icon={<WhatsAppIcon className="h-4 w-4" />}>
                <input
                  readOnly
                  value={whatsappUrl || "Nomor WhatsApp belum tersedia"}
                  className="h-10 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-500 outline-none"
                />
              </FieldWrapper>
            </div>

            {!isStatusComplete && (
              <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-center text-xs font-black text-gray-400">
                Pilih Status Call dan Status Chat terlebih dahulu untuk membuka Remarks.
              </div>
            )}

            {canShowRemarks && (
              <div className="mt-3">
                <RemarkOptionsSection value={selectedRemark} onChange={handleSelectRemark} />
              </div>
            )}
          </div>

          {selectedRemarkScore === "2" && selectedRemark && (
            <div className="mt-4">
              <Remark2TrainingSection
                customer={customer}
                value={trainingPayload}
                onChange={setTrainingPayload}
              />
            </div>
          )}

          {selectedRemarkScore === "3" && selectedRemark && (
            <div className="mt-4">
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
            <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <label className="text-sm font-black text-gray-800">
                Kesimpulan
              </label>

              <textarea
                value={conclusion}
                onChange={(event) => setConclusion(event.target.value)}
                rows={4}
                placeholder="Isi kesimpulan call dengan owner"
                className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none transition focus:border-[#C92C1E]"
              />
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 bg-gray-50/95 py-3 ">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={!canSave}
              className="rounded-xl bg-[#C92C1E] px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Simpan Laporan Call
            </button>
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

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
      <span className="font-black text-gray-700">{label} : </span>
      <span className="font-black text-[#C92C1E]">{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="flex min-h-[92px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-2 text-center shadow-sm">
      <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
      <p className={`mt-2 font-black text-[#C92C1E] ${large ? "text-2xl" : "text-xs"}`}>
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
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black uppercase text-gray-500">
        {icon && <span className="text-[#C92C1E]">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}