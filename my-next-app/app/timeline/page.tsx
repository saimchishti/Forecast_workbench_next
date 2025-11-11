"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TimelineSummary = {
  missing_dates_filled: number;
  output_file: string;
  status?: string;
};

const TIMELINE_ENDPOINT = "http://127.0.0.1:8000/api/build_timeline";

export default function TimelineBuilder() {
  const [summary, setSummary] = useState<TimelineSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const buildTimeline = async () => {
      try {
        setError(null);
        setLoading(true);
        const response = await fetch(TIMELINE_ENDPOINT, {
          method: "POST",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.detail ?? payload?.message ?? "Connection issue");
        }
        setSummary((payload.summary as TimelineSummary) ?? payload);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Connection issue");
      } finally {
        setLoading(false);
      }
    };

    buildTimeline();
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 text-center">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-500">
            Timeline Builder
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Continuous Timeline Construction</h1>
          <p className="mt-2 text-base text-slate-500">
            We ensure each restaurant series has a complete date index before aggregations.
          </p>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-6 py-4 text-sm text-slate-600 shadow">
            Building timeline...
          </div>
        ) : null}

        {error ? (
          <div className="w-full max-w-lg rounded-2xl border border-rose-100 bg-rose-50/80 p-4 text-sm text-rose-700 shadow">
            ❌ {error}
          </div>
        ) : null}

        {summary ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-xl"
          >
            <h2 className="text-emerald-600">✅ Timeline built successfully</h2>
            <p className="mt-2 text-sm text-slate-600">
              Missing dates filled: <span className="font-semibold text-slate-900">{summary.missing_dates_filled}</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Output saved at: <code className="rounded bg-slate-100 px-2 py-1 text-slate-700">{summary.output_file}</code>
            </p>
            <button
              onClick={() => router.push("/aggregate")}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Continue to Aggregation →
            </button>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
