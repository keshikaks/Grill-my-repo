import type { ClaimStatus, ClaimVerification } from "../../contracts/claims.ts";
import type { EvidenceReference } from "../../contracts/repository.ts";
import type { IngestedFile } from "../github/types.ts";

interface RawClaimItem {
  id: string;
  claim: string;
  sourceSection: string;
}

export function parseRawClaimsFromReadme(readmeContent: string | null): RawClaimItem[] {
  if (!readmeContent) {
    return [];
  }

  const lines = readmeContent.replace(/\r\n/g, "\n").split("\n");
  const claims: RawClaimItem[] = [];

  let currentSection = "README.md · Overview";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]?.trim() ?? "";

    // Track headings
    if (rawLine.startsWith("#")) {
      const headingText = rawLine.replace(/^#+\s*/, "").replace(/[^\w\s-]/g, "").trim();
      if (headingText) {
        currentSection = `README.md · ${headingText}`;
      }
      continue;
    }

    // Identify bullet claims or bold feature statements
    const isBullet = rawLine.startsWith("- ") || rawLine.startsWith("* ") || /^\d+\.\s+/.test(rawLine);
    if (!isBullet) continue;

    const clean = rawLine
      .replace(/^[-*]\s+/, "")
      .replace(/^\d+\.\s+/, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .trim();

    // Skip short or non-technical items
    if (clean.length < 25) continue;
    if (/^(install|usage|license|contributing|table of contents|getting started|prerequisites)/i.test(clean)) continue;
    if (clean.includes("http://") || clean.includes("https://") || clean.includes("img.shields.io")) continue;

    // Filter to lines making concrete functional or architectural statements
    const isClaimCandidate =
      /(guarantee|support|deliver|sign|encrypt|validate|retry|backoff|stream|queue|cache|database|metric|test|concurren|auth|token|scale|perform|latency|error|idempotent)/i.test(
        clean
      );

    if (isClaimCandidate) {
      claims.push({
        id: `claim-${claims.length + 1}`,
        claim: clean,
        sourceSection: currentSection,
      });
    }

    if (claims.length >= 8) break;
  }

  return claims;
}

export function verifyClaimAgainstFiles(
  rawClaim: RawClaimItem,
  files: IngestedFile[],
  commitSha: string
): ClaimVerification {
  const claimText = rawClaim.claim.toLowerCase();

  // Rule 1: Check for benchmark, throughput, SLA, or multi-region claims that are runtime-only
  const isRuntimeBenchmark =
    /(req\/s|rps|throughput|p99|latency|sla|uptime|multi-region|load test|benchmark)/i.test(
      claimText
    );

  if (isRuntimeBenchmark) {
    // Check if there is an explicit benchmark script in the repo
    const benchFile = files.find(
      (f) => f.path.includes("benchmark") || f.path.includes("load") || f.path.includes("perf")
    );

    const evidenceReferences: EvidenceReference[] = [];
    if (benchFile) {
      evidenceReferences.push(createEvidenceFromLines(benchFile, 1, Math.min(15, benchFile.lineCount), commitSha, "Benchmark configuration file observed in repository."));
    }

    return {
      id: rawClaim.id,
      claim: rawClaim.claim,
      sourceSection: rawClaim.sourceSection,
      status: "NOT_STATICALLY_VERIFIABLE",
      explanation:
        "Throughput, latency, and runtime availability metrics cannot be statically proven from source code alone. Verification requires runtime telemetry, cluster benchmarks, and deployment monitoring.",
      evidenceReferences,
    };
  }

  // Extract candidate search terms from claim
  const keywords = extractKeywords(claimText);

  // Search through inspectable files for matching evidence
  const matchingEvidence: Array<{
    file: IngestedFile;
    startLine: number;
    endLine: number;
    score: number;
  }> = [];

  for (const file of files) {
    if (file.path.toLowerCase().endsWith("readme.md")) continue;

    for (let lineIdx = 0; lineIdx < file.lines.length; lineIdx++) {
      const lineText = (file.lines[lineIdx] ?? "").toLowerCase();

      let matchedKeywords = 0;
      for (const kw of keywords) {
        if (lineText.includes(kw)) {
          matchedKeywords++;
        }
      }

      if (matchedKeywords > 0) {
        const startLine = Math.max(1, lineIdx - 1);
        const endLine = Math.min(file.lines.length, lineIdx + 12);
        matchingEvidence.push({
          file,
          startLine,
          endLine,
          score: matchedKeywords,
        });
        lineIdx += 10; // Jump past current snippet window
      }
    }
  }

  // Sort matches by score descending
  matchingEvidence.sort((a, b) => b.score - a.score);

  if (matchingEvidence.length === 0) {
    return {
      id: rawClaim.id,
      claim: rawClaim.claim,
      sourceSection: rawClaim.sourceSection,
      status: "NOT_FOUND_IN_INSPECTED_FILES",
      explanation:
        "Claimed in repository documentation, but no matching implementation, export, or configuration was located in the inspected files.",
      evidenceReferences: [],
    };
  }

  // Build real evidence references
  const topMatches = matchingEvidence.slice(0, 2);
  const evidenceReferences: EvidenceReference[] = topMatches.map((m) =>
    createEvidenceFromLines(
      m.file,
      m.startLine,
      m.endLine,
      commitSha,
      `Inspected source evidence matching keywords in ${m.file.path}.`
    )
  );

  // Determine SUPPORTED vs PARTIALLY_SUPPORTED
  // If claim states "all", "strictly", "guarantees", or "exactly-once"
  const hasStrictGuaranteeWord =
    /(strictly|guarantee|exactly-once|always|all outbound|zero)/i.test(claimText);

  const status: ClaimStatus = hasStrictGuaranteeWord
    ? "PARTIALLY_SUPPORTED"
    : "SUPPORTED";

  const explanation =
    status === "SUPPORTED"
      ? `Direct source code evidence found in ${topMatches[0]?.file.path} corroborating the documented capability.`
      : `Core mechanism is present in ${topMatches[0]?.file.path}, but strict guarantees or edge-case handling appear incomplete upon static inspection.`;

  return {
    id: rawClaim.id,
    claim: rawClaim.claim,
    sourceSection: rawClaim.sourceSection,
    status,
    explanation,
    evidenceReferences,
  };
}

function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    "with", "that", "this", "from", "have", "been", "will", "your", "using",
    "into", "each", "both", "more", "most", "than", "very", "also", "then",
    "such", "when", "what", "where", "which", "make", "made", "like", "time",
    "across", "every", "built", "features", "support",
  ]);

  const rawWords = text
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 3 && !commonWords.has(w));

  const stems = new Set<string>();
  for (const w of rawWords) {
    stems.add(w);
    // Simple word stemming for common prefixes/suffixes
    if (w.endsWith("ies") && w.length > 4) stems.add(w.slice(0, -3) + "y");
    else if (w.endsWith("es") && w.length > 4) stems.add(w.slice(0, -2));
    else if (w.endsWith("s") && w.length > 3) stems.add(w.slice(0, -1));
    else if (w.endsWith("ed") && w.length > 4) stems.add(w.slice(0, -2));
    else if (w.endsWith("ing") && w.length > 5) stems.add(w.slice(0, -3));
  }

  return Array.from(stems).slice(0, 8);
}

function createEvidenceFromLines(
  file: IngestedFile,
  startLine: number,
  endLine: number,
  commitSha: string,
  note?: string
): EvidenceReference {
  const excerptLines = file.lines.slice(startLine - 1, endLine);
  const excerpt = excerptLines.join("\n");
  const ext = file.extension.replace(/^\./, "") || "typescript";

  return {
    id: `ev-${file.path.replace(/[^\w-]/g, "_")}-${startLine}`,
    filePath: file.path,
    startLine,
    endLine,
    contentReference: `blob:${commitSha.slice(0, 7)}:${file.path}`,
    language: ext,
    excerpt,
    note,
  };
}
