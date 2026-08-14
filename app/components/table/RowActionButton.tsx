"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Eye,
  Pencil,
  Trash2,
  ArchiveRestore,
  Power,
  PowerOff,
  Phone,
  type LucideIcon,
} from "lucide-react";

const MotionLink = motion.create(Link);

// Single source of truth for the "aksi"/action-column button look used across every table in
// the app. Derived from app/menu/paket-langganan/page.tsx's row-action buttons (the pattern the
// rest of the app is being unified to): rounded-lg p-2, colored-tint background, no border,
// icon-only with a title tooltip, lucide-react icons.
export type ActionTone =
  | "view"
  | "edit"
  | "delete"
  | "restore"
  | "activate"
  | "deactivate"
  | "call"
  | "neutral"
  | "password"
const TONE_CLASSES: Record<ActionTone, string> = {
  view: "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 dark:hover:text-blue-300",
  edit: "bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 dark:hover:text-orange-300",
  delete: "bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400",
  restore: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300",
  activate: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300",
  deactivate: "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300",
  call: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300",
  neutral: "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300",
  password: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300",
};

interface RowActionButtonProps {
  icon: LucideIcon;
  tone: ActionTone;
  title: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
}

// Renders as a <Link> when `href` is given (navigational actions like "view detail"), otherwise
// a <button> (in-place mutations like edit/delete/restore/toggle).
export function RowActionButton({
  icon: Icon,
  tone,
  title,
  onClick,
  href,
  disabled,
  className = "",
}: RowActionButtonProps) {
  const classes = `inline-flex items-center justify-center row-action-btn row-action-btn--${tone} w-9 h-9 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${TONE_CLASSES[tone]} ${className}`;

  if (href) {
    return (
      <MotionLink
        href={href}
        className={classes}
        title={title}
        aria-label={title}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
      >
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </MotionLink>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classes}
      title={title}
      aria-label={title}
      whileHover={disabled ? undefined : { scale: 1.08 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
    >
      <Icon className="h-5 w-5" strokeWidth={2.25} />
    </motion.button>
  );
}

// Wraps a row's action buttons with the standard centered/gapped layout used everywhere.
export function RowActionGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center gap-2">{children}</div>;
}

// --- Preset shortcuts for the most common actions, so call sites stay one-liners ---

export function ViewActionButton(props: { onClick?: () => void; href?: string; title?: string; disabled?: boolean }) {
  return <RowActionButton icon={Eye} tone="view" title={props.title ?? "Lihat Detail"} {...props} />;
}

export function EditActionButton(props: { onClick?: () => void; href?: string; title?: string; disabled?: boolean }) {
  return <RowActionButton icon={Pencil} tone="edit" title={props.title ?? "Edit"} {...props} />;
}

export function DeleteActionButton(props: { onClick?: () => void; title?: string; disabled?: boolean; permanent?: boolean }) {
  return (
    <RowActionButton
      icon={Trash2}
      tone="delete"
      title={props.title ?? (props.permanent ? "Hapus Permanen" : "Hapus")}
      onClick={props.onClick}
      disabled={props.disabled}
    />
  );
}

export function RestoreActionButton(props: { onClick?: () => void; title?: string; disabled?: boolean }) {
  return <RowActionButton icon={ArchiveRestore} tone="restore" title={props.title ?? "Pulihkan"} {...props} />;
}

export function ToggleActiveActionButton(props: { active: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <RowActionButton
      icon={props.active ? Power : PowerOff}
      tone={props.active ? "deactivate" : "activate"}
      title={props.active ? "Nonaktifkan" : "Aktifkan"}
      onClick={props.onClick}
      disabled={props.disabled}
    />
  );
}

export function CallActionButton(props: { onClick?: () => void; href?: string; title?: string; disabled?: boolean }) {
  return <RowActionButton icon={Phone} tone="call" title={props.title ?? "Hubungi"} {...props} />;
}
