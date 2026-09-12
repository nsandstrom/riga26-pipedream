import { Loader2 } from "lucide-react";
import type { RunResult } from "@/lib/types";
import { AiAnalysisBlock } from "@/components/run-result/AiAnalysisBlock";
import { KeyFindingsList } from "@/components/run-result/KeyFindingsList";
import { NextStepsBox } from "@/components/run-result/NextStepsBox";

export function SummaryTab({ runResult }: { runResult: RunResult }) {
  if (runResult.analysisLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Asking Claude to analyze the results…
      </div>
    );
  }

  if (runResult.analysisError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
        Couldn&apos;t generate an analysis: {runResult.analysisError}
      </div>
    );
  }

  if (!runResult.analysis) {
    return <p className="text-sm text-zinc-400">No analysis yet.</p>;
  }

  return (
    <div className="space-y-4">
      <AiAnalysisBlock narrative={runResult.analysis.narrative} />
      <KeyFindingsList findings={runResult.analysis.keyFindings} />
      <NextStepsBox steps={runResult.analysis.nextSteps} />
    </div>
  );
}
