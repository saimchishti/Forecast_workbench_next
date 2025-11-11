import { motion } from "framer-motion";

type MetricCardProps = {
  title: string;
  value: number | string | null | undefined;
  helper?: string;
};

export default function MetricCard({ title, value, helper }: MetricCardProps) {
  const displayValue =
    value === null || value === undefined
      ? "-"
      : typeof value === "number"
        ? Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
        : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{displayValue}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </motion.div>
  );
}
