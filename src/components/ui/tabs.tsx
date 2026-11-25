"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface TabsProps<T extends string = string> {
  options: readonly TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export function Tabs<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-subtle p-1",
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer",
              isActive
                ? "bg-surface text-foreground shadow-sm border border-border-strong"
                : "text-muted border border-transparent hover:text-foreground hover:bg-surface/50"
            )}
          >
            {option.icon}
            <span>{option.label}</span>
            {typeof option.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 font-mono text-[11px]",
                  isActive
                    ? "bg-accent-soft text-accent-text"
                    : "bg-surface text-muted"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
