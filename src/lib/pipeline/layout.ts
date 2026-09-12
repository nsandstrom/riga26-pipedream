import type { Edge, Node } from "@xyflow/react";
import type { PipelineNodeConfig, PipelineNodeData, PipelineNodeType } from "@/lib/types";

const NODE_SPACING_X = 260;

export interface GeneratedStep {
  nodeType: PipelineNodeType;
  description: string;
  config: PipelineNodeConfig;
}

const LABELS: Record<PipelineNodeType, string> = {
  logs_source: "Logs Source",
  parse: "Parse",
  filter: "Filter",
  group_by: "Group By",
  anomaly: "Anomaly Detection",
  correlate: "Correlate",
  ai_summarize: "AI Summarize",
};

export function layoutPipeline(steps: GeneratedStep[]): { nodes: Node<PipelineNodeData>[]; edges: Edge[] } {
  const nodes: Node<PipelineNodeData>[] = steps.map((step, i) => ({
    id: `${step.nodeType}-${i}`,
    type: step.nodeType,
    position: { x: i * NODE_SPACING_X, y: 0 },
    data: {
      nodeType: step.nodeType,
      label: LABELS[step.nodeType],
      description: step.description,
      config: step.config,
    },
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: `e-${nodes[i].id}-${nodes[i + 1].id}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
      type: "insertStep",
    });
  }

  return { nodes, edges };
}
