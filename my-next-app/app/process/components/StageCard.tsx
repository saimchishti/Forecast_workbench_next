"use client";

interface Props {
  title: string;
  description?: string;
  onRun: () => void;
  loading: boolean;
  error: string | null;
  summary: unknown;
  stepLabel?: string;
}

export default function StageCard({
  title,
  description,
  onRun,
  loading,
  error,
  summary,
  stepLabel,
}: Props) {
  return (
    <div className="w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          {stepLabel ? (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              {stepLabel}
            </p>
          ) : null}
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
        </div>
        {!summary && !error ? (
          <button
            onClick={onRun}
            disabled={loading}
            className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Processing..." : "Run Step"}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/80 p-4 text-sm text-rose-700">
          <p className="font-semibold">Connection issue</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      {summary ? (
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
          <p className="text-sm font-semibold text-emerald-700">✅ Step complete</p>
          <pre className="mt-3 max-h-72 overflow-y-auto rounded-xl bg-white/80 p-3 text-xs text-slate-700">
            {JSON.stringify(summary, null, 2)}
          </pre>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-600">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          <span>Running {title}...</span>
        </div>
      ) : null}
    </div>
  );
}
