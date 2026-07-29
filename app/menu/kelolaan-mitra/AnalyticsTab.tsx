"use client";

import Sprint14g1Board, {
  type Sprint14g1Section,
} from "@/app/components/analytics/Sprint14g1Board";

const sections: Sprint14g1Section[] = [
  {
    id: "partner-performance",
    title: "Performa dan Kualitas Mitra",
    description:
      "Melihat pertumbuhan mitra, komposisi jenis mitra, kontribusi referral, kualitas conversion, dan intensitas hubungan PIC Sales dengan mitra.",
    diagrams: [
      { module: "partners", key: "partner-growth-trend" },
      { module: "partners", key: "partner-type-distribution" },
      { module: "partners", key: "referral-count-per-partner" },
      { module: "partners", key: "referral-conversion-per-partner" },
      { module: "partners", key: "partner-pic-workload" },
      { module: "partners", key: "call-mitra-frequency" },
      { module: "partners", key: "partner-inactivity-aging" },
      { module: "partners", key: "partner-region-distribution" },
    ],
  },
  {
    id: "commission-health",
    title: "Komisi, Payout, dan Historical Integrity",
    description:
      "Membantu membaca beban komisi, aging unpaid, paket atau tipe mitra yang paling memicu komisi, serta memastikan snapshot komisi historis tetap statis.",
    diagrams: [
      { module: "commissions", key: "commission-earned-trend" },
      { module: "commissions", key: "paid-vs-unpaid" },
      { module: "commissions", key: "commission-aging" },
      { module: "commissions", key: "commission-by-partner-type" },
      { module: "commissions", key: "commission-by-package" },
      { module: "commissions", key: "payout-waterfall" },
      { module: "commissions", key: "rule-history-timeline" },
      { module: "commissions", key: "snapshot-vs-current" },
    ],
  },
  {
    id: "audit-governance",
    title: "Audit, Governance, dan Stabilitas Operasional",
    description:
      "Menampilkan aktivitas perubahan data, pola restore/delete, dan frekuensi error backend yang persisted agar pengelolaan mitra dan komisi lebih terkontrol.",
    diagrams: [
      { module: "audit", key: "log-volume-by-module" },
      { module: "audit", key: "actor-activity-chart" },
      { module: "audit", key: "restore-vs-delete-trend" },
      { module: "audit", key: "backend-error-code-frequency" },
    ],
  },
];

export default function PartnerAnalyticsTab() {
  return (
    <Sprint14g1Board
      heroLabel="Analytics Mitra"
      title="Analitik Partner, Komisi, dan Governance"
      description="Dashboard ini menggabungkan analitik pertumbuhan mitra, kualitas referral, health komisi, payout, dan governance audit agar tim bisa membaca performa channel partner secara lebih menyeluruh."
      sections={sections}
    />
  );
}
