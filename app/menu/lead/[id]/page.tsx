"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getAssignmentHistory,
  getGlobalOutlet,
  getLead,
  getLeadClosings,
  getLeadInteractions,
  getLeadStageHistory,
  getLeadTrainings,
  type AssignmentHistoryItem,
  type BackendLead,
  type ClosingItem,
  type InteractionItem,
  type OutletDetail,
  type StageHistoryItem,
  type TrainingItem,
} from "@/app/lib/api";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRupiah(value?: string | null): string {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) return value || "-";
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatLabel(value?: string | null): string {
  if (!value) return "-";
  return value
    .toString()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStageBadgeClass(stage?: string | null): string {
  switch (String(stage || "").toUpperCase()) {
    case "NEW":
      return "bg-sky-50 text-sky-700 border border-sky-200";
    case "POSSIBLE":
      return "bg-orange-50 text-orange-700 border border-orange-200";
    case "POTENTIAL":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "CLOSING":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "INVALID":
      return "bg-gray-100 text-gray-700 border border-gray-200";
    default:
      return "bg-gray-50 text-gray-600 border border-gray-200";
  }
}

function getStatusBadgeClass(status?: string | null): string {
  switch (String(status || "").toUpperCase()) {
    case "OPEN":
    case "CONFIRMED":
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "PENDING_RECONCILIATION":
    case "SCHEDULED":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "INVALID":
    case "REJECTED":
    case "CANCELED":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    default:
      return "bg-gray-50 text-gray-600 border border-gray-200";
  }
}

function Badge({
  value,
  className,
}: {
  value?: string | number | null;
  className: string;
}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${className}`}>
      {value ?? "-"}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  description,
  primary = false,
}: {
  title: string;
  value: string | number;
  description: string;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <div className="bg-gradient-to-br from-[#C92C1E] to-[#A82216] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden min-h-[144px]">
        <div className="relative z-10">
          <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
          <h2 className="text-3xl font-black">{value}</h2>
          <p className="mt-2 text-[11px] text-red-100/90 max-w-[90%]">{description}</p>
        </div>
        <svg className="absolute -bottom-4 -right-4 w-28 h-28 text-white opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-6 4h10M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm min-h-[144px]">
      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h2 className="text-3xl font-black text-gray-900">{value}</h2>
      <p className="mt-2 text-[11px] text-gray-400">{description}</p>
    </div>
  );
}

function InfoSection({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
        <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
          <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icon}
          </svg>
        </div>
        <div>
          <h4 className="text-base font-black text-gray-900 leading-tight">{title}</h4>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function FieldBox({
  label,
  value,
  span = false,
  children,
}: {
  label: string;
  value?: ReactNode;
  span?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`bg-gray-50 p-3.5 rounded-xl border border-gray-100 ${span ? "sm:col-span-2 xl:col-span-3" : ""}`}>
      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</span>
      <div className="font-bold text-gray-900 text-sm break-words">{children ?? value ?? "-"}</div>
    </div>
  );
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12 px-6">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-gray-50">
        <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h5 className="text-sm font-bold text-gray-900">{title}</h5>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function TimelinePanel({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
        <div className="bg-red-50 p-2.5 rounded-xl border border-red-100">
          <svg className="w-5 h-5 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icon}
          </svg>
        </div>
        <div>
          <h4 className="text-base font-black text-gray-900 leading-tight">{title}</h4>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  usePageTitle("Detail Lead");
  const resolvedParams = use(params);
  const leadId = Number(resolvedParams.id);

  const [lead, setLead] = useState<BackendLead | null>(null);
  const [outlet, setOutlet] = useState<OutletDetail | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistoryItem[]>([]);
  const [interactions, setInteractions] = useState<InteractionItem[]>([]);
  const [stageHistory, setStageHistory] = useState<StageHistoryItem[]>([]);
  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [closings, setClosings] = useState<ClosingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInvalidLeadId = !leadId || Number.isNaN(leadId);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    if (isInvalidLeadId) {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setError("ID lead tidak valid.");
        setIsLoading(false);
      }, 0);

      return () => {
        cancelled = true;
        if (timer !== null) window.clearTimeout(timer);
      };
    }

    timer = window.setTimeout(() => {
      void (async () => {
        try {
          setIsLoading(true);
          setError(null);

          const leadDetail = await getLead(leadId);
          if (cancelled) return;
          setLead(leadDetail);

          const [
            assignmentItems,
            interactionItems,
            stageItems,
            trainingItems,
            closingItems,
            outletDetail,
          ] = await Promise.all([
            getAssignmentHistory(leadId),
            getLeadInteractions(leadId),
            getLeadStageHistory(leadId),
            getLeadTrainings(leadId),
            getLeadClosings(leadId),
            leadDetail.outlet_id ? getGlobalOutlet(leadDetail.outlet_id).catch(() => null) : Promise.resolve(null),
          ]);

          if (cancelled) return;
          setAssignmentHistory(assignmentItems);
          setInteractions(interactionItems);
          setStageHistory(stageItems);
          setTrainings(trainingItems);
          setClosings(closingItems);
          setOutlet(outletDetail);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Gagal memuat detail lead.");
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [isInvalidLeadId, leadId]);

  const latestClosing = closings[0];
  const latestInteraction = interactions[0];
  const totalFollowUps = useMemo(
    () => interactions.filter((item) => item.follow_up_at).length,
    [interactions],
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
            <span>Menu</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/menu/lead" className="hover:text-[#C92C1E] transition-colors">
              Lead
            </Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Detail Data</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isLoading ? "Memuat Data..." : lead ? `Detail Lead: ${lead.outlet?.name || lead.owner?.name || lead.code}` : "Data Tidak Ditemukan"}
          </h1>
          {!isLoading && lead ? (
            <p className="mt-1 text-sm text-gray-500">
              Kode lead <span className="font-bold text-gray-700">{lead.code}</span> • sumber {formatLabel(lead.source_type)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lead?.owner?.id ? (
            <Link
              href={`/menu/owner-outlet/${lead.owner.id}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#C92C1E]"
            >
              Lihat Owner
            </Link>
          ) : null}
          {lead?.outlet_id ? (
            <Link
              href={`/menu/kelolaan-outlet/detail?id=${lead.outlet_id}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#C92C1E]"
            >
              Lihat Outlet
            </Link>
          ) : null}
          <Link
            href="/menu/lead"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#C92C1E] flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Daftar
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20 text-gray-500 gap-3 bg-white rounded-2xl border border-gray-200/60 shadow-sm">
          <svg className="animate-spin h-6 w-6 text-[#C92C1E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-semibold text-sm">Mengambil rincian lead...</span>
        </div>
      ) : error || !lead ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Lead Tidak Ditemukan</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">{error || "Data lead yang Anda cari mungkin telah dihapus atau ID tidak valid."}</p>
          <Link
            href="/menu/lead"
            className="rounded-lg bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 inline-flex items-center gap-2"
          >
            Kembali ke Halaman Lead
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              title="Kode Lead"
              value={lead.code}
              description="Identitas utama lead di CRM untuk tracking aktivitas dan assignment."
              primary
            />
            <SummaryCard
              title="Stage Saat Ini"
              value={formatLabel(lead.stage)}
              description={`Skor saat ini: ${lead.current_score ?? "-"} • status lead ${formatLabel(lead.status)}`}
            />
            <SummaryCard
              title="Aktivitas Tercatat"
              value={interactions.length}
              description={`Follow-up terjadwal ${totalFollowUps} • training ${trainings.length} • closing ${closings.length}`}
            />
          </div>

          <InfoSection
            title="Informasi Lead"
            subtitle="Identitas, sumber, status, dan waktu penting"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 8h10M7 12h10M7 16h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />}
          >
            <FieldBox label="Kode Lead" value={lead.code} />
            <FieldBox label="Sumber Lead" value={formatLabel(lead.source_type)} />
            <FieldBox label="Referensi Sumber" value={lead.source_reference || "-"} />
            <FieldBox label="Stage">
              <Badge value={formatLabel(lead.stage)} className={getStageBadgeClass(lead.stage)} />
            </FieldBox>
            <FieldBox label="Status">
              <Badge value={formatLabel(lead.status)} className={getStatusBadgeClass(lead.status)} />
            </FieldBox>
            <FieldBox label="Skor Saat Ini" value={lead.current_score ?? "-"} />
            <FieldBox label="Last Interaction" value={formatDateTime(lead.last_interaction_at)} />
            <FieldBox label="Next Follow-up" value={formatDateTime(lead.next_follow_up_at)} />
            <FieldBox label="Invalidated At" value={formatDateTime(lead.invalidated_at)} />
            <FieldBox label="Dibuat Pada" value={formatDateTime(lead.created_at)} />
            <FieldBox label="Diperbarui Pada" value={formatDateTime(lead.updated_at)} />
          </InfoSection>

          <InfoSection
            title="Informasi Owner"
            subtitle="Data customer yang menjadi induk lead"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />}
          >
            <FieldBox label="Ketersediaan Data" value={lead.owner?.available === false ? "Owner tidak tersedia" : "Owner tersedia"} />
            <FieldBox label="ID Owner" value={lead.owner?.id ?? "-"} />
            <FieldBox label="Kode Owner" value={lead.owner?.code || "-"} />
            <FieldBox label="Nama Owner" value={lead.owner?.name || "-"} />
            <FieldBox label="Telepon Owner" value={lead.owner?.phone || "-"} />
            <FieldBox label="Brand Laundry" value={lead.owner?.brand_name || "-"} />
            <FieldBox label="Kota" value={lead.owner?.city || "-"} />
            <FieldBox label="Provinsi" value={lead.owner?.province || "-"} />
            <FieldBox label="Catatan Owner" span value={lead.owner?.message || "-"} />
          </InfoSection>

          <InfoSection
            title="Kepemilikan & PIC Lead"
            subtitle="Siapa yang sedang memegang dan mengelola lead ini"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />}
          >
            <FieldBox label="Pemilik Data Saat Ini" value={lead.current_owner?.name || "-"} />
            <FieldBox label="Role Pemilik Saat Ini" value={formatLabel(lead.current_owner_role)} />
            <FieldBox label="Supervisor" value={lead.supervisor?.name || "-"} />
            <FieldBox
              label="PIC Sales Aktif"
              value={
                lead.active_sales?.name ? (
                  <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                    {lead.active_sales.name}
                  </span>
                ) : (
                  "-"
                )
              }
            />
            <FieldBox label="Role Supervisor" value={lead.supervisor?.role || "-"} />
            <FieldBox label="Role Sales" value={lead.active_sales?.role || "-"} />
          </InfoSection>

          <InfoSection
            title="Outlet Terkait"
            subtitle="Outlet yang terhubung dengan lead ini"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />}
          >
            <FieldBox label="Outlet ID" value={lead.outlet_id ?? "-"} />
            <FieldBox label="Kode Outlet" value={lead.outlet?.code || outlet?.code || "-"} />
            <FieldBox label="Nama Outlet" value={lead.outlet?.name || outlet?.name || "-"} />
            <FieldBox label="Telepon Outlet" value={lead.outlet?.phone || outlet?.phone || "-"} />
            <FieldBox label="Status Outlet" value={outlet?.status || "-"} />
            <FieldBox label="Lokasi Outlet" value={outlet ? [outlet.city, outlet.province].filter(Boolean).join(", ") || "-" : "-"} />
            <FieldBox label="Alamat Outlet" span value={outlet?.address || (lead.outlet_id ? "Detail outlet belum tersedia." : "Lead ini belum terhubung ke outlet tertentu.")} />
          </InfoSection>

          <TimelinePanel
            title="Riwayat Assignment Lead"
            subtitle="Tracking perpindahan kepemilikan lead dari admin, supervisor, hingga sales"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2m0-14h6m-6 0v14m6-14h2a2 2 0 012 2v10a2 2 0 01-2 2h-2m-6 0h6" />}
          >
            {assignmentHistory.length === 0 ? (
              <EmptyPanel title="Belum ada riwayat assignment" description="Perpindahan kepemilikan lead akan muncul di bagian ini." />
            ) : (
              <div className="divide-y divide-gray-100">
                {assignmentHistory.map((item) => (
                  <div key={item.id} className="p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge value={formatLabel(item.action)} className="bg-red-50 text-[#C92C1E] border border-red-200" />
                          <Badge value={item.active ? "Active" : "Closed"} className={item.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-50 text-gray-600 border border-gray-200"} />
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {item.from_user?.name || "Tidak ada PIC sebelumnya"} → {item.to_user?.name || "Tanpa PIC"}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                          <FieldBox label="Assigned By" value={item.assigned_by?.name || "-"} />
                          <FieldBox label="Supervisor" value={item.supervisor?.name || "-"} />
                          <FieldBox label="Score Saat Assignment" value={item.score ?? "-"} />
                          <FieldBox label="Started At" value={formatDateTime(item.started_at)} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FieldBox label="Ended At" value={formatDateTime(item.ended_at)} />
                          <FieldBox label="Reason" value={item.reason || "-"} />
                        </div>
                      </div>
                      <p className="text-xs font-bold text-gray-400 whitespace-nowrap">{formatDateTime(item.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TimelinePanel>

          <TimelinePanel
            title="Riwayat Interaksi Customer"
            subtitle="Semua call, chat, follow-up, dan hasil remark"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z" />}
          >
            {interactions.length === 0 ? (
              <EmptyPanel title="Belum ada interaksi" description="Aktivitas call customer dan follow-up akan muncul di bagian ini." />
            ) : (
              <div className="divide-y divide-gray-100">
                {interactions.map((item) => (
                  <div key={item.id} className="p-5 space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge value={formatLabel(item.type)} className="bg-sky-50 text-sky-700 border border-sky-200" />
                          {item.call_status ? (
                            <Badge value={`Call: ${item.call_status}`} className="bg-emerald-50 text-emerald-700 border border-emerald-200" />
                          ) : null}
                          {item.chat_status ? (
                            <Badge value={`Chat: ${item.chat_status}`} className="bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200" />
                          ) : null}
                          {item.remark_label ? (
                            <Badge value={`${item.remark_label}${item.remark_score !== undefined && item.remark_score !== null ? ` (${item.remark_score})` : ""}`} className={getStageBadgeClass(item.remark_code || "")} />
                          ) : null}
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {item.sales?.name || item.created_by?.name || "-"} melakukan interaksi pada {formatDateTime(item.interaction_at)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Contact: {item.contact_name || "-"} • {item.contact_phone || "-"}
                        </p>
                      </div>
                      <p className="text-xs font-bold text-gray-400 whitespace-nowrap">{formatDateTime(item.created_at)}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      <FieldBox label="Status Call" value={item.call_status || "-"} />
                      <FieldBox label="Status Chat" value={item.chat_status || "-"} />
                      <FieldBox label="Remark Code" value={item.remark_code || "-"} />
                      <FieldBox label="Follow-up At" value={formatDateTime(item.follow_up_at)} />
                      <FieldBox label="Sales" value={item.sales?.name || "-"} />
                      <FieldBox label="Created By" value={item.created_by?.name || "-"} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FieldBox label="Customer Response" value={item.note || item.contact_name ? item.customer_response || "-" : item.customer_response || "-"} />
                      <FieldBox label="Catatan Interaksi" value={item.note || "-"} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TimelinePanel>

          <TimelinePanel
            title="Riwayat Perubahan Stage"
            subtitle="Transisi stage dan status lead berdasarkan aktivitas"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />}
          >
            {stageHistory.length === 0 ? (
              <EmptyPanel title="Belum ada stage history" description="Perubahan stage lead akan muncul di bagian ini." />
            ) : (
              <div className="divide-y divide-gray-100">
                {stageHistory.map((item) => (
                  <div key={item.id} className="p-5 space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge value={item.from_stage ? `${formatLabel(item.from_stage)} → ${formatLabel(item.to_stage)}` : formatLabel(item.to_stage)} className="bg-amber-50 text-amber-700 border border-amber-200" />
                          <Badge value={formatLabel(item.source_type)} className="bg-gray-50 text-gray-600 border border-gray-200" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          Status {formatLabel(item.from_status)} → {formatLabel(item.to_status)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Diubah oleh {item.changed_by?.name || "-"} pada {formatDateTime(item.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      <FieldBox label="From Score" value={item.from_score ?? "-"} />
                      <FieldBox label="To Score" value={item.to_score ?? "-"} />
                      <FieldBox label="Source ID" value={item.source_id ?? "-"} />
                      <FieldBox label="Changed By Role" value={item.changed_by?.role || "-"} />
                    </div>
                    <FieldBox label="Reason" value={item.reason || "-"} span />
                  </div>
                ))}
              </div>
            )}
          </TimelinePanel>

          <TimelinePanel
            title="Riwayat Training / Demo"
            subtitle="Jadwal, pelaksanaan, dan hasil training yang terkait"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 20.055 12.083 12.083 0 015.84 10.578L12 14z" />}
          >
            {trainings.length === 0 ? (
              <EmptyPanel title="Belum ada training" description="Jadwal demo atau training lead akan muncul di bagian ini." />
            ) : (
              <div className="divide-y divide-gray-100">
                {trainings.map((item) => (
                  <div key={item.id} className="p-5 space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge value={formatLabel(item.training_type)} className="bg-violet-50 text-violet-700 border border-violet-200" />
                          <Badge value={formatLabel(item.status)} className={getStatusBadgeClass(item.status)} />
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          Dijadwalkan {formatDateTime(item.scheduled_at)}
                        </p>
                      </div>
                      <p className="text-xs font-bold text-gray-400 whitespace-nowrap">{formatDateTime(item.created_at)}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      <FieldBox label="Lokasi" value={item.location || "-"} />
                      <FieldBox label="Meeting URL" value={item.meeting_url || "-"} />
                      <FieldBox label="Completed At" value={formatDateTime(item.completed_at)} />
                      <FieldBox label="Canceled At" value={formatDateTime(item.canceled_at)} />
                      <FieldBox label="Rescheduled At" value={formatDateTime(item.rescheduled_at)} />
                      <FieldBox label="Sales" value={item.sales?.name || "-"} />
                      <FieldBox label="Supervisor" value={item.supervisor?.name || "-"} />
                      <FieldBox label="Updated By" value={item.updated_by?.name || "-"} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FieldBox label="Catatan Training" value={item.note || "-"} />
                      <FieldBox label="Hasil / Result Note" value={item.result_note || "-"} />
                    </div>
                    <FieldBox label="Cancel Reason" value={item.cancel_reason || "-"} span />
                  </div>
                ))}
              </div>
            )}
          </TimelinePanel>

          <TimelinePanel
            title="Riwayat Closing"
            subtitle="Snapshot penawaran, promo, nominal, dan status closing"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
          >
            {closings.length === 0 ? (
              <EmptyPanel title="Belum ada closing" description="Saat lead berhasil closing, histori penjualan akan tampil di bagian ini." />
            ) : (
              <div className="divide-y divide-gray-100">
                {closings.map((item) => (
                  <div key={item.id} className="p-5 space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge value={formatLabel(item.status)} className={getStatusBadgeClass(item.status)} />
                          {item.code ? (
                            <Badge value={item.code} className="bg-gray-50 text-gray-600 border border-gray-200" />
                          ) : null}
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {item.package?.name || item.package_snapshot?.package_name || "-"} • {item.plan?.name || item.plan_snapshot?.plan_name || "-"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Closing pada {formatDateTime(item.closed_at)} oleh {item.sales?.name || "-"}
                        </p>
                      </div>
                      <p className="text-lg font-black text-[#C92C1E]">{formatRupiah(item.final_amount)}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      <FieldBox label="Package" value={item.package?.name || item.package_snapshot?.package_name || "-"} />
                      <FieldBox label="Plan" value={item.plan?.name || item.plan_snapshot?.plan_name || "-"} />
                      <FieldBox label="Tenure (Bulan)" value={item.tenure_months ?? item.plan_snapshot?.tenure_months ?? "-"} />
                      <FieldBox label="Durasi (Hari)" value={item.duration_days ?? item.plan_snapshot?.duration_days ?? "-"} />
                      <FieldBox label="Base Price" value={formatRupiah(item.base_price)} />
                      <FieldBox label="Discount" value={formatRupiah(item.discount_amount)} />
                      <FieldBox label="Additional Charge" value={formatRupiah(item.additional_charge)} />
                      <FieldBox label="Unique Code" value={item.unique_transfer_code ?? "-"} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FieldBox label="Promotion" value={item.promotion_snapshot?.name || item.promotion?.name || "-"} />
                      <FieldBox label="Currency" value={item.currency || "-"} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TimelinePanel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SummaryCard
              title="Closing Terbaru"
              value={latestClosing ? formatRupiah(latestClosing.final_amount) : "-"}
              description={latestClosing ? `${formatLabel(latestClosing.status)} • ${formatDateOnly(latestClosing.closed_at)}` : "Belum ada closing pada lead ini."}
            />
            <SummaryCard
              title="Interaksi Terakhir"
              value={latestInteraction ? formatLabel(latestInteraction.type) : "-"}
              description={latestInteraction ? `${formatDateOnly(latestInteraction.interaction_at)} • ${latestInteraction.sales?.name || latestInteraction.created_by?.name || "-"}` : "Belum ada interaksi yang tercatat."}
            />
          </div>
        </div>
      )}
    </div>
  );
}
