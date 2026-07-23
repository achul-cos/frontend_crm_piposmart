import React from "react";
import { Eye, Search } from "lucide-react";
import { SalesTransaction } from "../types";
import { formatRupiah, differenceInDays } from "../utils";

type TransactionTableProps = {
  filtered: SalesTransaction[];
  setSelectedTrx: (trx: SalesTransaction) => void;
  startIndex: number;
};

export const getStatusBadge = (status: SalesTransaction["statusBerlangganan"]) => {
  switch (status) {
    case "New":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-blue-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"></span>
          New
        </span>
      );
    case "Berlangganan":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          Berlangganan
        </span>
      );
    case "Jatuh Tempo":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500"></span>
          Jatuh Tempo
        </span>
      );
    case "Expired":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-gray-500">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
          Expired
        </span>
      );
  }
};

export default function TransactionTable({
  filtered,
  setSelectedTrx,
  startIndex,
}: TransactionTableProps) {


  const getSisaHariBadge = (diff: number) => {
    if (diff < 0) return <span className="rounded-md bg-red-100 px-2 py-1 text-[10px] font-black text-red-700">Expired</span>;
    if (diff <= 7) return <span className="rounded-md bg-red-100 px-2 py-1 text-[10px] font-black text-red-700">{diff} Hari</span>;
    if (diff <= 30) return <span className="rounded-md bg-yellow-100 px-2 py-1 text-[10px] font-black text-yellow-700">{diff} Hari</span>;
    return <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-black text-gray-600">{diff} Hari</span>;
  };

  const getPaketBadge = (paketName: string) => {
    const name = paketName.toLowerCase();
    if (name.includes("pro")) return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-black text-red-600">{paketName}</span>;
    if (name.includes("business")) return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-black text-green-700">{paketName}</span>;
    return <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-black text-orange-600">{paketName}</span>;
  };

  return (
    <div className="flex flex-col bg-white">
      <div className="h-[calc(100vh-310px)] overflow-y-auto overflow-x-auto relative scrollbar-thin scrollbar-thumb-gray-200">
        <table className="w-full border-collapse text-left text-[11px] font-medium text-gray-600">
          <thead className="sticky top-0 z-10 bg-[#C92C1E] text-white shadow-sm">
            <tr>
              <th className="whitespace-nowrap px-3 py-2.5 font-black">No</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-black">Customer</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-black">PIC</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-black">Paket</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-black">Promo</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-black">Tanggal Closing</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-black">Tanggal Berakhir</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-black">Sisa Hari</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-black text-right">Total Bayar</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-black text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((trx, index) => {
              const diff = differenceInDays(trx.waktuBerakhir, new Date());
              
              return (
                <tr 
                  key={trx.id} 
                  onClick={() => setSelectedTrx(trx)}
                  className="transition cursor-pointer group hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-[10px] text-gray-400 group-hover:text-gray-600">
                    {startIndex + index + 1}
                  </td>
                  
                  {/* Customer Cell */}
                  <td className="px-3 py-2 min-w-[140px] break-words">
                    <div className="flex flex-col leading-tight">
                      <span className="font-bold text-gray-900">{trx.customerName}</span>
                      <span className="text-[9px] text-gray-400">{trx.kodeOwner}</span>
                    </div>
                  </td>
                  
                  {/* PIC Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {!trx.pic || trx.pic === "No PIC" ? (
                      <span className="italic text-gray-400">No PIC</span>
                    ) : trx.pic === "Invalid" ? (
                      <span className="italic text-red-500">Invalid</span>
                    ) : (
                      <span className="font-bold text-gray-700">{trx.pic}</span>
                    )}
                  </td>
                  
                  {/* Paket Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {getPaketBadge(trx.snapshot.namaPaket)}
                  </td>
                  
                  {/* Promo Cell */}
                  <td className="px-3 py-2 min-w-[130px] max-w-[180px] whitespace-normal break-words">
                    <div className="flex flex-col gap-1 items-start">
                      <div className="text-[10px] font-medium text-gray-600 leading-tight">
                        {trx.paket}
                      </div>
                      {trx.snapshot.jenisPromo === "bundling" && (
                        <span className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-[8px] font-bold text-purple-700">
                          + {trx.snapshot.bundlingItems?.length || 0} Alat Bundling
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* Tanggal Closing Cell */}
                  <td className="px-3 py-2 whitespace-nowrap text-[10px] font-bold text-gray-500">
                    {new Date(trx.tanggalClosing).toLocaleDateString("id-ID", {
                      day: "2-digit", month: "short", year: "numeric"
                    })}
                  </td>
                  
                  {/* Tanggal Berakhir Cell */}
                  <td className="px-3 py-2 whitespace-nowrap text-[10px] font-bold text-gray-500">
                    {new Date(trx.waktuBerakhir).toLocaleDateString("id-ID", {
                      day: "2-digit", month: "short", year: "numeric"
                    })}
                  </td>
                  
                  {/* Sisa Hari Cell */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {getSisaHariBadge(diff)}
                  </td>
                  
                  {/* Total Bayar Cell */}
                  <td className="px-3 py-2 whitespace-nowrap text-right font-black text-gray-900">
                    {formatRupiah(trx.hargaAktual)}
                  </td>
                  
                  {/* Status Cell */}
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    {getStatusBadge(trx.statusBerlangganan)}
                  </td>
                </tr>
              );
            })}
            
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                      <Search className="h-7 w-7 text-gray-300" />
                    </div>
                    <p className="text-sm font-black text-gray-400">Tidak ada data</p>
                    <p className="text-xs font-medium text-gray-400">
                      Coba ubah filter pencarian.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
