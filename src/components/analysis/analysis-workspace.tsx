"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cpu,
  FileCode2,
  Network,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { AnalysisResult } from "@/lib/contracts/analysis";
import type { ClaimVerification } from "@/lib/contracts/claims";
import type {
  EvidenceReference,
  RepositoryFile,
} from "@/lib/contracts/repository";
import { formatBytes } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { EvidencePanel, type ActiveEvidenceView } from "./evidence-panel";
import { ClaimsRealityPanel } from "@/components/claims/claims-reality-panel";
import { cn } from "@/lib/utils/cn";

interface AnalysisWorkspaceProps {
  analysis: AnalysisResult;
  claims: ClaimVerification[];
}

function createFileEvidenceView(file: RepositoryFile): ActiveEvidenceView {
  return {
    title: `${file.role ?? "Inspected File"} — ${file.path}`,
    filePath: file.path,
    language: file.language ?? "text",
    startLine: 1,
    endLine: file.snippet ? file.snippet.split("\n").length : undefined,
    contentReference: file.contentReference,
    code: file.snippet ?? "// Source snippet loaded from repository.",
    note: file.summary,
    sourceKind: "Important File",
  };
}

export function AnalysisWorkspace({
  analysis,
  claims,
}: AnalysisWorkspaceProps) {
  const { notify } = useToast();
  const initialFile = analysis.importantFiles[0];

  const [activeFilePath, setActiveFilePath] = useState<string | null>(
    initialFile?.path ?? null
  );
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [activeEvidence, setActiveEvidence] =
    useState<ActiveEvidenceView | null>(
      initialFile ? createFileEvidenceView(initialFile) : null
    );

  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  function handleSelectImportantFile(file: RepositoryFile) {
    setActiveFilePath(file.path);
    setActiveEvidenceId(null);
    setActiveEvidence(createFileEvidenceView(file));
    notify({
      title: "Loaded source file",
      description: `${file.path} is now displayed in the Evidence Panel.`,
      tone: "info",
      durationMs: 2500,
    });
  }

  function handleSelectClaimEvidence(
    claim: ClaimVerification,
    evidence: EvidenceReference
  ) {
    setActiveFilePath(null);
    setActiveEvidenceId(evidence.id);
    setActiveEvidence({
      title: `Claim Evidence (${claim.sourceSection})`,
      filePath: evidence.filePath,
      language: evidence.language,
      startLine: evidence.startLine,
      endLine: evidence.endLine,
      contentReference: evidence.contentReference,
      code: evidence.excerpt,
      note: evidence.note ?? claim.explanation,
      sourceKind: "Claim Evidence",
    });
  }

  // Detect which architecture flow components actually exist in this repository
  const techText = analysis.technologies.map((t) => `${t.name} ${t.category} ${t.purpose}`).join(" ").toLowerCase();
  const layerText = analysis.architecture.layers.map((l) => `${l.name} ${l.responsibility}`).join(" ").toLowerCase();
  const combinedContext = `${techText} ${layerText}`;

  const hasFrontend =
    combinedContext.includes("react") ||
    combinedContext.includes("next") ||
    combinedContext.includes("vue") ||
    combinedContext.includes("svelte") ||
    combinedContext.includes("frontend") ||
    combinedContext.includes("ui") ||
    combinedContext.includes("web") ||
    combinedContext.includes("html") ||
    combinedContext.includes("tailwind");

  const hasBackend =
    combinedContext.includes("api") ||
    combinedContext.includes("backend") ||
    combinedContext.includes("server") ||
    combinedContext.includes("worker") ||
    combinedContext.includes("controller") ||
    combinedContext.includes("service") ||
    combinedContext.includes("node") ||
    combinedContext.includes("express") ||
    combinedContext.includes("python") ||
    combinedContext.includes("fastapi") ||
    combinedContext.includes("spring") ||
    combinedContext.includes("handler");

  const hasDatabase =
    combinedContext.includes("database") ||
    combinedContext.includes("postgres") ||
    combinedContext.includes("sql") ||
    combinedContext.includes("prisma") ||
    combinedContext.includes("mongo") ||
    combinedContext.includes("redis") ||
    combinedContext.includes("storage") ||
    combinedContext.includes("orm");

  // Build existing nodes for visual flow
  const flowNodes: Array<{ title: string; subtitle: string; iconNumber: number; accent: string }> = [
    { title: "User / Client", subtitle: "Interacts or sends request", iconNumber: 1, accent: "border-border text-foreground" },
  ];

  if (hasFrontend) {
    flowNodes.push({
      title: "Frontend Interface",
      subtitle: "Renders views & takes input",
      iconNumber: flowNodes.length + 1,
      accent: "border-accent/40 text-accent",
    });
  }

  if (hasBackend) {
    flowNodes.push({
      title: "Backend Services",
      subtitle: "Handles business logic & APIs",
      iconNumber: flowNodes.length + 1,
      accent: "border-[#4E5E4A]/40 text-[#4E5E4A]",
    });
  }

  if (hasDatabase) {
    flowNodes.push({
      title: "Database / Storage",
      subtitle: "Persists records & ensures safety",
      iconNumber: flowNodes.length + 1,
      accent: "border-[#9E7D46]/40 text-[#9E7D46]",
    });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        {/* ============================================================== */}
        {/* 1. YOUR PROJECT, EXPLAINED                                      */}
        {/* ============================================================== */}
        <section
          aria-labelledby="project-explained-heading"
          className="rounded-2xl border border-[#DCD6CA] bg-surface p-6 shadow-xs space-y-6"
        >
          <div className="flex items-center justify-between border-b border-[#EAE5DC] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <BookOpen className="h-4 w-4" />
              </span>
              <div>
                <h2
                  id="project-explained-heading"
                  className="text-base font-bold text-foreground"
                >
                  Your Project, Explained
                </h2>
                <p className="text-xs text-muted">
                  A plain-English summary to help you explain your project in an interview.
                </p>
              </div>
            </div>
            <Badge variant="accent">
              {analysis.projectSummary.complexityLevel}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* What does this project do? */}
            <div className="rounded-xl border border-border bg-subtle/50 p-4 space-y-1.5">
              <p className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                What does this project do?
              </p>
              <p className="text-sm font-semibold text-foreground leading-snug">
                {analysis.projectSummary.headline}
              </p>
              <p className="text-xs leading-relaxed text-muted pt-1">
                {analysis.projectSummary.overview}
              </p>
            </div>

            {/* Who is it built for? */}
            <div className="rounded-xl border border-border bg-subtle/50 p-4 space-y-1.5">
              <p className="font-mono text-xs font-bold text-[#4E5E4A] uppercase tracking-wider">
                Who is it built for?
              </p>
              <p className="text-xs leading-relaxed text-foreground">
                Built for users who require{" "}
                <span className="font-medium text-foreground">
                  {analysis.projectSummary.primaryUseCase}
                </span>
                .
              </p>
              <div className="pt-2">
                <p className="font-mono text-[11px] font-bold text-muted uppercase">
                  What problem does it solve?
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  Prevents manual workflows, eliminates dropped operations, and guarantees predictable state during peak usage.
                </p>
              </div>
            </div>
          </div>

          {/* How does it work in simple English? */}
          <div className="rounded-xl border border-[#DCD6CA] bg-[#FAF8F5] p-4 space-y-2">
            <p className="font-mono text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Workflow className="h-4 w-4 text-accent" />
              <span>How does it work, in simple English?</span>
            </p>
            <p className="text-xs leading-relaxed text-muted">
              When a user interacts with the system, the application validates the input, executes the core logic through isolated modules, and safely records the state into persistent storage so nothing is lost.
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 2. HOW YOUR PROJECT WORKS (VISUAL FLOW)                         */}
        {/* ============================================================== */}
        <section
          aria-labelledby="architecture-flow-heading"
          className="rounded-2xl border border-[#DCD6CA] bg-surface p-6 shadow-xs space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#EAE5DC] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4E5E4A]/10 text-[#4E5E4A]">
                <Network className="h-4 w-4" />
              </span>
              <div>
                <h2
                  id="architecture-flow-heading"
                  className="text-base font-bold text-foreground"
                >
                  How Your Project Works
                </h2>
                <p className="text-xs text-muted">
                  Visual architecture flow based on files discovered in your repository.
                </p>
              </div>
            </div>
            <span className="font-mono text-xs text-muted">
              {analysis.architecture.pattern}
            </span>
          </div>

          {/* Simple Visual Flow */}
          <div className="rounded-xl border border-border bg-subtle/50 p-5">
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              {flowNodes.map((node, index) => (
                <div key={node.title} className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-initial flex items-center gap-3 rounded-lg border bg-surface p-3 shadow-xs">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-subtle font-mono text-xs font-bold text-foreground border border-border">
                      {node.iconNumber}
                    </span>
                    <div className="text-left">
                      <p className="font-mono text-xs font-bold text-foreground">
                        {node.title}
                      </p>
                      <p className="text-[11px] text-muted">
                        {node.subtitle}
                      </p>
                    </div>
                  </div>
                  {index < flowNodes.length - 1 && (
                    <span className="hidden sm:inline font-mono text-muted text-sm px-1">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-Step Plain-English Data Flow */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
              Step-by-Step Data Flow
            </p>
            <ol className="space-y-2">
              {analysis.architecture.dataFlow.map((step, index) => (
                <li
                  key={step}
                  className="flex items-start gap-2.5 rounded-lg border border-border bg-subtle/40 px-3.5 py-2 text-xs text-foreground"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-[10px] font-bold text-accent">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed text-muted">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. YOUR TECHNOLOGY                                              */}
        {/* ============================================================== */}
        <section
          aria-labelledby="tech-stack-heading"
          className="rounded-2xl border border-[#DCD6CA] bg-surface p-6 shadow-xs space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#EAE5DC] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#9E7D46]/10 text-[#9E7D46]">
                <Cpu className="h-4 w-4" />
              </span>
              <div>
                <h2
                  id="tech-stack-heading"
                  className="text-base font-bold text-foreground"
                >
                  Your Technology
                </h2>
                <p className="text-xs text-muted">
                  Why each detected tool is in your project so you can justify your choices.
                </p>
              </div>
            </div>
            <Badge variant="default">
              {analysis.technologies.length} detected
            </Badge>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {analysis.technologies.map((tech) => (
              <div
                key={tech.name}
                className="rounded-xl border border-border bg-subtle/50 p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-foreground">
                    {tech.name}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {tech.category}
                  </Badge>
                </div>

                <div className="text-xs leading-relaxed space-y-1">
                  <p className="text-muted">
                    <strong className="text-foreground">Why your project uses it: </strong>
                    {tech.purpose}
                  </p>
                  <p className="font-mono text-[11px] text-accent">
                    Found in: {tech.detectedIn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================== */}
        {/* 4. WHAT WE FOUND                                                */}
        {/* ============================================================== */}
        <section
          aria-labelledby="observations-heading"
          className="rounded-2xl border border-[#DCD6CA] bg-surface p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-[#EAE5DC] pb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2
                id="observations-heading"
                className="text-base font-bold text-foreground"
              >
                What We Found
              </h2>
              <p className="text-xs text-muted">
                Key observations an interviewer or viva examiner might notice.
              </p>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs">
            {analysis.projectSummary.observations.map((obs) => (
              <li
                key={obs}
                className="flex items-start gap-2.5 rounded-lg border border-border bg-subtle/40 p-3"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span className="leading-relaxed text-foreground">{obs}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ============================================================== */}
        {/* 5. SHOW TECHNICAL DETAILS (EXPANDABLE)                          */}
        {/* ============================================================== */}
        <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails((prev) => !prev)}
            className="flex w-full items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-subtle text-foreground border border-border">
                <FileCode2 className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Show Technical Details &amp; Source Files
                </h3>
                <p className="text-xs text-muted">
                  Inspect exact filenames, code snippets, and line references.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {analysis.importantFiles.length} files
              </Badge>
              {showTechnicalDetails ? (
                <ChevronUp className="h-4 w-4 text-muted" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted" />
              )}
            </div>
          </button>

          {showTechnicalDetails && (
            <div className="pt-3 border-t border-border space-y-3 animate-card-enter">
              <p className="text-xs text-muted">
                Click any file below to inspect its code in the Evidence Panel on the right:
              </p>
              <ul className="space-y-2">
                {analysis.importantFiles.map((file) => {
                  const isSelected = activeFilePath === file.path;
                  return (
                    <li key={file.path}>
                      <button
                        type="button"
                        onClick={() => handleSelectImportantFile(file)}
                        className={cn(
                          "w-full rounded-lg border p-3 text-left transition-all duration-150 cursor-pointer",
                          isSelected
                            ? "border-accent bg-accent-soft"
                            : "border-border bg-subtle/50 hover:border-border-strong hover:bg-surface"
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {file.path}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-muted">
                            {file.role && (
                              <Badge variant="outline">{file.role}</Badge>
                            )}
                            <span className="font-mono">
                              {formatBytes(file.size)}
                            </span>
                          </div>
                        </div>
                        {file.summary && (
                          <p className="mt-1 text-xs leading-relaxed text-muted">
                            {file.summary}
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* 6. README VS CODE VERIFICATION (CLAIMS AUDIT)                   */}
        {/* ============================================================== */}
        <ClaimsRealityPanel
          claims={claims}
          activeEvidenceId={activeEvidenceId}
          onSelectEvidence={handleSelectClaimEvidence}
        />
      </div>

      {/* Sticky Evidence Display Panel */}
      <aside className="lg:col-span-5 lg:sticky lg:top-20" aria-label="Source code evidence">
        <EvidencePanel evidence={activeEvidence} />
      </aside>
    </div>
  );
}
