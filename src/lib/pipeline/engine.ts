import type {
  AnomalyConfig,
  CorrelateConfig,
  FilterConfig,
  GroupByConfig,
  LogEntry,
  LogSource,
  PipelineNodeData,
  RunStats,
} from "@/lib/types";
import { runParse } from "@/lib/pipeline/steps/parse";
import { runFilter } from "@/lib/pipeline/steps/filter";
import { runGroupBy } from "@/lib/pipeline/steps/groupBy";
import { runAnomaly } from "@/lib/pipeline/steps/anomaly";
import { runCorrelate } from "@/lib/pipeline/steps/correlate";
import { getSourceById } from "@/lib/fixtures/sources";

export interface GraphNode {
  id: string;
  data: PipelineNodeData;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface PipelineExecutionResult {
  stats: RunStats;
  matchedEntries: LogEntry[];
  totalMatchedCount: number;
  sampleForAnalysis: LogEntry[];
}

const MAX_ANALYSIS_SAMPLE = 25;

// Orders the chain from the node with no incoming edge to the node with no
// outgoing edge. The pipeline is always a straight line (matches the
// reference design) — no branching support needed.
function orderChain(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const targets = new Set(edges.map((e) => e.target));
  const bySource = new Map(edges.map((e) => [e.source, e.target]));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const start = nodes.find((n) => !targets.has(n.id)) ?? nodes[0];
  if (!start) return [];

  const ordered: GraphNode[] = [start];
  let currentId = start.id;
  const visited = new Set([start.id]);
  while (bySource.has(currentId)) {
    const nextId = bySource.get(currentId)!;
    if (visited.has(nextId)) break;
    const next = byId.get(nextId);
    if (!next) break;
    ordered.push(next);
    visited.add(nextId);
    currentId = nextId;
  }
  return ordered;
}

export function executePipeline(
  source: LogSource,
  rawEntries: LogEntry[],
  nodes: GraphNode[],
  edges: GraphEdge[],
  secondarySources?: Map<string, LogEntry[]>,
): PipelineExecutionResult {
  const chain = orderChain(nodes, edges);

  const rawTimestamps = rawEntries.map((e) => new Date(e.timestamp).getTime()).filter((t) => !Number.isNaN(t));
  const fullWindowRange =
    rawTimestamps.length > 0 ? { minTs: Math.min(...rawTimestamps), maxTs: Math.max(...rawTimestamps) } : undefined;

  let entries: LogEntry[] = rawEntries;
  let groups: RunStats["groups"] = [];
  let lastGroupField: string | null = null;
  let anomalies: RunStats["anomalies"] = [];
  let correlation: RunStats["correlation"];

  for (const node of chain) {
    switch (node.data.nodeType) {
      case "logs_source":
        entries = rawEntries;
        break;
      case "parse":
        entries = runParse(entries, source);
        break;
      case "filter":
        entries = runFilter(entries, node.data.config as FilterConfig);
        break;
      case "group_by": {
        const config = node.data.config as GroupByConfig;
        groups = runGroupBy(entries, config);
        lastGroupField = config.field;
        break;
      }
      case "anomaly": {
        const config = node.data.config as AnomalyConfig;
        anomalies = runAnomaly(entries, config, lastGroupField, fullWindowRange);
        break;
      }
      case "correlate": {
        const config = node.data.config as CorrelateConfig;
        const secondarySource = getSourceById(config.secondarySourceId);
        const secondaryRaw = secondarySources?.get(config.secondarySourceId);
        if (secondarySource && secondaryRaw && fullWindowRange) {
          correlation = runCorrelate(entries, source.name, secondarySource, secondaryRaw, config, fullWindowRange);
        }
        break;
      }
      case "ai_summarize":
        // Handled by the caller via a separate Claude call — engine stops here.
        break;
    }
  }

  const totalMatchedCount = entries.length;
  // Not capped here — charts and correlation bucket over the full matched
  // set (otherwise a broad filter silently truncates the time series to
  // whatever chronological window the first N rows happen to cover). The
  // logs table applies its own display cap when rendering rows.
  const matchedEntries = entries;

  // Prioritize entries from the anomalous window(s) for the analysis sample,
  // falling back to the first N matched entries.
  let sampleForAnalysis: LogEntry[];
  if (anomalies.length > 0) {
    const anomalyStarts = new Set(anomalies.map((a) => a.bucketStart));
    const bucketMsGuess = 5 * 60_000;
    const inAnomalyWindow = entries.filter((e) => {
      const ts = new Date(e.timestamp).getTime();
      return Array.from(anomalyStarts).some((start) => {
        const startTs = new Date(start).getTime();
        return ts >= startTs && ts < startTs + bucketMsGuess;
      });
    });
    sampleForAnalysis = (inAnomalyWindow.length > 0 ? inAnomalyWindow : entries).slice(0, MAX_ANALYSIS_SAMPLE);
  } else {
    sampleForAnalysis = entries.slice(0, MAX_ANALYSIS_SAMPLE);
  }

  const stats: RunStats = {
    totalProcessed: rawEntries.length,
    matchedCount: totalMatchedCount,
    groups,
    groupField: lastGroupField ?? undefined,
    anomalies,
    windowStart: fullWindowRange ? new Date(fullWindowRange.minTs).toISOString() : undefined,
    windowEnd: fullWindowRange ? new Date(fullWindowRange.maxTs).toISOString() : undefined,
    correlation,
  };

  return { stats, matchedEntries, totalMatchedCount, sampleForAnalysis };
}
