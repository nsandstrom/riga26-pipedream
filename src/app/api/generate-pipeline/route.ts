import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude/client";
import { PipelineSchema, toNodeConfig } from "@/lib/claude/schemas";
import { layoutPipeline, type GeneratedStep } from "@/lib/pipeline/layout";
import type { FieldSchema } from "@/lib/types";

interface SourceInfo {
  id: string;
  name: string;
  format: "structured" | "raw";
  fields: FieldSchema[];
}

interface RequestBody {
  prompt: string;
  source: SourceInfo;
  otherSources: SourceInfo[];
}

const SYSTEM_PROMPT = `You design log-analysis pipelines for LogFlow, a tool that lets users build a visual pipeline to analyze logs.
Given a natural-language request and a log source's field schema, output an ordered sequence of 3-7 pipeline steps starting with "logs_source" and ending with "ai_summarize".
Only reference field names from the given schema in filter conditions and group-by fields. Group-by fields should be low-cardinality categorical fields (e.g. service, level, status, k8s.pod), never high-cardinality fields like trace_id, request_id, or user_id.
If the source format is "raw", include a "parse" step with config.format "combined_log" right after "logs_source"; otherwise use config.format "json".
Keep each step's description short (under 12 words) and in the style of a terse config summary, for example: level = ERROR AND message contains "auth", or service count().
An "anomaly" step should always immediately follow the "group_by" step it analyzes, with a sensible threshold (around 3) and bucketMinutes (around 5).

Only if the user's request explicitly compares or correlates the primary source against a DIFFERENT log source (e.g. "does high traffic correlate with low completed payments", "compare X with Y"), add exactly one "correlate" step, placed right after the primary "filter"/"group_by"/"anomaly" steps and before "ai_summarize". Its config must set: secondarySourceId (the id of one of the "Other available sources" below — never the primary source's own id), secondaryLabel (a short human label for what's being measured on that source, e.g. "nginx request volume"), conditions + logic (reusing the same fields a "filter" step uses, but here defining the metric on the SECONDARY source — using ONLY that secondary source's own field names; use an empty conditions array to mean "count every log line", e.g. for raw request volume), and bucketMinutes (30 is a good default for a full-day comparison). Never add a "correlate" step if the request only concerns one source.`;

// Structured-output generation occasionally leaves a garbled duplicate
// attempt on free-text fields, e.g. `foo','` or `foo','?','foo`. Our
// description/label vocabulary never legitimately contains a single quote,
// a "?", or a comma (filter values use double quotes; phrases use "AND"/
// spaces, not commas) — so it's safe to take the text before the first
// comma and strip any stray '/? characters from it, without touching
// legitimate double quotes around filter values (e.g. `contains "auth"`).
function sanitizeLabel(text: string): string {
  return text.split(",")[0].replace(/['?]/g, "").trim();
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, source, otherSources } = body;
  if (!prompt || !source) {
    return NextResponse.json({ error: "Missing prompt or source" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set — add it to .env.local and restart the dev server." },
      { status: 401 },
    );
  }

  const fieldList = source.fields.map((f) => `${f.name} (${f.type})`).join(", ");
  const otherSourcesText = (otherSources ?? [])
    .map((s) => `- "${s.name}" (id: "${s.id}", format: ${s.format}) fields: ${s.fields.map((f) => f.name).join(", ")}`)
    .join("\n");
  const userMessage = `Log source: "${source.name}" (format: ${source.format})
Available fields: ${fieldList}

Other available sources (only use one of these for a "correlate" step's secondarySourceId, if the request asks for a cross-source comparison):
${otherSourcesText || "(none)"}

User request: ${prompt}`;

  try {
    const response = await anthropic.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "medium",
        format: zodOutputFormat(PipelineSchema),
      },
      messages: [{ role: "user", content: userMessage }],
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return NextResponse.json({ error: "Claude did not return a valid pipeline" }, { status: 502 });
    }

    const steps: GeneratedStep[] = parsed.steps.map((step) => {
      const config = toNodeConfig(step.nodeType, step.config);
      // Defensive cleanup — free-text fields occasionally pick up stray
      // trailing quote/comma characters from structured-output generation.
      if ("secondaryLabel" in config) config.secondaryLabel = sanitizeLabel(config.secondaryLabel);
      return { nodeType: step.nodeType, description: sanitizeLabel(step.description), config };
    });

    // Defensive normalization — the model is instructed to start with
    // logs_source and end with ai_summarize, but structured-output models
    // occasionally drop the bookend steps under a rushed generation.
    if (steps[0]?.nodeType !== "logs_source") {
      steps.unshift({ nodeType: "logs_source", description: "Last 24 hours", config: {} });
    }
    if (steps[steps.length - 1]?.nodeType !== "ai_summarize") {
      steps.push({
        nodeType: "ai_summarize",
        description: "Explain findings and suggest likely causes",
        config: {},
      });
    }

    const { nodes, edges } = layoutPipeline(steps);
    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error("generate-pipeline failed", error);
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited by Claude — try again shortly." }, { status: 429 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Claude API authentication failed — check ANTHROPIC_API_KEY." }, { status: 401 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 500 });
    }
    return NextResponse.json({ error: "Unknown error generating pipeline" }, { status: 500 });
  }
}
