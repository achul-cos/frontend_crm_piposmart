"use client";

import React, { useEffect, useState } from "react";
import { getPartnerActivity, PartnerActivityStatus } from "@/app/lib/api";

interface PartnerActivityBadgeProps {
  partnerId: number;
}

export function PartnerActivityBadge({ partnerId }: PartnerActivityBadgeProps) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PartnerActivityStatus | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      try {
        setLoading(true);
        const data = await getPartnerActivity(partnerId);
        if (mounted) {
          setStatus(data);
        }
      } catch (err) {
        console.error("Gagal memuat status aktivitas mitra", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void fetchStatus();

    return () => {
      mounted = false;
    };
  }, [partnerId]);

  if (loading) {
    return (
      <div className="h-6 w-24 animate-pulse rounded-full bg-gray-200"></div>
    );
  }

  const isReferral = status?.status === "TELAH_MEMBERIKAN_REFERAL";

  return (
    <span
      className={`w-max rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
        isReferral
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-gray-200 bg-gray-50 text-gray-500"
      }`}
    >
      {isReferral ? "Referal" : "Non Referal"}
    </span>
  );
}
