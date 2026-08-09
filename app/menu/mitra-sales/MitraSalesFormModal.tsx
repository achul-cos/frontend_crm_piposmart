"use client";

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import type { PartnerItem, PartnerTypeItem } from "@/app/lib/api";
import ScreenPortal from "@/app/components/ui/ScreenPortal";

export type PartnerFormState = {
  partnerTypeId: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  bankAccount: string;
  status: "ACTIVE" | "INACTIVE";
  // Sprint 15a — Sales bisa langsung jadi PIC mitra yang dia buat sendiri
  // (TUPOKSI referral lead & aktivitas mitra ada di Sales). Hanya relevan
  // saat create; partner yang di-edit sudah punya PIC-nya sendiri.
  selfAssignPic: boolean;
};

const inputClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400";

const selectClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100 disabled:bg-gray-100 disabled:text-gray-400";

const textareaClass =
  "w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:ring-2 focus:ring-red-100";

function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <ScreenPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 md:p-6" onClick={onClose}>
        <div
          className="app-modal-panel w-full max-w-3xl rounded-[32px] shadow-2xl transition-all xl:max-w-4xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="app-modal-header px-5 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                  Mitra Sales
                </p>

                <h2 className="mt-2 text-lg font-black text-slate-950 md:text-xl">
                  {title}
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  {subtitle}
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

          <div className="app-modal-body flex-1 min-h-0 space-y-4 p-5 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </ScreenPortal>
  );
}

export default function MitraSalesFormModal({
  open,
  editingPartner,
  partnerTypes,
  form,
  formError,
  saving,
  setForm,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editingPartner: PartnerItem | null;
  partnerTypes: PartnerTypeItem[];
  form: PartnerFormState;
  formError: string;
  saving: boolean;
  setForm: Dispatch<SetStateAction<PartnerFormState>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <ModalShell
      open={open}
      title={editingPartner ? "Edit Mitra Sales" : "Tambah Mitra Sales"}
      subtitle={
        editingPartner
          ? "Perbarui data mitra yang dikelola oleh Sales."
          : "Tambahkan mitra baru melalui halaman Mitra Sales."
      }
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {formError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {formError}
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              Identitas Mitra
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4">
              {!editingPartner ? (
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Jenis Mitra
                  </span>
                  <select
                    value={form.partnerTypeId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        partnerTypeId: event.target.value,
                      }))
                    }
                    className={selectClass}
                  >
                    <option value="">Pilih jenis mitra</option>
                    {partnerTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name || item.code}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-sm font-black text-slate-900">
                  {editingPartner.partner_type?.name || "-"}
                  <span className="mt-1 block text-[11px] text-slate-400">
                    {editingPartner.partner_type?.code || "-"}
                  </span>
                </div>
              )}

              {!editingPartner ? (
                <label className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Code
                  </span>
                  <input
                    value={form.code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        code: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Contoh: MITRA001"
                    className={`${inputClass} uppercase`}
                  />
                </label>
              ) : null}

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Nama Mitra
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Nama mitra"
                  className={inputClass}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Status
                </span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as "ACTIVE" | "INACTIVE",
                    }))
                  }
                  className={selectClass}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>

              {!editingPartner ? (
                <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.selfAssignPic}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        selfAssignPic: event.target.checked,
                      }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                  />
                  <span>
                    <span className="block text-sm font-black text-slate-900">
                      Jadikan saya PIC mitra ini
                    </span>
                    <span className="block text-[11px] font-medium text-slate-500">
                      Anda langsung tercatat sebagai PIC begitu mitra ini dibuat.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              Kontak Mitra
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Telepon
                </span>
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="No. telepon"
                  className={inputClass}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Email
                </span>
                <input
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="Email mitra"
                  className={inputClass}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Alamat
                </span>
                <textarea
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Alamat mitra"
                  className={textareaClass}
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Rekening
                </span>
                <input
                  value={form.bankAccount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      bankAccount: event.target.value,
                    }))
                  }
                  placeholder="Nomor rekening"
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-red-100 bg-red-50/70 px-4 py-3 text-xs font-bold leading-5 text-[#C92C1E]">
          Halaman ini khusus untuk kelola data mitra. Jenis Mitra dan Rule
          Komisi tetap dikelola dari menu Mitra Admin.
        </div>

        <div className="app-modal-footer flex flex-col gap-2 px-0 py-0">
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
              : editingPartner
                ? "Simpan Perubahan"
                : "Tambah Mitra"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
