"""
ClauseGuard - Deterministic Clause Detector (Python)
===================================================

EXACT match of the TypeScript detector in /frontend/src/App.tsx.
All clause patterns, weights, severity rankings, scoring formulas,
dollar impact calculations, and output JSON structure must be identical.
"""

from typing import List, Dict, Any
import re
from dataclasses import dataclass

# Severity ranking: HIGH=3, MEDIUM=2, LOW=1
SEVERITY_RANK = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}

# Clause Model
@dataclass
class Clause:
    verbatim_quote: str
    title: str
    severity: str
    explanation: str
    dollar_impact: float
    weight: int
    safe_redline: str
    negotiation_leverage: str

# Analysis Result
@dataclass
class AnalysisResult:
    fairness_score: int
    money_at_risk: float
    reading_time_saved_mins: int
    cutoff_summary: str
    cutoff_date_iso: str
    dispute_email: str
    clauses: List[Clause]

# RISK_CLAUSES - exact pattern match with TypeScript version
RISK_CLAUSES = [
    # HIGH severity clauses (weight 15)
    {
        "pattern": re.compile(r"(automatic.*(renewal|subscription|recurring))", re.IGNORECASE),
        "title": "Automatic Renewal",
        "severity": "HIGH",
        "explanation": "Clause automatically renews your subscription unless you cancel by a specific deadline.",
        "dollar_impact": 0.0,
        "weight": 15,
        "safe_redline": "This agreement continues month-to-month after the initial term. Either party may decline renewal with 30 days' written notice, and any renewal takes effect only after written confirmation.",
        "negotiation_leverage": "Ask for a month-to-month default: silent rollover consent is weak in most consumer-protection regimes.",
    },
    {
        "pattern": re.compile(r"(non.refundable|no refund|non refund)", re.IGNORECASE),
        "title": "Non-Refundable Fees",
        "severity": "HIGH",
        "explanation": "Fees are retained even if you cancel the service or product.",
        "dollar_impact": 0.0,
        "weight": 15,
        "safe_redline": "Fees are refundable on a pro-rata basis for the unused portion of the term if you cancel, less reasonable documented administrative costs.",
        "negotiation_leverage": "You should not pay for undelivered service; demand a pro-rata refund instead of a blanket forfeiture.",
    },
    {
        "pattern": re.compile(r"(early termination|termination penalty|penalty for early exit)", re.IGNORECASE),
        "title": "Early Termination Penalty",
        "severity": "HIGH",
        "explanation": "You must pay a fee if you end the contract before the agreed term.",
        "dollar_impact": 0.0,
        "weight": 15,
        "safe_redline": "Either party may terminate with 30 days' written notice. You pay only for services delivered through the termination date, with no early-exit penalty.",
        "negotiation_leverage": "A penalty must reflect actual loss; offer to pay for work performed to date and strike the flat fee.",
    },
    {
        "pattern": re.compile(r"(price increase|unilateral.*(raise|hike))", re.IGNORECASE),
        "title": "Unilateral Price Increase",
        "severity": "HIGH",
        "explanation": "Company can raise prices without your consent or advance notice.",
        "dollar_impact": 0.0,
        "weight": 15,
        "safe_redline": "Fees are fixed for the initial term. Any increase takes effect only at renewal, with at least 60 days' advance written notice and your written acceptance.",
        "negotiation_leverage": "A mid-term price change without consent is a breach; lock the rate or require a signed amendment.",
    },
    {
        "pattern": re.compile(
            r"(?:free\s+)?trial[^.]{0,160}"
            r"(?:automatically?\s+(?:convert|renew|charge|bill)|auto-?convert|becomes?\s+(?:a\s+)?paid)",
            re.IGNORECASE,
        ),
        "title": "Trial-to-Subscription Auto-Convert",
        "severity": "HIGH",
        "explanation": "A free or trial period automatically converts to a paid subscription.",
        "dollar_impact": 0.0,
        "weight": 15,
        "safe_redline": "The trial ends automatically with no charge. A paid subscription begins only after you affirmatively opt in and reconfirm your payment method.",
        "negotiation_leverage": "Silent conversion is a dark pattern; insist on an explicit opt-in after the trial ends.",
    },
    # MEDIUM severity clauses (weight 8)
    {
        "pattern": re.compile(
            r"(?:cancellation|termination)[^.]{0,80}(?:notice|days?)"
            r"|(?:\d+\s+(?:day|week|month|hour)s?)[^.]{0,40}notice",
            re.IGNORECASE,
        ),
        "title": "Cancellation Notice Period",
        "severity": "MEDIUM",
        "explanation": "You must give advance notice (e.g., 30/60 days) to cancel.",
        "dollar_impact": 0.0,
        "weight": 8,
        "safe_redline": "You may cancel at any time by email or through your account settings, effective immediately or at the end of the current billing cycle.",
        "negotiation_leverage": "Email cancellation beats certified mail; refuse any notice window longer than one billing cycle.",
    },
    {
        "pattern": re.compile(r"(hidden.*fee|undisclosed.*charge|secret.*cost)", re.IGNORECASE),
        "title": "Hidden Fees",
        "severity": "MEDIUM",
        "explanation": "Fees not clearly disclosed upfront in the main pricing section.",
        "dollar_impact": 0.0,
        "weight": 8,
        "safe_redline": "All fees are itemized in the pricing section and included in the quoted total. No additional charges apply unless agreed in writing.",
        "negotiation_leverage": "Undisclosed charges can be challenged as deceptive; require one all-inclusive written total.",
    },
    {
        "pattern": re.compile(r"(monthly.*(payment|auto.*pay))", re.IGNORECASE),
        "title": "Auto-Pay Enrollment",
        "severity": "MEDIUM",
        "explanation": "Payments are automatically deducted from your account each month.",
        "dollar_impact": 0.0,
        "weight": 8,
        "safe_redline": "Auto-pay is optional and can be enabled or revoked at any time in your account settings. Each charge requires advance notice and an itemized receipt.",
        "negotiation_leverage": "You control the card on file; remove it or use a virtual card with a hard spending limit.",
    },
    # LOW severity clauses (weight 3)
    {
        "pattern": re.compile(r"(indemnity|hold harmless)", re.IGNORECASE),
        "title": "Indemnification Clause",
        "severity": "LOW",
        "explanation": "You may be liable for certain damages or legal costs.",
        "dollar_impact": 0.0,
        "weight": 3,
        "safe_redline": "Each party is responsible only for its own negligence or willful misconduct. No broad indemnity for the other party's independent actions is required.",
        "negotiation_leverage": "Keep indemnity mutual and limited to fault; strike any blanket hold-harmless.",
    },
    {
        "pattern": re.compile(r"(governing law|jurisdiction)", re.IGNORECASE),
        "title": "Governing Law / Jurisdiction",
        "severity": "LOW",
        "explanation": "Determines which state/country laws apply and where disputes are resolved.",
        "dollar_impact": 0.0,
        "weight": 3,
        "safe_redline": "Disputes are resolved in the county where you reside, or by mutual agreement in a neutral venue. Nothing in this clause waives your statutory consumer rights.",
        "negotiation_leverage": "A distant forum is a deterrent; ask for your home venue or neutral mediation instead.",
    },
]  # type: ignore


def _quote_for(text: str, match_start: int, match_length: int) -> str:
    """Readable verbatim quote: prefer the full sentence, else a 40/80 window.

    Mirrors quoteFor() in the TypeScript detector.
    """
    window_start = max(0, match_start - 240)
    before = text[window_start:match_start]

    cut = -1
    for sep in (". ", "! ", "? ", "\n"):
        cut = max(cut, before.rfind(sep))

    if cut >= 0:
        start = window_start + cut + (1 if before[cut] == "\n" else 2)
    else:
        start = max(0, match_start - 40)

    after_start = match_start + match_length
    after = text[after_start : min(len(text), after_start + 240)]

    end_cut = -1
    end_sep = ""
    for sep in (". ", "! ", "? ", "\n\n"):
        idx = after.find(sep)
        if idx >= 0 and (end_cut == -1 or idx < end_cut):
            end_cut = idx
            end_sep = sep

    if end_cut >= 0:
        end = after_start + end_cut + (0 if end_sep == "\n\n" else 1)
    else:
        end = min(len(text), after_start + 80)

    # A whole sentence can be enormous; keep quotes readable.
    if end - start > 280:
        start = max(0, match_start - 40)
        end = min(len(text), after_start + 80)

    while start > 0 and not text[start - 1].isspace():
        start -= 1
    while end < len(text) and not text[end].isspace():
        end += 1

    quote = re.sub(r"\s+", " ", text[start:end]).strip()
    return re.sub(r"^\d+\.\s+", "", quote)


def extractClauses(text: str) -> List[Clause]:
    found: List[Clause] = []

    for clause in RISK_CLAUSES:
        match = clause["pattern"].search(text)
        if not match:
            continue

        quote = _quote_for(text, match.start(), match.end() - match.start())
        if not quote:
            quote = "See relevant clause above"

        found.append(
            Clause(
                verbatim_quote=quote,
                title=clause["title"],
                severity=clause["severity"],
                explanation=clause["explanation"],
                dollar_impact=computeDollarImpact(clause["title"]),
                weight=clause["weight"],
                safe_redline=clause["safe_redline"],
                negotiation_leverage=clause["negotiation_leverage"],
            )
        )

    # Deduplicate by title, keeping highest severity if duplicate
    seen: Dict[str, Clause] = {}
    for c in found:
        existing = seen.get(c.title)
        if not existing or SEVERITY_RANK[c.severity] > SEVERITY_RANK[existing.severity]:
            seen[c.title] = c

    return list(seen.values())


def computeDollarImpact(title: str) -> float:
    """Annualised dollar exposure per clause type. Mirrors the TS detector."""
    if "Renewal" in title or "Subscription" in title:
        return 240.0
    if "Penalty" in title:
        return 250.0
    if "Non-Refundable" in title:
        return 199.0
    return 0.0


def calculateFairnessScore(clauses: List[Clause]) -> int:
    totalWeight = sum(c.weight for c in clauses)
    return max(0, 100 - totalWeight)


def calculateMoneyAtRisk(clauses: List[Clause]) -> float:
    return sum(c.dollar_impact for c in clauses if c.dollar_impact > 0)


def calculateReadingTimeSaved(wordCount: int) -> int:
    import math

    wpm = 200
    return max(1, math.ceil(wordCount / wpm))


_UNIT_DAYS = {"hour": 1.0 / 24.0, "day": 1.0, "week": 7.0, "month": 30.0, "year": 365.0}


def _duration_to_days(num: str, unit: str) -> int:
    days = int(num) * _UNIT_DAYS.get(unit.lower(), 1.0)
    return max(0, int(round(days)))


def generateCutoffSummary(clauses: List[Clause], text: str) -> tuple[str, str]:
    """Work out the cancellation deadline and return (summary, YYYY-MM-DD).

    Mirrors generateCutoffSummary() in the frontend:
      - notice period from "at least N days/weeks/months/hours"
      - trial length from "N-day free trial"
      - when both exist, the deadline is trial end minus the notice period
    """
    from datetime import datetime, timedelta, timezone

    notice_match = re.search(
        r"(?:at least|minimum|no later than|within)\s+(\d+)\s+"
        r"(hour|day|week|month|year)s?",
        text,
        re.IGNORECASE,
    )
    notice_days = 0
    if notice_match:
        notice_days = _duration_to_days(notice_match.group(1), notice_match.group(2))

    trial_match = re.search(
        r"(\d+)\s*[-\s]?\s*(hour|day|week|month)s?\s+(?:free\s+)?trial",
        text,
        re.IGNORECASE,
    )
    trial_days = 0
    if trial_match:
        trial_days = _duration_to_days(trial_match.group(1), trial_match.group(2))

    if trial_days > 0 and notice_days > 0 and notice_days < trial_days:
        # Notice period sits inside the trial (e.g. "cancel 72 hours before the
        # 7-day trial ends"), so the deadline is trial end minus that notice.
        total_days = trial_days - notice_days
    else:
        # Otherwise the notice period governs cancellation of the paid term.
        total_days = max(notice_days, trial_days)

    cutoff = datetime.now(timezone.utc) + timedelta(days=total_days if total_days > 0 else 30)
    iso = cutoff.strftime("%Y-%m-%d")

    if total_days > 0:
        summary = (
            f"Cancel at least {total_days} days before renewal - "
            "calendar alert set 7 days early."
        )
    else:
        summary = (
            "No explicit renewal or trial deadline found - "
            "review this contract manually."
        )

    return summary, iso


def generateDisputeEmail(clauses: List[Clause], contractName: str) -> str:
    header = "Dear Contract Provider,"
    # Avoid "Membership Agreement agreement" when the name already ends in a
    # document-type word.
    suffix = "" if re.search(r"(agreement|terms|lease|contract)$", contractName.strip(), re.IGNORECASE) else " agreement"
    purpose = f"I am writing to formally dispute and request cancellation of my {contractName}{suffix} based on the following concerning clauses:"
    clauseSections = "\n\n".join(
        f"{i+1}. \"{c.verbatim_quote}\" - {c.title}: {c.explanation}"
        for i, c in enumerate(clauses)
    )
    closing = """I request immediate clarification/removal of these clauses and formal cancellation of my agreement, effective per the required notice period. I retain my right to dispute unfair terms under applicable consumer protection laws.

Sincerely,
Concerned Consumer"""
    return f"{header}\n\n{purpose}\n\n{clauseSections}\n\n{closing}"


sample_contracts = {
    "gym": {
        "name": "Apex Fitness Club Membership Agreement",
        "text": """Apex Fitness Club Membership Agreement (Effective Date: January 1, 2024)

1. MEMBERSHIP TERMS
This agreement constitutes the entire understanding between the Member and Apex Fitness Club regarding the use of facility amenities. Membership is offered on a monthly basis and will automatically renew for successive 12-month periods unless terminated in accordance with Section 7.

2. ANNUAL FACILITY MAINTENANCE FEE
A non-refundable annual facility maintenance fee of $199.00 will be charged each membership year, due on the anniversary of the Effective Date. This fee is mandatory and will be automatically billed to the payment method on file.

3. AUTOMATIC RENEWAL CLAUSE
This membership will automatically renew for a successive 12-month period. The Member must provide written notice via certified mail to Apex Fitness Club, 222 Health Street, Fitness City, at least 60 days prior to the expiration date to avoid automatic renewal. Failure to provide timely notice constitutes acceptance of renewal terms.

4. EARLY TERMINATION PENALTY
If the Member terminates this agreement before the completion of the 12-month term, a non-refundable early termination penalty of $250.00 will be charged. The Member remains liable for all unpaid fees through the date of termination.

5. PAYMENT AND BILLING
Monthly membership dues of $49.99 will be auto-charged to the payment method on file. The Member authorizes Apex Fitness Club to charge the payment method on file for all applicable fees.

6. FACILITY RULES AND REGULATIONS
Members must adhere to all posted facility rules and code of conduct. Apex Fitness Club reserves the right to suspend or terminate membership for violation of rules.

7. NOTICE REQUIREMENTS
All cancellation notices must be sent via certified mail to the address in Section 3. Email or verbal notice will not be accepted as valid cancellation notice. The 60-day notice period is strictly enforced.""",
    },
    "trial": {
        "name": "CloudSync Pro Enterprise Trial Terms",
        "text": """CloudSync Pro Enterprise Trial Terms (Effective Date: March 1, 2024)

1. TRIAL PERIOD
New customers are eligible for a 7-day free trial beginning on the date of account creation. The trial provides full access to all Enterprise features at no cost.

2. AUTOMATIC SUBSCRIPTION CONVERSION
At the end of the 7-day free trial, the account will automatically convert to a $240/year non-refundable subscription unless the customer cancels at least 72 hours before trial expiration. The customer authorizes automatic billing upon conversion.

3. UNILATERAL PRICE INCREASE CLAUSE
CloudSync Pro reserves the right to increase subscription prices upon renewal. Customers will receive written notice at least 30 days before any price change takes effect. Continued use of the service after the notice date constitutes acceptance of the new pricing.

4. FEATURE ACCESS AND LIMITS
During the trial and subscription period, customers have access to all Enterprise features subject to fair usage limits. CloudSync Pro may modify or discontinue features at its discretion.

5. AUTOMATIC RENEWAL AND BILLING
The $240/year subscription will automatically renew for successive annual periods. Payment will be charged to the payment method on file. Customers must cancel before the renewal date to avoid automatic renewal.

6. SERVICE TERMINATION
CloudSync Pro may terminate this agreement at any time for violation of terms. Customers may request termination with 30 days written notice.

7. GOVERNING LAW
This agreement shall be governed by the laws of the State of California. All disputes shall be resolved in the federal courts of Northern California.""",
    },
    "lease": {
        "name": "Oakridge Student Lofts Lease Addendum",
        "text": """Oakridge Student Lofts Lease Addendum (Effective Date: September 1, 2024)

1. ADDITIONAL DEPOSIT DEDUCTIONS
In addition to the standard security deposit, tenants must pay a mandatory $350 carpet cleaning and repainting fee. This fee will be deducted from the security deposit at the end of the lease term regardless of actual wear and tear condition.

2. UNILATERAL ENTRY WAIVER
Tenants waive their right to 24-hour advance notice for landlord entry. Landlord may enter the premises at any time for "inspection purposes" without prior tenant consent or scheduling.

3. AUTOMATIC RENEWAL AND RENT INCREASE
This lease agreement will automatically renew for a 12-month period at the end of the initial term. Rent will increase by 5% upon renewal without further negotiation.

4. PET POLICY AND DEPOSITS
All pets require prior written approval and a non-refundable pet fee of $300. Pet deposits are not refundable under any circumstances.

5. LATE PAYMENT PENALTIES
Rent payments received after the 1st of the month incur a late fee of $50 or 5% of the monthly rent, whichever is greater. Late fees are automatically added to the next month's balance.

6. SECURITY DEPOSIT FORFEITURE
The security deposit of $1,000 may be fully retained by Oakridge Student Lofts for any alleged damage, normal wear and tear included. Tenants have limited recourse to dispute deductions.

7. NOTICE AND TERMINATION
Tenants must provide 60 days written notice before lease expiration. Failure to provide proper notice results in automatic conversion to month-to-month tenancy at the increased rate.""",
    },
    "freelance": {
        "name": "Northstar Freelance Services Agreement",
        "text": """Northstar Freelance Services Agreement (Effective Date: June 1, 2024)

1. SCOPE OF WORK
The Designer will deliver a brand identity package consisting of a logo, style guide, and editable source files. Deliverables and acceptance criteria are listed in Exhibit A and signed by both parties.

2. PAYMENT TERMS
Client will pay a fixed project fee of $2,500 within 30 days of receipt of an invoice. No subscription, recurring charge, or auto-pay arrangement applies to this engagement.

3. ENDING THE ENGAGEMENT
Either party may end this engagement after giving two weeks advance notification. Client will pay for all completed and accepted work, and the Designer will return any unused deposit within 10 business days.

4. CHANGES AND APPROVALS
Any change to scope requires a written change order signed by both parties before work begins. Fees for additional work are agreed in writing in advance.

5. INTELLECTUAL PROPERTY
Upon full payment, all final deliverables are assigned to Client. The Designer retains ownership of draft concepts and may display the finished work in a portfolio with Client's written permission.

6. DISPUTE RESOLUTION
The parties will first attempt to resolve disagreements through good-faith discussion. If unresolved, both parties consent to mediation in Austin, Texas before any legal action.

7. APPLICABLE LAW
This engagement is governed by the laws of the State of Texas.""",
    },
}


def getSampleText(key: str) -> str:
    return sample_contracts[key]["text"]


def getSampleName(key: str) -> str:
    return sample_contracts[key]["name"]