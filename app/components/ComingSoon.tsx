"use client";

import { usePageTitle } from "@/app/lib/hooks/usePageTitle";

const ClockIcon = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export default function ComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  usePageTitle(title);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="p-5 border-b-2 border-[#C92C1E]">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
            <span>Menu</span>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#C92C1E]">{title}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Manajemen {title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {description ?? "Halaman ini akan segera tersedia."}
          </p>
        </div>
      </div>

      <section className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white/60 px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-[#C92C1E]">
          <ClockIcon className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-lg font-black text-gray-900">
          Modul &ldquo;{title}&rdquo; sedang dalam pengembangan
        </h2>
        <p className="mt-2 max-w-md text-sm font-medium text-gray-400">
          {description ??
            "Halaman ini akan segera tersedia. Menu tetap ditampilkan di sidebar agar kamu tahu fitur ini sudah direncanakan."}
        </p>
      </section>
    </div>
  );
}
