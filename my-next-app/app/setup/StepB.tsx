"use client";

import Hierarchy from "./Hierarchy";
import { ForecastConfigForm, HierarchyMapping, RollupPreview } from "./types";

type StepBProps = {
  data: ForecastConfigForm;
  onMetaChange: (field: keyof ForecastConfigForm["meta"], value: string) => void;
  onForecastChange: (
    field: keyof ForecastConfigForm["forecast"],
    value: string,
  ) => void;
  onVersionChange: (value: string) => void;
  mapping: HierarchyMapping | null;
  onMappingChange: (mapping: HierarchyMapping) => void;
  onSaveMapping: (mapping: HierarchyMapping) => Promise<void>;
  onTestRollup: () => Promise<RollupPreview | null>;
  rollupPreview: RollupPreview | null;
  disabled: boolean;
};

export default function StepB({
  data,
  onMetaChange,
  onForecastChange,
  onVersionChange,
  mapping,
  onMappingChange,
  onSaveMapping,
  onTestRollup,
  rollupPreview,
  disabled,
}: StepBProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <FieldBlock
          label="Project name"
          help="Visible in dashboards and audit trail."
        >
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed"
            value={data.meta.name}
            onChange={(event) => onMetaChange("name", event.target.value)}
            placeholder="Q4 Pricing - India"
            disabled={disabled}
          />
        </FieldBlock>

        <FieldBlock
          label="Created by"
          help="We notify this owner when configs change."
        >
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed"
            value={data.meta.created_by}
            onChange={(event) => onMetaChange("created_by", event.target.value)}
            placeholder="saimchisti@gmail.com"
            disabled={disabled}
          />
        </FieldBlock>

        <FieldBlock label="Version tag" help="Short label for release notes.">
          <input
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed"
            value={data.version_tag}
            onChange={(event) => onVersionChange(event.target.value)}
            placeholder="q4-pricing-v1"
            disabled={disabled}
          />
        </FieldBlock>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldBlock label="Restaurant structure" help="List how restaurants roll up from unit to market.">
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed"
              value={data.forecast.hierarchy}
              onChange={(event) => onForecastChange("hierarchy", event.target.value)}
              placeholder="Restaurant > City > Country"
              disabled={disabled}
            />
          </FieldBlock>

          <FieldBlock label="Country" help="One market per config keeps context tight.">
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed"
              value={data.forecast.country}
              onChange={(event) => onForecastChange("country", event.target.value)}
              placeholder="India"
              disabled={disabled}
            />
          </FieldBlock>
        </div>

        <FieldBlock label="Notes" help="Call out business assumptions, e.g. special events freeze.">
          <textarea
            className="mt-2 h-28 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none disabled:cursor-not-allowed"
            value={data.meta.notes}
            onChange={(event) => onMetaChange("notes", event.target.value)}
            placeholder="Events pause during Diwali week."
            disabled={disabled}
          />
        </FieldBlock>
      </div>

      <Hierarchy
        mapping={mapping}
        onChange={onMappingChange}
        onSave={onSaveMapping}
        onTestRollup={onTestRollup}
        rollupPreview={rollupPreview}
        disabled={disabled}
      />
    </div>
  );
}

function FieldBlock({
  label,
  help,
  children,
}: {
  label: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <p className="text-sm text-slate-500">{help}</p>
      {children}
    </div>
  );
}
