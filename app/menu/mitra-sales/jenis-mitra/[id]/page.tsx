"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import {
  getCatalogPackages,
  getCatalogPlans,
  getPartnerType,
  getPartnerTypeCommissionRule,
  listPartnerTypeCommissionRules,
  type CatalogPackage,
  type CatalogPlan,
  type PartnerCommissionRuleItem,
  type PartnerTypeItem,
} from "@/app/lib/api";

function formatDateTime(value?: string | null): string {
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

function formatDateOnly(value?: string | null): string {
  if (!value) return "Tanpa batas";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatRupiah(value?: string | number | null): string {
  const amount = Number(value || 0);

  if (Number.isNaN(amount)) return String(value || "-");

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCommission(mode?: string | null, value?: string | number | null) {
  if (!mode) return "-";
  if (mode === "PERCENTAGE") return `${Number(value || 0)}%`;
  if (mode === "FIXED") return formatRupiah(value);
  return "Bertingkat";
}

function FieldBox({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-gray-900">
        {value || "-"}
      </p>
    </div>
  );
}

export default function MitraSalesJenisMitraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  usePageTitle("Detail Jenis Mitra Sales");

  const resolvedParams = use(params);
  const partnerTypeId = Number(resolvedParams.id);

  const [partnerType, setPartnerType] = useState<PartnerTypeItem | null>(null);
  const [rules, setRules] = useState<PartnerCommissionRuleItem[]>([]);
  const [packages, setPackages] = useState<CatalogPackage[]>([]);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    if (!partnerTypeId || Number.isNaN(partnerTypeId)) {
      setPageError("ID jenis mitra tidak valid.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setPageError("");

      try {
        const [detail, ruleList, packageList, planList] = await Promise.all([
          getPartnerType(partnerTypeId),
          listPartnerTypeCommissionRules(partnerTypeId),
          getCatalogPackages().catch(() => []),
          getCatalogPlans().catch(() => []),
        ]);

        const detailedRules = await Promise.all(
          (ruleList.items || []).map(async (rule) => {
            try {
              return await getPartnerTypeCommissionRule(
                partnerTypeId,
                rule.id,
              );
            } catch {
              return rule;
            }
          }),
        );

        if (cancelled) return;

        setPartnerType(detail);
        setRules(detailedRules);
        setPackages(packageList);
        setPlans(planList);
      } catch (error) {
        if (!cancelled) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Gagal memuat detail jenis mitra.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [partnerTypeId]);

  const activeRules = useMemo(() => {
    return rules.filter((rule) => rule.active);
  }, [rules]);

  const tierRules = useMemo(() => {
    return rules.filter((rule) => rule.mode === "TIER");
  }, [rules]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <Link
                href="/menu/mitra-sales/jenis-mitra"
                className="transition hover:text-[#C92C1E]"
              >
                Jenis Mitra
              </Link>
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-[#C92C1E]">Detail</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              {loading
                ? "Memuat Data..."
                : partnerType
                  ? `Detail Jenis Mitra: ${partnerType.name}`
                  : "Data Tidak Ditemukan"}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Detail jenis mitra, komisi dasar, dan rule komisi sebagai referensi
              Sales.
            </p>
          </div>

          <Link
            href="/menu/mitra-sales/jenis-mitra"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-center text-sm font-bold text-gray-600 transition hover:bg-gray-50 hover:text-[#C92C1E]"
          >
            Kembali
          </Link>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {pageError}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm font-bold text-gray-500">
          Memuat detail jenis mitra...
        </div>
      ) : !partnerType ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm font-bold text-gray-500">
          Jenis mitra tidak ditemukan.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">
                Kode Jenis
              </p>
              <h2 className="text-3xl font-black">{partnerType.code}</h2>
            </div>

            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                Rule Komisi
              </p>
              <h2 className="text-3xl font-black text-gray-900">
                {rules.length}
              </h2>
              <p className="mt-1 text-xs font-bold text-gray-400">
                {activeRules.length} aktif • {tierRules.length} tier
              </p>
            </div>

            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                Paket / Plan
              </p>
              <h2 className="text-3xl font-black text-gray-900">
                {packages.length}
              </h2>
              <p className="mt-1 text-xs font-bold text-gray-400">
                {plans.length} plan tersedia
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-gray-900">
              Informasi Jenis Mitra
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FieldBox label="ID" value={partnerType.id} />
              <FieldBox label="Code" value={partnerType.code} />
              <FieldBox label="Nama" value={partnerType.name} />
              <FieldBox label="Mode Dasar" value={partnerType.commission_mode} />
              <FieldBox
                label="Komisi Dasar"
                value={formatCommission(
                  partnerType.commission_mode,
                  partnerType.commission_value,
                )}
              />
              <FieldBox label="Rule Aktif" value={activeRules.length} />
              <FieldBox label="Dibuat" value={formatDateTime(partnerType.created_at)} />
              <FieldBox label="Update" value={formatDateTime(partnerType.updated_at)} />
            </div>

            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                Deskripsi
              </p>
              <p className="mt-1 text-sm font-bold text-gray-700">
                {partnerType.description || "Belum ada deskripsi."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/60 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50/50 p-4">
              <h2 className="text-sm font-black text-gray-900">
                Rule Komisi
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-400">
                Rule komisi hanya sebagai referensi untuk Sales.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4">
              {rules.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
                  Belum ada rule komisi.
                </div>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-black text-gray-900">
                          {rule.plan_name || "Semua Plan"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-gray-400">
                          Rule #{rule.id}
                        </p>
                      </div>

                      <span
                        className={`w-max rounded-full border px-3 py-1 text-[10px] font-black ${
                          rule.active
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-gray-100 text-gray-500"
                        }`}
                      >
                        {rule.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                      <FieldBox label="Mode" value={rule.mode} />
                      <FieldBox
                        label="Nilai"
                        value={formatCommission(rule.mode, rule.value)}
                      />
                      <FieldBox
                        label="Effective From"
                        value={formatDateOnly(rule.effective_from)}
                      />
                      <FieldBox
                        label="Effective To"
                        value={formatDateOnly(rule.effective_to)}
                      />
                    </div>

                    {rule.mode === "TIER" && rule.tiers?.length ? (
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {rule.tiers.map((tier) => (
                          <div
                            key={tier.id}
                            className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                          >
                            <p className="text-sm font-black text-gray-900">
                              Tier {tier.tier_order}
                            </p>
                            <p className="mt-1 text-xs font-bold text-gray-500">
                              Closing {tier.min_closings} sampai{" "}
                              {tier.max_closings || "tak terbatas"}
                            </p>
                            <p className="mt-2 text-sm font-black text-[#C92C1E]">
                              {formatCommission(tier.mode, tier.value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}