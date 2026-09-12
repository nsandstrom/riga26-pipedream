import { z } from "zod";
import type { PipelineNodeConfig, PipelineNodeType } from "@/lib/types";

export const NODE_TYPES = [
  "logs_source",
  "parse",
  "filter",
  "group_by",
  "anomaly",
  "correlate",
  "ai_summarize",
] as const;

export const FilterConditionSchema = z.object({
  field: z.string(),
  op: z.enum(["=", "!=", "contains", ">", "<", ">=", "<="]),
  value: z.union([z.string(), z.number()]),
});

// Flattened union of every node type's config fields (all optional) — keeps
// the JSON schema Claude sees simple and strict-compatible. The app maps this
// down to the specific PipelineNodeConfig shape per nodeType below.
// NOTE: "conditions"/"logic" are reused for both a "filter" step's own filter
// AND a "correlate" step's secondary-source filter (a step is never both at
// once) — a second conditions array pushed the schema over Anthropic's
// structured-output complexity limit ("Schema is too complex").
export const RawStepConfigSchema = z.object({
  format: z.enum(["json", "combined_log"]).optional(),
  logic: z.enum(["AND", "OR"]).optional(),
  conditions: z.array(FilterConditionSchema).optional(),
  field: z.string().optional(),
  aggregation: z.enum(["count", "avg", "sum"]).optional(),
  aggField: z.string().optional(),
  threshold: z.number().optional(),
  bucketMinutes: z.number().optional(),
  instructions: z.string().optional(),
  // "correlate" step only — brings in a second source as a parallel metric.
  secondarySourceId: z.string().optional(),
  secondaryLabel: z.string().optional(),
});

export const PipelineStepSchema = z.object({
  nodeType: z.enum(NODE_TYPES),
  description: z.string(),
  config: RawStepConfigSchema,
});

export const PipelineSchema = z.object({
  steps: z.array(PipelineStepSchema).min(3).max(7),
});

export type RawStepConfig = z.infer<typeof RawStepConfigSchema>;
export type PipelineStep = z.infer<typeof PipelineStepSchema>;

// Maps the loosely-typed RawStepConfig Claude returns into the exact
// PipelineNodeConfig shape for a given nodeType, filling in safe defaults for
// anything the model omitted.
export function toNodeConfig(nodeType: PipelineNodeType, raw: RawStepConfig): PipelineNodeConfig {
  switch (nodeType) {
    case "parse":
      return { format: raw.format ?? "json" };
    case "filter":
      return { logic: raw.logic ?? "AND", conditions: raw.conditions ?? [] };
    case "group_by":
      return { field: raw.field ?? "service", aggregation: raw.aggregation ?? "count", aggField: raw.aggField };
    case "anomaly":
      return { method: "zscore", threshold: raw.threshold ?? 3, bucketMinutes: raw.bucketMinutes ?? 5 };
    case "correlate":
      return {
        secondarySourceId: raw.secondarySourceId ?? "",
        secondaryLabel: raw.secondaryLabel ?? "secondary metric",
        secondaryConditions: raw.conditions ?? [],
        secondaryLogic: raw.logic ?? "AND",
        bucketMinutes: raw.bucketMinutes ?? 30,
      };
    case "ai_summarize":
      return { instructions: raw.instructions };
    case "logs_source":
    default:
      return {};
  }
}

export const KeyFindingSchema = z.object({
  icon: z.enum(["spike", "error", "key", "shield", "info"]),
  text: z.string(),
});

export const AnalysisSchema = z.object({
  // A single text block (paragraphs separated by a blank line) rather than a
  // capped array — array "maxItems" constraints on structured output aren't
  // reliably enforced during generation, only validated client-side after the
  // fact, so a model with a lot to say (e.g. correlation reasoning) can
  // overflow a max() and fail the whole response. A string has no such limit.
  narrative: z.string(),
  keyFindings: z.array(KeyFindingSchema).min(2).max(8),
  nextSteps: z.array(z.string()).min(2).max(7),
});
