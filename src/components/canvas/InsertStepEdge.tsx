import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { Plus } from "lucide-react";

export function InsertStepEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: "#a1a1aa", strokeWidth: 1.5, strokeDasharray: "4 3" }} />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          className="pointer-events-auto absolute"
        >
          <button
            type="button"
            title="Insert step (coming soon)"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-500 shadow-sm transition hover:border-zinc-400 hover:text-zinc-700"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
