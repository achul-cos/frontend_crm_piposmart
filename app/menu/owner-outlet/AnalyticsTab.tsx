"use client";

import Sprint14g1Board, { type Sprint14g1Section } from "@/app/components/analytics/Sprint14g1Board";

const OWNER_SECTIONS: Sprint14g1Section[] = [
  {
    id: "owners",
    title: "Analitik Owner",
    description:
      "Melihat pertumbuhan owner, kepemilikan data owner, persebaran wilayah, kualitas data, dan peta Indonesia owner.",
    diagrams: [
      { module: "owners", key: "growth-trend" },
      { module: "owners", key: "ownership-distribution" },
      { module: "owners", key: "province-distribution" },
      { module: "owners", key: "city-top10" },
      { module: "owners", key: "soft-delete-trend" },
      { module: "owners", key: "indonesia-distribution-map" },
    ],
  },
];

export default function AnalyticsTab() {
  return (
    <Sprint14g1Board
      heroLabel="Analytics Sprint 14g1"
      title="Board Analitik Owner"
      description="Halaman ini khusus menampilkan diagram modul Owner. Diagram Outlet dan Lead dipindahkan ke halaman modulnya masing-masing agar struktur CRM lebih rapi dan mudah dibaca user."
      sections={OWNER_SECTIONS}
    />
  );
}
