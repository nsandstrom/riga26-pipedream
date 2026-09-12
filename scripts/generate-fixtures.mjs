// One-off generator for LogFlow's static mock log fixtures.
// Run with `node scripts/generate-fixtures.mjs` to regenerate the committed
// JSON files under src/lib/fixtures/. Output is deterministic (seeded RNG)
// so re-runs produce identical data.

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "fixtures");

// Reference "now" for the demo: end of each fixture's 24h window.
const REFERENCE_END = new Date("2026-09-12T14:30:00.000Z").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_START = REFERENCE_END - DAY_MS;

// A cross-source correlated incident, shared by generatePayments() and
// generateNginx(): recurring traffic surges on nginx (high request volume)
// land at the same times payments-service's completion rate craters — the
// scenario the "Correlate" pipeline step is built to surface ("high traffic
// correlates with low completed payments"). Three occurrences (not just one)
// so the pattern reads as a real correlation across the day rather than a
// single outlier bucket. Distinct from each source's own independent burst
// window above so the two stories don't overlap.
//
// Windows are aligned exactly to 30-minute boundaries from WINDOW_START (the
// same bucket size the Correlate step defaults to) so each surge fills one
// whole chart bucket instead of smearing across two partial ones.
const CORRELATE_BUCKET_MS = 30 * 60 * 1000;
const TRAFFIC_SURGE_BUCKET_INDEXES = [8, 20, 34]; // spread across the 48 buckets in a day
const TRAFFIC_SURGE_WINDOWS = TRAFFIC_SURGE_BUCKET_INDEXES.map((k) => ({
  start: WINDOW_START + k * CORRELATE_BUCKET_MS,
  end: WINDOW_START + (k + 1) * CORRELATE_BUCKET_MS,
}));

function inTrafficSurge(t) {
  return TRAFFIC_SURGE_WINDOWS.some((w) => t >= w.start && t < w.end);
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function iso(ms) {
  return new Date(ms).toISOString();
}

function id(rng, len = 16) {
  const chars = "abcdef0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(rng() * chars.length)];
  return s;
}

// ---------------------------------------------------------------------------
// 1. payments.json — JWT "invalid signature" spike (the reference screenshot
//    scenario). Services: payments-service, auth-service, orders-service.
// ---------------------------------------------------------------------------
function generatePayments() {
  const rng = mulberry32(1);
  const entries = [];
  const services = ["payments-service", "auth-service", "orders-service"];

  const burstStart = WINDOW_START + (14 * 3600 + 28 * 60) * 1000; // 14:28 UTC
  const burstEnd = burstStart + 6 * 60 * 1000; // 6 minute burst
  const deployTime = burstStart - 2 * 60 * 1000; // deploy 2 min before spike

  // Baseline traffic: every ~25s per service, mostly successful, tiny error rate.
  for (const service of services) {
    for (let t = WINDOW_START; t < WINDOW_START + DAY_MS; t += 25_000) {
      if (t >= burstStart && t < burstEnd) continue; // burst handled separately
      // Cross-source correlated incident: payments-service completions drop
      // sharply (kept at ~1-in-8 the normal rate) while nginx traffic surges
      // at the same time — see TRAFFIC_SURGE_WINDOWS above.
      if (service === "payments-service" && inTrafficSurge(t) && rng() > 0.08) {
        continue;
      }
      const jitter = Math.floor(rng() * 20_000);
      const ts = t + jitter;
      const isError = rng() < 0.005; // ~0.5% baseline error rate
      entries.push({
        timestamp: iso(ts),
        level: isError ? "ERROR" : "INFO",
        service,
        message: isError
          ? pick(rng, [
              "Authentication failed: invalid signature for token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
              "Authentication failed: token expired",
            ])
          : pick(rng, [
              "Payment completed successfully",
              "Order validated",
              "Token validated successfully",
              "Health check OK",
            ]),
        trace_id: id(rng, 32),
        span_id: id(rng, 16),
        user_id: `user_${Math.floor(rng() * 9000 + 1000)}`,
        request_id: id(rng, 12),
        status: isError ? 401 : 200,
        host: `${service}-${1 + Math.floor(rng() * 3)}.internal`,
      });
    }
  }

  // Deploy marker.
  entries.push({
    timestamp: iso(deployTime),
    level: "INFO",
    service: "deploy-bot",
    message: "Deployed version v2.4.1 to payments-service",
    trace_id: id(rng, 32),
    request_id: id(rng, 12),
    host: "ci-runner-3.internal",
  });

  // Burst: dense auth failures, ~83% "invalid signature".
  for (let t = burstStart; t < burstEnd; t += 1_500) {
    const jitter = Math.floor(rng() * 1_200);
    const ts = t + jitter;
    const service = rng() < 0.7 ? "payments-service" : pick(rng, ["auth-service", "orders-service"]);
    const roll = rng();
    const message =
      roll < 0.83
        ? "Authentication failed: invalid signature for token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        : roll < 0.91
          ? "Failed to validate token: key not found"
          : roll < 0.97
            ? "Authentication failed: token expired"
            : "Authentication failed: invalid audience";
    entries.push({
      timestamp: iso(ts),
      level: "ERROR",
      service,
      message,
      trace_id: id(rng, 32),
      span_id: id(rng, 16),
      user_id: `user_${Math.floor(rng() * 9000 + 1000)}`,
      request_id: id(rng, 12),
      status: 401,
      host: `${service}-${1 + Math.floor(rng() * 3)}.internal`,
    });
  }

  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return entries;
}

// ---------------------------------------------------------------------------
// 2. kubernetes.json — OOMKilled / crash-loop spike in the checkout namespace.
// ---------------------------------------------------------------------------
function generateKubernetes() {
  const rng = mulberry32(2);
  const entries = [];
  const namespaces = ["checkout", "catalog", "shipping"];
  const podsByNs = {
    checkout: ["checkout-worker-7f9c8d", "checkout-worker-7f9c8e", "checkout-worker-7f9c8f"],
    catalog: ["catalog-api-4b1a2c", "catalog-api-4b1a2d"],
    shipping: ["shipping-worker-9e2f1a", "shipping-worker-9e2f1b"],
  };

  const burstStart = WINDOW_START + (9 * 3600 + 12 * 60) * 1000; // 09:12 UTC
  const burstEnd = burstStart + 8 * 60 * 1000; // 8 minute burst
  const configChangeTime = burstStart - 3 * 60 * 1000;

  for (const ns of namespaces) {
    for (const pod of podsByNs[ns]) {
      for (let t = WINDOW_START; t < WINDOW_START + DAY_MS; t += 40_000) {
        if (t >= burstStart && t < burstEnd && ns === "checkout") continue;
        const jitter = Math.floor(rng() * 30_000);
        const ts = t + jitter;
        const isWarn = rng() < 0.01;
        entries.push({
          timestamp: iso(ts),
          level: isWarn ? "WARN" : "INFO",
          message: isWarn
            ? "Liveness probe latency elevated"
            : pick(rng, ["Container started", "Liveness probe succeeded", "Readiness probe succeeded"]),
          "k8s.pod": pod,
          "k8s.namespace": ns,
          host: `node-${1 + Math.floor(rng() * 6)}.cluster.internal`,
        });
      }
    }
  }

  entries.push({
    timestamp: iso(configChangeTime),
    level: "INFO",
    message: "Applied resource limits update to checkout deployment (memory: 256Mi)",
    "k8s.pod": "checkout-worker-7f9c8d",
    "k8s.namespace": "checkout",
    host: "control-plane.cluster.internal",
  });

  for (let t = burstStart; t < burstEnd; t += 4_000) {
    const jitter = Math.floor(rng() * 3_000);
    const ts = t + jitter;
    const pod = pick(rng, podsByNs.checkout);
    const roll = rng();
    const message =
      roll < 0.55
        ? "OOMKilled"
        : roll < 0.85
          ? "Back-off restarting failed container"
          : "Liveness probe failed: connection refused";
    entries.push({
      timestamp: iso(ts),
      level: "ERROR",
      message,
      "k8s.pod": pod,
      "k8s.namespace": "checkout",
      host: `node-${1 + Math.floor(rng() * 6)}.cluster.internal`,
    });
  }

  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return entries;
}

// ---------------------------------------------------------------------------
// 3. nginx.json — raw combined-log-format lines, 502/504 spike on /checkout.
// ---------------------------------------------------------------------------
function generateNginx() {
  const rng = mulberry32(3);
  const entries = [];
  const paths = ["/", "/catalog", "/checkout", "/cart", "/api/health"];
  const ips = Array.from({ length: 12 }, (_, i) => `10.0.${Math.floor(i / 4)}.${(i % 4) * 10 + 5}`);

  const burstStart = WINDOW_START + (18 * 3600 + 45 * 60) * 1000; // 18:45 UTC
  const burstEnd = burstStart + 5 * 60 * 1000;

  function apacheDate(ms) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = new Date(ms);
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    const s = String(d.getUTCSeconds()).padStart(2, "0");
    return `${day}/${month}/${year}:${h}:${m}:${s} +0000`;
  }

  function line(ts, ip, method, path, status, bytes, durationMs) {
    return `${ip} - - [${apacheDate(ts)}] "${method} ${path} HTTP/1.1" ${status} ${bytes} "-" "Mozilla/5.0" ${durationMs}`;
  }

  for (let t = WINDOW_START; t < WINDOW_START + DAY_MS; t += 6_000) {
    if (t >= burstStart && t < burstEnd) continue;
    if (inTrafficSurge(t)) continue; // surge windows handled separately below
    const jitter = Math.floor(rng() * 5_000);
    const ts = t + jitter;
    const ip = pick(rng, ips);
    const path = pick(rng, paths);
    const isError = rng() < 0.008;
    const status = isError ? pick(rng, [500, 502, 504]) : 200;
    const duration = isError ? 800 + Math.floor(rng() * 400) : 20 + Math.floor(rng() * 120);
    entries.push({ timestamp: iso(ts), raw: line(ts, ip, "GET", path, status, 512 + Math.floor(rng() * 4000), duration) });
  }

  for (let t = burstStart; t < burstEnd; t += 1_000) {
    const jitter = Math.floor(rng() * 800);
    const ts = t + jitter;
    const ip = pick(rng, ips);
    const status = rng() < 0.6 ? 502 : 504;
    const duration = 2500 + Math.floor(rng() * 3000);
    entries.push({ timestamp: iso(ts), raw: line(ts, ip, "GET", "/checkout", status, 512, duration) });
  }

  // Cross-source correlated incident: traffic surges (~8x normal request
  // rate, still mostly 200s — real load, not an outage) landing at the same
  // times payments-service completions drop — see TRAFFIC_SURGE_WINDOWS above.
  for (const surge of TRAFFIC_SURGE_WINDOWS) {
    for (let t = surge.start; t < surge.end; t += 700) {
      const jitter = Math.floor(rng() * 600);
      const ts = t + jitter;
      const ip = pick(rng, ips);
      const path = pick(rng, paths);
      const isError = rng() < 0.02;
      const status = isError ? pick(rng, [500, 502]) : 200;
      const duration = isError ? 600 + Math.floor(rng() * 400) : 60 + Math.floor(rng() * 200);
      entries.push({ timestamp: iso(ts), raw: line(ts, ip, "GET", path, status, 512 + Math.floor(rng() * 4000), duration) });
    }
  }

  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return entries;
}

// ---------------------------------------------------------------------------
// 4. application-logs.json — unhandled exception spike after a deploy.
// ---------------------------------------------------------------------------
function generateApplicationLogs() {
  const rng = mulberry32(4);
  const entries = [];
  const services = ["web-frontend", "api-gateway", "worker"];

  const burstStart = WINDOW_START + (11 * 3600 + 3 * 60) * 1000; // 11:03 UTC
  const burstEnd = burstStart + 7 * 60 * 1000;
  const deployTime = burstStart - 90 * 1000;

  for (const service of services) {
    for (let t = WINDOW_START; t < WINDOW_START + DAY_MS; t += 20_000) {
      if (t >= burstStart && t < burstEnd && service === "worker") continue;
      const jitter = Math.floor(rng() * 18_000);
      const ts = t + jitter;
      const isError = rng() < 0.004;
      entries.push({
        timestamp: iso(ts),
        level: isError ? "ERROR" : "INFO",
        service,
        message: isError
          ? pick(rng, ["Timeout calling downstream service", "Unhandled exception in request handler"])
          : pick(rng, ["Request completed", "Job processed", "Cache hit", "Health check OK"]),
        trace_id: id(rng, 32),
        request_id: id(rng, 12),
        duration_ms: 10 + Math.floor(rng() * 200),
        host: `${service}-${1 + Math.floor(rng() * 4)}.internal`,
      });
    }
  }

  entries.push({
    timestamp: iso(deployTime),
    level: "INFO",
    service: "deploy-bot",
    message: "Deployed version 3.1.0 to worker",
    trace_id: id(rng, 32),
    request_id: id(rng, 12),
    host: "ci-runner-1.internal",
  });

  for (let t = burstStart; t < burstEnd; t += 2_000) {
    const jitter = Math.floor(rng() * 1_500);
    const ts = t + jitter;
    entries.push({
      timestamp: iso(ts),
      level: "ERROR",
      service: "worker",
      message: "Unhandled exception: NullReferenceException in OrderProcessor.Handle",
      error: "NullReferenceException",
      trace_id: id(rng, 32),
      request_id: id(rng, 12),
      duration_ms: 5 + Math.floor(rng() * 30),
      host: `worker-${1 + Math.floor(rng() * 4)}.internal`,
    });
  }

  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return entries;
}

// ---------------------------------------------------------------------------
// 5. auth.json — brute-force login attempts spike from a small set of users.
// ---------------------------------------------------------------------------
function generateAuth() {
  const rng = mulberry32(5);
  const entries = [];

  const burstStart = WINDOW_START + (3 * 3600 + 17 * 60) * 1000; // 03:17 UTC
  const burstEnd = burstStart + 4 * 60 * 1000;
  const targetUsers = ["user_1042", "user_7788", "user_3391"];

  for (let t = WINDOW_START; t < WINDOW_START + DAY_MS; t += 30_000) {
    if (t >= burstStart && t < burstEnd) continue;
    const jitter = Math.floor(rng() * 25_000);
    const ts = t + jitter;
    const isWarn = rng() < 0.01;
    entries.push({
      timestamp: iso(ts),
      level: isWarn ? "WARN" : "INFO",
      service: "auth-service",
      message: isWarn ? "Failed login attempt" : "Login succeeded",
      user_id: `user_${Math.floor(rng() * 9000 + 1000)}`,
      request_id: id(rng, 12),
      status: isWarn ? 401 : 200,
      host: `auth-service-${1 + Math.floor(rng() * 3)}.internal`,
    });
  }

  for (let t = burstStart; t < burstEnd; t += 1_000) {
    const jitter = Math.floor(rng() * 800);
    const ts = t + jitter;
    entries.push({
      timestamp: iso(ts),
      level: "WARN",
      service: "auth-service",
      message: "Failed login attempt",
      user_id: pick(rng, targetUsers),
      request_id: id(rng, 12),
      status: 401,
      host: `auth-service-${1 + Math.floor(rng() * 3)}.internal`,
    });
  }

  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return entries;
}

const fixtures = {
  "payments.json": generatePayments(),
  "kubernetes.json": generateKubernetes(),
  "nginx.json": generateNginx(),
  "application-logs.json": generateApplicationLogs(),
  "auth.json": generateAuth(),
};

for (const [filename, data] of Object.entries(fixtures)) {
  const outPath = join(OUT_DIR, filename);
  writeFileSync(outPath, JSON.stringify(data));
  console.log(`Wrote ${outPath} (${data.length} entries)`);
}
