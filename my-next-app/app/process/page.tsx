"use client";

import { useState } from "react";

import StageCard from "./components/StageCard";
import StepProgress from "./components/StepProgress";
import SummaryCard from "./components/SummaryCard";

const API_BASE = "http://127.0.0.1:8000";

type Stage = {
  id: number;
  name: string;
  description: string;
  endpoint: string;
};

const STAGES: Stage[] = [
  {
    id: 1,
    name: "Data Validation",
    description: "Clean schema, deduplicate, and export validated data.",
    endpoint: "/api/validate_data",
  },
  {
    id: 2,
    name: "Build Continuous Timeline",
    description: "Fill any missing daily points per series.",
    endpoint: "/api/build_timeline",
  },
  {
    id: 3,
    name: "Aggregation Layer",
    description: "Generate daily/weekly/monthly datasets for modeling.",
    endpoint: "/api/aggregate_data",
  },
];

export default function ProcessPage() {
  const [stageIndex, setStageIndex] = useState(0);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStage = STAGES[stageIndex];

  const runStage = async (endpoint: string) => {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail ?? payload?.message ?? "Server connection failed");
      }
      setSummary(payload.summary ?? payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6">
        <header className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-teal-500">Pipeline</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Data Processing Workflow</h1>
          <p className="mt-2 text-base text-slate-500">
            Validate, build timelines, and aggregate datasets before launching forecasts.
          </p>
        </header>

        <StepProgress current={stageIndex + 1} total={STAGES.length} />

        <StageCard
          title={currentStage.name}
          description={currentStage.description}
          stepLabel={`Stage ${currentStage.id}`}
          onRun={() => runStage(currentStage.endpoint)}
          loading={loading}
          error={error}
          summary={summary}
        />

        {summary ? <SummaryCard summary={summary} /> : null}

        <div className="flex w-full max-w-3xl items-center justify-between">
          <button
            onClick={() => {
              setSummary(null);
              setError(null);
              setStageIndex(Math.max(0, stageIndex - 1));
            }}
            disabled={stageIndex === 0 || loading}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            ← Previous
          </button>

          {summary && stageIndex < STAGES.length - 1 ? (
            <button
              onClick={() => {
                setSummary(null);
                setError(null);
                setStageIndex(stageIndex + 1);
              }}
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Next Step →
            </button>
          ) : null}

          {summary && stageIndex === STAGES.length - 1 ? (
            <a
              href="/forecast"
              className="rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              Proceed to Forecasting →
            </a>
          ) : (
            <span className="invisible">Placeholder</span>
          )}
        </div>
      </div>
    </div>
  );
}
