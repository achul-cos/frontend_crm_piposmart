"use client";

import { useEffect, useMemo, useState } from "react";
import RemarkOptionsSection, {
  getRemarkLabelFromValue,
  getRemarkScoreFromValue,
} from "./remarks/page";
import { applyRemark0Action } from "./remarks/remark-0/page";
import { applyRemark1Action } from "./remarks/remark-1/page";
import Remark2TrainingSection, {
  applyRemark2Action,
  getDefaultTrainingPayload,
  type Remark2TrainingPayload,
} from "./remarks/remark-2/page";
import Remark3SalesSection, {
  applyRemark3Action,
  getDefaultSalesPayload,
  type Remark3SalesPayload,
} from "./remarks/remark-3/page";

type CallHistoryItem = {
  waktuCall: string;
  picSales: string;
  remark: string;
  conclusion: string;
};

type PurchaseHistoryItem = {
  paket: string;
  waktuMulai: string;
  waktuBerakhir: string;
  hargaAktual: number;
};

export type NasabahItem = {
  no: number;
  kodeOwner?: string;
  namaOwner?: string;
  projectBrand?: string;
  outlet?: string;
  pic?: string;
  statusAkun?: string;
  remarks?: string;
  scor?: number;
  callStatus?: string;
  chatStatus?: string;
  totalFu?: number;
  tanggalFu?: string;
  noted?: string;
  noHpOwner?: string;
  noHpOutlet?: string;
  callHistories?: CallHistoryItem[];
  trainingStatus?: string;
  trainingSessions?: string[];
  trainingPlan?: {
    hasTraining: boolean;
    trainingTime: string;
    sessionType: string;
  };
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

type OptionTone = "red" | "yellow" | "green" | "blue";

type SelectOption = {
  value: string;
  label: string;
  tone: OptionTone;
};

const STATUS_OPTIONS: SelectOption[] = [
  { value: "NO CALL", label: "no call", tone: "red" },
  { value: "UNINTEREST", label: "uninterest", tone: "red" },
  { value: "PROSPECT", label: "prospect", tone: "yellow" },
  { value: "INTEREST", label: "interest", tone: "yellow" },
  { value: "ENGAGE", label: "engage", tone: "green" },
  { value: "CONNECTED", label: "connected", tone: "green" },
  { value: "CONTACTED", label: "contacted", tone: "green" },
];

const LIST_SKOR = [
  { value: "0", label: "Tidak Potensial (0)" },
  { value: "1", label: "Kemungkinan Potensial (1)" },
  { value: "2", label: "Potensial (2)" },
  { value: "3", label: "Langganan (3)" },
];

const getTodayTime = () => {
  return (
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date()) + " WIB"
  );
};

const getTodayDate = () => new Date().toISOString().split("T")[0];

const getSkorLabel = (item?: NasabahItem | null) => {
  const value = String(item?.remarks ?? item?.scor ?? "0");
  return LIST_SKOR.find((skor) => skor.value === value)?.label || "Tidak Potensial (0)";
};

const getInitialCustomer = (data: NasabahItem[]) => {
  return data[0]?.no ? String(data[0].no) : "";
};

const normalizePicName = (value?: string) =>
  String(value || "")
    .replace(/\(.*?\)/g, "")
    .trim()
    .toLowerCase();

const canAccessAllCustomers = (role?: string) => {
  const normalizedRole = String(role || "").trim().toLowerCase();
  return ["supervisor", "developer", "admin"].includes(normalizedRole);
};

const getUniquePicList = (data: NasabahItem[]) => {
  const picMap = new Map<string, string>();

  data.forEach((item) => {
    const rawPic = String(item.pic || "").trim();
    const normalizedPic = normalizePicName(rawPic);

    if (
      !rawPic ||
      normalizedPic === "invalid" ||
      normalizedPic === "no pic" ||
      normalizedPic === "-"
    ) {
      return;
    }

    if (!picMap.has(normalizedPic)) {
      picMap.set(normalizedPic, rawPic);
    }
  });

  return Array.from(picMap.values()).sort((first, second) =>
    first.localeCompare(second),
  );
};


const normalizeWhatsAppNumber = (phone?: string) => {
  const digitsOnly = String(phone || "").replace(/\D/g, "");

  if (!digitsOnly) return "";
  if (digitsOnly.startsWith("0")) return `62${digitsOnly.slice(1)}`;
  if (digitsOnly.startsWith("62")) return digitsOnly;

  return digitsOnly;
};

const getWhatsAppUrl = (phone?: string) => {
  const number = normalizeWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}` : "";
};

const getToneClass = (tone?: OptionTone) => {
  if (tone === "green") return "border-emerald-200 bg-emerald-100 text-emerald-800";
  if (tone === "yellow") return "border-yellow-200 bg-yellow-100 text-yellow-800";
  if (tone === "blue") return "border-blue-200 bg-blue-100 text-blue-800";
  return "border-red-200 bg-red-100 text-red-700";
};

const getStatusOption = (value: string) => {
  return STATUS_OPTIONS.find((item) => item.value === value);
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

const PhoneIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5A2.25 2.25 0 0021 19.5v-1.066a1.5 1.5 0 00-1.033-1.428l-4.2-1.4a1.5 1.5 0 00-1.64.43l-.826.826a11.25 11.25 0 01-6.164-6.164l.826-.826a1.5 1.5 0 00.43-1.64l-1.4-4.2A1.5 1.5 0 005.566 3H4.5A2.25 2.25 0 002.25 5.25v1.5z"
    />
  </svg>
);

const ChatIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 8.25h9m-9 3h5.25M21 12c0 4.142-4.03 7.5-9 7.5a10.7 10.7 0 01-3.58-.61L3 20.25l1.58-4.11A6.93 6.93 0 013 12c0-4.142 4.03-7.5 9-7.5s9 3.358 9 7.5z"
    />
  </svg>
);

function CustomOptionSelect({
  label,
  value,
  placeholder = "none",
  options,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  placeholder?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((item) => item.value === value);

  return (
    <div className="relative space-y-2">
      <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
        {icon}
        {label}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-xl border border-gray-300 bg-white p-1.5 text-xs font-black text-gray-700 outline-none transition focus:border-[#C92C1E]"
      >
        <span
          className={`flex min-h-[30px] flex-1 items-center justify-center rounded-lg border px-2.5 py-1.5 ${
            selectedOption ? getToneClass(selectedOption.tone) : "border-gray-200 bg-gray-50 text-gray-500"
          }`}
        >
          {selectedOption?.label || placeholder}
        </span>
        <span className="px-2 text-gray-500">⌄</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-44 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className="mb-1.5 flex w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-black text-gray-500 transition hover:scale-[1.005]"
          >
            none
          </button>

          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`mb-1.5 flex w-full items-center justify-center rounded-lg border px-2.5 py-1.5 text-xs font-black transition hover:scale-[1.005] ${getToneClass(option.tone)}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CallChatPage() {
  const [dataNasabah, setDataNasabah] = useState<NasabahItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [loggedInUser, setLoggedInUser] = useState("");
  const [loggedInRole, setLoggedInRole] = useState("");
  const [selectedPicFilter, setSelectedPicFilter] = useState("SEMUA");
  const [callTime, setCallTime] = useState(getTodayTime());
  const [callStatus, setCallStatus] = useState("");
  const [chatStatus, setChatStatus] = useState("");
  const [selectedRemark, setSelectedRemark] = useState("");
  const [isRemarkVisible, setIsRemarkVisible] = useState(false);
  const [remark2Training, setRemark2Training] = useState<Remark2TrainingPayload>(
    getDefaultTrainingPayload(),
  );
  const [remark3Sales, setRemark3Sales] = useState<Remark3SalesPayload>(
    getDefaultSalesPayload(),
  );
  const [conclusion, setConclusion] = useState("");

  useEffect(() => {
    const userName = localStorage.getItem("piposmart_user_name") || "";
    const userRole = localStorage.getItem("piposmart_user_role") || "";

    setLoggedInUser(userName);
    setLoggedInRole(userRole);

    const cached = localStorage.getItem("piposmart_nasabah_data");

    if (!cached) return;

    try {
      const parsed = JSON.parse(cached);
      const listData = Array.isArray(parsed) ? parsed : [];
      setDataNasabah(listData);
    } catch {
      setDataNasabah([]);
    }
  }, []);

  const isManagementRole = canAccessAllCustomers(loggedInRole);
  const picOptions = useMemo(() => getUniquePicList(dataNasabah), [dataNasabah]);

  const filteredCustomers = useMemo(() => {
    if (isManagementRole) {
      if (selectedPicFilter === "SEMUA") return dataNasabah;

      return dataNasabah.filter(
        (item) => normalizePicName(item.pic) === normalizePicName(selectedPicFilter),
      );
    }

    return dataNasabah.filter((item) => {
      const normalizedPic = normalizePicName(item.pic);
      const normalizedUser = normalizePicName(loggedInUser);

      return (
        normalizedPic === normalizedUser ||
        normalizedPic.includes(normalizedUser) ||
        normalizedUser.includes(normalizedPic)
      );
    });
  }, [dataNasabah, isManagementRole, loggedInUser, selectedPicFilter]);

  useEffect(() => {
    if (filteredCustomers.length === 0) {
      setSelectedCustomerId("");
      return;
    }

    const isSelectedStillVisible = filteredCustomers.some(
      (item) => String(item.no) === selectedCustomerId,
    );

    if (!isSelectedStillVisible) {
      setSelectedCustomerId(getInitialCustomer(filteredCustomers));
    }
  }, [filteredCustomers, selectedCustomerId]);

  const selectedCustomer = useMemo(() => {
    return filteredCustomers.find((item) => String(item.no) === selectedCustomerId) || null;
  }, [filteredCustomers, selectedCustomerId]);

  useEffect(() => {
    setCallStatus("");
    setChatStatus("");
    setSelectedRemark("");
    setIsRemarkVisible(false);
    setRemark2Training(getDefaultTrainingPayload());
    setRemark3Sales(getDefaultSalesPayload());
    setConclusion("");
    setCallTime(getTodayTime());
  }, [selectedCustomerId]);

  useEffect(() => {
    const hasBothStatus = Boolean(callStatus) && Boolean(chatStatus);

    setIsRemarkVisible(hasBothStatus);

    if (!hasBothStatus) {
      setSelectedRemark("");
      setRemark2Training(getDefaultTrainingPayload());
      setRemark3Sales(getDefaultSalesPayload());
      setConclusion("");
    }
  }, [callStatus, chatStatus]);

  const customerPhone = selectedCustomer?.noHpOwner || selectedCustomer?.noHpOutlet || "";
  const whatsappUrl = getWhatsAppUrl(customerPhone);
  const hasSelectedBothStatus = Boolean(callStatus) && Boolean(chatStatus);
  const shouldShowRemarks = hasSelectedBothStatus;
  const selectedRemarkScore = getRemarkScoreFromValue(selectedRemark);
  const shouldShowRemark2Training = selectedRemarkScore === 2;
  const shouldShowRemark3Sales = selectedRemarkScore === 3;
  const shouldShowConclusion = Boolean(selectedRemark);
  const shouldShowSaveButton =
    shouldShowConclusion &&
    conclusion.trim().length > 0 &&
    (!shouldShowRemark2Training || !remark2Training.hasTraining || Boolean(remark2Training.sessionType));

  const handleChangeCallStatus = (value: string) => {
    setCallStatus(value);
  };

  const handleChangeChatStatus = (value: string) => {
    setChatStatus(value);
  };

  const handleOpenWhatsApp = () => {
    if (!whatsappUrl) {
      alert("Nomor customer belum tersedia.");
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const handleSaveReport = () => {
    if (!selectedCustomer) {
      alert("Pilih customer terlebih dahulu.");
      return;
    }

    if (!callStatus && !chatStatus) {
      alert("Pilih Status Call atau Status Chat terlebih dahulu.");
      return;
    }

    if (!selectedRemark) {
      alert("Pilih remarks terlebih dahulu.");
      return;
    }

    if (!conclusion.trim()) {
      alert("Isi kesimpulan call terlebih dahulu.");
      return;
    }

    const remarkScore = getRemarkScoreFromValue(selectedRemark);
    const shouldMoveToInvalid = remarkScore === 0;
    const selectedRemarkLabel = getRemarkLabelFromValue(selectedRemark);
    const callHistory: CallHistoryItem = {
      waktuCall: callTime,
      picSales: selectedCustomer.pic || "-",
      remark: selectedRemarkLabel,
      conclusion: conclusion.trim(),
    };

    const baseUpdate = {
      callStatus: callStatus || selectedCustomer.callStatus || "PENDING",
      chatStatus: chatStatus || selectedCustomer.chatStatus || "PENDING",
      tanggalFu: getTodayDate(),
      remarks: String(remarkScore),
      scor: remarkScore,
      noted: `${selectedRemarkLabel} - ${conclusion.trim()}`,
    };

    const nextData = dataNasabah.map((item) => {
      if (item.no !== selectedCustomer.no) return item;

      const itemUpdate = {
        ...baseUpdate,
        callHistories: [...(item.callHistories || []), callHistory],
      };

      if (remarkScore === 0) {
        return applyRemark0Action(item, itemUpdate);
      }

      if (remarkScore === 1) {
        return applyRemark1Action(item, itemUpdate);
      }

      if (remarkScore === 2) {
        return applyRemark2Action(item, itemUpdate, remark2Training);
      }

      if (remarkScore === 3) {
        return applyRemark3Action(item, itemUpdate, remark3Sales);
      }

      return {
        ...item,
        ...itemUpdate,
        totalFu: Number(item.totalFu || 0) + 1,
      };
    });

    setDataNasabah(nextData);
    localStorage.setItem("piposmart_nasabah_data", JSON.stringify(nextData));
    setCallTime(getTodayTime());

    alert(
      shouldMoveToInvalid
        ? "Laporan call customer berhasil disimpan. PIC Sales customer berubah menjadi INVALID."
        : "Laporan call customer berhasil disimpan.",
    );
  };

  return (
    <div className="space-y-6 font-sans text-[#1C1C1E]">
      <section className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
              Call & Chat Customer
            </p>
            <h1 className="mt-1 text-xl font-black text-gray-950">
              Laporan Call Customer
            </h1>
            <p className="mt-1 text-xs font-medium text-gray-400">
              {isManagementRole
                ? "Supervisor/Developer bisa filter customer berdasarkan PIC."
                : "Sales hanya melihat dan call chat customer miliknya sendiri."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {isManagementRole && (
              <select
                value={selectedPicFilter}
                onChange={(event) => setSelectedPicFilter(event.target.value)}
                className="min-w-[190px] rounded-xl border border-red-100 bg-white px-3 py-2.5 text-xs font-black text-gray-800 outline-none focus:border-[#C92C1E]"
              >
                <option value="SEMUA">Semua PIC</option>
                {picOptions.map((pic) => (
                  <option key={pic} value={pic}>
                    {pic}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedCustomerId}
              onChange={(event) => setSelectedCustomerId(event.target.value)}
              className="min-w-[260px] rounded-xl border border-red-100 bg-red-50/40 px-3 py-2.5 text-xs font-black text-gray-800 outline-none focus:border-[#C92C1E]"
            >
              {filteredCustomers.length === 0 ? (
                <option value="">
                  {isManagementRole
                    ? "Tidak ada customer di filter ini"
                    : "Tidak ada customer untuk PIC kamu"}
                </option>
              ) : (
                filteredCustomers.map((item) => (
                  <option key={item.no} value={item.no}>
                    {item.namaOwner || "Tanpa Nama"} — {item.outlet || "Tanpa Outlet"}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="rounded-2xl border border-red-100 bg-[#FAF9F6] p-4">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-white text-[#C92C1E] shadow-sm">
                <UserAvatarIcon className="h-8 w-8" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-2xl font-black uppercase tracking-tight text-gray-950">
                  {selectedCustomer?.namaOwner || "Nama Customer"}
                </h2>
                <p className="mt-1 text-base font-black text-gray-500">
                  {selectedCustomer?.outlet || "Nama outlet"}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700">
                    Kode Owner :{" "}
                    <span className="text-[#C92C1E]">
                      {selectedCustomer?.kodeOwner || "#1111"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700">
                    PIC Sales :{" "}
                    <span className="text-[#C92C1E]">
                      {selectedCustomer?.pic || "Nama PIC"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700">
                    Mitra :{" "}
                    <span className="text-[#C92C1E]">
                      {selectedCustomer?.statusAkun || "Tidak ada"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700">
                    Skor Customer :{" "}
                    <span className="text-[#C92C1E]">
                      {getSkorLabel(selectedCustomer)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 xl:w-48">
              <div className="rounded-2xl border border-red-100 bg-white p-3 text-center shadow-sm">
                <p className="text-[10px] font-black uppercase text-gray-400">
                  Terakhir Call
                </p>
                <p className="mt-3 text-xs font-black leading-5 text-gray-800">
                  {selectedCustomer?.tanggalFu || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-red-100 bg-white p-3 text-center shadow-sm">
                <p className="text-[10px] font-black uppercase text-gray-400">
                  Total Call
                </p>
                <p className="mt-3 text-2xl font-black text-[#C92C1E]">
                  {selectedCustomer?.totalFu || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="my-4 h-px bg-gray-300" />

          <h3 className="text-center text-2xl font-black tracking-tight text-gray-900">
            Laporan Call Customer
          </h3>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Waktu
                </label>
                <input
                  type="text"
                  value={callTime}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-700 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Nomor Customer
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customerPhone || "-"}
                    readOnly
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2.5 text-xs font-black text-emerald-700 hover:bg-emerald-200"
                  >
                    Hubungi 📞
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <CustomOptionSelect
                label="Status Call"
                value={callStatus}
                placeholder="none"
                options={STATUS_OPTIONS}
                onChange={handleChangeCallStatus}
                icon={<PhoneIcon className="h-4 w-4 text-[#C92C1E]" />}
              />

              <CustomOptionSelect
                label="Status Chat"
                value={chatStatus}
                placeholder="none"
                options={STATUS_OPTIONS}
                onChange={handleChangeChatStatus}
                icon={<ChatIcon className="h-4 w-4 text-[#C92C1E]" />}
              />
            </div>

            {shouldShowRemarks && (
              <RemarkOptionsSection
                value={selectedRemark}
                onChange={(value) => {
                  setSelectedRemark(value);

                  if (!value) {
                    setRemark2Training(getDefaultTrainingPayload());
                    setRemark3Sales(getDefaultSalesPayload());
                    setConclusion("");
                  }
                }}
              />
            )}

            {shouldShowRemark2Training && (
              <Remark2TrainingSection
                value={remark2Training}
                onChange={setRemark2Training}
                existingSessions={selectedCustomer?.trainingSessions || []}
              />
            )}

            {shouldShowRemark3Sales && (
              <Remark3SalesSection
                value={remark3Sales}
                onChange={setRemark3Sales}
              />
            )}

            {shouldShowConclusion && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Kesimpulan
                </label>
                <textarea
                  value={conclusion}
                  onChange={(event) => setConclusion(event.target.value)}
                  rows={4}
                  placeholder="Isi kesimpulan call anda dengan customer..."
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-[#C92C1E]"
                />
              </div>
            )}

            {shouldShowSaveButton && (
              <button
                type="button"
                onClick={handleSaveReport}
                className="w-full rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-black text-[#C92C1E] transition hover:bg-[#C92C1E] hover:text-white"
              >
                Simpan
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}