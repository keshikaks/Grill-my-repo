"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, RotateCcw } from "lucide-react";
import type { AnalysisStage } from "@/lib/contracts/analysis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { cn } from "@/lib/utils/cn";

interface AnalysisProgressProps {
  stages: AnalysisStage[];
  onPreviewLoadingChange?: (isLoading: boolean) => void;
}

export function AnalysisProgress({
  stages,
  onPreviewLoadingChange,
}: AnalysisProgressProps) {
  const [completedCount, setCompletedCount] = useState(stages.length);
  const [isReplaying, setIsReplaying] = useState(false);

  useEffect(() => {
    if (!isReplaying) return;

    if (completedCount >= stages.length) {
      setIsReplaying(false);
      onPreviewLoadingChange?.(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setCompletedCount((prev) => prev + 1);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [isReplaying, completedCount, stages.length, onPreviewLoadingChange]);

  function handleReplay() {
    setCompletedCount(0);
    setIsReplaying(true);
    onPreviewLoadingChange?.(true);
  }

  const percent = Math.round((completedCount / Math.max(1, stages.length)) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <CardTitle className="text-sm">Analysis Pipeline Status</CardTitle>
            <StatusIndicator
              label={isReplaying ? "Simulating Pipeline" : "Preview Ready"}
              tone={isReplaying ? "accent" : "success"}
              pulse={isReplaying}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReplay}
            disabled={isReplaying}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isReplaying ? "Running..." : "Replay Progress"}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ProgressBar
          value={percent}
          label={`${completedCount} of ${stages.length} inspection stages completed`}
          showValue
          tone={isReplaying ? "accent" : "success"}
        />

        <ol className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage, index) => {
            const isDone = index < completedCount;
            const isActive = isReplaying && index === completedCount;

            return (
              <li
                key={stage.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  isDone
                    ? "border-border bg-subtle/60"
                    : isActive
                      ? "border-accent/50 bg-accent-soft"
                      : "border-border/70 bg-subtle/30 opacity-70"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    {isDone ? (
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0 text-success-text"
                        aria-hidden="true"
                      />
                    ) : isActive ? (
                      <Loader2
                        className="h-3.5 w-3.5 shrink-0 animate-spin text-accent-text"
                        aria-hidden="true"
                      />
                    ) : (
                      <Clock
                        className="h-3.5 w-3.5 shrink-0 text-muted"
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate">{stage.label}</span>
                  </div>
                  {stage.durationMs && isDone && (
                    <span className="font-mono text-[10px] text-muted">
                      {stage.durationMs}ms
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  {stage.detail}
                </p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
