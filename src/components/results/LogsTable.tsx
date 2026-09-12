"use client";

import { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { usePipeline } from "@/lib/state/PipelineProvider";
import type { LogEntry } from "@/lib/types";

const LEVEL_STYLES: Record<string, string> = {
  ERROR: "text-rose-600",
  WARN: "text-amber-600",
  INFO: "text-zinc-500",
  DEBUG: "text-zinc-400",
};

function displayField(entry: LogEntry, primary: string, fallback: string): string {
  const value = entry[primary] ?? entry[fallback];
  return value === undefined || value === null ? "—" : String(value);
}

const DISPLAY_LIMIT = 500;

function downloadJson(entries: LogEntry[]) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "logflow-matching-logs.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function LogsTable() {
  const { runResult } = usePipeline();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    if (!query.trim()) return runResult.matchedEntries;
    const q = query.toLowerCase();
    return runResult.matchedEntries.filter((e) => JSON.stringify(e).toLowerCase().includes(q));
  }, [runResult.matchedEntries, query]);

  const displayedRows = useMemo(() => rows.slice(0, DISPLAY_LIMIT), [rows]);

  if (runResult.status === "idle") {
    return <EmptyState message="Run the pipeline to see matching log lines." />;
  }
  if (runResult.status === "running") {
    return <EmptyState message="Running pipeline…" />;
  }
  if (runResult.status === "error") {
    return <EmptyState message={runResult.error ?? "Something went wrong."} isError />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2">
        <span className="text-xs text-zinc-500">
          Showing {displayedRows.length.toLocaleString()} of {(query.trim() ? rows.length : runResult.totalMatchedCount).toLocaleString()} matching log lines
        </span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-40 rounded-md border border-zinc-200 py-1 pl-7 pr-2 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => downloadJson(rows)}
            className="flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="whitespace-nowrap px-4 py-2 font-medium">timestamp</th>
              <th className="whitespace-nowrap px-4 py-2 font-medium">service</th>
              <th className="whitespace-nowrap px-4 py-2 font-medium">level</th>
              <th className="px-4 py-2 font-medium">message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {displayedRows.map((entry, i) => (
              <tr key={i} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-zinc-500">
                  {entry.timestamp}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-zinc-700">
                  {displayField(entry, "service", "k8s.pod")}
                </td>
                <td className={`whitespace-nowrap px-4 py-2 font-medium ${LEVEL_STYLES[entry.level ?? ""] ?? "text-zinc-500"}`}>
                  {entry.level ?? "—"}
                </td>
                <td className="px-4 py-2 text-zinc-700">{entry.message ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {displayedRows.length === 0 && <div className="p-6 text-center text-sm text-zinc-400">No matching log lines.</div>}
      </div>
    </div>
  );
}

function EmptyState({ message, isError }: { message: string; isError?: boolean }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className={`text-sm ${isError ? "text-rose-600" : "text-zinc-400"}`}>{message}</p>
    </div>
  );
}
