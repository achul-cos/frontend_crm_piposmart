"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface NasabahItem {
  totalFu: number;
  tanggalFu: string;
  tahun: string;
  bulan: string;
  no: number;
  pic: string;
  tanggalDibagikan: string;
  statusAkun: string;
  kodeBaris: string;
  kodeOwner: string;
  namaOwner: string;
  projectBrand: string;
  outlet: string;
  noHpOwner: string;
  noHpOutlet: string;
  createDateProject: string;
  expiredDate: string;
  totalTransaksi: number;
  scor: number;
  callStatus: string;
  chatStatus: string;
  validitas: string;
  remarks: string;
  sumberNasabah: string;
  finalisasiClosing: string;
  skemaId?: string;
  nominal: number;
  noted: string;
}

const LIST_SKOR = [
  { value: "0", label: "Tidak Potensial (0)" },
  { value: "1", label: "Kemungkinan Potensial (1)" },
  { value: "2", label: "Potensial (2)" },
  { value: "3", label: "Langganan (3)" },
];

const EmptyValue = ({ children }: { children?: React.ReactNode }) => (
  <span className="text-gray-400">{children || "-"}</span>
);

const InfoField = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</p>
    <div className={`mt-1 text-sm font-bold text-gray-800 ${mono ? "font-mono" : ""}`}>
      {value || <EmptyValue />}
    </div>
  </div>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="border-b border-gray-100 pb-3">
    <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">{title}</h2>
    <p className="mt-0.5 text-[11px] font-medium text-gray-400">{subtitle}</p>
  </div>
);

const UserIcon = () => (
  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a1.125 1.125 0 00-1.173.417l-.97 1.293a1.125 1.125 0 01-1.21.38 12.035 12.035 0 01-7.143-7.143 1.125 1.125 0 01.38-1.21l1.293-.97a1.125 1.125 0 00.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25m10.5-2.25v2.25M3.75 8.25h16.5m-16.5 0A2.25 2.25 0 016 6h12a2.25 2.25 0 012.25 2.25m-16.5 0v9.75A2.25 2.25 0 006 20.25h12a2.25 2.25 0 002.25-2.25V8.25" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
  </svg>
);

function formatTgl(str?: string) {
  if (!str || str.trim() === "") return "-";
  if (str.includes("-")) {
    const parts = str.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return str;
}

function formatRupiah(value?: number) {
  if (!value || value === 0) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getSkorKey(item: NasabahItem) {
  const remarks = String(item.remarks ?? "").trim();
  if (["0", "1", "2", "3"].includes(remarks)) return remarks;
  const scor = String(item.scor ?? "0");
  if (["0", "1", "2", "3"].includes(scor)) return scor;
  return "0";
}

function getSkorLabel(item: NasabahItem) {
  return LIST_SKOR.find((row) => row.value === getSkorKey(item))?.label || "Tidak Potensial (0)";
}

function getSkorBadgeClass(item: NasabahItem) {
  const key = getSkorKey(item);
  if (key === "3") return "bg-blue-100 text-blue-700 border-blue-200";
  if (key === "2") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (key === "1") return "bg-orange-100 text-orange-800 border-orange-200";
  return "bg-red-100 text-red-700 border-red-200";
}

export default function DeskripsiCustomerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [customers, setCustomers] = useState<NasabahItem[]>([]);

  useEffect(() => {
    const cached = localStorage.getItem("piposmart_nasabah_data");
    if (!cached) {
      setCustomers([]);
      return;
    }

    try {
      const parsed = JSON.parse(cached);
      setCustomers(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCustomers([]);
    }
  }, []);

  const selectedCustomer = useMemo(() => {
    if (!id) return null;
    return customers.find((item) => String(item.no) === String(id)) || null;
  }, [customers, id]);

  return (
    <div className="space-y-6 p-4 font-sans text-[#1C1C1E]">
      <div className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Deskripsi Customer</h1>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Halaman ini menampilkan detail profil dan scoring customer yang dipilih.
          </p>
        </div>

        <button
          onClick={() => router.push("/menu/data-kelolaan")}
          className="w-fit rounded-xl bg-[#C92C1E] px-4 py-2 text-xs font-black text-white hover:bg-[#A82216]"
        >
          ← Kembali ke Data Kelolaan
        </button>
      </div>

      {selectedCustomer ? (
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-[#C92C1E] shadow-sm">
                  <UserIcon />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                    Customer Detail
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-gray-900">
                    {selectedCustomer.namaOwner || "-"}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-gray-500">
                    {selectedCustomer.outlet || selectedCustomer.projectBrand || "Outlet belum diisi"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-gray-700 shadow-sm">
                      Owner: {selectedCustomer.kodeOwner || "-"}
                    </span>
                    <span className="rounded-full bg-[#C92C1E] px-3 py-1 text-[11px] font-black text-white shadow-sm">
                      PIC {selectedCustomer.pic || "-"}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-black shadow-sm ${getSkorBadgeClass(selectedCustomer)}`}>
                      {getSkorLabel(selectedCustomer)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 md:w-[360px]">
                <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase text-gray-400">Total FU</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">{selectedCustomer.totalFu || 0}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase text-gray-400">Total Transaksi</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">{selectedCustomer.totalTransaksi || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-2">
            <div className="space-y-4">
              <SectionTitle
                title="Profil Customer"
                subtitle="Informasi utama customer sesuai data kelolaan."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoField label="Kode Owner" value={selectedCustomer.kodeOwner} mono />
                <InfoField label="Kode Baris" value={selectedCustomer.kodeBaris} mono />
                <InfoField label="Nama Owner" value={selectedCustomer.namaOwner} />
                <InfoField label="Nama Outlet" value={selectedCustomer.outlet || selectedCustomer.projectBrand} />
                <InfoField label="Project / Brand" value={selectedCustomer.projectBrand} />
                <InfoField label="PIC Sales" value={selectedCustomer.pic} />
                <InfoField
                  label="No. HP Owner"
                  value={
                    selectedCustomer.noHpOwner ? (
                      <span className="inline-flex items-center gap-1.5">
                        <PhoneIcon />
                        {selectedCustomer.noHpOwner}
                      </span>
                    ) : (
                      <EmptyValue />
                    )
                  }
                  mono
                />
                <InfoField
                  label="No. HP Outlet"
                  value={
                    selectedCustomer.noHpOutlet ? (
                      <span className="inline-flex items-center gap-1.5">
                        <PhoneIcon />
                        {selectedCustomer.noHpOutlet}
                      </span>
                    ) : (
                      <EmptyValue />
                    )
                  }
                  mono
                />
                <InfoField label="Status Akun" value={selectedCustomer.statusAkun} />
                <InfoField label="Sumber Nasabah" value={selectedCustomer.sumberNasabah} />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Catatan Customer
                </p>
                <p className="mt-2 min-h-20 whitespace-pre-wrap text-sm font-medium text-gray-700">
                  {selectedCustomer.noted || "Belum ada catatan khusus untuk customer ini."}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <SectionTitle
                title="Scoring Customer"
                subtitle="Detail status komunikasi, validitas, skor, dan closing."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoField
                  label="Tanggal FU"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarIcon />
                      {formatTgl(selectedCustomer.tanggalFu)}
                    </span>
                  }
                />
                <InfoField
                  label="Tanggal Dibagikan"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarIcon />
                      {formatTgl(selectedCustomer.tanggalDibagikan)}
                    </span>
                  }
                />
                <InfoField
                  label="Create Date Project"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarIcon />
                      {formatTgl(selectedCustomer.createDateProject)}
                    </span>
                  }
                />
                <InfoField
                  label="Expired Date"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarIcon />
                      {formatTgl(selectedCustomer.expiredDate)}
                    </span>
                  }
                />
                <InfoField label="Total Transaksi" value={selectedCustomer.totalTransaksi || 0} />
                <InfoField
                  label="Skor"
                  value={
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${getSkorBadgeClass(selectedCustomer)}`}>
                      {getSkorLabel(selectedCustomer)}
                    </span>
                  }
                />
                <InfoField label="Call Status" value={selectedCustomer.callStatus} />
                <InfoField label="Chat Status" value={selectedCustomer.chatStatus} />
                <InfoField label="Validitas" value={selectedCustomer.validitas} />
                <InfoField label="Finalisasi Paket" value={selectedCustomer.finalisasiClosing || "Tanpa Paket"} />
                <InfoField label="Skema ID" value={selectedCustomer.skemaId} mono />
                <InfoField label="Nominal Closing" value={formatRupiah(selectedCustomer.nominal)} mono />
              </div>
            </div>
          </div>

          <div className="border-t p-5">
            <Link
              href={`/menu/data-kelolaan/form?id=${selectedCustomer.no}`}
              className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-[#C92C1E] hover:bg-red-100"
            >
              <EditIcon />
              Edit Full Form
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-orange-100 bg-orange-50/60 p-5">
          <p className="text-sm font-black text-orange-800">
            Belum ada customer yang dipilih.
          </p>
          <p className="mt-1 text-xs font-medium text-orange-700/80">
            Klik salah satu baris customer di halaman Data Kelolaan untuk melihat detail customer di sini.
          </p>
        </section>
      )}
    </div>
  );
}