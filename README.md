# ClauseGuard - 10-Second Contract Fine-Print X-Ray

**Paste a contract, or drop a PDF, and get the traps in under 10 seconds.**

ClauseGuard reads the fine print that costs people money - auto-renewals,
non-refundable fees, early-termination penalties, one-sided price increases -
then scores how fair the contract is, estimates the annual money at risk, drafts
a dispute/cancellation email, and produces a calendar alert for the cancellation
deadline.

The frontend is a complete product on its own: PDF parsing, clause detection,
scoring and email generation all run in the browser. The FastAPI backend is
optional and returns byte-identical JSON, because it runs the same deterministic
detector.

---

## Highlights

| What | How |
|------|-----|
| Runs with no backend | `pdfjs-dist` extracts PDF text client-side; detection is pure TypeScript |
| Identical results either way | `src/detector.ts` mirrors `backend/app/clauses.py` line for line |
| No API keys, no LLM calls | Deterministic rules - fast, free, repeatable, demo-safe |
| Real outputs | Verbatim clause quotes, fairness score, dollar exposure, `.ics` reminder |
| Live engine telemetry | The console pings `/api/health` and shows FastAPI or standalone-edge status |
| Tactile scan feedback | A 350ms cyan scan bar runs concurrently with analysis, adding no latency |
| Editable action pack | Customize the dispute email, address it to a vendor, open it in mail, export a `.txt` audit |
| Honest privacy | Uploaded PDFs are parsed on the user's device |

---

## Quick start

### Frontend only (recommended for demos)

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> for the landing page. Everything works, including
PDF upload. Use **Open Console**, or go straight to a pre-scanned demo with
`?demo=gym`, `?demo=trial`, `?demo=lease` or `?demo=freelance`.
`?view=console` opens the workspace without a preset scan.

### Frontend + backend

```bash
# terminal 1
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000

# terminal 2
cd frontend
npm install
npm run dev
```

On load, the console pings `http://127.0.0.1:8000/api/health` to drive the live
engine pill. Each analysis tries the API first and silently falls back to the
in-browser detector if it does not answer in time, so the UI never blocks on a
missing backend. The 350ms scan bar is decorative feedback and runs in parallel
with the real work.

To point at a deployed API, create `frontend/.env.local`:

```bash
VITE_API_BASE=https://your-backend.example.com/api
```

---

## What the screens do

### Landing page (`view === 'landing'`)

- An `h-20` sticky navbar in a `max-w-7xl mx-auto` / `px-8` container, with the
  shield logo, a clickable Capy defense-tip pill and a glowing **Open Console**
  button.
- Exact hero copy: the badge **Teens Hack Houston 2026 • A More Efficient Way to
  Live**, the headline **Never Sign a Hidden Trap Again.**, the 10-second X-ray
  subheadline, and the **Open Console** / **Try Gym Trap Demo** CTAs.
- **Interactive X-Ray sandbox**: three switches (60-day certified-mail trap,
  hidden $199 fee, $250 exit penalty) highlight the exact clause language and
  move the SVG fairness dial from **34 to 94**, with money at risk following
  from $689 to $0. Capy holds a red warning flag or a green checkmark.
- **Subscription exposure slider** (1-15 contracts, starting at 15) shows
  **$3,600** of annual exposure and **5.0h** of reading time saved at the top
  end, and recalculates immediately as you drag.
- Three equal-height feature cards: **01. 10-Second Verbatim X-Ray**,
  **02. 1-Click Dispute Autopilot** and **03. .ics Deadline Guard**.
- Sections use `px-8 py-10`, `gap-8`/`gap-10` gutters, `p-8` cards,
  `leading-relaxed` body copy and `tabular-nums` for every number.
- Capy mascot, hand-drawn SVG art and CSS-only grid/scanline effects keep the
  page fast with no WebGL or image assets.

### Console (`view === 'console'`)

- Collapsible `w-72` / `w-20` sidebar with the three section tabs, four sample
  launchers (**Gym Membership Trap**, **SaaS Auto-Renewal**, **Student Lease
  Trap**, **Fair Freelance Contract**) and session scan history.
- `h-20` sticky top bar with the live engine pill and a Capybara that reacts to
  the current fairness score. Click it for a secret toast.
- A three-card KPI strip for **Fairness Score**, **Annual Money at Risk** and
  **Reading Time Saved**, all using `tabular-nums`.
- Spacious `p-8` canvas with `gap-8` gutters and tab-specific layouts:
  - **Document X-Ray** - drag-and-drop PDF or TXT input, a 350ms scan bar, and
    verbatim highlights inside the original text. Click a highlight to open a
    detail banner with severity, explanation and dollar exposure.
  - **Risk Telemetry** - every flagged clause with severity, plain-English
    explanation, dollar impact, a **Predatory Clause vs. Safe Counter-Clause**
    comparison with 1-click copy, negotiation leverage, and a **Compounding
    Financial Exposure** card with 1-Year / 2-Year / 3-Year projections.
  - **Action Autopilot** - **Capy's Tactical Playbook** with three trackable,
    contract-specific steps, then an editable dispute email, vendor email field,
    Gmail compose prefill with a `mailto:` fallback, `.txt` audit export and a
    `.ics` calendar alert with a reminder seven days before the cutoff.
- PDF and TXT files are parsed entirely in the browser with `pdfjs-dist`. The
  bundled worker is used first, with a pinned jsDelivr worker fallback for
  static hosts, so uploads work on Vercel with no backend. Only a scanned PDF
  with no selectable text falls back to the optional FastAPI PDF endpoint.

---

## Console polish upgrades

1. **Live engine telemetry pill** - emerald when FastAPI answers, cyan when the
   standalone in-browser detector is active.
2. **350ms cyan scan bar** - a tactile sweep across the X-Ray card on every
   scan, concurrent with analysis so it adds no real delay.
3. **Clause cross-highlighting** - `selectedClauseIdx` links a marked phrase in
   the document to a detail banner and the telemetry cards.
4. **Editable action pack** - change the generated email, add a vendor address,
   open the draft in Gmail with subject/body pre-filled, or export the findings
   plus your edits as a plain-text audit report.
5. **`tabular-nums` everywhere numbers matter** - scores, money, hours, clause
   counts, dates and history timestamps stay aligned.
6. **Consistent spacing system** - `h-20` headers, `p-6 lg:p-8` cards, `gap-8`/
   `gap-10` gutters, `max-w-7xl mx-auto` shells and `leading-relaxed` copy.
7. **Negotiation-ready redlines** - every detector rule carries `safe_redline`
   and `negotiation_leverage`, mirrored exactly in the Python backend so local
   and API analyses stay identical.
8. **Production file parsing and guided action** - guaranteed client-side PDF/
   TXT extraction, multi-year exposure projections and Capy's interactive
   playbook turn the report into a concrete negotiation workflow.

---

## API

Base URL: `http://127.0.0.1:8000/api`

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET` | `/health` | - | `{"status":"ok"}` |
| `GET` | `/samples` | - | The four demo contracts used by the frontend |
| `POST` | `/analyze-text` | `{text, contract_name?}` | `AnalysisResult` |
| `POST` | `/analyze-pdf` | multipart `file` (PDF) | `AnalysisResult` |
| `POST` | `/generate-ics` | `{title?, deadline_date: "YYYY-MM-DD", notes?}` | `.ics` download |

`AnalysisResult`:

```json
{
  "fairness_score": 24,
  "money_at_risk": 929.0,
  "reading_time_saved_mins": 2,
  "cutoff_summary": "Cancel at least 60 days before renewal - calendar alert set 7 days early.",
  "cutoff_date_iso": "2027-01-20",
  "dispute_email": "Dear Contract Provider, ...",
  "clauses": [
    {
      "verbatim_quote": "This membership will automatically renew ...",
      "title": "Automatic Renewal",
      "severity": "HIGH",
      "explanation": "Clause automatically renews your subscription unless you cancel by a specific deadline.",
      "dollar_impact": 240.0,
      "weight": 15
    }
  ]
}
```

Interactive docs are served at <http://127.0.0.1:8000/docs>.

CORS is open (`allow_origins=["*"]`) so the static frontend can call the API
from anywhere. The `.ics` and `.txt` exports are generated client-side; the
backend endpoint is provided for integrations.

---

## How detection works

Ten rules run over the text. Each has a pattern, a severity, a plain-English
explanation and a weight:

| Severity | Weight | Examples |
|----------|--------|----------|
| HIGH | 15 | automatic renewal, non-refundable fees, early-termination penalty, unilateral price increase, trial auto-convert |
| MEDIUM | 8 | cancellation notice period, hidden fees, auto-pay enrollment |
| LOW | 3 | indemnification, governing law |

- `fairness_score = max(0, 100 - sum(weights))`
- `money_at_risk` sums the per-clause annual exposure (renewal/subscription
  $240, penalty $250, non-refundable $199).
- Each match keeps a verbatim snippet: 40 characters before and 80 after,
  snapped out to whole words and whitespace-collapsed.
- Deadlines come from `at least N days/weeks/months/hours` and `N-day free
  trial`. If the notice period sits inside the trial, the deadline is trial end
  minus notice; otherwise the notice period governs.

The TypeScript and Python implementations are tested for exact parity:

```bash
# 1. bundle the detector for Node
cd frontend
npx esbuild src/detector.ts --bundle --format=esm --platform=node --outfile=detector.mjs

# 2. with the backend running, compare both on the samples and edge cases
node ../scripts/parity.mjs detector.mjs
```

`scripts/parity.mjs` compares every field on all four samples plus three edge
cases, including the full clause array and the generated email, and exits
non-zero on any difference.

---

## Project layout

```
ClauseGuard/
├── frontend/
│   ├── index.html              # Vite shell + Tailwind CDN mirror
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx             # view state + shared analysis/action state
│   │   ├── LandingPage.tsx     # spacious landing, SVG art, sandbox, slider
│   │   ├── Console.tsx         # sidebar, tabs, X-Ray, telemetry, actions
│   │   ├── shared.ts           # backend client, .ics, audit export, status
│   │   ├── detector.ts         # pure detector, mirrors the Python module
│   │   ├── samples.ts          # four demo contracts
│   │   ├── PdfjsViewer.tsx     # pdfjs-dist text extraction
│   │   └── index.css           # Tailwind layers + scan/pulse animations
│   ├── postcss.config.cjs
│   ├── tailwind.config.cjs
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app + endpoints
│   │   └── clauses.py          # deterministic detector + four samples
│   └── requirements.txt
├── scripts/
│   └── parity.mjs              # TS vs Python parity test
└── README.md
```

---

## Deploying the frontend (no backend)

```bash
cd frontend
npm run build     # static output in dist/
```

Deploy `frontend` as a Vite project on Vercel, Netlify or any static host.
`vite.config.ts` uses `base: './'`, so the build also works from a subpath.
No environment variables are required; with no backend reachable, the app runs
fully in-browser.

`index.html` includes the Tailwind CDN script requested for static-preview
parity, but the compiled PostCSS stylesheet in `dist/assets` remains
authoritative. The app still works when the CDN is unreachable.

If you also deploy the API, set `VITE_API_BASE` at build time.

---

## Deploying the backend

Any Python host works (Render, Fly.io, Cloud Run, a VPS):

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`requirements.txt` pins FastAPI, Uvicorn and PyMuPDF. PyMuPDF is only needed for
`/analyze-pdf`; the text endpoint works without it.

---

## Notes and limits

- Clause detection is pattern-based, not legal analysis. It is a demo, not legal
  advice.
- Scanned/image-only PDFs have no text layer; the UI asks the user to paste the
  text instead.
- `/api/analyze-pdf` accepts PDFs only. DOC/DOCX are intentionally rejected
  rather than mis-parsed.

## License

MIT.
