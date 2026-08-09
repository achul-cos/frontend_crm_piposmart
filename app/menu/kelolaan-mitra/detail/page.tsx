"use client";

/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { formatPhoneDisplay } from "@/app/lib/phone";
import {
  assignPartnerPic,
  createPartnerInteraction,
  createPartnerReferral,
  getActivePartnerAssignment,
  getLeads,
  getPartner,
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
  type PartnerAssignmentItem,
  type PartnerCommissionItem,
  type PartnerCommissionRuleItem,
  type PartnerInteractionItem,
  type PartnerItem,
  type PartnerReferralItem,
  type UserResponse,
} from "@/app/lib/api";
import { useFeedback } from "@/app/components/feedback/FeedbackContext";

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

export default function PartnerDetailPage() {
  return (
    <Suspense fallback={null}>
      <PartnerDetailPageInner />
    </Suspense>
  );
}

function PartnerDetailPageInner() {
  usePageTitle("Detail Mitra");
  const { confirm, withLoading } = useFeedback();
  const searchParams = useSearchParams();
  const partnerId = Number(searchParams.get("id"));
  const focusInteraction = searchParams.get("tab") === "interaction";

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

  const [showInteractionForm, setShowInteractionForm] = useState(focusInteraction);
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [showMoreInteractions, setShowMoreInteractions] = useState(false);
  const [showMoreReferrals, setShowMoreReferrals] = useState(false);

  const isSales = currentRole === "SALES";
  const isAdmin = currentRole === "" || currentRole === "ADMIN";
  const canManage = isAdmin || currentRole === "SUPERVISOR";
  const canInteract = isSales || canManage;
  const leadMap = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);

  const reload = async () => {
    if (!Number.isFinite(partnerId) || partnerId <= 0) {
      setPageError("Partner ID tidak valid.");
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
    const ok = await confirm({
      title: "Lepas PIC Aktif",
      message: "Lepas PIC aktif dari mitra ini? Mitra akan tidak memiliki penanggung jawab sampai PIC baru ditugaskan.",
      confirmLabel: "Lepas PIC",
      danger: true,
    });
    if (!ok) return;

    setSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      await withLoading(() => releasePartnerPic(partnerId), {
        label: "Melepas PIC aktif...",
      });
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
      setActionError("Pilih lead yang direferensikan.");
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
      setActionSuccess("Referral partner berhasil dicatat.");
      await reload();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!partner) return;

    const ok = await confirm({
      title: "Pulihkan Mitra",
      message: `Pulihkan ${partner.name} menjadi aktif kembali?`,
      confirmLabel: "Pulihkan",
    });
    if (!ok) return;

    setSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      await withLoading(() => updatePartner(partner.id, { status: "ACTIVE" }), {
        label: "Memulihkan mitra...",
      });
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
              <div className="inline-flex rounded-full border border-red-100 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">Detail Mitra</div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-[32px]">{partner.name}</h1>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black ${partnerStatusTone(partner.status)}`}>{partner.status}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-500">{partner.code} • {partner.partner_type.name} • Halaman ini disusun vertikal per kelompok kerja agar lebih nyaman dibaca saat scroll panjang.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              <Link href="/menu/kelolaan-mitra" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-xs font-black text-slate-600 transition hover:bg-slate-50">Kembali ke List</Link>
              {partner.status === "INACTIVE" && isAdmin ? <button type="button" onClick={() => void handleRestore()} disabled={saving} className="rounded-2xl border border-green-100 bg-green-50 px-5 py-3 text-xs font-black text-green-700 disabled:cursor-not-allowed disabled:opacity-50">Pulihkan Mitra</button> : null}
              {canManage ? <button type="button" onClick={() => void handleSyncCommissions()} disabled={saving} className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-red-300">Sync Komisi</button> : null}
            </div>
          </div>
        </div>
      </section>

      {pageError ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{pageError}</div> : null}
      {actionError ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{actionError}</div> : null}
      {actionSuccess ? <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{actionSuccess}</div> : null}

      <SectionCard title="Ringkasan Mitra" subtitle="Ringkasan cepat di bagian atas agar konteks dasar langsung terbaca sebelum masuk ke detail yang lebih panjang.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Partner Type" value={<><div>{partner.partner_type.name}</div><div className="mt-1 text-xs text-slate-400">{partner.partner_type.code}</div></>} hint="Jenis mitra yang menjadi basis fallback komisi." />
          <MetricCard label="Komisi Dasar" value={formatFlatCommission(partner.partner_type)} hint="Dipakai bila tidak ada rule aktif yang lebih spesifik." accent />
          <MetricCard label="PIC Aktif" value={activeAssignment?.user_name || "Belum ada PIC"} hint={activeAssignment ? humanizeRole(activeAssignment.user_role) : "Belum ada sales yang ditugaskan."} />
          <MetricCard label="Rekening" value={partner.bank_account_masked || "Belum ada rekening"} hint="Backend hanya mengirim masked account." />
        </div>
      </SectionCard>

      <SectionCard title="Identitas Mitra" subtitle="Seluruh informasi profil utama ditempatkan dalam satu blok vertikal supaya tidak perlu melompat antar kolom saat membaca.">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Kode</p><p className="mt-2 text-sm font-black text-slate-900">{partner.code}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</p><p className="mt-2 text-sm font-black text-slate-900">{partner.status}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Telepon</p><p className="mt-2 text-sm font-black text-slate-900">{partner.phone ? formatPhoneDisplay(partner.phone) : "-"}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email</p><p className="mt-2 text-sm font-black text-slate-900">{partner.email || "-"}</p></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Alamat</p><p className="mt-2 text-sm font-black leading-6 text-slate-900">{partner.address || "Alamat belum diisi"}</p></div>
        </div>
      </SectionCard>

      <SectionCard title="Skema Komisi" subtitle="Komisi dasar dan rule aktif ditaruh dalam satu urutan supaya logika perhitungan partner mudah dipahami dari atas ke bawah.">
        <div className="space-y-5">
          <div className="rounded-[26px] border border-red-100 bg-[linear-gradient(135deg,#fff7f5_0%,#fff_58%,#fee2e2_100%)] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">Fallback Default</p>
            <p className="mt-3 text-xl font-black text-[#C92C1E]">{formatFlatCommission(partner.partner_type)}</p>
            <p className="mt-2 text-xs font-bold text-[#C92C1E]/70">Dipakai ketika backend tidak menemukan rule aktif yang lebih spesifik pada paket terkait.</p>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Rule Komisi Aktif</h3>
            <div className="mt-3 space-y-3">
              {commissionRules.length === 0 ? (
                <EmptyState message="Belum ada rule aktif. Backend akan memakai fallback flat dari partner type." />
              ) : (
                commissionRules.map((rule) => (
                  <div key={rule.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-slate-900">{rule.plan_name || "Semua Plan"}</p>
                      <span className="rounded-full border border-red-100 bg-white px-3 py-1 text-[10px] font-black text-[#C92C1E]">{rule.mode}</span>
                    </div>
                    <p className="mt-2 text-[11px] font-bold text-slate-400">Berlaku {formatDateOnly(rule.effective_from)} sampai {formatDateOnly(rule.effective_to)}</p>
                    {rule.value ? <p className="mt-2 text-sm font-bold text-slate-700">Nilai: {formatRuleValue(rule.mode, rule.value)}</p> : null}
                    {rule.mode === "TIER" && rule.tiers && rule.tiers.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {rule.tiers.map((tier) => (
                          <div key={tier.id} className="rounded-2xl border border-white bg-white px-4 py-3">
                            <p className="text-xs font-black text-slate-900">Tier {tier.tier_order}</p>
                            <p className="mt-1 text-[11px] font-bold text-slate-400">{tier.max_closings ? `${tier.min_closings} - ${tier.max_closings} closing` : `>= ${tier.min_closings} closing`}</p>
                            <p className="mt-2 text-sm font-bold text-slate-700">{formatRuleValue(tier.mode, tier.value)}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Operasional Harian" subtitle="Semua fitur aksi dikelompokkan vertikal agar alur kerja terasa berurutan saat melakukan follow up partner.">
        <div className="space-y-5">
          {canManage ? (
            <form onSubmit={handleAssignPic} className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-xs font-black text-slate-950">Assign PIC</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Tentukan sales yang bertanggung jawab atas hubungan mitra ini.</p>
              <div className="mt-4 space-y-3">
                <select value={assignUserId} onChange={(event) => setAssignUserId(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]">
                  <option value="">Pilih sales</option>
                  {salesUsers.map((user) => <option key={user.id} value={user.id}>{user.name} ({humanizeRole(user.role)})</option>)}
                </select>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="submit" disabled={saving} className="flex-1 rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-red-300">Simpan PIC</button>
                  {activeAssignment ? <button type="button" onClick={() => void handleReleasePic()} disabled={saving} className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50">Lepas PIC Aktif</button> : null}
                </div>
              </div>
            </form>
          ) : null}

          <div className={`rounded-[26px] border bg-white transition-all overflow-hidden ${focusInteraction || showInteractionForm ? "border-red-200 shadow-[0_0_0_4px_rgba(201,44,30,0.06)]" : "border-slate-200"}`}>
            <button
              type="button"
              onClick={() => setShowInteractionForm((prev) => !prev)}
              className="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50/50"
            >
              <div>
                <p className="text-xs font-black text-slate-950">Form Interaksi</p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">Catat call atau chat terakhir agar histori komunikasi mitra tetap rapi.</p>
              </div>
              <span className="ml-4 flex h-8 px-3 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 transition hover:bg-white hover:border-slate-300">
                {showInteractionForm ? "Sembunyikan Form ▲" : "Tampilkan Form ▼"}
              </span>
            </button>

            {showInteractionForm && (
              <form onSubmit={handleInteractionSubmit} className="border-t border-slate-100 p-5 pt-4">
                <div className="space-y-3">
                  <select value={interactionType} onChange={(event) => setInteractionType(event.target.value as "CALL" | "CHAT")} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]">
                    <option value="CALL">CALL</option>
                    <option value="CHAT">CHAT</option>
                  </select>
                  <input type="datetime-local" max={new Date().toISOString().slice(0, 16)} value={interactionAt} onChange={(event) => setInteractionAt(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" />
                  <textarea value={interactionNote} onChange={(event) => setInteractionNote(event.target.value)} rows={4} placeholder="Catatan interaksi dengan mitra" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" />
                  <button type="submit" disabled={!canInteract || saving} className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">Simpan Interaksi</button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white transition-all overflow-hidden">
            <button
              type="button"
              onClick={() => setShowReferralForm((prev) => !prev)}
              className="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50/50"
            >
              <div>
                <p className="text-xs font-black text-slate-950">Form Referral</p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">Catat lead dari jaringan partner ini agar jejak closing dan komisinya saling nyambung.</p>
              </div>
              <span className="ml-4 flex h-8 px-3 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 transition hover:bg-white hover:border-slate-300">
                {showReferralForm ? "Sembunyikan Form ▲" : "Tampilkan Form ▼"}
              </span>
            </button>

            {showReferralForm && (
              <form onSubmit={handleReferralSubmit} className="border-t border-slate-100 p-5 pt-4">
                <div className="space-y-3">
                  <select value={referralLeadId} onChange={(event) => setReferralLeadId(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]">
                    <option value="">Pilih lead</option>
                    {leads.map((lead) => <option key={lead.id} value={lead.id}>{leadLabel(lead)}</option>)}
                  </select>
                  <input type="datetime-local" value={referralDate} onChange={(event) => setReferralDate(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" />
                  <textarea value={referralNote} onChange={(event) => setReferralNote(event.target.value)} rows={4} placeholder="Catatan referral" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" />
                  <button type="submit" disabled={!canInteract || saving} className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">Simpan Referral</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Jejak Relasi" subtitle="Riwayat hubungan partner dikelompokkan bertahap: assignment PIC terlebih dulu, lalu histori interaksinya.">
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Riwayat Assignment PIC</h3>
            <div className="mt-3 space-y-3">
              {assignmentHistory.length === 0 ? <EmptyState message="Belum ada riwayat assignment." /> : assignmentHistory.map((item) => <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-black text-slate-900">{item.user_name || `User #${item.user_id}`}</p><p className="mt-1 text-[11px] font-bold text-slate-400">{humanizeRole(item.user_role)} • assign {formatDateTime(item.assigned_at)}</p><p className="mt-1 text-[11px] font-bold text-slate-400">Release {formatDateTime(item.unassigned_at)}</p></div>)}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Riwayat Interaksi</h3>
            <div className="mt-3 space-y-3">
              {interactions.length === 0 ? (
                <EmptyState message="Belum ada interaksi." />
              ) : (
                <>
                  {(showMoreInteractions ? interactions : interactions.slice(0, 3)).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black text-slate-900">{item.interaction_type}</p>
                        <p className="text-[11px] font-bold text-slate-400">{formatDateTime(item.interaction_at)}</p>
                      </div>
                      <p className="mt-3 text-sm font-bold leading-6 text-slate-700">{item.note || "Tanpa catatan"}</p>
                    </div>
                  ))}
                  {interactions.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowMoreInteractions((prev) => !prev)}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                    >
                      {showMoreInteractions ? "Sembunyikan Riwayat ▲" : `Tampilkan Selengkapnya (${interactions.length - 3} lagi) ▼`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Pipeline Partner" subtitle="Bagian paling bawah menyatukan kontribusi partner ke pipeline: referral lead lalu hasil komisinya.">
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Referral Lead</h3>
            <div className="mt-3 space-y-3">
              {referrals.length === 0 ? (
                <EmptyState message="Belum ada referral." />
              ) : (
                <>
                  {(showMoreReferrals ? referrals : referrals.slice(0, 3)).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-black text-slate-900">{leadMap.get(item.lead_id) ? leadLabel(leadMap.get(item.lead_id) as BackendLead) : `Lead #${item.lead_id}`}</p>
                      <p className="mt-1 text-[11px] font-bold text-slate-400">Referral {formatDateTime(item.referral_date)}</p>
                      <p className="mt-3 text-sm font-bold leading-6 text-slate-700">{item.notes || "Tanpa catatan"}</p>
                    </div>
                  ))}
                  {referrals.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowMoreReferrals((prev) => !prev)}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                    >
                      {showMoreReferrals ? "Sembunyikan Referral ▲" : `Tampilkan Selengkapnya (${referrals.length - 3} lagi) ▼`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Komisi Partner</h3>
            <div className="mt-3 space-y-3">
              {commissions.length === 0 ? (
                <EmptyState message="Belum ada komisi partner." />
              ) : (
                commissions.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-slate-900">{item.code}</p>
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
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
