"use client";

import { useRouter } from "next/navigation";
import ErrorPageLayout from "@/app/components/feedback/ErrorPageLayout";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  const technicalDetails = [error.message, error.digest ? `digest: ${error.digest}` : null]
    .filter(Boolean)
    .join("\n");

  return (
    <ErrorPageLayout
      title="Terjadi kesalahan"
      message="Halaman ini mengalami masalah saat memuat data."
      cause="Bisa disebabkan oleh koneksi yang tidak stabil, data yang belum siap, atau gangguan sementara pada sistem."
      solution="Coba muat ulang halaman ini. Jika masalah berlanjut, hubungi tim support dengan detail teknis di bawah."
      technicalDetails={technicalDetails || undefined}
      actions={
        <>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-50"
          >
            Kembali
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-[#C92C1E] px-4 py-2 text-xs font-black text-white hover:bg-[#A82216]"
          >
            Coba Lagi
          </button>
        </>
      }
    />
  );
}
