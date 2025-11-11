"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AggregationSummary = {
  daily_rows: number;
  weekly_rows: number;
  monthly_rows: number;
  output_files?: Record<string, string>;
  status?: string;
};

const AGGREGATE_ENDPOINT = "http://127.0.0.1:8000/api/aggregate_data";

export default function AggregationStage() {
  const [summary, setSummary] = useState<AggregationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const runAggregation = async () => {
      try {
        setError(null);
        setLoading(true);
        const response = await fetch(AGGREGATE_ENDPOINT, {
          method: "POST",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.detail ?? payload?.message ?? "Backend connection failed");
        }
        setSummary((payload.summary as AggregationSummary) ?? payload);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Backend connection failed");
      } finally {
        setLoading(false);
      }
    };

    runAggregation();
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 text-center">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-500">Aggregation</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Aggregation Layer</h1>
          <p className="mt-2 text-base text-slate-500">
            Creating daily, weekly, and monthly datasets for benchmarking before model runs.
          </p>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-6 py-4 text-sm text-slate-600 shadow">
            Aggregating data...
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
            className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-xl"
          >
            <h2 className="text-emerald-600">✅ Aggregation complete</h2>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-slate-600">
              <Metric label="Daily rows" value={summary.daily_rows} />
              <Metric label="Weekly rows" value={summary.weekly_rows} />
              <Metric label="Monthly rows" value={summary.monthly_rows} />
            </div>
            {summary.output_files ? (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-left text-xs text-slate-500">
                <p className="font-semibold text-slate-700">Outputs</p>
                <ul className="mt-2 space-y-1">
                  {Object.entries(summary.output_files).map(([key, path]) => (
                    <li key={key}>
                      <span className="capitalize">{key}:</span> <code>{path}</code>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button
              onClick={() => router.push("/eda")}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Explore Insights Dashboard →
            </button>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value.toLocaleString()}</p>
    </div>
  );
}
