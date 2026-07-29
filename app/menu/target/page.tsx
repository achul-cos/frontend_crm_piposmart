"use client";

import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import Sprint14g1Board, {
  type Sprint14g1Section,
} from "@/app/components/analytics/Sprint14g1Board";

const sections: Sprint14g1Section[] = [
  {
    id: "target-performance",
    title: "Progress Target Sales",
    description:
      "Membandingkan target dan realisasi penjualan agar supervisor cepat melihat gap per sales dan progres target periode berjalan.",
    diagrams: [
      { module: "targets", key: "target-vs-actual" },
      { module: "targets", key: "target-burnup" },
    ],
  },
  {
    id: "kpi-performance",
    title: "KPI dan Efektivitas Aktivitas",
    description:
      "Melihat ranking KPI dan hubungan aktivitas dengan hasil closing agar coaching lebih tepat sasaran.",
    diagrams: [
      { module: "kpi", key: "leaderboard" },
      { module: "kpi", key: "activity-vs-closing-scatter" },
    ],
  },
];

export default function TargetPage() {
  usePageTitle("Target");

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="border-b-2 border-[#C92C1E] p-5">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
            <span>Menu</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Target</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-gray-900">Analitik Target dan KPI</h1>
          <p className="mt-1 text-sm text-gray-500">
            Halaman ini membantu memantau target, burn-up realisasi, leaderboard KPI, dan efektivitas aktivitas sales.
          </p>
        </div>
      </div>

      <Sprint14g1Board
        heroLabel="Analytics Target"
        title="Target, KPI, dan Efektivitas Sales"
        description="Analitik pada halaman target berfungsi sebagai control room supervisor untuk mengecek capaian target, ranking KPI, dan hubungan antara aktivitas follow-up dengan hasil closing."
        sections={sections}
      />
    </div>
  );
}
