"use client";

interface Props {
  current: number;
  total: number;
}

export default function StepProgress({ current, total }: Props) {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  return (
    <div className="w-full max-w-3xl">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        <span>Step {current}</span>
        <span>{total} total</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
