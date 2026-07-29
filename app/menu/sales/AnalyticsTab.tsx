"use client";

import Sprint14g1Board, {
  type Sprint14g1Section,
} from "@/app/components/analytics/Sprint14g1Board";

const sections: Sprint14g1Section[] = [
  {
    id: "sales-performance",
    title: "Performa Sales dan Tim",
    description:
      "Membaca output closing per sales dan supervisor sekaligus efektivitas aktivitas yang dilakukan tim.",
    diagrams: [
      { module: "trainings", key: "training-to-closing-conversion" },
      { module: "closings", key: "closing-by-sales" },
      { module: "closings", key: "closing-by-supervisor" },
      { module: "kpi", key: "leaderboard" },
      { module: "kpi", key: "activity-vs-closing-scatter" },
    ],
  },
];

export default function SalesAnalyticsTab() {
  return (
    <Sprint14g1Board
      heroLabel="Analytics Sales"
      title="Analitik Performa Sales"
      description="Dashboard ini membantu supervisor dan admin membaca siapa yang aktif, siapa yang efektif, dan bagaimana hubungan antara aktivitas follow-up dengan hasil closing."
      sections={sections}
    />
  );
}
