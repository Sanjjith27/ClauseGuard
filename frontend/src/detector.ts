/*
 * ============================================================================
 * ClauseGuard - Deterministic Clause Detector (TypeScript)
 * ============================================================================
 * This module is a line-for-line mirror of backend/app/clauses.py. It powers
 * the 100% standalone in-browser analysis (no backend required) and is kept
 * deliberately free of React, DOM and Vite-specific imports so it can be unit
 * tested with plain Node.
 * ============================================================================
 */

export type ClauseSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface Clause {
  verbatim_quote: string;
  title: string;
  severity: ClauseSeverity;
  explanation: string;
  dollar_impact: number;
  weight: number;
  /** Concrete, fair replacement wording for this exact trap. */
  safe_redline: string;
  /** Short negotiation tip explaining why the replacement is reasonable. */
  negotiation_leverage: string;
}

export interface AnalysisResult {
  fairness_score: number;
  money_at_risk: number;
  reading_time_saved_mins: number;
  cutoff_summary: string;
  cutoff_date_iso: string;
  dispute_email: string;
  clauses: Clause[];
}

const SEVERITY_RANK: Record<ClauseSeverity, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

interface RiskRule {
  pattern: RegExp;
  title: string;
  severity: ClauseSeverity;
  explanation: string;
  weight: number;
  safe_redline: string;
  negotiation_leverage: string;
}

const RISK_RULES: RiskRule[] = [
  {
    pattern: /automatic.*(renewal|subscription|recurring)/i,
    title: "Automatic Renewal",
    severity: "HIGH",
    explanation:
      "Clause automatically renews your subscription unless you cancel by a specific deadline.",
    weight: 15,
    safe_redline:
      "This agreement continues month-to-month after the initial term. Either party may decline renewal with 30 days' written notice, and any renewal takes effect only after written confirmation.",
    negotiation_leverage:
      "Ask for a month-to-month default: silent rollover consent is weak in most consumer-protection regimes.",
  },
  {
    pattern: /(non.?refundable|no refund|non refund)/i,
    title: "Non-Refundable Fees",
    severity: "HIGH",
    explanation: "Fees are retained even if you cancel the service or product.",
    weight: 15,
    safe_redline:
      "Fees are refundable on a pro-rata basis for the unused portion of the term if you cancel, less reasonable documented administrative costs.",
    negotiation_leverage:
      "You should not pay for undelivered service; demand a pro-rata refund instead of a blanket forfeiture.",
  },
  {
    pattern: /(early termination|termination penalty|penalty for early exit)/i,
    title: "Early Termination Penalty",
    severity: "HIGH",
    explanation:
      "You must pay a fee if you end the contract before the agreed term.",
    weight: 15,
    safe_redline:
      "Either party may terminate with 30 days' written notice. You pay only for services delivered through the termination date, with no early-exit penalty.",
    negotiation_leverage:
      "A penalty must reflect actual loss; offer to pay for work performed to date and strike the flat fee.",
  },
  {
    pattern: /(price increase|unilateral.*(raise|hike))/i,
    title: "Unilateral Price Increase",
    severity: "HIGH",
    explanation:
      "Company can raise prices without your consent or advance notice.",
    weight: 15,
    safe_redline:
      "Fees are fixed for the initial term. Any increase takes effect only at renewal, with at least 60 days' advance written notice and your written acceptance.",
    negotiation_leverage:
      "A mid-term price change without consent is a breach; lock the rate or require a signed amendment.",
  },
  {
    pattern:
      /(?:free\s+)?trial[^.]{0,160}(?:automatically?\s+(?:convert|renew|charge|bill)|auto-?convert|becomes?\s+(?:a\s+)?paid)/i,
    title: "Trial-to-Subscription Auto-Convert",
    severity: "HIGH",
    explanation:
      "A free or trial period automatically converts to a paid subscription.",
    weight: 15,
    safe_redline:
      "The trial ends automatically with no charge. A paid subscription begins only after you affirmatively opt in and reconfirm your payment method.",
    negotiation_leverage:
      "Silent conversion is a dark pattern; insist on an explicit opt-in after the trial ends.",
  },
  {
    pattern:
      /(?:cancellation|termination)[^.]{0,80}(?:notice|days?)|(?:\d+\s+(?:day|week|month|hour)s?)[^.]{0,40}notice/i,
    title: "Cancellation Notice Period",
    severity: "MEDIUM",
    explanation: "You must give advance notice (e.g., 30/60 days) to cancel.",
    weight: 8,
    safe_redline:
      "You may cancel at any time by email or through your account settings, effective immediately or at the end of the current billing cycle.",
    negotiation_leverage:
      "Email cancellation beats certified mail; refuse any notice window longer than one billing cycle.",
  },
  {
    pattern: /(hidden.*fee|undisclosed.*charge|secret.*cost)/i,
    title: "Hidden Fees",
    severity: "MEDIUM",
    explanation:
      "Fees not clearly disclosed upfront in the main pricing section.",
    weight: 8,
    safe_redline:
      "All fees are itemized in the pricing section and included in the quoted total. No additional charges apply unless agreed in writing.",
    negotiation_leverage:
      "Undisclosed charges can be challenged as deceptive; require one all-inclusive written total.",
  },
  {
    pattern: /(monthly.*(payment|auto.*pay))/i,
    title: "Auto-Pay Enrollment",
    severity: "MEDIUM",
    explanation:
      "Payments are automatically deducted from your account each month.",
    weight: 8,
    safe_redline:
      "Auto-pay is optional and can be enabled or revoked at any time in your account settings. Each charge requires advance notice and an itemized receipt.",
    negotiation_leverage:
      "You control the card on file; remove it or use a virtual card with a hard spending limit.",
  },
  {
    pattern: /(indemnity|hold harmless)/i,
    title: "Indemnification Clause",
    severity: "LOW",
    explanation: "You may be liable for certain damages or legal costs.",
    weight: 3,
    safe_redline:
      "Each party is responsible only for its own negligence or willful misconduct. No broad indemnity for the other party's independent actions is required.",
    negotiation_leverage:
      "Keep indemnity mutual and limited to fault; strike any blanket hold-harmless.",
  },
  {
    pattern: /(governing law|jurisdiction)/i,
    title: "Governing Law / Jurisdiction",
    severity: "LOW",
    explanation:
      "Determines which state/country laws apply and where disputes are resolved.",
    weight: 3,
    safe_redline:
      "Disputes are resolved in the county where you reside, or by mutual agreement in a neutral venue. Nothing in this clause waives your statutory consumer rights.",
    negotiation_leverage:
      "A distant forum is a deterrent; ask for your home venue or neutral mediation instead.",
  },
];

function computeDollarImpact(title: string): number {
  if (title.includes("Renewal") || title.includes("Subscription")) return 240;
  if (title.includes("Penalty")) return 250;
  if (title.includes("Non-Refundable")) return 199;
  return 0;
}

/**
 * Extract a readable verbatim quote around a match: prefer the full sentence,
 * fall back to a 40/80-character window, always snapped to whole words.
 */
function quoteFor(text: string, matchIndex: number, matchLength: number): string {
  const windowStart = Math.max(0, matchIndex - 240);
  const before = text.slice(windowStart, matchIndex);

  let cut = -1;
  for (const sep of [". ", "! ", "? ", "\n"]) {
    cut = Math.max(cut, before.lastIndexOf(sep));
  }

  let start =
    cut >= 0
      ? windowStart + cut + (before[cut] === "\n" ? 1 : 2)
      : Math.max(0, matchIndex - 40);

  const afterStart = matchIndex + matchLength;
  const after = text.slice(afterStart, Math.min(text.length, afterStart + 240));

  let endCut = -1;
  let endSep = "";
  for (const sep of [". ", "! ", "? ", "\n\n"]) {
    const idx = after.indexOf(sep);
    if (idx >= 0 && (endCut === -1 || idx < endCut)) {
      endCut = idx;
      endSep = sep;
    }
  }

  let end =
    endCut >= 0
      ? afterStart + endCut + (endSep === "\n\n" ? 0 : 1)
      : Math.min(text.length, afterStart + 80);

  // A whole sentence can be enormous; keep quotes readable.
  if (end - start > 280) {
    start = Math.max(0, matchIndex - 40);
    end = Math.min(text.length, afterStart + 80);
  }

  while (start > 0 && !/\s/.test(text[start - 1])) start -= 1;
  while (end < text.length && !/\s/.test(text[end])) end += 1;

  return text
    .slice(start, end)
    .replace(/\s+/g, " ")
    .replace(/^\d+\.\s+/, "")
    .trim();
}

export function extractClauses(text: string): Clause[] {
  const found: Clause[] = [];

  for (const rule of RISK_RULES) {
    if (!rule.pattern.test(text)) continue;

    const globalRe = new RegExp(rule.pattern.source, "i");
    const match = globalRe.exec(text);
    const quote = match
      ? quoteFor(text, match.index, match[0].length) || "See relevant clause above"
      : "See relevant clause above";

    found.push({
      verbatim_quote: quote,
      title: rule.title,
      severity: rule.severity,
      explanation: rule.explanation,
      dollar_impact: computeDollarImpact(rule.title),
      weight: rule.weight,
      safe_redline: rule.safe_redline,
      negotiation_leverage: rule.negotiation_leverage,
    });
  }

  // Deduplicate by title keeping the highest severity.
  const seen = new Map<string, Clause>();
  for (const c of found) {
    const existing = seen.get(c.title);
    if (!existing || SEVERITY_RANK[c.severity] > SEVERITY_RANK[existing.severity]) {
      seen.set(c.title, c);
    }
  }
  return Array.from(seen.values());
}

export function calculateFairnessScore(clauses: Clause[]): number {
  const totalWeight = clauses.reduce((sum, c) => sum + c.weight, 0);
  return Math.max(0, 100 - totalWeight);
}

export function calculateMoneyAtRisk(clauses: Clause[]): number {
  return clauses.reduce((sum, c) => sum + (c.dollar_impact > 0 ? c.dollar_impact : 0), 0);
}

export function calculateReadingTimeSaved(wordCount: number): number {
  const wpm = 200;
  return Math.max(1, Math.ceil(wordCount / wpm));
}

const UNIT_DAYS: Record<string, number> = {
  hour: 1 / 24,
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

function durationToDays(num: string, unit: string): number {
  return Math.max(0, Math.round(parseInt(num, 10) * (UNIT_DAYS[unit.toLowerCase()] ?? 1)));
}

export function generateCutoffSummary(
  _clauses: Clause[],
  text: string,
): { summary: string; cutoffDateISO: string } {
  const noticeMatch = text.match(
    /(?:at least|minimum|no later than|within)\s+(\d+)\s+(hour|day|week|month|year)s?/i,
  );
  const noticeDays = noticeMatch ? durationToDays(noticeMatch[1], noticeMatch[2]) : 0;

  const trialMatch = text.match(
    /(\d+)\s*[-\s]?\s*(hour|day|week|month)s?\s+(?:free\s+)?trial/i,
  );
  const trialDays = trialMatch ? durationToDays(trialMatch[1], trialMatch[2]) : 0;

  // If a notice period sits inside the trial, the deadline is trial end minus
  // that notice. Otherwise the notice period governs the paid term.
  const totalDays =
    trialDays > 0 && noticeDays > 0 && noticeDays < trialDays
      ? trialDays - noticeDays
      : Math.max(noticeDays, trialDays);

  const cutoff = new Date(Date.now() + (totalDays > 0 ? totalDays : 30) * 86400000);
  const iso = cutoff.toISOString().split("T")[0];

  const summary =
    totalDays > 0
      ? `Cancel at least ${totalDays} days before renewal - calendar alert set 7 days early.`
      : "No explicit renewal or trial deadline found - review this contract manually.";

  return { summary, cutoffDateISO: iso };
}

export function generateDisputeEmail(clauses: Clause[], contractName: string): string {
  const header = "Dear Contract Provider,";
  // Avoid "Membership Agreement agreement" when the name already ends in a
  // document-type word.
  const suffix = /(agreement|terms|lease|contract)$/i.test(contractName.trim())
    ? ""
    : " agreement";
  const purpose = `I am writing to formally dispute and request cancellation of my ${contractName}${suffix} based on the following concerning clauses:`;

  const clauseSections = clauses
    .map((c, i) => `${i + 1}. "${c.verbatim_quote}" - ${c.title}: ${c.explanation}`)
    .join("\n\n");

  const closing = `I request immediate clarification/removal of these clauses and formal cancellation of my agreement, effective per the required notice period. I retain my right to dispute unfair terms under applicable consumer protection laws.

Sincerely,
Concerned Consumer`;

  return `${header}\n\n${purpose}\n\n${clauseSections}\n\n${closing}`;
}

/** Run the full deterministic analysis locally, with no network access. */
export function analyzeLocally(text: string, contractName: string): AnalysisResult {
  const clauses = extractClauses(text);
  const { summary, cutoffDateISO } = generateCutoffSummary(clauses, text);
  return {
    fairness_score: calculateFairnessScore(clauses),
    money_at_risk: calculateMoneyAtRisk(clauses),
    reading_time_saved_mins: calculateReadingTimeSaved(
      text.split(/\s+/).filter(Boolean).length,
    ),
    cutoff_summary: summary,
    cutoff_date_iso: cutoffDateISO,
    dispute_email: generateDisputeEmail(clauses, contractName),
    clauses,
  };
}
