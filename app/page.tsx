"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import {
  fetchClosings,
  fetchCustomerInteractions,
  fetchOwners,
  fetchTrainings,
  getLeadsWithTotal,
  getProfile,
  getRoleLabel,
  type ClosingItem,
  type InteractionItem,
  type TrainingItem,
  type UserResponse,
} from "@/app/lib/api";

type DashboardState = {
  ownerTotal: number;
  leadTotal: number;
  closingTotal: number;
  interactionTotal: number;
  trainingTotal: number;
  closings: ClosingItem[];
  interactions: InteractionItem[];
  trainings: TrainingItem[];
};

const EMPTY_DASHBOARD: DashboardState = {
  ownerTotal: 0,
  leadTotal: 0,
  closingTotal: 0,
  interactionTotal: 0,
  trainingTotal: 0,
  closings: [],
  interactions: [],
  trainings: [],
};

const formatDateTime = (value?: string | null) => {
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
};

const formatCurrency = (value?: string | number | null) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusBadge = (value?: string | null) => {
  const normalized = String(value || "-").toUpperCase();

  if (["CONFIRMED", "COMPLETED", "ACTIVE"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["PENDING", "PROCESSING", "SCHEDULED"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["REJECTED", "FAILED", "CANCELED", "INVALID"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-600";
};

function SummaryCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
        {title}
      </p>
      <p className="mt-3 text-3xl font-black text-gray-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-gray-500">{hint}</p>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-950">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function DashboardOverviewPage() {
  usePageTitle("Dashboard");

  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [dashboard, setDashboard] = useState<DashboardState>(EMPTY_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [
        me,
        ownerResponse,
        leadResponse,
        closingResponse,
        interactionResponse,
        trainingResponse,
      ] = await Promise.all([
        getProfile(),
        fetchOwners({ page: 1, limit: 1 }),
        getLeadsWithTotal({ page: 1, limit: 1 }),
        fetchClosings({ page: 1, limit: 5, sort: "-closed_at" }),
        fetchCustomerInteractions({ page: 1, limit: 5, sort: "-interaction_at" }),
        fetchTrainings({ page: 1, limit: 5, sort: "-scheduled_at" }),
      ]);

      setProfile(me);
      setDashboard({
        ownerTotal: ownerResponse.data.pagination.total,
        leadTotal: leadResponse.total,
        closingTotal: closingResponse.pagination?.total || 0,
        interactionTotal: interactionResponse.pagination?.total || 0,
        trainingTotal: trainingResponse.pagination?.total || 0,
        closings: closingResponse.items || [],
        interactions: interactionResponse.items || [],
        trainings: trainingResponse.items || [],
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Dashboard gagal dimuat dari backend.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const roleLabel = useMemo(
    () => getRoleLabel(profile?.role || ""),
    [profile?.role],
  );

  return (
    <main className="min-h-screen bg-[#F8F8F8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[36px] bg-gradient-to-br from-[#C92C1E] via-[#B2271A] to-[#8F1D13] px-6 py-7 text-white shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-100">
                Dashboard CRM Piposmart
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Halo, {profile?.name || "Tim Piposmart"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium text-red-50/90 sm:text-base">
                Ringkasan ini sekarang membaca data aktif dari backend CRM, jadi
                angka owner, lead, closing, interaksi, dan training lebih sinkron
                dengan modul operasional lainnya.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100">
                  Role Aktif
                </p>
                <p className="mt-2 text-xl font-black">{roleLabel}</p>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100">
                  Status Data
                </p>
                <p className="mt-2 text-xl font-black">
                  {isLoading ? "Memuat..." : "Sinkron"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Owner"
            value={isLoading ? "..." : dashboard.ownerTotal}
            hint="Total owner sesuai scope akses user."
          />
          <SummaryCard
            title="Lead"
            value={isLoading ? "..." : dashboard.leadTotal}
            hint="Lead aktif yang bisa dilihat akun saat ini."
          />
          <SummaryCard
            title="Closing"
            value={isLoading ? "..." : dashboard.closingTotal}
            hint="Jumlah closing yang tercatat di backend."
          />
          <SummaryCard
            title="Interaksi"
            value={isLoading ? "..." : dashboard.interactionTotal}
            hint="Call / chat yang tersimpan di CRM."
          />
          <SummaryCard
            title="Training"
            value={isLoading ? "..." : dashboard.trainingTotal}
            hint="Agenda training yang tersimpan di sistem."
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <SectionCard
            title="Closing Terbaru"
            subtitle="5 data closing terbaru dari backend."
            action={
              <Link
                href="/menu/closing"
                className="inline-flex items-center rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-[#C92C1E] transition hover:bg-red-100"
              >
                Buka Modul Closing
              </Link>
            }
          >
            <div className="space-y-3">
              {dashboard.closings.length === 0 ? (
                <p className="text-sm font-medium text-gray-500">
                  Belum ada data closing yang bisa ditampilkan.
                </p>
              ) : (
                dashboard.closings.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-gray-900">
                          {item.owner?.name || item.lead?.name || `Closing #${item.id}`}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          {item.code || "-"} • {item.plan?.name || item.package?.name || "-"}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {formatDateTime(item.closed_at)}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getStatusBadge(item.status)}`}
                        >
                          {item.status}
                        </span>
                        <p className="mt-2 text-sm font-black text-[#C92C1E]">
                          {formatCurrency(item.final_amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Interaksi Terbaru"
            subtitle="Riwayat interaksi customer yang baru dicatat."
            action={
              <Link
                href="/menu/interact"
                className="inline-flex items-center rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-[#C92C1E] transition hover:bg-red-100"
              >
                Buka Modul Interact
              </Link>
            }
          >
            <div className="space-y-3">
              {dashboard.interactions.length === 0 ? (
                <p className="text-sm font-medium text-gray-500">
                  Belum ada data interaksi terbaru.
                </p>
              ) : (
                dashboard.interactions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-gray-900">
                          {item.created_by?.name || item.sales?.name || "Tim Sales"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          {item.call_status || "-"} / {item.chat_status || "-"}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {formatDateTime(item.interaction_at)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getStatusBadge(item.remark_label || item.type)}`}
                      >
                        {item.remark_label || item.type || "INTERACTION"}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                      {item.note || item.customer_response || "Tidak ada catatan tambahan."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Training Terbaru"
            subtitle="Agenda training paling baru pada sistem."
            action={
              <Link
                href="/menu/training"
                className="inline-flex items-center rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-[#C92C1E] transition hover:bg-red-100"
              >
                Buka Modul Training
              </Link>
            }
          >
            <div className="space-y-3">
              {dashboard.trainings.length === 0 ? (
                <p className="text-sm font-medium text-gray-500">
                  Belum ada jadwal training terbaru.
                </p>
              ) : (
                dashboard.trainings.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-gray-900">
                          {item.owner_name || item.lead_code || `Training #${item.id}`}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          {item.training_type} • {item.sales?.name || item.created_by?.name || "-"}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {formatDateTime(item.scheduled_at)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getStatusBadge(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                      {item.note || item.location || item.meeting_url || "Tidak ada catatan tambahan."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
