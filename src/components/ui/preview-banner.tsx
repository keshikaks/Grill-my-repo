import { FlaskConical } from "lucide-react";
import { Badge } from "./badge";
import { cn } from "@/lib/utils/cn";

export interface PreviewBannerProps {
  title?: string;
  description: string;
  requestedRepo?: string | null;
  className?: string;
}

export function PreviewBanner({
  title = "Design Preview Mode",
  description,
  requestedRepo,
  className,
}: PreviewBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <FlaskConical
          className="mt-0.5 h-4 w-4 shrink-0 text-accent-text"
          aria-hidden="true"
        />
        <div className="space-y-0.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{title}</span>
            <Badge variant="accent">Sample Walkthrough</Badge>
            {requestedRepo && (
              <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-foreground border border-border">
                Queued target: {requestedRepo}
              </span>
            )}
          </div>
          <p className="text-muted leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
