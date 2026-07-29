"use client";

import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import AnalyticsTab from "./AnalyticsTab";

export default function InteractPage() {
  usePageTitle("Interact");
  return <AnalyticsTab />;
}
