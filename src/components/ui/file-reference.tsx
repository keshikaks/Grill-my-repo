import { FileCode2 } from "lucide-react";
import type { EvidenceReference } from "@/lib/contracts/repository";
import { cn } from "@/lib/utils/cn";
import { formatLineRange } from "@/lib/utils/format";

export interface FileReferenceProps {
  filePath?: string;
  startLine?: number;
  endLine?: number;
  reference?: EvidenceReference;
  active?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function FileReference({
  filePath: directPath,
  startLine: directStart,
  endLine: directEnd,
  reference,
  active = false,
  selected = false,
  onClick,
  className,
}: FileReferenceProps) {
  const filePath = reference ? reference.filePath : directPath ?? "unknown";
  const startLine = reference ? reference.startLine : directStart;
  const endLine = reference ? reference.endLine : directEnd;
  const isActive = active || selected;

  const lineLabel = startLine ? formatLineRange(startLine, endLine) : null;
  const baseClass = cn(
    "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs transition-all duration-150",
    isActive
      ? "border-accent bg-accent-soft text-accent"
      : "border-border bg-subtle text-foreground hover:border-border-strong hover:bg-surface",
    onClick && "cursor-pointer",
    className
  );

  const content = (
    <>
      <FileCode2
        className="h-3.5 w-3.5 shrink-0 text-accent"
        aria-hidden="true"
      />
      <span className="truncate">{filePath}</span>
      {lineLabel && (
        <span className="shrink-0 text-[11px] text-muted">:{lineLabel}</span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClass}>
        {content}
      </button>
    );
  }

  return <span className={baseClass}>{content}</span>;
}
