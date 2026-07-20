"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  RemarkOptionsSection,
  getRemarkLabelFromValue,
  getRemarkScoreFromValue,
} from "./remarks/page";
import { applyRemark0Action } from "./remarks/remark-0/page";
import { applyRemark1Action } from "./remarks/remark-1/page";
import {
  Remark2TrainingReport,
  applyRemark2Action,
  getDefaultTrainingPayload,
  type Remark2TrainingPayload,
} from "./remarks/remark-2/page";
import {
  Remark3SalesReport,
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
  }[];
}

export interface CallFormResult {
  customerId: number;
  nextCustomer: CallCustomer;
}

const CALL_STATUS_OPTIONS = ["", "CONTACTED", "NO ANSWER", "BUSY", "WRONG NUMBER"];

const CHAT_STATUS_OPTIONS = ["", "PENDING", "OPENED", "REPLIED", "PROSPECT", "NO RESPONSE"];

const getToday = () => new Date().toISOString().split("T")[0];

const getTodayTime = () => {
  const now = new Date();
  const date = getToday();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${date} ${hours}:${minutes}`;
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

export const openWhatsAppCustomer = (phone?: string) => {
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
  const [followUpDate, setFollowUpDate] = useState(getToday());
  const [callTime, setCallTime] = useState(getTodayTime());
  const [selectedRemark, setSelectedRemark] = useState("");
  const [trainingPayload, setTrainingPayload] = useState<Remark2TrainingPayload>(() =>
    getDefaultTrainingPayload(),
  );
  const [salesPayload, setSalesPayload] = useState<Remark3SalesPayload>(() => getDefaultSalesPayload());
  const [conclusion, setConclusion] = useState("");

  useEffect(() => {
    if (!customer) return;

    setCallStatus("");
    setChatStatus("");
    setFollowUpDate(getToday());
    setCallTime(getTodayTime());
    setSelectedRemark("");
    setTrainingPayload(getDefaultTrainingPayload());
    setSalesPayload(getDefaultSalesPayload());
    setConclusion("");
  }, [customer]);

  const whatsappUrl = useMemo(
    () => getWhatsAppUrl(customer?.noHpOwner || customer?.noHpOutlet),
    [customer],
  );

  const showRemark = Boolean(callStatus && chatStatus);
  const remarkScore = getRemarkScoreFromValue(selectedRemark);
  const showConclusion = Boolean(selectedRemark);

  if (!customer) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!callStatus || !chatStatus) {
      alert("Pilih Status Call dan Status Chat terlebih dahulu.");
      return;
    }

    if (!selectedRemark) {
      alert("Pilih Remarks terlebih dahulu.");
      return;
    }

    if (!conclusion.trim()) {
      alert("Isi kesimpulan hasil call terlebih dahulu.");
      return;
    }

    if (remarkScore === "2" && trainingPayload.hasTraining && !trainingPayload.sessionType) {
      alert("Pilih jenis sesi training terlebih dahulu.");
      return;
    }

    const remarkLabel = getRemarkLabelFromValue(selectedRemark);
    const baseUpdate: CallCustomer = {
      ...customer,
      callStatus,
      chatStatus,
      tanggalFu: followUpDate,
      noted: `${remarkLabel} - ${conclusion.trim()}`,
      remarks: remarkScore,
      scor: Number(remarkScore || 0),
      callHistories: [
        ...(customer.callHistories || []),
        {
          waktuCall: callTime,
          picSales: customer.pic || "-",
          remark: remarkLabel,
          conclusion: conclusion.trim(),
        },
      ],
    };

    let nextCustomer = baseUpdate;

    if (remarkScore === "0") {
      nextCustomer = applyRemark0Action(baseUpdate);
    }

    if (remarkScore === "1") {
      nextCustomer = applyRemark1Action(baseUpdate);
    }

    if (remarkScore === "2") {
      nextCustomer = applyRemark2Action(baseUpdate, trainingPayload);
    }

    if (remarkScore === "3") {
      nextCustomer = applyRemark3Action(baseUpdate, salesPayload);
    }

    onSave({
      customerId: customer.no,
      nextCustomer,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b bg-red-50/50 p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
              Laporan Call & Chat Customer
            </p>
            <h2 className="mt-1 text-lg font-black text-gray-900">
              {customer.namaOwner || "Customer"}
            </h2>
            <p className="mt-1 text-xs font-medium text-gray-500">
              {customer.outlet || "-"} • Kode Owner {customer.kodeOwner || "-"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 cursor-pointer rounded-full bg-white font-black text-gray-500 shadow-sm transition hover:bg-gray-100 hover:text-[#C92C1E]"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(92vh-92px)] space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 rounded-2xl border border-red-100 bg-red-50/30 p-4 sm:grid-cols-2">
            <InfoCard label="Nomor Owner" value={customer.noHpOwner || "-"} />
            <InfoCard label="Nomor Outlet" value={customer.noHpOutlet || "-"} />
            <InfoCard label="PIC Sales" value={customer.pic || "-"} />
            <InfoCard label="Total Follow Up" value={`${Number(customer.totalFu || 0)}x`} />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-gray-400">
              Link WhatsApp
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                readOnly
                value={whatsappUrl || "Nomor WhatsApp belum tersedia"}
                className="min-w-0 flex-1 cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-600 outline-none"
              />

              <button
                type="button"
                onClick={() => openWhatsAppCustomer(customer.noHpOwner || customer.noHpOutlet)}
                className="cursor-pointer rounded-xl bg-green-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-green-700"
              >
                Buka WhatsApp
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Status Call"
              value={callStatus}
              options={CALL_STATUS_OPTIONS}
              placeholder="Pilih Status Call"
              onChange={setCallStatus}
            />

            <SelectField
              label="Status Chat"
              value={chatStatus}
              options={CHAT_STATUS_OPTIONS}
              placeholder="Pilih Status Chat"
              onChange={setChatStatus}
            />

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-400">
                Tanggal Follow Up
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(event) => setFollowUpDate(event.target.value)}
                className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-700 outline-none focus:border-[#C92C1E]"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-400">
                Waktu Call
              </label>
              <input
                readOnly
                value={callTime}
                className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-black text-gray-700 outline-none"
              />
            </div>
          </div>

          {showRemark && (
            <RemarkOptionsSection
              value={selectedRemark}
              onChange={(value) => {
                setSelectedRemark(value);
                setConclusion("");
                setTrainingPayload(getDefaultTrainingPayload());
                setSalesPayload(getDefaultSalesPayload());
              }}
            />
          )}

          {remarkScore === "2" && (
            <Remark2TrainingReport
              customer={customer}
              value={trainingPayload}
              onChange={setTrainingPayload}
            />
          )}

          {remarkScore === "3" && (
            <Remark3SalesReport value={salesPayload} onChange={setSalesPayload} />
          )}

          {showConclusion && (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">
                Kesimpulan Hasil Call
              </label>
              <textarea
                value={conclusion}
                onChange={(event) => setConclusion(event.target.value)}
                rows={4}
                placeholder="Contoh: Customer tertarik, minta follow up besok jam 10.00"
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-[#C92C1E]"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-500 transition hover:bg-gray-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={!callStatus || !chatStatus || !selectedRemark || !conclusion.trim()}
              className="cursor-pointer rounded-xl bg-[#C92C1E] px-5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#A82216] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Simpan Hasil Call
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase text-gray-400">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-700 outline-none focus:border-[#C92C1E]"
      >
        {options.map((status) => (
          <option key={status || placeholder} value={status}>
            {status || placeholder}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-red-100 bg-white p-3">
      <p className="text-[10px] font-black uppercase text-gray-400">{label}</p>
      <p className="mt-1 break-words text-xs font-black text-gray-800">{value}</p>
    </div>
  );
}