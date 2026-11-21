/*
 * ClauseGuard shared utilities.
 * Pure logic only - no React imports - so it stays cheap to bundle and easy to
 * reuse from the shell, the landing page and the console.
 */

import type { AnalysisResult, ClauseSeverity } from "./detector";

export const cn = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(" ");

/* -------------------------------------------------------------------------- */
/* Backend integration (optional - the app is fully standalone without it)     */
/* -------------------------------------------------------------------------- */
export const API_BASE =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE ||
  "http://127.0.0.1:8000/api";

export type EngineStatus = "checking" | "online" | "offline";

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms = 4000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Quick health probe used by the console's live engine telemetry pill. */
export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 1800);
    return res.ok;
  } catch {
    return false;
  }
}

export async function analyzeWithBackend(
  text: string,
  contractName: string,
): Promise<AnalysisResult | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/analyze-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, contract_name: contractName }),
    });
    if (!res.ok) return null;
    return (await res.json()) as AnalysisResult;
  } catch {
    return null;
  }
}

export async function analyzePdfWithBackend(file: File): Promise<AnalysisResult | null> {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetchWithTimeout(`${API_BASE}/analyze-pdf`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) return null;
    return (await res.json()) as AnalysisResult;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Local file downloads                                                        */
/* -------------------------------------------------------------------------- */
function downloadBlob(content: string, mime: string, filename: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "Contract";
}

/* -------------------------------------------------------------------------- */
/* .ics generation (client-side, no server required)                           */
/* -------------------------------------------------------------------------- */
function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function generateIcsContent(
  title: string,
  deadlineDate: Date,
  notes: string,
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  const now = new Date();
  const stamp = `${fmt(now)}T${pad(now.getUTCHours())}${pad(
    now.getUTCMinutes(),
  )}${pad(now.getUTCSeconds())}Z`;
  const date = fmt(deadlineDate);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClauseGuard//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:clauseguard-${date}-${Math.random().toString(36).slice(2, 10)}@clauseguard`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${date}T090000`,
    `DTEND:${date}T093000`,
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(notes)}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`Contract deadline approaching: ${title}`)}`,
    "TRIGGER:-P7D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(title: string, deadlineDate: Date, notes: string): void {
  downloadBlob(
    generateIcsContent(title, deadlineDate, notes),
    "text/calendar",
    `ClauseGuard_${slugify(title)}_${deadlineDate.toISOString().split("T")[0]}.ics`,
  );
}

/* -------------------------------------------------------------------------- */
/* Plain-text risk report                                                      */
/* -------------------------------------------------------------------------- */
export function buildAuditSummary(
  contractName: string,
  result: AnalysisResult,
  emailDraft?: string,
): string {
  const rule = "=".repeat(64);
  const thin = "-".repeat(64);
  const lines: string[] = [
    "CLAUSEGUARD RISK REPORT",
    rule,
    `Generated:  ${new Date().toLocaleString()}`,
    `Contract:   ${contractName}`,
    `Engine:     In-browser detector / optional FastAPI mirror`,
    "",
    "RISK TELEMETRY",
    thin,
    `Fairness score:        ${result.fairness_score}/100`,
    `Annual money at risk:  $${result.money_at_risk.toLocaleString()}`,
    `Reading time saved:    ${result.reading_time_saved_mins} mins`,
    `Cancellation cutoff:   ${result.cutoff_date_iso}`,
    `Deadline guidance:     ${result.cutoff_summary}`,
    "",
    `FLAGGED CLAUSES (${result.clauses.length})`,
    thin,
  ];

  if (result.clauses.length === 0) {
    lines.push("No risky clauses detected by the pattern rules.");
  } else {
    result.clauses.forEach((clause, i) => {
      lines.push(
        `${i + 1}. [${clause.severity}] ${clause.title}`,
        `   Dollar exposure: $${clause.dollar_impact.toLocaleString()}  |  Weight: ${clause.weight}`,
        `   Impact: ${clause.explanation}`,
        `   Verbatim: "${clause.verbatim_quote}"`,
        `   Safe counter-clause: ${clause.safe_redline}`,
        `   Negotiation leverage: ${clause.negotiation_leverage}`,
        "",
      );
    });
  }

  if (emailDraft && emailDraft.trim()) {
    lines.push("DISPUTE EMAIL DRAFT", thin, emailDraft.trim(), "");
  }

  lines.push(
    rule,
    "ClauseGuard is a pattern-based hackathon demo. Not legal advice.",
  );
  return lines.join("\n");
}

export function downloadAuditSummary(
  contractName: string,
  result: AnalysisResult,
  emailDraft?: string,
): void {
  downloadBlob(
    buildAuditSummary(contractName, result, emailDraft),
    "text/plain",
    `ClauseGuard_Risk_Report_${slugify(contractName)}.txt`,
  );
}

/* -------------------------------------------------------------------------- */
/* Shared presentation data                                                    */
/* -------------------------------------------------------------------------- */
export const severityStyles: Record<
  ClauseSeverity,
  { badge: string; bar: string; label: string }
> = {
  HIGH: {
    badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    bar: "bg-rose-500",
    label: "HIGH RISK",
  },
  MEDIUM: {
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    bar: "bg-amber-500",
    label: "CAUTION",
  },
  LOW: {
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    bar: "bg-emerald-500",
    label: "SAFE",
  },
};

export interface ScanHistoryEntry {
  id: string;
  name: string;
  text: string;
  result: AnalysisResult;
  at: string;
}
