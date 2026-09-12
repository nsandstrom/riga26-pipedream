import type { FilterCondition, FilterConfig, LogEntry } from "@/lib/types";

function matches(entry: LogEntry, condition: FilterCondition): boolean {
  const raw = entry[condition.field];
  if (raw === undefined || raw === null) return false;

  switch (condition.op) {
    case "=":
      return String(raw).toLowerCase() === String(condition.value).toLowerCase();
    case "!=":
      return String(raw).toLowerCase() !== String(condition.value).toLowerCase();
    case "contains":
      return String(raw).toLowerCase().includes(String(condition.value).toLowerCase());
    case ">":
      return Number(raw) > Number(condition.value);
    case "<":
      return Number(raw) < Number(condition.value);
    case ">=":
      return Number(raw) >= Number(condition.value);
    case "<=":
      return Number(raw) <= Number(condition.value);
    default:
      return false;
  }
}

export function runFilter(entries: LogEntry[], config: FilterConfig): LogEntry[] {
  if (!config.conditions || config.conditions.length === 0) return entries;

  return entries.filter((entry) => {
    if (config.logic === "OR") {
      return config.conditions.some((c) => matches(entry, c));
    }
    return config.conditions.every((c) => matches(entry, c));
  });
}
