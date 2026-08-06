"use client";

import React, { useEffect, useState } from "react";
import { getActivePartnerAssignment, PartnerAssignmentItem } from "@/app/lib/api";

interface PartnerPICLabelProps {
  partnerId: number;
}

export function PartnerPICLabel({ partnerId }: PartnerPICLabelProps) {
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<PartnerAssignmentItem | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchPIC() {
      try {
        setLoading(true);
        const data = await getActivePartnerAssignment(partnerId);
        if (mounted) {
          setAssignment(data);
        }
      } catch (err) {
        console.error("Gagal memuat PIC mitra", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void fetchPIC();

    return () => {
      mounted = false;
    };
  }, [partnerId]);

  if (loading) {
    return (
      <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
    );
  }

  if (!assignment || !assignment.user_name) {
    return <span className="text-gray-400 font-bold">-</span>;
  }

  return (
    <div>
      <p className="font-bold text-gray-900">{assignment.user_name}</p>
      {assignment.user_role && (
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500">
          {assignment.user_role}
        </p>
      )}
    </div>
  );
}
