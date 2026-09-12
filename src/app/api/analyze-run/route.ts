import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude/client";
import { AnalysisSchema } from "@/lib/claude/schemas";
import type { LogEntry, RunStats } from "@/lib/types";

interface RequestBody {
  prompt: string;
  source: { id: string; name: string };
  stats: RunStats;
  sample: LogEntry[];
}

const SYSTEM_PROMPT = `You are an SRE assistant analyzing the results of a log pipeline run in LogFlow.
You are given aggregate stats (group counts, and detected anomaly buckets with z-scores, baselines, and observed counts) plus a sample of matching raw log lines.
Write "narrative" as a single concise, factual analysis (1-3 short paragraphs, separated by a blank line — not a list): what spiked, when, by how much, which group (service/pod/path/user) was affected, and a plausible root-cause hypothesis — grounded ONLY in the provided data. Cite specifics you actually see in the sample (error messages, status codes, field values). Do not invent facts, services, or field values not present in the input.
If the stats include a "correlation" object, it reports a real, already-computed Pearson coefficient (not your estimate) between the primary metric and a secondary metric from a different log source, bucketed over the same time window — explicitly state the coefficient, whether it's a positive or negative relationship, and what that implies (e.g. a coefficient around -0.5 or lower means the two metrics move in clearly opposite directions). Do not recompute or second-guess the coefficient; just interpret it.
Then list 2-6 short key findings as single-sentence bullets (pick the most fitting icon per finding: "spike" for a rate/volume spike, "error" for a specific error signature, "key" for an auth/credential related fact, "shield" for a security-relevant fact, "info" for anything else), and 2-5 concrete, actionable next steps ordered by priority.`;

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, source, stats, sample } = body;
  if (!source || !stats || !sample) {
    return NextResponse.json({ error: "Missing source, stats, or sample" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set — add it to .env.local and restart the dev server." },
      { status: 401 },
    );
  }

  const userMessage = `Log source: "${source.name}"
Original user request: ${prompt ?? "(none given)"}

Stats:
${JSON.stringify(stats, null, 2)}

Sample matching log lines (up to ${sample.length}):
${JSON.stringify(sample.slice(0, 30), null, 2)}`;

  try {
    const response = await anthropic.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "low",
        format: zodOutputFormat(AnalysisSchema),
      },
      messages: [{ role: "user", content: userMessage }],
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return NextResponse.json({ error: "Claude did not return a valid analysis" }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("analyze-run failed", error);
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited by Claude — try again shortly." }, { status: 429 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Claude API authentication failed — check ANTHROPIC_API_KEY." }, { status: 401 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 500 });
    }
    return NextResponse.json({ error: "Unknown error generating analysis" }, { status: 500 });
  }
}
