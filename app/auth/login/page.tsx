"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

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

const normalizeRole = (role?: string) => {
  if (!role) return "Admin";

  const value = role.toLowerCase();

  if (value.includes("developer")) return "Developer";
  if (value.includes("supervisor")) return "Supervisor";
  if (value.includes("sales")) return "Sales";
  if (value.includes("admin")) return "Admin";

  return role;
};

const getRoleClass = (role: string) => {
  if (role === "Admin") return "border-purple-100 bg-purple-50 text-purple-700";
  if (role === "Developer") return "border-red-100 bg-red-50 text-[#C92C1E]";
  if (role === "Supervisor") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-gray-100 bg-gray-50 text-gray-500";
};

export default function LoginPage() {
  usePageTitle("Login");
  const router = useRouter();

  const [email, setEmail] = useState("admin.001@demo.piposmart.id");
  const [password, setPassword] = useState("Password123!");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [demoTab, setDemoTab] = useState<"owner" | "outlet" | "lead">("owner");
  const [demoAction, setDemoAction] = useState<"view" | "edit" | "delete" | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

      const loginResponse = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: "POST",
        credentials: "include",
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
        throw new Error(loginResult?.error?.message || "Login backend gagal.");
      }

      const accessToken = loginResult?.data?.access_token;

      if (!accessToken) {
        throw new Error("Token backend tidak ditemukan.");
      }

      let profileData: BackendUser | null =
        loginResult?.data?.user ||
        loginResult?.data?.profile ||
        null;

      try {
        const profileResponse = await fetch(`${apiUrl}/api/v1/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const profileResult = await profileResponse.json();

        if (profileResponse.ok) {
          profileData =
            profileResult?.data?.user ||
            profileResult?.data ||
            profileData;
        }
      } catch {
        profileData = profileData;
      }

      const userName =
        profileData?.name ||
        profileData?.full_name ||
        getUserDisplayName(profileData?.email || email);

      const userUsername =
        profileData?.username ||
        profileData?.email ||
        email.trim();

      const userRole = normalizeRole(
        profileData?.role ||
          profileData?.role_name ||
          "Admin",
      );

      localStorage.setItem("piposmart_access_token", accessToken);
      localStorage.setItem("piposmart_is_logged_in", "true");
      localStorage.setItem("piposmart_user_name", userName);
      localStorage.setItem("piposmart_user_role", userRole);
      localStorage.setItem("piposmart_user_username", userUsername);
      localStorage.setItem(
        "piposmart_user",
        JSON.stringify({
          name: userName,
          username: userUsername,
          role: userRole,
        }),
      );

      router.replace("/");
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
    <main className="flex min-h-screen w-full font-sans text-[#1C1C1E]">
      <section className="relative hidden w-1/2 items-end justify-center overflow-hidden bg-gradient-to-br from-white via-white to-red-50/40 pb-[2%] lg:flex">
          <div className="flex w-full flex-col gap-10 px-[3%]">
          <div style={{ transform: "translateY(-36px)" }}>
            <div className="inline-flex w-fit rounded-full border border-red-100 bg-red-50 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#C92C1E]">
              V.0.1 Under Development
            </div>

            <h1 className="mt-6 max-w-md text-4xl font-black leading-tight text-gray-950">
              CRM Piposmart
            </h1>

            <p className="mt-4 max-w-md text-sm font-medium leading-6 text-gray-500">
              Pantau data owner &amp; outlet, follow up lead penjualan, kelola saldo
              wallet, dan langganan paket pelanggan — semua terhubung langsung
              dengan CRM Piposmart.
            </p>
          </div>

          {/*
            Satu wrapper grid 2 kolom (bukan dua elemen absolute terpisah) supaya kedua
            cluster komponen TIDAK PERNAH bertumpuk — masing-masing terkunci di kolomnya
            sendiri oleh grid, bukan mengandalkan perhitungan lebar manual.
          */}
          <div className="grid grid-cols-2 items-end gap-6">
          <div className="grid w-full grid-cols-2 gap-3 justify-self-start">
            <div className="pointer-events-none col-span-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
              <div className="border-b border-gray-200 bg-[#f9fafb] px-3 py-2 text-[8px] font-black uppercase tracking-wider text-gray-400">
                Kode &nbsp;·&nbsp; Owner &nbsp;·&nbsp; Status
              </div>
              <div className="divide-y divide-gray-100 text-[10px] font-semibold text-gray-600">
                <div className="flex items-center justify-between px-3 py-2">
                  <span>OWN-014</span>
                  <span>Budi S.</span>
                  <span className="font-black text-emerald-600">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span>OWN-021</span>
                  <span>Rani P.</span>
                  <span className="font-black text-gray-400">TRIAL</span>
                </div>
              </div>
            </div>

            <div className="pointer-events-none rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-4 text-white shadow-lg">
              <p className="text-[9px] font-black uppercase tracking-wider text-red-100">
                Total Owner
              </p>
              <p className="mt-1 text-2xl font-black">1.284</p>
              <p className="mt-1 text-[9px] font-bold text-red-100/80">
                +12 minggu ini
              </p>
            </div>

            <div className="pointer-events-none flex flex-col justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
              <p className="mb-0.5 text-[8px] font-black uppercase tracking-wider text-gray-400">
                Status Lead
              </p>
              <span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700">
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                Potensial
              </span>
              <span className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700">
                Kemungkinan
              </span>
            </div>

            <div className="pointer-events-none flex flex-col justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
              <div className="rounded-lg bg-[#C92C1E] px-3 py-2 text-[10px] font-bold text-white">
                Owner
              </div>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500">
                Outlet
              </div>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500">
                Lead
              </div>
            </div>

            {/* Satu-satunya komponen yang benar-benar interaktif di showcase ini — segmented tab yang bisa diklik */}
            <div className="flex flex-col justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
              <p className="text-[8px] font-black uppercase tracking-wider text-gray-400">
                Coba Tab Ini
              </p>
              <div className="flex rounded-lg border border-gray-200/50 bg-gray-100 p-1">
                {(["owner", "outlet", "lead"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDemoTab(tab)}
                    className={`flex-1 rounded-md px-2 py-1 text-[9px] font-black capitalize transition-all ${
                      demoTab === tab
                        ? "bg-white text-[#C92C1E] shadow-sm"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Showcase kedua — kolom kanan, tersusun segitiga (1 / 2 / 3 / 4) */}
          <div className="flex flex-col items-end justify-self-end gap-3">
            <div className="pointer-events-none flex justify-end gap-3">
              <div className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-amber-700 shadow-lg">
                Refresh Token
              </div>
            </div>

            <div className="pointer-events-none flex justify-end gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-lg">
                <p className="text-[8px] font-black uppercase tracking-wider text-gray-400">
                  Paket Aktif
                </p>
                <p className="mt-0.5 text-xs font-black text-gray-900">
                  Rp 150rb/bln
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-red-50 text-[10px] font-black text-[#C92C1E] shadow-lg">
                AD
              </div>
            </div>

            {/* Trio icon-button ini sungguhan interaktif (hover + klik memberi highlight), meniru kolom Aksi di semua tabel */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDemoAction("view")}
                title="Lihat"
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-blue-600 shadow-lg transition-all hover:scale-105 hover:bg-blue-100 ${
                  demoAction === "view" ? "border-blue-300 bg-blue-100 ring-2 ring-blue-200" : "border-blue-100 bg-blue-50"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setDemoAction("edit")}
                title="Edit"
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-orange-600 shadow-lg transition-all hover:scale-105 hover:bg-orange-100 ${
                  demoAction === "edit" ? "border-orange-300 bg-orange-100 ring-2 ring-orange-200" : "border-orange-100 bg-orange-50"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setDemoAction("delete")}
                title="Hapus"
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-gray-500 shadow-lg transition-all hover:scale-105 hover:bg-red-50 hover:text-red-600 ${
                  demoAction === "delete" ? "border-red-300 bg-red-50 text-red-600 ring-2 ring-red-200" : "border-gray-200 bg-gray-50"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div className="pointer-events-none flex flex-wrap justify-end gap-3">
              <span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-purple-700 shadow-lg">
                Admin
              </span>
              <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-amber-700 shadow-lg">
                Supervisor
              </span>
              <span className="rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-gray-500 shadow-lg">
                Sales
              </span>
              <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#C92C1E] shadow-lg">
                Developer
              </span>
            </div>
          </div>
          </div>
          </div>
        </section>

        <section className="flex w-full items-center justify-center bg-white px-4 py-8 sm:px-8 lg:w-1/2">
          <div className="w-full max-w-md">
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
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Email
              </label>
              <input
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
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Password
              </label>
              <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white focus-within:border-[#C92C1E]">
                <input
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
          </div>
        </section>
    </main>
  );
}