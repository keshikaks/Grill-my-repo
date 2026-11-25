"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { productFlowSteps } from "@/lib/config/navigation";
import { cn } from "@/lib/utils/cn";

function ProductFlowBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  return (
    <div className="border-b border-border bg-subtle/50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <nav aria-label="Defence workflow steps" className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {productFlowSteps.map((item, idx) => {
            const isActive = pathname.startsWith(item.href);
            const targetHref = sessionId
              ? `${item.href}?session=${encodeURIComponent(sessionId)}`
              : item.href;

            return (
              <div key={item.href} className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href={targetHref}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-surface text-foreground border border-accent/40 shadow-sm"
                      : "text-muted border border-transparent hover:bg-surface/60 hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full font-mono text-[10px]",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "bg-surface text-muted border border-border"
                    )}
                  >
                    {item.step}
                  </span>
                  <span>{item.label}</span>
                </Link>
                {idx < productFlowSteps.length - 1 && (
                  <ChevronRight
                    className="h-3.5 w-3.5 text-muted/60"
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </nav>

        <span className="hidden font-mono text-[11px] text-muted lg:inline">
          {sessionId ? `Session: ${sessionId.slice(0, 16)}...` : "Sample repo: acme-eng/pulsequeue"}
        </span>
      </div>
    </div>
  );
}

export function ProductFlowBar() {
  return (
    <Suspense
      fallback={
        <div className="h-10 border-b border-border bg-subtle/50" />
      }
    >
      <ProductFlowBarInner />
    </Suspense>
  );
}
