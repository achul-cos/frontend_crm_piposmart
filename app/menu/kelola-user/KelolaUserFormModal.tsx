"use client";

import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import ScreenPortal from "@/app/components/ui/ScreenPortal";

export type UserRole = "ADMIN" | "SUPERVISOR" | "SALES";
export type UserStatus = "ACTIVE" | "INACTIVE";

export type UserItem = {
  id: number;
  name: string;
  email?: string;
  username?: string;
  role: UserRole;
  status: UserStatus;
  supervisor_id?: number | null;
  supervisor_name?: string | null;
  temporary_password?: string;
  deactivated_at?: string | null;
  is_active?: boolean | null;
};

export type UserFormState = {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  supervisorId: string;
};

const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100";

const selectClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100";

export default function KelolaUserFormModal({
  open,
  form,
  formError,
  temporaryPassword,
  saving,
  supervisors,
  editingUser,
  setForm,
  onClose,
  onSubmit,
}: {
  open: boolean;
  form: UserFormState;
  formError: string;
  temporaryPassword: string;
  saving: boolean;
  supervisors: UserItem[];
  editingUser: UserItem | null;
  setForm: Dispatch<SetStateAction<UserFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  if (!open) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <ScreenPortal>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 md:p-6" onClick={onClose}>
        <div className="flex min-h-full items-center justify-center">
          <div
            className="app-modal-panel w-full max-w-3xl rounded-[32px] shadow-2xl transition-all xl:max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
          <div className="app-modal-header px-5 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                  Kelola User
                </p>

                <h2 className="mt-2 text-lg font-black text-slate-950 md:text-xl">
                  {editingUser ? "Edit Akun Login" : "Buat Akun Login"}
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Input akun login internal. Username dan password menjadi akses
                  utama.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="app-modal-close rounded-2xl px-4 py-2 text-xs font-black transition"
              >
                Tutup
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="app-modal-body flex-1 min-h-0 space-y-5 p-5 md:p-6">
            {formError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {formError}
              </div>
            ) : null}

            {temporaryPassword ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                Temporary password:{" "}
                <span className="font-black">{temporaryPassword}</span>
              </div>
            ) : null}

            <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Role Akun
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Role
                  </span>
                  <select
                    value={form.role || "SALES"}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        role: event.target.value as UserRole,
                        supervisorId:
                          event.target.value === "SALES"
                            ? current.supervisorId || ""
                            : "",
                      }))
                    }
                    className={selectClass}
                    autoComplete="off"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="SALES">Sales</option>
                  </select>
                </label>

                {(form.role || "SALES") === "SALES" ? (
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                      Supervisor
                    </span>
                    <select
                      value={form.supervisorId || ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          supervisorId: event.target.value,
                        }))
                      }
                      className={selectClass}
                      autoComplete="off"
                    >
                      <option value="">Pilih supervisor</option>
                      {supervisors.map((supervisor) => (
                        <option key={supervisor.id} value={supervisor.id}>
                          {supervisor.name ||
                            supervisor.username ||
                            `Supervisor #${supervisor.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Akun Login
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Nama User
                  </span>
                  <input
                    name="new-user-name"
                    autoComplete="off"
                    value={form.name || ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="Masukkan nama user"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Username Login
                  </span>
                  <input
                    name="new-login-username"
                    autoComplete="new-password"
                    value={form.username || ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="Masukkan username login"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Password Login
                  </span>

                  <div className="relative">
                    <input
                      name="new-login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.password || ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      className={`${inputClass} pr-12`}
                      placeholder={
                        editingUser
                          ? "Isi password baru jika ingin diganti"
                          : "Minimal 8 karakter"
                      }
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-[#C92C1E]"
                      title={
                        showPassword
                          ? "Sembunyikan password"
                          : "Lihat password"
                      }
                    >
                      {showPassword ? (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c1.676 0 3.26-.393 4.665-1.091M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.774 3.162 10.066 7.5a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.437 0 .644C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-red-100 bg-red-50/70 px-4 py-3 text-xs font-bold leading-5 text-[#C92C1E]">
              Catatan: akun login menggunakan username dan password. Pastikan
              password sudah dicek sebelum disimpan.
            </div>
          </div>

            <div className="app-modal-footer flex flex-shrink-0 justify-end gap-2 px-5 py-4 md:px-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 transition hover:bg-gray-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {saving
                  ? "Menyimpan..."
                  : editingUser
                    ? "Simpan Perubahan"
                    : "Buat Akun Login"}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </ScreenPortal>
  );
}
