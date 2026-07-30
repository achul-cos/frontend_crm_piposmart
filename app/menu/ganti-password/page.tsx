"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePageTitle } from "@/app/lib/hooks/usePageTitle";
import { changeUserPassword } from "@/app/lib/api";

const LockIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
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
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0V10.5m-1.5 0h12a1.5 1.5 0 011.5 1.5v6.75a1.5 1.5 0 01-1.5 1.5h-12a1.5 1.5 0 01-1.5-1.5V12a1.5 1.5 0 011.5-1.5z"
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

const ShieldCheckIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
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
      d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
    />
  </svg>
);

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

export default function GantiPasswordPage() {
  usePageTitle("Ganti Password");

  // Form Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Password saat ini wajib diisi.");
      return;
    }
    if (!newPassword) {
      setPasswordError("Password baru wajib diisi.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setSavingPassword(true);

    try {
      await changeUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(
        "Password berhasil diubah! Gunakan password baru untuk sesi login berikutnya.",
      );
    } catch (error) {
      setPasswordError(getErrorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5 font-sans text-[#1C1C1E]">
      {/* Header Banner */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <LockIcon />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                Keamanan Akun
              </p>
              <h1 className="text-2xl font-black text-gray-950">
                Ganti Password Akun
              </h1>
            </div>
          </div>

          <Link
            href="/menu/setting"
            className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-100"
          >
            <ArrowLeftIcon />
            <span>Kembali ke Setting Profil</span>
          </Link>
        </div>
      </section>

      {/* Main Card Form */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-base font-black text-gray-900">
            Form Ubah Kata Sandi
          </h2>
          <p className="text-xs font-medium text-gray-400">
            Perbarui password Anda secara berkala agar terhindar dari akses yang tidak sah.
          </p>
        </div>

        {passwordSuccess ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-xs font-bold text-green-700">
            {passwordSuccess}
          </div>
        ) : null}

        {passwordError ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-600">
            {passwordError}
          </div>
        ) : null}

        <form onSubmit={handleChangePassword} className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
              Password Saat Ini <span className="text-red-500">*</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Masukkan password Anda saat ini"
              className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3.5 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
                Password Baru <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3.5 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase text-gray-500">
                Konfirmasi Password Baru <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru"
                className="w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3.5 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-600 select-none">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#C92C1E] focus:ring-red-200"
              />
              <span>Tampilkan Password</span>
            </label>
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
              disabled={savingPassword}
              className="rounded-2xl bg-amber-500 px-7 py-3 text-xs font-black text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
            >
              {savingPassword ? "Memproses Password..." : "Simpan Password Baru"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
