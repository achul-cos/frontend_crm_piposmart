"use client";

import Link from "next/link";
import { use, useEffect, useState, type ReactNode } from "react";
import DetailSummaryCard from "@/app/components/ui/DetailSummaryCard";
import { authFetchJson } from "@/app/lib/api";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

type EntityRef = {
  id?: number;
  code?: string;
  name?: string;
};

type UserBrief = {
  id?: number;
  name?: string;
  role?: string;
};

type UpgradeContext = {
  effective_start_date?: string;
  original_end_date?: string;
  remaining_days?: number;
  daily_price?: string;
  previous_package?: EntityRef | null;
  previous_plan?: EntityRef | null;
};

type OrderItem = {
  id: number;
  code?: string;
  owner?: EntityRef;
  closing?: EntityRef;
  sales?: UserBrief;
  supervisor?: UserBrief;
  plan?: EntityRef;
  package?: EntityRef;
  promotion?: EntityRef;
  promotions?: EntityRef[];
  balance_shortfall_amount?: string | null;
  wallet_transaction_id?: number;
  tenure_months?: number;
  duration_days?: number;
  base_price?: string;
  discount_amount?: string;
  additional_charge?: string;
  final_amount?: string;
  currency?: string;
  order_type?: string;
  source_subscription?: EntityRef | null;
  upgrade?: UpgradeContext | null;
  status?: string;
  purchased_at?: string;
  subscription_start_date?: string;
  external_reference?: string;
  note?: string;
};

type SubscriptionItem = {
  id?: number;
  code?: string;
  owner?: EntityRef;
  outlet_id?: number;
  plan?: EntityRef;
  status?: string;
  active_from?: string;
  active_until?: string;
  total_duration_days?: number;
};

type ReconciliationItem = {
  id?: number;
  code?: string;
  status?: string;
  match_type?: string;
  amount_difference?: string;
  note?: string;
  confirmed_at?: string;
};

type IssueItem = {
  id?: number;
  code?: string;
  issue_type?: string;
  status?: string;
  description?: string;
  detected_at?: string;
};

type OrderDetailData = {
  order?: OrderItem;
  subscription?: SubscriptionItem;
  reconciliation?: ReconciliationItem;
  issue?: IssueItem;
};

type OrderDetailEnvelope = {
  data?: OrderDetailData | OrderItem;
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

function formatDateOnly(value?: string | null): string {
  if (!value) return "-";
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

function formatLabel(value?: string | null): string {
  if (!value) return "-";
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusBadgeClass(status?: string | null): string {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE":
    case "RECONCILED":
    case "PAID":
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "PENDING":
    case "PENDING_RECONCILIATION":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "REJECTED":
    case "EXPIRED":
    case "CANCELLED":
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

async function getOrderDetail(orderId: number): Promise<OrderDetailData | null> {
  const response = await authFetchJson<OrderDetailEnvelope>(`/subscription-orders/${orderId}`);
  const payload = response.data;

  if (!payload) return null;
  if (typeof payload === "object" && "order" in payload) {
    return payload as OrderDetailData;
  }

  return { order: payload as OrderItem };
}

export default function SubscriptionOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  usePageTitle("Detail Order Subscribe");
  const resolvedParams = use(params);
  const orderId = Number(resolvedParams.id);
  const isInvalidOrderId = !orderId || Number.isNaN(orderId);

  const [detail, setDetail] = useState<OrderDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInvalidOrderId) {
      const timer = window.setTimeout(() => {
        setError("ID order subscription tidak valid.");
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
          const result = await getOrderDetail(orderId);
          if (cancelled) return;
          setDetail(result);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Gagal memuat detail order subscription.");
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
  }, [isInvalidOrderId, orderId]);

  const order = detail?.order;
  const subscription = detail?.subscription;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
            <span>Menu</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/menu/subscribe" className="hover:text-[#C92C1E] transition-colors">
              Subscribe
            </Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Detail Order</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isLoading ? "Memuat Data..." : order ? `Detail Order: ${order.code || `ORDER-${order.id}`}` : "Data Tidak Ditemukan"}
          </h1>
          {!isLoading && order ? (
            <p className="mt-1 text-sm text-gray-500">
              Owner <span className="font-bold text-gray-700">{order.owner?.name || "-"}</span> • {formatLabel(order.order_type)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {order?.owner?.id ? (
            <Link
              href={`/menu/owner-outlet/${order.owner.id}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#C92C1E]"
            >
              Lihat Owner
            </Link>
          ) : null}
          {subscription?.id ? (
            <Link
              href={`/menu/subscribe/${subscription.id}`}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#C92C1E]"
            >
              Lihat Subscription
            </Link>
          ) : null}
          <Link
            href="/menu/subscribe"
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
          <span className="font-semibold text-sm">Mengambil rincian order subscription...</span>
        </div>
      ) : error || !order ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Order Subscription Tidak Ditemukan</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">{error || "Data order yang Anda cari mungkin tidak tersedia atau ID tidak valid."}</p>
          <Link
            href="/menu/subscribe"
            className="rounded-lg bg-[#C92C1E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 inline-flex items-center gap-2"
          >
            Kembali ke Halaman Subscribe
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DetailSummaryCard
              title="Kode Order"
              value={order.code || `ORDER-${order.id}`}
              description="Identitas order pembelian paket langganan."
              primary
              silhouette="check-square"
            />
            <DetailSummaryCard
              title="Status Order"
              value={formatLabel(order.status)}
              tone="sky"
              description={`${formatLabel(order.order_type)} • dibeli ${formatDateTime(order.purchased_at)}`}
            />
            <DetailSummaryCard
              title="Final Amount"
              value={formatRupiah(order.final_amount)}
              tone="emerald"
              description={`Plan ${order.plan?.name || order.plan?.code || "-"}`}
            />
          </div>

          <InfoSection
            title="Informasi Order"
            subtitle="Detail utama order pembelian paket"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
          >
            <FieldBox label="Order ID" value={order.id} />
            <FieldBox label="Kode Order" value={order.code || `ORDER-${order.id}`} />
            <FieldBox label="Status">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getStatusBadgeClass(order.status)}`}>
                {formatLabel(order.status)}
              </span>
            </FieldBox>
            <FieldBox label="Order Type" value={formatLabel(order.order_type)} />
            <FieldBox label="Purchased At" value={formatDateTime(order.purchased_at)} />
            <FieldBox label="Subscription Start" value={formatDateOnly(order.subscription_start_date)} />
            <FieldBox label="Paket" value={order.package?.name || order.package?.code || "-"} />
            <FieldBox label="Plan" value={order.plan?.name || order.plan?.code || "-"} />
            <FieldBox label="Closing Ref" value={order.closing?.code || order.closing?.id || "-"} />
            <FieldBox label="External Reference" value={order.external_reference || "-"} />
            <FieldBox label="Wallet Transaction ID" value={order.wallet_transaction_id ?? "-"} />
            <FieldBox label="Catatan" value={order.note || "-"} span />
          </InfoSection>

          <InfoSection
            title="Owner & Tim Terkait"
            subtitle="Pemilik order serta PIC penjualannya"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />}
          >
            <FieldBox label="ID Owner" value={order.owner?.id || "-"} />
            <FieldBox label="Kode Owner" value={order.owner?.code || "-"} />
            <FieldBox label="Nama Owner" value={order.owner?.name || "-"} />
            <FieldBox label="Sales" value={order.sales?.name || "-"} />
            <FieldBox label="Supervisor" value={order.supervisor?.name || "-"} />
            <FieldBox label="Subscription Sumber" value={order.source_subscription?.code || order.source_subscription?.id || "-"} />
          </InfoSection>

          <InfoSection
            title="Nilai Finansial"
            subtitle="Harga paket, diskon, charge tambahan, dan hasil akhir"
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-9 4h16a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
          >
            <FieldBox label="Base Price" value={formatRupiah(order.base_price)} />
            <FieldBox label="Discount" value={formatRupiah(order.discount_amount)} />
            <FieldBox label="Additional Charge" value={formatRupiah(order.additional_charge)} />
            <FieldBox label="Final Amount" value={formatRupiah(order.final_amount)} />
            <FieldBox label="Tenure (Bulan)" value={order.tenure_months ?? "-"} />
            <FieldBox label="Durasi (Hari)" value={order.duration_days ?? "-"} />
            {order.balance_shortfall_amount ? (
              <FieldBox label="Balance Shortfall" span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
                  Kekurangan saldo aplikasi {formatRupiah(order.balance_shortfall_amount)}
                </span>
              </FieldBox>
            ) : null}
            <FieldBox label="Promosi" span>
              {order.promotions && order.promotions.length > 0
                ? order.promotions.map((promotion) => promotion.name || promotion.code).filter(Boolean).join(", ")
                : order.promotion?.name || order.promotion?.code || "-"}
            </FieldBox>
          </InfoSection>

          {(subscription || detail?.reconciliation || detail?.issue || order.upgrade) && (
            <InfoSection
              title="Status Lanjutan"
              subtitle="Hasil order setelah diproses ke subscription atau reconciliation"
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />}
            >
              <FieldBox label="Subscription ID" value={subscription?.id ?? "-"} />
              <FieldBox label="Kode Subscription" value={subscription?.code || "-"} />
              <FieldBox label="Status Subscription" value={formatLabel(subscription?.status)} />
              <FieldBox label="Periode Subscription" value={`${formatDateOnly(subscription?.active_from)} - ${formatDateOnly(subscription?.active_until)}`} />
              <FieldBox label="Reconciliation" value={detail?.reconciliation?.code || "-"} />
              <FieldBox label="Status Reconciliation" value={formatLabel(detail?.reconciliation?.status)} />
              <FieldBox label="Issue Queue" value={detail?.issue?.code || "-"} />
              <FieldBox label="Issue Type" value={formatLabel(detail?.issue?.issue_type)} />
              <FieldBox label="Upgrade Context" span>
                {order.upgrade
                  ? `Mulai ${formatDateOnly(order.upgrade.effective_start_date)} • sisa ${order.upgrade.remaining_days || 0} hari`
                  : "-"}
              </FieldBox>
            </InfoSection>
          )}
        </div>
      )}
    </div>
  );
}
