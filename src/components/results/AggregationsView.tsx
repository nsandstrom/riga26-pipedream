"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePipeline } from "@/lib/state/PipelineProvider";
import { CHART_INK, SEQUENTIAL_BLUE } from "@/components/charts/palette";

export function AggregationsView() {
  const { runResult } = usePipeline();
  const groups = runResult.stats?.groups ?? [];

  if (runResult.status !== "completed" || groups.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-400">
          {runResult.status === "completed" ? "No groups to show." : "Run the pipeline to see aggregations."}
        </p>
      </div>
    );
  }

  const data = groups.slice(0, 10).map((g) => ({ name: g.key, value: g.count }));
  const chartHeight = Math.max(180, data.length * 34);

  return (
    <div className="h-full overflow-y-auto p-4">
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 4 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke={CHART_INK.grid} />
            <XAxis type="number" tick={{ fill: CHART_INK.muted, fontSize: 11 }} axisLine={{ stroke: CHART_INK.baseline }} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fill: CHART_INK.secondary, fontSize: 12 }}
              axisLine={{ stroke: CHART_INK.baseline }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_INK.grid}` }}
            />
            <Bar dataKey="value" fill={SEQUENTIAL_BLUE} radius={[0, 4, 4, 0]} maxBarSize={22}>
              <LabelList dataKey="value" position="right" style={{ fill: CHART_INK.secondary, fontSize: 12 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
