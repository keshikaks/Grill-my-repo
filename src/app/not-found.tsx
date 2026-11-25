import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center animate-page-enter">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-accent-text">
        <Compass className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-accent-text">
        404 · Route Not Found
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        This path does not exist in the repository
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Return to the landing page or jump directly into the Phase 1 interactive
        repository analysis preview.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={buttonClassName({ variant: "primary" })}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Overview
        </Link>
        <Link
          href="/analysis"
          className={buttonClassName({ variant: "secondary" })}
        >
          Open Analysis Preview
        </Link>
      </div>
    </main>
  );
}
