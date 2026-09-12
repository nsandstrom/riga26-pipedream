import type { CorrelateConfig, CorrelationResult, LogEntry, LogSource } from "@/lib/types";
import { runFilter } from "@/lib/pipeline/steps/filter";

function bucketCounts(entries: LogEntry[], minTs: number, numBuckets: number, bucketMs: number): number[] {
  const counts = new Array(numBuckets).fill(0);
  for (const entry of entries) {
    const ts = new Date(entry.timestamp).getTime();
    if (Number.isNaN(ts) || ts < minTs) continue;
    const idx = Math.floor((ts - minTs) / bucketMs);
    if (idx >= 0 && idx < numBuckets) counts[idx] += 1;
  }
  return counts;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n === 0) return 0;
  const meanA = a.reduce((s, x) => s + x, 0) / n;
  const meanB = b.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let denomA = 0;
  let denomB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  const denom = Math.sqrt(denomA * denomB);
  return denom === 0 ? 0 : num / denom;
}

// Buckets the primary (already filtered) entries and a secondary source's
// entries (filtered by the correlate step's own condition) over the same
// time window, then computes a real Pearson correlation coefficient between
// the two per-bucket counts — not an LLM guess.
export function runCorrelate(
  primaryEntries: LogEntry[],
  primaryLabel: string,
  secondarySource: LogSource,
  secondaryRawEntries: LogEntry[],
  config: CorrelateConfig,
  windowRange: { minTs: number; maxTs: number },
): CorrelationResult {
  const bucketMs = Math.max(1, config.bucketMinutes) * 60_000;
  const numBuckets = Math.max(1, Math.ceil((windowRange.maxTs - windowRange.minTs) / bucketMs) + 1);

  const secondaryFiltered = runFilter(secondaryRawEntries, {
    conditions: config.secondaryConditions,
    logic: config.secondaryLogic,
  });

  const primaryCounts = bucketCounts(primaryEntries, windowRange.minTs, numBuckets, bucketMs);
  const secondaryCounts = bucketCounts(secondaryFiltered, windowRange.minTs, numBuckets, bucketMs);

  const points = primaryCounts.map((primary, i) => ({
    bucketStart: new Date(windowRange.minTs + i * bucketMs).toISOString(),
    primary,
    secondary: secondaryCounts[i],
  }));

  return {
    secondarySourceId: secondarySource.id,
    secondarySourceName: secondarySource.name,
    secondaryLabel: config.secondaryLabel,
    primaryLabel,
    coefficient: Math.round(pearson(primaryCounts, secondaryCounts) * 1000) / 1000,
    points,
  };
}
