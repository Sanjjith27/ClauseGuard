/*
 * ClauseGuard - Console dashboard
 * -------------------------------
 * Three focused sections (Document X-Ray, Risk Telemetry, Action Autopilot)
 * inside a roomy collapsible workspace. All analysis state is owned by App.tsx;
 * this component only renders it and exposes the interactions. The FastAPI
 * fallback, local PDF extraction and .ics generation paths remain untouched.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  FileDown,
  FileSearch,
  FileText,
  Gauge,
  History,
  Lightbulb,
  Loader2,
  Mail,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AnalysisResult, Clause } from "./detector";
import { sampleContracts, type SampleKey } from "./samples";
import {
  cn,
  downloadAuditSummary,
  downloadIcs,
  severityStyles,
  type EngineStatus,
  type ScanHistoryEntry,
} from "./shared";

type Section = "xray" | "telemetry" | "actions";

const NAV_ITEMS: Array<{ id: Section; label: string; icon: LucideIcon }> = [
  { id: "xray", label: "Document X-Ray", icon: FileSearch },
  { id: "telemetry", label: "Risk Telemetry", icon: AlertTriangle },
  { id: "actions", label: "Action Autopilot", icon: Zap },
];

const SECTION_LABEL: Record<Section, string> = {
  xray: "Document X-Ray",
  telemetry: "Risk Telemetry",
  actions: "Action Autopilot",
};

const SAMPLE_KEYS = Object.keys(sampleContracts) as SampleKey[];

/* -------------------------------------------------------------------------- */
/* Reactive Capybara mascot                                                   */
/* -------------------------------------------------------------------------- */
const Capybara: React.FC<{
  fairnessScore: number;
  hasResult: boolean;
  onClick: () => void;
}> = ({ fairnessScore, hasResult, onClick }) => {
  const mode: "idle" | "high-risk" | "safe" = !hasResult
    ? "idle"
    : fairnessScore < 60
      ? "high-risk"
      : "safe";

  const caption =
    mode === "idle"
      ? "Capy is standing by"
      : mode === "high-risk"
        ? "Capy spotted hidden traps!"
        : "Capy approves this contract";

  return (
    <button
      type="button"
      onClick={onClick}
      title="Click Capy for a secret"
      className={cn(
        "group flex items-center gap-3 rounded-full border px-4 py-2 text-xs font-medium transition-transform hover:scale-[1.03]",
        mode === "idle" && "border-slate-700 bg-slate-800/60 text-slate-300",
        mode === "high-risk" &&
          "border-rose-500/40 bg-rose-500/10 text-rose-200",
        mode === "safe" &&
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
      )}
    >
      <svg viewBox="0 0 40 40" className="h-8 w-8 shrink-0" aria-hidden="true">
        <ellipse cx="20" cy="23" rx="15" ry="12" fill="#b08968" />
        <ellipse cx="20" cy="24" rx="12" ry="9" fill="#c9a17c" />
        <circle cx="9" cy="12" r="3.2" fill="#8d6748" />
        <circle cx="31" cy="12" r="3.2" fill="#8d6748" />
        <ellipse cx="20" cy="29" rx="7" ry="4.5" fill="#a67c52" />
        <circle cx="17" cy="29" r="1.1" fill="#3b2a1c" />
        <circle cx="23" cy="29" r="1.1" fill="#3b2a1c" />
        <circle cx="15" cy="20" r="4" fill="none" stroke="#0f172a" strokeWidth="1.4" />
        <circle cx="25" cy="20" r="4" fill="none" stroke="#0f172a" strokeWidth="1.4" />
        <line x1="19" y1="20" x2="21" y2="20" stroke="#0f172a" strokeWidth="1.4" />
        <circle cx="15" cy="20" r="1.3" fill="#0f172a" />
        <circle cx="25" cy="20" r="1.3" fill="#0f172a" />
        {mode === "high-risk" && (
          <path d="M33 8 l6 0 l-3 6 z" fill="#f43f5e" transform="rotate(20 33 8)" />
        )}
        {mode === "safe" && (
          <path
            d="M32 7 l2 2 l4 -4"
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
        {mode === "idle" && (
          <rect
            x="30"
            y="6"
            width="7"
            height="5"
            rx="1"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="0.6"
          />
        )}
      </svg>
      <span className="max-w-[190px] truncate">{caption}</span>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* Live engine telemetry pill                                                 */
/* -------------------------------------------------------------------------- */
const EnginePill: React.FC<{ status: EngineStatus }> = ({ status }) => {
  const online = status === "online";
  const label =
    status === "online"
      ? "FastAPI Engine • Connected"
      : status === "checking"
        ? "Checking engine..."
        : "Standalone Edge Engine • Ready";

  return (
    <div
      title={
        online
          ? "Analysis requests are being served by the local FastAPI backend."
          : "The in-browser detector is active. Deploy anywhere with zero backend."
      }
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border px-3 py-2 text-xs font-semibold lg:px-4",
        online
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
      )}
    >
      <span className={cn("cg-engine-dot h-2 w-2 shrink-0 rounded-full", !online && "cyan")} />
      <span className="hidden lg:inline">{label}</span>
      <span className="lg:hidden">{online ? "FastAPI" : "Edge Engine"}</span>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sidebar - w-72 expanded / w-20 collapsed                                   */
/* -------------------------------------------------------------------------- */
const Sidebar: React.FC<{
  collapsed: boolean;
  onToggle: () => void;
  activeSection: Section;
  onSection: (section: Section) => void;
  clauseCount: number;
  activeSample: SampleKey | null;
  onSample: (key: SampleKey) => void;
  history: ScanHistoryEntry[];
  onHistory: (entry: ScanHistoryEntry) => void;
  onLanding: () => void;
  onNewDocument: () => void;
}> = ({
  collapsed,
  onToggle,
  activeSection,
  onSection,
  clauseCount,
  activeSample,
  onSample,
  history,
  onHistory,
  onLanding,
  onNewDocument,
}) => (
  <aside
    className={cn(
      "sticky top-0 hidden h-screen shrink-0 flex-col justify-between border-r border-slate-800 bg-[#041329] p-5 transition-all duration-300 ease-out md:flex",
      collapsed ? "w-20" : "w-72",
    )}
  >
    <div>
      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between gap-3">
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-400/10">
              <Shield className="h-5 w-5 text-cyan-300" />
            </span>
            <span className="truncate text-lg font-bold tracking-tight text-white">
              ClauseGuard
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition-colors hover:border-cyan-400/50 hover:text-cyan-300",
            collapsed && "mx-auto",
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Always-available reset: start a fresh document even if a sample is loaded */}
      <button
        type="button"
        onClick={onNewDocument}
        title="+ New Document (clear text, sample and analysis)"
        className={cn(
          "mt-5 flex w-full items-center gap-3 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200 transition-colors hover:border-cyan-300 hover:bg-cyan-400/20",
          collapsed && "justify-center px-0",
        )}
      >
        <Plus className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="truncate">+ New Document</span>}
      </button>

      {/* Section navigation */}
      <nav className="mt-6 space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSection(item.id)}
              title={item.label}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all",
                collapsed && "justify-center px-0",
                active
                  ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100 shadow-[0_0_20px_rgba(53,215,232,0.12)]"
                  : "border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800/50 hover:text-slate-100",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.id === "telemetry" && (
                <span className="ml-auto rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
                  {clauseCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick sample presets */}
      {!collapsed && (
        <div className="mt-8 space-y-2">
          <div className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Quick samples
          </div>
          {SAMPLE_KEYS.map((key) => {
            const sample = sampleContracts[key];
            const active = activeSample === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSample(key)}
                className={cn(
                  "block w-full rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                  active
                    ? "border-cyan-400/50 bg-cyan-400/10"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/50",
                )}
              >
                <span className="block truncate text-xs font-semibold text-slate-200">
                  {sample.label}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                  {sample.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Session history */}
      {!collapsed && history.length > 0 && (
        <div className="mt-8 space-y-2">
          <div className="flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            <History className="h-3 w-3" />
            Session history
            <span className="ml-auto tabular-nums">{history.length}</span>
          </div>
          {history.slice(0, 4).map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => onHistory(h)}
              title={h.name}
              className="flex w-full items-center gap-2.5 rounded-xl border border-slate-800/80 px-3 py-2 text-left transition-colors hover:border-slate-600"
            >
              <ShieldCheck
                className={cn(
                  "h-4 w-4 shrink-0",
                  h.result.fairness_score < 50
                    ? "text-rose-400"
                    : h.result.fairness_score < 75
                      ? "text-amber-400"
                      : "text-emerald-400",
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] text-slate-300">{h.name}</span>
                <span className="block text-[10px] tabular-nums text-slate-500">
                  {h.at} · score {h.result.fairness_score}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>

    <button
      type="button"
      onClick={onLanding}
      title="Back to Landing"
      className={cn(
        "flex items-center gap-3 rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-cyan-400/50 hover:text-cyan-200",
        collapsed && "justify-center px-0",
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {!collapsed && <span>Back to Landing</span>}
    </button>
  </aside>
);

/* -------------------------------------------------------------------------- */
/* Top bar                                                                    */
/* -------------------------------------------------------------------------- */
const ConsoleHeader: React.FC<{
  contractName: string;
  section: Section;
  fairnessScore: number;
  hasResult: boolean;
  engineStatus: EngineStatus;
  onCapyClick: () => void;
}> = ({ contractName, section, fairnessScore, hasResult, engineStatus, onCapyClick }) => (
  <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-6 border-b border-slate-800 bg-[#020e21]/90 px-8 backdrop-blur-md">
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        <span>Workspace</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-cyan-300">{SECTION_LABEL[section]}</span>
      </div>
      <h1 className="mt-1 truncate text-lg font-bold text-slate-50">{contractName}</h1>
    </div>
    <div className="flex shrink-0 items-center gap-3">
      <EnginePill status={engineStatus} />
      <Capybara
        fairnessScore={fairnessScore}
        hasResult={hasResult}
        onClick={onCapyClick}
      />
    </div>
  </header>
);

/* -------------------------------------------------------------------------- */
/* KPI strip                                                                  */
/* -------------------------------------------------------------------------- */
const KpiStrip: React.FC<{ result: AnalysisResult | null }> = ({ result }) => {
  const score = result?.fairness_score ?? 100;
  const scoreColor = score < 50 ? "#f43f5e" : score < 75 ? "#f59e0b" : "#10b981";

  const kpis: Array<{
    label: string;
    value: string;
    sub: string;
    icon: React.ReactNode;
    accent: string;
  }> = [
    {
      label: "Fairness Score",
      value: result ? `${result.fairness_score}` : "--",
      sub: result ? "out of 100 · higher is fairer" : "run a scan to see",
      icon: <Gauge className="h-5 w-5" />,
      accent: result ? scoreColor : "#64748b",
    },
    {
      label: "Annual Money at Risk",
      value: result ? `$${result.money_at_risk.toLocaleString()}` : "--",
      sub: "hidden fees + silent renewals",
      icon: <DollarSign className="h-5 w-5" />,
      accent: result && result.money_at_risk > 0 ? "#f43f5e" : "#64748b",
    },
    {
      label: "Reading Time Saved",
      value: result ? `${result.reading_time_saved_mins}` : "--",
      sub: "minutes vs. reading it yourself",
      icon: <Clock className="h-5 w-5" />,
      accent: result ? "#35d7e8" : "#64748b",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-8 md:grid-cols-3" aria-label="Risk telemetry summary">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="flex h-full flex-col justify-between space-y-4 rounded-2xl border border-slate-800 bg-[#041329] p-6 lg:p-8"
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span style={{ color: kpi.accent }}>{kpi.icon}</span>
            {kpi.label}
          </div>
          <div>
            <div
              className="text-3xl font-extrabold tabular-nums leading-none"
              style={{ color: kpi.accent }}
            >
              {kpi.value}
            </div>
            <div className="mt-2 text-xs text-slate-500">{kpi.sub}</div>
          </div>
        </div>
      ))}
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* Document X-Ray                                                             */
/* -------------------------------------------------------------------------- */
const XRayViewer: React.FC<{
  text: string;
  clauses: Clause[];
  selectedClauseIdx: number | null;
  onSelect: (index: number) => void;
}> = ({ text, clauses, selectedClauseIdx, onSelect }) => {
  const segments = useMemo(() => {
    type Range = { start: number; end: number; clauseIndex: number };
    const ranges: Range[] = [];
    const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    clauses.forEach((clause, clauseIndex) => {
      const quote = clause.verbatim_quote;
      if (!quote || quote === "See relevant clause above") return;
      const words = quote.trim().split(/\s+/).filter(Boolean).map(escapeRe);
      if (words.length === 0) return;

      // Quotes are whitespace-collapsed; match them against the original text
      // which still has newlines and runs of spaces.
      let match = new RegExp(words.join("\\s+"), "i").exec(text);
      if (!match && words.length > 8) {
        match = new RegExp(words.slice(0, 8).join("\\s+"), "i").exec(text);
      }
      if (!match) return;
      ranges.push({ start: match.index, end: match.index + match[0].length, clauseIndex });
    });

    ranges.sort((a, b) => a.start - b.start);
    const merged: Range[] = [];
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (last && r.start < last.end) continue;
      merged.push(r);
    }
    return merged;
  }, [text, clauses]);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  segments.forEach((seg, i) => {
    if (seg.start > cursor) nodes.push(<span key={`t-${i}`}>{text.slice(cursor, seg.start)}</span>);
    const clause = clauses[seg.clauseIndex];
    const isHigh = clause.severity === "HIGH";
    const selected = selectedClauseIdx === seg.clauseIndex;
    nodes.push(
      <mark
        key={`m-${i}`}
        onClick={() => onSelect(seg.clauseIndex)}
        title={`${clause.title} - click to inspect`}
        className={cn(
          "cursor-pointer rounded px-0.5 transition-all duration-200",
          isHigh
            ? "bg-rose-500/25 text-rose-200 hover:bg-rose-500/40"
            : "bg-amber-500/25 text-amber-200 hover:bg-amber-500/40",
          selected && "ring-2 ring-cyan-400/80 ring-offset-2 ring-offset-[#020e21]",
        )}
      >
        {text.slice(seg.start, seg.end)}
      </mark>,
    );
    cursor = seg.end;
  });
  if (cursor < text.length) nodes.push(<span key="tail">{text.slice(cursor)}</span>);

  return (
    <div className="min-h-[380px] max-h-[520px] overflow-y-auto rounded-xl bg-[#020e21] p-5 text-sm leading-7 text-slate-300">
      {nodes.length > 0 ? (
        nodes
      ) : (
        <div className="flex h-full min-h-[340px] flex-col items-center justify-center gap-3 text-center">
          <FileText className="h-10 w-10 text-slate-700" />
          <p className="max-w-xs leading-relaxed text-slate-500">
            {text.trim()
              ? "No verbatim phrases matched. Try the Risk Telemetry tab for the full clause list."
              : "Run a scan to light up suspicious phrases inside the original document."}
          </p>
        </div>
      )}
    </div>
  );
};

const ClauseDetailBanner: React.FC<{
  clause: Clause;
  index: number;
  total: number;
  onClose: () => void;
}> = ({ clause, index, total, onClose }) => {
  const s = severityStyles[clause.severity];
  return (
    <div className="rounded-xl border border-cyan-400/40 bg-cyan-400/[0.06] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", s.bar)} />
            <h3 className="font-bold text-white">{clause.title}</h3>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", s.badge)}>
              {s.label}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{clause.explanation}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Clear selection"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-800 pt-4 text-xs">
        <span className="inline-flex items-center gap-2 text-slate-400">
          <DollarSign className="h-4 w-4 text-rose-400" />
          Dollar exposure
          <strong className="font-bold tabular-nums text-rose-300">
            ${clause.dollar_impact.toLocaleString()}
          </strong>
        </span>
        <span className="tabular-nums text-slate-500">
          Clause {index + 1} of {total}
        </span>
      </div>
    </div>
  );
};

const DocumentInput: React.FC<{
  text: string;
  onTextChange: (t: string) => void;
  onFile: (f: File) => void;
  onScan: () => void;
  loading: boolean;
  pdfProgress: number | null;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}> = ({ text, onTextChange, onFile, onScan, loading, pdfProgress, textareaRef }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragOver
            ? "border-cyan-400 bg-cyan-500/5"
            : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/30",
        )}
      >
        <Upload className="h-6 w-6 text-cyan-300" />
        <p className="text-sm font-medium text-slate-200">Drop a PDF or TXT contract here, or click to browse</p>
        <p className="text-xs text-slate-500">
          Parsed in your browser - 0 bytes uploaded - works on Vercel with no backend
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
            PDF
          </span>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
            TXT
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {pdfProgress !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-200"
            style={{ width: `${pdfProgress}%` }}
          />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="contract-text" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Or paste raw contract text
        </label>
        <textarea
          ref={textareaRef}
          id="contract-text"
          rows={10}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Paste the full contract, terms, or fine print here..."
          className="w-full resize-y rounded-xl border border-slate-700 bg-[#020e21] p-4 text-sm leading-relaxed text-slate-100 placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={onScan}
        disabled={loading || text.trim().length === 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3.5 font-bold text-[#020e21] shadow-[0_0_20px_rgba(53,215,232,0.2)] transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        Scan Contract Fine Print
      </button>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Risk Telemetry                                                             */
/* -------------------------------------------------------------------------- */
/** Shared copy helper with a legacy fallback for non-secure contexts. */
const copyToClipboard = async (value: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = value;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
};

const FlaggedClauseCard: React.FC<{
  clause: Clause;
  index: number;
  selected: boolean;
  onSelect: () => void;
}> = ({ clause, index, selected, onSelect }) => {
  const s = severityStyles[clause.severity];
  const [copied, setCopied] = useState(false);

  useEffect(() => setCopied(false), [clause]);

  const handleCopy = (event: React.MouseEvent) => {
    event.stopPropagation();
    void copyToClipboard(clause.safe_redline).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <article
      onClick={onSelect}
      className={cn(
        "cursor-pointer space-y-4 rounded-2xl border bg-[#041329] p-6 lg:p-8 transition-all",
        selected
          ? "border-cyan-400/60 shadow-[0_0_24px_rgba(53,215,232,0.12)]"
          : "border-slate-800 hover:border-slate-600",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", s.bar)} />
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-snug text-slate-50">
              {index + 1}. {clause.title}
            </h3>
            <p className="mt-2 leading-relaxed text-slate-400">{clause.explanation}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn("rounded-full border px-3 py-1 text-[10px] font-bold", s.badge)}>
            {s.label}
          </span>
          <span className="rounded-full border border-rose-500/30 bg-rose-500/5 px-3 py-1 text-[11px] font-bold tabular-nums text-rose-300">
            ${clause.dollar_impact.toLocaleString()}
          </span>
        </div>
      </div>

      <blockquote className="rounded-lg border-l-2 border-slate-600 bg-slate-900/50 px-4 py-3 text-sm italic leading-relaxed text-slate-400">
        "{clause.verbatim_quote}"
      </blockquote>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-300">
            Predatory Clause
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            "{clause.verbatim_quote}"
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              Safe Counter-Clause (1-Click Copy)
            </p>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy the safe replacement wording"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-200 transition-colors hover:bg-emerald-400/20"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-100">{clause.safe_redline}</p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.05] px-4 py-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
        <p className="text-xs leading-relaxed text-slate-300">
          <span className="font-bold text-cyan-200">Negotiation leverage: </span>
          {clause.negotiation_leverage}
        </p>
      </div>
    </article>
  );
};

/* -------------------------------------------------------------------------- */
/* Compounding financial exposure                                             */
/* -------------------------------------------------------------------------- */
const EXPOSURE_YEARS = [1, 2, 3] as const;
type ExposureYears = (typeof EXPOSURE_YEARS)[number];

const CompoundingExposureCard: React.FC<{ result: AnalysisResult }> = ({ result }) => {
  const [years, setYears] = useState<ExposureYears>(1);
  const annual = Math.max(0, Math.round(result.money_at_risk));
  const escalation = 0.05;

  const yearlyTotals = EXPOSURE_YEARS.map((year) =>
    Array.from({ length: year }, (_, i) => annual * Math.pow(1 + escalation, i)).reduce(
      (sum, value) => sum + value,
      0,
    ),
  );
  const maxTotal = yearlyTotals[yearlyTotals.length - 1] || 1;
  const selectedTotal = yearlyTotals[years - 1];

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-[#041329] p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl space-y-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
            <DollarSign className="h-4 w-4" />
            Compounding Financial Exposure
          </h3>
          <p className="text-sm leading-relaxed text-slate-400">
            Silent auto-renewals and recurring fees keep draining the account when left
            uncancelled. Each renewal assumes a 5% annual price creep.
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            Baseline ${annual.toLocaleString()}/yr from flagged recurring charges
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap justify-end gap-2">
            {EXPOSURE_YEARS.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setYears(year)}
                aria-pressed={years === year}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
                  years === year
                    ? "border-cyan-400 bg-cyan-400 text-[#020e21]"
                    : "border-slate-700 bg-[#020e21] text-slate-300 hover:border-cyan-400/50",
                )}
              >
                {year}-Year
              </button>
            ))}
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold tabular-nums leading-none text-cyan-300">
              ${Math.round(selectedTotal).toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              total drain over {years} {years === 1 ? "year" : "years"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-800 pt-4">
        {EXPOSURE_YEARS.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => setYears(year)}
            title={`Show ${year}-year exposure`}
            className={cn(
              "rounded-lg border px-3 py-2 text-left transition-colors",
              years === year
                ? "border-cyan-400/50 bg-cyan-400/[0.06]"
                : "border-transparent hover:border-slate-700",
            )}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Year {year}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${(yearlyTotals[year - 1] / maxTotal) * 100}%` }}
              />
            </div>
            <div className="mt-1.5 text-xs font-bold tabular-nums text-slate-300">
              ${Math.round(yearlyTotals[year - 1]).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* Capy's tactical playbook                                                    */
/* -------------------------------------------------------------------------- */
interface PlaybookStep {
  title: string;
  detail: string;
}

/** Three concrete moves derived from the actual detected traps. */
function buildPlaybook(result: AnalysisResult, contractName: string): PlaybookStep[] {
  const titles = result.clauses.map((c) => c.title.toLowerCase());
  const quotes = result.clauses.map((c) => c.verbatim_quote.toLowerCase()).join(" ");
  const has = (needle: string) => titles.some((title) => title.includes(needle));
  const cutoff = result.cutoff_date_iso;

  const needsCertifiedMail =
    has("notice") || has("renewal") || has("trial") || quotes.includes("certified mail");
  const hasRecurringCharge =
    has("auto-pay") || has("subscription") || has("fee") || has("renewal") || has("refund");
  const hasDepositRisk =
    has("penalty") ||
    has("fee") ||
    has("indemn") ||
    quotes.includes("deposit") ||
    quotes.includes("damage");

  return [
    {
      title: needsCertifiedMail
        ? `Send certified-mail notice by ${cutoff}`
        : `Diary the ${cutoff} review date`,
      detail: needsCertifiedMail
        ? `Mail written cancellation for ${contractName} by ${cutoff}, keep the stamped receipt, then email a copy to the vendor the same day.`
        : `Set a calendar alert for ${cutoff} to confirm ${contractName} has no silent renewal or new charge.`,
    },
    {
      title: hasRecurringCharge
        ? "Virtual-lock the card on file"
        : "Freeze the payment method",
      detail: hasRecurringCharge
        ? "Replace the saved card with a virtual card capped at one billing cycle, or remove it entirely, so a silent renewal cannot charge you."
        : "Remove the stored payment method or set a zero limit before the next billing date to block surprise charges.",
    },
    {
      title: hasDepositRisk
        ? "Photo-log the deposit and condition"
        : "Archive the signed contract and approvals",
      detail: hasDepositRisk
        ? "Take timestamped photos at handover and return, then file them next to the fee clause to dispute any deduction."
        : "Save a dated PDF of the agreement and every approval email in one folder so you can prove exactly what was agreed.",
    },
  ];
}

const CapyPlaybook: React.FC<{
  result: AnalysisResult;
  contractName: string;
  onCapyClick: () => void;
}> = ({ result, contractName, onCapyClick }) => {
  const steps = useMemo(() => buildPlaybook(result, contractName), [result, contractName]);
  const [done, setDone] = useState<number[]>([]);

  useEffect(() => setDone([]), [result, contractName]);

  const toggle = (index: number) =>
    setDone((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );

  return (
    <section className="rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/10 via-[#041329] to-[#041329] p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-400/10">
            <Sparkles className="h-5 w-5 text-cyan-300" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-white">Capy's Tactical Playbook</h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-300">
              Three contract-specific moves based on the traps in {contractName}. Tick
              each one off as you complete it.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-cyan-400/30 bg-[#020e21]/60 px-3 py-1 text-[11px] font-bold tabular-nums text-cyan-200">
            {done.length} of {steps.length} complete
          </span>
          <Capybara
            fairnessScore={result.fairness_score}
            hasResult
            onClick={onCapyClick}
          />
        </div>
      </div>

      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-300"
          style={{ width: `${(done.length / steps.length) * 100}%` }}
        />
      </div>

      <ol className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {steps.map((step, i) => {
          const complete = done.includes(i);
          return (
            <li key={step.title}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={complete}
                className={cn(
                  "flex h-full w-full items-start gap-3 rounded-xl border p-4 text-left transition-all",
                  complete
                    ? "border-emerald-400/40 bg-emerald-400/[0.07]"
                    : "border-slate-700 bg-[#020e21]/70 hover:border-cyan-400/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold tabular-nums",
                    complete
                      ? "border-emerald-400 bg-emerald-400 text-[#020e21]"
                      : "border-cyan-400/50 text-cyan-300",
                  )}
                >
                  {complete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 space-y-1.5">
                  <span
                    className={cn(
                      "block text-sm font-bold leading-snug",
                      complete
                        ? "text-emerald-200 line-through decoration-emerald-400/50"
                        : "text-slate-100",
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="block text-xs leading-relaxed text-slate-400">
                    {step.detail}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* Action Autopilot                                                           */
/* -------------------------------------------------------------------------- */
const ActionAutopilot: React.FC<{
  result: AnalysisResult;
  contractName: string;
  emailDraft: string;
  vendorEmail: string;
  gmailComposeUrl: string;
  mailtoUrl: string;
  onEmailDraftChange: (value: string) => void;
  onVendorEmailChange: (value: string) => void;
  onCapyClick: () => void;
}> = ({
  result,
  contractName,
  emailDraft,
  vendorEmail,
  gmailComposeUrl,
  mailtoUrl,
  onEmailDraftChange,
  onVendorEmailChange,
  onCapyClick,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => setCopied(false), [result]);

  const cutoffDate = useMemo(() => {
    const d = new Date(`${result.cutoff_date_iso}T00:00:00`);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [result.cutoff_date_iso]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailDraft);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = emailDraft;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <CapyPlaybook
        result={result}
        contractName={contractName}
        onCapyClick={onCapyClick}
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Email editor */}
      <section className="space-y-5 rounded-2xl border border-slate-800 bg-[#041329] p-6 lg:p-8 lg:col-span-7">
        <div className="space-y-2">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-white">
            <Mail className="h-5 w-5 text-cyan-300" />
            Dispute email composer
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            The draft is built from the exact clauses we found. Edit it, address it
            to the vendor, then send it from your own mail app.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="vendor-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Vendor / support email (optional)
          </label>
          <input
            id="vendor-email"
            type="email"
            value={vendorEmail}
            onChange={(e) => onVendorEmailChange(e.target.value)}
            placeholder="support@vendor.com"
            className="w-full rounded-xl border border-slate-700 bg-[#020e21] px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="dispute-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Cancellation / dispute email
          </label>
          <textarea
            id="dispute-email"
            rows={12}
            value={emailDraft}
            onChange={(e) => onEmailDraftChange(e.target.value)}
            className="w-full resize-y rounded-xl border border-slate-700 bg-[#020e21] p-5 text-sm leading-relaxed text-slate-200 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-[#020e21] transition-colors hover:bg-cyan-300"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Dispute Email"}
          </button>
          <a
            href={gmailComposeUrl}
            target="_blank"
            rel="noreferrer"
            title="Opens Gmail with the recipient, subject and body pre-filled"
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-rose-400"
          >
            <Mail className="h-4 w-4" />
            Open in Mail App
          </a>
          <button
            type="button"
            onClick={() => downloadAuditSummary(contractName, result, emailDraft)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-cyan-200"
          >
            <FileDown className="h-4 w-4" />
            Download Audit Summary (.txt)
          </button>
        </div>

        <a
          href={mailtoUrl}
          className="inline-block text-xs font-medium text-slate-500 underline-offset-4 transition-colors hover:text-cyan-200 hover:underline"
        >
          Prefer your default mail app? Use mailto instead
        </a>
      </section>

      {/* Deadline guard */}
      <section className="flex h-full flex-col justify-between space-y-6 rounded-2xl border border-slate-800 bg-[#041329] p-6 lg:p-8 lg:col-span-5">
        <div className="space-y-5">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-white">
            <CalendarDays className="h-5 w-5 text-amber-300" />
            Deadline Guard (.ics)
          </h2>

          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/80">
              Detected cutoff date
            </div>
            <div className="mt-3 text-3xl font-extrabold tabular-nums text-amber-200">
              {cutoffDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <div className="mt-2 text-xs tabular-nums text-slate-500">{result.cutoff_date_iso}</div>
          </div>

          <p className="leading-relaxed text-slate-300">{result.cutoff_summary}</p>

          <div className="flex items-start gap-3 rounded-xl bg-slate-900/60 p-4">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            <p className="text-sm leading-relaxed text-slate-400">
              A display alarm fires <strong className="font-semibold text-slate-200">7 days before</strong>{" "}
              the cutoff, so you still have time to send certified notice.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            downloadIcs(`Cancel: ${contractName}`, cutoffDate, result.cutoff_summary)
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 font-bold text-[#020e21] transition-colors hover:bg-amber-300"
        >
          <CalendarDays className="h-5 w-5" />
          Download Calendar Alert (.ics)
        </button>
      </section>
      </div>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Console                                                                    */
/* -------------------------------------------------------------------------- */
interface ConsoleProps {
  text: string;
  setText: (t: string) => void;
  contractName: string;
  result: AnalysisResult | null;
  loading: boolean;
  scanning: boolean;
  engineStatus: EngineStatus;
  pdfProgress: number | null;
  activeSample: SampleKey | null;
  history: ScanHistoryEntry[];
  selectedClauseIdx: number | null;
  onSelectClause: (index: number | null) => void;
  emailDraft: string;
  vendorEmail: string;
  gmailComposeUrl: string;
  mailtoUrl: string;
  onEmailDraftChange: (value: string) => void;
  onVendorEmailChange: (value: string) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onSample: (key: SampleKey) => void;
  onFile: (file: File) => void;
  onScan: () => void;
  onHistory: (entry: ScanHistoryEntry) => void;
  onLanding: () => void;
  onNewDocument: () => void;
  onCapyClick: () => void;
}

const Console: React.FC<ConsoleProps> = ({
  text,
  setText,
  contractName,
  result,
  loading,
  scanning,
  engineStatus,
  pdfProgress,
  activeSample,
  history,
  selectedClauseIdx,
  onSelectClause,
  emailDraft,
  vendorEmail,
  gmailComposeUrl,
  mailtoUrl,
  onEmailDraftChange,
  onVendorEmailChange,
  sidebarCollapsed,
  onToggleSidebar,
  onSample,
  onFile,
  onScan,
  onHistory,
  onLanding,
  onNewDocument,
  onCapyClick,
}) => {
  const [activeSection, setActiveSection] = useState<Section>("xray");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focusToken, setFocusToken] = useState(0);
  const fairnessScore = result?.fairness_score ?? 100;
  const clauses = result?.clauses ?? [];
  const selectedClause = selectedClauseIdx === null ? null : clauses[selectedClauseIdx] ?? null;

  const chooseSample = useCallback(
    (key: SampleKey) => {
      setActiveSection("xray");
      onSample(key);
    },
    [onSample],
  );

  const chooseHistory = useCallback(
    (entry: ScanHistoryEntry) => {
      setActiveSection("xray");
      onHistory(entry);
    },
    [onHistory],
  );

  /** Clears parent-owned analysis state, returns to X-Ray, then focuses the input. */
  const handleNewDocument = useCallback(() => {
    onNewDocument();
    setActiveSection("xray");
    setFocusToken((token) => token + 1);
  }, [onNewDocument]);

  useEffect(() => {
    if (focusToken === 0) return;
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusToken]);

  return (
    <div className="flex min-h-screen bg-[#020e21] text-slate-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={onToggleSidebar}
        activeSection={activeSection}
        onSection={setActiveSection}
        clauseCount={clauses.length}
        activeSample={activeSample}
        onSample={chooseSample}
        history={history}
        onHistory={chooseHistory}
        onLanding={onLanding}
        onNewDocument={handleNewDocument}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <ConsoleHeader
          contractName={contractName}
          section={activeSection}
          fairnessScore={fairnessScore}
          hasResult={!!result}
          engineStatus={engineStatus}
          onCapyClick={onCapyClick}
        />

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 p-8">
          <KpiStrip result={result} />

          {/* ---------------- Tab 1: Document X-Ray ---------------- */}
          {activeSection === "xray" && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
              <section className="space-y-5 rounded-2xl border border-slate-800 bg-[#041329] p-6 lg:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold text-white">Document Intake</h2>
                    <p className="text-sm leading-relaxed text-slate-400">
                      Give ClauseGuard a PDF or paste the fine print. Your files never
                      leave the browser.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNewDocument}
                    title="Clear all text, sample selection and analysis"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-200 transition-colors hover:border-cyan-300 hover:bg-cyan-400/20"
                  >
                    <Plus className="h-4 w-4" />
                    + New Document
                  </button>
                </div>
                <DocumentInput
                  text={text}
                  onTextChange={setText}
                  onFile={onFile}
                  onScan={() => {
                    setActiveSection("xray");
                    onScan();
                  }}
                  loading={loading}
                  pdfProgress={pdfProgress}
                  textareaRef={textareaRef}
                />
              </section>

              <section className="relative space-y-4 overflow-hidden rounded-2xl border border-slate-800 bg-[#041329] p-6 lg:p-8">
                {scanning && <div className="cg-scan-bar z-20" aria-hidden="true" />}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white">Live Verbatim X-Ray</h2>
                    <p className="text-xs text-slate-400">
                      Click a highlighted phrase to inspect the clause below.
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-[11px] font-bold tabular-nums text-slate-300">
                    {clauses.length} {clauses.length === 1 ? "flag" : "flags"}
                  </span>
                </div>

                <XRayViewer
                  text={text}
                  clauses={clauses}
                  selectedClauseIdx={selectedClauseIdx}
                  onSelect={onSelectClause}
                />

                {selectedClause && selectedClauseIdx !== null && (
                  <ClauseDetailBanner
                    clause={selectedClause}
                    index={selectedClauseIdx}
                    total={clauses.length}
                    onClose={() => onSelectClause(null)}
                  />
                )}
              </section>
            </div>
          )}

          {/* ---------------- Tab 2: Risk Telemetry ---------------- */}
          {activeSection === "telemetry" && (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white">Risk Telemetry</h2>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Every detected clause, with its severity, dollar exposure and
                    the exact language that triggered it.
                  </p>
                </div>
                <span className="rounded-full border border-slate-700 bg-[#041329] px-4 py-2 text-xs font-bold tabular-nums text-slate-300">
                  {clauses.length} flagged
                </span>
              </div>

              {result && <CompoundingExposureCard result={result} />}

              {!result && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-[#041329] px-6 py-16 text-center">
                  <ShieldAlert className="h-10 w-10 text-slate-600" />
                  <p className="text-sm text-slate-400">
                    Run a scan in Document X-Ray to populate the telemetry feed.
                  </p>
                </div>
              )}

              {result && clauses.length === 0 && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-emerald-200">
                  <ShieldCheck className="h-6 w-6 shrink-0" />
                  <div>
                    <p className="font-bold">Clean bill of health.</p>
                    <p className="mt-1 text-sm text-emerald-200/70">
                      No risky clauses matched the pattern rules in this contract.
                    </p>
                  </div>
                </div>
              )}

              {clauses.map((clause, i) => (
                <FlaggedClauseCard
                  key={`${clause.title}-${i}`}
                  clause={clause}
                  index={i}
                  selected={selectedClauseIdx === i}
                  onSelect={() => onSelectClause(i)}
                />
              ))}
            </section>
          )}

          {/* ---------------- Tab 3: Action Autopilot ---------------- */}
          {activeSection === "actions" && (
            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white">Action Autopilot</h2>
                <p className="text-sm leading-relaxed text-slate-400">
                  Turn the findings into a dispute email and a deadline you cannot miss.
                </p>
              </div>
              {result ? (
                <ActionAutopilot
                  result={result}
                  contractName={contractName}
                  emailDraft={emailDraft}
                  vendorEmail={vendorEmail}
                  gmailComposeUrl={gmailComposeUrl}
                  mailtoUrl={mailtoUrl}
                  onEmailDraftChange={onEmailDraftChange}
                  onVendorEmailChange={onVendorEmailChange}
                  onCapyClick={onCapyClick}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-[#041329] px-6 py-16 text-center">
                  <Zap className="h-10 w-10 text-slate-600" />
                  <p className="text-sm text-slate-400">
                    Run a scan first and the action engine will draft everything for you.
                  </p>
                </div>
              )}
            </section>
          )}
        </main>

        <footer className="px-8 pb-8 text-center text-xs text-slate-600">
          ClauseGuard is a hackathon demo. Pattern detection is not legal advice.
        </footer>
      </div>
    </div>
  );
};

export default Console;
