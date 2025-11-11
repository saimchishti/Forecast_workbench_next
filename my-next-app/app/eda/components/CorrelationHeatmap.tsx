import { motion } from "framer-motion";

type CorrelationMatrix = Record<string, Record<string, number | null>>;

const backgroundStyle = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { backgroundColor: "#f8fafc", color: "#94a3b8" };
  }
  const normalized = (value + 1) / 2; // 0-1 range
  const hue = 220 - normalized * 220; // blue (-1) to orange (+1)
  const lightness = 78 - normalized * 30;
  return { backgroundColor: `hsl(${hue}, 70%, ${lightness}%)`, color: "#0f172a" };
};

type HeatmapProps = {
  corr: CorrelationMatrix | null;
  loading?: boolean;
};

export default function CorrelationHeatmap({ corr, loading }: HeatmapProps) {
  const columns = corr ? Object.keys(corr) : [];
  const hasData = columns.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Correlation Matrix</h3>
        <p className="text-xs text-slate-400">Higher magnitude → stronger relationship</p>
      </div>
      {loading && !hasData ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">Loading correlations...</div>
      ) : null}
      {!loading && !hasData ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          No numeric columns available for correlation analysis.
        </div>
      ) : null}
      {hasData ? (
        <div className="overflow-auto">
          <div
            className="inline-grid gap-1"
            style={{ gridTemplateColumns: `120px repeat(${columns.length}, minmax(58px, 1fr))` }}
          >
            <div />
            {columns.map((col) => (
              <div key={col} className="px-2 py-1 text-center text-xs font-medium text-slate-500">
                {col}
              </div>
            ))}
            {columns.map((row) => (
              <div key={row} className="contents">
                <div className="px-2 py-1 text-xs font-semibold text-slate-600">{row}</div>
                {columns.map((col) => {
                  const value = corr?.[row]?.[col] ?? corr?.[col]?.[row] ?? null;
                  const display = value === null || value === undefined ? "—" : value.toFixed(2);
                  return (
                    <div
                      key={`${row}-${col}`}
                      className="rounded-md px-2 py-2 text-center text-xs font-semibold"
                      style={backgroundStyle(value)}
                    >
                      {display}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
