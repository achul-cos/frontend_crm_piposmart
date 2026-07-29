"use client";

import Sprint14g1Board, {
  type Sprint14g1Section,
} from "@/app/components/analytics/Sprint14g1Board";

const sections: Sprint14g1Section[] = [
  {
    id: "import-quality",
    title: "Import Quality Dashboard",
    description:
      "Memantau kualitas proses import, health validasi, duplicate rate, durasi worker, dan aktivitas uploader agar operasional administrasi lebih stabil.",
    diagrams: [
      { module: "imports", key: "batches-per-profile" },
      { module: "imports", key: "success-vs-failed" },
      { module: "imports", key: "invalid-rows-distribution" },
      { module: "imports", key: "validation-error-by-profile" },
      { module: "imports", key: "duplicate-detection-rate" },
      { module: "imports", key: "import-duration-trend" },
      { module: "imports", key: "batch-status-funnel" },
      { module: "imports", key: "uploader-activity" },
      { module: "imports", key: "file-history-usage" },
    ],
  },
  {
    id: "executive-board",
    title: "Executive Board Lintas Modul",
    description:
      "Board ini membantu manajemen membaca funnel bisnis end-to-end, memisahkan revenue topup dari closing dan active subscription, serta mengecek health data lintas modul.",
    diagrams: [
      { module: "executive", key: "end-to-end-funnel" },
      { module: "executive", key: "revenue-closing-active-subscription-board" },
      { module: "executive", key: "monthly-operating-review-board" },
      { module: "executive", key: "north-star-kpi-trend" },
      { module: "executive", key: "data-quality-score-by-module" },
      { module: "executive", key: "forecast-summary-board" },
    ],
  },
  {
    id: "custom-comparison",
    title: "Advanced Comparison & Analyst Board",
    description:
      "Memberi fleksibilitas untuk membaca hubungan banyak metrik sekaligus, membandingkan region, dan melihat dampak comparison terhadap area yang paling positif atau negatif.",
    diagrams: [
      { module: "custom", key: "multi-series-trend" },
      { module: "custom", key: "metric-comparison-board" },
      { module: "custom", key: "region-comparison-board" },
      { module: "custom", key: "comparison-impact-summary" },
    ],
  },
  {
    id: "retention-cohort",
    title: "Retention & Cohort",
    description:
      "Membaca kekuatan cohort subscription dari bulan aktivasi ke bulan-bulan berikutnya untuk membantu evaluasi onboarding dan retensi awal.",
    diagrams: [{ module: "subscriptions", key: "cohort-retention" }],
  },
];

export default function SalesReportAnalyticsTab() {
  return (
    <Sprint14g1Board
      heroLabel="Analytics Center"
      title="Executive, Import, dan Advanced Comparison Analytics"
      description="Sprint 14g5 menjadi pusat analytics lanjutan yang menggabungkan dashboard import, executive board lintas modul, comparison board fleksibel, dan cohort retention dalam satu tempat yang lebih strategis."
      sections={sections}
    />
  );
}
