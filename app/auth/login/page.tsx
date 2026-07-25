"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useSession } from "@/app/lib/auth/session";
import type { SessionPayload } from "@/app/lib/api/types";

const getRoleClass = (role: string) => {
  if (role === "Admin") return "border-purple-100 bg-purple-50 text-purple-700";
  if (role === "Developer") return "border-red-100 bg-red-50 text-[#C92C1E]";
  if (role === "Supervisor") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-gray-100 bg-gray-50 text-gray-500";
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { applySession } = useSession();

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
      // Login lewat Route Handler (BFF). Route Handler yang menyimpan refresh
      // token ke cookie httpOnly; browser hanya menerima access token +
      // profil. Tidak ada lagi token yang ditulis ke localStorage.
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const loginResult = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginResult?.error?.message || "Login gagal.");
      }

      const session = loginResult as SessionPayload;

      if (!session.access_token) {
        throw new Error("Token backend tidak ditemukan pada response login.");
      }

      // Simpan sesi di memory (bukan storage) dan mulai timer auto-refresh.
      applySession(session);

      // Kembalikan pengguna ke tujuan awal bila proxy.ts mengarahkannya kemari.
      const nextPath = searchParams.get("next");
      router.replace(nextPath && nextPath.startsWith("/") ? nextPath : "/");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Login gagal karena backend tidak bisa diakses.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const previewRole = email.toLowerCase().includes("admin") ? "Admin" : "User";

  return (
    <main className="min-h-screen bg-[#F6F7F9] px-4 py-8 font-sans text-[#1C1C1E]">
      <div className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <section className="hidden rounded-[32px] border border-red-100 bg-white p-8 shadow-sm lg:block">
          <div className="inline-flex rounded-full border border-red-100 bg-red-50 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#C92C1E]">
            CRM PIPOSMART
          </div>

          <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight text-gray-950">
            Login Workspace Data Kelolaan Nasabah
          </h1>

          <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-gray-500">
            Masuk menggunakan akun backend CRM. Sistem akan menyimpan access token
            dan refresh token cookie agar sesi login tetap berjalan.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-purple-100 bg-purple-50/60 p-5">
              <p className="text-xs font-black uppercase text-purple-700">
                Admin
              </p>
              <p className="mt-2 text-sm font-bold text-gray-700">
                Akses utama sistem
              </p>
            </div>

            <div className="rounded-3xl border border-red-100 bg-red-50/50 p-5">
              <p className="text-xs font-black uppercase text-[#C92C1E]">
                Access Token
              </p>
              <p className="mt-2 text-sm font-bold text-gray-700">
                Dipakai untuk request API
              </p>
            </div>

            <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5">
              <p className="text-xs font-black uppercase text-amber-700">
                Refresh Token
              </p>
              <p className="mt-2 text-sm font-bold text-gray-700">
                Disimpan via cookie backend
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#C92C1E]">
              Login Akun
            </p>
            <h2 className="mt-2 text-2xl font-black text-gray-950">
              Masuk ke CRM
            </h2>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Masuk menggunakan email dan password backend.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="login-email"
                className="text-[10px] font-black uppercase tracking-wider text-gray-400"
              >
                Email
              </label>
              <input
                id="login-email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Contoh: admin.001@demo.piposmart.id"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 outline-none transition focus:border-[#C92C1E]"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="login-password"
                className="text-[10px] font-black uppercase tracking-wider text-gray-400"
              >
                Password
              </label>
              <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white focus-within:border-[#C92C1E]">
                <input
                  id="login-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrorMessage("");
                  }}
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  className="min-w-0 flex-1 px-4 py-3 text-sm font-bold text-gray-800 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="border-l border-gray-100 px-4 text-xs font-black text-gray-500 hover:bg-gray-50"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {email && (
              <div className={`rounded-2xl border px-4 py-3 ${getRoleClass(previewRole)}`}>
                <p className="text-[10px] font-black uppercase">
                  Login Backend
                </p>
                <p className="mt-1 text-sm font-black">
                  {email}
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#A82216] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isLoading ? "Menghubungkan ke Backend..." : "Login Sekarang"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
              Akun Local Demo
            </p>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-black text-gray-900">
                admin.001@demo.piposmart.id
              </p>
              <p className="mt-1 text-[11px] font-medium text-gray-400">
                Gunakan password demo yang tersedia dari backend.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * `useSearchParams` (dipakai untuk membaca `?next=`) wajib berada di dalam
 * batas <Suspense> pada Next.js 16, jika tidak build akan gagal.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}