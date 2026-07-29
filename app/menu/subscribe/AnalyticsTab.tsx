"use client";

import Sprint14g1Board, {
  type Sprint14g1Section,
} from "@/app/components/analytics/Sprint14g1Board";

const sections: Sprint14g1Section[] = [
  {
    id: "subscription-health",
    title: "Kesehatan Subscription",
    description:
      "Memantau pertumbuhan subscription aktif, ritme activation vs expiry, renewal, dan distribusi masa aktif agar follow-up retention lebih presisi.",
    diagrams: [
      { module: "subscriptions", key: "active-subscription-trend" },
      { module: "subscriptions", key: "activation-vs-expiry-trend" },
      { module: "subscriptions", key: "renewal-rate" },
      { module: "subscriptions", key: "expiry-forecast" },
      { module: "subscriptions", key: "days-remaining-histogram" },
      { module: "subscriptions", key: "churn-bucket-trend" },
    ],
  },
  {
    id: "subscription-mix",
    title: "Komposisi Paket dan Tenure",
    description:
      "Melihat mix paket aktif dan tenure aktif untuk membantu membaca karakter basis customer dan peluang upsell.",
    diagrams: [
      { module: "subscriptions", key: "package-mix" },
      { module: "subscriptions", key: "tenure-mix" },
    ],
  },
  {
    id: "reconciliation-health",
    title: "Kesehatan Reconciliation",
    description:
      "Membaca kualitas matching order dengan closing, beban issue queue, serta membedakan revenue topup dengan performa closing agar tidak terjadi double counting.",
    diagrams: [
      { module: "reconciliation", key: "success-rate" },
      { module: "reconciliation", key: "issue-by-type" },
      { module: "reconciliation", key: "issue-aging" },
      { module: "reconciliation", key: "auto-vs-manual" },
      { module: "reconciliation", key: "hanging-transaction-trend" },
      { module: "reconciliation", key: "revenue-vs-closing-period-compare" },
    ],
  },
];

export default function SubscribeAnalyticsTab() {
  return (
    <Sprint14g1Board
      heroLabel="Analytics Subscribe"
      title="Analitik Subscription dan Reconciliation"
      description="Dashboard ini membantu membaca health subscription, potensi renewal, distribusi paket aktif, serta kualitas reconciliation antara order dan closing."
      sections={sections}
    />
  );
}
