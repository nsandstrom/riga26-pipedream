"use client";

import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { usePipeline } from "@/lib/state/PipelineProvider";
import { Tabs } from "@/components/ui/Tabs";
import { SummaryTab } from "@/components/run-result/SummaryTab";
import { ChartsTab } from "@/components/run-result/ChartsTab";
import { DetailsTab } from "@/components/run-result/DetailsTab";
import { LogsTable } from "@/components/results/LogsTable";

export function RunResultPanel() {
  const { runResult, activeRunResultTab, setActiveRunResultTab } = usePipeline();

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-4">
        <h2 className="mb-2 text-base font-semibold text-zinc-900">Run result</h2>
        <StatusLine />
      </div>

      {runResult.status !== "idle" && (
        <>
          <div className="px-4 pt-2">
            <Tabs
              tabs={[
                { id: "summary", label: "Summary" },
                { id: "charts", label: "Charts" },
                { id: "logs", label: "Logs" },
                { id: "details", label: "Details" },
              ]}
              active={activeRunResultTab}
              onChange={setActiveRunResultTab}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {activeRunResultTab === "summary" && <SummaryTab runResult={runResult} />}
            {activeRunResultTab === "charts" && <ChartsTab />}
            {activeRunResultTab === "logs" && (
              <div className="-mx-4 -my-4 h-[calc(100%+2rem)]">
                <LogsTable />
              </div>
            )}
            {activeRunResultTab === "details" && <DetailsTab runResult={runResult} />}
          </div>
        </>
      )}

      {runResult.status === "idle" && (
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-center text-sm text-zinc-400">Click &quot;Run pipeline&quot; to see results here.</p>
        </div>
      )}
    </aside>
  );
}

function StatusLine() {
  const { runResult } = usePipeline();

  if (runResult.status === "idle") return null;

  if (runResult.status === "running") {
    return (
      <div className="flex items-center gap-1.5 text-sm text-zinc-500">
        <CircleDashed className="h-4 w-4 animate-spin" />
        Running…
      </div>
    );
  }

  if (runResult.status === "error") {
    return (
      <div className="flex items-center gap-1.5 text-sm text-rose-600">
        <XCircle className="h-4 w-4" />
        {runResult.error ?? "Run failed"}
      </div>
    );
  }

  const seconds = ((runResult.durationMs ?? 0) / 1000).toFixed(1);
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        Completed in {seconds}s
      </div>
      <p className="text-xs text-zinc-400">
        {(runResult.stats?.totalProcessed ?? 0).toLocaleString()} log lines processed
      </p>
    </div>
  );
}
