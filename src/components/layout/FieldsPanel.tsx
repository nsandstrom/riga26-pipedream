"use client";

import { Search } from "lucide-react";
import { usePipeline } from "@/lib/state/PipelineProvider";

export function FieldsPanel() {
  const { selectedSource, fieldQuery, setFieldQuery } = usePipeline();

  const fields = selectedSource.fields.filter((f) =>
    f.name.toLowerCase().includes(fieldQuery.toLowerCase()),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <h2 className="mb-2 text-sm font-semibold text-zinc-900">
        Fields <span className="font-normal text-zinc-400">(from selected source)</span>
      </h2>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
        <input
          value={fieldQuery}
          onChange={(e) => setFieldQuery(e.target.value)}
          placeholder="Search fields..."
          className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {fields.map((field) => (
          <li key={field.name}>
            <button
              type="button"
              title={field.description}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <span className="truncate font-mono text-[13px]">{field.name}</span>
              <span className="ml-2 shrink-0 text-[11px] uppercase tracking-wide text-zinc-400">{field.type}</span>
            </button>
          </li>
        ))}
        {fields.length === 0 && <li className="px-2 py-4 text-center text-xs text-zinc-400">No matching fields</li>}
      </ul>
    </div>
  );
}
