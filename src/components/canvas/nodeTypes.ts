import { PipelineNode } from "@/components/canvas/nodes/PipelineNode";

export const nodeTypes = {
  logs_source: PipelineNode,
  parse: PipelineNode,
  filter: PipelineNode,
  group_by: PipelineNode,
  anomaly: PipelineNode,
  correlate: PipelineNode,
  ai_summarize: PipelineNode,
};
