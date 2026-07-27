"use client";

/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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

function humanizeRole(value?: string | null) {
  return String(value || "-")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function leadLabel(lead: BackendLead) {
  return lead.nama || lead.email || lead.no_hp || `Lead #${lead.id}`;
}

export default function PartnerDetailPage() {
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

      if (partnerResult.status !== "fulfilled") {
        throw partnerResult.reason;
      }

      setPartner(partnerResult.value);
      setCurrentRole(profileResult.status === "fulfilled" ? profileResult.value.role || "" : typeof window !== "undefined" ? localStorage.getItem("piposmart_user_role") || "" : "");
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
    return <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm font-bold text-gray-400">Memuat detail mitra...</div>;
  }

  if (!partner) {
    return <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-bold text-red-600">{pageError || "Data mitra tidak ditemukan."}</div>;
  }

  return (
    <div className="w-full space-y-6 font-sans text-[#1C1C1E]">
      <section className="overflow-hidden rounded-3xl border border-red-100 bg-white shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-[80px] bg-red-50" />
          <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">Detail Mitra</div>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-gray-950 md:text-3xl">{partner.name}</h1>
              <p className="mt-2 text-sm font-medium text-gray-500">{partner.code}  {partner.partner_type.name}  status {partner.status}</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              <Link href="/menu/kelolaan-mitra" className="rounded-2xl border border-gray-200 px-5 py-3 text-center text-xs font-black text-gray-600 transition hover:bg-gray-50">Kembali ke List</Link>
              {partner.status === "INACTIVE" && isAdmin ? <button type="button" onClick={() => void handleRestore()} disabled={saving} className="rounded-2xl border border-green-100 bg-green-50 px-5 py-3 text-xs font-black text-green-700 disabled:cursor-not-allowed disabled:opacity-50">Pulihkan Mitra</button> : null}
              {canManage ? <button type="button" onClick={() => void handleSyncCommissions()} disabled={saving} className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-red-300">Sync Komisi</button> : null}
            </div>
          </div>
        </div>
      </section>

      {pageError ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{pageError}</div> : null}
      {actionError ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{actionError}</div> : null}
      {actionSuccess ? <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{actionSuccess}</div> : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Partner Type</p><p className="mt-3 text-lg font-black text-gray-950">{partner.partner_type.name}</p><p className="mt-1 text-xs font-bold text-gray-400">{partner.partner_type.code}</p></div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Komisi Dasar</p><p className="mt-3 text-lg font-black text-gray-950">{formatFlatCommission(partner.partner_type)}</p><p className="mt-1 text-xs font-bold text-gray-400">Fallback flat dari partner type</p></div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-gray-400">PIC Aktif</p><p className="mt-3 text-lg font-black text-gray-950">{activeAssignment?.user_name || "Belum ada PIC"}</p><p className="mt-1 text-xs font-bold text-gray-400">{humanizeRole(activeAssignment?.user_role)}</p></div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Rekening</p><p className="mt-3 text-lg font-black text-gray-950">{partner.bank_account_masked || "Belum ada rekening"}</p><p className="mt-1 text-xs font-bold text-gray-400">Backend hanya mengirim masked account</p></div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-sm font-black text-gray-900">Informasi Mitra</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-bold text-gray-600"><span className="block text-[10px] uppercase tracking-wider text-gray-400">Kode</span>{partner.code}</div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-bold text-gray-600"><span className="block text-[10px] uppercase tracking-wider text-gray-400">Status</span>{partner.status}</div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-bold text-gray-600"><span className="block text-[10px] uppercase tracking-wider text-gray-400">Telepon</span>{partner.phone || "-"}</div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-bold text-gray-600"><span className="block text-[10px] uppercase tracking-wider text-gray-400">Email</span>{partner.email || "-"}</div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-bold text-gray-600 md:col-span-2"><span className="block text-[10px] uppercase tracking-wider text-gray-400">Alamat</span>{partner.address || "Alamat belum diisi"}</div>
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-gray-900">Rule Komisi Aktif</h2>
          <div className="mt-4 space-y-3">{commissionRules.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs font-bold text-gray-400">Belum ada rule aktif. Backend akan memakai fallback flat.</div> : commissionRules.map((rule) => <div key={rule.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4"><p className="text-sm font-black text-gray-900">{rule.package_name || "Semua Paket"}  {rule.mode}</p><p className="mt-1 text-[11px] font-bold text-gray-400">Berlaku dari {formatDateTime(rule.effective_from)} sampai {formatDateTime(rule.effective_to)}</p>{rule.value ? <p className="mt-2 text-sm font-bold text-gray-600">Nilai: {rule.value}</p> : null}</div>)}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {canManage ? <form onSubmit={handleAssignPic} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-gray-900">Assign PIC</h2><div className="mt-4 space-y-3"><select value={assignUserId} onChange={(event) => setAssignUserId(event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"><option value="">Pilih sales</option>{salesUsers.map((user) => <option key={user.id} value={user.id}>{user.name} ({humanizeRole(user.role)})</option>)}</select><button type="submit" disabled={saving} className="w-full rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-red-300">Simpan PIC</button>{activeAssignment ? <button type="button" onClick={() => void handleReleasePic()} disabled={saving} className="w-full rounded-2xl border border-gray-200 px-5 py-3 text-xs font-black text-gray-600 disabled:cursor-not-allowed disabled:opacity-50">Lepas PIC Aktif</button> : null}</div></form> : null}
        <form onSubmit={handleInteractionSubmit} className={`rounded-3xl border bg-white p-5 shadow-sm ${focusInteraction ? "border-red-200" : "border-gray-200"}`}><h2 className="text-sm font-black text-gray-900">Form Interaksi</h2><div className="mt-4 space-y-3"><select value={interactionType} onChange={(event) => setInteractionType(event.target.value as "CALL" | "CHAT")} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"><option value="CALL">CALL</option><option value="CHAT">CHAT</option></select><input type="datetime-local" value={interactionAt} onChange={(event) => setInteractionAt(event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" /><textarea value={interactionNote} onChange={(event) => setInteractionNote(event.target.value)} rows={4} placeholder="Catatan interaksi dengan mitra" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" /><button type="submit" disabled={!canInteract || saving} className="w-full rounded-2xl bg-gray-950 px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-gray-300">Simpan Interaksi</button></div></form>
        <form onSubmit={handleReferralSubmit} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-gray-900">Form Referral</h2><div className="mt-4 space-y-3"><select value={referralLeadId} onChange={(event) => setReferralLeadId(event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"><option value="">Pilih lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{leadLabel(lead)}</option>)}</select><input type="datetime-local" value={referralDate} onChange={(event) => setReferralDate(event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" /><textarea value={referralNote} onChange={(event) => setReferralNote(event.target.value)} rows={4} placeholder="Catatan referral" className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]" /><button type="submit" disabled={!canInteract || saving} className="w-full rounded-2xl bg-gray-950 px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-gray-300">Simpan Referral</button></div></form>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-gray-900">Riwayat Assignment PIC</h2><div className="mt-4 space-y-3">{assignmentHistory.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs font-bold text-gray-400">Belum ada riwayat assignment.</div> : assignmentHistory.map((item) => <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4"><p className="font-black text-gray-900">{item.user_name || `User #${item.user_id}`}</p><p className="mt-1 text-[11px] font-bold text-gray-400">{humanizeRole(item.user_role)}  assign {formatDateTime(item.assigned_at)}</p><p className="mt-1 text-[11px] font-bold text-gray-400">Release {formatDateTime(item.unassigned_at)}</p></div>)}</div></div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-gray-900">Riwayat Interaksi</h2><div className="mt-4 space-y-3">{interactions.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs font-bold text-gray-400">Belum ada interaksi.</div> : interactions.map((item) => <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4"><p className="font-black text-gray-900">{item.interaction_type}</p><p className="mt-1 text-[11px] font-bold text-gray-400">{formatDateTime(item.interaction_at)}</p><p className="mt-2 text-sm font-bold text-gray-600">{item.note || "Tanpa catatan"}</p></div>)}</div></div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-gray-900">Referral Lead</h2><div className="mt-4 space-y-3">{referrals.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs font-bold text-gray-400">Belum ada referral.</div> : referrals.map((item) => <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4"><p className="font-black text-gray-900">{leadMap.get(item.lead_id) ? leadLabel(leadMap.get(item.lead_id) as BackendLead) : `Lead #${item.lead_id}`}</p><p className="mt-1 text-[11px] font-bold text-gray-400">Referral {formatDateTime(item.referral_date)}</p><p className="mt-2 text-sm font-bold text-gray-600">{item.note || "Tanpa catatan"}</p></div>)}</div></div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-gray-900">Komisi Partner</h2><div className="mt-4 space-y-3">{commissions.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs font-bold text-gray-400">Belum ada komisi partner.</div> : commissions.map((item) => <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-gray-900">{item.code}</p><p className="mt-1 text-[11px] font-bold text-gray-400">Closing {item.closing_code || `#${item.closing_id}`}  {item.status}</p></div><span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-black text-[#C92C1E]">{formatMoney(item.commission_amount, item.currency || "IDR")}</span></div><p className="mt-2 text-xs font-bold text-gray-500">Mode {item.commission_mode}  value {item.commission_value}  base {formatMoney(item.base_amount, item.currency || "IDR")}</p></div>)}</div></div>
      </section>
    </div>
  );
}



