import { Lightbulb } from "lucide-react";

export function NextStepsBox({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
        <Lightbulb className="h-3.5 w-3.5" />
        Suggested next steps
      </div>
      <ol className="list-decimal space-y-1 pl-4 text-sm text-zinc-700">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
