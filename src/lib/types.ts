// Shared types for LogFlow — source of truth for the data model.

export type FieldType = "string" | "number" | "timestamp" | "enum";

export interface FieldSchema {
  name: string;
  type: FieldType;
  description?: string;
}

export type SourceIcon = "db" | "k8s" | "nginx" | "card" | "lock";

export interface LogSource {
  id: string;
  name: string;
  icon: SourceIcon;
  sizeLabel: string;
  retentionLabel: string;
  format: "structured" | "raw";
  fields: FieldSchema[];
  scenarioHint: string;
}

export interface LogEntry {
  timestamp: string;
  level?: "DEBUG" | "INFO" | "WARN" | "ERROR";
  service?: string;
  message?: string;
  trace_id?: string;
  span_id?: string;
  user_id?: string;
  request_id?: string;
  status?: number;
  method?: string;
  path?: string;
  duration_ms?: number;
  host?: string;
  "k8s.pod"?: string;
  "k8s.namespace"?: string;
  error?: string;
  raw?: string;
  [key: string]: unknown;
}

// ---- Pipeline graph ----

export type PipelineNodeType =
  | "logs_source"
  | "parse"
  | "filter"
  | "group_by"
  | "anomaly"
  | "correlate"
  | "ai_summarize";

export type FilterOp = "=" | "!=" | "contains" | ">" | "<" | ">=" | "<=";

export interface FilterCondition {
  field: string;
  op: FilterOp;
  value: string | number;
}

export interface FilterConfig {
  conditions: FilterCondition[];
  logic: "AND" | "OR";
}

export interface GroupByConfig {
  field: string;
  aggregation: "count" | "avg" | "sum";
  aggField?: string;
}

export interface AnomalyConfig {
  method: "zscore";
  threshold: number;
  bucketMinutes: number;
}

export interface ParseConfig {
  format: "json" | "combined_log";
}

export interface SummarizeConfig {
  instructions?: string;
}

// Brings in a second log source as a parallel metric to correlate against the
// primary pipeline's matched entries — e.g. "nginx request volume" vs.
// "payments-service completions" over the same time window.
export interface CorrelateConfig {
  secondarySourceId: string;
  secondaryLabel: string;
  secondaryConditions: FilterCondition[];
  secondaryLogic: "AND" | "OR";
  bucketMinutes: number;
}

export type PipelineNodeConfig =
  | ParseConfig
  | FilterConfig
  | GroupByConfig
  | AnomalyConfig
  | SummarizeConfig
  | CorrelateConfig
  | Record<string, never>;

export interface PipelineNodeData {
  nodeType: PipelineNodeType;
  label: string;
  description: string;
  config: PipelineNodeConfig;
  [key: string]: unknown;
}

// ---- Run results ----

export interface GroupResult {
  key: string;
  count: number;
}

export interface AnomalyBucket {
  groupKey: string;
  bucketStart: string;
  observed: number;
  baseline: number;
  zscore: number;
}

export interface CorrelationPoint {
  bucketStart: string;
  primary: number;
  secondary: number;
}

export interface CorrelationResult {
  secondarySourceId: string;
  secondarySourceName: string;
  secondaryLabel: string;
  primaryLabel: string;
  coefficient: number;
  points: CorrelationPoint[];
}

export interface RunStats {
  totalProcessed: number;
  matchedCount: number;
  groups: GroupResult[];
  groupField?: string;
  anomalies: AnomalyBucket[];
  windowStart?: string;
  windowEnd?: string;
  correlation?: CorrelationResult;
}

export type FindingIcon = "spike" | "error" | "key" | "shield" | "info";

export interface KeyFinding {
  icon: FindingIcon;
  text: string;
}

export interface AnalysisResult {
  narrative: string;
  keyFindings: KeyFinding[];
  nextSteps: string[];
}

export type RunStatus = "idle" | "running" | "completed" | "error";

export interface RunResult {
  status: RunStatus;
  startedAt?: string;
  durationMs?: number;
  stats?: RunStats;
  matchedEntries: LogEntry[];
  totalMatchedCount: number;
  analysis?: AnalysisResult;
  analysisLoading?: boolean;
  analysisError?: string;
  error?: string;
}
