"use client";

import { useEffect, useState } from "react";
import { FileCode2 } from "lucide-react";
import type { EvidenceReference } from "@/lib/contracts/repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { FileReference } from "@/components/ui/file-reference";

interface SourceCodePanelProps {
  references: EvidenceReference[];
}

export function SourceCodePanel({ references }: SourceCodePanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [references]);

  const active = references[selectedIndex] ?? references[0];

  return (
    <Card elevated className="h-full">
      <CardHeader className="border-b border-border pb-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCode2
              className="h-4 w-4 text-accent-text"
              aria-hidden="true"
            />
            <CardTitle className="text-sm">Relevant Source Code</CardTitle>
          </div>
          <span className="font-mono text-[11px] text-muted">
            {references.length} {references.length === 1 ? "file" : "files"} cited
          </span>
        </div>

        {references.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {references.map((ref, idx) => (
              <FileReference
                key={ref.id}
                filePath={ref.filePath}
                startLine={ref.startLine}
                endLine={ref.endLine}
                active={idx === selectedIndex}
                onClick={() => setSelectedIndex(idx)}
              />
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        {active && (
          <>
            <CodeBlock
              code={active.excerpt}
              filePath={active.filePath}
              language={active.language}
              startLine={active.startLine}
              endLine={active.endLine}
              maxHeightClass="max-h-[460px]"
            />
            <p className="font-mono text-[11px] text-muted break-all">
              Content ref: {active.contentReference}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
