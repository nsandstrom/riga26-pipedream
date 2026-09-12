"use client";

import { Tabs } from "@/components/ui/Tabs";
import { usePipeline } from "@/lib/state/PipelineProvider";
import { LogsTable } from "@/components/results/LogsTable";
import { AggregationsView } from "@/components/results/AggregationsView";
import { VisualizationsView } from "@/components/results/VisualizationsView";

export function ResultsTabs() {
  const { activeResultsTab, setActiveResultsTab } = usePipeline();

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="px-4 pt-2">
        <Tabs
          tabs={[
            { id: "logs", label: "Logs (filtered)" },
            { id: "aggregations", label: "Aggregations" },
            { id: "visualizations", label: "Visualizations" },
          ]}
          active={activeResultsTab}
          onChange={setActiveResultsTab}
        />
      </div>
      <div className="min-h-0 flex-1">
        {activeResultsTab === "logs" && <LogsTable />}
        {activeResultsTab === "aggregations" && <AggregationsView />}
        {activeResultsTab === "visualizations" && <VisualizationsView />}
      </div>
    </div>
  );
}
