import type { GroupByConfig, GroupResult, LogEntry } from "@/lib/types";

export function runGroupBy(entries: LogEntry[], config: GroupByConfig): GroupResult[] {
  const buckets = new Map<string, { sum: number; count: number }>();

  for (const entry of entries) {
    const rawKey = entry[config.field];
    const key = rawKey === undefined || rawKey === null ? "(unknown)" : String(rawKey);
    const bucket = buckets.get(key) ?? { sum: 0, count: 0 };
    bucket.count += 1;
    if (config.aggregation !== "count" && config.aggField) {
      const value = Number(entry[config.aggField]);
      if (!Number.isNaN(value)) bucket.sum += value;
    }
    buckets.set(key, bucket);
  }

  const results: GroupResult[] = Array.from(buckets.entries()).map(([key, { sum, count }]) => ({
    key,
    count: config.aggregation === "avg" ? Math.round((sum / count) * 100) / 100 : config.aggregation === "sum" ? sum : count,
  }));

  return results.sort((a, b) => b.count - a.count);
}
