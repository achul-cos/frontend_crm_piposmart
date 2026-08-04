"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { normalizeAppRole, storeAuthSession } from "@/app/lib/api";

type BackendUser = {
  id?: string | number;
  name?: string;
  full_name?: string;
  username?: string;
  email?: string;
  role?: string;
  role_name?: string;
};

const getUserDisplayName = (value?: string) => {
  if (!value) return "User";

  const cleaned = value
    .replace("@piposmart.id", "")
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .trim();

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function LoginPage() {
  usePageTitle("Login");
  const router = useRouter();

  const [email, setEmail] = useState("admin.001@demo.piposmart.id");
  const [password, setPassword] = useState("Password123!");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const loginResponse = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const loginResult = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginResult?.error?.message || "Login backend gagal.");
      }

      const accessToken = loginResult?.data?.access_token;
      const refreshToken = loginResult?.data?.refresh_token;
      if (!accessToken) throw new Error("Token backend tidak ditemukan.");

      let profileData: BackendUser | null =
        loginResult?.data?.user || loginResult?.data?.profile || null;

      try {
        const profileResponse = await fetch(`${apiUrl}/api/v1/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const profileResult = await profileResponse.json();

        if (profileResponse.ok) {
          profileData = profileResult?.data?.user || profileResult?.data || profileData;
        }
      } catch {
        // The login response can still provide enough profile data for the session.
      }

      const userName =
        profileData?.name ||
        profileData?.full_name ||
        getUserDisplayName(profileData?.email || email);
      const userUsername = profileData?.username || profileData?.email || email.trim();
      const normalizedRole = normalizeAppRole(
        profileData?.role || profileData?.role_name || "ADMIN",
      );

      storeAuthSession({
        access_token: accessToken,
        refresh_token: refreshToken,
        user: { ...profileData, name: userName, email: userUsername, role: normalizedRole },
      });

      router.replace("/");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Login gagal karena backend tidak bisa diakses.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const previewRole = email.toLowerCase().includes("admin")
    ? "Admin"
    : email.toLowerCase().includes("supervisor")
      ? "Supervisor"
      : email.toLowerCase().includes("sales")
        ? "Sales"
        : "Akun Backend";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f7f8] px-4 py-8 font-sans text-slate-900 sm:px-6">
      <div aria-hidden="true" className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-red-100/70 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-orange-100/70 blur-3xl" />

      <section className="relative w-full max-w-[440px] rounded-3xl border border-white/80 bg-white p-6 shadow-[0_24px_64px_-28px_rgba(15,23,42,0.35)] sm:p-8">
        <header className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C92C1E] text-lg font-black text-white shadow-lg shadow-red-200">
            P
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#C92C1E]">
            PipoSmart CRM
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Selamat datang kembali
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Masuk untuk melanjutkan ke dashboard Anda.
          </p>
        </header>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrorMessage("");
              }}
              placeholder="nama@piposmart.id"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:bg-white focus:ring-4 focus:ring-red-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-[#C92C1E] focus-within:bg-white focus-within:ring-4 focus-within:ring-red-100">
              <input
                id="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage("");
                }}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Masukkan password"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="px-4 text-sm font-semibold text-slate-500 transition hover:text-[#C92C1E]"
              >
                {showPassword ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>
          </div>

          {email && (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">Akses terdeteksi</span>
              <span className="font-semibold text-slate-800">{previewRole}</span>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#C92C1E] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#ab2318] focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isLoading ? "Menghubungkan..." : "Masuk ke CRM"}
          </button>
        </form>

        <footer className="mt-7 border-t border-slate-100 pt-5 text-center">
          <p className="text-xs leading-5 text-slate-400">
            Gunakan akun yang telah terdaftar pada sistem PipoSmart.
          </p>
        </footer>
      </section>
    </main>
  );
}
