"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ValidationSummary = {
  rows_before: number;
  rows_after: number;
  duplicates_removed: number;
  missing_counts: Record<string, number>;
  detected_granularity: string;
  validated_file: string;
};

const VALIDATION_ENDPOINT = "http://127.0.0.1:8000/api/validate_data";
const DOWNLOAD_URL = "http://127.0.0.1:8000/data/validated/validated_raw_data.csv";

export default function ValidatePage() {
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const runValidation = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(VALIDATION_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          let detail = "Validation failed. Please check the backend logs.";
          try {
            const payload = await response.json();
            detail =
              payload?.detail ??
              payload?.message ??
              (typeof payload === "string" ? payload : detail);
          } catch {
            // ignore parse errors
          }
          throw new Error(detail);
        }

        const payload = await response.json();
        setSummary(payload.summary);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (err instanceof TypeError) {
          setError("Backend connection failed. Please start FastAPI.");
        } else {
          setError((err as Error).message || "Unexpected validation failure.");
        }
      } finally {
        setLoading(false);
      }
    };

    runValidation();
    return () => controller.abort();
  }, []);

  const missingValueEntries = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.missing_counts ?? {});
  }, [summary]);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl space-y-6 px-6">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-500">
            Data Validation
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Verifying your uploaded dataset
          </h1>
          <p className="text-base text-slate-500">
            We automatically clean the most recent upload and surface any issues before modeling.
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4 text-sm text-rose-700 shadow-sm">
            <p className="font-semibold">Connection issue</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-600 shadow-sm">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500" />
            <div>
              <p className="font-semibold text-slate-900">Analyzing uploaded data...</p>
              <p className="text-slate-500">Hang tight while we validate the dataset.</p>
            </div>
          </div>
        ) : null}

        {!loading && summary ? (
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-500">
                  Data validation complete
                </p>
                <p className="text-2xl font-semibold text-slate-900">Your data is ready for modeling</p>
                <p className="text-sm text-slate-500">Validated file stored at {summary.validated_file}</p>
              </div>
            </div>

            <dl className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
              <InfoItem label="Total rows before" value={summary.rows_before.toLocaleString()} />
              <InfoItem label="After cleaning" value={summary.rows_after.toLocaleString()} />
              <InfoItem label="Duplicates removed" value={summary.duplicates_removed.toLocaleString()} />
              <InfoItem label="Frequency detected" value={capitalize(summary.detected_granularity)} />
            </dl>

            <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-700">Missing values</p>
              {missingValueEntries.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {missingValueEntries.map(([key, value]) => (
                    <li key={key} className="flex items-center justify-between">
                      <span className="capitalize">{formatLabel(key)}</span>
                      <span className="font-medium text-slate-900">{value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No missing values detected in tracked columns.</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-teal-500 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
              >
                Download Clean Data
              </a>
              <button
                onClick={() => router.push("/timeline")}
                className="inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
              >
                Continue to Timeline →
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function capitalize(value: string) {
  if (!value) return "--";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatLabel(key: string) {
  return key.replace(/_/g, " ");
}
