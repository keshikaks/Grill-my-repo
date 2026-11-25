"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookMarked,
  Check,
  CheckCircle2,
  Copy,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import type { FinalReport } from "@/lib/contracts/report";
import type { EvidenceReference } from "@/lib/contracts/repository";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ProgressBar } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ScoreRing } from "./score-ring";
import { QuestionBreakdown } from "./question-breakdown";
import { cn } from "@/lib/utils/cn";

type ReportSectionTab =
  | "all"
  | "strengths"
  | "improvements"
  | "model_answers"
  | "study_next";

interface ReportWorkspaceProps {
  sessionId?: string;
  repositoryFullName: string;
  report: FinalReport;
  isIncomplete?: boolean;
  answeredCount?: number;
  totalQuestions?: number;
}

export function ReportWorkspace({
  sessionId,
  repositoryFullName,
  report,
  isIncomplete = false,
  answeredCount,
  totalQuestions,
}: ReportWorkspaceProps) {
  const { notify } = useToast();
  const [activeTab, setActiveTab] = useState<ReportSectionTab>("all");
  const [checkedTopics, setCheckedTopics] = useState<Record<string, boolean>>(
    {}
  );
  const [inspectedEvidence, setInspectedEvidence] =
    useState<EvidenceReference | null>(null);

  const completedRevisionCount = Object.values(checkedTopics).filter(Boolean).length;

  function toggleRevisionTopic(id: string) {
    setCheckedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCopySummary() {
    const markdown = [
      `# Grill My Repo — Educational Feedback Card (${repositoryFullName})`,
      `Interview Readiness Score: ${report.overallScore}/100`,
      "",
      "## Plain-Language Dimension Scores",
      `- Technical Correctness: ${report.categoryScores.correctness}%`,
      `- Code Understanding: ${report.categoryScores.codeUnderstanding}%`,
      `- Explanation Clarity: ${report.categoryScores.clarity}%`,
      `- Reasoning & Trade-offs: ${report.categoryScores.reasoning}%`,
      "",
      "## What to Study Next",
      ...report.revisionTopics.map(
        (topic) => `- [${topic.priority}] ${topic.topic}: ${topic.reason} (Files: ${topic.relatedFiles.join(", ")})`
      ),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(markdown);
      notify({
        title: "Feedback summary copied",
        description: "Summary copied to clipboard.",
        tone: "success",
      });
    } catch {
      notify({
        title: "Clipboard unavailable",
        description: "Your browser prevented clipboard access.",
        tone: "warning",
      });
    }
  }

  // Plain language score explanation
  const readinessExplanation = useMemo(() => {
    if (report.overallScore >= 80) {
      return {
        headline: "Interview Ready",
        summary:
          "You have a strong understanding of your system architecture and clearly communicate trade-offs. You are ready to defend this project in placement rounds and vivas.",
        badgeTone: "success" as const,
      };
    }
    if (report.overallScore >= 60) {
      return {
        headline: "Solid Foundation · Practice Edge Cases",
        summary:
          "You understand how your code works on the happy path. Focus your practice on explaining failure cases, database timeouts, and concurrency safety.",
        badgeTone: "warning" as const,
      };
    }
    return {
      headline: "Needs Revision Before Interview",
      summary:
        "Review your implementation files and study the model answers below. Focus on being able to explain which file handles each operation in simple English.",
      badgeTone: "error" as const,
    };
  }, [report.overallScore]);

  const scoreCards = [
    {
      label: "Technical Correctness",
      value: report.categoryScores.correctness,
      description: "Did you explain what the code actually does under the hood without guessing?",
      tone: "accent" as const,
    },
    {
      label: "Code Understanding",
      value: report.categoryScores.codeUnderstanding,
      description: "How familiar are you with where files, routes, and database models live?",
      tone: "success" as const,
    },
    {
      label: "Explanation Clarity",
      value: report.categoryScores.clarity,
      description: "Was your answer structured, clear, and easy for an examiner to follow?",
      tone: "accent" as const,
    },
    {
      label: "Reasoning & Trade-offs",
      value: report.categoryScores.reasoning,
      description: "Could you explain why you chose this technology or architecture pattern?",
      tone: "warning" as const,
    },
  ];

  const showSection = (section: Exclude<ReportSectionTab, "all">) =>
    activeTab === "all" || activeTab === section;

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Incomplete Session Banner if applicable */}
      {isIncomplete && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-warning-border/80 bg-warning-soft p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning-text shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">
                Provisional Feedback · ({answeredCount ?? 0} of {totalQuestions ?? 0} Questions Answered)
              </p>
              <p className="text-xs text-muted leading-relaxed">
                This report card only evaluates the questions you have submitted so far. Unanswered questions are never scored or assumed.
              </p>
            </div>
          </div>
          <Link
            href={sessionId ? `/grill?session=${encodeURIComponent(sessionId)}` : "/grill"}
            className={buttonClassName({ variant: "primary", size: "sm", className: "shrink-0 gap-1.5" })}
          >
            <span>Continue Practice</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Overview Readiness Card */}
      <Card elevated className="border-[#DCD6CA] bg-surface">
        <CardContent className="pt-6">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="flex flex-col items-center border-b border-border pb-6 lg:col-span-4 lg:border-r lg:border-b-0 lg:pr-6 lg:pb-0">
              <ScoreRing score={report.overallScore} />
              <div className="mt-3 flex flex-col items-center gap-1">
                <Badge variant={readinessExplanation.badgeTone} className="text-xs">
                  {readinessExplanation.headline}
                </Badge>
                <p className="text-center font-mono text-[11px] text-muted">
                  {repositoryFullName}
                </p>
              </div>
            </div>

            <div className="space-y-5 lg:col-span-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    Interview Readiness Feedback
                  </h1>
                  <p className="text-xs leading-relaxed text-muted max-w-xl">
                    {readinessExplanation.summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopySummary}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy Summary</span>
                  </Button>
                  <Link
                    href={sessionId ? `/grill?session=${encodeURIComponent(sessionId)}` : "/grill"}
                    className={buttonClassName({ variant: "primary", size: "sm" })}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Practice Again</span>
                  </Link>
                </div>
              </div>

              {/* 4 Dimension Progress Cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                {scoreCards.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border bg-subtle/50 p-3.5 space-y-1.5"
                  >
                    <ProgressBar
                      label={item.label}
                      value={item.value}
                      tone={item.tone}
                      showValue
                    />
                    <p className="text-[11px] leading-relaxed text-muted">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Difficulty Level Performance Card */}
      {report.difficultyBreakdown && (
        <Card elevated className="border-[#DCD6CA] bg-surface">
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-[#EAE5DC] pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Difficulty Level Performance
                </h2>
                <p className="text-xs text-muted">
                  How you performed across the three interview difficulty tiers.
                </p>
              </div>
              <span className="font-mono text-xs text-muted">
                {report.difficultyBreakdown.easy.answered +
                  report.difficultyBreakdown.medium.answered +
                  report.difficultyBreakdown.hard.answered}{" "}
                questions answered
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Easy */}
              <div className="rounded-xl border border-info-border bg-info-soft/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="info">EASY · Beginner</Badge>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {report.difficultyBreakdown.easy.answered}/{report.difficultyBreakdown.easy.total} answered
                  </span>
                </div>
                <div>
                  <p className="font-sans text-xs font-semibold text-foreground">Know what you built</p>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Basic purpose, technologies chosen, and core problem solved.
                  </p>
                </div>
                <div className="pt-1 flex items-baseline justify-between border-t border-info-border/50">
                  <span className="text-[11px] text-muted">Average Score:</span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    {report.difficultyBreakdown.easy.answered > 0
                      ? `${report.difficultyBreakdown.easy.averageScore}%`
                      : "Not answered"}
                  </span>
                </div>
              </div>

              {/* Medium */}
              <div className="rounded-xl border border-warning-border bg-warning-soft/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="warning">MEDIUM · Intermediate</Badge>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {report.difficultyBreakdown.medium.answered}/{report.difficultyBreakdown.medium.total} answered
                  </span>
                </div>
                <div>
                  <p className="font-sans text-xs font-semibold text-foreground">Understand how it works</p>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Data flow, API communication, component logic, and error boundaries.
                  </p>
                </div>
                <div className="pt-1 flex items-baseline justify-between border-t border-warning-border/50">
                  <span className="text-[11px] text-muted">Average Score:</span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    {report.difficultyBreakdown.medium.answered > 0
                      ? `${report.difficultyBreakdown.medium.averageScore}%`
                      : "Not answered"}
                  </span>
                </div>
              </div>

              {/* Hard */}
              <div className="rounded-xl border border-error-border bg-error-soft/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="error">HARD · Advanced</Badge>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {report.difficultyBreakdown.hard.answered}/{report.difficultyBreakdown.hard.total} answered
                  </span>
                </div>
                <div>
                  <p className="font-sans text-xs font-semibold text-foreground">Defend your decisions</p>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Concurrency, scalability limits, failure recovery, and trade-offs.
                  </p>
                </div>
                <div className="pt-1 flex items-baseline justify-between border-t border-error-border/50">
                  <span className="text-[11px] text-muted">Average Score:</span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    {report.difficultyBreakdown.hard.answered > 0
                      ? `${report.difficultyBreakdown.hard.averageScore}%`
                      : "Not answered"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs<ReportSectionTab>
        ariaLabel="Navigate feedback sections"
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: "all", label: "All Feedback" },
          { value: "strengths", label: "What You Did Well", count: report.strengths.length },
          { value: "improvements", label: "Needs Improvement", count: report.weaknesses.length },
          { value: "model_answers", label: "Better Answers", count: report.questionResults.length },
          { value: "study_next", label: "What to Study Next", count: report.revisionTopics.length },
        ]}
      />

      {/* 1. What you did well */}
      {showSection("strengths") && (
        <section aria-labelledby="strengths-heading" className="space-y-4">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#386845] uppercase">
            <CheckCircle2 className="h-4 w-4" />
            <h2 id="strengths-heading">What You Did Well</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {report.strengths.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-[#386845]/30 bg-[#386845]/5 p-5 space-y-2"
              >
                <h3 className="text-sm font-bold text-foreground">
                  {s.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted">
                  {s.detail}
                </p>
                {s.evidenceFile && (
                  <p className="font-mono text-[11px] text-[#386845] pt-1">
                    Verified in: {s.evidenceFile}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. What needs improvement */}
      {showSection("improvements") && (
        <section aria-labelledby="weaknesses-heading" className="space-y-4">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#C15C3D] uppercase">
            <AlertCircle className="h-4 w-4" />
            <h2 id="weaknesses-heading">What Needs Improvement</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {report.weaknesses.map((w) => (
              <div
                key={w.id}
                className="rounded-2xl border border-[#C15C3D]/30 bg-[#C15C3D]/5 p-5 space-y-2"
              >
                <h3 className="text-sm font-bold text-foreground">
                  {w.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted">
                  {w.detail}
                </p>
                {w.evidenceFile && (
                  <p className="font-mono text-[11px] text-[#C15C3D] pt-1">
                    Related code: {w.evidenceFile}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Better Answers & Question Breakdown */}
      {showSection("model_answers") && (
        <section aria-labelledby="questions-heading" className="space-y-4">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-foreground uppercase">
            <Lightbulb className="h-4 w-4 text-accent" />
            <h2 id="questions-heading">Better Answers &amp; Question Review</h2>
          </div>

          <QuestionBreakdown
            results={report.questionResults}
            onInspectEvidence={(ev) => setInspectedEvidence(ev)}
          />
        </section>
      )}

      {/* 4. What to study next */}
      {showSection("study_next") && (
        <section aria-labelledby="revision-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#9E7D46] uppercase">
              <BookMarked className="h-4 w-4" />
              <h2 id="revision-heading">What to Study Next</h2>
            </div>
            <span className="font-mono text-xs text-muted">
              {completedRevisionCount} of {report.revisionTopics.length} reviewed
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {report.revisionTopics.map((topic) => {
              const isChecked = Boolean(checkedTopics[topic.id]);
              return (
                <div
                  key={topic.id}
                  className={cn(
                    "rounded-2xl border p-5 space-y-3 transition-colors",
                    isChecked
                      ? "border-border bg-subtle/30 opacity-70"
                      : "border-[#DCD6CA] bg-surface shadow-xs"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            topic.priority === "HIGH"
                              ? "error"
                              : topic.priority === "MEDIUM"
                              ? "warning"
                              : "default"
                          }
                          className="text-[10px]"
                        >
                          {topic.priority} Priority
                        </Badge>
                        <h3 className="text-sm font-bold text-foreground">
                          {topic.topic}
                        </h3>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        {topic.reason}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleRevisionTopic(topic.id)}
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs cursor-pointer",
                        isChecked
                          ? "border-[#386845] bg-[#386845] text-white"
                          : "border-border bg-surface text-muted hover:border-accent"
                      )}
                      aria-label={`Mark ${topic.topic} as reviewed`}
                    >
                      {isChecked && <Check className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Study prompt */}
                  <div className="rounded-xl border border-border bg-subtle/50 p-3 text-xs space-y-1">
                    <p className="font-mono text-[10px] font-bold text-muted uppercase">
                      Suggested Interview Preparation:
                    </p>
                    <p className="text-foreground leading-relaxed">
                      {topic.studyPrompt}
                    </p>
                  </div>

                  {/* Files to review */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                    <span className="font-mono text-[11px] text-muted">
                      Files to inspect:
                    </span>
                    {topic.relatedFiles.map((file) => (
                      <span
                        key={file}
                        className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-accent"
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Modal for inspected code evidence */}
      <Dialog
        open={Boolean(inspectedEvidence)}
        onClose={() => setInspectedEvidence(null)}
        title={inspectedEvidence?.filePath ?? "Code Evidence"}
        description={`Lines ${inspectedEvidence?.startLine} to ${inspectedEvidence?.endLine}`}
      >
        {inspectedEvidence && (
          <div className="space-y-3">
            <pre className="overflow-x-auto rounded-xl border border-border bg-code p-4 font-mono text-xs text-foreground">
              {inspectedEvidence.excerpt}
            </pre>
            {inspectedEvidence.note && (
              <p className="text-xs text-muted leading-relaxed">
                {inspectedEvidence.note}
              </p>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
