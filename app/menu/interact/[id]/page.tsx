"use client";

import React, { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { useInteractionDetailQuery } from "@/app/lib/queries/interact";
import { ArrowLeft, Clock, Calendar, User, Phone, Tag, Award, CheckCircle } from "lucide-react";

export default function InteractionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const interactionId = parseInt(id, 10);
  
  usePageTitle(`Detail Interaksi #${interactionId} | CRM Piposmart`);

  const { data: interaction, isLoading, error } = useInteractionDetailQuery(interactionId, !isNaN(interactionId));

  const formatDateTime = (str?: string) => {
    if (!str) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(str));
  };

  const formatDate = (str?: string) => {
    if (!str) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
    }).format(new Date(str));
  };

  const getScoreBadge = (score?: number | null) => {
    if (score === 3) return <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">3 (Langganan)</span>;
    if (score === 2) return <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">2 (Potensial)</span>;
    if (score === 1) return <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">1 (Kemungkinan)</span>;
    return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">0 (Tidak Potensial)</span>;
  };

  const getTypeBadgeClass = (type?: string) => {
    switch (type) {
      case "CALL":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "CHAT":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "CALL_CHAT":
        return "bg-violet-100 text-violet-700 border-violet-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#C92C1E]" />
      </div>
    );
  }

  if (error || !interaction) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
        <p className="font-bold">Gagal memuat data detail interaksi.</p>
        <p className="mt-1 text-xs">{error instanceof Error ? error.message : "Data tidak ditemukan"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-black"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 font-sans text-[#1C1C1E]">
      {/* 1. Header & Navigation */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="border-b-2 border-[#C92C1E] p-5">
          <div className="mb-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar
            </button>
          </div>
          
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
            <span>Menu</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/menu/interact" className="transition hover:text-[#C92C1E]">Interact</Link>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Detail Interaksi</span>
          </div>
          
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Detail Interaksi #{interaction.id}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Rincian aktivitas interaksi customer {interaction.contact_name} oleh sales PIC.
          </p>
        </div>
      </div>

      {/* 2. Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Client & Sales Metadata */}
        <div className="space-y-6 lg:col-span-1">
          {/* Card: Customer Info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-400">Data Kustomer & PIC</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-5 w-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400">Nama Customer</p>
                  <p className="text-sm font-bold text-gray-900">{interaction.contact_name || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400">Nomor Telepon</p>
                  <p className="text-sm font-semibold text-gray-900">{interaction.contact_phone || "-"}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-[#C92C1E] shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Sales PIC</p>
                    <p className="text-sm font-bold text-gray-950">{interaction.sales?.name || "Tanpa PIC"}</p>
                  </div>
                </div>
              </div>

              {interaction.supervisor?.name && (
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-5 w-5 text-gray-600 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Supervisor</p>
                    <p className="text-sm font-bold text-gray-900">{interaction.supervisor.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card: Interaction Channels */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-400">Tipe & Status Saluran</h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1.5">Tipe Interaksi</p>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${getTypeBadgeClass(interaction.type)}`}>
                  {interaction.type}
                </span>
              </div>

              {interaction.call_status && (
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Status Panggilan</p>
                  <span className="inline-flex rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 border border-sky-100">
                    {interaction.call_status}
                  </span>
                </div>
              )}

              {interaction.chat_status && (
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Status Obrolan (Chat)</p>
                  <span className="inline-flex rounded-lg bg-fuchsia-50 px-2.5 py-1 text-xs font-semibold text-fuchsia-700 border border-fuchsia-100">
                    {interaction.chat_status}
                  </span>
                </div>
              )}

              {interaction.duration_seconds !== null && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500 font-semibold">
                    Durasi Panggilan: {interaction.duration_seconds} detik
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interaction Records & Notes */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card: Interaction Results */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-400">Hasil & Analisa Interaksi</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 pb-6 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Skor Prospek Akhir</p>
                <div>{getScoreBadge(interaction.score_after)}</div>
                <div className="mt-2 text-xs text-gray-500">
                  Sebelumnya: <span className="font-bold text-gray-700">{interaction.score_before !== null ? interaction.score_before : "-"}</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Remark Hasil</p>
                <div className="flex items-center gap-1.5 font-bold text-gray-900">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <span>{interaction.remark_label || "-"}</span>
                </div>
                {interaction.remark_code && (
                  <span className="mt-1.5 inline-block text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500 uppercase">
                    Kode: {interaction.remark_code}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 pb-6 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Tahapan Prospek (Stage)</p>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#C92C1E]" />
                  <span className="text-sm font-black text-gray-800 uppercase">{interaction.stage_after || "-"}</span>
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  Sebelumnya: <span className="font-semibold text-gray-700">{interaction.stage_before || "-"}</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Status Penugasan</p>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-black text-gray-800 uppercase">{interaction.status_after || "-"}</span>
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  Sebelumnya: <span className="font-semibold text-gray-700">{interaction.status_before || "-"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Respon Kustomer</p>
                <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {interaction.customer_response || "Tidak ada respon customer yang dicatat."}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Catatan Tambahan Sales</p>
                <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {interaction.note || "Tidak ada catatan tambahan."}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Follow Up & Meta */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-400">Tindak Lanjut & Log Pembuatan</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Follow Up Section */}
              <div className="rounded-xl border border-red-100 bg-[#FFF7F5] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E] mb-2 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Agenda Follow Up Berikutnya
                </p>
                {interaction.follow_up_at ? (
                  <div>
                    <p className="text-sm font-black text-slate-900">{formatDate(interaction.follow_up_at)}</p>
                    <p className="mt-2 text-xs font-semibold text-gray-600 whitespace-pre-line">
                      {interaction.follow_up_note || "Tidak ada instruksi khusus."}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400">Tidak ada agenda follow-up lanjutan.</p>
                )}
              </div>

              {/* Creator Metadata */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                <div>
                  <p className="text-[9px] font-black uppercase text-gray-400">Dibuat Oleh</p>
                  <p className="text-xs font-bold text-gray-800">{interaction.created_by?.name || "Sistem"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-gray-400">Waktu Interaksi Terjadi</p>
                  <p className="text-xs font-semibold text-gray-700">{formatDateTime(interaction.interaction_at)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-gray-400">Tanggal Pencatatan</p>
                  <p className="text-xs font-semibold text-gray-700">{formatDateTime(interaction.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
