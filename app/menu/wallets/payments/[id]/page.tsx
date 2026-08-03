"use client";

import Link from "next/link";
import { use, useEffect, useState, type ReactNode } from "react";
import {
  getWalletPaymentDetail,
  type WalletPaymentDetailData,
} from "@/app/lib/api";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

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

function formatRupiah(value?: string | number | null): string {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) return String(value || "-");
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatLabel(value?: string | null): string {
  if (!value) return "-";
  return value
    .toString()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ownerName(owner?: {
  name?: string;
  nama_owner?: string;
}) {
  return owner?.name || owner?.nama_owner || "-";
}

function ownerCode(owner?: {
  code?: string;
  kode_owner?: string;
}) {
  return owner?.code || owner?.kode_owner || "-";
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

function getPaymentStatusLabel(status?: string | null): string {
  switch (String(status || "").toUpperCase()) {
    case "ACCEPTED":
    case "PAID":
    case "ACC":
      return "ACC";
    case "PENDING":
      return "PENDING";
    case "REJECTED":
    case "REJECT":
      return "REJECT";
    case "EXPIRED":
    case "EXP":
      return "EXP";
    default:
      return formatLabel(status);
  }
}

function getStatusBadgeClass(status?: string | null): string {
  const norm = getPaymentStatusLabel(status);
  switch (norm) {
    case "ACC":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "PENDING":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "REJECT":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    case "EXP":
      return "bg-gray-100 text-gray-500 border border-gray-200";
    default:
      return "bg-gray-50 text-gray-600 border border-gray-200";
  }
}

function getDirectionBadgeClass(direction?: string | null): string {
  return String(direction || "").toUpperCase() === "CREDIT"
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : "bg-rose-50 text-rose-700 border border-rose-200";
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-9 4h16a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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

export default function TopupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  usePageTitle("Detail Top Up");
  const resolvedParams = use(params);
  const paymentId = Number(resolvedParams.id);
  const isInvalidPaymentId = !paymentId || Number.isNaN(paymentId);

  const [detail, setDetail] = useState<WalletPaymentDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInvalidPaymentId) {
      const timer = window.setTimeout(() => {
        setError("ID top up tidak valid.");
        setIsLoading(false);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      (async () => {
        try {
          setIsLoading(true);
          setError(null);
          const result = await getWalletPaymentDetail(paymentId);
          if (cancelled) return;
          setDetail(result);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Gagal memuat detail top up.");
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isInvalidPaymentId, paymentId]);

  const payment = detail?.payment;
  const transaction = detail?.transaction;
  const wallet = detail?.wallet;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
            <span>Menu</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/menu/wallets" className="hover:text-[#C92C1E] transition-colors">
              Wallets
            </Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Detail Data</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isLoading ? "Memuat Data..." : payment ? `Detail Top Up: ${payment.code || `PAY-${payment.id}`}` : "Data Tidak Ditemukan"}
          </h1>
          {!isLoading && payment ? (
            <p className="mt-1 text-sm text-gray-500">
              Owner <span className="font-bold text-gray-700">{ownerName(payment.owner)}</span> • channel {payment.payment_channel || payment.channel || "-"}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {payment?.owner?.id ? (
            <Link
              href={`/menu/owner-outlet/${payment.owner.id}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#C92C1E]"
            >
              Lihat Owner
            </Link>
          ) : null}
          <Link
            href="/menu/wallets"
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
          <span className="font-semibold text-sm">Mengambil rincian top up...</span>
        </div>
      ) : error || !payment ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Top Up Tidak Ditemukan</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">{error || "Data top up yang Anda cari mungkin tidak tersedia atau ID tidak valid."}</p>
          <Link
            href="/menu/wallets"
            className="rounded-lg bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 inline-flex items-center gap-2"
          >
            Kembali ke Halaman Wallet
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              title="Awal Pembelian"
              value={formatRupiah(payment.amount)}
              description="Nominal transaksi awal top up."
              primary
            />
            <SummaryCard
              title="Status Top Up"
              value={getPaymentStatusLabel(payment.status)}
              description={`${formatDateTime(payment.paid_at || payment.created_at)} • ${payment.payment_channel || payment.channel || "-"}`}
            />
            <SummaryCard
              title="Owner / Outlet"
              value={ownerName(payment.owner || wallet?.owner)}
              description={`Kode Owner ${ownerCode(payment.owner || wallet?.owner)}`}
            />
          </div>

          <InfoSection
            title="Informasi Payment Top Up"
            subtitle="Identitas utama top up yang dicatat ke wallet owner"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-9 4h16a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
          >
            <FieldBox label="ID Payment" value={payment.id} />
            <FieldBox label="Payment Type" value={payment.payment_type || "TOPUP"} />
            <FieldBox label="Payment Channel" value={payment.payment_channel || payment.channel || "-"} />
            <FieldBox label="Status Top Up">
              <Badge value={getPaymentStatusLabel(payment.status)} className={getStatusBadgeClass(payment.status)} />
            </FieldBox>
            <FieldBox label="Awal Pembelian" value={formatRupiah(payment.amount)} />
            <FieldBox label="Currency" value={payment.currency || "IDR"} />
            <FieldBox label="Paid At" value={formatDateTime(payment.paid_at || payment.created_at)} />
            <FieldBox label="External Reference" value={payment.external_reference || "-"} />
            <FieldBox label="Catatan Payment" value={payment.note || "-"} span />
          </InfoSection>

          <InfoSection
            title="Informasi Owner & Wallet"
            subtitle="Pemilik dana dan snapshot wallet saat top up tercatat"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />}
          >
            <FieldBox label="ID Owner" value={payment.owner?.id ?? wallet?.owner_id ?? "-"} />
            <FieldBox label="Kode Owner" value={ownerCode(payment.owner || wallet?.owner)} />
            <FieldBox label="Nama Owner" value={ownerName(payment.owner || wallet?.owner)} />
            <FieldBox label="Wallet ID" value={wallet?.id ?? "-"} />
            <FieldBox label="Status Wallet">
              <Badge value={formatLabel(wallet?.status)} className={getStatusBadgeClass(wallet?.status)} />
            </FieldBox>
            <FieldBox label="Balance" value={formatRupiah(wallet?.balance)} />
            <FieldBox label="Currency Wallet" value={wallet?.currency || "IDR"} />
          </InfoSection>
        </div>
      )}
    </div>
  );
}
