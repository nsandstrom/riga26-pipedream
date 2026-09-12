import { VisualizationsView } from "@/components/results/VisualizationsView";
import { AggregationsView } from "@/components/results/AggregationsView";

export function ChartsTab() {
  return (
    <div className="space-y-4">
      <div className="h-56 rounded-lg border border-zinc-200">
        <VisualizationsView compact />
      </div>
      <div className="h-56 rounded-lg border border-zinc-200">
        <AggregationsView />
      </div>
    </div>
  );
}
