import { Sparkles } from "lucide-react";

export function AiAnalysisBlock({ narrative }: { narrative: string }) {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-violet-800">
        <Sparkles className="h-3.5 w-3.5" />
        AI analysis
      </div>
      <div className="space-y-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700">{narrative}</div>
    </div>
  );
}
