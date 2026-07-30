"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { getProfile, updateUserProfile } from "@/app/lib/api";

const UserIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.4}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0"
    />
  </svg>
);

const ArrowLeftIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.4}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
    />
  </svg>
);

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

export default function EditProfilePage() {
  usePageTitle("Edit Profil");

  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("Sales");
  const [username, setUsername] = useState("-");

  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  const loadProfile = async () => {
    const localName = localStorage.getItem("piposmart_user_name") || "User";
    const localRole = localStorage.getItem("piposmart_user_role") || "Sales";
    const localUsername = localStorage.getItem("piposmart_user_username") || "-";

    setUserName(localName);
    setUserRole(localRole);
    setUsername(localUsername);
    setNameInput(localName);
    setEmailInput(localUsername !== "-" ? localUsername : "");

    try {
      const profile = await getProfile();
      if (profile.name) {
        setUserName(profile.name);
        setNameInput(profile.name);
        localStorage.setItem("piposmart_user_name", profile.name);
      }
      if (profile.email) {
        setUsername(profile.email);
        setEmailInput(profile.email);
        localStorage.setItem("piposmart_user_username", profile.email);
      }
      if (profile.role) {
        setUserRole(profile.role);
        localStorage.setItem("piposmart_user_role", profile.role);
      }
    } catch {
      // Fallback local
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleUpdateProfile = async (event: FormEvent) => {
    event.preventDefault();
    setProfileSuccess("");
    setProfileError("");

    const trimmedName = nameInput.trim();
    const trimmedEmail = emailInput.trim();

    if (!trimmedName) {
      setProfileError("Nama tidak boleh kosong.");
      return;
    }
    if (!trimmedEmail) {
      setProfileError("Username / Email tidak boleh kosong.");
      return;
    }

    setSavingProfile(true);

    try {
      const updated = await updateUserProfile({
        name: trimmedName,
        email: trimmedEmail,
      });

      const nextName = updated.name || trimmedName;
      const nextEmail = updated.email || trimmedEmail;

      setUserName(nextName);
      setUsername(nextEmail);

      localStorage.setItem("piposmart_user_name", nextName);
      localStorage.setItem("piposmart_user_username", nextEmail);
      localStorage.setItem(
        "piposmart_user",
        JSON.stringify({
          name: nextName,
          username: nextEmail,
          role: userRole,
        }),
      );

      window.dispatchEvent(new Event("storage"));

      setProfileSuccess("Profil berhasil diperbarui!");
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 font-sans text-[#1C1C1E]">
      {/* Header Banner */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#C92C1E]">
              <UserIcon />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#C92C1E]">
                Profil Akun
              </p>
              <h1 className="text-2xl font-black text-gray-950">
                Edit Profil Pengguna
              </h1>
            </div>
          </div>

          <Link
            href="/menu/setting"
            className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            <ArrowLeftIcon />
            <span>Kembali ke Setting</span>
          </Link>
        </div>
      </section>

      {/* Main Card Form */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-black text-gray-900">
              Form Ubah Informasi Profil
            </h2>
            <p className="text-xs font-medium text-gray-400">
              Perbarui Nama Lengkap dan Username/Email login Anda.
            </p>
          </div>

          <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-[10px] font-black text-[#C92C1E]">
            Role: {userRole}
          </span>
        </div>

        {profileSuccess ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-xs font-bold text-green-700">
            {profileSuccess}
          </div>
        ) : null}

        {profileError ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-600">
            {profileError}
          </div>
        ) : null}

        <form onSubmit={handleUpdateProfile} className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Masukkan nama pengguna"
              className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3.5 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
              Username / Email Login <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="contoh: user@piposmart.id"
              className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3.5 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
              Role Akses Sistem
            </label>
            <input
              type="text"
              value={userRole}
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3.5 text-sm font-bold text-gray-500"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
            <Link
              href="/menu/setting"
              className="rounded-2xl border border-gray-200 px-5 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50"
            >
              Batal
            </Link>

            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-2xl bg-[#C92C1E] px-7 py-3 text-xs font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {savingProfile ? "Menyimpan Profil..." : "Simpan Perubahan Profil"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
