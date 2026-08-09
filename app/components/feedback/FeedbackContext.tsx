"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence } from "motion/react";
import { withMinDuration } from "@/app/lib/withMinDuration";
import { AnimatedOverlay, AnimatedPanel } from "@/app/components/motion/primitives";
import FeedbackModal from "./FeedbackModal";
import LoadingOverlay from "./LoadingOverlay";

export type FeedbackKind = "success" | "error" | "info";

export interface FeedbackDetail {
  kind: FeedbackKind;
  title: string;
  message: string;
  cause?: string;
  solution?: string;
  technicalDetails?: string;
  onRetry?: () => void;
  onUndo?: () => void;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export interface FeedbackApi {
  showSuccess(detail: Omit<FeedbackDetail, "kind">): void;
  showError(detail: Omit<FeedbackDetail, "kind">): void;
  showInfo(detail: Omit<FeedbackDetail, "kind">): void;
  confirm(opts: ConfirmOptions): Promise<boolean>;
  withLoading<T>(fn: () => Promise<T>, opts?: { label?: string }): Promise<T>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);

  if (!ctx) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }

  return ctx;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [detail, setDetail] = useState<FeedbackDetail | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const loadingCountRef = useRef(0);

  const showFeedback = useCallback((next: FeedbackDetail) => {
    setDetail(next);
  }, []);

  const closeFeedback = useCallback(() => {
    setDetail(null);
  }, []);

  const showSuccess = useCallback<FeedbackApi["showSuccess"]>(
    (d) => showFeedback({ ...d, kind: "success" }),
    [showFeedback],
  );

  const showError = useCallback<FeedbackApi["showError"]>(
    (d) => showFeedback({ ...d, kind: "error" }),
    [showFeedback],
  );

  const showInfo = useCallback<FeedbackApi["showInfo"]>(
    (d) => showFeedback({ ...d, kind: "info" }),
    [showFeedback],
  );

  const confirm = useCallback<FeedbackApi["confirm"]>((opts) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  const resolveConfirm = useCallback(
    (value: boolean) => {
      confirmState?.resolve(value);
      setConfirmState(null);
    },
    [confirmState],
  );

  const withLoading = useCallback<FeedbackApi["withLoading"]>(
    async (fn, opts) => {
      loadingCountRef.current += 1;
      setLoadingLabel(opts?.label || "Memproses...");

      try {
        return await withMinDuration(fn, 1000);
      } finally {
        loadingCountRef.current -= 1;

        if (loadingCountRef.current <= 0) {
          loadingCountRef.current = 0;
          setLoadingLabel(null);
        }
      }
    },
    [],
  );

  const api = useMemo<FeedbackApi>(
    () => ({ showSuccess, showError, showInfo, confirm, withLoading }),
    [showSuccess, showError, showInfo, confirm, withLoading],
  );

  return (
    <FeedbackContext.Provider value={api}>
      {children}

      <AnimatePresence>
        {detail ? <FeedbackModal key="feedback-modal" detail={detail} onClose={closeFeedback} /> : null}

        {confirmState ? (
          <ConfirmDialog
            key="feedback-confirm"
            title={confirmState.title}
            message={confirmState.message}
            confirmLabel={confirmState.confirmLabel || "Konfirmasi"}
            cancelLabel={confirmState.cancelLabel || "Batal"}
            danger={confirmState.danger}
            onCancel={() => resolveConfirm(false)}
            onConfirm={() => resolveConfirm(true)}
          />
        ) : null}

        {loadingLabel ? <LoadingOverlay key="feedback-loading" label={loadingLabel} /> : null}
      </AnimatePresence>
    </FeedbackContext.Provider>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatedOverlay className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <AnimatedPanel
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="feedback-confirm-title"
        className="app-modal-panel w-full max-w-sm rounded-2xl shadow-xl"
      >
        <div className="app-modal-header p-6">
          <h3
            id="feedback-confirm-title"
            className={`text-lg font-black ${danger ? "text-red-600" : "text-gray-900"}`}
          >
            {title}
          </h3>
        </div>
        <div className="app-modal-body space-y-4 p-6">
          <p className="text-xs text-gray-600">{message}</p>
          <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="app-modal-close rounded-xl px-4 py-2 text-xs font-black"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-xs font-black text-white ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[#C92C1E] hover:bg-[#A82216]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
        </div>
      </AnimatedPanel>
    </AnimatedOverlay>
  );
}
