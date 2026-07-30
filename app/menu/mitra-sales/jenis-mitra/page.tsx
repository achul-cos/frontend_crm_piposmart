"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { listPartnerTypes, type PartnerTypeItem } from "@/app/lib/api";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

function formatMoney(value?: string | number | null) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatCommission(item?: PartnerTypeItem | null) {
  if (!item) return "-";

  const value = Number(item.commission_value || 0);

  return item.commission_mode === "PERCENTAGE"
    ? `${value}%`
    : formatMoney(value);
}

export default function MitraSalesJenisMitraPage() {
  usePageTitle("Jenis Mitra Sales");

  const [partnerTypes, setPartnerTypes] = useState<PartnerTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setPageError("");

      try {
        const result = await listPartnerTypes();

        if (cancelled) return;

        setPartnerTypes(result.items || []);
      } catch (error) {
        if (!cancelled) {
          setPageError(getErrorMessage(error));
          setPartnerTypes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return partnerTypes;

    return partnerTypes.filter((item) =>
      [
        item.code,
        item.name,
        item.description || "",
        item.commission_mode,
        item.commission_value,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [partnerTypes, search]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <Link
                href="/menu/mitra-sales"
                className="transition hover:text-[#C92C1E]"
              >
                Mitra Sales
              </Link>
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-[#C92C1E]">Jenis Mitra</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Referensi Jenis Mitra
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Sales dapat melihat jenis mitra dan komisi dasar sebagai referensi
              saat membuat mitra.
            </p>
          </div>

          <Link
            href="/menu/mitra-sales"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-center text-sm font-bold text-gray-600 transition hover:bg-gray-50 hover:text-[#C92C1E]"
          >
            Kembali
          </Link>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {pageError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">
            Total Jenis Mitra
          </p>
          <h2 className="text-3xl font-black">{partnerTypes.length}</h2>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Data Ditampilkan
          </p>
          <h2 className="text-3xl font-black text-gray-900">
            {filteredItems.length}
          </h2>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/50 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-gray-900">
              Daftar Jenis Mitra
            </p>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Halaman ini read-only untuk Sales.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari jenis mitra"
            className="w-full rounded-lg border border-gray-200 bg-[#FAFAFA] px-3 py-2 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 md:max-w-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 p-4">
          {loading ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
              Memuat jenis mitra...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-8 text-center text-sm font-bold text-gray-500">
              Jenis mitra tidak ditemukan.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-black text-gray-900">{item.name}</p>
                    <p className="mt-1 text-xs font-bold text-gray-400">
                      {item.code}
                    </p>
                  </div>

                  <Link
                    href={`/menu/mitra-sales/jenis-mitra/${item.id}`}
                    className="w-max rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-600 transition hover:bg-blue-100"
                  >
                    Detail
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                      Mode
                    </p>
                    <p className="mt-1 text-sm font-black text-gray-900">
                      {item.commission_mode || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                      Komisi Dasar
                    </p>
                    <p className="mt-1 text-sm font-black text-gray-900">
                      {formatCommission(item)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                      Deskripsi
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-600">
                      {item.description || "Belum ada deskripsi."}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}