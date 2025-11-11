import { motion } from "framer-motion";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

type TimeseriesPoint = {
  date: string;
  value: number;
  rolling_mean?: number;
  rolling_std?: number;
  rolling_var?: number;
};

type TimeseriesChartProps = {
  data: TimeseriesPoint[];
  loading?: boolean;
};

export default function TimeseriesChart({ data, loading }: TimeseriesChartProps) {
  const hasData = data?.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Sales Trend</h3>
        <p className="text-xs text-slate-400">Rolling mean window adapts per grain</p>
      </div>
      {loading && !hasData ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">Loading series...</div>
      ) : null}
      {!loading && !hasData ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
          No time-series points available.
        </div>
      ) : null}
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              width={60}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
              labelStyle={{ color: "#0f172a" }}
              formatter={(value: number | string | Array<number | string>) =>
                typeof value === "number" ? value.toLocaleString() : value
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="value" name="Total Sales" stroke="#4f46e5" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="rolling_mean"
              name="Rolling Mean"
              stroke="#16a34a"
              strokeDasharray="4 3"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : null}
    </motion.div>
  );
}
