"use client";

import React, { useEffect, useState } from "react";

export type EditModalMode = "profil";

export type ActionItem = {
  no: number;
  namaOwner?: string;
};

export type EditProfileItem = ActionItem & {
  kodeOwner?: string;
  projectBrand?: string;
  outlet?: string;
  outlets?: { namaOutlet: string; noHpOutlet?: string }[];
  noHpOwner?: string;
  noHpOutlet?: string;
  pic?: string;
};

export type ProfileValidationErrors = Partial<
  Record<
    "kodeOwner" | "namaOwner" | "projectBrand" | "outlet" | "noHpOwner" | "noHpOutlet" | "pic",
    string
  >
>;

type ActionButtonsProps<T extends ActionItem> = {
  item: T;
  editMode?: EditModalMode;
  onCall: (item: T) => void;
  onEdit: (item: T, mode: EditModalMode) => void;
  onDelete: (item: T) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  /** Sembunyikan tombol Call & Chat. Set false untuk Admin dan Supervisor. */
  canCall?: boolean;
};

type EditProfileModalProps<T extends EditProfileItem> = {
  open: boolean;
  item: T | null;
  errors: ProfileValidationErrors;
  listPic: string[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onChangeField: <K extends keyof T>(field: K, value: T[K]) => void;
};

const PHONE_COUNTRY_OPTIONS = [
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dialCode: "+62", placeholder: "812-3456-7890" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", dialCode: "+60", placeholder: "12-345-6789" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", dialCode: "+65", placeholder: "8123-4567" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", dialCode: "+66", placeholder: "81-234-5678" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", dialCode: "+63", placeholder: "912-345-6789" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", dialCode: "+84", placeholder: "91-234-5678" },
  { code: "BN", name: "Brunei", flag: "🇧🇳", dialCode: "+673", placeholder: "712-3456" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭", dialCode: "+855", placeholder: "12-345-678" },
  { code: "LA", name: "Laos", flag: "🇱🇦", dialCode: "+856", placeholder: "20-1234-5678" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲", dialCode: "+95", placeholder: "9-123-456789" },
  { code: "TL", name: "Timor-Leste", flag: "🇹🇱", dialCode: "+670", placeholder: "7721-2345" },
  { code: "US", name: "United States", flag: "🇺🇸", dialCode: "+1", placeholder: "123-456-7890" },
  { code: "CA", name: "Canada", flag: "🇨🇦", dialCode: "+1", placeholder: "123-456-7890" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", dialCode: "+52", placeholder: "55-1234-5678" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", dialCode: "+55", placeholder: "11-91234-5678" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dialCode: "+54", placeholder: "9-11-1234-5678" },
  { code: "CL", name: "Chile", flag: "🇨🇱", dialCode: "+56", placeholder: "9-1234-5678" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", dialCode: "+57", placeholder: "300-123-4567" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44", placeholder: "7700-900123" },
  { code: "FR", name: "France", flag: "🇫🇷", dialCode: "+33", placeholder: "6-12-34-56-78" },
  { code: "DE", name: "Germany", flag: "🇩🇪", dialCode: "+49", placeholder: "1512-3456789" },
  { code: "IT", name: "Italy", flag: "🇮🇹", dialCode: "+39", placeholder: "312-345-6789" },
  { code: "ES", name: "Spain", flag: "🇪🇸", dialCode: "+34", placeholder: "612-345-678" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", dialCode: "+31", placeholder: "6-12345678" },
  { code: "BE", name: "Belgium", flag: "🇧🇪", dialCode: "+32", placeholder: "470-12-34-56" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", dialCode: "+41", placeholder: "78-123-45-67" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", dialCode: "+46", placeholder: "70-123-45-67" },
  { code: "NO", name: "Norway", flag: "🇳🇴", dialCode: "+47", placeholder: "412-34-567" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", dialCode: "+45", placeholder: "20-12-34-56" },
  { code: "FI", name: "Finland", flag: "🇫🇮", dialCode: "+358", placeholder: "40-123-4567" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", dialCode: "+353", placeholder: "85-123-4567" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dialCode: "+351", placeholder: "912-345-678" },
  { code: "PL", name: "Poland", flag: "🇵🇱", dialCode: "+48", placeholder: "512-345-678" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", dialCode: "+90", placeholder: "532-123-4567" },
  { code: "RU", name: "Russia", flag: "🇷🇺", dialCode: "+7", placeholder: "912-345-6789" },
  { code: "CN", name: "China", flag: "🇨🇳", dialCode: "+86", placeholder: "138-0013-8000" },
  { code: "JP", name: "Japan", flag: "🇯🇵", dialCode: "+81", placeholder: "90-1234-5678" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", dialCode: "+82", placeholder: "10-1234-5678" },
  { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91", placeholder: "98765-43210" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", dialCode: "+92", placeholder: "300-1234567" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", dialCode: "+880", placeholder: "1712-345678" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", dialCode: "+94", placeholder: "71-234-5678" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", dialCode: "+966", placeholder: "50-123-4567" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", dialCode: "+971", placeholder: "50-123-4567" },
  { code: "QA", name: "Qatar", flag: "🇶🇦", dialCode: "+974", placeholder: "3312-3456" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", dialCode: "+965", placeholder: "500-12345" },
  { code: "OM", name: "Oman", flag: "🇴🇲", dialCode: "+968", placeholder: "9212-3456" },
  { code: "AU", name: "Australia", flag: "🇦🇺", dialCode: "+61", placeholder: "412-345-678" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", dialCode: "+64", placeholder: "21-123-4567" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", dialCode: "+27", placeholder: "82-123-4567" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", dialCode: "+20", placeholder: "100-123-4567" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dialCode: "+234", placeholder: "803-123-4567" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", dialCode: "+254", placeholder: "712-345-678" },
  { code: "MA", name: "Morocco", flag: "🇲🇦", dialCode: "+212", placeholder: "612-345678" },
];

const getPhoneCountryByDialCode = (phone?: string) => {
  const value = phone?.trim() || "";

  return (
    PHONE_COUNTRY_OPTIONS.find((country) => value.startsWith(country.dialCode)) ||
    PHONE_COUNTRY_OPTIONS[0]
  );
};

const stripDialCode = (phone?: string, dialCode = "+62") => {
  const value = phone?.trim() || "";

  if (value.startsWith(dialCode)) {
    return value.slice(dialCode.length).replace(/\D/g, "");
  }

  if (dialCode === "+62" && value.startsWith("0")) {
    return value.slice(1).replace(/\D/g, "");
  }

  return value.replace(/\D/g, "");
};

const buildInternationalPhone = (dialCode: string, value: string) => {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 14);
  return digitsOnly ? `${dialCode}${digitsOnly}` : dialCode;
};

const formatNationalPhoneByCountry = (value: string, placeholder: string) => {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 14);
  const groups = placeholder.split("-").map((group) => group.replace(/\D/g, "").length);
  const formattedGroups: string[] = [];
  let cursor = 0;

  groups.forEach((groupLength) => {
    if (cursor >= digitsOnly.length) return;

    const nextValue = digitsOnly.slice(cursor, cursor + groupLength);

    if (nextValue) {
      formattedGroups.push(nextValue);
    }

    cursor += groupLength;
  });

  if (cursor < digitsOnly.length) {
    formattedGroups.push(digitsOnly.slice(cursor));
  }

  return formattedGroups.join("-");
};

const CallIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5A2.25 2.25 0 0021 19.5v-1.066a1.5 1.5 0 00-1.033-1.428l-4.2-1.4a1.5 1.5 0 00-1.64.43l-.826.826a11.25 11.25 0 01-6.164-6.164l.826-.826a1.5 1.5 0 00.43-1.64l-1.4-4.2A1.5 1.5 0 005.566 3H4.5A2.25 2.25 0 002.25 5.25v1.5z"
    />
  </svg>
);

const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

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



function PhoneInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const initialCountry = getPhoneCountryByDialCode(value);
  const [selectedCountryCode, setSelectedCountryCode] = useState(initialCountry.code);
  const detectedCountry = value ? getPhoneCountryByDialCode(value) : null;
  const selectedCountry =
    detectedCountry ||
    PHONE_COUNTRY_OPTIONS.find((country) => country.code === selectedCountryCode) ||
    initialCountry;

  const nationalNumber = stripDialCode(value, selectedCountry.dialCode);
  const formattedNationalNumber = formatNationalPhoneByCountry(
    nationalNumber,
    selectedCountry.placeholder,
  );

  const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCountry =
      PHONE_COUNTRY_OPTIONS.find((country) => country.code === event.target.value) ||
      PHONE_COUNTRY_OPTIONS[0];

    setSelectedCountryCode(nextCountry.code);
    onChange(buildInternationalPhone(nextCountry.dialCode, nationalNumber));
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(buildInternationalPhone(selectedCountry.dialCode, event.target.value));
  };

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
        <FieldIcon type="phone" />
        {label}
      </label>

      <div
        className={`flex overflow-hidden rounded-xl border bg-white focus-within:border-[#C92C1E] ${
          error ? "border-red-500 bg-red-50" : "border-gray-200"
        }`}
      >
        <select
          value={selectedCountry.code}
          onChange={handleCountryChange}
          className="w-[110px] cursor-pointer border-r bg-gray-50 px-2.5 py-2.5 text-xs font-black text-gray-700 outline-none"
          title="Pilih kode negara"
        >
          {PHONE_COUNTRY_OPTIONS.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.dialCode}
            </option>
          ))}
        </select>

        <input
          required
          type="tel"
          value={formattedNationalNumber}
          onChange={handlePhoneChange}
          inputMode="tel"
          autoComplete="tel"
          placeholder={selectedCountry.placeholder}
          className="min-w-0 flex-1 bg-white px-3 py-2.5 text-xs font-bold outline-none"
          title="Pilih negara lalu isi nomor telepon"
        />
      </div>

      {error ? (
        <p className="text-[10px] font-bold text-red-600">{error}</p>
      ) : (
        <p className="text-[10px] font-medium text-gray-400">
          Tersimpan sebagai: {value || `${selectedCountry.dialCode}...`}
        </p>
      )}
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  icon = "code",
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: "code" | "user" | "brand" | "outlet" | "phone" | "sales";
  error?: string;
}) {
  const isRequired = label.includes("*");

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
        <FieldIcon type={icon} />
        {label}
      </label>
      <input
        required={isRequired}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E] font-bold ${
          error ? "border-red-500 bg-red-50" : "border-gray-200"
        }`}
      />
      {error && (
        <p className="text-[10px] font-bold text-red-600">{error}</p>
      )}
    </div>
  );
}



function OutletNamesEditor<T extends EditProfileItem>({
  item,
  error,
  onChangeField,
}: {
  item: T;
  error?: string;
  onChangeField: <K extends keyof T>(field: K, value: T[K]) => void;
}) {
  type OutletRow = { namaOutlet: string; noHpOutlet?: string };

  const [isOutletListOpen, setIsOutletListOpen] = useState(false);
  const [outletRows, setOutletRows] = useState<OutletRow[]>([]);
  const [initialOutletCount, setInitialOutletCount] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const rows: OutletRow[] =
        item.outlets && item.outlets.length > 0
          ? item.outlets.map((outletItem) => ({
              namaOutlet: outletItem.namaOutlet || "",
              noHpOutlet: outletItem.noHpOutlet || item.noHpOutlet || "",
            }))
          : item.outlet
            ? [{ namaOutlet: item.outlet, noHpOutlet: item.noHpOutlet || "" }]
            : [];

      setOutletRows(rows);
      setInitialOutletCount(rows.length);
      setIsOutletListOpen(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [item.no, item.noHpOutlet, item.outlet, item.outlets]);

  const syncOutlets = (nextOutlets: OutletRow[]) => {
    const cleanedOutlets = nextOutlets.map((outletItem) => ({
      namaOutlet: outletItem.namaOutlet || "",
      noHpOutlet: outletItem.noHpOutlet || "",
    }));

    const normalizedOutlets = cleanedOutlets
      .map((outletItem) => ({
        namaOutlet: String(outletItem.namaOutlet || "").trim(),
        noHpOutlet: String(outletItem.noHpOutlet || "").trim(),
      }))
      .filter((outletItem) => outletItem.namaOutlet);

    onChangeField("outlets", cleanedOutlets as T["outlets"]);
    onChangeField("outlet", (normalizedOutlets[0]?.namaOutlet || "") as T["outlet"]);
    onChangeField("noHpOutlet", (normalizedOutlets[0]?.noHpOutlet || "") as T["noHpOutlet"]);
  };

  const handleChangeOutletField = (
    index: number,
    field: keyof OutletRow,
    value: string,
  ) => {
    const nextOutlets = outletRows.map((outletItem, itemIndex) =>
      itemIndex === index ? { ...outletItem, [field]: value } : outletItem,
    );

    setOutletRows(nextOutlets);
    syncOutlets(nextOutlets);
  };

  const handleAddOutlet = () => {
    const nextOutlets = [...outletRows, { namaOutlet: "", noHpOutlet: "" }];

    setOutletRows(nextOutlets);
    syncOutlets(nextOutlets);
  };

  const handleRemoveOutlet = (index: number) => {
    if (outletRows.length <= 1) return;

    const nextOutlets = outletRows.filter((_, itemIndex) => itemIndex !== index);
    const nextInitialCount =
      index < initialOutletCount ? Math.max(initialOutletCount - 1, 0) : initialOutletCount;

    setOutletRows(nextOutlets);
    setInitialOutletCount(nextInitialCount);
    syncOutlets(nextOutlets);
  };

  const existingOutletRows = outletRows
    .map((outletItem, index) => ({ ...outletItem, originalIndex: index }))
    .filter((_, index) => index < initialOutletCount);

  const newOutletRows = outletRows
    .map((outletItem, index) => ({ ...outletItem, originalIndex: index }))
    .filter((_, index) => index >= initialOutletCount);

  const activeOutlet =
    existingOutletRows.find((outletItem) => String(outletItem.namaOutlet || "").trim())
      ?.namaOutlet ||
    outletRows.find((outletItem) => String(outletItem.namaOutlet || "").trim())?.namaOutlet ||
    item.outlet ||
    "";

  const filledExistingOutletCount = existingOutletRows.filter((outletItem) =>
    String(outletItem.namaOutlet || "").trim(),
  ).length;

  const renderOutletFields = (
    outletItem: OutletRow & { originalIndex: number },
    title: string,
    inputPlaceholder: string,
    canDelete: boolean,
    deleteLabel: string,
  ) => (
    <div key={`${title}-${outletItem.originalIndex}`} className="space-y-2">
      <span className="text-[10px] font-black uppercase text-gray-400">
        {title}
      </span>

      <label className="space-y-1">
        <span className="text-[10px] font-black uppercase text-gray-400">
          Nama Outlet
        </span>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={outletItem.namaOutlet || ""}
            onChange={(event) =>
              handleChangeOutletField(outletItem.originalIndex, "namaOutlet", event.target.value)
            }
            placeholder={inputPlaceholder}
            className={`min-w-0 flex-1 rounded-xl border bg-white p-2.5 text-xs font-bold outline-none focus:border-[#C92C1E] ${
              error && outletItem.originalIndex === 0
                ? "border-red-500 bg-red-50"
                : "border-gray-200"
            }`}
          />

          {canDelete && (
            <button
              type="button"
              onClick={() => handleRemoveOutlet(outletItem.originalIndex)}
              aria-label={deleteLabel}
              title={deleteLabel}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-red-100 bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50 active:scale-95"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.6}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 7h12M9.5 7V5.75A1.75 1.75 0 0111.25 4h1.5a1.75 1.75 0 011.75 1.75V7m-7 0l.7 12.25A1.75 1.75 0 009.95 21h4.1a1.75 1.75 0 001.75-1.75L16.5 7M10.5 11v6M13.5 11v6"
                />
              </svg>
            </button>
          )}
        </div>
      </label>

      <PhoneInput
        label="Nomor Telepon Outlet *"
        value={outletItem.noHpOutlet || ""}
        onChange={(value) =>
          handleChangeOutletField(outletItem.originalIndex, "noHpOutlet", value)
        }
      />
    </div>
  );

  return (
    <div className="space-y-3 rounded-xl border border-red-100 bg-red-50/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
          <FieldIcon type="outlet" />
          Outlet Brand
        </label>

        <button
          type="button"
          onClick={handleAddOutlet}
          className="shrink-0 cursor-pointer rounded-full bg-[#C92C1E] px-3 py-1.5 text-[10px] font-black text-white shadow-sm transition hover:bg-[#A82216]"
        >
          + Tambah Outlet
        </button>
      </div>

      <button
        type="button"
        onClick={() => setIsOutletListOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-red-100 bg-white px-3 py-2.5 text-left text-xs font-black text-gray-700 transition hover:border-red-200 hover:bg-red-50"
      >
        <span className="min-w-0 truncate">
          {activeOutlet || "Belum ada outlet lama"}
        </span>

        <span className="flex shrink-0 items-center gap-2 text-[10px] font-black text-[#C92C1E]">
          {filledExistingOutletCount} outlet lama
          <svg
            className={`h-3.5 w-3.5 transition ${isOutletListOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {isOutletListOpen && (
        <div className="space-y-3 rounded-xl border border-red-100 bg-white p-3">
          {existingOutletRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-red-100 bg-red-50/40 p-3 text-xs font-bold text-gray-400">
              Belum ada outlet lama untuk brand ini.
            </div>
          ) : (
            existingOutletRows.map((outletItem, visibleIndex) =>
              renderOutletFields(
                outletItem,
                `Outlet Lama ${visibleIndex + 1}`,
                "Contoh: Azzahra Laundry Cabang 1",
                outletRows.length > 1,
                `Hapus outlet ${visibleIndex + 1}`,
              ),
            )
          )}
        </div>
      )}

      {newOutletRows.length > 0 && (
        <div className="space-y-3 rounded-xl border border-dashed border-[#C92C1E]/30 bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#C92C1E]">
            Outlet Baru
          </p>

          {newOutletRows.map((outletItem, index) =>
            renderOutletFields(
              outletItem,
              `Outlet Baru ${index + 1}`,
              "Contoh: Azzahra Laundry Cabang Baru",
              outletRows.length > 1,
              `Hapus outlet baru ${index + 1}`,
            ),
          )}

          <button
            type="button"
            onClick={handleAddOutlet}
            className="w-full cursor-pointer rounded-xl border border-dashed border-[#C92C1E]/40 bg-red-50/50 px-4 py-2.5 text-xs font-black text-[#C92C1E] transition hover:bg-red-100"
          >
            + Tambah Lagi
          </button>
        </div>
      )}

      {error ? (
        <p className="text-[10px] font-bold text-red-600">{error}</p>
      ) : (
        <p className="text-[10px] font-medium text-gray-400">
          Outlet lama disimpan di dropdown. Outlet baru muncul di luar dropdown. Setiap outlet bisa punya nomor telepon berbeda.
        </p>
      )}
    </div>
  );
}


function FormSelect({
  label,
  value,
  options,
  onChange,
  getLabel,
  icon = "sales",
  required = false,
  error,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  getLabel?: (value: string) => string;
  icon?: "code" | "user" | "brand" | "outlet" | "phone" | "sales";
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
        <FieldIcon type={icon} />
        {label}
      </label>
      <select
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full bg-white border p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C92C1E] font-bold text-gray-700 cursor-pointer ${
          error ? "border-red-500 bg-red-50" : "border-gray-200"
        }`}
      >
        {options.map((option) => (
          <option key={option || "empty-option"} value={option}>
            {getLabel ? getLabel(option) : option}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-[10px] font-bold text-red-600">{error}</p>
      )}
    </div>
  );
}

function ActionButtons<T extends ActionItem>({
  item,
  editMode = "profil",
  onCall,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  canCall = true,
}: ActionButtonsProps<T>) {
  return (
    <div className="flex items-center justify-center gap-3">
      {canCall && (
        <button
          type="button"
          onClick={() => onCall(item)}
          className="text-gray-600 transition hover:scale-110 hover:text-green-600"
          title="Call via WhatsApp"
        >
          <CallIcon className="h-5 w-5" />
        </button>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={() => onEdit(item, editMode)}
          className="rounded-lg bg-orange-50 p-2 text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-700"
          title="Edit profil"
        >
          <EditIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function EditProfileModal<T extends EditProfileItem>({
  open,
  item,
  errors,
  listPic,
  onClose,
  onSubmit,
  onChangeField,
}: EditProfileModalProps<T>) {
  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 p-3 sm:p-6">
      <div className="app-modal-panel mx-auto my-6 flex w-full max-w-lg rounded-3xl shadow-2xl">
        <div className="app-modal-header flex items-center justify-between gap-4 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-black text-gray-900">
              Edit Profil Owner
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              Form ini hanya mengubah data utama profil owner.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-modal-close h-9 w-9 rounded-full font-black"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3">
            <FormInput
              label="Kode Owner *"
              icon="code"
              value={item.kodeOwner || ""}
              onChange={(value) => onChangeField("kodeOwner", value as T["kodeOwner"])}
              error={errors.kodeOwner}
            />
            <FormInput
              label="Nama Owner *"
              icon="user"
              value={item.namaOwner || ""}
              onChange={(value) => onChangeField("namaOwner", value as T["namaOwner"])}
              error={errors.namaOwner}
            />
            <FormInput
              label="Nama Brand *"
              icon="brand"
              value={item.projectBrand || ""}
              onChange={(value) => onChangeField("projectBrand", value as T["projectBrand"])}
              error={errors.projectBrand}
            />
            <OutletNamesEditor
              item={item}
              error={errors.outlet}
              onChangeField={onChangeField}
            />
            <PhoneInput
              label="Nomor Telepon Owner *"
              value={item.noHpOwner || ""}
              onChange={(value) => onChangeField("noHpOwner", value as T["noHpOwner"])}
              error={errors.noHpOwner}
            />
            <FormSelect
              label="PIC Sales *"
              icon="sales"
              required
              value={item.pic || ""}
              options={listPic}
              onChange={(value) => onChangeField("pic", value as T["pic"])}
              error={errors.pic}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 sm:w-auto cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-full rounded-xl bg-[#C92C1E] px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#A82216] sm:w-auto cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ActionButtonsWithModal = ActionButtons as typeof ActionButtons & {
  EditProfileModal: typeof EditProfileModal;
};

ActionButtonsWithModal.EditProfileModal = EditProfileModal;

export default ActionButtonsWithModal;
