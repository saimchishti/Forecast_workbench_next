"use client";

import { DetectedDataSummary, ForecastConfigForm, Granularity } from "./types";

const presets: {
  label: string;
  description: string;
  values: { horizon_days: number; lead_time_days: number; granularity: Granularity };
}[] = [
  {
    label: "Retail Standard (8 weeks weekly)",
    description: "Steady cadence for menu engineering and revenue squads.",
    values: { horizon_days: 56, lead_time_days: 14, granularity: "weekly" },
  },
  {
    label: "FMCG (4 weeks daily)",
    description: "Faster cycles for CPG launches.",
    values: { horizon_days: 28, lead_time_days: 7, granularity: "daily" },
  },
];

const granularityCopy: Record<Granularity, string> = {
  daily: "Use when menu items move quickly and events drive daily swings.",
  weekly: "Balance signal and noise for regional restaurant programs.",
  monthly: "High-level demand planning or S&OP alignment.",
};

type StepAProps = {
  data: ForecastConfigForm;
  onForecastChange: (
    field: keyof ForecastConfigForm["forecast"],
    value: number | string,
  ) => void;
  onPresetApply: (values: { horizon_days: number; lead_time_days: number; granularity: Granularity }) => void;
  validation: { horizonError?: string };
  disabled: boolean;
  dataSummary?: DetectedDataSummary | null;
};

export default function StepA({
  data,
  onForecastChange,
  onPresetApply,
  validation,
  disabled,
  dataSummary,
}: StepAProps) {
  const granularityHint = (() => {
    if (data.forecast.granularity === "weekly") {
      return `~ ${(data.forecast.horizon_days / 7).toFixed(1)} weeks planned.`;
    }
    if (data.forecast.granularity === "monthly") {
      return "Great for quarterly look-backs.";
    }
    return "Anchor to trade calendar days.";
  })();

  return (
    <div className="space-y-6">
      {dataSummary ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-800">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Data detected</p>
          <p className="mt-2 text-sm">
            We detected <span className="font-semibold">{dataSummary.frequency}</span> data from{" "}
            <span className="font-semibold">{dataSummary.start_date}</span> to{" "}
            <span className="font-semibold">{dataSummary.end_date}</span>.
          </p>
          <p className="text-sm">
            Suggested hierarchy: <span className="font-semibold">{dataSummary.hierarchy}</span>.
          </p>
          <p className="text-xs text-emerald-600">{dataSummary.notes}</p>
          <p className="mt-1 text-sm">
            Suggested defaults: {dataSummary.suggested_config.forecast_horizon_days} day horizon,{" "}
            {dataSummary.suggested_config.lead_time_days} day lead time.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex items-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            onClick={() =>
              onPresetApply({
                horizon_days: dataSummary.suggested_config.forecast_horizon_days,
                lead_time_days: dataSummary.suggested_config.lead_time_days,
                granularity: dataSummary.suggested_config.granularity,
              })
            }
            disabled={disabled}
          >
            Apply detected defaults
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          Presets
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onPresetApply(preset.values)}
              disabled={disabled}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
            >
              <span className="block font-semibold text-slate-900">{preset.label}</span>
              <span className="text-xs text-slate-500">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Forecast horizon (days)
          <span className="text-xs text-slate-400" title="How far ahead we need a confident forecast.">
            ?
          </span>
        </label>
        <p className="text-sm text-slate-500">Plan far enough to brief operations and culinary teams.</p>
        <input
          type="number"
          min={1}
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed"
          value={data.forecast.horizon_days}
          onChange={(event) => onForecastChange("horizon_days", Number(event.target.value))}
          disabled={disabled}
        />
        <p className="mt-1 text-xs text-slate-500">{granularityHint}</p>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Lead time (days)
          <span className="text-xs text-slate-400" title="Decision window for downstream teams.">
            ?
          </span>
        </label>
        <p className="text-sm text-slate-500">
          Keep this tighter than operations&apos; response time.
        </p>
        <input
          type="number"
          min={0}
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed"
          value={data.forecast.lead_time_days}
          onChange={(event) => onForecastChange("lead_time_days", Number(event.target.value))}
          disabled={disabled}
        />
        {validation.horizonError ? (
          <p className="mt-1 text-sm text-rose-500">{validation.horizonError}</p>
        ) : null}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Data granularity
          <span className="text-xs text-slate-400" title="How frequently we collect the actuals feed.">
            ?
          </span>
        </label>
        <p className="text-sm text-slate-500">Choose the cadence your data warehouse can sustain.</p>
        <select
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed"
          value={data.forecast.granularity}
          onChange={(event) => onForecastChange("granularity", event.target.value)}
          disabled={disabled}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <p className="mt-1 text-xs text-slate-500">{granularityCopy[data.forecast.granularity]}</p>
      </div>
    </div>
  );
}
