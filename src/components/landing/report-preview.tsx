import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import type { FinalReport } from "@/lib/contracts/report";
import { formatScoreGrade } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";

interface ReportPreviewProps {
  report: FinalReport;
}

export function ReportPreview({ report }: ReportPreviewProps) {
  const gradeInfo = formatScoreGrade(report.overallScore);
  const firstStrength = report.strengths[0];
  const firstWeakness = report.weaknesses[0];

  const metrics = [
    {
      label: "Technical Correctness",
      value: report.categoryScores.correctness,
      tone: "accent" as const,
    },
    {
      label: "Code Understanding",
      value: report.categoryScores.codeUnderstanding,
      tone: "success" as const,
    },
    {
      label: "Explanation Clarity",
      value: report.categoryScores.clarity,
      tone: "accent" as const,
    },
    {
      label: "Reasoning & Trade-offs",
      value: report.categoryScores.reasoning,
      tone: "warning" as const,
    },
  ];

  return (
    <section
      aria-labelledby="report-preview-heading"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="grid items-center gap-10 lg:grid-cols-12">
        <div className="order-2 lg:order-1 lg:col-span-7">
          <Card elevated>
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                    Sample Defence Report · acme-eng/pulsequeue
                  </p>
                  <CardTitle className="mt-1 text-lg">
                    Overall Readiness Score
                  </CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono text-2xl font-bold text-foreground">
                      {report.overallScore}
                      <span className="text-sm font-normal text-muted">/100</span>
                    </div>
                    <Badge variant={gradeInfo.tone}>{gradeInfo.label}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                {metrics.map((metric) => (
                  <ProgressBar
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    tone={metric.tone}
                    showValue
                  />
                ))}
              </div>

              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                {firstStrength && (
                  <div className="rounded-lg border border-success-border bg-success-soft p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-success-text">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Strong Area</span>
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      {firstStrength.title}
                    </p>
                  </div>
                )}

                {firstWeakness && (
                  <div className="rounded-lg border border-warning-border bg-warning-soft p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-warning-text">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Priority Gap</span>
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      {firstWeakness.title}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="order-1 space-y-4 lg:order-2 lg:col-span-5">
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs uppercase tracking-widest text-accent-text">
              Final Report Card
            </p>
            <Badge variant="accent">Rubric Preview</Badge>
          </div>
          <h2
            id="report-preview-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Know exactly what to revise before your interview
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            Every completed defence session produces a question-by-question
            breakdown, four-axis rubric scoring, cited source evidence, and a
            prioritized revision checklist.
          </p>
          <div className="pt-2">
            <Link
              href="/report"
              className={buttonClassName({ variant: "secondary", size: "md" })}
            >
              <span>Inspect Sample Report Card</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
