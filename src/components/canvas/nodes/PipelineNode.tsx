import type { NodeProps, Node } from "@xyflow/react";
import type { PipelineNodeData } from "@/lib/types";
import { BaseNode } from "@/components/canvas/nodes/BaseNode";

type PipelineFlowNode = Node<PipelineNodeData>;

export function PipelineNode({ data }: NodeProps<PipelineFlowNode>) {
  return <BaseNode data={data} />;
}
