"use client";

import Sprint14g1Board, {
  type Sprint14g1Section,
} from "@/app/components/analytics/Sprint14g1Board";

const sections: Sprint14g1Section[] = [
  {
    id: "catalog-sales",
    title: "Performa Katalog Penjualan",
    description:
      "Membaca paket, tenor, promo, dan kombinasi plan yang paling efektif di transaksi closing.",
    diagrams: [
      { module: "catalog", key: "package-popularity" },
      { module: "catalog", key: "tenure-popularity" },
      { module: "catalog", key: "package-tenure-heatmap" },
      { module: "catalog", key: "promo-adoption-rate" },
      { module: "catalog", key: "additional-charge-adoption" },
    ],
  },
  {
    id: "catalog-history",
    title: "Riwayat Harga dan Promo",
    description:
      "Memantau perubahan harga plan dan perubahan konfigurasi promo sebagai bahan audit serta evaluasi strategi pricing.",
    diagrams: [
      { module: "catalog", key: "price-history-timeline" },
      { module: "catalog", key: "promotion-history-timeline" },
    ],
  },
];

export default function CatalogAnalyticsTab() {
  return (
    <Sprint14g1Board
      heroLabel="Analytics Katalog"
      title="Analitik Package, Plan, dan Promotion"
      description="Seluruh diagram di halaman ini fokus pada performa katalog langganan: produk yang paling laku, pola tenor, adopsi promo, hingga histori perubahan harga dan promo."
      sections={sections}
    />
  );
}
