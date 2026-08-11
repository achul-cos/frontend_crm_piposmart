"use client";

import ErrorPageLayout from "@/app/components/feedback/ErrorPageLayout";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const technicalDetails = [error.message, error.digest ? `digest: ${error.digest}` : null]
    .filter(Boolean)
    .join("\n");

  return (
    <html lang="id">
      <body className="antialiased">
        <ErrorPageLayout
          title="Aplikasi mengalami kesalahan"
          message="Terjadi masalah yang tidak terduga dan aplikasi tidak dapat menampilkan halaman ini."
          cause="Bisa disebabkan oleh koneksi yang tidak stabil atau gangguan sementara pada sistem."
          solution="Coba muat ulang aplikasi. Jika masalah berlanjut, hubungi tim support dengan detail teknis di bawah."
          technicalDetails={technicalDetails || undefined}
          actions={
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-xl bg-[#C92C1E] px-4 py-2 text-xs font-black text-white hover:bg-[#A82216]"
            >
              Coba Lagi
            </button>
          }
        />
      </body>
    </html>
  );
}
