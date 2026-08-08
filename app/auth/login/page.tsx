"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
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

  useEffect(() => {
    if (!document.querySelector("script[src*='lottie-player']")) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const [email, setEmail] = useState("admin@piposmart.id");
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f7f8] p-4 sm:p-6 md:p-10 font-sans text-slate-900">
      <style>{`
        @keyframes mascotFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-18px) rotate(2deg);
          }
        }
        @keyframes mascotShadow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.55;
          }
          50% {
            transform: scale(0.68);
            opacity: 0.25;
          }
        }
        @keyframes bubbleFloat1 {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); opacity: 0.6; }
          50% { transform: translateY(-22px) translateX(10px) scale(1.1); opacity: 0.85; }
        }
        @keyframes bubbleFloat2 {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); opacity: 0.5; }
          50% { transform: translateY(-28px) translateX(-12px) scale(1.15); opacity: 0.8; }
        }
        @keyframes bubbleFloat3 {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); opacity: 0.4; }
          50% { transform: translateY(-16px) translateX(8px) scale(1.08); opacity: 0.75; }
        }
        .animate-mascot-float {
          animation: mascotFloat 4s ease-in-out infinite;
        }
        .animate-mascot-shadow {
          animation: mascotShadow 4s ease-in-out infinite;
        }
        .animate-bubble-1 { animation: bubbleFloat1 5s ease-in-out infinite; }
        .animate-bubble-2 { animation: bubbleFloat2 6.5s ease-in-out infinite 1s; }
        .animate-bubble-3 { animation: bubbleFloat3 4.5s ease-in-out infinite 0.5s; }
        @keyframes lottieWalkOuter {
          0% {
            transform: translateX(calc(-50vw + 80px)) scaleX(1);
          }
          49% {
            transform: translateX(calc(50vw - 80px)) scaleX(1);
          }
          50% {
            transform: translateX(calc(50vw - 80px)) scaleX(-1);
          }
          99% {
            transform: translateX(calc(-50vw + 80px)) scaleX(-1);
          }
          100% {
            transform: translateX(calc(-50vw + 80px)) scaleX(1);
          }
        }
        .animate-lottie-walk-outer {
          animation: lottieWalkOuter 14s linear infinite;
          will-change: transform;
        }
        .lottie-red-tint {
          filter: drop-shadow(0 2px 8px rgba(201, 44, 30, 0.5))
                  sepia(1) saturate(10) hue-rotate(-50deg) contrast(1.1);
        }
      `}</style>

      <div aria-hidden="true" className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-red-100/60 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -right-24 h-[30rem] w-[30rem] rounded-full bg-orange-100/60 blur-3xl" />

      <section className="relative flex w-full max-w-5xl lg:max-w-6xl flex-col-reverse overflow-hidden rounded-[36px] border border-white/80 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.3)] md:flex-row">
        {/* Card 1: Form Login (Left Card) */}
        <div className="flex w-full flex-col justify-between bg-white p-8 sm:p-12 md:w-1/2 md:p-14 lg:p-16">
          <div>
            <header className="mb-8">
              <img
                src="/assets/logo.png"
                alt="PipoSmart Logo"
                className="h-14 sm:h-16 w-auto object-contain mb-6"
              />
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950">
                Selamat Datang Kembali
              </h1>
              <p className="mt-2 text-sm sm:text-base font-medium text-slate-500">
                Masukkan email & password untuk mengakses sistem.
              </p>
            </header>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C92C1E] focus:bg-white focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-[#C92C1E] focus-within:bg-white focus-within:ring-4 focus-within:ring-red-100">
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
                    className="min-w-0 flex-1 bg-transparent px-5 py-4 text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    className="px-4 flex items-center justify-center text-slate-400 transition hover:text-[#C92C1E]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {email && (
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-5 py-3.5 text-xs font-bold">
                  <span className="text-slate-500">Akses terdeteksi</span>
                  <span className="font-extrabold text-[#C92C1E]">{previewRole}</span>
                </div>
              )}

              {errorMessage && (
                <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-xs font-bold text-red-700">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-[#C92C1E] px-6 py-4 text-base font-extrabold text-white shadow-xl shadow-red-500/20 transition-all hover:bg-[#ab2318] focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {isLoading ? "Menghubungkan..." : "Masuk ke CRM"}
              </button>
            </form>
          </div>

          <footer className="mt-8 border-t border-slate-100 pt-5 text-center md:text-left">
            <p className="text-xs font-medium text-slate-400">
              © {new Date().getFullYear()} PipoSmart CRM • All Rights Reserved
            </p>
          </footer>
        </div>

        {/* Card 2: Maskot & Branding dengan Animasi Melayang & Gelembung (Right Card) */}
        <div className="relative flex w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#C92C1E] via-[#B82518] to-[#8C180E] p-8 sm:p-12 md:w-1/2 md:p-14 lg:p-16 text-white">
          <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-black/20 blur-2xl" />

          {/* Animated Soap Bubbles Decorative Floating Elements */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-bubble-1 absolute left-8 top-16 h-10 w-10 rounded-full border border-white/40 bg-white/15 backdrop-blur-xs shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]" />
            <div className="animate-bubble-2 absolute right-12 top-28 h-14 w-14 rounded-full border border-white/50 bg-white/20 backdrop-blur-xs shadow-[inset_0_3px_6px_rgba(255,255,255,0.7)]" />
            <div className="animate-bubble-3 absolute bottom-24 left-12 h-8 w-8 rounded-full border border-white/35 bg-white/10 backdrop-blur-xs shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)]" />
            <div className="animate-bubble-1 absolute bottom-36 right-16 h-12 w-12 rounded-full border border-white/40 bg-white/15 backdrop-blur-xs shadow-[inset_0_2px_5px_rgba(255,255,255,0.6)]" />
            <div className="animate-bubble-2 absolute left-1/4 top-1/2 h-6 w-6 rounded-full border border-white/30 bg-white/10 backdrop-blur-xs shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]" />
            <div className="animate-bubble-3 absolute right-1/4 bottom-14 h-16 w-16 rounded-full border border-white/30 bg-white/10 backdrop-blur-xs shadow-[inset_0_3px_6px_rgba(255,255,255,0.5)]" />
          </div>

          <div className="relative z-10 flex justify-end">
            <img
              src="/assets/logo teks.png"
              alt="PipoSmart Logo Teks"
              className="h-7 sm:h-8 w-auto object-contain brightness-0 invert drop-shadow-md"
            />
          </div>

          <div className="relative z-10 my-8 flex flex-col items-center justify-center text-center">
            <div className="relative flex items-center justify-center">
              <img
                src="/assets/maskot.png"
                alt="PipoSmart Maskot"
                className="animate-mascot-float h-56 sm:h-72 md:h-80 lg:h-[340px] max-h-[360px] w-auto object-contain drop-shadow-2xl"
              />

            </div>

            {/* Dynamic Ground Shadow */}
            <div className="animate-mascot-shadow -mt-3.5 h-5 w-40 sm:w-56 md:w-64 rounded-[100%] bg-black/50 blur-md" />
          </div>

          <div className="relative z-10 space-y-2 text-center md:text-right">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Kelola Operasional CRM Lebih Mudah
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed text-red-100/90">
              Solusi terpadu manajemen lead, outlet, dan mitra usaha laundry bersama PipoSmart.
            </p>
          </div>
        </div>
      </section>

      {/* Lottie Animated Character (Outside Card at the Bottom, Colored Red, Hardware-Accelerated) */}
      <div className="absolute bottom-2 sm:bottom-3 left-0 right-0 z-30 flex justify-center pointer-events-none w-full">
        <div className="animate-lottie-walk-outer lottie-red-tint h-14 w-14 sm:h-18 sm:w-18">
          <lottie-player
            src="/assets/Sweet%20run%20cycle.json"
            background="transparent"
            speed="1"
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>
    </main>
  );
}
