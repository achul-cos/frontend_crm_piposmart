"use client";

import Sprint14g1Board, {
  type Sprint14g1Section,
} from "@/app/components/analytics/Sprint14g1Board";

const INTERACT_SECTIONS: Sprint14g1Section[] = [
  {
    id: "interactions",
    title: "Analitik Interaksi",
    description:
      "Mengukur intensitas follow-up, hasil remark, kepatuhan follow-up, dan kecepatan first response pada proses call/chat customer.",
    diagrams: [
      { module: "interactions", key: "volume-trend" },
      { module: "interactions", key: "remark-distribution" },
      { module: "interactions", key: "follow-up-compliance" },
      { module: "interactions", key: "first-response-lag" },
    ],
  },
];

export default function InteractAnalyticsTab() {
  return (
    <Sprint14g1Board
      heroLabel="Analytics Interact"
      title="Board Analitik Interaksi"
      description="Halaman ini menampung diagram aktivitas call dan chat customer agar produktivitas follow-up dapat dibaca terpisah dari funnel lead."
      sections={INTERACT_SECTIONS}
    />
  );
}
