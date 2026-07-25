"use client";

import { MitraItem } from "../page";

type MitraDetailModalProps = {
  open: boolean;
  mitra: MitraItem | null;
  onClose: () => void;
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

const formatTanggalPendek = (value: string) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
};

const getTotalKomisi = (mitra: MitraItem) => {
  return mitra.owners.reduce((total, owner) => total + Number(owner.komisi || 0), 0);
};

const DetailCard = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-red-100 bg-red-50 text-[#C92C1E]"
          : "border-gray-100 bg-gray-50 text-gray-900"
      }`}
    >
      <p className={`text-[10px] font-black uppercase tracking-wider ${highlight ? "text-[#C92C1E]" : "text-gray-400"}`}>
        {label}
      </p>
      <p className="mt-1 text-sm font-black">{value || "-"}</p>
    </div>
  );
};

export default function MitraDetailModal({
  open,
  mitra,
  onClose,
}: MitraDetailModalProps) {
  if (!open || !mitra) return null;

  const totalKomisi = getTotalKomisi(mitra);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-6 w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#C92C1E] via-[#D73728] to-[#FF8A65] p-5 text-white">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/15" />
          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/10" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/75">
                Detail Mitra
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {mitra.namaMitra}
              </h2>
              <p className="mt-1 text-xs font-medium leading-5 text-white/80">
                Detail data mitra, owner, jumlah outlet, status pencairan, dan riwayat komisi.
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

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailCard label="Mitra" value={mitra.namaMitra} />
            <DetailCard label="Kategori Mitra" value={mitra.kategoriMitra} />
            <DetailCard label="Paket Langganan" value={mitra.paketLangganan} />
            <DetailCard label="Harga Berlangganan" value={formatRupiah(mitra.hargaBerlangganan)} />
            <DetailCard label="Jenis Komisi" value={mitra.jenisKomisi} />
            <DetailCard label="PIC" value={mitra.pic} />
            <DetailCard label="Tanggal Kerjasama" value={formatTanggalPendek(mitra.tanggalKerjasama)} />
            <DetailCard label="Status" value={mitra.status} />
            <DetailCard label="Pencairan 1" value={formatTanggalPendek(mitra.tanggalPencairan1)} />
            <DetailCard label="Pencairan 2" value={formatTanggalPendek(mitra.tanggalPencairan2)} />
            <DetailCard label="Status Pencairan" value={mitra.statusPencairan} />
            <DetailCard label="Total Komisi" value={formatRupiah(totalKomisi)} highlight />
          </div>

          {mitra.catatan && (
            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 text-xs font-bold leading-5 text-red-700">
              {mitra.catatan}
            </div>
          )}

          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900">
                  Riwayat Owner & Komisi
                </h3>
                <p className="mt-1 text-xs font-medium text-gray-400">
                  Owner yang terhubung dengan mitra ini.
                </p>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-right">
                <p className="text-[10px] font-black uppercase text-[#C92C1E]">Total Komisi</p>
                <p className="mt-1 text-lg font-black text-[#C92C1E]">
                  {formatRupiah(totalKomisi)}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-[820px] w-full text-left text-xs">
                <thead className="bg-[#C92C1E] text-white">
                  <tr>
                    <th className="p-3 font-black">Tanggal</th>
                    <th className="p-3 font-black">Kode Owner</th>
                    <th className="p-3 font-black">Nama Owner</th>
                    <th className="p-3 font-black">Info Outlet</th>
                    <th className="p-3 text-right font-black">Komisi</th>
                  </tr>
                </thead>

                <tbody>
                  {mitra.owners.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-xs font-bold text-gray-400">
                        Belum ada riwayat komisi.
                      </td>
                    </tr>
                  ) : (
                    mitra.owners.map((owner) => (
                      <tr key={owner.id} className="border-b border-gray-100 last:border-0">
                        <td className="p-3 font-bold text-gray-500">{formatTanggalPendek(owner.tanggal)}</td>
                        <td className="p-3 font-black text-gray-900">{owner.kodeOwner}</td>
                        <td className="p-3 font-bold text-gray-700">{owner.namaOwner}</td>
                        <td className="p-3 font-bold text-gray-500">
                          {owner.jumlahOutlet || 1} outlet
                          <span className="block text-[11px] text-gray-400">{owner.namaOutlet}</span>
                        </td>
                        <td className="p-3 text-right font-black text-red-600">{formatNumber(owner.komisi)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-xs font-black text-white transition hover:bg-[#A82216]"
            >
              Tutup Detail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}