"use client";

/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import {
  assignPartnerPic,
  createPartnerInteraction,
  createPartnerReferral,
  getActivePartnerAssignment,
  getLeads,
  getPartner,
  getPartnerActivity,
  getProfile,
  getSalesList,
  listPartnerAssignments,
  listPartnerCommissions,
  listPartnerInteractions,
  listPartnerReferrals,
  listPartnerTypeCommissionRules,
  releasePartnerPic,
  syncPartnerCommissions,
  updatePartner,
  type BackendLead,
  type PartnerActivityStatus,
  type PartnerAssignmentItem,
  type PartnerCommissionItem,
  type PartnerCommissionRuleItem,
  type PartnerInteractionItem,
  type PartnerItem,
  type PartnerReferralItem,
  type UserResponse,
} from "@/app/lib/api";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(value?: string | null) {
  if (!value) return "Tanpa batas";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  }
  return formatDateTime(value);
}

function formatMoney(value?: string | number | null, currency = "IDR") {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatFlatCommission(partnerType?: PartnerItem["partner_type"] | null) {
  if (!partnerType) return "-";
  const value = Number(partnerType.commission_value || 0);
  return partnerType.commission_mode === "PERCENTAGE" ? `${value}%` : formatMoney(value);
}

function formatRuleValue(mode: string, value?: string | null) {
  if (mode === "TIER") return "Bertingkat";
  if (!value) return "-";
  return mode === "PERCENTAGE" ? `${Number(value)}%` : formatMoney(value);
}

function humanizeRole(value?: string | null) {
  return String(value || "-")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function leadLabel(lead: BackendLead) {
  return lead.owner?.name || lead.owner?.phone || `Lead #${lead.id}`;
}

function partnerStatusTone(status: string) {
  return status === "ACTIVE"
    ? "border border-green-100 bg-green-50 text-green-700"
    : "border border-slate-200 bg-slate-100 text-slate-600";
}

function commissionStatusTone(status: string) {
  if (status === "PAID") return "border border-green-100 bg-green-50 text-green-700";
  if (status === "APPROVED") return "border border-blue-100 bg-blue-50 text-blue-700";
  if (status === "CANCELLED") return "border border-slate-200 bg-slate-100 text-slate-500";
  return "border border-amber-100 bg-amber-50 text-amber-700";
}

function SectionCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[30px] border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-100 px-5 py-4 md:px-6">
        <h2 className="text-sm font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[26px] border p-5 shadow-sm ${
        accent
          ? "border-red-100 bg-[linear-gradient(135deg,#fff7f5_0%,#fff_58%,#fee2e2_100%)]"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${accent ? "text-[#C92C1E]" : "text-slate-400"}`}>
        {label}
      </p>
      <div className={`mt-4 text-lg font-black ${accent ? "text-[#C92C1E]" : "text-slate-950"}`}>{value}</div>
      <p className={`mt-2 text-xs font-bold ${accent ? "text-[#C92C1E]/70" : "text-slate-400"}`}>{hint}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs font-bold text-slate-400">
      {message}
    </div>
  );
}

export default function MitraSalesDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-bold text-slate-400">Memuat detail mitra...</div>}>
      <MitraSalesDetailPageInner />
    </Suspense>
  );
}

function MitraSalesDetailPageInner() {
  usePageTitle("Detail Mitra Sales");
  const searchParams = useSearchParams();
  const partnerId = Number(searchParams.get("id"));
  const focusInteraction = searchParams.get("tab") === "interaction";
  const focusReferral = searchParams.get("tab") === "referral";

  const [currentRole, setCurrentRole] = useState("");
  const [partner, setPartner] = useState<PartnerItem | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<PartnerAssignmentItem | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<PartnerAssignmentItem[]>([]);
  const [interactions, setInteractions] = useState<PartnerInteractionItem[]>([]);
  const [referrals, setReferrals] = useState<PartnerReferralItem[]>([]);
  const [commissions, setCommissions] = useState<PartnerCommissionItem[]>([]);
  const [commissionRules, setCommissionRules] = useState<PartnerCommissionRuleItem[]>([]);
  const [salesUsers, setSalesUsers] = useState<UserResponse[]>([]);
  const [leads, setLeads] = useState<BackendLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [assignUserId, setAssignUserId] = useState("");

  const [interactionType, setInteractionType] = useState<"CALL" | "CHAT">("CALL");
  const [interactionAt, setInteractionAt] = useState("");
  const [interactionNote, setInteractionNote] = useState("");
  const [referralLeadId, setReferralLeadId] = useState("");
  const [referralDate, setReferralDate] = useState("");
  const [referralNote, setReferralNote] = useState("");

  // Sprint 15a — status keaktifan bulanan: sudah/belum PIC sales memasukkan
  // data referral lead untuk mitra ini pada bulan yang dipilih.
  const [activityMonth, setActivityMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [activityStatus, setActivityStatus] = useState<PartnerActivityStatus | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");

  const isSales = currentRole === "SALES";
  const isAdmin = currentRole === "" || currentRole === "ADMIN";
  const canManage = isAdmin || currentRole === "SUPERVISOR" || isSales;
  const leadMap = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);

  const reload = async () => {
    if (!Number.isFinite(partnerId) || partnerId <= 0) {
      setPageError("ID Mitra tidak valid.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError("");
    try {
      const [partnerResult, profileResult, leadsResult, salesResult, activeAssignmentResult, assignmentsResult, interactionsResult, referralsResult, commissionsResult] = await Promise.allSettled([
        getPartner(partnerId),
        getProfile(),
        getLeads(),
        getSalesList(),
        getActivePartnerAssignment(partnerId),
        listPartnerAssignments(partnerId),
        listPartnerInteractions(partnerId, { limit: 50, offset: 0 }),
        listPartnerReferrals(partnerId),
        listPartnerCommissions(partnerId, { page: 1, limit: 20 }),
      ]);

      if (partnerResult.status !== "fulfilled") throw partnerResult.reason;

      setPartner(partnerResult.value);
      setCurrentRole(
        profileResult.status === "fulfilled"
          ? profileResult.value.role || ""
          : typeof window !== "undefined"
            ? localStorage.getItem("piposmart_user_role") || ""
            : "",
      );
      setLeads(leadsResult.status === "fulfilled" ? leadsResult.value : []);
      setSalesUsers(salesResult.status === "fulfilled" ? salesResult.value : []);
      setActiveAssignment(activeAssignmentResult.status === "fulfilled" ? activeAssignmentResult.value : null);
      setAssignmentHistory(assignmentsResult.status === "fulfilled" ? assignmentsResult.value.items : []);
      setInteractions(interactionsResult.status === "fulfilled" ? interactionsResult.value.items : []);
      setReferrals(referralsResult.status === "fulfilled" ? referralsResult.value.items : []);
      setCommissions(commissionsResult.status === "fulfilled" ? commissionsResult.value.items : []);
      setAssignUserId(activeAssignmentResult.status === "fulfilled" && activeAssignmentResult.value ? String(activeAssignmentResult.value.user_id) : "");

      try {
        const rulesResult = await listPartnerTypeCommissionRules(partnerResult.value.partner_type.id, { active_only: true });
        setCommissionRules(Array.isArray(rulesResult.items) ? rulesResult.items : []);
      } catch {
        setCommissionRules([]);
      }
    } catch (error) {
      setPageError(getErrorMessage(error));
      setPartner(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [partnerId]);

  useEffect(() => {
    if (!partnerId || Number.isNaN(partnerId)) return;
    let cancelled = false;
    setActivityLoading(true);
    setActivityError("");
    getPartnerActivity(partnerId, activityMonth)
      .then((result) => {
        if (!cancelled) setActivityStatus(result);
      })
      .catch((error) => {
        if (!cancelled) setActivityError(getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerId, activityMonth]);

  const handleAssignPic = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assignUserId) {
      setActionError("Pilih sales yang akan menjadi PIC.");
      return;
    }
    setSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      await assignPartnerPic(partnerId, { user_id: Number(assignUserId) });
      setActionSuccess("PIC aktif berhasil diperbarui.");
      await reload();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleReleasePic = async () => {
    if (!window.confirm("Lepas PIC aktif dari mitra ini?")) return;
    setSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      await releasePartnerPic(partnerId);
      setActionSuccess("PIC aktif berhasil dilepas.");
      await reload();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleInteractionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      await createPartnerInteraction(partnerId, {
        interaction_type: interactionType,
        interaction_at: interactionAt ? new Date(interactionAt).toISOString() : undefined,
        note: interactionNote.trim() || undefined,
      });
      setInteractionAt("");
      setInteractionNote("");
      setActionSuccess("Interaksi mitra berhasil dicatat.");
      await reload();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleReferralSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!referralLeadId) {
      setActionError("Pilih lead yang berafiliasi dengan mitra ini.");
      return;
    }
    setSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      await createPartnerReferral(partnerId, {
        lead_id: Number(referralLeadId),
        referral_date: referralDate ? new Date(referralDate).toISOString() : undefined,
        notes: referralNote.trim() || undefined,
      });
      setReferralLeadId("");
      setReferralDate("");
      setReferralNote("");
      setActionSuccess("Lead Afiliasi Mitra berhasil ditambahkan.");
      await reload();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!partner || !window.confirm(`Pulihkan ${partner.name} menjadi ACTIVE?`)) return;
    setSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      await updatePartner(partner.id, { status: "ACTIVE" });
      setActionSuccess("Mitra berhasil dipulihkan.");
      await reload();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSyncCommissions = async () => {
    setSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      const result = await syncPartnerCommissions(partnerId);
      setActionSuccess(`Sync komisi selesai. ${result.created} komisi baru dibuat.`);
      await reload();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !partner) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-400">Memuat detail mitra...</div>;
  }

  if (!partner) {
    return <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-600">{pageError || "Data mitra tidak ditemukan."}</div>;
  }

  return (
    <div className="w-full space-y-6 font-sans text-slate-900">
      <section className="relative overflow-hidden rounded-[34px] border border-red-100 bg-[linear-gradient(135deg,#fff_0%,#fff8f5_55%,#fee2e2_100%)] shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-bl-[88px] bg-red-50/80" />
          <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-red-100 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">Detail Mitra Sales</div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-[32px]">{partner.name}</h1>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black ${partnerStatusTone(partner.status)}`}>{partner.status}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-500">{partner.code} • {partner.partner_type.name} • Pengelolaan Mitra, penugasan PIC Sales, serta pencatatan Lead Afiliasi Mitra.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              <Link href="/menu/mitra-sales" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-xs font-black text-slate-600 transition hover:bg-slate-50">Kembali ke List Mitra</Link>
              {partner.status === "INACTIVE" && isAdmin ? <button type="button" onClick={() => void handleRestore()} disabled={saving} className="rounded-2xl border border-green-100 bg-green-50 px-5 py-3 text-xs font-black text-green-700 disabled:cursor-not-allowed disabled:opacity-50">Pulihkan Mitra</button> : null}
              {canManage ? <button type="button" onClick={() => void handleSyncCommissions()} disabled={saving} className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-red-300">Sync Komisi</button> : null}
            </div>
          </div>
        </div>
      </section>

      {pageError ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{pageError}</div> : null}
      {actionError ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{actionError}</div> : null}
      {actionSuccess ? <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{actionSuccess}</div> : null}

      <SectionCard title="Ringkasan Mitra" subtitle="Informasi utama identitas, komisi dasar, dan PIC Sales penanggung jawab.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Partner Type" value={<><div>{partner.partner_type.name}</div><div className="mt-1 text-xs text-slate-400">{partner.partner_type.code}</div></>} hint="Jenis mitra basis komisi dasar." />
          <MetricCard label="Komisi Dasar" value={formatFlatCommission(partner.partner_type)} hint="Rate komisi fallback default." accent />
          <MetricCard label="PIC Aktif" value={activeAssignment?.user_name || "Belum ada PIC"} hint={activeAssignment ? humanizeRole(activeAssignment.user_role) : "Penanggung jawab mitra."} />
          <MetricCard label="Lead Berafiliasi" value={referrals.length} hint="Jumlah Lead yang berafiliasi dengan Mitra." />
        </div>
      </SectionCard>

      <SectionCard title="Status Keaktifan Bulanan" subtitle="Apakah PIC Sales sudah memasukkan data referral lead untuk mitra ini pada bulan terpilih.">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <label className="flex items-center gap-3">
            <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">Bulan</span>
            <input
              type="month"
              value={activityMonth}
              onChange={(event) => setActivityMonth(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#C92C1E]"
            />
          </label>

          {activityLoading ? (
            <span className="text-xs font-bold text-slate-400">Memuat status...</span>
          ) : activityError ? (
            <span className="text-xs font-bold text-red-600">{activityError}</span>
          ) : activityStatus ? (
            <span
              className={`w-max rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide ${
                activityStatus.status === "TELAH_MEMBERIKAN_REFERAL"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {activityStatus.status === "TELAH_MEMBERIKAN_REFERAL"
                ? "Telah Memberikan Referal"
                : "Belum Memberikan Referal"}
            </span>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Identitas & Profil Mitra" subtitle="Informasi detail kontak dan alamat mitra.">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Kode Mitra</p><p className="mt-2 text-sm font-black text-slate-900">{partner.code}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</p><p className="mt-2 text-sm font-black text-slate-900">{partner.status}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Telepon</p><p className="mt-2 text-sm font-black text-slate-900">{partner.phone || "-"}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email</p><p className="mt-2 text-sm font-black text-slate-900">{partner.email || "-"}</p></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Alamat</p><p className="mt-2 text-sm font-black leading-6 text-slate-900">{partner.address || "Alamat belum diisi"}</p></div>
        </div>
      </SectionCard>

      <SectionCard title="Pengelolaan & Operasional Sales Mitra" subtitle="Form penugasan PIC Sales, penambahan Lead Afiliasi Mitra, dan pencatatan interaksi.">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* PIC Sales Assignment Form */}
          <form onSubmit={handleAssignPic} className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-black text-[#C92C1E]">1</span>
              <p className="text-xs font-black text-slate-950">Penugasan PIC Sales</p>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500">Sales dapat mengatur dan mengambil alih tanggung jawab mitra ini.</p>
            <div className="mt-4 space-y-3">
              <select value={assignUserId} onChange={(event) => setAssignUserId(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]">
                <option value="">Pilih Sales PIC</option>
                {salesUsers.map((user) => <option key={user.id} value={user.id}>{user.name} ({humanizeRole(user.role)})</option>)}
              </select>
              <div className="flex flex-col gap-2">
                <button type="submit" disabled={saving} className="w-full rounded-2xl bg-[#C92C1E] px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300">Simpan PIC Sales</button>
                {activeAssignment ? <button type="button" onClick={() => void handleReleasePic()} disabled={saving} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Lepas PIC Aktif</button> : null}
              </div>
            </div>
          </form>

          {/* Form Lead Afiliasi Mitra */}
          <form onSubmit={handleReferralSubmit} className={`rounded-[26px] border bg-white p-5 ${focusReferral ? "border-red-300 shadow-[0_0_0_4px_rgba(201,44,30,0.08)]" : "border-red-100 bg-[linear-gradient(135deg,#fff_0%,#fff7f5_100%)]"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C92C1E] text-xs font-black text-white">2</span>
                <p className="text-xs font-black text-slate-950">Tambah Lead Afiliasi Mitra</p>
              </div>
              <Link href="/menu/lead/form" className="text-[10px] font-bold text-[#C92C1E] underline hover:text-red-700">+ Lead Baru</Link>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500">Daftarkan Lead yang berafiliasi dengan Mitra untuk pelacakan komisi.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-slate-500">Pilih Lead</label>
                <select value={referralLeadId} onChange={(event) => setReferralLeadId(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]">
                  <option value="">-- Pilih Lead Terdaftar --</option>
                  {leads.map((lead) => <option key={lead.id} value={lead.id}>{leadLabel(lead)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-slate-500">Tanggal Referensi</label>
                <input type="datetime-local" value={referralDate} onChange={(event) => setReferralDate(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase text-slate-500">Catatan Afiliasi</label>
                <textarea value={referralNote} onChange={(event) => setReferralNote(event.target.value)} rows={2} placeholder="Misal: Direkomendasikan saat event / rekomendasi cabang" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" />
              </div>
              <button type="submit" disabled={saving} className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">+ Hubungkan Lead Afiliasi</button>
            </div>
          </form>

          {/* Form Interaksi Mitra */}
          <form onSubmit={handleInteractionSubmit} className={`rounded-[26px] border bg-white p-5 ${focusInteraction ? "border-red-300 shadow-[0_0_0_4px_rgba(201,44,30,0.08)]" : "border-slate-200"}`}>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">3</span>
              <p className="text-xs font-black text-slate-950">Catat Interaksi Mitra</p>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500">Catat hasil komunikasi Call/Chat dengan mitra ini.</p>
            <div className="mt-4 space-y-3">
              <select value={interactionType} onChange={(event) => setInteractionType(event.target.value as "CALL" | "CHAT")} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]">
                <option value="CALL">CALL (Telepon)</option>
                <option value="CHAT">CHAT (WhatsApp / Message)</option>
              </select>
              <input type="datetime-local" value={interactionAt} onChange={(event) => setInteractionAt(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" />
              <textarea value={interactionNote} onChange={(event) => setInteractionNote(event.target.value)} rows={2} placeholder="Hasil pembahasan dengan mitra" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" />
              <button type="submit" disabled={saving} className="w-full rounded-2xl border border-slate-900 bg-white px-5 py-3 text-xs font-black text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed">Simpan Log Interaksi</button>
            </div>
          </form>
        </div>
      </SectionCard>

      <SectionCard title="Daftar Lead Berafiliasi Mitra (Referral Leads)" subtitle="Semua Lead yang ditambahkan dan berafiliasi dengan Mitra Sales ini.">
        <div className="space-y-4">
          {referrals.length === 0 ? (
            <EmptyState message="Belum ada Lead yang berafiliasi dengan Mitra ini. Gunakan form di atas untuk menghubungkan Lead." />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {referrals.map((item) => {
                const leadObj = leadMap.get(item.lead_id);
                return (
                  <div key={item.id} className="flex flex-col justify-between rounded-2xl border border-red-100 bg-white p-4 shadow-sm transition hover:border-red-200">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-black text-[#C92C1E]">Lead Afiliasi #{item.lead_id}</span>
                        <span className="text-[10px] font-bold text-slate-400">{formatDateTime(item.referral_date)}</span>
                      </div>
                      <h4 className="mt-2 text-base font-black text-slate-900">{leadObj ? leadLabel(leadObj) : `Lead #${item.lead_id}`}</h4>
                      {leadObj?.owner?.phone ? <p className="mt-1 text-xs font-medium text-slate-500">HP: {leadObj.owner.phone}</p> : null}
                      {item.notes ? <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-700">{item.notes}</p> : null}
                    </div>
                    {leadObj ? (
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-500">
                        <span>Stage: <strong className="text-slate-800">{leadObj.stage}</strong></span>
                        <Link href={`/menu/lead?search=${leadObj.id}`} className="text-[#C92C1E] hover:underline">Lihat Detail Lead →</Link>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Jejak Riwayat & Interaksi" subtitle="Riwayat penugasan PIC Sales dan log komunikasi mitra.">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Riwayat Penugasan PIC</h3>
            <div className="mt-3 space-y-3">
              {assignmentHistory.length === 0 ? <EmptyState message="Belum ada riwayat assignment." /> : assignmentHistory.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-black text-slate-900">{item.user_name || `User #${item.user_id}`}</p><p className="mt-1 text-[11px] font-bold text-slate-400">{humanizeRole(item.user_role)} • assign {formatDateTime(item.assigned_at)}</p><p className="mt-1 text-[11px] font-bold text-slate-400">Release {formatDateTime(item.unassigned_at)}</p></div>)}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Riwayat Interaksi</h3>
            <div className="mt-3 space-y-3">
              {interactions.length === 0 ? <EmptyState message="Belum ada interaksi." /> : interactions.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><p className="font-black text-slate-900">{item.interaction_type}</p><p className="text-[11px] font-bold text-slate-400">{formatDateTime(item.interaction_at)}</p></div><p className="mt-3 text-sm font-bold leading-6 text-slate-700">{item.note || "Tanpa catatan"}</p></div>)}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Komisi Partner" subtitle="Daftar komisi hasil transaksi Lead berafiliasi dengan Mitra ini.">
        <div className="space-y-3">
          {commissions.length === 0 ? (
            <EmptyState message="Belum ada komisi partner." />
          ) : (
            commissions.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-[#C92C1E]">{item.code}</p>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black ${commissionStatusTone(item.status)}`}>{item.status}</span>
                    </div>
                    <p className="mt-1 text-[11px] font-bold text-slate-400">Closing {item.closing_code || `#${item.closing_id}`}</p>
                  </div>
                  <span className="rounded-full border border-red-100 bg-white px-3 py-1 text-[10px] font-black text-[#C92C1E]">{formatMoney(item.commission_amount, item.currency || "IDR")}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white bg-white px-3 py-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Mode</p><p className="mt-2 text-sm font-black text-slate-900">{item.commission_mode}</p></div>
                  <div className="rounded-2xl border border-white bg-white px-3 py-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Value</p><p className="mt-2 text-sm font-black text-slate-900">{item.commission_value}</p></div>
                  <div className="rounded-2xl border border-white bg-white px-3 py-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Base Amount</p><p className="mt-2 text-sm font-black text-slate-900">{formatMoney(item.base_amount, item.currency || "IDR")}</p></div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}