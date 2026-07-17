"use client";

import React, { useEffect, useMemo, useState } from "react";

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
}

export interface CallFormResult {
  customerId: number;
  callStatus: string;
  chatStatus: string;
  followUpDate: string;
  note: string;
}

const CALL_STATUS_OPTIONS = [
  "CONTACTED",
  "NO ANSWER",
  "BUSY",
  "WRONG NUMBER",
  "INTERESTED",
  "NOT INTERESTED",
];

const CHAT_STATUS_OPTIONS = [
  "PENDING",
  "OPENED",
  "REPLIED",
  "PROSPECT",
  "NO RESPONSE",
];

const getToday = () => new Date().toISOString().split("T")[0];

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
  const [callStatus, setCallStatus] = useState("CONTACTED");
  const [chatStatus, setChatStatus] = useState("PROSPECT");
  const [followUpDate, setFollowUpDate] = useState(getToday());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!customer) return;

    setCallStatus(customer.callStatus || "CONTACTED");
    setChatStatus(customer.chatStatus || "PROSPECT");
    setFollowUpDate(customer.tanggalFu || getToday());
    setNote(customer.noted || "");
  }, [customer]);

  const whatsappUrl = useMemo(
    () => getWhatsAppUrl(customer?.noHpOwner || customer?.noHpOutlet),
    [customer],
  );

  if (!customer) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    onSave({
      customerId: customer.no,
      callStatus,
      chatStatus,
      followUpDate,
      note,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b bg-red-50/50 p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
              Action Call Customer
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
            className="h-9 w-9 rounded-full bg-white font-black text-gray-500 shadow-sm hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
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
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-600 outline-none"
              />

              <button
                type="button"
                onClick={() => openWhatsAppCustomer(customer.noHpOwner || customer.noHpOutlet)}
                className="rounded-xl bg-green-600 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-green-700"
              >
                Buka WhatsApp
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">
                Status Call
              </label>
              <select
                value={callStatus}
                onChange={(event) => setCallStatus(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-700 outline-none focus:border-[#C92C1E]"
              >
                {CALL_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">
                Status Chat
              </label>
              <select
                value={chatStatus}
                onChange={(event) => setChatStatus(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-700 outline-none focus:border-[#C92C1E]"
              >
                {CHAT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-400">
                Tanggal Follow Up
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(event) => setFollowUpDate(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-700 outline-none focus:border-[#C92C1E]"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-400">
                Catatan Hasil Call
              </label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="Contoh: Customer tertarik, minta follow up besok jam 10.00"
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-[#C92C1E]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50"
            >
              Batal
            </button>

            <button
              type="submit"
              className="rounded-xl bg-[#C92C1E] px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#A82216]"
            >
              Simpan Hasil Call
            </button>
          </div>
        </form>
      </div>
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