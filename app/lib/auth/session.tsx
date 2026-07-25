"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { registerTokenProvider } from "@/app/lib/api/client";
import type { AuthUser, SessionPayload } from "@/app/lib/api/types";

type SessionState = {
  user: AuthUser | null;
  /** `true` selama upaya pemulihan sesi pertama kali (hidrasi). */
  isLoading: boolean;
  permissions: string[];
  getAccessToken: () => Promise<string | null>;
  applySession: (payload: SessionPayload) => void;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

/**
 * Refresh dijadwalkan pada 90% umur access token (899 s → ±809 s),
 * memberi jeda aman sebelum token benar-benar kedaluwarsa.
 */
const REFRESH_RATIO = 0.9;
const MIN_REFRESH_DELAY_MS = 30_000;

/**
 * Penyimpan sesi.
 *
 * Access token disimpan di dalam `useRef` — sengaja TIDAK di localStorage atau
 * sessionStorage. Konsekuensinya token hilang saat halaman dimuat ulang, dan
 * itu memang diinginkan: token dipulihkan lewat cookie refresh yang httpOnly
 * (lihat `app/api/auth/refresh/route.ts`).
 */
export function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const accessTokenRef = useRef<string | null>(null);
  const expiresAtRef = useRef<number>(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Menyatukan panggilan refresh yang bersamaan menjadi satu request. */
  const inFlightRefreshRef = useRef<Promise<string | null> | null>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /**
   * Bertambah setiap kali sesi baru diterapkan. Satu-satunya tujuannya
   * memicu efek penjadwalan auto-refresh di bawah, TANPA membuat
   * `applySession` merujuk `refresh` secara langsung — dua `useCallback`
   * yang saling menjadi dependency akan membentuk siklus yang tidak bisa
   * dituntaskan React (maupun linter-nya, yang memeriksa urutan deklarasi).
   */
  const [sessionVersion, setSessionVersion] = useState(0);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    expiresAtRef.current = 0;
    clearRefreshTimer();
    setUser(null);
  }, [clearRefreshTimer]);

  /** Menerapkan payload sesi baru. Tidak menjadwalkan apa pun sendiri. */
  const applySession = useCallback((payload: SessionPayload) => {
    accessTokenRef.current = payload.access_token;
    expiresAtRef.current = Date.now() + payload.expires_in * 1000;
    setUser(payload.user);
    setSessionVersion((version) => version + 1);
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (inFlightRefreshRef.current) {
      return inFlightRefreshRef.current;
    }

    const attempt = (async () => {
      try {
        const response = await fetch("/api/auth/refresh", { method: "POST" });

        if (!response.ok) {
          clearSession();
          return null;
        }

        const payload: SessionPayload = await response.json();
        applySession(payload);
        return payload.access_token;
      } catch {
        clearSession();
        return null;
      } finally {
        inFlightRefreshRef.current = null;
      }
    })();

    inFlightRefreshRef.current = attempt;
    return attempt;
  }, [clearSession, applySession]);

  /**
   * Menjadwalkan auto-refresh setiap kali `sessionVersion` bertambah.
   * Saat efek ini berjalan, `expiresAtRef.current` sudah pasti ter-update —
   * ref ditulis secara sinkron oleh `applySession` sebelum React commit ulang.
   */
  useEffect(() => {
    if (sessionVersion === 0) return;

    clearRefreshTimer();

    const delayMs = Math.max(
      (expiresAtRef.current - Date.now()) * REFRESH_RATIO,
      MIN_REFRESH_DELAY_MS,
    );

    refreshTimerRef.current = setTimeout(() => {
      void refresh();
    }, delayMs);

    return clearRefreshTimer;
  }, [sessionVersion, refresh, clearRefreshTimer]);

  /**
   * Hidrasi saat halaman pertama dimuat: access token hilang setiap reload,
   * jadi selalu coba tukar cookie refresh dengan token baru.
   */
  useEffect(() => {
    let active = true;

    void (async () => {
      await refresh();
      if (active) setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [refresh]);

  const getAccessToken = useCallback(
    async (options?: { force?: boolean }): Promise<string | null> => {
      const token = accessTokenRef.current;
      const isExpiringSoon = Date.now() > expiresAtRef.current - 30_000;

      if (token && !isExpiringSoon && !options?.force) {
        return token;
      }

      return refresh();
    },
    [refresh],
  );

  // Hubungkan API client ke sesi ini, supaya `apiFetch` bisa memasang header
  // Authorization dan memicu refresh saat menerima 401.
  useEffect(() => {
    registerTokenProvider(getAccessToken);
  }, [getAccessToken]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearSession();
      router.replace("/auth/login");
    }
  }, [clearSession, router]);

  const value = useMemo<SessionState>(
    () => ({
      user,
      isLoading,
      permissions: user?.permissions ?? [],
      getAccessToken,
      applySession,
      logout,
    }),
    [user, isLoading, getAccessToken, applySession, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession harus dipakai di dalam <SessionProvider>.");
  }

  return context;
}
