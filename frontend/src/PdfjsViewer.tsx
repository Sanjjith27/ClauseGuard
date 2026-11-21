/*
 * PdfjsViewer - Guaranteed client-side file text extraction.
 * ----------------------------------------------------------
 * Runs entirely in the browser so the app works on Vercel with zero backend.
 * PDFs use the Vite-bundled pdf.js worker first, then retry with a pinned CDN
 * worker if that worker cannot load in the deployed environment. Plain-text
 * files go straight through the File API. No contract bytes are uploaded.
 */

import * as pdfjsLib from "pdfjs-dist";
import bundledWorker from "pdfjs-dist/build/pdf.worker.min.js?url";

/** Pinned to the same version as package.json so the worker protocol matches. */
const CDN_WORKER =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const WORKER_TIMEOUT_MS = 8000;

// Start with the locally bundled worker; extractPdfText swaps this on failure.
pdfjsLib.GlobalWorkerOptions.workerSrc = bundledWorker;

type ProgressFn = (percent: number) => void;

/** Avoid a hung worker turning an upload into an endless spinner. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("PDF worker timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Read one PDF with whichever worker is currently configured. */
async function readPdf(file: File, onProgress?: ProgressFn): Promise<string> {
  // pdf.js transfers/detaches the ArrayBuffer, so each attempt needs a fresh one.
  const data = await file.arrayBuffer();
  const pdf = await withTimeout(
    pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
      isEvalSupported: false,
    }).promise,
    WORKER_TIMEOUT_MS,
  );

  try {
    const total = pdf.numPages;
    const chunks: string[] = [];
    for (let pageNum = 1; pageNum <= total; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (pageText) chunks.push(pageText);
      onProgress?.(Math.round((pageNum / total) * 100));
    }
    return chunks.join("\n").trim();
  } finally {
    await pdf.destroy();
  }
}

/**
 * Extract all text from a PDF File using pdfjs-dist.
 * Retries once with the CDN worker so Vercel deployments still work when the
 * bundled worker URL is blocked or mis-served by a static host.
 */
export async function extractPdfText(
  file: File,
  onProgress?: ProgressFn,
): Promise<string> {
  try {
    const text = await readPdf(file, onProgress);
    if (!text) throw new Error("This PDF contains no selectable text");
    return text;
  } catch (bundledError) {
    console.warn("Bundled PDF worker failed; retrying with CDN worker", bundledError);
    pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER;
    onProgress?.(0);
    try {
      const text = await readPdf(file, onProgress);
      if (!text) throw new Error("This PDF contains no selectable text");
      return text;
    } catch (cdnError) {
      console.error("CDN PDF worker also failed", cdnError);
      throw new Error("Could not extract text from this PDF in the browser");
    }
  }
}

/** File.text() is universal in modern browsers; FileReader is the safety net. */
async function readTextFile(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsText(file);
  });
}

/**
 * Single entry point used by the uploader: .txt is read directly, .pdf goes
 * through pdf.js. Both paths are 100% client-side.
 */
export async function extractFileText(
  file: File,
  onProgress?: ProgressFn,
): Promise<string> {
  const name = file.name.toLowerCase();
  const isTxt = name.endsWith(".txt") || file.type === "text/plain";
  if (isTxt) {
    const text = (await readTextFile(file)).trim();
    if (!text) throw new Error("This text file is empty");
    onProgress?.(100);
    return text;
  }
  return extractPdfText(file, onProgress);
}
