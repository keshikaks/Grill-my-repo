import { cn } from "@/lib/utils/cn";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  tone?: "accent" | "success" | "warning" | "error";
  size?: "sm" | "md";
  className?: string;
}

const toneClasses: Record<NonNullable<ProgressBarProps["tone"]>, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  tone = "accent",
  size = "md",
  className,
}: ProgressBarProps) {
  const safeMax = max <= 0 ? 100 : max;
  const percentage = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-2 text-xs">
          {label ? <span className="font-medium text-foreground">{label}</span> : <span />}
          {showValue && (
            <span className="font-mono text-muted">{percentage}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className={cn(
          "w-full overflow-hidden rounded-full bg-subtle border border-border",
          size === "sm" ? "h-1.5" : "h-2.5"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            toneClasses[tone]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
