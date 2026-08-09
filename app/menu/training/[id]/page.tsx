"use client";

import React, { use } from "react";
import Link from "next/link";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { useTrainingDetailQuery } from "@/app/lib/queries/training";

export default function TrainingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  usePageTitle("Detail Training | CRM Piposmart");
  const { id } = use(params);
  const trainingId = Number(id);
  const isInvalidTrainingId = !trainingId || Number.isNaN(trainingId);

  const {
    data: training,
    isLoading: isQueryLoading,
    error: queryError,
  } = useTrainingDetailQuery(trainingId, !isInvalidTrainingId);

  const isLoading = isInvalidTrainingId ? false : isQueryLoading;
  const error = isInvalidTrainingId
    ? "ID training tidak valid."
    : queryError
    ? (queryError as Error).message || "Gagal memuat data training."
    : null;

  const formatDateTime = (str?: string | null) => {
    if (!str) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(str));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black uppercase shadow-sm">Scheduled</span>;
      case "COMPLETED":
        return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black uppercase shadow-sm">Completed</span>;
      case "CANCELED":
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black uppercase shadow-sm">Canceled</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-black uppercase shadow-sm">{status}</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === "ONLINE") {
      return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs font-bold shadow-sm">Online (Virtual)</span>;
    }
    return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded text-xs font-bold shadow-sm">Offline (Di Tempat)</span>;
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 font-sans text-[#1C1C1E]">
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-10 text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#C92C1E] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Memuat detail training...</p>
        </div>
      </div>
    );
  }

  if (error || !training) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 font-sans text-[#1C1C1E]">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-10 text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-600 font-bold">{error || "Training tidak ditemukan."}</p>
          <Link href="/menu/training" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-colors">
            Kembali ke Daftar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 font-sans text-[#1C1C1E]">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b-2 border-[#C92C1E] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
              <Link href="/menu/training" className="hover:text-[#C92C1E] transition-colors">Training</Link>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              <span className="text-[#C92C1E]">Detail Training #{training.id}</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Detail Jadwal Training</h1>
            <p className="mt-1 text-sm text-gray-500">Informasi lengkap pelaksanaan training kustomer.</p>
          </div>
          <Link href="/menu/training" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Kembali ke Daftar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">Status &amp; Tipe Training</h2>
            <div className="flex items-center gap-3 flex-wrap">
              {getStatusBadge(training.status)}
              {getTypeBadge(training.training_type)}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">Waktu Pelaksanaan</h2>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-500 block mb-0.5">Jadwal Utama</span>
                <span className="font-bold text-gray-900">{formatDateTime(training.scheduled_at)}</span>
              </div>
              {training.rescheduled_at && (
                <div>
                  <span className="text-xs text-orange-500 block mb-0.5">Dijadwalkan Ulang</span>
                  <span className="font-bold text-gray-900">{formatDateTime(training.rescheduled_at)}</span>
                </div>
              )}
              {training.status === "COMPLETED" && training.completed_at && (
                <div>
                  <span className="text-xs text-emerald-600 block mb-0.5">Selesai Pada</span>
                  <span className="font-bold text-gray-900">{formatDateTime(training.completed_at)}</span>
                </div>
              )}
              {training.status === "CANCELED" && training.canceled_at && (
                <div>
                  <span className="text-xs text-red-500 block mb-0.5">Dibatalkan Pada</span>
                  <span className="font-bold text-gray-900">{formatDateTime(training.canceled_at)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">Lokasi / Tautan Meeting</h2>
            {training.training_type === "ONLINE" ? (
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {training.meeting_url ? (
                  <a href={training.meeting_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold break-all text-sm">{training.meeting_url}</a>
                ) : (
                  <span className="italic text-gray-400 text-sm">Belum ada link meeting</span>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-bold text-gray-900 text-sm">{training.location || <span className="italic text-gray-400 font-normal">Lokasi belum ditentukan</span>}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">Kustomer (Pemilik Outlet)</h2>
            {training.owner_name ? (
              <div className="space-y-1 mb-3">
                <p className="font-bold text-gray-900 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#C92C1E]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                  {training.owner_name}
                </p>
                {training.owner_code && <p className="text-xs text-gray-400">Kode Owner: <span className="font-mono font-bold text-gray-600">{training.owner_code}</span></p>}
                {training.lead_code && <p className="text-xs text-gray-400">Kode Lead: <span className="font-mono font-bold text-gray-600">#{training.lead_code}</span></p>}
              </div>
            ) : (
              <p className="italic text-gray-400 text-sm mb-3">Tidak ada data kustomer</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
            <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">Tim Pelaksana</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-400 block mb-1">PIC Sales</span>
                <p className="font-bold text-gray-900 text-sm flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-[#C92C1E]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                  {training.sales?.name || "-"}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400 block mb-1">Supervisor</span>
                <p className="font-bold text-gray-900 text-sm">{training.supervisor?.name || "-"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5 space-y-4">
            <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Catatan &amp; Hasil</h2>
            {training.note && (
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">Catatan Persiapan</span>
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-gray-700 text-sm whitespace-pre-wrap">{training.note}</div>
              </div>
            )}
            {training.status === "COMPLETED" && training.result_note && (
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block mb-1">Catatan Hasil (Result)</span>
                <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-gray-700 text-sm whitespace-pre-wrap">{training.result_note}</div>
              </div>
            )}
            {training.status === "CANCELED" && training.cancel_reason && (
              <div>
                <span className="text-[10px] font-black uppercase text-red-600 tracking-wider block mb-1">Alasan Pembatalan</span>
                <div className="bg-red-50/50 p-3 rounded-lg border border-red-100 text-gray-700 text-sm whitespace-pre-wrap">{training.cancel_reason}</div>
              </div>
            )}
            {!training.note && !training.result_note && !training.cancel_reason && (
              <p className="text-gray-400 italic text-sm">Tidak ada catatan.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-5">
        <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">Informasi Rekam</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="block text-gray-400 mb-0.5">Dibuat oleh</span>
            <span className="font-bold text-gray-700">{training.created_by?.name || "-"}</span>
          </div>
          <div>
            <span className="block text-gray-400 mb-0.5">Diperbarui oleh</span>
            <span className="font-bold text-gray-700">{training.updated_by?.name || "-"}</span>
          </div>
          <div>
            <span className="block text-gray-400 mb-0.5">Dibuat pada</span>
            <span className="font-bold text-gray-700">{new Date(training.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</span>
          </div>
          <div>
            <span className="block text-gray-400 mb-0.5">ID Training</span>
            <span className="font-mono font-bold text-gray-700">#{training.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
