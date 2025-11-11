import { motion } from "framer-motion";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Distribution = {
  bins: number[];
  counts: number[];
};

type DistributionChartProps = {
  dist: Distribution | null;
  loading?: boolean;
};

const buildHistogramData = (dist: Distribution | null) => {
  if (!dist || !dist.bins?.length || !dist.counts?.length) return [];
  return dist.counts.map((count, idx) => {
    const left = dist.bins[idx] ?? 0;
    const right = dist.bins[idx + 1] ?? left;
    return {
      label: `${left.toFixed(1)} – ${right.toFixed(1)}`,
      count,
    };
  });
};

export default function DistributionChart({ dist, loading }: DistributionChartProps) {
  const data = buildHistogramData(dist);
  const hasData = data.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Distribution</h3>
        <p className="text-xs text-slate-400">Binned histogram</p>
      </div>
      {loading && !hasData ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">Loading distribution...</div>
      ) : null}
      {!loading && !hasData ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
          No histogram data available.
        </div>
      ) : null}
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
            <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }} />
            <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : null}
    </motion.div>
  );
}
