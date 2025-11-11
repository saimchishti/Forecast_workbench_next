"use client";

import Link from "next/link";
import { useState } from "react";

import { isApiError, safeFetch } from "@/lib/apiClient";
import { DATA_SUMMARY_STORAGE_KEY, DetectedDataSummary } from "../setup/types";

export default function UploadRestaurantData() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DetectedDataSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const payload = await safeFetch<{ status: string; data: DetectedDataSummary; message?: string }>(
        "/api/upload_csv",
        { method: "POST", body: formData },
      );
      if (isApiError(payload) || payload.status === "error") {
        throw new Error(isApiError(payload) ? payload.error : payload.message ?? "Failed to analyze CSV");
      }

      const summary = payload.data as DetectedDataSummary;
      setResult(summary);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DATA_SUMMARY_STORAGE_KEY, JSON.stringify(summary));
      }
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-center text-gray-900">Upload Restaurant Sales Data</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          We&apos;ll analyze the CSV to detect cadence, coverage, and hierarchy before you fine-tune the project.
        </p>

        <div className="mt-6 space-y-3">
          <input
            type="file"
            accept=".csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm"
          />
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full rounded-lg bg-indigo-600 py-2 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Upload & Analyze"}
          </button>
          {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}
        </div>

        {result ? (
          <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <h2 className="text-lg font-semibold text-gray-900">Detected Information</h2>
            <p className="text-sm text-gray-600">{result.notes}</p>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <p>
                Date Range: <span className="font-semibold">{result.start_date}</span> -{" "}
                <span className="font-semibold">{result.end_date}</span>
              </p>
              <p>Rows analyzed: {result.rows}</p>
              <p>Granularity: {result.frequency}</p>
              <p>Hierarchy: {result.hierarchy}</p>
              <p>
                Suggested Horizon: {result.suggested_config.forecast_horizon_days} days · Lead Time:{" "}
                {result.suggested_config.lead_time_days} days
              </p>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Columns: {result.columns.join(", ")}
            </p>
            <Link
              href="/setup"
              className="mt-4 block rounded-lg bg-green-600 py-2 text-center text-white transition hover:bg-green-700"
            >
              Continue to Setup →
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
