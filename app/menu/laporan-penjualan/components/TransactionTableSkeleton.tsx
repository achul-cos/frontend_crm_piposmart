import React from "react";

export default function TransactionTableSkeleton() {
  const skeletonRows = Array.from({ length: 15 });

  return (
    <div className="flex flex-col bg-white">
      <div className="overflow-x-auto">
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
            {skeletonRows.map((_, index) => (
              <tr key={index} className="animate-pulse">
                {/* No */}
                <td className="px-3 py-3">
                  <div className="h-3 w-4 rounded bg-gray-200"></div>
                </td>
                {/* Customer */}
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="h-3.5 w-24 rounded bg-gray-200"></div>
                    <div className="h-2.5 w-16 rounded bg-gray-100"></div>
                  </div>
                </td>
                {/* PIC */}
                <td className="px-3 py-3">
                  <div className="h-3.5 w-20 rounded bg-gray-200"></div>
                </td>
                {/* Paket */}
                <td className="px-3 py-3">
                  <div className="h-4 w-12 rounded-full bg-gray-200"></div>
                </td>
                {/* Promo */}
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="h-3 w-20 rounded bg-gray-200"></div>
                    <div className="h-3 w-16 rounded bg-gray-100"></div>
                  </div>
                </td>
                {/* Tanggal Closing */}
                <td className="px-3 py-3">
                  <div className="h-3 w-16 rounded bg-gray-200"></div>
                </td>
                {/* Tanggal Berakhir */}
                <td className="px-3 py-3">
                  <div className="h-3 w-16 rounded bg-gray-200"></div>
                </td>
                {/* Sisa Hari */}
                <td className="px-3 py-3">
                  <div className="h-4 w-10 rounded-md bg-gray-200"></div>
                </td>
                {/* Total Bayar */}
                <td className="px-3 py-3 text-right">
                  <div className="ml-auto h-3.5 w-16 rounded bg-gray-200"></div>
                </td>
                {/* Status */}
                <td className="px-3 py-3">
                  <div className="mx-auto h-5 w-20 rounded-full bg-gray-200"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
