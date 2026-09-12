"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  addEdge,
} from "@xyflow/react";
import type { LogEntry, LogSource, PipelineNodeData, RunResult } from "@/lib/types";
import { LOG_SOURCES, FIXTURE_URL, getSourceById } from "@/lib/fixtures/sources";
import { getDefaultSteps } from "@/lib/pipeline/defaultPipeline";
import { layoutPipeline } from "@/lib/pipeline/layout";
import { executePipeline, type GraphEdge, type GraphNode } from "@/lib/pipeline/engine";

export type ResultsTab = "logs" | "aggregations" | "visualizations";
export type RunResultTab = "summary" | "charts" | "logs" | "details";

const IDLE_RESULT: RunResult = { status: "idle", matchedEntries: [], totalMatchedCount: 0 };

interface PipelineContextValue {
  sources: LogSource[];
  selectedSource: LogSource;
  selectSource: (id: string) => void;

  fieldQuery: string;
  setFieldQuery: (q: string) => void;

  prompt: string;
  setPrompt: (p: string) => void;

  nodes: Node<PipelineNodeData>[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<Node<PipelineNodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  isGenerating: boolean;
  generateError: string | null;
  generatePipeline: () => Promise<void>;

  runResult: RunResult;
  isRunning: boolean;
  runPipeline: () => Promise<void>;

  activeResultsTab: ResultsTab;
  setActiveResultsTab: (t: ResultsTab) => void;
  activeRunResultTab: RunResultTab;
  setActiveRunResultTab: (t: RunResultTab) => void;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

function initialGraph(sourceId: string) {
  return layoutPipeline(getDefaultSteps(sourceId));
}

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [selectedSourceId, setSelectedSourceId] = useState(LOG_SOURCES[3]?.id ?? LOG_SOURCES[0].id); // default: payments
  const [fieldQuery, setFieldQuery] = useState("");
  const [prompt, setPrompt] = useState(() => getSourceById(LOG_SOURCES[3].id)?.scenarioHint ?? "");

  const initial = useMemo(() => initialGraph(selectedSourceId), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [nodes, setNodes] = useState<Node<PipelineNodeData>[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [runResult, setRunResult] = useState<RunResult>(IDLE_RESULT);
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>("logs");
  const [activeRunResultTab, setActiveRunResultTab] = useState<RunResultTab>("summary");

  const entriesCache = useRef<Map<string, LogEntry[]>>(new Map());

  const selectedSource = getSourceById(selectedSourceId) ?? LOG_SOURCES[0];

  const selectSource = useCallback((id: string) => {
    const source = getSourceById(id);
    if (!source) return;
    setSelectedSourceId(id);
    setFieldQuery("");
    setPrompt(source.scenarioHint);
    setGenerateError(null);
    setRunResult(IDLE_RESULT);
    setActiveResultsTab("logs");
    setActiveRunResultTab("summary");
    const graph = initialGraph(id);
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<PipelineNodeData>>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, type: "insertStep" }, eds)),
    [],
  );

  const loadEntries = useCallback(async (source: LogSource): Promise<LogEntry[]> => {
    const cached = entriesCache.current.get(source.id);
    if (cached) return cached;
    const url = FIXTURE_URL[source.id];
    if (!url) return [];
    const res = await fetch(url);
    const data: LogEntry[] = await res.json();
    entriesCache.current.set(source.id, data);
    return data;
  }, []);

  const generatePipeline = useCallback(async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/generate-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          source: {
            id: selectedSource.id,
            name: selectedSource.name,
            format: selectedSource.format,
            fields: selectedSource.fields,
          },
          otherSources: LOG_SOURCES.filter((s) => s.id !== selectedSource.id).map((s) => ({
            id: s.id,
            name: s.name,
            format: s.format,
            fields: s.fields,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate pipeline");
      setNodes(data.nodes);
      setEdges(data.edges);
      setRunResult(IDLE_RESULT);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate pipeline");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedSource]);

  const runPipeline = useCallback(async () => {
    const startedAt = Date.now();
    setActiveRunResultTab("summary");
    setRunResult({ status: "running", matchedEntries: [], totalMatchedCount: 0, startedAt: new Date(startedAt).toISOString() });

    try {
      const rawEntries = await loadEntries(selectedSource);
      const graphNodes: GraphNode[] = nodes.map((n) => ({ id: n.id, data: n.data }));
      const graphEdges: GraphEdge[] = edges.map((e) => ({ source: e.source, target: e.target }));

      // Preload any secondary sources referenced by "correlate" nodes so the
      // engine can bucket and correlate against them.
      const secondarySourceIds = new Set(
        graphNodes
          .filter((n) => n.data.nodeType === "correlate")
          .map((n) => (n.data.config as { secondarySourceId?: string }).secondarySourceId)
          .filter((id): id is string => Boolean(id)),
      );
      const secondarySources = new Map<string, LogEntry[]>();
      for (const id of secondarySourceIds) {
        const secondarySource = getSourceById(id);
        if (secondarySource) secondarySources.set(id, await loadEntries(secondarySource));
      }

      const result = executePipeline(selectedSource, rawEntries, graphNodes, graphEdges, secondarySources);
      const durationMs = Date.now() - startedAt;

      setRunResult({
        status: "completed",
        startedAt: new Date(startedAt).toISOString(),
        durationMs,
        stats: result.stats,
        matchedEntries: result.matchedEntries,
        totalMatchedCount: result.totalMatchedCount,
        analysisLoading: true,
      });

      try {
        const res = await fetch("/api/analyze-run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            source: { id: selectedSource.id, name: selectedSource.name },
            stats: result.stats,
            sample: result.sampleForAnalysis,
          }),
        });
        const analysis = await res.json();
        if (!res.ok) throw new Error(analysis.error ?? "Failed to analyze run");
        setRunResult((prev) => ({ ...prev, analysis, analysisLoading: false }));
      } catch (err) {
        setRunResult((prev) => ({
          ...prev,
          analysisLoading: false,
          analysisError: err instanceof Error ? err.message : "Failed to analyze run",
        }));
      }
    } catch (err) {
      setRunResult({
        status: "error",
        matchedEntries: [],
        totalMatchedCount: 0,
        error: err instanceof Error ? err.message : "Failed to run pipeline",
      });
    }
  }, [loadEntries, selectedSource, nodes, edges, prompt]);

  const isRunning = runResult.status === "running";

  const value: PipelineContextValue = {
    sources: LOG_SOURCES,
    selectedSource,
    selectSource,
    fieldQuery,
    setFieldQuery,
    prompt,
    setPrompt,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isGenerating,
    generateError,
    generatePipeline,
    runResult,
    isRunning,
    runPipeline,
    activeResultsTab,
    setActiveResultsTab,
    activeRunResultTab,
    setActiveRunResultTab,
  };

  return <PipelineContext.Provider value={value}>{children}</PipelineContext.Provider>;
}

export function usePipeline(): PipelineContextValue {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used within a PipelineProvider");
  return ctx;
}
