"use client";

interface Props {
  summary: Record<string, unknown>;
}

export default function SummaryCard({ summary }: Props) {
  if (!summary) return null;

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-100 bg-white p-5 shadow-md">
      <h3 className="text-lg font-semibold text-emerald-600">Results summary</h3>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {Object.entries(summary).map(([key, val]) => (
          <li key={key} className="flex items-center justify-between rounded-xl bg-slate-50/80 px-4 py-2">
            <span className="font-medium capitalize">{key.replace(/_/g, " ")}</span>
            <span className="text-slate-900">
              {typeof val === "object" ? JSON.stringify(val) : String(val)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
