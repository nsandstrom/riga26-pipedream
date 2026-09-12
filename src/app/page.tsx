import { PipelineProvider } from "@/lib/state/PipelineProvider";
import { TopBar } from "@/components/layout/TopBar";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { PromptBar } from "@/components/prompt/PromptBar";
import { PipelineCanvas } from "@/components/canvas/PipelineCanvas";
import { ResultsTabs } from "@/components/results/ResultsTabs";
import { RunResultPanel } from "@/components/run-result/RunResultPanel";

export default function Home() {
  return (
    <PipelineProvider>
      <div className="flex h-screen flex-col bg-zinc-50">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <LeftSidebar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <PromptBar />
            <div className="min-h-0 flex-[3] border-b border-zinc-200">
              <PipelineCanvas />
            </div>
            <div className="min-h-0 flex-[2]">
              <ResultsTabs />
            </div>
          </main>
          <RunResultPanel />
        </div>
      </div>
    </PipelineProvider>
  );
}
