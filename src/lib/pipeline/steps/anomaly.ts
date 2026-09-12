import type { AnomalyBucket, AnomalyConfig, LogEntry } from "@/lib/types";

// Buckets `entries` by time (config.bucketMinutes) x `groupField`, computes the
// mean/stddev of bucket counts per group across the whole observed window
// (including empty buckets, so a dense burst against a near-zero baseline
// produces a real, large z-score), and flags buckets over the threshold.
export function runAnomaly(
  entries: LogEntry[],
  config: AnomalyConfig,
  groupField: string | null,
  windowRange?: { minTs: number; maxTs: number },
): AnomalyBucket[] {
  if (entries.length === 0) return [];

  const bucketMs = Math.max(1, config.bucketMinutes) * 60_000;
  const timestamps = entries.map((e) => new Date(e.timestamp).getTime()).filter((t) => !Number.isNaN(t));
  if (timestamps.length === 0) return [];

  // Bucket over the full observation window (not just the matched/filtered
  // subset) — otherwise a filter that only ever matches during the anomalous
  // burst (e.g. "message contains OOMKilled") collapses the window to just
  // the burst itself, and there's no quiet baseline left to compare against.
  const minTs = windowRange?.minTs ?? Math.min(...timestamps);
  const maxTs = windowRange?.maxTs ?? Math.max(...timestamps);
  const numBuckets = Math.max(1, Math.ceil((maxTs - minTs) / bucketMs) + 1);

  const groupCounts = new Map<string, number[]>();

  for (const entry of entries) {
    const ts = new Date(entry.timestamp).getTime();
    if (Number.isNaN(ts)) continue;
    const rawKey = groupField ? entry[groupField] : "all";
    const key = rawKey === undefined || rawKey === null ? "(unknown)" : String(rawKey);
    const bucketIndex = Math.min(numBuckets - 1, Math.max(0, Math.floor((ts - minTs) / bucketMs)));

    let counts = groupCounts.get(key);
    if (!counts) {
      counts = new Array(numBuckets).fill(0);
      groupCounts.set(key, counts);
    }
    counts[bucketIndex] += 1;
  }

  const anomalies: AnomalyBucket[] = [];

  for (const [groupKey, counts] of groupCounts.entries()) {
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length;
    const stddev = Math.max(Math.sqrt(variance), 0.5); // floor to avoid divide-by-near-zero blowups

    counts.forEach((observed, i) => {
      const zscore = (observed - mean) / stddev;
      if (zscore > config.threshold) {
        anomalies.push({
          groupKey,
          bucketStart: new Date(minTs + i * bucketMs).toISOString(),
          observed,
          baseline: Math.round(mean * 100) / 100,
          zscore: Math.round(zscore * 100) / 100,
        });
      }
    });
  }

  return anomalies.sort((a, b) => b.zscore - a.zscore).slice(0, 20);
}
