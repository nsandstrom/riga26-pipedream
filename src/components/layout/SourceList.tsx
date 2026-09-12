"use client";

import { Database, Boxes, Server, CreditCard, Lock, Plus, type LucideIcon } from "lucide-react";
import { usePipeline } from "@/lib/state/PipelineProvider";
import type { SourceIcon } from "@/lib/types";

const ICONS: Record<SourceIcon, LucideIcon> = {
  db: Database,
  k8s: Boxes,
  nginx: Server,
  card: CreditCard,
  lock: Lock,
};

const ICON_COLORS: Record<SourceIcon, string> = {
  db: "text-violet-600 bg-violet-100",
  k8s: "text-blue-600 bg-blue-100",
  nginx: "text-emerald-600 bg-emerald-100",
  card: "text-amber-600 bg-amber-100",
  lock: "text-rose-600 bg-rose-100",
};

export function SourceList() {
  const { sources, selectedSource, selectSource } = usePipeline();

  return (
    <div className="border-b border-zinc-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Log sources</h2>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          <Plus className="h-3 w-3" />
          Add source
        </button>
      </div>
      <ul className="space-y-1">
        {sources.map((source) => {
          const Icon = ICONS[source.icon];
          const active = source.id === selectedSource.id;
          return (
            <li key={source.id}>
              <button
                type="button"
                onClick={() => selectSource(source.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition ${
                  active ? "bg-violet-50 ring-1 ring-violet-200" : "hover:bg-zinc-50"
                }`}
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${ICON_COLORS[source.icon]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className={`truncate text-sm font-medium ${active ? "text-violet-900" : "text-zinc-800"}`}>
                    {source.name}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {source.sizeLabel} · {source.retentionLabel}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
