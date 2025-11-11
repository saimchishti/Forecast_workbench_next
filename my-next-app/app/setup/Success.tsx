"use client";

import Link from "next/link";

import { ForecastConfigForm } from "./types";

type SuccessProps = {
  data: ForecastConfigForm;
  warnings: string[];
  lastSavedPath?: string;
  lastSavedAt?: string;
  lastSavedBy?: string;
};

export default function Success({
  data,
  warnings,
  lastSavedPath,
  lastSavedAt,
  lastSavedBy,
}: SuccessProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-teal-500">
          Success
        </p>
        <h2 className="text-3xl font-semibold text-slate-900">
          Setup saved successfully
        </h2>
        <p className="text-base text-slate-500">
          Config is versioned and ready for model runner.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm">
        <p className="text-sm font-medium text-slate-400">Summary</p>
        <dl className="mt-4 space-y-3 text-sm text-slate-600">
          <Item label="Project">{data.meta.name}</Item>
          <Item label="Owner">{data.meta.created_by}</Item>
          <Item label="Granularity">{data.forecast.granularity}</Item>
          <Item label="Horizon">{data.forecast.horizon_days} days</Item>
          <Item label="Events file">{data.forecast.promo_calendar_path}</Item>
        </dl>
        {warnings.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-700">
            <p className="font-semibold">Warnings</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-left">
              {warnings.map((warning, index) => (
                <li key={`warning-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-4 text-xs text-slate-400">
          Last edited by {lastSavedBy ?? data.meta.created_by} at {formatTimestamp(lastSavedAt)}
        </p>
        {lastSavedPath ? (
          <p className="text-xs text-slate-400">Stored at {lastSavedPath}</p>
        ) : null}
        <div className="mt-6 text-center">
          <Link
            href="/validate"
            className="inline-flex items-center justify-center rounded-xl bg-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
          >
            Proceed to Data Validation
          </Link>
        </div>
      </div>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function formatTimestamp(value?: string) {
  if (!value) return "--";
  return new Date(value).toLocaleString();
}
