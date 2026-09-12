import type { LogSource } from "@/lib/types";

// Canonical field list shown in the Fields panel, matching the reference
// design. Not every source populates every field on every row.
export const CANONICAL_FIELDS: LogSource["fields"] = [
  { name: "timestamp", type: "timestamp" },
  { name: "level", type: "enum", description: "DEBUG | INFO | WARN | ERROR" },
  { name: "service", type: "string" },
  { name: "message", type: "string" },
  { name: "trace_id", type: "string" },
  { name: "span_id", type: "string" },
  { name: "user_id", type: "string" },
  { name: "request_id", type: "string" },
  { name: "status", type: "number" },
  { name: "method", type: "string" },
  { name: "path", type: "string" },
  { name: "duration_ms", type: "number" },
  { name: "host", type: "string" },
  { name: "k8s.pod", type: "string" },
  { name: "k8s.namespace", type: "string" },
  { name: "error", type: "string" },
];

export const LOG_SOURCES: LogSource[] = [
  {
    id: "application-logs",
    name: "application-logs",
    icon: "db",
    sizeLabel: "3.2 GB",
    retentionLabel: "7 days",
    format: "structured",
    fields: CANONICAL_FIELDS,
    scenarioHint:
      "Find unhandled exceptions in the last 24 hours, group by service, and explain what changed after the last deploy.",
  },
  {
    id: "kubernetes",
    name: "kubernetes",
    icon: "k8s",
    sizeLabel: "12.8 GB",
    retentionLabel: "14 days",
    format: "structured",
    fields: CANONICAL_FIELDS,
    scenarioHint:
      "Find pods that are crash-looping or getting OOMKilled, group by pod, and detect unusual spikes.",
  },
  {
    id: "nginx",
    name: "nginx",
    icon: "nginx",
    sizeLabel: "4.1 GB",
    retentionLabel: "14 days",
    format: "raw",
    fields: CANONICAL_FIELDS,
    scenarioHint:
      "Find 5xx responses in the last 24 hours, group by path, and detect unusual latency spikes.",
  },
  {
    id: "payments",
    name: "payments",
    icon: "card",
    sizeLabel: "6.7 GB",
    retentionLabel: "30 days",
    format: "structured",
    fields: CANONICAL_FIELDS,
    scenarioHint:
      "Find authentication failures in the last 24 hours, group by service, detect unusual spikes, and summarize likely causes.",
  },
  {
    id: "auth",
    name: "auth",
    icon: "lock",
    sizeLabel: "2.9 GB",
    retentionLabel: "30 days",
    format: "structured",
    fields: CANONICAL_FIELDS,
    scenarioHint: "Find failed login attempts in the last 24 hours and group by user.",
  },
];

export const FIXTURE_URL: Record<string, string> = {
  "application-logs": "/fixtures/application-logs.json",
  kubernetes: "/fixtures/kubernetes.json",
  nginx: "/fixtures/nginx.json",
  payments: "/fixtures/payments.json",
  auth: "/fixtures/auth.json",
};

export function getSourceById(id: string): LogSource | undefined {
  return LOG_SOURCES.find((s) => s.id === id);
}
