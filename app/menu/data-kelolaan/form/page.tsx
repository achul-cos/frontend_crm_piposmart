"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

const LIST_PIC = ["Satria", "Lydia", "Laura", "Fenya", "Sales A", "Sales B", "Sales C"];

const getToday = () => new Date().toISOString().split("T")[0];


function FieldIcon({ type }: { type: "code" | "user" | "brand" | "outlet" | "phone" | "sales" }) {
  const className = "h-4 w-4 text-[#C92C1E]";

  if (type === "code") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 12h6m-6 5h10M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
      </svg>
    );
  }

  if (type === "user") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
      </svg>
    );
  }

  if (type === "brand") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 21V8.25A2.25 2.25 0 016.75 6h10.5a2.25 2.25 0 012.25 2.25V21M8.25 6V3.75h7.5V6M8.25 11.25h.008M12 11.25h.008M15.75 11.25h.008M8.25 15h.008M12 15h.008M15.75 15h.008" />
      </svg>
    );
  }

  if (type === "outlet") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 4l7.5 6.5M6.75 9.5V20.25h10.5V9.5M9.75 20.25v-6h4.5v6" />
      </svg>
    );
  }

  if (type === "phone") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372a1.125 1.125 0 00-.852-1.091l-4.423-1.106a1.125 1.125 0 00-1.173.417l-.97 1.293a1.125 1.125 0 01-1.21.38 12.035 12.035 0 01-7.143-7.143 1.125 1.125 0 01.38-1.21l1.293-.97a1.125 1.125 0 00.417-1.173L6.963 3.102A1.125 1.125 0 005.872 2.25H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    );
  }

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM3.75 21a8.25 8.25 0 0116.5 0M18.75 8.25h2.25M19.875 7.125v2.25" />
    </svg>
  );
}


export default function FormInputDummyPage() {
  const router = useRouter();
  const [editId, setEditId] = useState<number | null>(null);

  const [formInput, setFormInput] = useState<Partial<NasabahItem>>({
    kodeOwner: "",
    namaOwner: "",
    projectBrand: "",
    outlet: "",
    noHpOwner: "",
    noHpOutlet: "",
    pic: "Satria",

    // Default data agar struktur lama tetap aman
    totalFu: 0,
    tanggalFu: "",
    tahun: "2026",
    bulan: "Juni",
    tanggalDibagikan: "",
    statusAkun: "Akun Baru",
    kodeBaris: "",
    createDateProject: "",
    expiredDate: "",
    totalTransaksi: 0,
    scor: 0,
    callStatus: "PENDING",
    chatStatus: "PENDING",
    validitas: "VALID",
    remarks: "0",
    sumberNasabah: "Instagram",
    finalisasiClosing: "",
    skemaId: "",
    nominal: 0,
    noted: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");

    if (!idParam) return;

    const targetNo = Number(idParam);
    setEditId(targetNo);

    const cached = localStorage.getItem("piposmart_nasabah_data");
    if (!cached) return;

    try {
      const list: NasabahItem[] = JSON.parse(cached);
      const matchItem = list.find((item) => item.no === targetNo);

      if (matchItem) {
        setFormInput(matchItem);
      }
    } catch {
      setFormInput((prev) => prev);
    }
  }, []);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    setFormInput((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveData = (event: React.FormEvent) => {
    event.preventDefault();

    if (!formInput.kodeOwner || !formInput.namaOwner) {
      alert("Kode Owner dan Nama Owner wajib diisi.");
      return;
    }

    const cached = localStorage.getItem("piposmart_nasabah_data");
    let currentList: NasabahItem[] = [];

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        currentList = Array.isArray(parsed) ? parsed : [];
      } catch {
        currentList = [];
      }
    }

    if (editId !== null) {
      currentList = currentList.map((item) =>
        item.no === editId
          ? {
              ...item,
              kodeOwner: formInput.kodeOwner || "",
              namaOwner: formInput.namaOwner || "",
              projectBrand: formInput.projectBrand || "",
              outlet: formInput.outlet || "",
              noHpOwner: formInput.noHpOwner || "",
              noHpOutlet: formInput.noHpOutlet || "",
              pic: formInput.pic || "Satria",
            }
          : item,
      );

      alert("Data profil berhasil diperbarui.");
    } else {
      const nextNo =
        currentList.length > 0
          ? Math.max(...currentList.map((item) => Number(item.no) || 0)) + 1
          : 1;

      const itemBaru: NasabahItem = {
        totalFu: 0,
        tanggalFu: "",
        tahun: "2026",
        bulan: "Juni",
        no: nextNo,
        pic: formInput.pic || "Satria",
        tanggalDibagikan: getToday(),
        statusAkun: "Akun Baru",
        kodeBaris: "",
        kodeOwner: formInput.kodeOwner || "",
        namaOwner: formInput.namaOwner || "",
        projectBrand: formInput.projectBrand || "",
        outlet: formInput.outlet || "",
        noHpOwner: formInput.noHpOwner || "",
        noHpOutlet: formInput.noHpOutlet || "",
        createDateProject: getToday(),
        expiredDate: "",
        totalTransaksi: 0,
        scor: 0,
        callStatus: "PENDING",
        chatStatus: "PENDING",
        validitas: "VALID",
        remarks: "0",
        sumberNasabah: "Instagram",
        finalisasiClosing: "",
        skemaId: "",
        nominal: 0,
        noted: "",
      };

      currentList.push(itemBaru);
      alert("Data profil berhasil ditambahkan.");
    }

    localStorage.setItem("piposmart_nasabah_data", JSON.stringify(currentList));
    router.push("/menu/data-kelolaan");
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 font-sans text-[#1C1C1E]">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-gray-900">
            <svg
              className="h-5 w-5 text-[#C92C1E]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {editId !== null ? "Edit Profil Customer" : "Tambah Profil Customer"}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Form ini hanya mengisi data utama customer. Bagian scoring sudah dihapus.
          </p>
        </div>

        <Link
          href="/menu/data-kelolaan"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-700 shadow-sm transition hover:border-[#C92C1E]/30 hover:bg-red-50 hover:text-[#C92C1E]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span>Kembali</span>
        </Link>
      </div>

      <form
        onSubmit={handleSaveData}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-xs"
      >
        <div className="space-y-3 rounded-xl border border-red-100 bg-red-50/30 p-4">
          <span className="block text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
            Data Profil Customer
          </span>

          <div className="grid grid-cols-1 gap-3">
            <FormInput
              label="Kode Owner *"
              icon="code"
              name="kodeOwner"
              value={formInput.kodeOwner || ""}
              onChange={handleInputChange}
              placeholder="Contoh: 18907"
            />

            <FormInput
              label="Nama Owner *"
              icon="user"
              name="namaOwner"
              value={formInput.namaOwner || ""}
              onChange={handleInputChange}
              placeholder="Contoh: Amanda Artha"
            />

            <FormInput
              label="Nama Brand"
              icon="brand"
              name="projectBrand"
              value={formInput.projectBrand || ""}
              onChange={handleInputChange}
              placeholder="Contoh: Azzahra Laundry"
            />

            <FormInput
              label="Nama Outlet"
              icon="outlet"
              name="outlet"
              value={formInput.outlet || ""}
              onChange={handleInputChange}
              placeholder="Contoh: Azzahra Laundry Cabang 1"
            />

            <FormInput
              label="Nomor Telepon Owner"
              icon="phone"
              name="noHpOwner"
              value={formInput.noHpOwner || ""}
              onChange={handleInputChange}
              placeholder="Contoh: 08524026xxxx"
            />

            <FormInput
              label="Nomor Telepon Outlet"
              icon="phone"
              name="noHpOutlet"
              value={formInput.noHpOutlet || ""}
              onChange={handleInputChange}
              placeholder="Contoh: 08225247xxxx"
            />

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
                <FieldIcon type="sales" />
                PIC Sales
              </label>
              <select
                name="pic"
                value={formInput.pic || "Satria"}
                onChange={handleInputChange}
                className="w-full cursor-pointer rounded-xl border bg-white p-2.5 text-xs font-black text-[#C92C1E] focus:outline-none focus:border-[#C92C1E]"
              >
                {LIST_PIC.map((pic) => (
                  <option key={pic} value={pic}>
                    {pic}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="text-[11px] font-medium text-gray-400">
            Data scoring dapat diubah langsung dari dropdown scoring di tabel.
          </div>

          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-[#C92C1E] px-6 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216]"
          >
            {editId !== null ? "Simpan Perubahan" : "Tambah Customer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  icon = "code",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: "code" | "user" | "brand" | "outlet" | "phone" | "sales";
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
        <FieldIcon type={icon} />
        {label}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border bg-white p-2.5 text-xs font-bold focus:outline-none focus:border-[#C92C1E]"
      />
    </div>
  );
}