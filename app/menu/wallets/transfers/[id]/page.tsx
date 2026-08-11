"use client";

import Link from "next/link";
import { use, useEffect, useState, type ReactNode } from "react";
import DetailSummaryCard from "@/app/components/ui/DetailSummaryCard";
import { authFetchJson, type TransferItem } from "@/app/lib/api";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

type TransferDetailResponse = {
  data?: TransferItem;
};

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
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusBadgeClass(status?: string | null): string {
  switch (String(status || "").toUpperCase()) {
    case "MATCHED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "SUGGESTED":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "REJECTED_MATCH":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    default:
      return "bg-gray-50 text-gray-600 border border-gray-200";
  }
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

async function getTransferDetail(transferId: number): Promise<TransferItem | null> {
  const response = await authFetchJson<TransferDetailResponse>(`/transfers/${transferId}`);
  return response.data || null;
}

export default function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  usePageTitle("Detail Transfer");
  const resolvedParams = use(params);
  const transferId = Number(resolvedParams.id);
  const isInvalidTransferId = !transferId || Number.isNaN(transferId);

  const [detail, setDetail] = useState<TransferItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInvalidTransferId) {
      const timer = window.setTimeout(() => {
        setError("ID transfer tidak valid.");
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
          const result = await getTransferDetail(transferId);
          if (cancelled) return;
          setDetail(result);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Gagal memuat detail transfer.");
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
  }, [isInvalidTransferId, transferId]);

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
            <span className="text-[#C92C1E]">Detail Transfer</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isLoading ? "Memuat Data..." : detail ? `Detail Transfer: TRF-${detail.id}` : "Data Tidak Ditemukan"}
          </h1>
          {!isLoading && detail ? (
            <p className="mt-1 text-sm text-gray-500">
              Owner <span className="font-bold text-gray-700">{detail.owner?.name || "-"}</span> • status {formatLabel(detail.match_status)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {detail?.owner?.id ? (
            <Link
              href={`/menu/owner-outlet/${detail.owner.id}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#C92C1E]"
            >
              Lihat Owner
            </Link>
          ) : null}
          {detail?.matched_wallet_payment_id ? (
            <Link
              href={`/menu/wallets/payments/${detail.matched_wallet_payment_id}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#C92C1E]"
            >
              Lihat Top Up Terkait
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
          <span className="font-semibold text-sm">Mengambil rincian transfer...</span>
        </div>
      ) : error || !detail ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Transfer Tidak Ditemukan</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">{error || "Data transfer yang Anda cari mungkin tidak tersedia atau ID tidak valid."}</p>
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
            <DetailSummaryCard
              title="Kode Transfer"
              value={`TRF-${detail.id}`}
              description="Identitas bukti transfer bank owner."
              primary
              silhouette="wallet"
            />
            <DetailSummaryCard
              title="Nominal Transfer"
              value={formatRupiah(detail.amount)}
              tone="emerald"
              description={`Ditransfer pada ${formatDateTime(detail.transfer_date)}`}
            />
            <DetailSummaryCard
              title="Status Match"
              value={formatLabel(detail.match_status)}
              tone="sky"
              description={`Sumber ${formatLabel(detail.source)}`}
            />
          </div>

          <InfoSection
            title="Informasi Transfer"
            subtitle="Rincian bukti transfer dan status matching"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a5 5 0 10-10 0v2M5 9h14l-1 10a2 2 0 01-2 2H8a2 2 0 01-2-2L5 9z" />}
          >
            <FieldBox label="ID Transfer" value={detail.id} />
            <FieldBox label="Tanggal Transfer" value={formatDateTime(detail.transfer_date)} />
            <FieldBox label="Nominal" value={formatRupiah(detail.amount)} />
            <FieldBox label="Status Match">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getStatusBadgeClass(detail.match_status)}`}>
                {formatLabel(detail.match_status)}
              </span>
            </FieldBox>
            <FieldBox label="Sumber" value={formatLabel(detail.source)} />
            <FieldBox label="Matched Payment ID" value={detail.matched_wallet_payment_id ?? "-"} />
            <FieldBox label="External Reference" value={detail.external_reference || "-"} />
            <FieldBox label="Proof URL" span>
              {detail.proof_url ? (
                <a href={detail.proof_url} target="_blank" rel="noreferrer" className="text-[#C92C1E] hover:underline">
                  {detail.proof_url}
                </a>
              ) : (
                "-"
              )}
            </FieldBox>
            <FieldBox label="Catatan" value={detail.note || "-"} span />
          </InfoSection>

          <InfoSection
            title="Informasi Owner & Audit"
            subtitle="Pemilik transfer dan waktu pencatatannya di sistem"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />}
          >
            <FieldBox label="ID Owner" value={detail.owner?.id || "-"} />
            <FieldBox label="Kode Owner" value={detail.owner?.code || "-"} />
            <FieldBox label="Nama Owner" value={detail.owner?.name || "-"} />
            <FieldBox label="Created At" value={formatDateTime(detail.created_at)} />
            <FieldBox label="Updated At" value={formatDateTime(detail.updated_at)} />
          </InfoSection>
        </div>
      )}
    </div>
  );
}
