import Link from "next/link";
import { ArrowRight, MessageSquareText } from "lucide-react";
import {
  DIFFICULTY_META,
  type GrillQuestion,
} from "@/lib/contracts/grill";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { FileReference } from "@/components/ui/file-reference";
import { ProgressBar } from "@/components/ui/progress";

interface GrillPreviewProps {
  question: GrillQuestion;
  totalQuestions: number;
}

export function GrillPreview({ question, totalQuestions }: GrillPreviewProps) {
  const difficultyMeta = DIFFICULTY_META[question.difficulty];
  const primaryEvidence = question.evidenceReferences[0];

  return (
    <section
      aria-labelledby="grill-preview-heading"
      className="border-y border-border bg-subtle/40"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs uppercase tracking-widest text-accent-text">
                The Grill Room
              </p>
              <Badge variant="accent">Sample Session</Badge>
            </div>
            <h2
              id="grill-preview-heading"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Defend your architecture with your code on screen
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              No trivia questions. The Grill Room pins the exact file and line
              range under scrutiny so you can practice structured technical
              reasoning under realistic interview pressure.
            </p>

            <ul className="space-y-2.5 pt-1 text-xs text-muted">
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                <span>Difficulty progression from foundational design to failure-mode deep dives</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                <span>Multi-file source references pinned alongside the answer editor</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                <span>Rubric checklist showing expected engineering concepts</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href="/grill"
                className={buttonClassName({ variant: "primary", size: "md" })}
              >
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                <span>Enter Grill Room Preview</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <Card elevated className="overflow-hidden">
              <CardHeader className="border-b border-border bg-subtle/60 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      Question {question.order} of {totalQuestions}
                    </span>
                    <Badge variant={difficultyMeta.tone}>
                      {difficultyMeta.label}
                    </Badge>
                    <Badge variant="default">{question.category}</Badge>
                  </div>
                  <span className="font-mono text-[11px] text-muted">
                    acme-eng/pulsequeue
                  </span>
                </div>
                <ProgressBar
                  value={(question.order / totalQuestions) * 100}
                  size="sm"
                  className="pt-2"
                />
              </CardHeader>

              <CardContent className="space-y-4 pt-5">
                <CardTitle className="text-sm leading-relaxed font-medium text-foreground">
                  {question.text}
                </CardTitle>

                {primaryEvidence && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                        Cited Evidence
                      </span>
                      <FileReference
                        filePath={primaryEvidence.filePath}
                        startLine={primaryEvidence.startLine}
                        endLine={primaryEvidence.endLine}
                      />
                    </div>
                    <CodeBlock
                      code={primaryEvidence.excerpt}
                      filePath={primaryEvidence.filePath}
                      language={primaryEvidence.language}
                      startLine={primaryEvidence.startLine}
                      endLine={primaryEvidence.endLine}
                      maxHeightClass="max-h-[220px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
