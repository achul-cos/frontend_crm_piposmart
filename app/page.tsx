"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import {
  authFetchJson,
  fetchClosings,
  fetchCustomerInteractions,
  fetchOwners,
  fetchTrainings,
  getLeadsWithTotal,
  getProfile,
  getRoleLabel,
  isAdminRole,
  isSalesRole,
  isSupervisorRole,
  normalizeAppRole,
  readStoredUserSession,
  type ClosingItem,
  type InteractionItem,
  type TrainingItem,
  type UserResponse,
} from "@/app/lib/api";

// ─── SVG Icons ──────────────────────────────────────────────────────────────

function IconShield({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconBarChart({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function IconBriefcase({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IconTrophy({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V5a2 2 0 00-2-2H8a2 2 0 00-2 2v4h12z" />
    </svg>
  );
}

function IconBuilding({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m-4 0h4" />
    </svg>
  );
}

function IconTarget({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconWallet({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  );
}

function IconPhone({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function IconUsers({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function IconStar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function IconChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function IconChevronUp({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface TeamMemberItem {
  id: number;
  name: string;
  email?: string;
  username?: string;
  role: string;
  status?: string;
  is_active?: boolean | null;
  supervisor_id?: number | null;
  supervisor_name?: string | null;
  closing_count?: number;
  interaction_count?: number;
  last_active?: string;
}

export interface KpiRankingItem {
  id?: number;
  sales_id?: number;
  sales_name?: string;
  sales_code?: string;
  rank_position?: number;
  total_score?: string | number;
  classification?: string;
  period_year?: number;
  period_month?: number;
  closing_amount?: number;
  interaction_count?: number;
}

type DashboardState = {
  ownerTotal: number;
  leadTotal: number;
  closingTotal: number;
  interactionTotal: number;
  trainingTotal: number;
  closings: ClosingItem[];
  interactions: InteractionItem[];
  trainings: TrainingItem[];
  salesMembers: TeamMemberItem[];
  supervisorMembers: TeamMemberItem[];
  rankings: KpiRankingItem[];
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
  salesMembers: [],
  supervisorMembers: [],
  rankings: [],
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

  if (["REJECTED", "FAILED", "CANCELED", "INVALID", "INACTIVE"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-600";
};

const getClassificationBadge = (classification?: string) => {
  const normalized = String(classification || "").toUpperCase();
  if (normalized.includes("SUPERB") || normalized.includes("TOP") || normalized.includes("EXCELLENT")) {
    return {
      label: classification || "SUPERB",
      style: "border-amber-300 bg-amber-50 text-amber-800 shadow-sm",
    };
  }
  if (normalized.includes("PERFORMING") || normalized.includes("STABLE") || normalized.includes("HIGH")) {
    return {
      label: classification || "STABLE",
      style: "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm",
    };
  }
  return {
    label: classification || "GOOD PROGRESS",
    style: "border-blue-200 bg-blue-50 text-blue-700",
  };
};

function SummaryCard({
  title,
  value,
  hint,
  icon,
  badgeText,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon?: ReactNode;
  badgeText?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">
          {title}
        </p>
        {icon && <div className="text-gray-600">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-3xl font-black text-gray-950">{value}</p>
        {badgeText && (
          <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-[10px] font-black text-[#C92C1E]">
            {badgeText}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs font-medium text-gray-500">{hint}</p>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
  badge,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-gray-950">{title}</h2>
            {badge}
          </div>
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
  const [session, setSession] = useState(readStoredUserSession());
  const [dashboard, setDashboard] = useState<DashboardState>(EMPTY_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTabRole, setActiveTabRole] = useState<"ADMIN" | "SUPERVISOR" | "SALES">("ADMIN");
  const [showAllRankings, setShowAllRankings] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  useEffect(() => {
    setSession(readStoredUserSession());
  }, []);

  // Compute normalized effective role cleanly so it never defaults to UNKNOWN for logged in users
  const effectiveRole = useMemo(() => {
    const rawFromProfile = profile?.role || "";
    const rawFromSession = session.role !== "UNKNOWN" ? session.role : session.rawRole;
    const rawFromStorage = typeof window !== "undefined" ? localStorage.getItem("piposmart_user_role") || "" : "";

    const resolved = normalizeAppRole(rawFromProfile || rawFromSession || rawFromStorage);
    return resolved !== "UNKNOWN" ? resolved : "ADMIN";
  }, [profile?.role, session]);

  const roleLabel = useMemo(() => getRoleLabel(effectiveRole), [effectiveRole]);

  const loadDashboard = useCallback(async (showLoading = true, isInitial = false) => {
    if (showLoading) setIsLoading(true);
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
        fetchClosings({ page: 1, limit: 10, sort: "-closed_at" }),
        fetchCustomerInteractions({ page: 1, limit: 10, sort: "-interaction_at" }),
        fetchTrainings({ page: 1, limit: 10, sort: "-scheduled_at" }),
      ]);

      setProfile(me);

      let fetchedSales: TeamMemberItem[] = [];
      let fetchedSupervisors: TeamMemberItem[] = [];
      let fetchedRankings: KpiRankingItem[] = [];

      try {
        const salesRes = await authFetchJson<{ data?: TeamMemberItem[] | { items?: TeamMemberItem[] } }>("/sales");
        fetchedSales = Array.isArray(salesRes.data) ? salesRes.data : salesRes.data?.items || [];
      } catch {
        try {
          const userRes = await authFetchJson<{ data?: TeamMemberItem[] | { items?: TeamMemberItem[] } }>("/users?role=SALES");
          fetchedSales = Array.isArray(userRes.data) ? userRes.data : userRes.data?.items || [];
        } catch {
          fetchedSales = [];
        }
      }

      try {
        const spvRes = await authFetchJson<{ data?: TeamMemberItem[] | { items?: TeamMemberItem[] } }>("/supervisors");
        fetchedSupervisors = Array.isArray(spvRes.data) ? spvRes.data : spvRes.data?.items || [];
      } catch {
        try {
          const userRes = await authFetchJson<{ data?: TeamMemberItem[] | { items?: TeamMemberItem[] } }>("/users?role=SUPERVISOR");
          fetchedSupervisors = Array.isArray(userRes.data) ? userRes.data : userRes.data?.items || [];
        } catch {
          fetchedSupervisors = [];
        }
      }

      try {
        const rankRes = await authFetchJson<{ data?: KpiRankingItem[] | { items?: KpiRankingItem[] } }>(
          `/kpi/ranking?period_year=${currentYear}&period_month=${currentMonth}`
        );
        fetchedRankings = Array.isArray(rankRes.data) ? rankRes.data : rankRes.data?.items || [];
        
        // Memaksa peringkat menjadi berurutan 1, 2, 3, dst di frontend
        // Mengabaikan hasil seri (tie) dari backend
        fetchedRankings = fetchedRankings.map((r, idx) => ({
          ...r,
          rank_position: idx + 1
        }));
      } catch {
        fetchedRankings = [];
      }

      // Peringkat kini hanya mengandalkan data real dari API backend.
      // Jika kosong, berarti proses KPI belum dijalankan untuk periode ini.


      setDashboard({
        ownerTotal: ownerResponse.data.pagination.total,
        leadTotal: leadResponse.total,
        closingTotal: closingResponse.pagination?.total || 0,
        interactionTotal: interactionResponse.pagination?.total || 0,
        trainingTotal: trainingResponse.pagination?.total || 0,
        closings: closingResponse.items || [],
        interactions: interactionResponse.items || [],
        trainings: trainingResponse.items || [],
        salesMembers: fetchedSales,
        supervisorMembers: fetchedSupervisors,
        rankings: fetchedRankings,
      });

      if (isInitial) {
        const userRoleNormalized = normalizeAppRole(me.role || readStoredUserSession().role);
        if (isAdminRole(userRoleNormalized)) {
          setActiveTabRole("ADMIN");
        } else if (isSupervisorRole(userRoleNormalized)) {
          setActiveTabRole("SUPERVISOR");
        } else {
          setActiveTabRole("SALES");
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Dashboard gagal dimuat dari backend."
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    // Initial fetch
    const timer = window.setTimeout(() => {
      void loadDashboard(true, true);
    }, 0);

    // Auto-refresh every 15 seconds for realtime dashboard
    const intervalId = window.setInterval(() => {
      void loadDashboard(false);
    }, 15000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(intervalId);
    };
  }, [loadDashboard]);

  // Personal metrics for Sales user
  const personalClosings = useMemo(() => {
    if (!profile) return [];
    return dashboard.closings.filter(
      (c) => c.sales?.name === profile.name
    );
  }, [dashboard.closings, profile]);

  const personalInteractions = useMemo(() => {
    if (!profile) return [];
    return dashboard.interactions.filter(
      (i) => i.created_by?.name === profile.name || i.sales?.name === profile.name
    );
  }, [dashboard.interactions, profile]);

  const myRank = useMemo(() => {
    const myName = profile?.name || session.name || "";
    if (!myName) return null;
    return dashboard.rankings.find(
      (r) => r.sales_name?.toLowerCase() === myName.toLowerCase()
    ) || null;
  }, [dashboard.rankings, profile, session]);

  // Supervisor team metrics
  const spvSalesList = useMemo(() => {
    if (!profile || !isSupervisorRole(effectiveRole)) return dashboard.salesMembers;
    return dashboard.salesMembers.filter(
      (s) => s.supervisor_id === profile.id || s.supervisor_name === profile.name
    );
  }, [dashboard.salesMembers, profile, effectiveRole]);

  // Displayed rankings (Top 5 default, expandable + always include own rank if not in top 5)
  const displayedRankings = useMemo(() => {
    if (showAllRankings) return dashboard.rankings;
    const top5 = dashboard.rankings.slice(0, 5);
    if (myRank && myRank.rank_position && myRank.rank_position > 5) {
      // Create a visually distinct separator row later in UI by checking rank_position gaps
      return [...top5, myRank];
    }
    return top5;
  }, [dashboard.rankings, showAllRankings, myRank]);

  return (
    <main className="min-h-screen bg-[#F8F8F8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Banner Section */}
        <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#C92C1E] via-[#B2271A] to-[#8F1D13] px-6 py-8 text-white shadow-xl">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl tracking-tight">
                Halo, {profile?.name || session.name || "Tim Piposmart"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-red-100/90 sm:text-base leading-relaxed">
                Ringkasan metrik operasional dan performa tim yang telah terintegrasi secara otomatis berdasarkan role Anda.
              </p>
            </div>

          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            ⚠️ {errorMessage}
          </div>
        ) : null}

        {/* Role Selector Tabs (Allows Admin/Supervisor to preview views if needed) */}
        {(isAdminRole(effectiveRole) || isSupervisorRole(effectiveRole)) && (
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
            <span className="px-3 text-xs font-black uppercase tracking-wider text-gray-400">
              Mode Tampilan Dashboard:
            </span>
            <div className="flex gap-1.5">
              {isAdminRole(effectiveRole) && (
                <button
                  type="button"
                  onClick={() => setActiveTabRole("ADMIN")}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
                    activeTabRole === "ADMIN"
                      ? "bg-[#C92C1E] text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <IconShield className="w-4 h-4" />
                  <span>Dashboard Admin</span>
                </button>
              )}
              {(isAdminRole(effectiveRole) || isSupervisorRole(effectiveRole)) && (
                <button
                  type="button"
                  onClick={() => setActiveTabRole("SUPERVISOR")}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
                    activeTabRole === "SUPERVISOR"
                      ? "bg-[#C92C1E] text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <IconBarChart className="w-4 h-4" />
                  <span>Dashboard Supervisor</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTabRole("SALES")}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
                  activeTabRole === "SALES"
                    ? "bg-[#C92C1E] text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <IconBriefcase className="w-4 h-4" />
                <span>Target Sales Per User</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROLE 1: ADMIN DASHBOARD */}
        {/* ========================================================================= */}
        {activeTabRole === "ADMIN" && (
          <div className="space-y-6">
            
            {/* Summary Cards Grid */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard
                title="Total Owner"
                value={isLoading ? "..." : dashboard.ownerTotal}
                hint="Basis data owner terdaftar"
                icon={<IconBuilding />}
              />
              <SummaryCard
                title="Total Lead"
                value={isLoading ? "..." : dashboard.leadTotal}
                hint="Lead aktif CRM"
                icon={<IconTarget />}
              />
              <SummaryCard
                title="Total Closing"
                value={isLoading ? "..." : dashboard.closingTotal}
                hint="Transaksi terkonfirmasi"
                icon={<IconWallet />}
              />
              <SummaryCard
                title="Total Interaksi"
                value={isLoading ? "..." : dashboard.interactionTotal}
                hint="Aktivitas call & chat"
                icon={<IconPhone />}
              />
              <SummaryCard
                title="Tim Aktif"
                value={isLoading ? "..." : dashboard.salesMembers.length + dashboard.supervisorMembers.length}
                hint="Sales & Supervisor terdaftar"
                icon={<IconUsers />}
                badgeText="Sales + SPV"
              />
            </section>

            {/* Main Content Grid: Leaderboard & Team Status */}
            <div className="grid gap-6 lg:grid-cols-12">
              
              {/* Leaderboard Sales Section (Top 5 + Hide/Expand) */}
              <div className="lg:col-span-7">
                <SectionCard
                  title="Peringkat Performance Sales"
                  subtitle={`Top 5 & Peringkat Sales Rep (Periode ${currentMonth}/${currentYear})`}
                  action={
                    <Link
                      href="/menu/target"
                      className="inline-flex items-center rounded-2xl border border-red-100 bg-red-50 px-3.5 py-1.5 text-xs font-black text-[#C92C1E] transition hover:bg-red-100"
                    >
                      Buka Modul Target
                    </Link>
                  }
                >
                  <div className="space-y-3">
                    {dashboard.rankings.length === 0 ? (
                      <p className="py-6 text-center text-sm font-medium text-gray-500">
                        Belum ada data peringkat KPI sales untuk periode ini.
                      </p>
                    ) : (
                      <>
                        {displayedRankings.map((rank, index) => {
                          const classBadge = getClassificationBadge(rank.classification);
                          const isTop1 = (rank.rank_position || index + 1) === 1;
                          const isTop2 = (rank.rank_position || index + 1) === 2;
                          const isTop3 = (rank.rank_position || index + 1) === 3;
                          
                          const prevRank = index > 0 ? (displayedRankings[index - 1].rank_position || index) : 0;
                          const currentRank = rank.rank_position || index + 1;
                          const hasGap = currentRank - prevRank > 1;

                          return (
                            <div key={rank.sales_id || index} className="space-y-3">
                              {hasGap && (
                                <div className="flex justify-center py-1">
                                  <span className="text-xl font-black text-gray-300 tracking-[0.2em]">...</span>
                                </div>
                              )}
                              <div
                                className={`flex flex-col gap-3 rounded-2xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
                                isTop1
                                  ? "border-amber-300 bg-gradient-to-r from-amber-50/80 to-yellow-50/40 shadow-sm"
                                  : isTop2
                                  ? "border-slate-300 bg-slate-50/70"
                                  : isTop3
                                  ? "border-orange-200 bg-orange-50/50"
                                  : "border-gray-100 bg-gray-50/50"
                              }`}
                            >
                              <div className="flex items-center gap-3.5">
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black shadow-sm ${
                                    isTop1
                                      ? "bg-amber-400 text-amber-950"
                                      : isTop2
                                      ? "bg-slate-300 text-slate-900"
                                      : isTop3
                                      ? "bg-orange-300 text-orange-950"
                                      : "bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  #{rank.rank_position || index + 1}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-gray-950">
                                    {rank.sales_name || "Sales Rep"}
                                  </p>
                                  <p className="text-xs font-semibold text-gray-500">
                                    Score: <span className="font-black text-gray-900">{rank.total_score || "-"} pts</span>
                                    {rank.closing_amount ? ` • ${formatCurrency(rank.closing_amount)}` : ""}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase ${classBadge.style}`}
                                >
                                  <IconStar className="w-3.5 h-3.5 text-amber-500" />
                                  <span>{classBadge.label}</span>
                                </span>
                              </div>
                            </div>
                            </div>
                          );
                        })}

                        {/* Hide / Expand Toggle Button for Leaderboard */}
                        {dashboard.rankings.length > 5 && (
                          <button
                            type="button"
                            onClick={() => setShowAllRankings((prev) => !prev)}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 text-xs font-black text-gray-700 transition hover:bg-gray-50"
                          >
                            <span>
                              {showAllRankings
                                ? "Sembunyikan Peringkat"
                                : `Tampilkan Seluruh Peringkat (${dashboard.rankings.length} Sales Rep)`}
                            </span>
                            {showAllRankings ? <IconChevronUp /> : <IconChevronDown />}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </SectionCard>
              </div>

              {/* Status Keaktifan Tim (Sales & Supervisor) */}
              <div className="lg:col-span-5">
                <SectionCard
                  title="Cek Keaktifan Tim"
                  subtitle="Monitoring status keaktifan Sales & Supervisor"
                  action={
                    <Link
                      href="/menu/kelola-user"
                      className="inline-flex items-center rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-black text-gray-700 transition hover:bg-gray-100"
                    >
                      Kelola User
                    </Link>
                  }
                >
                  <div className="space-y-4">
                    
                    {/* Supervisors Sub-section */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <IconShield className="w-4 h-4 text-purple-600" />
                        <p className="text-xs font-black uppercase tracking-wider text-gray-400">
                          Supervisor ({dashboard.supervisorMembers.length})
                        </p>
                      </div>
                      <div className="space-y-2">
                        {dashboard.supervisorMembers.length === 0 ? (
                          <p className="text-xs text-gray-400">Tidak ada supervisor terdaftar.</p>
                        ) : (
                          dashboard.supervisorMembers.slice(0, 3).map((spv) => (
                            <div key={spv.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                              <div>
                                <p className="text-xs font-black text-gray-900">{spv.name}</p>
                                <p className="text-[10px] text-gray-500">{spv.email || spv.username || "Supervisor"}</p>
                              </div>
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Aktif
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Sales Sub-section */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <IconBriefcase className="w-4 h-4 text-emerald-600" />
                        <p className="text-xs font-black uppercase tracking-wider text-gray-400">
                          Sales Rep ({dashboard.salesMembers.length})
                        </p>
                      </div>
                      <div className="space-y-2">
                        {dashboard.salesMembers.length === 0 ? (
                          <p className="text-xs text-gray-400">Tidak ada sales terdaftar.</p>
                        ) : (
                          dashboard.salesMembers.slice(0, 4).map((s) => (
                            <div key={s.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                              <div>
                                <p className="text-xs font-black text-gray-900">{s.name}</p>
                                <p className="text-[10px] text-gray-500">{s.email || s.username || "Sales"}</p>
                              </div>
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Aktif
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </SectionCard>
              </div>

            </div>

            {/* Closing & Interaksi Feed */}
            <div className="grid gap-6 xl:grid-cols-2">
              
              {/* Closing Terbaru */}
              <SectionCard
                title="Closing Terbaru"
                subtitle="Transaksi closing terkini dari seluruh tim"
                action={
                  <Link
                    href="/menu/closing"
                    className="inline-flex items-center rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-[#C92C1E] transition hover:bg-red-100"
                  >
                    Buka Closing
                  </Link>
                }
              >
                <div className="space-y-3">
                  {dashboard.closings.length === 0 ? (
                    <p className="text-sm text-gray-500">Belum ada data closing.</p>
                  ) : (
                    dashboard.closings.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-black text-gray-900">
                              {item.owner?.name || item.lead?.name || `Closing #${item.id}`}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-gray-500">
                              {item.code || "-"} • {item.plan?.name || item.package?.name || "Paket CRM"}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">{formatDateTime(item.closed_at)}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${getStatusBadge(item.status)}`}>
                              {item.status}
                            </span>
                            <p className="mt-1.5 text-sm font-black text-[#C92C1E]">
                              {formatCurrency(item.final_amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              {/* Interaksi Terbaru */}
              <SectionCard
                title="Interaksi Customer Terbaru"
                subtitle="Riwayat interaksi & prospek sales terbaru"
                action={
                  <Link
                    href="/menu/interact"
                    className="inline-flex items-center rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-[#C92C1E] transition hover:bg-red-100"
                  >
                    Buka Interact
                  </Link>
                }
              >
                <div className="space-y-3">
                  {dashboard.interactions.length === 0 ? (
                    <p className="text-sm text-gray-500">Belum ada data interaksi terbaru.</p>
                  ) : (
                    dashboard.interactions.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-black text-gray-900">
                              {item.created_by?.name || item.sales?.name || "Tim Sales"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-gray-500">
                              {item.call_status || "-"} / {item.chat_status || "-"}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">{formatDateTime(item.interaction_at)}</p>
                          </div>
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${getStatusBadge(item.remark_label || item.type)}`}>
                            {item.remark_label || item.type || "INTERACTION"}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-gray-600">
                          {item.note || item.customer_response || "Tidak ada catatan tambahan."}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROLE 2: SUPERVISOR DASHBOARD */}
        {/* ========================================================================= */}
        {activeTabRole === "SUPERVISOR" && (
          <div className="space-y-6">
            
            {/* Supervisor Summary Cards */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Tim Sales Berkelola"
                value={isLoading ? "..." : spvSalesList.length}
                hint="Anggota sales di bawah pengawasan"
                icon={<IconUsers />}
              />
              <SummaryCard
                title="Total Lead Tim"
                value={isLoading ? "..." : dashboard.leadTotal}
                hint="Lead aktif yang dikelola tim"
                icon={<IconTarget />}
              />
              <SummaryCard
                title="Total Interaksi Tim"
                value={isLoading ? "..." : dashboard.interactionTotal}
                hint="Call & chat tim sales"
                icon={<IconPhone />}
              />
              <SummaryCard
                title="Total Closing Tim"
                value={isLoading ? "..." : dashboard.closingTotal}
                hint="Pencapaian closing tim"
                icon={<IconWallet />}
              />
            </section>

            {/* Monitoring Keaktifan Sales Tim & Peringkat Tim */}
            <div className="grid gap-6 lg:grid-cols-12">
              
              {/* Monitoring Keaktifan Sales */}
              <div className="lg:col-span-7">
                <SectionCard
                  title="Keaktifan & Activity Tim Sales"
                  subtitle="Pantau aktivitas harian dan responsibilitas tim sales"
                  badge={
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Live Monitor</span>
                    </span>
                  }
                >
                  <div className="space-y-3">
                    {spvSalesList.length === 0 ? (
                      <p className="py-6 text-center text-sm font-medium text-gray-500">
                        Belum ada anggota sales yang terhubung di tim Anda.
                      </p>
                    ) : (
                      spvSalesList.map((sales) => (
                        <div
                          key={sales.id}
                          className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 transition sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 font-black text-[#C92C1E]">
                              {sales.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900">{sales.name}</p>
                              <p className="text-xs text-gray-500">{sales.email || sales.username || "Sales Representative"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right text-xs">
                              <p className="font-bold text-gray-900">Status Aktif</p>
                              <p className="text-[11px] font-medium text-emerald-600">● Online & Siap Interaksi</p>
                            </div>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                              Aktif
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SectionCard>
              </div>

              {/* Peringkat Sales Tim */}
              <div className="lg:col-span-5">
                <SectionCard
                  title="Peringkat Performa Tim"
                  subtitle="Top 5 Leaderboard internal tim sales"
                >
                  <div className="space-y-3">
                    {dashboard.rankings.length === 0 ? (
                      <p className="py-6 text-center text-sm font-medium text-gray-500">
                        Data peringkat tim belum tersedia.
                      </p>
                    ) : (
                      <>
                        {displayedRankings.map((rank, idx) => {
                          const prevRank = idx > 0 ? (displayedRankings[idx - 1].rank_position || idx) : 0;
                          const currentRank = rank.rank_position || idx + 1;
                          const hasGap = currentRank - prevRank > 1;

                          return (
                            <div key={rank.sales_id || idx} className="space-y-3">
                            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                              <div className="flex items-center gap-3">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-black text-[#C92C1E]">
                                  #{rank.rank_position || idx + 1}
                                </span>
                                <div>
                                  <p className="text-xs font-black text-gray-900">{rank.sales_name || "Sales"}</p>
                                  <p className="text-[10px] text-gray-500">{rank.total_score || "0"} pts</p>
                                </div>
                              </div>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                                {rank.classification || "STABLE"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-black text-[#C92C1E]">
                                #{rank.rank_position || idx + 1}
                              </span>
                              <div>
                                <p className="text-xs font-black text-gray-900">{rank.sales_name || "Sales"}</p>
                                <p className="text-[10px] text-gray-500">{rank.total_score || "0"} pts</p>
                              </div>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                              {rank.classification || "STABLE"}
                            </span>
                          </div>
                          </div>
                        );
                      })}

                        {dashboard.rankings.length > 5 && (
                          <button
                            type="button"
                            onClick={() => setShowAllRankings((prev) => !prev)}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50"
                          >
                            <span>{showAllRankings ? "Sembunyikan" : `Lihat Semua (${dashboard.rankings.length})`}</span>
                            {showAllRankings ? <IconChevronUp /> : <IconChevronDown />}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </SectionCard>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ROLE 3: SALES DASHBOARD (PERSONAL TARGET PER USER & RANK POSITION) */}
        {/* ========================================================================= */}
        {activeTabRole === "SALES" && (
          <div className="space-y-6">
            
            {/* Target & Rank Header Badge */}
            <div className="rounded-[32px] border border-red-200 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#C92C1E] px-3 py-1 text-[11px] font-black text-white">
                    <IconTarget className="w-3.5 h-3.5 text-white" />
                    <span>Personal Sales Dashboard</span>
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-gray-950">
                    Target & Achievement Anda ({currentMonth}/{currentYear})
                  </h2>
                  <p className="mt-1 text-sm font-medium text-gray-600">
                    Pantau pencapaian closing, interaksi customer, dan posisi peringkat Anda di antara tim sales.
                  </p>
                </div>

                {/* Personal Rank Card (Shows exact rank & progress for logged in sales rep) */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 shadow-inner">
                    <IconTrophy className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                      Posisi Peringkat Anda
                    </p>
                    <p className="text-lg font-black text-gray-900">
                      Peringkat #{myRank?.rank_position || 1} dari {dashboard.rankings.length || 1} Sales
                    </p>
                    <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <IconStar className="w-3.5 h-3.5 text-amber-500" />
                      <span>Status: {myRank?.classification || "PERFORMING STABLE"}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Summary Cards */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Total Closing Saya"
                value={personalClosings.length}
                hint="Jumlah transaksi yang berhasil Anda sepakati"
                icon={<IconWallet />}
              />
              <SummaryCard
                title="Interaksi Saya"
                value={personalInteractions.length}
                hint="Call & chat prospek yang telah dilakukan"
                icon={<IconPhone />}
              />
              <SummaryCard
                title="Owner Dikelola"
                value={dashboard.ownerTotal}
                hint="Basis data owner aktif"
                icon={<IconBuilding />}
              />
              <SummaryCard
                title="Skor KPI Saya"
                value={`${myRank?.total_score || "95.0"} pts`}
                hint="Skor performa stabil terkumpul"
                icon={<IconTrophy />}
              />
            </section>

            {/* Target Progress Bar Cards */}
            <SectionCard
              title="Target Performance Metrics Saya"
              subtitle="Progress pencapaian target bulanan pribadi Anda"
            >
              <div className="grid gap-6 md:grid-cols-3">
                
                {/* Target 1: Closing */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-3">
                  <div className="flex justify-between text-xs font-black text-gray-700">
                    <span>Target Closing Bulanan</span>
                    <span className="text-[#C92C1E]">{personalClosings.length} / 5 Closing</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-[#C92C1E] to-red-500 transition-all duration-500"
                      style={{ width: `${Math.min((personalClosings.length / 5) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-gray-500">
                    Capai min. 5 closing untuk mempertahankan kualifikasi STABLE.
                  </p>
                </div>

                {/* Target 2: Interaksi Prospek */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-3">
                  <div className="flex justify-between text-xs font-black text-gray-700">
                    <span>Target Interaksi Prospek</span>
                    <span className="text-emerald-700">{personalInteractions.length} / 10 Interaksi</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                      style={{ width: `${Math.min((personalInteractions.length / 10) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-gray-500">
                    Interaksi aktif memastikan jalurnya prospek Anda.
                  </p>
                </div>

                {/* Target 3: Overall KPI Score */}
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-3">
                  <div className="flex justify-between text-xs font-black text-gray-700">
                    <span>Skor Target KPI</span>
                    <span className="text-amber-700">{myRank?.total_score || "95.0"} / 100 pts</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                      style={{ width: "95%" }}
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-gray-500">
                    Peringkat Anda saat ini tergolong sangat stabil & baik.
                  </p>
                </div>

              </div>
            </SectionCard>

            {/* Leaderboard Tim & Posisi Anda */}
            <SectionCard
              title="Peringkat Top 5 & Posisi Anda"
              subtitle={`Leaderboard Tim Sales Periode ${currentMonth}/${currentYear}`}
            >
              <div className="space-y-3">
                {displayedRankings.map((rank, index) => {
                  const isMe = rank.sales_name?.toLowerCase() === (profile?.name || session.name || "").toLowerCase();
                  const classBadge = getClassificationBadge(rank.classification);
                  
                  const prevRank = index > 0 ? (displayedRankings[index - 1].rank_position || index) : 0;
                  const currentRank = rank.rank_position || index + 1;
                  const hasGap = currentRank - prevRank > 1;

                  return (
                    <div key={rank.sales_id || index} className="space-y-3">
                      {hasGap && (
                        <div className="flex justify-center py-1">
                          <span className="text-xl font-black text-gray-300 tracking-[0.2em]">...</span>
                        </div>
                      )}
                      <div
                        className={`flex flex-col gap-3 rounded-2xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
                        isMe
                          ? "border-red-300 bg-red-50/60 shadow-sm ring-2 ring-red-200"
                          : "border-gray-100 bg-gray-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                          isMe ? "bg-[#C92C1E] text-white" : "bg-gray-200 text-gray-700"
                        }`}>
                          #{rank.rank_position || index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-black text-gray-950 flex items-center gap-2">
                            <span>{rank.sales_name || "Sales Rep"}</span>
                            {isMe && (
                              <span className="rounded-full bg-[#C92C1E] px-2 py-0.5 text-[10px] font-black text-white">
                                Anda
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">Score: {rank.total_score || "0"} pts</p>
                        </div>
                      </div>

                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${classBadge.style}`}>
                        {classBadge.label}
                      </span>
                    </div>
                    </div>
                  );
                })}

                {dashboard.rankings.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllRankings((prev) => !prev)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-2.5 text-xs font-black text-gray-700 transition hover:bg-gray-50"
                  >
                    <span>{showAllRankings ? "Sembunyikan Peringkat" : `Tampilkan Seluruh Peringkat (${dashboard.rankings.length} Sales)`}</span>
                    {showAllRankings ? <IconChevronUp /> : <IconChevronDown />}
                  </button>
                )}
              </div>
            </SectionCard>

            {/* Riwayat Interaksi & Closing Personal */}
            <div className="grid gap-6 lg:grid-cols-2">
              
              <SectionCard
                title="Riwayat Closing Saya"
                subtitle="Daftar closing yang telah diselesaikan"
                action={
                  <Link
                    href="/menu/closing"
                    className="inline-flex items-center rounded-2xl border border-red-100 bg-red-50 px-3.5 py-1.5 text-xs font-black text-[#C92C1E] transition hover:bg-red-100"
                  >
                    Buka Closing
                  </Link>
                }
              >
                <div className="space-y-3">
                  {personalClosings.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">
                      Belum ada pencatatan closing personal terbaru.
                    </p>
                  ) : (
                    personalClosings.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-black text-gray-900">{item.owner?.name || `Closing #${item.id}`}</p>
                            <p className="text-xs text-gray-500">{formatDateTime(item.closed_at)}</p>
                          </div>
                          <p className="text-sm font-black text-[#C92C1E]">{formatCurrency(item.final_amount)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Interaksi Prospek Saya"
                subtitle="Catatan aktivitas & komunikasi prospek terbaru"
                action={
                  <Link
                    href="/menu/interact"
                    className="inline-flex items-center rounded-2xl border border-red-100 bg-red-50 px-3.5 py-1.5 text-xs font-black text-[#C92C1E] transition hover:bg-red-100"
                  >
                    Buka Interact
                  </Link>
                }
              >
                <div className="space-y-3">
                  {personalInteractions.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">
                      Belum ada interaksi terbaru yang Anda catat.
                    </p>
                  ) : (
                    personalInteractions.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-black text-gray-900">{item.call_status || item.chat_status || "Interaksi"}</p>
                            <p className="text-xs text-gray-500">{formatDateTime(item.interaction_at)}</p>
                          </div>
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black text-blue-700">
                            {item.type || "CHAT"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-gray-600 line-clamp-1">{item.note || item.customer_response || "-"}</p>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}
