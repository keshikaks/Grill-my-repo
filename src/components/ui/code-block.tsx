"use client";

import { useState } from "react";
import { Check, Copy, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatLineRange } from "@/lib/utils/format";

export interface CodeBlockProps {
  code: string;
  filePath?: string;
  language?: string;
  startLine?: number;
  endLine?: number;
  highlightLines?: number[];
  className?: string;
  maxHeightClass?: string;
}

export function CodeBlock({
  code,
  filePath,
  language,
  startLine = 1,
  endLine,
  highlightLines = [],
  className,
  maxHeightClass = "max-h-[420px]",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");
  const highlightSet = new Set(highlightLines);
  const resolvedEndLine = endLine ?? startLine + lines.length - 1;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-code",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-subtle/80 px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2
            className="h-3.5 w-3.5 shrink-0 text-accent-text"
            aria-hidden="true"
          />
          {filePath ? (
            <span className="truncate font-mono text-xs text-foreground">
              {filePath}
            </span>
          ) : (
            <span className="font-mono text-xs text-muted">
              {language ?? "source"}
            </span>
          )}
          <span className="hidden rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted sm:inline-block">
            {formatLineRange(startLine, resolvedEndLine)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {language && (
            <span className="hidden font-mono text-[11px] uppercase tracking-wider text-muted sm:inline">
              {language}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy code snippet"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-success-text" aria-hidden="true" />
                <span className="text-success-text">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className={cn("overflow-auto", maxHeightClass)}>
        <pre className="py-3 font-mono text-xs leading-6 text-foreground">
          <code>
            {lines.map((line, index) => {
              const lineNumber = startLine + index;
              const isHighlighted = highlightSet.has(lineNumber);
              return (
                <div
                  key={lineNumber}
                  className={cn(
                    "flex min-w-max px-3.5",
                    isHighlighted &&
                      "bg-accent-soft border-l-2 border-accent pl-3"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="mr-4 inline-block w-8 shrink-0 select-none text-right text-muted/60"
                  >
                    {lineNumber}
                  </span>
                  <span className="whitespace-pre">{line || " "}</span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}
