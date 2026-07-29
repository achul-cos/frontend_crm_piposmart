"use client";

import Sprint14g1Board, {
  type Sprint14g1Section,
} from "@/app/components/analytics/Sprint14g1Board";

const TRAINING_SECTIONS: Sprint14g1Section[] = [
  {
    id: "trainings",
    title: "Analitik Training",
    description:
      "Membaca jadwal training/demo, realisasi penyelesaian, dan dampaknya terhadap peluang closing secara lebih fokus.",
    diagrams: [
      { module: "trainings", key: "scheduled-vs-completed" },
      { module: "trainings", key: "training-to-closing-conversion" },
    ],
  },
];

export default function TrainingAnalyticsTab() {
  return (
    <Sprint14g1Board
      heroLabel="Analytics Training"
      title="Board Analitik Training"
      description="Halaman ini khusus menampung analitik training/demo agar tim bisa membaca eksekusi training dan konversinya ke closing tanpa bercampur dengan modul lead."
      sections={TRAINING_SECTIONS}
    />
  );
}
