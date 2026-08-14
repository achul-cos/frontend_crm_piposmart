"use client";

import React from "react";
import { AnimatePresence } from "motion/react";
import { AnimatedOverlay, AnimatedPanel } from "@/app/components/motion/primitives";
import ScreenPortal from "@/app/components/ui/ScreenPortal";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
}

// Shared overlay + panel shell for the app's form/detail modals. Replaces the bespoke
// `fixed inset-0 ... bg-black/40` + panel <div> pair each modal used to hand-roll, so every modal
// gets a consistent backdrop, centering, and enter/exit animation for free.
export default function Modal({ open, onClose, children, className, labelledBy }: ModalProps) {
  return (
    <ScreenPortal>
      <AnimatePresence>
        {open ? (
          <AnimatedOverlay
            key="modal-overlay"
            className="fixed inset-0 z-[55] overflow-y-auto bg-black/40 p-4 backdrop-blur-[2px]"
            onClick={onClose}
          >
            <div className="flex min-h-full items-center justify-center">
              <AnimatedPanel
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                className={
                  className ??
                  "app-modal-panel w-full max-w-lg rounded-2xl p-6 shadow-xl"
                }
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {children}
              </AnimatedPanel>
            </div>
          </AnimatedOverlay>
        ) : null}
      </AnimatePresence>
    </ScreenPortal>
  );
}
