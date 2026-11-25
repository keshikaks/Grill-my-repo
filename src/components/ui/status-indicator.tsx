import { cn } from "@/lib/utils/cn";

export type StatusTone = "success" | "warning" | "error" | "info" | "accent" | "neutral";

export interface StatusIndicatorProps {
  label: string;
  tone?: StatusTone;
  pulse?: boolean;
  className?: string;
}

const dotColors: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
  accent: "bg-accent",
  neutral: "bg-muted",
};

const pillColors: Record<StatusTone, string> = {
  success: "bg-success-soft text-success-text border-success-border",
  warning: "bg-warning-soft text-warning-text border-warning-border",
  error: "bg-error-soft text-error-text border-error-border",
  info: "bg-info-soft text-info-text border-info-border",
  accent: "bg-accent-soft text-accent-text border-accent/30",
  neutral: "bg-subtle text-muted border-border",
};

export function StatusIndicator({
  label,
  tone = "neutral",
  pulse = false,
  className,
}: StatusIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        pillColors[tone],
        className
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-70",
              dotColors[tone]
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", dotColors[tone])} />
      </span>
      <span>{label}</span>
    </span>
  );
}
