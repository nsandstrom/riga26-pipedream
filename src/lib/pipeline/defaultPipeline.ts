import type { GeneratedStep } from "@/lib/pipeline/layout";

// Hand-authored default pipeline per source, shown immediately when a source
// is selected so the canvas always has something valid on screen even before
// the user types a prompt (and independent of API availability).
const DEFAULTS: Record<string, GeneratedStep[]> = {
  payments: [
    { nodeType: "logs_source", description: "Last 24 hours", config: {} },
    { nodeType: "parse", description: "Extract fields (JSON)", config: { format: "json" } },
    {
      nodeType: "filter",
      description: 'level = ERROR AND message contains "auth"',
      config: {
        logic: "AND",
        conditions: [
          { field: "level", op: "=", value: "ERROR" },
          { field: "message", op: "contains", value: "auth" },
        ],
      },
    },
    { nodeType: "group_by", description: "service count()", config: { field: "service", aggregation: "count" } },
    {
      nodeType: "anomaly",
      description: "Detect spikes (z-score > 3)",
      config: { method: "zscore", threshold: 3, bucketMinutes: 5 },
    },
    { nodeType: "ai_summarize", description: "Explain findings and suggest likely causes", config: {} },
  ],
  kubernetes: [
    { nodeType: "logs_source", description: "Last 24 hours", config: {} },
    { nodeType: "parse", description: "Extract fields (JSON)", config: { format: "json" } },
    {
      nodeType: "filter",
      description: 'level = ERROR AND message contains "OOMKilled"',
      config: {
        logic: "OR",
        conditions: [
          { field: "message", op: "contains", value: "OOMKilled" },
          { field: "message", op: "contains", value: "Back-off restarting" },
        ],
      },
    },
    { nodeType: "group_by", description: "k8s.pod count()", config: { field: "k8s.pod", aggregation: "count" } },
    {
      nodeType: "anomaly",
      description: "Detect spikes (z-score > 3)",
      config: { method: "zscore", threshold: 3, bucketMinutes: 5 },
    },
    { nodeType: "ai_summarize", description: "Explain findings and suggest likely causes", config: {} },
  ],
  nginx: [
    { nodeType: "logs_source", description: "Last 24 hours", config: {} },
    { nodeType: "parse", description: "Parse combined log format", config: { format: "combined_log" } },
    {
      nodeType: "filter",
      description: "status >= 500",
      config: { logic: "AND", conditions: [{ field: "status", op: ">=", value: 500 }] },
    },
    { nodeType: "group_by", description: "path count()", config: { field: "path", aggregation: "count" } },
    {
      nodeType: "anomaly",
      description: "Detect spikes (z-score > 3)",
      config: { method: "zscore", threshold: 3, bucketMinutes: 5 },
    },
    { nodeType: "ai_summarize", description: "Explain findings and suggest likely causes", config: {} },
  ],
  "application-logs": [
    { nodeType: "logs_source", description: "Last 24 hours", config: {} },
    { nodeType: "parse", description: "Extract fields (JSON)", config: { format: "json" } },
    {
      nodeType: "filter",
      description: "level = ERROR",
      config: { logic: "AND", conditions: [{ field: "level", op: "=", value: "ERROR" }] },
    },
    { nodeType: "group_by", description: "service count()", config: { field: "service", aggregation: "count" } },
    {
      nodeType: "anomaly",
      description: "Detect spikes (z-score > 3)",
      config: { method: "zscore", threshold: 3, bucketMinutes: 5 },
    },
    { nodeType: "ai_summarize", description: "Explain findings and suggest likely causes", config: {} },
  ],
  auth: [
    { nodeType: "logs_source", description: "Last 24 hours", config: {} },
    { nodeType: "parse", description: "Extract fields (JSON)", config: { format: "json" } },
    {
      nodeType: "filter",
      description: 'message contains "Failed login"',
      config: { logic: "AND", conditions: [{ field: "message", op: "contains", value: "Failed login" }] },
    },
    { nodeType: "group_by", description: "user_id count()", config: { field: "user_id", aggregation: "count" } },
    {
      nodeType: "anomaly",
      description: "Detect spikes (z-score > 3)",
      config: { method: "zscore", threshold: 3, bucketMinutes: 5 },
    },
    { nodeType: "ai_summarize", description: "Explain findings and suggest likely causes", config: {} },
  ],
};

export function getDefaultSteps(sourceId: string): GeneratedStep[] {
  return DEFAULTS[sourceId] ?? DEFAULTS.payments;
}
