"use client";

import { useMemo } from "react";
import { ReactFlow, Background, BackgroundVariant, Controls, type EdgeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { usePipeline } from "@/lib/state/PipelineProvider";
import { nodeTypes } from "@/components/canvas/nodeTypes";
import { InsertStepEdge } from "@/components/canvas/InsertStepEdge";

const edgeTypes: EdgeTypes = { insertStep: InsertStepEdge };

export function PipelineCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = usePipeline();

  const defaultEdgeOptions = useMemo(() => ({ type: "insertStep" }), []);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e4e4e7" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
