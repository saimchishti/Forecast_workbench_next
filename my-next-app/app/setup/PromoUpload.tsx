"use client";

import { ChangeEvent } from "react";

import { PromoPreview } from "./types";

type PromoUploadProps = {
  preview: PromoPreview | null;
  onUpload: (file: File) => Promise<void>;
  error: string | null;
  isUploading: boolean;
  disabled: boolean;
};

export default function PromoUpload({
  preview,
  onUpload,
  error,
  isUploading,
  disabled,
}: PromoUploadProps) {
  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await onUpload(file);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Upload events CSV</p>
          <p className="text-xs text-slate-500">
            Include event_name, start_date, end_date, uplift_type columns.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed">
          <input
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={handleChange}
            disabled={disabled || isUploading}
          />
          {isUploading ? "Uploading..." : "Choose file"}
        </label>
      </div>

      {error ? <p className="text-sm text-rose-500">{error}</p> : null}

      {preview ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{preview.total_rows} total rows</span>
            <span>
              {preview.invalid_rows.length > 0
                ? `${preview.invalid_rows.length} issues detected`
                : "No column issues"}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {Object.keys(preview.preview[0] ?? { name: "", start_date: "", end_date: "", type: "" }).map((header) => (
                    <th key={header} className="px-4 py-2">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.preview.map((row, index) => {
                  const invalid = preview.invalid_rows.find((item) => item.row === row);
                  return (
                    <tr
                      key={`${row.name}-${index}`}
                      className={invalid ? "bg-rose-50/50" : "bg-white"}
                    >
                      {Object.keys(row).map((key) => (
                        <td key={key} className="px-4 py-2 text-slate-700">
                          {row[key]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {preview.invalid_rows.length > 0 ? (
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs text-rose-600">
              <p className="font-semibold">Conflicts</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {preview.invalid_rows.map((item, index) => (
                  <li key={`invalid-${index}`}>
                    Row starting &quot;{item.row.name || "(missing name)"}&quot; -&gt;{" "}
                    {item.issues.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          No file uploaded yet. We will reuse the events calendar at {dataPathHint(preview)} if left empty.
        </p>
      )}
    </div>
  );
}

function dataPathHint(preview: PromoUploadProps["preview"]) {
  return preview?.path ?? "data/special_events_calendar.csv";
}

