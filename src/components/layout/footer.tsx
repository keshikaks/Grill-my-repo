import Link from "next/link";
import { Terminal } from "lucide-react";
import { siteConfig } from "@/lib/config/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-subtle/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-12">
          {/* Brand & Purpose */}
          <div className="space-y-3 md:col-span-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-surface text-accent">
                <Terminal className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-foreground">
                {siteConfig.name}
              </span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-muted">
              {siteConfig.description}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 md:col-span-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Navigation
            </h2>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/#how-it-works"
                  className="text-muted transition-colors hover:text-foreground"
                >
                  How it works
                </Link>
              </li>
            </ul>
          </div>

          {/* Core Philosophy */}
          <div className="space-y-3 md:col-span-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Core Philosophy
            </h2>
            <ul className="space-y-2 text-xs text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                <span>Explain first in plain English.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                <span>One viva question at a time.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                <span>Actionable coach feedback.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. {siteConfig.tagline}
          </p>
          <p>
            Built for engineering students, fresh graduates, and project vivas.
          </p>
        </div>
      </div>
    </footer>
  );
}
