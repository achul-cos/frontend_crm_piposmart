import React from "react";
import { DollarSign, FileText, Users, Package } from "lucide-react";
import { formatRupiah } from "../utils";

type SummaryCardsProps = {
  totalSales: number;
  totalOmzet: number;
  totalCustomer: number;
  paketTerlaris: string;
};

export default function SummaryCards({ totalSales, totalOmzet, totalCustomer, paketTerlaris }: SummaryCardsProps) {
  const cards = [
    {
      label: "Total Sales",
      value: totalSales.toString(),
      icon: FileText,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Total Omzet",
      value: formatRupiah(totalOmzet),
      icon: DollarSign,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Customer",
      value: totalCustomer.toString(),
      icon: Users,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      label: "Paket Terlaris",
      value: paketTerlaris || "-",
      icon: Package,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor}`}>
            <card.icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{card.label}</p>
            <p className="truncate text-lg font-black text-gray-900">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
