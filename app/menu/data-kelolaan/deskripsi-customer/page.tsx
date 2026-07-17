"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type CallHistoryItem = {
  waktuCall: string;
  picSales: string;
  remark: string;
  conclusion?: string;
};

type TrainingHistoryItem = {
  waktuTraining: string;
  lokasiTraining: string;
};

type PurchaseHistoryItem = {
  paket: string;
  waktuMulai: string;
  waktuBerakhir: string;
  hargaAktual: number;
};

type NasabahItem = {
  no?: number;
  kodeOwner?: string;
  namaOwner?: string;
  projectBrand?: string;
  outlet?: string;
  noHpOwner?: string;
  noHpOutlet?: string;
  sumberCustomer?: string;
  pic?: string;
  remarks?: string;
  scor?: number;
  statusAkun?: string;
  kodeMitra?: string;
  namaMitra?: string;
  ownerMitra?: string;
  kategoriMitra?: string;
  tanggalFu?: string;
  totalFu?: number;
  noted?: string;
  callStatus?: string;
  chatStatus?: string;
  callHistories?: CallHistoryItem[];
  trainingSessions?: string[];
  trainingHistories?: TrainingHistoryItem[];
  salesPlan?: {
    packageType: string;
    durationMonth: number;
    packagePrice: number;
    transferCode: number;
    discount: number;
    actualSale: number;
  };
  purchaseHistories?: PurchaseHistoryItem[];
};

const FALLBACK_CUSTOMER: NasabahItem = {
  no: 1,
  kodeOwner: "#1111",
  namaOwner: "Nama Customer",
  projectBrand: "Nama Brand",
  outlet: "Nama outlet",
  noHpOwner: "08123956789",
  noHpOutlet: "08123456789",
  sumberCustomer: "Tiktok",
  pic: "Sales B",
  remarks: "3",
  scor: 3,
  statusAkun: "Berlangganan",
  kodeMitra: "#1423",
  namaMitra: "PT. Cuci Baju Sentosa",
  ownerMitra: "Wati Wati",
  kategoriMitra: "Mitra Referral",
  tanggalFu: "30 Jul 2026, 16.30 WIB",
  totalFu: 4,
  callHistories: [],
  trainingHistories: [],
  purchaseHistories: [],
};

const getRemarkLabel = (item: NasabahItem) => {
  const value = String(item.remarks ?? item.scor ?? "0");

  if (value === "3") return "Langganan (3)";
  if (value === "2") return "Potensial (2)";
  if (value === "1") return "Kemungkinan Potensial (1)";

  return "Tidak Potensial (0)";
};

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const getToneClass = (text: string) => {
  const lower = text.toLowerCase();

  if (lower.includes("(0)") || lower.includes("tidak")) {
    return "border-red-100 bg-red-100 text-red-700";
  }

  if (lower.includes("(1)") || lower.includes("incoming")) {
    return "border-yellow-100 bg-yellow-100 text-yellow-800";
  }

  if (lower.includes("(2)") || lower.includes("trial") || lower.includes("offline")) {
    return "border-blue-100 bg-blue-100 text-blue-700";
  }

  if (lower.includes("(3)") || lower.includes("berlangganan") || lower.includes("online")) {
    return "border-emerald-100 bg-emerald-100 text-emerald-700";
  }

  if (lower.includes("business")) {
    return "border-yellow-100 bg-yellow-100 text-yellow-800";
  }

  return "border-gray-100 bg-gray-100 text-gray-700";
};

const normalizePhone = (phone?: string) => {
  const digitsOnly = String(phone || "").replace(/\D/g, "");

  if (!digitsOnly) return "";
  if (digitsOnly.startsWith("0")) return `62${digitsOnly.slice(1)}`;
  if (digitsOnly.startsWith("62")) return digitsOnly;

  return digitsOnly;
};

const openWhatsApp = (phone?: string) => {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    alert("Nomor belum tersedia.");
    return;
  }

  window.open(`https://wa.me/${normalizedPhone}`, "_blank", "noopener,noreferrer");
};

const UserAvatarIcon = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0"
    />
  </svg>
);







const ChatBubbleIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h5.25M21 12c0 4.142-4.03 7.5-9 7.5a10.7 10.7 0 01-3.58-.61L3 20.25l1.58-4.11A6.93 6.93 0 013 12c0-4.142 4.03-7.5 9-7.5s9 3.358 9 7.5z" />
  </svg>
);

function InfoInput({
  label,
  value,
  action,
}: {
  label: string;
  value?: string;
  action?: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-wide text-gray-500">
        {label}
      </span>

      <div className="flex gap-2">
        <input
          value={value || "-"}
          readOnly
          className="min-w-0 flex-1 rounded-lg border border-red-100 bg-white px-2.5 py-2 text-[11px] font-bold text-gray-700 outline-none"
        />

        {action}
      </div>
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black ${getToneClass(
        String(children),
      )}`}
    >
      {children}
      <span className="ml-1 text-[10px]">⌄</span>
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 border-t border-red-100 pt-4 text-center">
      <h2 className="text-lg font-black tracking-tight text-[#C92C1E]">
        {children}
      </h2>
    </div>
  );
}

function Timeline({
  items,
  color = "emerald",
}: {
  items: string[];
  color?: "emerald" | "orange";
}) {
  const lineColor = color === "orange" ? "border-orange-400" : "border-emerald-400";

  return (
    <div className="relative ml-1 space-y-0">
      <div className={`absolute left-[6px] top-4 h-[calc(100%-16px)] border-l-2 border-dotted ${lineColor}`} />

      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className="relative z-10 flex min-h-8 items-center gap-2.5 text-[11px] font-black text-gray-700"
        >
          <span className="h-3.5 w-3.5 rounded-full border-2 border-emerald-500 bg-yellow-100" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function DeskripsiLanggananPage() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");
  const [customer, setCustomer] = useState<NasabahItem>(FALLBACK_CUSTOMER);
  const [showAllComments, setShowAllComments] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<NasabahItem>(FALLBACK_CUSTOMER);

  useEffect(() => {
    const cached = localStorage.getItem("piposmart_nasabah_data");

    if (!cached) return;

    try {
      const parsed = JSON.parse(cached);
      const listData: NasabahItem[] = Array.isArray(parsed) ? parsed : [];
      const selectedCustomer =
        listData.find((item) => String(item.no) === String(customerId)) || listData[0];

      if (selectedCustomer) {
        setCustomer({
          ...FALLBACK_CUSTOMER,
          ...selectedCustomer,
        });
      }
    } catch {
      setCustomer(FALLBACK_CUSTOMER);
    }
  }, [customerId]);

  const callHistories = useMemo(() => {
    return customer.callHistories || [];
  }, [customer]);

  const visibleCallComments = showAllComments
    ? callHistories.slice().reverse()
    : callHistories.slice().reverse().slice(0, 3);

  const trainingHistories = useMemo(() => {
    if (customer.trainingHistories?.length) return customer.trainingHistories;

    if (customer.trainingSessions?.length) {
      return customer.trainingSessions.map((session) => {
        const [lokasiTraining, ...dateParts] = session.split(",");

        return {
          lokasiTraining: lokasiTraining?.trim() || "-",
          waktuTraining: dateParts.join(",").trim() || "-",
        };
      });
    }

    return [];
  }, [customer]);

  const purchaseHistories = useMemo(() => {
    if (customer.purchaseHistories?.length) return customer.purchaseHistories;

    if (customer.salesPlan) {
      return [
        {
          paket: customer.salesPlan.packageType || "Business",
          waktuMulai: "17 Juni 2026",
          waktuBerakhir: "17 Desember 2026",
          hargaAktual: customer.salesPlan.actualSale || 0,
        },
      ];
    }

    return [];
  }, [customer]);

  const openEditModal = () => {
    setEditCustomer(customer);
    setIsEditOpen(true);
  };

  const updateEditField = <K extends keyof NasabahItem>(
    field: K,
    value: NasabahItem[K],
  ) => {
    setEditCustomer((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = () => {
    const nextCustomer = {
      ...customer,
      ...editCustomer,
    };

    setCustomer(nextCustomer);

    const cached = localStorage.getItem("piposmart_nasabah_data");

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const listData: NasabahItem[] = Array.isArray(parsed) ? parsed : [];
        const nextData = listData.map((item) =>
          String(item.no) === String(nextCustomer.no) ? nextCustomer : item,
        );

        localStorage.setItem("piposmart_nasabah_data", JSON.stringify(nextData));
      } catch {
        localStorage.setItem("piposmart_nasabah_data", JSON.stringify([nextCustomer]));
      }
    } else {
      localStorage.setItem("piposmart_nasabah_data", JSON.stringify([nextCustomer]));
    }

    setIsEditOpen(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 rounded-[28px] border border-red-100 bg-[#FFF8F6] p-4 text-gray-900 shadow-sm">
      <section className="flex flex-col gap-4 rounded-2xl border border-red-100 bg-white p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-[#C92C1E]">
            <UserAvatarIcon className="h-7 w-7" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black uppercase tracking-tight">
              {customer.namaOwner || "Nama Customer"}
            </h1>
            <p className="mt-1 text-base font-black text-gray-600">
              {customer.outlet || "Nama outlet"}
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="rounded-lg border border-red-100 bg-red-50/40 px-2.5 py-1.5 text-[11px] font-black">
                kode owner : <span className="text-[#C92C1E]">{customer.kodeOwner || "#1111"}</span>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50/40 px-2.5 py-1.5 text-[11px] font-black">
                PIC Sales : <span className="text-[#C92C1E]">{customer.pic || "Nama PIC"}</span>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50/40 px-2.5 py-1.5 text-[11px] font-black">
                Mitra : <span className="text-[#C92C1E]">{customer.kategoriMitra || "tampilkan jika ada"}</span>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50/40 px-2.5 py-1.5 text-[11px] font-black">
                skor customer : <span className="text-[#C92C1E]">{getRemarkLabel(customer)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={openEditModal}
            className="cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-xs font-black text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
          >
            Edit
          </button>
          <button
            onClick={() => openWhatsApp(customer.noHpOwner || customer.noHpOutlet)}
            className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-xs font-black text-emerald-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
          >
            Call 📞
          </button>
        </div>
      </section>

      <SectionTitle>Detail Customer</SectionTitle>

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-red-100 bg-white p-4 lg:grid-cols-2">
        <InfoInput label="Kode Owner" value={customer.kodeOwner || "#1111"} />
        <InfoInput label="Nama Owner" value={customer.namaOwner || "Nama Customer"} />
        <InfoInput
          label="Nomor Handphone Owner"
          value={customer.noHpOwner || "08123956789"}
          action={
            <button
              onClick={() => openWhatsApp(customer.noHpOwner)}
              className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-100 px-3 text-[10px] font-black text-emerald-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-200 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
            >
              hubungi 📞
            </button>
          }
        />
        <InfoInput label="Nama Brand" value={customer.projectBrand || "Nama Brand"} />
        <InfoInput label="Nama Outlet" value={customer.outlet || "Nama Outlet"} />
        <InfoInput
          label="Nomor Handphone Outlet"
          value={customer.noHpOutlet || "08123456789"}
          action={
            <button
              onClick={() => openWhatsApp(customer.noHpOutlet)}
              className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-100 px-3 text-[10px] font-black text-emerald-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-200 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
            >
              hubungi 📞
            </button>
          }
        />
        <InfoInput label="Sumber Customer" value={customer.sumberCustomer || "Tiktok"} />
      </section>

      <SectionTitle>Detail Mitra</SectionTitle>

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-red-100 bg-white p-4 lg:grid-cols-2">
        <InfoInput label="Kode Mitra" value={customer.kodeMitra || "#1423"} />
        <InfoInput label="Nama Mitra" value={customer.namaMitra || "PT. Cuci Baju Sentosa"} />
        <InfoInput label="Owner Mitra" value={customer.ownerMitra || "Wati Wati"} />
        <InfoInput label="Kategori Mitra" value={customer.kategoriMitra || "Mitra Referral"} />
      </section>

      <SectionTitle>Riwayat Call n Chat</SectionTitle>

      <section className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-red-50 text-[#C92C1E]">
            <tr>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">No</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">Waktu Call</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">PIC Sales</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">Remark</th>
            </tr>
          </thead>
          <tbody>
            {callHistories.length === 0 ? (
              <tr>
                <td colSpan={4} className="border border-red-100 px-2.5 py-5 text-center text-sm font-bold text-gray-400">
                  Belum ada riwayat call n chat.
                </td>
              </tr>
            ) : (
              callHistories.map((item, index) => (
                <tr key={`${item.waktuCall}-${index}`}>
                  <td className="border border-red-100 px-2.5 py-2 text-center font-black">{index + 1}</td>
                  <td className="border border-red-100 px-2.5 py-2 font-bold">{item.waktuCall}</td>
                  <td className="border border-red-100 px-2.5 py-2 text-center">
                    <Badge>{item.picSales}</Badge>
                  </td>
                  <td className="border border-red-100 px-2.5 py-2">
                    <Badge>{item.remark}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-red-100 bg-white p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-black text-[#C92C1E]"><ChatBubbleIcon /> Comment Call And Chat</p>

        <div className="space-y-4">
          {callHistories.length === 0 ? (
            <p className="rounded-xl bg-red-50/40 px-3 py-4 text-center text-xs font-bold text-gray-400">
              Belum ada comment call and chat.
            </p>
          ) : (
            visibleCallComments.map((item, index) => (
                <div key={`${item.waktuCall}-comment-${index}`} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-black text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <UserAvatarIcon className="h-4 w-4 text-[#4C2B7A]" />
                      {item.picSales}
                    </span>
                    <span>{item.waktuCall}</span>
                  </div>

                  <p className="rounded-xl bg-red-50/40 px-3 py-2 text-xs font-medium leading-relaxed text-gray-600">
                    {item.conclusion || "Belum ada komentar call dan chat."}
                  </p>
                </div>
              ))
          )}
        </div>

        {callHistories.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllComments((prev) => !prev)}
            className="mx-auto mt-4 block cursor-pointer rounded-full px-3 py-1.5 text-xs font-black text-gray-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:text-[#C92C1E] active:translate-y-0 active:scale-[0.98]"
          >
            {showAllComments ? "Show Less ˄" : "Show More ˅"}
          </button>
        )}
      </section>

      <SectionTitle>Riwayat Training</SectionTitle>

      <Timeline
        items={[
          "Customer belum training",
          ...trainingHistories.map(
            (item) => `${item.lokasiTraining}, ${item.waktuTraining}`,
          ),
        ]}
      />

      <section className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-red-50 text-[#C92C1E]">
            <tr>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">No</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">Waktu Training</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">Lokasi Training</th>
            </tr>
          </thead>
          <tbody>
            {trainingHistories.length === 0 ? (
              <tr>
                <td colSpan={3} className="border border-red-100 px-2.5 py-5 text-center text-sm font-bold text-gray-400">
                  Belum ada riwayat training.
                </td>
              </tr>
            ) : (
              trainingHistories.map((item, index) => (
                <tr key={`${item.waktuTraining}-${index}`}>
                  <td className="border border-red-100 px-2.5 py-2 text-center font-black">{index + 1}</td>
                  <td className="border border-red-100 px-2.5 py-2 font-bold">{item.waktuTraining}</td>
                  <td className="border border-red-100 px-2.5 py-2">
                    <Badge>{item.lokasiTraining}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <SectionTitle>Riwayat Pembelian</SectionTitle>

      <Timeline
        color="orange"
        items={purchaseHistories.map(
          (item) =>
            `Paket ${item.paket}, Dimulai ${item.waktuMulai}, Berakhir ${item.waktuBerakhir}`,
        )}
      />

      <section className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-red-50 text-[#C92C1E]">
            <tr>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">No</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">Paket</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">Waktu Mulai</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">Waktu Berakhir</th>
              <th className="border border-red-100 px-2.5 py-2 text-center font-black">Harga Aktual</th>
            </tr>
          </thead>
          <tbody>
            {purchaseHistories.length === 0 ? (
              <tr>
                <td colSpan={5} className="border border-red-100 px-2.5 py-5 text-center text-sm font-bold text-gray-400">
                  Belum ada riwayat pembelian.
                </td>
              </tr>
            ) : (
              purchaseHistories.map((item, index) => (
                <tr key={`${item.paket}-${index}`}>
                  <td className="border border-red-100 px-2.5 py-2 text-center font-black">{index + 1}</td>
                  <td className="border border-red-100 px-2.5 py-2">
                    <Badge>{item.paket}</Badge>
                  </td>
                  <td className="border border-red-100 px-2.5 py-2 font-black">{item.waktuMulai}</td>
                  <td className="border border-red-100 px-2.5 py-2 font-black">{item.waktuBerakhir}</td>
                  <td className="border border-red-100 px-2.5 py-2 font-black">
                    {formatRupiah(item.hargaAktual)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-red-100 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                  Edit Data
                </p>
                <h2 className="text-xl font-black text-gray-950">
                  Detail Customer & Mitra
                </h2>
                <p className="mt-1 text-xs font-bold text-gray-400">
                  Hanya ubah identitas customer dan mitra. Riwayat tetap dari Call & Chat.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="cursor-pointer rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-[#C92C1E] transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-red-100 bg-[#FFF8F6] p-4">
                <h3 className="mb-3 text-sm font-black text-[#C92C1E]">
                  Detail Customer
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Nama Owner
                    </span>
                    <input
                      value={editCustomer.namaOwner || ""}
                      onChange={(event) => updateEditField("namaOwner", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Nama Brand
                    </span>
                    <input
                      value={editCustomer.projectBrand || ""}
                      onChange={(event) => updateEditField("projectBrand", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Nama Outlet
                    </span>
                    <input
                      value={editCustomer.outlet || ""}
                      onChange={(event) => updateEditField("outlet", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Sumber Customer
                    </span>
                    <input
                      value={editCustomer.sumberCustomer || ""}
                      onChange={(event) => updateEditField("sumberCustomer", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      No HP Owner
                    </span>
                    <input
                      value={editCustomer.noHpOwner || ""}
                      onChange={(event) => updateEditField("noHpOwner", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      No HP Outlet
                    </span>
                    <input
                      value={editCustomer.noHpOutlet || ""}
                      onChange={(event) => updateEditField("noHpOutlet", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-red-100 bg-[#FFF8F6] p-4">
                <h3 className="mb-3 text-sm font-black text-[#C92C1E]">
                  Detail Mitra
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Kode Mitra
                    </span>
                    <input
                      value={editCustomer.kodeMitra || ""}
                      onChange={(event) => updateEditField("kodeMitra", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Nama Mitra
                    </span>
                    <input
                      value={editCustomer.namaMitra || ""}
                      onChange={(event) => updateEditField("namaMitra", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Owner Mitra
                    </span>
                    <input
                      value={editCustomer.ownerMitra || ""}
                      onChange={(event) => updateEditField("ownerMitra", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-gray-500">
                      Kategori Mitra
                    </span>
                    <input
                      value={editCustomer.kategoriMitra || ""}
                      onChange={(event) => updateEditField("kategoriMitra", event.target.value)}
                      className="w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#C92C1E]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="cursor-pointer rounded-xl bg-[#C92C1E] px-4 py-2 text-xs font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#A82216] hover:shadow-md active:translate-y-0 active:scale-[0.98]"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}