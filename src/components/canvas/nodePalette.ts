import {
  Database,
  FileText,
  Filter,
  BarChart3,
  TrendingUp,
  Sparkles,
  GitCompareArrows,
  type LucideIcon,
} from "lucide-react";
import type { PipelineNodeType } from "@/lib/types";

export interface NodeStyle {
  icon: LucideIcon;
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
}

export const NODE_STYLES: Record<PipelineNodeType, NodeStyle> = {
  logs_source: {
    icon: Database,
    bg: "bg-violet-50",
    border: "border-violet-200",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  parse: {
    icon: FileText,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  filter: {
    icon: Filter,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  group_by: {
    icon: BarChart3,
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  anomaly: {
    icon: TrendingUp,
    bg: "bg-rose-50",
    border: "border-rose-200",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  correlate: {
    icon: GitCompareArrows,
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
  ai_summarize: {
    icon: Sparkles,
    bg: "bg-violet-50",
    border: "border-violet-200",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
};
