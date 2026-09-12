import { TrendingUp, AlertTriangle, KeyRound, ShieldAlert, Info, type LucideIcon } from "lucide-react";
import type { FindingIcon, KeyFinding } from "@/lib/types";

const ICONS: Record<FindingIcon, LucideIcon> = {
  spike: TrendingUp,
  error: AlertTriangle,
  key: KeyRound,
  shield: ShieldAlert,
  info: Info,
};

const COLORS: Record<FindingIcon, string> = {
  spike: "text-rose-600 bg-rose-50",
  error: "text-amber-600 bg-amber-50",
  key: "text-violet-600 bg-violet-50",
  shield: "text-blue-600 bg-blue-50",
  info: "text-zinc-500 bg-zinc-100",
};

export function KeyFindingsList({ findings }: { findings: KeyFinding[] }) {
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold text-zinc-900">Key findings</h3>
      <ul className="space-y-1.5">
        {findings.map((finding, i) => {
          const Icon = ICONS[finding.icon];
          return (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${COLORS[finding.icon]}`}>
                <Icon className="h-3 w-3" />
              </span>
              <span>{finding.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
