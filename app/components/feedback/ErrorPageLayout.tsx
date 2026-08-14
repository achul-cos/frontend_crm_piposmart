"use client";

import type { ReactNode } from "react";

export default function ErrorPageLayout({
  title,
  message,
  cause,
  solution,
  technicalDetails,
  actions,
}: {
  title: string;
  message: string;
  cause?: string;
  solution?: string;
  technicalDetails?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6] p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-100 bg-red-50">
          <svg
            className="h-7 w-7 text-[#C92C1E]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m0 3.75h.008M10.29 3.86l-8.13 14.09A1.5 1.5 0 003.5 20.25h17a1.5 1.5 0 001.34-2.3L13.71 3.86a1.5 1.5 0 00-2.42 0z"
            />
          </svg>
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-black text-gray-900">{title}</h1>
          <p className="break-words text-sm text-gray-600">{message}</p>
        </div>

        {(cause || solution) && (
          <div className="space-y-2 rounded-xl bg-gray-50 p-3 text-left">
            {cause ? (
              <p className="break-words text-xs text-gray-600">
                <span className="font-black text-gray-500">Penyebab: </span>
                {cause}
              </p>
            ) : null}
            {solution ? (
              <p className="break-words text-xs text-gray-600">
                <span className="font-black text-gray-500">Solusi: </span>
                {solution}
              </p>
            ) : null}
          </div>
        )}

        {technicalDetails ? (
          <details className="rounded-xl border border-gray-100 text-left">
            <summary className="cursor-pointer select-none px-3 py-2 text-[10px] font-black uppercase tracking-wide text-gray-400">
              Detail teknis (untuk tim support)
            </summary>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words border-t border-gray-100 px-3 py-2 font-mono text-[10px] text-gray-400">
              {technicalDetails}
            </pre>
          </details>
        ) : null}

        {actions ? (
          <div className="flex flex-wrap justify-center gap-2 pt-1">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
