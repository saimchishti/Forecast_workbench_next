"use client";

import Preview from "./Preview";
import { ForecastConfigForm, PromoPreview, Role } from "./types";

type ReviewProps = {
  data: ForecastConfigForm;
  promoPreview: PromoPreview | null;
  warnings: string[];
  onConfirm: () => Promise<void> | void;
  onDownload: () => Promise<void> | void;
  isSaving: boolean;
  isDownloading: boolean;
  error?: string | null;
  role: Role;
};

export default function Review({
  data,
  promoPreview,
  warnings,
  onConfirm,
  onDownload,
  isSaving,
  isDownloading,
  error,
  role,
}: ReviewProps) {
  const isViewer = role === "viewer";

  return (
    <div className="space-y-6">
      <Preview data={data} promoPreview={promoPreview} />

      {warnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm text-amber-700">
          <p className="font-semibold">Warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {warnings.map((warning, index) => (
              <li key={`warning-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-500">{error}</p> : null}

      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          JSON Preview
        </p>
        <pre className="mt-2 overflow-auto rounded-xl bg-slate-900/95 p-4 text-xs text-slate-100">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading}
          className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-70"
        >
          {isDownloading ? "Preparing YAML..." : "Download YAML"}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSaving || isViewer}
          className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isViewer ? "View-only" : isSaving ? "Saving..." : "Confirm & Save"}
        </button>
      </div>
    </div>
  );
}
