"use client";

import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import AnalyticsTab from "./AnalyticsTab";

export default function TrainingPage() {
  usePageTitle("Training");
  return <AnalyticsTab />;
}
