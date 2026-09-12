"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePipeline } from "@/lib/state/PipelineProvider";
import { buildTimeSeries } from "@/lib/pipeline/chartData";
import { CATEGORICAL, CHART_INK, ANOMALY_BAND } from "@/components/charts/palette";
import { CorrelationView } from "@/components/results/CorrelationView";

export function VisualizationsView({ compact = false }: { compact?: boolean }) {
  const { runResult } = usePipeline();
  const stats = runResult.stats;

  const series = useMemo(() => {
    if (!stats || runResult.status !== "completed") return null;
    const topGroupKeys = stats.groups.slice(0, 5).map((g) => g.key);
    const anomalyStarts = new Set(stats.anomalies.map((a) => a.bucketStart));
    const windowRange =
      stats.windowStart && stats.windowEnd
        ? { minTs: new Date(stats.windowStart).getTime(), maxTs: new Date(stats.windowEnd).getTime() }
        : undefined;
    // Coarser bucket than the 5-min anomaly-detection bucket — this chart
    // spans the full observed window, so ~30min keeps the point count readable.
    return buildTimeSeries(runResult.matchedEntries, stats.groupField, 30, topGroupKeys, anomalyStarts, windowRange);
  }, [stats, runResult.matchedEntries, runResult.status]);

  if (runResult.status !== "completed") {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-400">Run the pipeline to see visualizations.</p>
      </div>
    );
  }

  const hasPrimarySeries = series && series.points.length > 0;
  if (!hasPrimarySeries && !stats?.correlation) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-400">No time series to show.</p>
      </div>
    );
  }

  // Find contiguous anomaly-flagged bucket ranges to draw as shaded bands.
  const bands: Array<{ from: string; to: string }> = [];
  let bandStart: string | null = null;
  if (hasPrimarySeries) {
    series.points.forEach((p, i) => {
      if (p.isAnomaly && bandStart === null) bandStart = p.label;
      const next = series.points[i + 1];
      if (p.isAnomaly && (!next || !next.isAnomaly)) {
        bands.push({ from: bandStart ?? p.label, to: p.label });
        bandStart = null;
      }
    });
  }

  return (
    <div className={`h-full overflow-y-auto ${compact ? "p-2" : "p-4"}`}>
      {hasPrimarySeries && (
        <div className={compact ? "h-44" : "h-72"}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.points} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
              <XAxis dataKey="label" tick={{ fill: CHART_INK.muted, fontSize: 11 }} axisLine={{ stroke: CHART_INK.baseline }} tickLine={false} />
              <YAxis tick={{ fill: CHART_INK.muted, fontSize: 11 }} axisLine={{ stroke: CHART_INK.baseline }} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_INK.grid}` }} />
              {!compact && series.groupKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {bands.map((band, i) => (
                <ReferenceArea key={i} x1={band.from} x2={band.to} fill={ANOMALY_BAND} strokeOpacity={0} ifOverflow="extendDomain" />
              ))}
              {series.groupKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CATEGORICAL[i % CATEGORICAL.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasPrimarySeries && !compact && bands.length > 0 && (
        <p className="mt-2 text-xs text-zinc-400">Shaded region marks the detected anomaly window.</p>
      )}
      {stats?.correlation && (
        <div className={compact ? "mt-3" : "mt-4"}>
          <CorrelationView correlation={stats.correlation} compact={compact} />
        </div>
      )}
    </div>
  );
}
