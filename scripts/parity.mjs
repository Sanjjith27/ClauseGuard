/*
 * ClauseGuard parity test
 * =======================
 * Proves the in-browser detector (frontend/src/detector.ts) and the FastAPI
 * backend (backend/app/clauses.py) return identical results.
 *
 * Usage:
 *   cd frontend
 *   npx esbuild src/detector.ts --bundle --format=esm --platform=node \
 *       --outfile=detector.mjs
 *   node ../scripts/parity.mjs detector.mjs
 *
 * Requires the backend on http://127.0.0.1:8000. Exits non-zero on any diff.
 */
import { pathToFileURL } from "node:url";

const detectorPath = process.argv[2];
if (!detectorPath) {
  console.error("usage: node scripts/parity.mjs <path-to-bundled-detector.mjs>");
  process.exit(2);
}

const { analyzeLocally } = await import(pathToFileURL(detectorPath).href);

const API = process.env.CLAUSEGUARD_API || "http://127.0.0.1:8000/api";

async function getJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function waitForBackend() {
  for (let i = 0; i < 40; i++) {
    try {
      await getJson(`${API}/health`);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return false;
}

if (!(await waitForBackend())) {
  console.error(`FAIL: backend not reachable at ${API}`);
  process.exit(1);
}

const samples = await getJson(`${API}/samples`);
const cases = Object.entries(samples).map(([key, v]) => [key, v.name, v.text]);

cases.push([
  "edge-trial-and-notice",
  "Edge Trial",
  "14-day free trial. Cancellation requires at least 30 days written notice. Non-refundable.",
]);
cases.push([
  "edge-notice-inside-trial",
  "Edge Trial 2",
  "7-day free trial. Cancel at least 72 hours before the trial ends or it auto-converts.",
]);
cases.push([
  "edge-clean",
  "Edge Clean",
  "This agreement has no risky terms at all and is written plainly.",
]);

const FIELDS = [
  "fairness_score",
  "money_at_risk",
  "reading_time_saved_mins",
  "cutoff_summary",
  "cutoff_date_iso",
  "dispute_email",
  "clauses",
];

let failed = 0;

for (const [key, name, text] of cases) {
  const local = analyzeLocally(text, name);
  const remote = await getJson(`${API}/analyze-text`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, contract_name: name }),
  });

  const diffs = FIELDS.filter(
    (field) => JSON.stringify(local[field]) !== JSON.stringify(remote[field]),
  );

  if (diffs.length === 0) {
    console.log(
      `PASS ${key}  score=${local.fairness_score} money=$${local.money_at_risk} clauses=${local.clauses.length}`,
    );
  } else {
    failed++;
    console.log(`FAIL ${key}`);
    for (const field of diffs) {
      console.log(`  ${field}`);
      console.log(`    local : ${JSON.stringify(local[field])}`);
      console.log(`    remote: ${JSON.stringify(remote[field])}`);
    }
  }
}

console.log(`\n${cases.length - failed}/${cases.length} cases identical`);
process.exitCode = failed === 0 ? 0 : 1;
