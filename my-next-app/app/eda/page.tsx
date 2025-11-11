"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { isApiError, safeFetch } from "@/lib/apiClient";
import MetricCard from "./components/MetricCard";
import TimeseriesChart from "./components/TimeseriesChart";
import DistributionChart from "./components/DistributionChart";
import CorrelationHeatmap from "./components/CorrelationHeatmap";
import DataTable from "./components/DataTable";

type SummaryResponse = {
  basic: Record<string, Stats>;
  missing: Record<string, number>;
  outliers: { column: string; outliers: number };
  coverage?: CoveragePoint[];
  trend?: TrendPoint[];
};

type Stats = {
  count: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
};

type CoveragePoint = {
  series_id: string;
  start_date: string;
  end_date: string;
  observations: number;
  span_days: number;
};

type TrendPoint = {
  label: string;
  value: number;
};

type TimeseriesPoint = {
  date: string;
  value: number;
  rolling_mean?: number;
  rolling_std?: number;
  rolling_var?: number;
};

type Histogram = {
  bins: number[];
  counts: number[];
};

type DataRow = Record<string, string | number | boolean | null>;

type CorrelationMatrix = Record<string, Record<string, number>>;

const GRANULARITY_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

export default function EdaDashboard() {
  const [granularity, setGranularity] = useState("daily");
  const [distributionColumn, setDistributionColumn] = useState("sales_qty");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [corr, setCorr] = useState<CorrelationMatrix | null>(null);
  const [dist, setDist] = useState<Histogram | null>(null);
  const [dataHead, setDataHead] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const columnChoices = useMemo(() => {
    const cols = summary ? Object.keys(summary.basic ?? {}) : [];
    return cols.length ? cols : ["sales_qty"];
  }, [summary]);

  useEffect(() => {
    if (summary && !columnChoices.includes(distributionColumn)) {
      setDistributionColumn(columnChoices[0]);
    }
  }, [columnChoices, distributionColumn, summary]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const dataHeadPayload = await safeFetch<{ status: string; data_head: DataRow[] }>(
          `/api/eda/datahead?granularity=${granularity}&limit=10`,
          { signal: controller.signal },
        );
        if (isApiError(dataHeadPayload)) {
          setError(dataHeadPayload.error);
          return;
        }

        const summaryPayload = await safeFetch<{ status: string; summary: SummaryResponse }>(
          `/api/eda/summary?granularity=${granularity}`,
          { signal: controller.signal },
        );
        if (isApiError(summaryPayload)) {
          setError(summaryPayload.error);
          return;
        }

        const timeseriesPayload = await safeFetch<{ status: string; timeseries: TimeseriesPoint[] }>(
          `/api/eda/timeseries?granularity=${granularity}`,
          { signal: controller.signal },
        );
        if (isApiError(timeseriesPayload)) {
          setError(timeseriesPayload.error);
          return;
        }

        const corrPayload = await safeFetch<{ status: string; correlation: CorrelationMatrix }>(
          `/api/eda/correlation?granularity=${granularity}`,
          { signal: controller.signal },
        );
        if (isApiError(corrPayload)) {
          setError(corrPayload.error);
          return;
        }

        const distPayload = await safeFetch<{ status: string; distribution: Histogram }>(
          `/api/eda/distribution?column=${encodeURIComponent(distributionColumn)}&granularity=${granularity}`,
          { signal: controller.signal },
        );
        if (isApiError(distPayload)) {
          setError(distPayload.error);
          return;
        }

        setDataHead(dataHeadPayload.data_head ?? []);
        setSummary(summaryPayload.summary);
        setTimeseries(timeseriesPayload.timeseries);
        setCorr(corrPayload.correlation);
        setDist(distPayload.distribution);
        setLastUpdated(new Date().toISOString());
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("EDA fetch failed", err);
        setError("Dataset not found -- please validate data first.");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [granularity, distributionColumn]);

  const topMissing = useMemo(() => {
    if (!summary?.missing) return [];
    return Object.entries(summary.missing)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [summary]);

  const coverage = summary?.coverage ?? [];
  const trends = summary?.trend ?? [];

  const selectedStats = summary?.basic?.[distributionColumn];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-500">Exploration Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Exploratory Data Analysis</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Inspect validated datasets before modeling. Toggle granularities to update every insight and compare trend,
            correlation, and distribution behavior live.
          </p>
        </motion.header>

        <div className="mt-6 flex flex-wrap gap-3">
          {GRANULARITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setGranularity(option.value)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                granularity === option.value
                  ? "border-indigo-500 bg-indigo-600 text-white shadow"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-600"
              }`}
            >
              {option.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span>Distribution column</span>
            <select
              value={distributionColumn}
              onChange={(event) => setDistributionColumn(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700"
            >
              {columnChoices.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/80 p-4 text-sm text-rose-700 shadow">
            {error}
          </div>
        ) : null}

        <section className="mt-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Data Preview</h2>
            <p className="text-sm text-slate-500">First 10 rows from the {granularity} dataset</p>
          </div>
          <DataTable data={dataHead} />
        </section>

        {summary ? (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <MetricCard title="Observations" value={selectedStats?.count ?? summary.basic?.sales_qty?.count ?? null} />
            <MetricCard title="Avg Sales" value={summary.basic?.sales_qty?.mean ?? null} helper="Mean sales_qty" />
            <MetricCard title="Median" value={summary.basic?.sales_qty?.median ?? null} />
            <MetricCard
              title="Outliers"
              value={summary.outliers?.outliers ?? 0}
              helper={`Column: ${summary.outliers?.column ?? "-"}`}
            />
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <TimeseriesChart data={timeseries} loading={loading} />
          <DistributionChart dist={dist} loading={loading} />
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md">
            <h3 className="mb-2 text-lg font-semibold text-gray-800">Correlation Matrix</h3>
            <p className="mb-3 text-sm text-gray-500">Higher magnitude → stronger relationship</p>
            <CorrelationHeatmap corr={corr} loading={loading} />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md">
            <h3 className="mb-2 text-lg font-semibold text-gray-800">Series Coverage</h3>
            <p className="mb-3 text-sm text-gray-500">Top entities by span</p>
            {coverage.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                No coverage information available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-gray-700">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Series</th>
                      <th className="px-3 py-2 text-left">Start</th>
                      <th className="px-3 py-2 text-left">End</th>
                      <th className="px-3 py-2 text-left">Observations</th>
                      <th className="px-3 py-2 text-left">Span (days)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.map((row, i) => (
                      <tr
                        key={`${row.series_id}-${row.start_date}`}
                        className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} transition hover:bg-indigo-50`}
                      >
                        <td className="px-3 py-2 font-semibold text-gray-800">{row.series_id}</td>
                        <td className="px-3 py-2">{row.start_date}</td>
                        <td className="px-3 py-2">{row.end_date}</td>
                        <td className="px-3 py-2">{row.observations.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.span_days.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-800">Missingness (top fields)</h3>
            {topMissing.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No missing values detected.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {topMissing.map(([field, total]) => (
                  <li key={field} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span className="font-medium text-slate-700">{field}</span>
                    <span>{total.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-800">Trend snapshot</h3>
            {trends.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">Not enough data to build trend blocks.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {trends.slice(0, 6).map((trend) => (
                  <div key={trend.label} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{trend.label}</p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">
                      {Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(trend.value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="mt-10 text-xs text-slate-400">
          {lastUpdated ? `Synced ${new Date(lastUpdated).toLocaleString()}` : "Awaiting first sync..."}
        </footer>
      </div>
    </div>
  );
}
