"use client";

import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileCode2,
  Lightbulb,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import type {
  AnswerEvaluation,
  FollowUpItem,
  GrillAnswer,
} from "@/lib/contracts/grill";
import type { EvidenceReference } from "@/lib/contracts/repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";

export interface FeedbackPanelProps {
  submittedAnswer: GrillAnswer | null;
  evaluation?: AnswerEvaluation | null;
  expectedConcepts: string[];
  evidenceReferences?: EvidenceReference[];
  showRubric: boolean;
  followUps?: FollowUpItem[];
  onAskFollowUp?: (query: string) => Promise<void>;
  isSubmittingFollowUp?: boolean;
}

const RUBRIC_LABELS: Record<number, { label: string; tone: "error" | "warning" | "accent" | "success" }> = {
  1: { label: "Needs Practice", tone: "error" },
  2: { label: "Basic Understanding", tone: "warning" },
  3: { label: "Partially Correct", tone: "warning" },
  4: { label: "Strong Answer", tone: "accent" },
  5: { label: "Interview Ready", tone: "success" },
};

export function FeedbackPanel({
  submittedAnswer,
  evaluation,
  evidenceReferences = [],
  followUps = [],
  onAskFollowUp,
  isSubmittingFollowUp = false,
}: FeedbackPanelProps) {
  const [followUpQuery, setFollowUpQuery] = useState("");

  async function handleFollowUpSubmit(e: FormEvent) {
    e.preventDefault();
    if (!followUpQuery.trim() || !onAskFollowUp) return;
    const q = followUpQuery.trim();
    setFollowUpQuery("");
    await onAskFollowUp(q);
  }

  const scoreInfo = evaluation?.rubricScore
    ? RUBRIC_LABELS[evaluation.rubricScore] || { label: `${evaluation.rubricScore} / 5`, tone: "accent" }
    : null;

  return (
    <Card elevated className="border-[#DCD6CA] bg-surface">
      <CardHeader className="border-b border-[#EAE5DC] pb-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
            <CardTitle className="text-sm font-bold text-foreground">
              Educational Feedback
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {scoreInfo && (
              <Badge variant={scoreInfo.tone}>{scoreInfo.label}</Badge>
            )}
            <Badge variant={evaluation ? "success" : submittedAnswer ? "default" : "outline"}>
              {evaluation ? "Evaluated" : submittedAnswer ? "Draft Saved" : "Awaiting Answer"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {!submittedAnswer ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-subtle/50 p-4 text-xs text-muted">
            <Clock
              className="mt-0.5 h-4 w-4 shrink-0 text-accent"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Answer the question to see educational feedback
              </p>
              <p className="leading-relaxed">
                Take your time to write your explanation. Once submitted, we will break down what you got right, what is missing, how to improve, and show an example model answer grounded in your repository.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Teacher Note */}
            {evaluation?.feedback && (
              <div className="rounded-xl border border-border bg-subtle/40 p-4 space-y-1 text-xs">
                <p className="font-mono text-[11px] font-bold text-accent uppercase tracking-wider">
                  Mentor Summary
                </p>
                <p className="leading-relaxed text-foreground">
                  {evaluation.feedback}
                </p>
              </div>
            )}

            {/* 1. What you got right */}
            <div className="rounded-xl border border-[#386845]/30 bg-[#386845]/5 p-4 space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#386845]">
                <CheckCircle2 className="h-4 w-4" />
                <span>WHAT YOU GOT RIGHT</span>
              </div>
              {evaluation?.correctPoints && evaluation.correctPoints.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-foreground">
                  {evaluation.correctPoints.map((pt) => (
                    <li key={pt} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#386845]" />
                      <span className="leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted leading-relaxed">
                  You attempted to explain the high-level concept clearly and identified the primary component involved.
                </p>
              )}
            </div>

            {/* 2. What is missing */}
            <div className="rounded-xl border border-[#C15C3D]/30 bg-[#C15C3D]/5 p-4 space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#C15C3D]">
                <AlertCircle className="h-4 w-4" />
                <span>WHAT IS MISSING</span>
              </div>
              {evaluation?.missingConcepts && evaluation.missingConcepts.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-foreground">
                  {evaluation.missingConcepts.map((mc) => (
                    <li key={mc} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C15C3D]" />
                      <span className="leading-relaxed">{mc}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted leading-relaxed">
                  Consider addressing edge cases such as timeout errors, network disconnects, or unexpected input.
                </p>
              )}

              {evaluation?.technicalInaccuracies && evaluation.technicalInaccuracies.length > 0 && (
                <div className="pt-2 border-t border-[#C15C3D]/20 space-y-1">
                  <p className="font-mono text-[10px] font-bold text-[#C15C3D] uppercase">
                    Points to clarify:
                  </p>
                  <ul className="space-y-1 text-xs text-foreground">
                    {evaluation.technicalInaccuracies.map((ti) => (
                      <li key={ti} className="flex items-start gap-1.5">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#C15C3D]" />
                        <span>{ti}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 3. How to improve */}
            <div className="rounded-xl border border-border bg-subtle/50 p-4 space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#9E7D46]">
                <Lightbulb className="h-4 w-4" />
                <span>HOW TO IMPROVE</span>
              </div>
              {evaluation?.suggestedImprovements && evaluation.suggestedImprovements.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-muted">
                  {evaluation.suggestedImprovements.map((tip) => (
                    <li key={tip} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9E7D46]" />
                      <span className="leading-relaxed text-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">
                  Practice articulating where each operation happens and what failure modes could arise.
                </p>
              )}
            </div>

            {/* 4. Example answer */}
            <div className="rounded-xl border border-[#DCD6CA] bg-[#FAF8F5] p-4 space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#181A1D]">
                <BookOpen className="h-4 w-4 text-accent" />
                <span>EXAMPLE ANSWER (MODEL ANSWER)</span>
              </div>
              <p className="text-xs text-[#5C5852] italic leading-relaxed whitespace-pre-wrap">
                {evaluation?.improvedExplanation
                  ? `"${evaluation.improvedExplanation}"`
                  : `"In our application, when an error occurs, the operation is wrapped in safe error boundaries. The failure is caught, logged with contextual metadata, and an appropriate client response is returned without crashing the service."`}
              </p>
            </div>

            {/* 5. Relevant code */}
            {evidenceReferences.length > 0 && (
              <div className="rounded-xl border border-border bg-subtle/40 p-4 space-y-2">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-accent">
                  <FileCode2 className="h-4 w-4" />
                  <span>RELEVANT CODE</span>
                </div>
                <div className="space-y-2 text-xs">
                  {evidenceReferences.map((ref) => (
                    <div
                      key={ref.id}
                      className="rounded-lg border border-border bg-surface p-2.5 space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px] text-foreground">
                        <span className="font-semibold truncate max-w-[240px]">{ref.filePath}</span>
                        <span className="text-muted shrink-0">Lines {ref.startLine}–{ref.endLine}</span>
                      </div>
                      {ref.note && (
                        <p className="text-[11px] text-muted">{ref.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dimension Breakdown */}
            {evaluation && (
              <div className="space-y-3 rounded-xl border border-border bg-subtle/40 p-4">
                <p className="text-xs font-bold text-foreground">
                  Readiness Dimensions
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ProgressBar
                    label="Technical Correctness"
                    value={evaluation.correctness}
                    showValue
                    size="sm"
                    tone="accent"
                  />
                  <ProgressBar
                    label="Code Understanding"
                    value={evaluation.codeUnderstanding}
                    showValue
                    size="sm"
                    tone="success"
                  />
                  <ProgressBar
                    label="Clarity"
                    value={evaluation.clarity}
                    showValue
                    size="sm"
                    tone="accent"
                  />
                  <ProgressBar
                    label="Reasoning"
                    value={evaluation.reasoning}
                    showValue
                    size="sm"
                    tone="warning"
                  />
                </div>
              </div>
            )}

            {/* Live Interactive Follow-up Viva Dialogue */}
            {onAskFollowUp && (
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-accent">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Ask Mentor Follow-Up (Viva Dialogue)</span>
                </div>

                {followUps.length > 0 && (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {followUps.map((fu) => (
                      <div key={fu.id} className="space-y-2 text-xs">
                        <div className="rounded-lg bg-surface p-2.5 border border-border text-foreground">
                          <p className="font-semibold text-accent mb-0.5 text-[11px]">You asked:</p>
                          <p className="leading-relaxed">&ldquo;{fu.candidateQuery}&rdquo;</p>
                        </div>
                        <div className="rounded-lg bg-accent-soft p-2.5 border border-accent/20 text-foreground">
                          <p className="font-semibold text-accent mb-0.5 text-[11px]">Mentor replied:</p>
                          <p className="leading-relaxed">{fu.response}</p>
                          {fu.suggestedFollowUp && (
                            <p className="mt-2 text-[11px] font-mono text-muted border-t border-accent/20 pt-1.5">
                              Next challenge: {fu.suggestedFollowUp}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleFollowUpSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={followUpQuery}
                    onChange={(e) => setFollowUpQuery(e.target.value)}
                    placeholder="Ask a clarifying question or defend an alternative..."
                    disabled={isSubmittingFollowUp}
                    className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    loading={isSubmittingFollowUp}
                    disabled={!followUpQuery.trim()}
                    className="shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
