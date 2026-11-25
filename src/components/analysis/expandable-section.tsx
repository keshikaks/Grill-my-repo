"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ExpandableSectionProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function ExpandableSection({
  title,
  subtitle,
  badge,
  icon,
  defaultOpen = true,
  children,
  className,
}: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-surface overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-hover/60 cursor-pointer"
      >
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-subtle text-accent-text"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              {badge}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <div id={contentId} className="expandable-grid" data-open={open}>
        <div>
          <div className="border-t border-border px-5 py-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
