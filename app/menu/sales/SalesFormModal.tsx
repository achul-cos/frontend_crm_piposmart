"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import ScreenPortal from "@/app/components/ui/ScreenPortal";

export type SalesStatus = "ACTIVE" | "INACTIVE";

export type SalesItem = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role?: "SALES";
  status: SalesStatus;
  must_change_password?: boolean;
  temporary_password?: string;
  deactivated_at?: string | null;
  is_active?: boolean | null;
};

export type SalesFormState = {
  name: string;
  email: string;
  phone: string;
};

const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100";

export default function SalesFormModal({
  open,
  form,
  formError,
  temporaryPassword,
  saving,
  editingSales,
  setForm,
  onClose,
  onSubmit,
}: {
  open: boolean;
  form: SalesFormState;
  formError: string;
  temporaryPassword: string;
  saving: boolean;
  editingSales: SalesItem | null;
  setForm: Dispatch<SetStateAction<SalesFormState>>;
  onClose: () => void;
  onSubmit: () => void;
}) {
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
                  Sales
                </p>

                <h2 className="mt-2 text-lg font-black text-slate-950 md:text-xl">
                  {editingSales ? "Edit Sales" : "Buat Sales"}
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Input data sales. Password akan dibuat otomatis oleh backend.
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

              <div className="mt-4">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Role
                  </span>
                  <input
                    value="SALES"
                    disabled
                    className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-black text-gray-500 outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                Data Sales
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Nama Sales
                  </span>
                  <input
                    name="sales-name"
                    autoComplete="off"
                    value={form.name || ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="Masukkan nama sales"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Email
                  </span>
                  <input
                    name="sales-email"
                    type="email"
                    autoComplete="off"
                    value={form.email || ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="sales@piposmart.id"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Nomor HP
                  </span>
                  <input
                    name="sales-phone"
                    autoComplete="off"
                    value={form.phone || ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="62812xxxxxxxx"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-red-100 bg-red-50/70 px-4 py-3 text-xs font-bold leading-5 text-[#C92C1E]">
              Catatan: password tidak diinput manual. Backend akan mengirim
              temporary password saat Sales dibuat atau password direset.
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
                  : editingSales
                    ? "Simpan Perubahan"
                    : "Buat Sales"}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </ScreenPortal>
  );
}
