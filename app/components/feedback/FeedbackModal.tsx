"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import type { FeedbackDetail } from "./FeedbackContext";
import { AnimatedOverlay, AnimatedPanel } from "@/app/components/motion/primitives";

const AUTO_CLOSE_MS = 5000;

const KIND_STYLES: Record<
  FeedbackDetail["kind"],
  {
    titleClass: string;
    iconWrapClass: string;
    iconClass: string;
  }
> = {
  success: {
    titleClass: "text-emerald-700 dark:text-emerald-300",
    iconWrapClass: "border border-emerald-100 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/15",
    iconClass: "text-emerald-600 feedback-icon-success",
  },
  error: {
    titleClass: "text-red-600 dark:text-red-300",
    iconWrapClass: "border border-red-100 bg-red-50 dark:border-red-500/30 dark:bg-red-500/15",
    iconClass: "text-red-600 feedback-icon-error",
  },
  info: {
    titleClass: "text-blue-700 dark:text-blue-300",
    iconWrapClass: "border border-blue-100 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/15",
    iconClass: "text-blue-600 feedback-icon-info",
  },
};

export default function FeedbackModal({
  detail,
  onClose,
}: {
  detail: FeedbackDetail;
  onClose: () => void;
}) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (detail.kind !== "success") return undefined;

    timerRef.current = window.setTimeout(() => {
      onClose();
    }, AUTO_CLOSE_MS);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  const clearAutoClose = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClose = () => {
    clearAutoClose();
    onClose();
  };

  const styles = KIND_STYLES[detail.kind];

  return (
    <AnimatedOverlay
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4 backdrop-blur-[2px]"
      onMouseEnter={clearAutoClose}
    >
      <AnimatedPanel
        role="alertdialog"
        aria-live="assertive"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        className="app-modal-panel w-full max-w-md rounded-2xl shadow-xl"
      >
        <div className="app-modal-header p-6">
          <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${styles.iconWrapClass}`}
          >
            <FeedbackIcon kind={detail.kind} className={`h-6 w-6 ${styles.iconClass}`} />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h3 id="feedback-modal-title" className={`text-lg font-black ${styles.titleClass}`}>
              {detail.title}
            </h3>
            <p className="break-words text-sm text-gray-700 dark:text-slate-200">{detail.message}</p>
          </div>
        </div>
        </div>

        <div className="app-modal-body space-y-4 p-6">
        {(detail.cause || detail.solution) && (
          <div className="space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-slate-950/70">
            {detail.cause ? (
              <p className="break-words text-xs text-gray-600 dark:text-slate-300">
                <span className="font-black text-gray-500 dark:text-slate-400">Penyebab: </span>
                {detail.cause}
              </p>
            ) : null}
            {detail.solution ? (
              <p className="break-words text-xs text-gray-600 dark:text-slate-300">
                <span className="font-black text-gray-500 dark:text-slate-400">Solusi: </span>
                {detail.solution}
              </p>
            ) : null}
          </div>
        )}

        {detail.technicalDetails ? (
          <details className="group rounded-xl border border-gray-100 dark:border-slate-700">
            <summary className="cursor-pointer select-none px-3 py-2 text-[10px] font-black uppercase tracking-wide text-gray-400 dark:text-slate-500">
              Detail teknis (untuk tim support)
            </summary>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words border-t border-gray-100 px-3 py-2 font-mono text-[10px] text-gray-400 dark:border-slate-700 dark:text-slate-400">
              {detail.technicalDetails}
            </pre>
          </details>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          {detail.onUndo ? (
            <button
              type="button"
              onClick={() => {
                detail.onUndo?.();
                handleClose();
              }}
              className="app-modal-close rounded-xl px-4 py-2 text-xs font-black dark:bg-slate-950"
            >
              Kembalikan
            </button>
          ) : null}

          {detail.onRetry ? (
            <button
              type="button"
              onClick={() => {
                detail.onRetry?.();
                handleClose();
              }}
              className="rounded-xl bg-[#C92C1E] px-4 py-2 text-xs font-black text-white hover:bg-[#A82216]"
            >
              Coba Lagi
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleClose}
            className="app-modal-close rounded-xl px-4 py-2 text-xs font-black dark:bg-slate-950"
          >
            Tutup
          </button>
        </div>
        </div>
      </AnimatedPanel>
    </AnimatedOverlay>
  );
}

function FeedbackIcon({
  kind,
  className,
}: {
  kind: FeedbackDetail["kind"];
  className?: string;
}) {
  if (kind === "success") return <CheckCircle2 className={className} />;
  if (kind === "error") return <XCircle className={className} />;
  return <Info className={className} />;
}
