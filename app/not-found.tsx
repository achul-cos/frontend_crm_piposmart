"use client";

import Link from "next/link";
import ErrorPageLayout from "@/app/components/feedback/ErrorPageLayout";

export default function NotFound() {
  return (
    <ErrorPageLayout
      title="Halaman tidak ditemukan"
      message="Halaman yang Anda cari tidak tersedia atau sudah dipindahkan."
      cause="Alamat (URL) yang diakses salah, sudah kedaluwarsa, atau halamannya sudah dihapus."
      solution="Periksa kembali alamat yang diketik, atau kembali ke menu utama."
      actions={
        <Link
          href="/"
          className="rounded-xl bg-[#C92C1E] px-4 py-2 text-xs font-black text-white hover:bg-[#A82216]"
        >
          Kembali ke Dashboard
        </Link>
      }
    />
  );
}
