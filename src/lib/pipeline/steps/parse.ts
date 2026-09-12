import type { LogEntry, LogSource } from "@/lib/types";

// Combined-log-format regex, with a trailing custom duration_ms field appended
// by the mock nginx fixture (not a standard Apache field, but documented here
// since this is the only place that parses it).
const COMBINED_LOG_RE =
  /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) HTTP\/[\d.]+" (\d+) (\d+) "[^"]*" "[^"]*" (\d+)$/;

export function runParse(entries: LogEntry[], source: LogSource): LogEntry[] {
  if (source.format !== "raw") {
    // Structured sources are already valid LogEntry objects — identity pass-through.
    return entries;
  }

  return entries.map((entry) => {
    const raw = entry.raw;
    if (typeof raw !== "string") return entry;
    const match = raw.match(COMBINED_LOG_RE);
    if (!match) return entry;
    const [, host, , method, path, status, , durationMs] = match;
    return {
      ...entry,
      host,
      method,
      path,
      status: Number(status),
      duration_ms: Number(durationMs),
      level: Number(status) >= 500 ? "ERROR" : Number(status) >= 400 ? "WARN" : "INFO",
      message: `${method} ${path} -> ${status}`,
    };
  });
}
