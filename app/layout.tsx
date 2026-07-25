import React from "react";
import "./globals.css";

import { QueryProvider } from "@/app/lib/query-provider";
import { SessionProvider } from "@/app/lib/auth/session";
import AppShell from "@/app/components/AppShell";

/**
 * Root layout.
 *
 * Sekarang tipis: hanya memasang provider global dan kerangka aplikasi.
 * Chrome sidebar dan penyaringan menu pindah ke `AppShell`; guard rute pindah
 * ke `proxy.ts` (server-side). Guard lama berbasis `useEffect` + `localStorage`
 * yang ada di sini sudah dihapus.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-[#FAF9F6] text-[#2C2C2E] antialiased font-sans">
        <QueryProvider>
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
