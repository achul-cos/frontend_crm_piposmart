"use client";

import Sprint14g1Board, { type Sprint14g1Section } from "@/app/components/analytics/Sprint14g1Board";

const OUTLET_SECTIONS: Sprint14g1Section[] = [
  {
    id: "outlets",
    title: "Analitik Outlet",
    description:
      "Memantau pertumbuhan outlet, distribusi jumlah outlet per owner, kesehatan status langganan, outlet yang tidak lagi berlangganan, dan persebaran outlet di Indonesia.",
    diagrams: [
      { module: "outlets", key: "growth-trend" },
      { module: "outlets", key: "outlet-per-owner-histogram" },
      { module: "outlets", key: "subscription-status-recap" },
      { module: "outlets", key: "not-subscribe-trend" },
      { module: "outlets", key: "indonesia-distribution-map" },
    ],
  },
];

export default function OutletAnalytics() {
  return (
    <Sprint14g1Board
      heroLabel="Analytics Sprint 14g1"
      title="Board Analitik Outlet"
      description="Halaman ini fokus pada diagram modul Outlet. Jadi user bisa membaca performa, persebaran, dan kesehatan subscription outlet tanpa tercampur diagram owner atau lead."
      sections={OUTLET_SECTIONS}
    />
  );
}
