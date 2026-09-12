import type { LogEntry } from "@/lib/types";

export interface TimeSeriesPoint {
  bucketStart: string;
  label: string;
  isAnomaly: boolean;
  [group: string]: string | number | boolean;
}

export interface TimeSeriesResult {
  points: TimeSeriesPoint[];
  groupKeys: string[];
}

export function buildTimeSeries(
  entries: LogEntry[],
  groupField: string | undefined,
  bucketMinutes: number,
  topGroupKeys: string[],
  anomalyBucketStarts: Set<string>,
  windowRange?: { minTs: number; maxTs: number },
): TimeSeriesResult {
  if (entries.length === 0) return { points: [], groupKeys: [] };

  const bucketMs = bucketMinutes * 60_000;
  const timestamps = entries.map((e) => new Date(e.timestamp).getTime()).filter((t) => !Number.isNaN(t));
  if (timestamps.length === 0) return { points: [], groupKeys: [] };

  // Default to the matched entries' own range, but prefer the full raw-log
  // window when given — otherwise a filter that only ever matches during the
  // burst (e.g. "message contains OOMKilled") shows a chart with no baseline
  // to contrast against.
  const minTs = windowRange?.minTs ?? Math.min(...timestamps);
  const maxTs = windowRange?.maxTs ?? Math.max(...timestamps);
  const numBuckets = Math.max(1, Math.ceil((maxTs - minTs) / bucketMs) + 1);

  const groupKeys = topGroupKeys.slice(0, 5);
  const keySet = new Set(groupKeys);
  const buckets: Array<Record<string, number>> = Array.from({ length: numBuckets }, () => ({}));

  for (const entry of entries) {
    const ts = new Date(entry.timestamp).getTime();
    if (Number.isNaN(ts)) continue;
    const rawKey = groupField ? entry[groupField] : "all";
    const key = rawKey === undefined || rawKey === null ? "(unknown)" : String(rawKey);
    if (!keySet.has(key)) continue;
    if (ts < minTs || ts > maxTs) continue;
    const idx = Math.min(numBuckets - 1, Math.max(0, Math.floor((ts - minTs) / bucketMs)));
    buckets[idx][key] = (buckets[idx][key] ?? 0) + 1;
  }

  const anomalyBucketMs = new Set(Array.from(anomalyBucketStarts).map((s) => new Date(s).getTime()));

  const points: TimeSeriesPoint[] = buckets.map((counts, i) => {
    const bucketTs = minTs + i * bucketMs;
    const isAnomaly = Array.from(anomalyBucketMs).some((a) => Math.abs(a - bucketTs) < bucketMs);
    const date = new Date(bucketTs);
    const label = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
    const point: TimeSeriesPoint = {
      bucketStart: date.toISOString(),
      label,
      isAnomaly,
    };
    for (const key of groupKeys) point[key] = counts[key] ?? 0;
    return point;
  });

  return { points, groupKeys };
}
