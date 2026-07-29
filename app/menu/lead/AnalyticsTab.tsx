"use client";

import Sprint14g1Board, { type Sprint14g1Section } from "@/app/components/analytics/Sprint14g1Board";

const LEAD_SECTIONS: Sprint14g1Section[] = [
  {
    id: "leads",
    title: "Analitik Lead",
    description:
      "Melihat funnel lead, stage yang macet, distribusi assignment, dan perpindahan kepemilikan data lead.",
    diagrams: [
      { module: "leads", key: "funnel" },
      { module: "leads", key: "aging-by-stage" },
      { module: "leads", key: "assignment-distribution" },
      { module: "leads", key: "ownership-transfer-sankey" },
    ],
  },
];

export default function AnalyticsTab() {
  return (
    <Sprint14g1Board
      heroLabel="Analytics Sprint 14g1"
      title="Board Analitik Lead"
      description="Halaman ini khusus menampung diagram inti modul Lead: funnel, aging, distribusi assignment, dan alur perpindahan kepemilikan lead."
      sections={LEAD_SECTIONS}
    />
  );
}
