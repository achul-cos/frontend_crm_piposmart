"use client";

import Sprint14g1Board, {
  type Sprint14g1Section,
} from "@/app/components/analytics/Sprint14g1Board";

const sections: Sprint14g1Section[] = [
  {
    id: "wallet-revenue",
    title: "Topup dan Kesiapan Saldo Aplikasi",
    description:
      "Membaca omset topup, frekuensi transaksi, dan distribusi saldo aplikasi agar tim bisa melihat kesiapan transaksi secara lebih jelas.",
    diagrams: [
      { module: "wallets", key: "topup-revenue-trend" },
      { module: "wallets", key: "topup-transaction-count" },
      { module: "wallets", key: "owner-balance-distribution" },
      { module: "wallets", key: "zero-vs-nonzero-balance" },
    ],
  },
  {
    id: "wallet-conversion",
    title: "Konversi Topup ke Subscribe",
    description:
      "Menganalisis seberapa cepat dan seberapa banyak saldo topup benar-benar berubah menjadi pembelian langganan.",
    diagrams: [
      { module: "wallets", key: "topup-used-vs-unused" },
      { module: "wallets", key: "topup-to-subscribe-lag" },
    ],
  },
];

export default function WalletAnalyticsTab() {
  return (
    <Sprint14g1Board
      heroLabel="Analytics Wallet"
      title="Analitik Wallet, Topup, dan Saldo Aplikasi"
      description="Halaman ini fokus pada kesehatan cash-in topup dan kesiapan saldo aplikasi. Diagram-diagramnya membantu membaca apakah topup sudah berubah menjadi transaksi langganan atau masih banyak saldo yang tertahan."
      sections={sections}
    />
  );
}
