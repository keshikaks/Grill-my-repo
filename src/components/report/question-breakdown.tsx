"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb, MessageSquare, Sparkles } from "lucide-react";
import { DIFFICULTY_META } from "@/lib/contracts/grill";
import type { QuestionResult } from "@/lib/contracts/report";
import type { EvidenceReference } from "@/lib/contracts/repository";
import { Badge } from "@/components/ui/badge";
import { FileReference } from "@/components/ui/file-reference";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";

interface QuestionBreakdownProps {
  results: QuestionResult[];
  onInspectEvidence: (evidence: EvidenceReference) => void;
}

export function QuestionBreakdown({
  results,
  onInspectEvidence,
}: QuestionBreakdownProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    [results[0]?.question.id ?? ""]: true,
  });

  function toggleQuestion(id: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-4">
      {results.map((item) => {
        const isOpen = Boolean(expandedIds[item.question.id]);
        const diff = DIFFICULTY_META[item.question.difficulty] || DIFFICULTY_META.EASY;
        const average = Math.round(
          (item.evaluation.correctness +
            item.evaluation.codeUnderstanding +
            item.evaluation.clarity +
            item.evaluation.reasoning) /
            4
        );

        return (
          <article
            key={item.question.id}
            className="overflow-hidden rounded-2xl border border-[#DCD6CA] bg-surface shadow-xs"
          >
            <button
              type="button"
              onClick={() => toggleQuestion(item.question.id)}
              aria-expanded={isOpen}
              className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-subtle/40 cursor-pointer"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-accent">
                    Question {item.question.order}
                  </span>
                  <Badge variant={diff.tone}>{diff.label}</Badge>
                  <Badge variant="outline">{item.question.category}</Badge>
                </div>
                <p className="text-base font-bold leading-snug text-foreground">
                  &ldquo;{item.question.text}&rdquo;
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <span className="font-mono text-base font-bold text-foreground">
                    {average}
                  </span>
                  <span className="font-mono text-xs text-muted">/100</span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </div>
            </button>

            <div className="expandable-grid" data-open={isOpen}>
              <div>
                <div className="space-y-5 border-t border-border px-6 py-5">
                  {/* Four rubric metrics */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <ProgressBar
                      label="Technical Correctness"
                      value={item.evaluation.correctness}
                      showValue
                      size="sm"
                      tone="accent"
                    />
                    <ProgressBar
                      label="Code Understanding"
                      value={item.evaluation.codeUnderstanding}
                      showValue
                      size="sm"
                      tone="success"
                    />
                    <ProgressBar
                      label="Explanation Clarity"
                      value={item.evaluation.clarity}
                      showValue
                      size="sm"
                      tone="accent"
                    />
                    <ProgressBar
                      label="Reasoning & Trade-offs"
                      value={item.evaluation.reasoning}
                      showValue
                      size="sm"
                      tone="warning"
                    />
                  </div>

                  {/* Your Answer */}
                  <div className="rounded-xl border border-border bg-subtle/50 p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-muted uppercase">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Your Answer</span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      {item.answer.answerText}
                    </p>
                  </div>

                  {/* Model Answer (Better Answer) */}
                  <div className="rounded-xl border border-[#DCD6CA] bg-[#FAF8F5] p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-accent uppercase">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Better Answer (Model Exemplar)</span>
                    </div>
                    <p className="text-xs text-[#5C5852] italic leading-relaxed whitespace-pre-wrap">
                      {item.evaluation.improvedExplanation
                        ? `"${item.evaluation.improvedExplanation}"`
                        : `"In our application, operations are wrapped in safe boundaries. When an error is thrown, the transaction is rolled back, the error is logged with context, and the client receives a structured error message."`}
                    </p>
                  </div>

                  {/* Feedback & Improvements */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-subtle/40 p-4 space-y-1.5">
                      <p className="font-mono text-[11px] font-bold text-foreground uppercase">
                        Coach Evaluation
                      </p>
                      <p className="text-xs leading-relaxed text-muted">
                        {item.evaluation.feedback}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-subtle/40 p-4 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-foreground uppercase">
                        <Lightbulb className="h-3.5 w-3.5 text-[#9E7D46]" />
                        <span>Recommended Improvements</span>
                      </div>
                      <ul className="space-y-1.5 text-xs leading-relaxed text-muted">
                        {item.evaluation.suggestedImprovements.map((tip) => (
                          <li key={tip} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Cited Evidence */}
                  {item.evidenceReferences.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      <span className="font-mono text-[11px] text-muted">
                        Cited code evidence (click to view lines):
                      </span>
                      {item.evidenceReferences.map((ev) => (
                        <FileReference
                          key={ev.id}
                          reference={ev}
                          onClick={() => onInspectEvidence(ev)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
