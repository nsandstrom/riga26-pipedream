import type { RunResult } from "@/lib/types";

export function DetailsTab({ runResult }: { runResult: RunResult }) {
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold text-zinc-900">Run stats</h3>
      <pre className="max-h-[60vh] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
        {JSON.stringify(
          {
            status: runResult.status,
            startedAt: runResult.startedAt,
            durationMs: runResult.durationMs,
            totalMatchedCount: runResult.totalMatchedCount,
            stats: runResult.stats,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}
