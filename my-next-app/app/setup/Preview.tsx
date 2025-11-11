"use client";

import { ForecastConfigForm, PromoPreview } from "./types";

type PreviewProps = {
  data: ForecastConfigForm;
  promoPreview: PromoPreview | null;
};

export default function Preview({ data, promoPreview }: PreviewProps) {
  const horizonSummary = buildHorizonSummary(data.forecast.horizon_days);
  const eventsSummary = buildEventsSummary(promoPreview);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white/70 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Timing</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">
          Horizon: {data.forecast.horizon_days} days
        </p>
        <p className="text-sm text-slate-500">{horizonSummary}</p>
        <p className="mt-3 text-sm text-slate-600">
          Lead time: {data.forecast.lead_time_days} days
        </p>
        <p className="text-sm text-slate-500">
          Granularity: {capitalize(data.forecast.granularity)}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Structure</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{data.forecast.hierarchy}</p>
        <p className="text-sm text-slate-500">Country: {data.forecast.country}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Special events</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{eventsSummary.title}</p>
        <p className="text-sm text-slate-500">{eventsSummary.subtitle}</p>
      </div>
    </div>
  );
}

function buildHorizonSummary(days: number) {
  const today = new Date();
  const start = nextWeekday(today, 1); // Monday baseline
  const end = new Date(start);
  end.setDate(start.getDate() + days);
  return `from ${formatDate(start)} to ${formatDate(end)}`;
}

function buildEventsSummary(preview: PromoPreview | null) {
  if (!preview || preview.preview.length === 0) {
    return {
      title: "No uploads yet",
      subtitle: "We will use the default events calendar if none is supplied.",
    };
  }

  const dates = preview.preview
    .map((row) => new Date(row.start_date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const first = dates[0];
  const last = dates[dates.length - 1];

  return {
    title: `${preview.total_rows} entries`,
    subtitle: first && last ? `${formatDate(first)} - ${formatDate(last)}` : "Dates pending",
  };
}

function nextWeekday(base: Date, weekday: number) {
  const result = new Date(base);
  const delta = (7 + weekday - base.getDay()) % 7 || 7;
  result.setDate(base.getDate() + delta);
  return result;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

