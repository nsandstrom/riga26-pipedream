import { SourceList } from "@/components/layout/SourceList";
import { FieldsPanel } from "@/components/layout/FieldsPanel";

export function LeftSidebar() {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <SourceList />
      <FieldsPanel />
    </aside>
  );
}
