"use client";

import { useEffect, useMemo, useState } from "react";

type MitraStatus = "Sudah 1 Tahun" | "Belum 1 Tahun" | "Aktif" | "Prospek" | "Nonaktif";
type StatusPencairan = "Belum Dicairkan" | "Dicairkan Sebagian" | "Selesai Dicairkan";
type JenisKomisi = "Komisi Referral" | "Komisi Partnership" | "Komisi Strategic";

type DataKelolaanOwner = {
  no?: number;
  kodeOwner?: string;
  namaOwner?: string;
  outlet?: string;
  projectBrand?: string;
  noHpOwner?: string;
  noHpOutlet?: string;
};

type MasterJenisMitraItem = {
  id?: string;
  paketBerlangganan?: string;
  paketLangganan?: string;
  hargaBerlangganan?: number;
  komisiReferral?: number;
  komisiPartnership?: number;
  komisiStrategic?: number;
  referral?: number;
  partnership?: number;
  strategic?: number;
};

type PaketKomisi = {
  paketLangganan: string;
  hargaBerlangganan: number;
  referral: number;
  partnership: number;
  strategic: number;
};

type OwnerOption = {
  key: string;
  kodeOwner: string;
  namaOwner: string;
  outlets: DataKelolaanOwner[];
};

type SelectedOwnerItem = {
  id: number;
  kodeOwner: string;
  namaOwner: string;
  namaOutlet: string;
  jumlahOutlet: number;
  komisi: number;
  tanggal: string;
};

export type MitraFormPayload = {
  namaMitra: string;
  kategoriMitra: string;
  paketLangganan: string;
  hargaBerlangganan: number;
  jenisKomisi: JenisKomisi;
  pic: string;
  noHp: string;
  status: MitraStatus;
  statusPencairan: StatusPencairan;
  tanggalKerjasama: string;
  tanggalPencairan1: string;
  tanggalPencairan2: string;
  kodeReferral: string;
  catatan: string;
  owners: {
    kodeOwner: string;
    namaOwner: string;
    namaOutlet: string;
    jumlahOutlet: number;
    komisi: number;
    tanggal: string;
  }[];
};

type MitraFormModalProps = {
  open?: boolean;
  mode?: "create" | "edit";
  initialData?: MitraFormPayload | null;
  listPic?: string[];
  listStatus?: MitraStatus[];
  listStatusPencairan?: StatusPencairan[];
  onClose?: () => void;
  onSubmit?: (payload: MitraFormPayload) => void;
};

const LIST_KATEGORI_MITRA = [
  "FRANCHISE (Jual Brand Usaha)",
  "REFERAL (Berlangganan)",
  "AFILIASI (Perlengkapan Ex. Mesin)",
  "Parfum",
  "DII",
  "CORPORATE (Rekomendasi & Akuisisi)",
];

const LIST_JENIS_KOMISI: {
  value: JenisKomisi;
  title: string;
  desc: string;
  border: string;
  bg: string;
  text: string;
  active: string;
}[] = [
  {
    value: "Komisi Referral",
    title: "Referral",
    desc: "Ambil nominal dari tabel Komisi Referral",
    border: "border-orange-100",
    bg: "bg-orange-50",
    text: "text-orange-700",
    active: "border-orange-300 bg-orange-50 text-orange-700 shadow-sm",
  },
  {
    value: "Komisi Partnership",
    title: "Partnership",
    desc: "Ambil nominal dari tabel Komisi Partnership",
    border: "border-red-100",
    bg: "bg-red-50",
    text: "text-[#C92C1E]",
    active: "border-red-300 bg-red-50 text-[#C92C1E] shadow-sm",
  },
  {
    value: "Komisi Strategic",
    title: "Strategic",
    desc: "Ambil nominal dari tabel Komisi Strategic",
    border: "border-violet-100",
    bg: "bg-violet-50",
    text: "text-violet-700",
    active: "border-violet-300 bg-violet-50 text-violet-700 shadow-sm",
  },
];

const DEFAULT_PAKET_KOMISI: PaketKomisi[] = [
  { paketLangganan: "Basic (12 Bulan)", hargaBerlangganan: 858000, referral: 120000, partnership: 150000, strategic: 240000 },
  { paketLangganan: "Business (12 Bulan)", hargaBerlangganan: 1298000, referral: 180000, partnership: 210000, strategic: 320000 },
  { paketLangganan: "Business (18 Bulan)", hargaBerlangganan: 1999000, referral: 270000, partnership: 315000, strategic: 480000 },
  { paketLangganan: "Business (24 Bulan)", hargaBerlangganan: 2596000, referral: 360000, partnership: 420000, strategic: 640000 },
  { paketLangganan: "Pro (12 Bulan)", hargaBerlangganan: 1688000, referral: 220000, partnership: 250000, strategic: 400000 },
  { paketLangganan: "Pro (18 Bulan)", hargaBerlangganan: 2688000, referral: 330000, partnership: 375000, strategic: 600000 },
  { paketLangganan: "Pro (24 Bulan)", hargaBerlangganan: 3368000, referral: 440000, partnership: 500000, strategic: 800000 },
];


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
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44", placeholder: "7700-900123" },
  { code: "AU", name: "Australia", flag: "🇦🇺", dialCode: "+61", placeholder: "412-345-678" },
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

  if (value.startsWith(`${dialCode}-`)) {
    return value.slice(`${dialCode}-`.length).replace(/\D/g, "");
  }

  if (value.startsWith(dialCode)) {
    return value.slice(dialCode.length).replace(/\D/g, "");
  }

  if (dialCode === "+62" && value.startsWith("0")) {
    return value.slice(1).replace(/\D/g, "");
  }

  return value.replace(/\D/g, "");
};

const buildInternationalPhone = (dialCode: string, value: string, placeholder = "812-3456-7890") => {
  const formattedNationalNumber = formatNationalPhoneByCountry(value, placeholder);

  return formattedNationalNumber ? `${dialCode}-${formattedNationalNumber}` : dialCode;
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

function PhoneInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const initialCountry = getPhoneCountryByDialCode(value);
  const [selectedCountryCode, setSelectedCountryCode] = useState(initialCountry.code);

  const selectedCountry =
    PHONE_COUNTRY_OPTIONS.find((country) => country.code === selectedCountryCode) ||
    initialCountry;

  useEffect(() => {
    if (!value) return;

    const detectedCountry = getPhoneCountryByDialCode(value);

    if (value.startsWith(detectedCountry.dialCode)) {
      setSelectedCountryCode(detectedCountry.code);
    }
  }, [value]);

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
    onChange(buildInternationalPhone(nextCountry.dialCode, nationalNumber, nextCountry.placeholder));
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(buildInternationalPhone(selectedCountry.dialCode, event.target.value, selectedCountry.placeholder));
  };

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
        {label}
      </label>

      <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white focus-within:border-[#C92C1E]">
        <select
          value={selectedCountry.code}
          onChange={handleCountryChange}
          className="w-[116px] cursor-pointer border-r border-gray-200 bg-gray-50 px-3 py-3 text-xs font-black text-gray-700 outline-none"
          title="Pilih kode negara"
        >
          {PHONE_COUNTRY_OPTIONS.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.dialCode}
            </option>
          ))}
        </select>

        <input
          type="tel"
          value={formattedNationalNumber}
          onChange={handlePhoneChange}
          inputMode="tel"
          autoComplete="tel"
          placeholder={selectedCountry.placeholder}
          className="min-w-0 flex-1 bg-white px-4 py-3 text-xs font-bold outline-none"
          title="Isi nomor telepon"
        />
      </div>

      <p className="text-[10px] font-medium text-gray-400">
        Tersimpan sebagai: {value || `${selectedCountry.dialCode}-...`}
      </p>
    </div>
  );
}


const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const normalizeValue = (value?: string | number) => String(value || "").trim().toLowerCase();
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

const getOutletName = (owner: DataKelolaanOwner) => owner.outlet || owner.projectBrand || "-";
const getOwnerGroupKey = (owner: DataKelolaanOwner) => `${owner.kodeOwner || ""}-${owner.namaOwner || ""}`;

const getOwnerMainOutletName = (outlets: DataKelolaanOwner[]) => {
  if (!outlets.length) return "-";
  if (outlets.length === 1) return getOutletName(outlets[0]);

  return `${getOutletName(outlets[0])} +${outlets.length - 1} outlet lain`;
};

const normalizeMasterPaketKomisi = (items: unknown): PaketKomisi[] => {
  if (!Array.isArray(items)) return DEFAULT_PAKET_KOMISI;

  const mapped = items
    .map((item: MasterJenisMitraItem) => {
      const paketLangganan = String(item?.paketBerlangganan || item?.paketLangganan || "").trim();

      if (!paketLangganan) return null;

      return {
        paketLangganan,
        hargaBerlangganan: Number(item?.hargaBerlangganan || 0),
        referral: Number(item?.komisiReferral || item?.referral || 0),
        partnership: Number(item?.komisiPartnership || item?.partnership || 0),
        strategic: Number(item?.komisiStrategic || item?.strategic || 0),
      };
    })
    .filter(Boolean) as PaketKomisi[];

  return mapped.length ? mapped : DEFAULT_PAKET_KOMISI;
};

const getKomisiByJenis = (paket: PaketKomisi | undefined, jenisKomisi: JenisKomisi) => {
  if (!paket) return 0;
  if (jenisKomisi === "Komisi Partnership") return paket.partnership;
  if (jenisKomisi === "Komisi Strategic") return paket.strategic;

  return paket.referral;
};

const getKomisiTypeLabel = (jenisKomisi: JenisKomisi) => {
  if (jenisKomisi === "Komisi Partnership") return "Partnership";
  if (jenisKomisi === "Komisi Strategic") return "Strategic";

  return "Referral";
};

const getKomisiTypeStyle = (jenisKomisi: JenisKomisi) => {
  if (jenisKomisi === "Komisi Partnership") {
    return {
      border: "border-red-100",
      bg: "bg-red-50",
      text: "text-[#C92C1E]",
    };
  }

  if (jenisKomisi === "Komisi Strategic") {
    return {
      border: "border-violet-100",
      bg: "bg-violet-50",
      text: "text-violet-700",
    };
  }

  return {
    border: "border-orange-100",
    bg: "bg-orange-50",
    text: "text-orange-700",
  };
};

export default function MitraFormModal({
  open = false,
  mode = "create",
  initialData = null,
  listPic = [],
  listStatus = ["Sudah 1 Tahun", "Belum 1 Tahun", "Aktif", "Prospek", "Nonaktif"],
  listStatusPencairan = ["Belum Dicairkan", "Dicairkan Sebagian", "Selesai Dicairkan"],
  onClose = () => {},
  onSubmit = () => {},
}: MitraFormModalProps) {
  const [namaMitra, setNamaMitra] = useState("");
  const [kategoriMitra, setKategoriMitra] = useState(LIST_KATEGORI_MITRA[0]);
  const [paketKomisi, setPaketKomisi] = useState<PaketKomisi[]>(DEFAULT_PAKET_KOMISI);
  const [paketLangganan, setPaketLangganan] = useState(DEFAULT_PAKET_KOMISI[0].paketLangganan);
  const [jenisKomisi, setJenisKomisi] = useState<JenisKomisi>("Komisi Referral");
  const [pic, setPic] = useState("");
  const [noHp, setNoHp] = useState("");
  const [status, setStatus] = useState<MitraStatus>("Sudah 1 Tahun");
  const [statusPencairan, setStatusPencairan] = useState<StatusPencairan>("Belum Dicairkan");
  const [tanggalKerjasama, setTanggalKerjasama] = useState(getTodayDate());
  const [tanggalPencairan1, setTanggalPencairan1] = useState("");
  const [tanggalPencairan2, setTanggalPencairan2] = useState("");
  const [kodeReferral, setKodeReferral] = useState("");
  const [catatan, setCatatan] = useState("");

  const [dataKelolaan, setDataKelolaan] = useState<DataKelolaanOwner[]>([]);
  const [searchOwner, setSearchOwner] = useState("");
  const [selectedOwnerKey, setSelectedOwnerKey] = useState("");
  const [selectedOwners, setSelectedOwners] = useState<SelectedOwnerItem[]>([]);

  const selectedPaket = useMemo(() => {
    return paketKomisi.find((paket) => paket.paketLangganan === paketLangganan) || paketKomisi[0] || DEFAULT_PAKET_KOMISI[0];
  }, [paketKomisi, paketLangganan]);

  const selectedKomisiStyle = getKomisiTypeStyle(jenisKomisi);

  const initialDataKey = useMemo(() => {
    if (!initialData) return "";

    return JSON.stringify(initialData);
  }, [initialData]);

  useEffect(() => {
    if (!open) return;

    const cachedMasterPaket = localStorage.getItem("piposmart_master_jenis_mitra");
    let nextPaketKomisi = DEFAULT_PAKET_KOMISI;

    if (cachedMasterPaket) {
      try {
        nextPaketKomisi = normalizeMasterPaketKomisi(JSON.parse(cachedMasterPaket));
      } catch {
        nextPaketKomisi = DEFAULT_PAKET_KOMISI;
      }
    }

    const firstPaket = nextPaketKomisi[0] || DEFAULT_PAKET_KOMISI[0];

    setPaketKomisi(nextPaketKomisi);

    if (mode === "edit" && initialData) {
      setNamaMitra(initialData.namaMitra || "");
      setKategoriMitra(initialData.kategoriMitra || LIST_KATEGORI_MITRA[0]);
      setPaketLangganan(initialData.paketLangganan || firstPaket.paketLangganan);
      setJenisKomisi(initialData.jenisKomisi || "Komisi Referral");
      setPic(initialData.pic || "");
      setNoHp(initialData.noHp || "");
      setStatus(initialData.status || "Sudah 1 Tahun");
      setStatusPencairan(initialData.statusPencairan || "Belum Dicairkan");
      setTanggalKerjasama(initialData.tanggalKerjasama || getTodayDate());
      setTanggalPencairan1(initialData.tanggalPencairan1 || "");
      setTanggalPencairan2(initialData.tanggalPencairan2 || "");
      setKodeReferral(initialData.kodeReferral || "");
      setCatatan(initialData.catatan || "");
      setSearchOwner("");
      setSelectedOwnerKey("");
      setSelectedOwners(
        Array.isArray(initialData.owners)
          ? initialData.owners.map((owner, index) => ({
              id: Date.now() + index,
              kodeOwner: owner.kodeOwner,
              namaOwner: owner.namaOwner,
              namaOutlet: owner.namaOutlet || "-",
              jumlahOutlet: Number(owner.jumlahOutlet || 1),
              komisi: Number(owner.komisi || 0),
              tanggal: owner.tanggal || initialData.tanggalKerjasama || getTodayDate(),
            }))
          : [],
      );
    } else {
      setNamaMitra("");
      setKategoriMitra(LIST_KATEGORI_MITRA[0]);
      setPaketLangganan(firstPaket.paketLangganan);
      setJenisKomisi("Komisi Referral");
      setPic("");
      setNoHp("");
      setStatus("Sudah 1 Tahun");
      setStatusPencairan("Belum Dicairkan");
      setTanggalKerjasama(getTodayDate());
      setTanggalPencairan1("");
      setTanggalPencairan2("");
      setKodeReferral("");
      setCatatan("");
      setSearchOwner("");
      setSelectedOwnerKey("");
      setSelectedOwners([]);
    }

    const cached = localStorage.getItem("piposmart_nasabah_data");

    if (cached) {
      try {
        const parsed = JSON.parse(cached);

        setDataKelolaan(Array.isArray(parsed) ? parsed : []);
      } catch {
        setDataKelolaan([]);
      }
    } else {
      setDataKelolaan([]);
    }
  }, [open, mode, initialDataKey]);


  const ownerOptions = useMemo<OwnerOption[]>(() => {
    const grouped = new Map<string, OwnerOption>();

    dataKelolaan.forEach((item) => {
      if (!item.kodeOwner || !item.namaOwner) return;

      const key = getOwnerGroupKey(item);
      const existing = grouped.get(key);

      if (existing) {
        existing.outlets.push(item);
        return;
      }

      grouped.set(key, {
        key,
        kodeOwner: item.kodeOwner,
        namaOwner: item.namaOwner,
        outlets: [item],
      });
    });

    return Array.from(grouped.values());
  }, [dataKelolaan]);

  const selectedOwnerOption = useMemo(() => {
    if (!selectedOwnerKey) return null;

    return ownerOptions.find((owner) => owner.key === selectedOwnerKey) || null;
  }, [ownerOptions, selectedOwnerKey]);

  const filteredOwnerOptions = useMemo(() => {
    const keyword = normalizeValue(searchOwner);
    if (!keyword || selectedOwnerOption) return [];

    return ownerOptions
      .filter(
        (item) =>
          normalizeValue(item.kodeOwner).includes(keyword) ||
          normalizeValue(item.namaOwner).includes(keyword),
      )
      .slice(0, 8);
  }, [ownerOptions, searchOwner, selectedOwnerOption]);

  const totalKomisiOwner = selectedOwners.reduce((total, owner) => total + owner.komisi, 0);

  if (!open) return null;

  const handleSelectOwner = (owner: OwnerOption) => {
    setSelectedOwnerKey(owner.key);
    setSearchOwner(`${owner.kodeOwner} — ${owner.namaOwner}`);
  };

  const handleChangeOwnerSearch = (value: string) => {
    setSearchOwner(value);
    setSelectedOwnerKey("");
  };

  const handleChangeJenisKomisi = (value: JenisKomisi) => {
    setJenisKomisi(value);
  };

  const handleChangePaketLangganan = (value: string) => {
    setPaketLangganan(value);
  };

  const handleAddOwner = () => {
    if (!selectedOwnerOption) {
      alert("Pilih owner dari Data Kelolaan terlebih dahulu.");
      return;
    }

    const isAlreadyAdded = selectedOwners.some(
      (owner) => owner.kodeOwner === selectedOwnerOption.kodeOwner,
    );

    if (isAlreadyAdded) {
      alert("Owner ini sudah ditambahkan.");
      return;
    }

    const komisi = getKomisiByJenis(selectedPaket, jenisKomisi);

    if (!komisi) {
      alert("Nominal komisi pada paket ini masih kosong di Master Jenis Mitra.");
      return;
    }

    setSelectedOwners((prev) => [
      {
        id: Date.now(),
        kodeOwner: selectedOwnerOption.kodeOwner,
        namaOwner: selectedOwnerOption.namaOwner,
        namaOutlet: getOwnerMainOutletName(selectedOwnerOption.outlets),
        jumlahOutlet: selectedOwnerOption.outlets.length,
        komisi,
        tanggal: tanggalKerjasama || getTodayDate(),
      },
      ...prev,
    ]);

    setSearchOwner("");
    setSelectedOwnerKey("");
  };

  const handleRemoveOwner = (ownerId: number) => {
    setSelectedOwners((prev) => prev.filter((owner) => owner.id !== ownerId));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedOwners.length === 0) {
      alert("Minimal tambahkan 1 data owner.");
      return;
    }

    if (!namaMitra.trim()) {
      alert("Nama mitra wajib diisi.");
      return;
    }

    if (!pic) {
      alert("PIC wajib dipilih.");
      return;
    }

    onSubmit({
      namaMitra: namaMitra.trim(),
      kategoriMitra,
      paketLangganan,
      hargaBerlangganan: selectedPaket.hargaBerlangganan,
      jenisKomisi,
      pic,
      noHp: noHp.trim(),
      status,
      statusPencairan,
      tanggalKerjasama,
      tanggalPencairan1,
      tanggalPencairan2,
      kodeReferral: kodeReferral.trim(),
      catatan: catatan.trim(),
      owners: selectedOwners.map((owner) => ({
        kodeOwner: owner.kodeOwner,
        namaOwner: owner.namaOwner,
        namaOutlet: owner.namaOutlet,
        jumlahOutlet: owner.jumlahOutlet,
        komisi: owner.komisi,
        tanggal: owner.tanggal,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-6 w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#C92C1E] via-[#E54837] to-[#FF8A65] p-5 text-white">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/15" />
          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/10" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/75">
                Form Mitra
              </p>
              <h2 className="mt-2 text-xl font-black">{mode === "edit" ? "Edit Mitra" : "Tambah Mitra Baru"}</h2>
              <p className="mt-1 max-w-lg text-xs font-medium leading-5 text-white/80">
                {mode === "edit"
                  ? "Perbarui data mitra, paket komisi, PIC, pencairan, dan owner."
                  : "Bagian komisi mengikuti tabel Referral, Partnership, dan Strategic di Jenis-Jenis Mitra."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white transition hover:bg-white/30"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          <div className="rounded-3xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-black text-gray-900">Data Mitra & Komisi</h3>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Pilih jenis komisi terlebih dahulu, lalu pilih paket dari tabel jenis komisi tersebut.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Mitra
                </span>
                <select
                  value={kategoriMitra}
                  onChange={(event) => setKategoriMitra(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                >
                  {LIST_KATEGORI_MITRA.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Nama Mitra
                </span>
                <input
                  value={namaMitra}
                  onChange={(event) => setNamaMitra(event.target.value)}
                  placeholder="Contoh: Detergent Laundry"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                />
              </label>
            </div>

            <div className="mt-4 rounded-3xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Pilih Tabel Komisi
                  </p>
                  <p className="text-xs font-medium text-gray-500">
                    Ini mengikuti tampilan Jenis-Jenis Mitra: Referral, Partnership, dan Strategic dipisah per tabel.
                  </p>
                </div>

                <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${selectedKomisiStyle.border} ${selectedKomisiStyle.bg} ${selectedKomisiStyle.text}`}>
                  {getKomisiTypeLabel(jenisKomisi)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {LIST_JENIS_KOMISI.map((item) => {
                  const active = jenisKomisi === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleChangeJenisKomisi(item.value)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? item.active
                          : "border-gray-200 bg-white text-gray-400 hover:border-red-100 hover:bg-red-50/40"
                      }`}
                    >
                      <p className="text-xs font-black">{item.title}</p>
                      <p className="mt-1 text-[10px] font-bold leading-4">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`mt-4 rounded-3xl border p-4 ${selectedKomisiStyle.border} ${selectedKomisiStyle.bg}`}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.9fr]">
                <label className="space-y-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${selectedKomisiStyle.text}`}>
                    Paket dari Tabel {getKomisiTypeLabel(jenisKomisi)}
                  </span>
                  <select
                    value={paketLangganan}
                    onChange={(event) => handleChangePaketLangganan(event.target.value)}
                    className="w-full rounded-2xl border border-white bg-white px-4 py-3 text-xs font-bold text-gray-800 outline-none focus:border-[#C92C1E]"
                  >
                    {paketKomisi.map((item) => (
                      <option key={item.paketLangganan} value={item.paketLangganan}>
                        {item.paketLangganan} — {formatRupiah(item.hargaBerlangganan)}
                      </option>
                    ))}
                  </select>

                  <div className="mt-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Paket Terpilih
                    </p>
                    <p className="mt-1 text-sm font-black text-gray-900">
                      {selectedPaket.paketLangganan}
                    </p>
                    <p className="mt-1 text-xs font-bold text-gray-500">
                      Harga paket: {formatRupiah(selectedPaket.hargaBerlangganan)}
                    </p>
                  </div>
                </label>

                <div className={`flex flex-col justify-between rounded-3xl border border-white bg-white p-5 shadow-sm`}>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${selectedKomisiStyle.text}`}>
                      Nominal Komisi
                    </p>
                    <p className="mt-1 text-xs font-bold text-gray-400">
                      {getKomisiTypeLabel(jenisKomisi)} / owner
                    </p>
                  </div>

                  <div className="mt-5">
                    <p className={`text-3xl font-black tracking-tight ${selectedKomisiStyle.text}`}>
                      {formatRupiah(getKomisiByJenis(selectedPaket, jenisKomisi))}
                    </p>
                    <div className={`mt-3 h-1.5 w-20 rounded-full ${selectedKomisiStyle.bg}`} />
                    <p className="mt-3 text-[10px] font-bold leading-4 text-gray-400">
                      Otomatis mengikuti tabel {getKomisiTypeLabel(jenisKomisi)} di Master Jenis Mitra.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Tanggal Kerjasama
                </span>
                <input
                  type="date"
                  value={tanggalKerjasama}
                  onChange={(event) => setTanggalKerjasama(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  PIC
                </span>
                <select
                  value={pic}
                  onChange={(event) => setPic(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                >
                  <option value="">Pilih PIC</option>
                  {listPic.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Status
                </span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as MitraStatus)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                >
                  {listStatus.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Status Pencairan Komisi Mitra
                </span>
                <select
                  value={statusPencairan}
                  onChange={(event) => setStatusPencairan(event.target.value as StatusPencairan)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-black outline-none focus:border-[#C92C1E]"
                >
                  {listStatusPencairan.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Tanggal Pencairan 1
                </span>
                <input
                  type="date"
                  value={tanggalPencairan1}
                  onChange={(event) => setTanggalPencairan1(event.target.value)}
                  className="w-full rounded-2xl border border-yellow-100 bg-[#FFF4CC] px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Tanggal Pencairan 2
                </span>
                <input
                  type="date"
                  value={tanggalPencairan2}
                  onChange={(event) => setTanggalPencairan2(event.target.value)}
                  className="w-full rounded-2xl border border-orange-100 bg-[#F5E3CB] px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                />
              </label>

              <PhoneInput
                label="Nomor HP Mitra"
                value={noHp}
                onChange={setNoHp}
              />

              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Kode Referral
                </span>
                <input
                  value={kodeReferral}
                  onChange={(event) => setKodeReferral(event.target.value)}
                  placeholder="Contoh: MITRA-DTG001"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                />
              </label>
            </div>

            <label className="mt-3 block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Catatan
              </span>
              <textarea
                value={catatan}
                onChange={(event) => setCatatan(event.target.value)}
                placeholder="Catatan singkat terkait mitra"
                rows={3}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
              />
            </label>
          </div>

          <div className="rounded-3xl border border-red-100 bg-red-50/40 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900">Data Owner dari Data Kelolaan</h3>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Bagian ini berada di bawah. Bisa tambah lebih dari satu owner. Outlet tidak dropdown, hanya info jumlah outlet.
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#C92C1E]">
                {ownerOptions.length} owner tersedia
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                    Cari Kode Owner / Nama Owner
                  </span>
                  <input
                    value={searchOwner}
                    onChange={(event) => handleChangeOwnerSearch(event.target.value)}
                    placeholder="Contoh: #45 atau Nur Khaerunisah"
                    className="w-full rounded-2xl border border-red-100 bg-white px-4 py-3 text-xs font-bold outline-none focus:border-[#C92C1E]"
                  />
                </label>

                {dataKelolaan.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-red-200 bg-white p-4 text-xs font-bold leading-5 text-red-500">
                    Data Kelolaan masih kosong. Tambahkan/import data owner dulu di menu Kelolaan Customer.
                  </div>
                )}

                {searchOwner.trim() && filteredOwnerOptions.length > 0 && (
                  <div className="max-h-44 overflow-y-auto rounded-2xl border border-red-100 bg-white shadow-sm">
                    {filteredOwnerOptions.map((owner) => (
                      <button
                        key={owner.key}
                        type="button"
                        onClick={() => handleSelectOwner(owner)}
                        className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left last:border-0 hover:bg-red-50"
                      >
                        <div>
                          <p className="text-xs font-black text-gray-900">
                            {owner.kodeOwner} — {owner.namaOwner}
                          </p>
                          <p className="mt-0.5 text-[11px] font-bold text-gray-400">
                            {owner.outlets.length} outlet tersedia
                          </p>
                        </div>
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-[#C92C1E]">
                          Pilih
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {searchOwner.trim() &&
                  !selectedOwnerOption &&
                  filteredOwnerOptions.length === 0 &&
                  dataKelolaan.length > 0 && (
                    <div className="rounded-2xl border border-dashed border-red-100 bg-white p-4 text-xs font-bold text-gray-400">
                      Owner tidak ditemukan di Data Kelolaan.
                    </div>
                  )}
              </div>

              <div className="rounded-2xl border border-red-100 bg-white p-4 lg:w-64">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                  Owner Terpilih
                </p>

                {selectedOwnerOption ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-black text-gray-900">
                      {selectedOwnerOption.kodeOwner}
                    </p>
                    <p className="text-xs font-bold text-gray-500">
                      {selectedOwnerOption.namaOwner}
                    </p>
                    <p className="inline-flex rounded-full bg-red-50 px-3 py-1 text-[10px] font-black text-[#C92C1E]">
                      {selectedOwnerOption.outlets.length} outlet
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-bold text-gray-400">
                    Belum ada owner dipilih.
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleAddOwner}
                  className="mt-4 w-full rounded-2xl bg-[#C92C1E] px-4 py-3 text-xs font-black text-white transition hover:bg-[#A82216]"
                >
                  + Tambah Owner
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <div>
                  <p className="text-xs font-black text-gray-900">Owner Ditambahkan</p>
                  <p className="mt-1 text-[11px] font-bold text-gray-400">
                    Total komisi owner: {formatRupiah(totalKomisiOwner)}
                  </p>
                </div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black text-[#C92C1E]">
                  {selectedOwners.length} owner
                </span>
              </div>

              {selectedOwners.length === 0 ? (
                <div className="p-5 text-center text-xs font-bold text-gray-400">
                  Belum ada owner ditambahkan.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="p-3 font-black">Kode Owner</th>
                        <th className="p-3 font-black">Nama Owner</th>
                        <th className="p-3 font-black">Info Outlet</th>
                        <th className="p-3 text-right font-black">Komisi</th>
                        <th className="p-3 text-center font-black">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOwners.map((owner) => (
                        <tr key={owner.id} className="border-b border-gray-100 last:border-0">
                          <td className="p-3 font-black text-gray-900">{owner.kodeOwner}</td>
                          <td className="p-3 font-bold text-gray-700">{owner.namaOwner}</td>
                          <td className="p-3 font-bold text-gray-500">
                            {owner.jumlahOutlet} outlet
                            <span className="block text-[11px] text-gray-400">{owner.namaOutlet}</span>
                          </td>
                          <td className="p-3 text-right font-black text-red-600">{formatNumber(owner.komisi)}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveOwner(owner.id)}
                              className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-black text-red-600 hover:bg-red-100"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-gray-200 px-5 py-3 text-xs font-black text-gray-500 transition hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white transition hover:bg-[#A82216]"
            >
              {mode === "edit" ? "Update Mitra" : "Simpan Mitra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}