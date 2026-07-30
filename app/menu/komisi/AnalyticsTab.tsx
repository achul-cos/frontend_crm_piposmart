"use client";

import Sprint14g1Board, {
  type Sprint14g1Section,
} from "@/app/components/analytics/Sprint14g1Board";

const sections: Sprint14g1Section[] = [
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
];

export default function CommissionAnalyticsTab() {
  return (
    <Sprint14g1Board
      heroLabel="Analytics Komisi & Payout"
      title="Analitik Komisi, Payout, dan Historical Integrity"
      description="Dashboard ini membantu membaca beban komisi, aging unpaid, paket atau tipe mitra yang paling memicu komisi, serta memastikan snapshot komisi historis tetap statis."
      sections={sections}
    />
  );
}
