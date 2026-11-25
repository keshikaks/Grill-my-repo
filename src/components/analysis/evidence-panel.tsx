"use client";

import { BookOpen, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export interface ActiveEvidenceView {
  title: string;
  filePath: string;
  language: string;
  startLine: number;
  endLine?: number;
  contentReference: string;
  code: string;
  note?: string;
  sourceKind: "Important File" | "Claim Evidence";
}

interface EvidencePanelProps {
  evidence: ActiveEvidenceView | null;
}

export function EvidencePanel({ evidence }: EvidencePanelProps) {
  return (
    <Card elevated className="lg:sticky lg:top-20">
      <CardHeader className="border-b border-border pb-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent-text" aria-hidden="true" />
            <CardTitle className="text-sm">Evidence Display Panel</CardTitle>
          </div>
          {evidence && (
            <Badge variant="accent">{evidence.sourceKind}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {!evidence ? (
          <EmptyState
            title="Select a file or claim citation"
            description="Click any important file or evidence badge from Claims vs Reality to inspect the cited source lines."
          />
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">
                {evidence.title}
              </p>
              <p className="font-mono text-[11px] text-muted break-all">
                Ref: {evidence.contentReference}
              </p>
            </div>

            <CodeBlock
              code={evidence.code}
              filePath={evidence.filePath}
              language={evidence.language}
              startLine={evidence.startLine}
              endLine={evidence.endLine}
              maxHeightClass="max-h-[400px]"
            />

            {evidence.note && (
              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-subtle p-3 text-xs text-muted">
                <Info
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text"
                  aria-hidden="true"
                />
                <p className="leading-relaxed">{evidence.note}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
