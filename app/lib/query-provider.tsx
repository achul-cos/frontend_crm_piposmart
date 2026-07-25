"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ApiError } from "@/app/lib/api/client";

/**
 * Penyedia cache server-state.
 *
 * QueryClient dibuat di dalam `useState` supaya tiap sesi browser memakai
 * instance sendiri dan cache tidak bocor antar-request saat render di server.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // 4xx berarti permintaannya memang salah (validasi, hak akses,
              // data tidak ada) — mengulang tidak akan mengubah hasilnya.
              if (
                error instanceof ApiError &&
                error.status >= 400 &&
                error.status < 500
              ) {
                return false;
              }

              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
