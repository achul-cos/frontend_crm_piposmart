"use client";

import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import Sprint14g1Board, {
  type Sprint14g1Section,
} from "@/app/components/analytics/Sprint14g1Board";

const sections: Sprint14g1Section[] = [
  {
    id: "closing-trend",
    title: "Tren dan Distribusi Closing",
    description:
      "Memantau pertumbuhan closing, sebaran status, dan perubahan nilai transaksi secara berkala.",
    diagrams: [
      { module: "closings", key: "closing-trend" },
      { module: "closings", key: "status-distribution" },
      { module: "closings", key: "average-ticket-size-trend" },
      { module: "closings", key: "closing-amount-waterfall" },
    ],
  },
  {
    id: "closing-composition",
    title: "Komposisi Penjualan",
    description:
      "Melihat paket, tenor, dan kontribusi tim terhadap transaksi closing yang berhasil dikonfirmasi.",
    diagrams: [
      { module: "closings", key: "closing-by-package" },
      { module: "closings", key: "closing-by-tenure" },
      { module: "closings", key: "closing-by-sales" },
      { module: "closings", key: "closing-by-supervisor" },
    ],
  },
];

export default function ClosingPage() {
  usePageTitle("Closing");

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="border-b-2 border-[#C92C1E] p-5">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
            <span>Menu</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">Closing</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-gray-900">Analitik Closing</h1>
          <p className="mt-1 text-sm text-gray-500">
            Dashboard khusus untuk membaca tren closing, nilai transaksi, status closing, dan komposisi penjualan.
          </p>
        </div>
      </div>

      <Sprint14g1Board
        heroLabel="Analytics Closing"
        title="Monitoring Closing Sales"
        description="Seluruh diagram di halaman ini fokus pada performa closing yang sudah dibentuk dari proses penjualan: tren transaksi, status, nilai rata-rata, komposisi paket, tenor, hingga kontribusi sales dan supervisor."
        sections={sections}
      />
    </div>
  );
}
