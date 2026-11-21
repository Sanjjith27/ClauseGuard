/*
 * ClauseGuard - Interactive Landing Page
 * ---------------------------------------
 * A spacious marketing surface built from plain CSS + hand-drawn SVG.
 * No WebGL, no image assets: every visual here is vector + CSS transforms so
 * it stays fast on judge laptops and cheap hardware.
 */

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  DollarSign,
  FileText,
  MailCheck,
  ScanSearch,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "./shared";

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */
const DEFENSE_TIPS = [
  "Set an alert 7 days before every auto-renew date.",
  "Non-refundable means non-refundable - get it in writing.",
  "Notice periods run from receipt. Use certified mail.",
  "Trial converts quietly? Cancel on day one, then relax.",
  "Screenshot every pricing page before you sign.",
];

interface Trap {
  id: string;
  label: string;
  detail: string;
  quote: string;
  cost: number;
  score: number;
}

const TRAPS: Trap[] = [
  {
    id: "notice",
    label: "60-Day Certified Mail Trap",
    detail: "Cancellation notice must arrive 60 days before renewal.",
    quote:
      "Cancellation requires at least 60 days written notice by certified mail prior to the expiration date.",
    cost: 240,
    score: 20,
  },
  {
    id: "fee",
    label: "Hidden $199 Fee",
    detail: "An annual maintenance fee buried in Section 7.",
    quote:
      "A non-refundable annual facility maintenance fee of $199.00 will be charged each membership year.",
    cost: 199,
    score: 30,
  },
  {
    id: "penalty",
    label: "$250 Exit Penalty",
    detail: "You pay to leave before the term ends.",
    quote:
      "If the Member terminates this agreement before completion of the initial term, a $250 early termination penalty applies.",
    cost: 250,
    score: 10,
  },
];

const FEATURES = [
  {
    title: "01. 10-Second Verbatim X-Ray",
    body: "Every risky phrase is lit up inside the original document with its exact quote, severity and plain-English explanation. No more squinting at Section 14.",
    tag: "See the evidence, in context",
    icon: ScanSearch,
  },
  {
    title: "02. 1-Click Dispute Autopilot",
    body: "ClauseGuard drafts a firm, professional cancellation email from the clauses it found. Edit it, address it to the vendor, then copy or open it in your mail app.",
    tag: "From finding to fighting back",
    icon: MailCheck,
  },
  {
    title: "03. .ics Deadline Guard",
    body: "The cancellation cutoff becomes a calendar event with a reminder a full seven days early. Drop it into any calendar and stop tracking deadlines by memory.",
    tag: "Never miss the window",
    icon: CalendarDays,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Custom SVG art                                                             */
/* -------------------------------------------------------------------------- */
const ShieldLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <path
      d="M20 3.5l14 5.2v10.1c0 9-5.7 16.4-14 19.7-8.3-3.3-14-10.7-14-19.7V8.7L20 3.5z"
      fill="url(#cgShield)"
      stroke="#35d7e8"
      strokeWidth="1.6"
    />
    <path
      d="M12.6 20.4l5 5 10-10.2"
      fill="none"
      stroke="#e6feff"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient id="cgShield" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0d94a1" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#020e21" stopOpacity="0.9" />
      </linearGradient>
    </defs>
  </svg>
);

/** Hand-drawn capybara that holds a red flag (risk) or a green check (safe). */
const CapyMascot: React.FC<{
  mode: "warn" | "good" | "idle";
  className?: string;
}> = ({ mode, className }) => (
  <svg viewBox="0 0 150 104" className={className} aria-hidden="true">
    <ellipse cx="62" cy="94" rx="48" ry="5" fill="#35d7e8" opacity="0.12" />
    <circle cx="35" cy="31" r="7" fill="#8d6748" />
    <circle cx="35" cy="31" r="3.4" fill="#b08968" />
    <circle cx="79" cy="30" r="7" fill="#8d6748" />
    <circle cx="79" cy="30" r="3.4" fill="#b08968" />
    <ellipse cx="59" cy="61" rx="39" ry="29" fill="#a97e58" />
    <ellipse cx="58" cy="65" rx="32" ry="23" fill="#c9a17c" />
    <ellipse cx="88" cy="72" rx="15" ry="10" fill="#a67c52" />
    <ellipse cx="94" cy="70" rx="3.1" ry="2.2" fill="#3b2a1c" />
    <circle cx="89" cy="75" r="1" fill="#3b2a1c" />
    <circle cx="98" cy="75" r="1" fill="#3b2a1c" />
    <circle cx="73" cy="52" r="1.9" fill="#24170e" />
    <circle cx="73" cy="52" r="7.5" fill="none" stroke="#0f172a" strokeWidth="1.6" />
    <path d="M65 50h-7" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />
    <ellipse cx="39" cy="86" rx="10" ry="4" fill="#8d6748" />
    <ellipse cx="76" cy="86" rx="10" ry="4" fill="#8d6748" />
    {mode === "warn" && (
      <g className="cg-band">
        <path d="M114 76V20" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
        <path d="M114 21l24 8-24 9z" fill="#f43f5e" className="cg-flag" />
        <path d="M104 30l10-4" stroke="#fda4af" strokeWidth="2" strokeLinecap="round" />
      </g>
    )}
    {mode === "good" && (
      <g className="cg-band">
        <circle cx="120" cy="45" r="19" fill="#10b981" opacity="0.16" />
        <circle cx="120" cy="45" r="15" fill="#10b981" opacity="0.25" />
        <path
          d="M112 45l5.5 5.5L129 39"
          fill="none"
          stroke="#34d399"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    )}
    {mode === "idle" && (
      <g opacity="0.7">
        <circle cx="120" cy="45" r="14" fill="#1e293b" />
        <path
          d="M120 36v10l6 4"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
    )}
    {mode === "good" && (
      <g fill="#67e8f9">
        <path d="M20 18l1.6 4.4L26 24l-4.4 1.6L20 30l-1.6-4.4L14 24l4.4-1.6z" />
        <path d="M132 12l1.2 3.3 3.3 1.2-3.3 1.2-1.2 3.3-1.2-3.3-3.3-1.2 3.3-1.2z" />
      </g>
    )}
  </svg>
);

/** Animated radial fairness dial. */
const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 116 }) => {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const color = score < 50 ? "#f43f5e" : score < 75 ? "#f59e0b" : "#10b981";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1e293b" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className="cg-ring-progress"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tabular-nums text-white">{score}</span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-slate-400">fairness</span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Sticky navigation - h-20, max-w-7xl, px-8                                   */
/* -------------------------------------------------------------------------- */
const LandingHeader: React.FC<{ onOpenConsole: () => void }> = ({ onOpenConsole }) => {
  const [tip, setTip] = useState(0);
  const [seen, setSeen] = useState(1);

  return (
    <header className="cg-sticky sticky top-0 z-40 h-20 border-b border-slate-800/80 bg-[#020e21]/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-8">
        <div className="flex items-center gap-3">
          <ShieldLogo className="h-10 w-10 shrink-0 drop-shadow-[0_0_8px_rgba(53,215,232,0.45)]" />
          <span className="text-xl font-bold tracking-tight text-white">ClauseGuard</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setTip((t) => (t + 1) % DEFENSE_TIPS.length);
              setSeen((s) => s + 1);
            }}
            title="Click Capy for another contract-defense tip"
            className="group flex items-center gap-3 rounded-full border border-cyan-400/30 bg-cyan-500/5 px-3 py-2 text-left transition-all hover:border-cyan-400/70 hover:bg-cyan-500/10 lg:px-4"
          >
            <CapyMascot mode="idle" className="h-8 w-12 shrink-0" />
            <span className="hidden max-w-[240px] truncate text-xs font-medium text-cyan-100 xl:block">
              {DEFENSE_TIPS[tip]}
            </span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-black tabular-nums text-[#020e21]">
              <Sparkles className="mr-0.5 h-2.5 w-2.5" />
              {seen}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenConsole}
            className="group inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 font-semibold text-[#020e21] shadow-[0_0_20px_rgba(53,215,232,0.35)] transition-all hover:bg-cyan-300 hover:shadow-[0_0_28px_rgba(53,215,232,0.55)] lg:px-6"
          >
            Open Console
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </header>
  );
};

/* -------------------------------------------------------------------------- */
/* Hero + interactive X-Ray sandbox                                           */
/* -------------------------------------------------------------------------- */
const HeroSandbox: React.FC<{
  onOpenConsole: () => void;
  onGymDemo: () => void;
}> = ({ onOpenConsole, onGymDemo }) => {
  const [active, setActive] = useState<Record<string, boolean>>({
    notice: true,
    fee: true,
    penalty: true,
  });

  const score = useMemo(
    () => Math.max(0, 94 - TRAPS.reduce((n, t) => n + (active[t.id] ? t.score : 0), 0)),
    [active],
  );
  const money = useMemo(
    () => TRAPS.reduce((n, t) => n + (active[t.id] ? t.cost : 0), 0),
    [active],
  );
  const mode = score >= 80 ? "good" : "warn";
  const toggle = (id: string) => setActive((s) => ({ ...s, [id]: !s[id] }));

  return (
    <section className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-8 py-10 lg:grid-cols-12 lg:items-center">
      {/* Left: message */}
      <div className="space-y-6 lg:col-span-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/5 px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-cyan-300">
          <Zap className="h-3.5 w-3.5 fill-cyan-300" />
          Teens Hack Houston 2026 • A More Efficient Way to Live
        </div>

        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white lg:text-5xl">
          Never Sign a <span className="cg-gradient-text">Hidden Trap</span> Again.
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-slate-300">
          Turn 20 pages of confusing legal fine print into a 10-second risk X-ray,
          instant dispute email, and automated calendar alert.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="button"
            onClick={onOpenConsole}
            className="group inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-[#020e21] shadow-[0_0_24px_rgba(53,215,232,0.35)] transition-all hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_0_34px_rgba(53,215,232,0.55)]"
          >
            Open Console
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            type="button"
            onClick={onGymDemo}
            className="group inline-flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-6 py-3 font-semibold text-rose-100 transition-all hover:-translate-y-0.5 hover:border-rose-400 hover:bg-rose-500/20"
          >
            Try Gym Trap Demo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-400" /> No signup
          </span>
          <span className="inline-flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-400" /> No API keys
          </span>
          <span className="inline-flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-400" /> Files stay on device
          </span>
        </div>
      </div>

      {/* Right: sandbox */}
      <div className="lg:col-span-6">
        <div className="relative space-y-6 overflow-hidden rounded-2xl border border-slate-800 bg-[#041329] p-6 lg:p-8 shadow-2xl shadow-cyan-950/40">
          <div className="cg-scanline pointer-events-none absolute inset-x-0 top-0 z-20 h-16" />

          {/* Card header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <FileText className="h-4 w-4 text-cyan-300" />
              <span className="font-mono text-xs">apex_fitness_terms.pdf</span>
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-300",
                mode === "good"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-300",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", mode === "good" ? "bg-emerald-400" : "bg-rose-400")} />
              {mode === "good" ? "Capy says: clean" : "Capy found traps!"}
            </div>
          </div>

          {/* Mini contract preview */}
          <div className="space-y-3 rounded-xl bg-[#020e21] p-5 text-sm leading-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Section 4 - Membership terms
            </p>
            {TRAPS.map((t) => {
              const on = active[t.id];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  title={t.detail}
                  className={cn(
                    "block w-full rounded-lg border-l-2 px-3 py-1.5 text-left leading-7 transition-all duration-300",
                    on
                      ? "cg-trap-on border-rose-500 bg-rose-500/15 text-rose-200"
                      : "border-slate-700 text-slate-500 hover:bg-slate-800/40",
                  )}
                >
                  {t.quote}
                </button>
              );
            })}
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Section 8 - Governing law ...
            </p>
          </div>

          {/* Live telemetry */}
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-slate-800 bg-[#020e21] p-5">
            <div className="flex items-center gap-4">
              <CapyMascot mode={mode} className="h-20 w-32 shrink-0 transition-all duration-500" />
              <div className="space-y-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    Fairness score
                  </div>
                  <div
                    className={cn(
                      "text-2xl font-extrabold tabular-nums transition-colors duration-300",
                      mode === "good" ? "text-emerald-300" : "text-rose-300",
                    )}
                  >
                    {score}
                    <span className="text-sm font-semibold text-slate-500">/100</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    Annual money at risk
                  </div>
                  <div
                    className={cn(
                      "text-2xl font-extrabold tabular-nums transition-colors duration-300",
                      money > 0 ? "text-rose-300" : "text-emerald-300",
                    )}
                  >
                    ${money.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <ScoreRing score={score} />
          </div>

          {/* Three switches */}
          <div className="grid gap-3 sm:grid-cols-3">
            {TRAPS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="switch"
                aria-checked={active[t.id]}
                onClick={() => toggle(t.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-300",
                  active[t.id]
                    ? "border-rose-500/40 bg-rose-500/10"
                    : "border-slate-700 bg-slate-900/40 hover:border-slate-500",
                )}
              >
                <span className="text-xs font-semibold leading-snug text-slate-200">
                  {t.label}
                </span>
                <span
                  className={cn(
                    "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300",
                    active[t.id] ? "bg-rose-500" : "bg-slate-600",
                  )}
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300"
                    style={{ transform: active[t.id] ? "translateX(18px)" : "translateX(2px)" }}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* Subscription exposure calculator                                           */
/* -------------------------------------------------------------------------- */
const ExposureSlider: React.FC<{ onProtect: () => void }> = ({ onProtect }) => {
  const [count, setCount] = useState(15);
  const exposed = count * 240;
  const hours = (count * 20) / 60;
  const pct = ((count - 1) / 14) * 100;

  return (
    <section className="py-10">
      <div className="mx-auto max-w-7xl px-8">
        <div className="grid grid-cols-1 gap-8 rounded-2xl border border-slate-800 bg-[#041329] p-6 lg:p-8 md:grid-cols-12 md:items-center">
          <div className="space-y-6 md:col-span-7">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                Subscription exposure calculator
              </div>
              <h2 className="mt-3 text-2xl font-extrabold leading-tight text-white lg:text-3xl">
                How many contracts are quietly costing you?
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-slate-400">
                Most people juggle 5 to 15 live subscriptions, leases and memberships.
                Each carries an average of $240 a year in silent renewal risk.
              </p>
            </div>

            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <label htmlFor="cg-count" className="text-sm font-medium text-slate-300">
                  Active subscriptions / contracts
                </label>
                <span className="text-3xl font-extrabold tabular-nums text-cyan-300">{count}</span>
              </div>
              <input
                id="cg-count"
                type="range"
                min={1}
                max={15}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="cg-range w-full"
                style={{
                  background: `linear-gradient(90deg, #35d7e8 ${pct}%, #1e293b ${pct}%)`,
                }}
              />
              <div className="mt-2 flex justify-between text-xs tabular-nums text-slate-500">
                <span>1</span>
                <span>15</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 md:col-span-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex h-full flex-col justify-between space-y-4 rounded-xl border border-rose-500/25 bg-rose-500/5 p-6">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300/80">
                  Estimated Money Protected
                </div>
                <div>
                  <div className="text-3xl font-extrabold tabular-nums text-rose-300">
                    ${exposed.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">per year, if caught in time</div>
                </div>
              </div>
              <div className="flex h-full flex-col justify-between space-y-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-6">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">
                  Hours Saved
                </div>
                <div>
                  <div className="text-3xl font-extrabold tabular-nums text-emerald-300">
                    {hours.toFixed(1)}h
                  </div>
                  <div className="mt-1 text-xs text-slate-500">across {count} contracts</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onProtect}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 font-bold text-[#020e21] transition-all hover:bg-cyan-300"
            >
              Protect Mine in Console
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <div className="flex items-center justify-center gap-5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-slate-500" /> No billing
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" /> 10-second scan
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* Three equal-height feature cards                                           */
/* -------------------------------------------------------------------------- */
const FeatureGrid: React.FC = () => (
  <section className="py-10">
    <div className="mx-auto max-w-7xl px-8">
      <div className="mb-10 space-y-3 text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
          How it works
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white lg:text-3xl">
          From fine print to fight back, in three moves
        </h2>
        <p className="mx-auto max-w-2xl leading-relaxed text-slate-400">
          A complete defense loop: find the trap, draft the pushback, and lock in
          the deadline. All before your coffee gets cold.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className="flex h-full flex-col justify-between space-y-4 rounded-2xl border border-slate-800 bg-[#041329] p-6 lg:p-8 transition-colors duration-300 hover:border-cyan-400/40"
            >
              <div className="space-y-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-bold leading-snug text-white">{feature.title}</h3>
                <p className="leading-relaxed text-slate-400">{feature.body}</p>
              </div>
              <div className="border-t border-slate-800 pt-4 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                {feature.tag}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  </section>
);

/* -------------------------------------------------------------------------- */
/* Landing page                                                               */
/* -------------------------------------------------------------------------- */
const LandingPage: React.FC<{
  onOpenConsole: () => void;
  onGymDemo: () => void;
  onToast: (message: string) => void;
}> = ({ onOpenConsole, onGymDemo, onToast }) => (
  <div className="cg-landing relative min-h-screen overflow-hidden bg-[#020e21] text-slate-100">
    <div className="cg-grid-bg pointer-events-none absolute inset-0 opacity-70" />
    <div className="cg-glow pointer-events-none absolute inset-0" />

    <div className="relative z-10">
      <LandingHeader onOpenConsole={onOpenConsole} />
      <main>
        <HeroSandbox onOpenConsole={onOpenConsole} onGymDemo={onGymDemo} />
        <ExposureSlider
          onProtect={() => {
            onToast("Console ready - drop a PDF or paste a contract to scan yours.");
            onOpenConsole();
          }}
        />
        <FeatureGrid />
      </main>

      <footer className="border-t border-slate-800/70 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-8 text-center">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <p className="max-w-2xl leading-relaxed text-slate-500">
            ClauseGuard is a pattern-based hackathon demo for spotting suspicious
            language quickly. It is not legal advice.
          </p>
          <button
            type="button"
            onClick={onOpenConsole}
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          >
            Launch the console
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 pt-2 text-xs text-slate-600">
            <Shield className="h-3.5 w-3.5" />
            Built for Teens Hack Houston 2026
          </div>
        </div>
      </footer>
    </div>
  </div>
);

export default LandingPage;
