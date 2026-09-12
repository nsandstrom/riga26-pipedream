"use client";

import { Layers, Play, Loader2 } from "lucide-react";
import { usePipeline } from "@/lib/state/PipelineProvider";
import { PipeDreamGame } from "@/components/game/PipeDreamGame";

export function TopBar() {
  const { runPipeline, isRunning } = usePipeline();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 text-zinc-100">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-violet-400" />
          <span className="text-base font-semibold">LogFlow</span>
        </div>
        <span className="hidden text-sm text-zinc-500 sm:inline">Turn logs into answers.</span>
      </div>

      <div className="flex items-center gap-4">
        <nav className="hidden items-center gap-4 text-sm text-zinc-400 sm:flex">
          <span className="cursor-default hover:text-zinc-200">Docs</span>
          <span className="cursor-default hover:text-zinc-200">Examples</span>
        </nav>
        <PipeDreamGame />
        <button
          type="button"
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
        >
          Save
        </button>
        <button
          type="button"
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
        >
          Share
        </button>
        <button
          type="button"
          onClick={runPipeline}
          disabled={isRunning}
          className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run pipeline
        </button>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-700 text-xs font-semibold">
          JS
        </div>
      </div>
    </header>
  );
}
