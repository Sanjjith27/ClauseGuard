/*
 * ============================================================================
 * ClauseGuard - Application shell
 * ============================================================================
 * Owns the `view` state machine (landing | console) and every piece of shared
 * analysis state so switching views never loses a scan. Analysis prefers the
 * optional FastAPI backend at http://127.0.0.1:8000 and silently falls back to
 * the identical in-browser detector when deployed without a backend.
 *
 * This file is also the single source of truth for the polish pass: engine
 * telemetry, the 350ms scan gate, the selected X-Ray clause, the editable
 * dispute email and both Gmail / mailto compose URLs.
 * ============================================================================
 */

import React, { useCallback, useEffect, useState } from "react";
import Console from "./Console";
import LandingPage from "./LandingPage";
import { analyzeLocally, type AnalysisResult } from "./detector";
import { extractFileText } from "./PdfjsViewer";
import { sampleContracts, type SampleKey } from "./samples";
import {
  analyzePdfWithBackend,
  analyzeWithBackend,
  pingBackend,
  sleep,
  type EngineStatus,
  type ScanHistoryEntry,
} from "./shared";

const SCAN_FEEDBACK_MS = 350;

/* -------------------------------------------------------------------------- */
/* Compose helpers                                                            */
/* -------------------------------------------------------------------------- */
/**
 * Gmail's compose deep link uses the same to/subject/body fields as a mailto
 * URL, but keeps the user inside Gmail instead of depending on their OS mail
 * handler. `tf=1` forces a plain-text body so the contract quotes stay legible.
 */
const buildGmailComposeUrl = (recipient: string, subject: string, body: string): string => {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    tf: "1",
    su: subject,
    body,
  });
  const to = recipient.trim();
  if (to) params.set("to", to);
  return `https://mail.google.com/mail/?${params.toString()}`;
};

/** Kept as an explicit fallback for users who prefer their default mail app. */
const buildMailtoUrl = (recipient: string, subject: string, body: string): string => {
  const to = recipient.trim();
  return `mailto:${to ? encodeURIComponent(to) : ""}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
};

/* -------------------------------------------------------------------------- */
/* Toast                                                                      */
/* -------------------------------------------------------------------------- */
const Toast: React.FC<{ message: string; onDone: () => void }> = ({ message, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone, message]);

  return (
    <div
      role="status"
      className="fixed bottom-8 right-8 z-50 max-w-sm rounded-xl border border-cyan-400/40 bg-[#041329] px-5 py-3.5 text-sm leading-relaxed text-cyan-100 shadow-2xl shadow-cyan-500/10"
    >
      {message}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* App                                                                        */
/* -------------------------------------------------------------------------- */
type View = "landing" | "console";

const App: React.FC = () => {
  const [view, setView] = useState<View>("landing");
  const [text, setText] = useState("");
  const [contractName, setContractName] = useState("Pasted Contract");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("checking");
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);
  const [activeSample, setActiveSample] = useState<SampleKey | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* Polish state: a selected clause drives the detail banner, and the editable
     email/vendor fields drive both Gmail and mailto compose links. */
  const [selectedClauseIdx, setSelectedClauseIdx] = useState<number | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");

  const showToast = useCallback((message: string) => setToast(message), []);
  const dismissToast = useCallback(() => setToast(null), []);

  /* Live engine telemetry: ping /api/health once on mount. The pill in the
     console header reads this state and switches emerald/cyan accordingly. */
  useEffect(() => {
    let alive = true;
    void pingBackend().then((online) => {
      if (alive) setEngineStatus(online ? "online" : "offline");
    });
    return () => {
      alive = false;
    };
  }, []);

  /* A new analysis invalidates the previous selection and draft. */
  useEffect(() => {
    setSelectedClauseIdx(null);
    setEmailDraft(result?.dispute_email ?? "");
    setVendorEmail("");
  }, [result]);

  const record = useCallback(
    (name: string, source: string, analysis: AnalysisResult) => {
      setHistory((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name,
            text: source,
            result: analysis,
            at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
          ...prev,
        ].slice(0, 8),
      );
    },
    [],
  );

  /**
   * The 350ms cyan bar and the analysis run concurrently. Results are released
   * only after the bar has swept, so every scan feels deliberate without adding
   * real latency on fast machines.
   */
  const runAnalysis = useCallback(
    async (rawText: string, name: string) => {
      setLoading(true);
      setScanning(true);
      setResult(null);
      try {
        const analysisTask = (async () => {
          const remote = await analyzeWithBackend(rawText, name);
          return remote ?? analyzeLocally(rawText, name);
        })();
        const [analysis] = await Promise.all([analysisTask, sleep(SCAN_FEEDBACK_MS)]);
        setResult(analysis);
        record(name, rawText, analysis);
      } finally {
        setScanning(false);
        setLoading(false);
      }
    },
    [record],
  );

  const handleSample = useCallback(
    (key: SampleKey) => {
      const c = sampleContracts[key];
      setActiveSample(key);
      setUploadedFileName(null);
      setContractName(c.name);
      setText(c.text);
      void runAnalysis(c.text, c.name);
    },
    [runAnalysis],
  );

  const handleFile = useCallback(
    async (file: File) => {
      const lower = file.name.toLowerCase();
      const isTxt = lower.endsWith(".txt") || file.type === "text/plain";
      const isPdf = lower.endsWith(".pdf") || file.type === "application/pdf";
      if (!isTxt && !isPdf) {
        showToast("Only PDF and TXT contracts are supported.");
        return;
      }

      setActiveSample(null);
      setUploadedFileName(file.name);
      setLoading(true);
      setScanning(true);
      setPdfProgress(0);
      const name = file.name.replace(/\.[^.]+$/, "") || "Uploaded Contract";
      setContractName(name);
      try {
        // Parse in the browser first. This keeps the contract on-device and
        // guarantees X-Ray highlights line up with the visible text on Vercel.
        // pdf.js retries with a CDN worker if the bundled worker cannot load.
        let extracted = "";
        try {
          extracted = await extractFileText(file, setPdfProgress);
        } catch (err) {
          console.warn("Local file extraction failed", err);
        }

        if (extracted.trim()) {
          const analysis = analyzeLocally(extracted, name);
          await sleep(SCAN_FEEDBACK_MS);
          setText(extracted);
          setResult(analysis);
          record(name, extracted, analysis);
          return;
        }

        // Backend PDF analysis remains a fallback for image-only/scanned PDFs.
        if (isPdf) {
          const remote = await analyzePdfWithBackend(file);
          await sleep(SCAN_FEEDBACK_MS);
          if (remote) {
            setResult(remote);
            setText("");
            record(name, "", remote);
            showToast("Analyzed on the server. Paste the text to see the X-Ray view.");
            return;
          }
        } else {
          await sleep(SCAN_FEEDBACK_MS);
        }
        showToast(
          isTxt
            ? "Could not read that TXT file. Try pasting the text instead."
            : "Could not read that PDF. Try pasting the text instead.",
        );
      } catch (err) {
        console.error(err);
        showToast("Could not read that file. Try pasting the text instead.");
      } finally {
        setScanning(false);
        setLoading(false);
        setPdfProgress(null);
      }
    },
    [record, showToast],
  );

  const handleScan = useCallback(() => {
    if (!text.trim()) return;
    void runAnalysis(text, contractName);
  }, [text, contractName, runAnalysis]);

  const openConsole = useCallback(() => setView("console"), []);
  const goLanding = useCallback(() => setView("landing"), []);

  const openGymDemo = useCallback(() => {
    setView("console");
    handleSample("gym");
  }, [handleSample]);

  const restoreHistory = useCallback((entry: ScanHistoryEntry) => {
    setText(entry.text);
    setContractName(entry.name);
    setResult(entry.result);
    setActiveSample(null);
    setUploadedFileName(null);
  }, []);

  /** Fresh input: clear text, sample lock, upload name and every derived result. */
  const handleNewDocument = useCallback(() => {
    setText("");
    setContractName("Pasted Contract");
    setResult(null);
    setLoading(false);
    setScanning(false);
    setPdfProgress(null);
    setActiveSample(null);
    setUploadedFileName(null);
    setSelectedClauseIdx(null);
    setEmailDraft("");
    setVendorEmail("");
  }, []);

  const handleCapyClick = useCallback(() => {
    showToast("Secret Capybara Unlocked: +100% Fine-Print Immunity!");
  }, [showToast]);

  /* Shareable deep links: /?demo=gym|trial|lease|freelance, /?view=console */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo");
    if (demo && demo in sampleContracts) {
      setView("console");
      handleSample(demo as SampleKey);
      return;
    }
    if (params.get("view") === "console") setView("console");
  }, [handleSample]);

  const disputeSubject = `Contract Dispute - ${contractName}`;
  const gmailComposeUrl = buildGmailComposeUrl(vendorEmail, disputeSubject, emailDraft);
  const mailtoUrl = buildMailtoUrl(vendorEmail, disputeSubject, emailDraft);

  const consoleProps = {
    text,
    setText: (t: string) => {
      setText(t);
      // Manual typing/pasting always overrides a loaded sample or upload and
      // invalidates analysis derived from the previous document.
      if (activeSample || uploadedFileName) {
        setActiveSample(null);
        setUploadedFileName(null);
        setContractName("Custom Uploaded Document");
      }
      setResult(null);
      setSelectedClauseIdx(null);
      setEmailDraft("");
      setVendorEmail("");
    },
    contractName,
    result,
    loading,
    scanning,
    engineStatus,
    pdfProgress,
    activeSample,
    history,
    selectedClauseIdx,
    onSelectClause: setSelectedClauseIdx,
    emailDraft,
    vendorEmail,
    gmailComposeUrl,
    mailtoUrl,
    onEmailDraftChange: setEmailDraft,
    onVendorEmailChange: setVendorEmail,
    sidebarCollapsed,
    onToggleSidebar: () => setSidebarCollapsed((c) => !c),
    onSample: handleSample,
    onFile: handleFile,
    onScan: handleScan,
    onHistory: restoreHistory,
    onLanding: goLanding,
    onNewDocument: handleNewDocument,
    onCapyClick: handleCapyClick,
  };

  return (
    <>
      {view === "landing" ? (
        <LandingPage
          onOpenConsole={openConsole}
          onGymDemo={openGymDemo}
          onToast={showToast}
        />
      ) : (
        <Console {...consoleProps} />
      )}
      {toast && <Toast message={toast} onDone={dismissToast} />}
    </>
  );
};

export default App;
