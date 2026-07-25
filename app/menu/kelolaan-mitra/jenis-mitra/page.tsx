"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import JenisMitraFormModal from "./form/page";

type JenisMitraItem = {
  id: string;
  jenisMitra: string;
  paketBerlangganan: string;
  hargaBerlangganan: number;
  komisi: number;
};

type JenisMitraForm = Omit<JenisMitraItem, "id">;

const STORAGE_KEY = "piposmart_master_jenis_mitra";

const PAKET_LANGGANAN = [
  { paketBerlangganan: "Basic (12 Bulan)", hargaBerlangganan: 858000, referal: 120000, partnership: 150000, strategic: 240000 },
  { paketBerlangganan: "Business (12 Bulan)", hargaBerlangganan: 1298000, referal: 180000, partnership: 210000, strategic: 320000 },
  { paketBerlangganan: "Business (18 Bulan)", hargaBerlangganan: 1999000, referal: 270000, partnership: 315000, strategic: 480000 },
  { paketBerlangganan: "Business (24 Bulan)", hargaBerlangganan: 2596000, referal: 360000, partnership: 420000, strategic: 640000 },
  { paketBerlangganan: "Pro (12 Bulan)", hargaBerlangganan: 1688000, referal: 220000, partnership: 250000, strategic: 400000 },
  { paketBerlangganan: "Pro (18 Bulan)", hargaBerlangganan: 2688000, referal: 330000, partnership: 375000, strategic: 600000 },
  { paketBerlangganan: "Pro (24 Bulan)", hargaBerlangganan: 3368000, referal: 440000, partnership: 500000, strategic: 800000 },
];

const defaultJenisMitra: JenisMitraItem[] = PAKET_LANGGANAN.flatMap((paket) => [
  {
    id: `referal-${paket.paketBerlangganan.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    jenisMitra: "Referal",
    paketBerlangganan: paket.paketBerlangganan,
    hargaBerlangganan: paket.hargaBerlangganan,
    komisi: paket.referal,
  },
  {
    id: `partnership-${paket.paketBerlangganan.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    jenisMitra: "Partnership",
    paketBerlangganan: paket.paketBerlangganan,
    hargaBerlangganan: paket.hargaBerlangganan,
    komisi: paket.partnership,
  },
  {
    id: `strategic-${paket.paketBerlangganan.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    jenisMitra: "Strategic",
    paketBerlangganan: paket.paketBerlangganan,
    hargaBerlangganan: paket.hargaBerlangganan,
    komisi: paket.strategic,
  },
]);

const emptyForm: JenisMitraForm = {
  jenisMitra: "",
  paketBerlangganan: "",
  hargaBerlangganan: 0,
  komisi: 0,
};

const formatRupiah = (value: number) => {
  if (!value) return "Rp0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number) => {
  if (!value) return "-";

  return new Intl.NumberFormat("id-ID").format(value);
};

const makeId = (jenisMitra: string, paket: string) => {
  const slug = `${jenisMitra}-${paket}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || `jenis-mitra-${Date.now()}`;
};

const normalizeJenisMitraName = (value: string) => {
  const lower = String(value || "").toLowerCase();

  if (lower.includes("refer")) return "Referal";
  if (lower.includes("partner")) return "Partnership";
  if (lower.includes("strateg")) return "Strategic";

  return value || "Tanpa Nama";
};

const getJenisMitraTableStyle = (jenisMitra: string) => {
  const normalized = normalizeJenisMitraName(jenisMitra).toLowerCase();

  if (normalized.includes("refer")) {
    return {
      borderClass: "border-orange-100",
      headerClass: "border-orange-100 bg-orange-50 text-orange-800",
      titleClass: "text-orange-700",
      totalClass: "text-orange-500",
      valueBoxClass: "border-orange-100 bg-orange-50",
      valueTextClass: "text-orange-700",
    };
  }

  if (normalized.includes("partner")) {
    return {
      borderClass: "border-red-100",
      headerClass: "border-red-100 bg-red-50 text-[#C92C1E]",
      titleClass: "text-[#C92C1E]",
      totalClass: "text-[#C92C1E]",
      valueBoxClass: "border-red-100 bg-red-50",
      valueTextClass: "text-[#C92C1E]",
    };
  }

  if (normalized.includes("strateg")) {
    return {
      borderClass: "border-violet-100",
      headerClass: "border-violet-100 bg-violet-50 text-violet-800",
      titleClass: "text-violet-700",
      totalClass: "text-violet-500",
      valueBoxClass: "border-violet-100 bg-violet-50",
      valueTextClass: "text-violet-700",
    };
  }

  return {
    borderClass: "border-gray-200",
    headerClass: "border-gray-200 bg-gray-50 text-gray-700",
    titleClass: "text-gray-700",
    totalClass: "text-gray-500",
    valueBoxClass: "border-gray-100 bg-gray-50",
    valueTextClass: "text-gray-700",
  };
};

const normalizeJenisMitraData = (items: unknown): JenisMitraItem[] => {
  if (!Array.isArray(items)) return defaultJenisMitra;

  const normalized = items.flatMap((item: any, index: number) => {
    const paketBerlangganan = item.paketBerlangganan || item.paketLangganan || "";
    const hargaBerlangganan = Number(item.hargaBerlangganan || 0);

    if (!paketBerlangganan) return [];

    if (item.jenisMitra || item.komisi) {
      return [
        {
          id: item.id || `${makeId(item.jenisMitra || "jenis-mitra", paketBerlangganan)}-${Date.now()}-${index}`,
          jenisMitra: item.jenisMitra || "Referal",
          paketBerlangganan,
          hargaBerlangganan,
          komisi: Number(item.komisi || 0),
        },
      ];
    }

    const rows: JenisMitraItem[] = [];

    if (Number(item.komisiReferral || 0) > 0) {
      rows.push({
        id: `${item.id || "legacy"}-referal-${index}`,
        jenisMitra: "Referal",
        paketBerlangganan,
        hargaBerlangganan,
        komisi: Number(item.komisiReferral || 0),
      });
    }

    if (Number(item.komisiPartnership || 0) > 0) {
      rows.push({
        id: `${item.id || "legacy"}-partnership-${index}`,
        jenisMitra: "Partnership",
        paketBerlangganan,
        hargaBerlangganan,
        komisi: Number(item.komisiPartnership || 0),
      });
    }

    if (Number(item.komisiStrategic || 0) > 0) {
      rows.push({
        id: `${item.id || "legacy"}-strategic-${index}`,
        jenisMitra: "Strategic",
        paketBerlangganan,
        hargaBerlangganan,
        komisi: Number(item.komisiStrategic || 0),
      });
    }

    return rows;
  });

  return normalized.length ? normalized : defaultJenisMitra;
};

export default function JenisMitraPage() {
  const [jenisMitraData, setJenisMitraData] = useState<JenisMitraItem[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JenisMitraForm>(emptyForm);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);

    if (cached) {
      try {
        const parsed = normalizeJenisMitraData(JSON.parse(cached));
        setJenisMitraData(parsed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      } catch {
        setJenisMitraData(defaultJenisMitra);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultJenisMitra));
      }
    } else {
      setJenisMitraData(defaultJenisMitra);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultJenisMitra));
    }
  }, []);

  const saveJenisMitraData = (nextData: JenisMitraItem[]) => {
    setJenisMitraData(nextData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
  };

  const filteredData = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return jenisMitraData.filter((item) => {
      return (
        keyword === "" ||
        item.jenisMitra.toLowerCase().includes(keyword) ||
        item.paketBerlangganan.toLowerCase().includes(keyword)
      );
    });
  }, [jenisMitraData, search]);

  const groupedJenisMitraData = useMemo(() => {
    const grouped = new Map<string, JenisMitraItem[]>();

    filteredData.forEach((item) => {
      const key = item.jenisMitra.trim() || "Tanpa Nama";
      const existing = grouped.get(key) || [];

      grouped.set(key, [...existing, item]);
    });

    const priority = ["Referal", "Referral", "Partnership", "Strategic"];

    return Array.from(grouped.entries()).sort(([firstName], [secondName]) => {
      const firstPriority = priority.findIndex(
        (item) => item.toLowerCase() === firstName.toLowerCase(),
      );
      const secondPriority = priority.findIndex(
        (item) => item.toLowerCase() === secondName.toLowerCase(),
      );

      const safeFirstPriority = firstPriority === -1 ? 999 : firstPriority;
      const safeSecondPriority = secondPriority === -1 ? 999 : secondPriority;

      if (safeFirstPriority !== safeSecondPriority) {
        return safeFirstPriority - safeSecondPriority;
      }

      return firstName.localeCompare(secondName);
    });
  }, [filteredData]);

  const totalHargaBerlangganan = jenisMitraData.reduce(
    (total, item) => total + Number(item.hargaBerlangganan || 0),
    0,
  );

  const totalKomisi = jenisMitraData.reduce(
    (total, item) => total + Number(item.komisi || 0),
    0,
  );


  const totalKomisiStrategic = jenisMitraData
    .filter((item) => normalizeJenisMitraName(item.jenisMitra) === "Strategic")
    .reduce((total, item) => total + Number(item.komisi || 0), 0);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (item: JenisMitraItem) => {
    setEditingId(item.id);
    setForm({
      jenisMitra: item.jenisMitra,
      paketBerlangganan: item.paketBerlangganan,
      hargaBerlangganan: item.hargaBerlangganan,
      komisi: item.komisi,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSaveForm = (payload: JenisMitraForm) => {
    if (editingId) {
      const nextData = jenisMitraData.map((item) =>
        item.id === editingId
          ? {
              ...item,
              ...payload,
              jenisMitra: payload.jenisMitra.trim(),
              paketBerlangganan: payload.paketBerlangganan.trim(),
            }
          : item,
      );

      saveJenisMitraData(nextData);
      closeModal();
      return;
    }

    const newItem: JenisMitraItem = {
      id: `${makeId(payload.jenisMitra, payload.paketBerlangganan)}-${Date.now()}`,
      ...payload,
      jenisMitra: payload.jenisMitra.trim(),
      paketBerlangganan: payload.paketBerlangganan.trim(),
    };

    saveJenisMitraData([newItem, ...jenisMitraData]);
    closeModal();
  };

  const handleDelete = (id: string) => {
    const yakin = confirm("Yakin ingin menghapus jenis mitra ini?");
    if (!yakin) return;

    saveJenisMitraData(jenisMitraData.filter((item) => item.id !== id));
  };

  const renderActionButtons = (item: JenisMitraItem) => (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => openEditModal(item)}
        className="text-gray-600 transition hover:scale-110 hover:text-[#C92C1E]"
        title="Edit jenis mitra"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => handleDelete(item.id)}
        className="text-gray-500 transition hover:scale-110 hover:text-red-600"
        title="Hapus jenis mitra"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );

  const renderTable = ({
    title,
    description,
    total,
    data,
    borderClass,
    headerClass,
    titleClass,
    totalClass,
    valueBoxClass,
    valueTextClass,
    tableKey,
  }: {
    title: string;
    description: string;
    total: number;
    data: JenisMitraItem[];
    borderClass: string;
    headerClass: string;
    titleClass: string;
    totalClass: string;
    valueBoxClass: string;
    valueTextClass: string;
    tableKey?: string;
  }) => (
    <div key={tableKey} className={`overflow-hidden rounded-3xl border bg-white ${borderClass}`}>
      <div className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${headerClass}`}>
        <div>
          <h3 className={`text-sm font-black ${titleClass}`}>{title}</h3>
          <p className="mt-1 text-xs font-bold opacity-70">{description}</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-2 text-right">
          <p className={`text-[10px] font-black uppercase ${totalClass}`}>Total</p>
          <p className={`text-sm font-black ${titleClass}`}>{formatRupiah(total)}</p>
        </div>
      </div>

      <div className="w-full max-w-full overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className={headerClass}>
            <tr>
              <th className="w-36 p-3 font-black">Jenis Mitra</th>
              <th className="w-52 p-3 font-black">Paket Langganan</th>
              <th className="w-32 p-3 text-right font-black">Harga</th>
              <th className="w-32 p-3 text-right font-black">Komisi</th>
              <th className="w-24 p-3 text-center font-black">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-xs font-bold text-gray-400">
                  Data jenis mitra tidak ditemukan.
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="p-3 align-top font-black text-gray-900">{item.jenisMitra}</td>
                  <td className="p-3 align-top font-bold text-gray-700">{item.paketBerlangganan}</td>
                  <td className="p-3 text-right align-top font-black text-gray-900">{formatNumber(item.hargaBerlangganan)}</td>
                  <td className="p-3 text-right align-top">
                    <div className={`ml-auto inline-flex min-w-[115px] justify-end rounded-2xl border px-4 py-3 font-black ${valueBoxClass} ${valueTextClass}`}>
                      {formatNumber(item.komisi)}
                    </div>
                  </td>
                  <td className="p-3 text-center align-top">{renderActionButtons(item)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-hidden font-sans text-[#1C1C1E]">
      <section className="overflow-hidden rounded-3xl border border-red-100 bg-white shadow-sm">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-[80px] bg-red-50" />

          <div className="relative z-10 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                Master Jenis Mitra
              </div>
              <h1 className="mt-4 break-words text-2xl font-black tracking-tight text-gray-950 md:text-3xl">
                Jenis-Jenis Mitra & Paket Komisi
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-gray-500">
                Tambah jenis mitra seperti Referal, Partnership, atau Strategic. Paket, bulan, dan harga mengikuti Paket Langganan.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:shrink-0">
              <Link
                href="/menu/kelolaan-mitra"
                className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-center text-xs font-black text-[#C92C1E] transition hover:bg-red-100"
              >
                Kembali ke Menu
              </Link>

              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white shadow-sm transition hover:bg-[#A82216]"
              >
                + Tambah Jenis Mitra
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Data</p>
          <p className="mt-3 text-3xl font-black text-gray-950">{jenisMitraData.length}</p>
          <p className="mt-1 text-xs font-medium text-gray-400">Jumlah data jenis mitra</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Harga Paket</p>
          <p className="mt-3 text-2xl font-black text-gray-950">{formatRupiah(totalHargaBerlangganan)}</p>
          <p className="mt-1 text-xs font-medium text-gray-400">Akumulasi harga paket</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Komisi</p>
          <p className="mt-3 text-2xl font-black text-gray-950">{formatRupiah(totalKomisi)}</p>
          <p className="mt-1 text-xs font-medium text-gray-400">Akumulasi semua komisi</p>
        </div>

        <div className="rounded-3xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">Strategic</p>
          <p className="mt-3 text-2xl font-black text-[#C92C1E]">{formatRupiah(totalKomisiStrategic)}</p>
          <p className="mt-1 text-xs font-medium text-red-400">Akumulasi strategic</p>
        </div>
      </section>

      <section className="min-w-0 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-black text-gray-900">Tabel Komisi Terpisah</h2>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Tabel otomatis mengikuti nama jenis mitra yang dibuat.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 xl:w-[420px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari jenis mitra / paket"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5">
          {groupedJenisMitraData.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-xs font-bold text-gray-400">
              Data jenis mitra tidak ditemukan.
            </div>
          ) : (
            groupedJenisMitraData.map(([jenisMitra, data]) => {
              const style = getJenisMitraTableStyle(jenisMitra);

              return renderTable({
                tableKey: jenisMitra,
                title: `Komisi ${jenisMitra}`,
                description: `Tabel khusus nominal ${jenisMitra} setiap paket.`,
                total: data.reduce((total, item) => total + Number(item.komisi || 0), 0),
                data,
                ...style,
              });
            })
          )}
        </div>
      </section>

      <JenisMitraFormModal
        open={isModalOpen}
        mode={editingId ? "edit" : "create"}
        initialForm={form}
        onClose={closeModal}
        onSave={handleSaveForm}
      />
    </div>
  );
}