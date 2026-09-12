"use client";

import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { usePipeline } from "@/lib/state/PipelineProvider";

export function PromptBar() {
  const { prompt, setPrompt, generatePipeline, isGenerating, generateError, selectedSource } = usePipeline();

  const submit = () => {
    if (!isGenerating && prompt.trim()) void generatePipeline();
  };

  return (
    <div className="border-b border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 shadow-sm focus-within:border-violet-300 focus-within:ring-1 focus-within:ring-violet-200">
        <Sparkles className="h-4 w-4 shrink-0 text-violet-500" />
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={selectedSource.scenarioHint}
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={isGenerating || !prompt.trim()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={submit}
          disabled={isGenerating || !prompt.trim()}
          className="flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Generate pipeline
        </button>
        {generateError && <span className="text-xs text-rose-600">{generateError}</span>}
      </div>
    </div>
  );
}
