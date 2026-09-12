import { Handle, Position } from "@xyflow/react";
import type { PipelineNodeData } from "@/lib/types";
import { NODE_STYLES } from "@/components/canvas/nodePalette";

export function BaseNode({ data, sourcePos }: { data: PipelineNodeData; sourcePos?: boolean }) {
  const style = NODE_STYLES[data.nodeType];
  const Icon = style.icon;

  return (
    <div
      className={`group relative w-56 rounded-xl border ${style.border} ${style.bg} p-3 shadow-sm transition-shadow hover:z-20 hover:shadow-md`}
    >
      {data.nodeType !== "logs_source" && (
        <Handle type="target" position={Position.Left} className="!bg-zinc-400" />
      )}
      <div className="flex items-start gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}>
          <Icon className={`h-4 w-4 ${style.iconColor}`} />
        </div>
        <div className="min-w-0 pt-0.5">
          <div className="text-sm font-semibold text-zinc-900">{data.label}</div>
          <div className="truncate text-xs text-zinc-500 group-hover:whitespace-normal group-hover:break-words">
            {data.description}
          </div>
        </div>
      </div>
      {(sourcePos ?? true) && data.nodeType !== "ai_summarize" && (
        <Handle type="source" position={Position.Right} className="!bg-zinc-400" />
      )}
    </div>
  );
}
