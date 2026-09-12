"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GitCompareArrows } from "lucide-react";
import type { CorrelationResult } from "@/lib/types";
import { CATEGORICAL, CHART_INK } from "@/components/charts/palette";

function describeStrength(r: number): string {
  const abs = Math.abs(r);
  const strength = abs >= 0.7 ? "strong" : abs >= 0.4 ? "moderate" : abs >= 0.2 ? "weak" : "negligible";
  const direction = r > 0 ? "positive" : r < 0 ? "negative" : "no";
  return `${strength} ${direction} correlation`;
}

function labelFor(bucketStart: string): string {
  const d = new Date(bucketStart);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function CorrelationView({ correlation, compact = false }: { correlation: CorrelationResult; compact?: boolean }) {
  const data = correlation.points.map((p) => ({ label: labelFor(p.bucketStart), primary: p.primary, secondary: p.secondary }));
  const height = compact ? 90 : 140;

  return (
    <div className={compact ? "" : "rounded-lg border border-cyan-200 bg-cyan-50/40 p-3"}>
      {!compact && (
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-cyan-900">
            <GitCompareArrows className="h-3.5 w-3.5" />
            Correlation with {correlation.secondarySourceName}
          </div>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-cyan-800 ring-1 ring-cyan-200">
            r = {correlation.coefficient.toFixed(2)} · {describeStrength(correlation.coefficient)}
          </span>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-[11px] font-medium text-zinc-500">{correlation.primaryLabel}</p>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
              <XAxis dataKey="label" tick={{ fill: CHART_INK.muted, fontSize: 10 }} axisLine={{ stroke: CHART_INK.baseline }} tickLine={false} minTickGap={30} />
              <YAxis tick={{ fill: CHART_INK.muted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: `1px solid ${CHART_INK.grid}` }} />
              <Line type="monotone" dataKey="primary" stroke={CATEGORICAL[0]} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="pt-1 text-[11px] font-medium text-zinc-500">{correlation.secondaryLabel}</p>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
              <XAxis dataKey="label" tick={{ fill: CHART_INK.muted, fontSize: 10 }} axisLine={{ stroke: CHART_INK.baseline }} tickLine={false} minTickGap={30} />
              <YAxis tick={{ fill: CHART_INK.muted, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: `1px solid ${CHART_INK.grid}` }} />
              <Line type="monotone" dataKey="secondary" stroke={CATEGORICAL[1]} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {compact && (
        <p className="mt-1 text-[11px] text-zinc-500">
          r = {correlation.coefficient.toFixed(2)} · {describeStrength(correlation.coefficient)} with {correlation.secondarySourceName}
        </p>
      )}
    </div>
  );
}
