"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { listPartners, type PartnerItem } from "@/app/lib/api";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value?: string | number | null) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatFlatCommission(partner?: PartnerItem | null) {
  const partnerType = partner?.partner_type;

  if (!partnerType) return "-";

  const value = Number(partnerType.commission_value || 0);

  return partnerType.commission_mode === "PERCENTAGE"
    ? `${value}%`
    : formatMoney(value);
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

export default function MitraSalesDetailPage() {
  usePageTitle("Detail Mitra Sales");

  const searchParams = useSearchParams();
  const partnerId = Number(searchParams.get("id") || 0);

  const [partner, setPartner] = useState<PartnerItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadDetail = async () => {
      setLoading(true);
      setPageError("");

      try {
        const result = await listPartners({
          search: "",
          limit: 200,
          offset: 0,
        });

        if (cancelled) return;

        const matched =
          result.items?.find((item) => Number(item.id) === partnerId) || null;

        setPartner(matched);
      } catch (error) {
        if (!cancelled) {
          setPageError(getErrorMessage(error));
          setPartner(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  const statusClass = useMemo(() => {
    if (partner?.status === "ACTIVE") {
      return "border-emerald-100 bg-emerald-50 text-emerald-700";
    }

    return "border-gray-200 bg-gray-100 text-gray-500";
  }, [partner?.status]);

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
                href="/menu/mitra-sales"
                className="transition hover:text-[#C92C1E]"
              >
                Mitra Sales
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
                ? "Memuat Detail Mitra..."
                : partner
                  ? partner.name
                  : "Mitra Tidak Ditemukan"}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Detail data mitra, kontak, jenis mitra, komisi dasar, dan status.
            </p>
          </div>

          <Link
            href="/menu/mitra-sales"
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
          Memuat data mitra...
        </div>
      ) : !partner ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <h2 className="text-lg font-black text-gray-900">
            Data mitra tidak ditemukan.
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            ID mitra tidak valid atau data tidak tersedia.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">
                Kode Mitra
              </p>
              <h2 className="text-3xl font-black">{partner.code}</h2>
            </div>

            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                Status
              </p>
              <span
                className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass}`}
              >
                {partner.status || "-"}
              </span>
            </div>

            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                Komisi Dasar
              </p>
              <h2 className="text-3xl font-black text-gray-900">
                {formatFlatCommission(partner)}
              </h2>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-black text-gray-900">
                Informasi Mitra
              </h2>
              <p className="mt-1 text-xs font-medium text-gray-400">
                Detail identitas dan kontak mitra.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FieldBox label="Nama Mitra" value={partner.name} />
              <FieldBox label="Code" value={partner.code} />
              <FieldBox label="Jenis Mitra" value={partner.partner_type?.name} />
              <FieldBox label="Code Jenis" value={partner.partner_type?.code} />
              <FieldBox label="Telepon" value={partner.phone} />
              <FieldBox label="Email" value={partner.email} />
              <FieldBox label="Updated" value={formatDateTime(partner.updated_at)} />
              <FieldBox label="Created" value={formatDateTime(partner.created_at)} />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-gray-900">Alamat</h2>
            <p className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm font-bold text-gray-700">
              {partner.address || "Belum ada alamat."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}