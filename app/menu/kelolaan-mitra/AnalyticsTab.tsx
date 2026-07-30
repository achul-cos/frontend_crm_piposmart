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
    id: "audit-governance",
    title: "Audit, Governance, dan Stabilitas Operasional",
    description:
      "Menampilkan aktivitas perubahan data, pola restore/delete, dan frekuensi error backend yang persisted agar pengelolaan mitra lebih terkontrol.",
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
      title="Analitik Partner dan Governance"
      description="Dashboard ini menggabungkan analitik pertumbuhan mitra, kualitas referral, dan governance audit agar tim bisa membaca performa channel partner secara lebih menyeluruh."
      sections={sections}
    />
  );
}
