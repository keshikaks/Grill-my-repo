"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Scale,
  Search,
} from "lucide-react";
import type { ClaimStatus, ClaimVerification } from "@/lib/contracts/claims";
import type { EvidenceReference } from "@/lib/contracts/repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileReference } from "@/components/ui/file-reference";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";

type ClaimFilter = "ALL" | ClaimStatus;

interface ClaimsRealityPanelProps {
  claims: ClaimVerification[];
  activeEvidenceId: string | null;
  onSelectEvidence: (claim: ClaimVerification, evidence: EvidenceReference) => void;
}

// Student-friendly label mappings
const STUDENT_STATUS_META: Record<
  ClaimStatus,
  {
    title: string;
    badgeLabel: string;
    tone: "success" | "warning" | "error" | "info";
    description: string;
    advice: string;
  }
> = {
  SUPPORTED: {
    title: "Verified in Code",
    badgeLabel: "Verified in Code",
    tone: "success",
    description: "Direct implementation evidence found in your inspected code files.",
    advice: "You can confidently cite your source implementation when asked about this claim.",
  },
  PARTIALLY_SUPPORTED: {
    title: "Partially Implemented",
    badgeLabel: "Partially Implemented",
    tone: "warning",
    description: "The core logic exists, but edge-case handling or failure safeguards are incomplete.",
    advice: "Be honest in your interview: explain the current mechanism, but acknowledge the missing edge cases.",
  },
  NOT_FOUND_IN_INSPECTED_FILES: {
    title: "Not Found in Code",
    badgeLabel: "Not Found in Code",
    tone: "error",
    description: "Documented in your README, but no matching implementation was located in inspected source files.",
    advice: "Interviewers may check your repo. Either implement this feature or clarify in your README that it is planned.",
  },
  NOT_STATICALLY_VERIFIABLE: {
    title: "Requires Live Testing",
    badgeLabel: "Requires Live Testing",
    tone: "info",
    description: "Runtime performance claims (e.g., latency, uptime) that require cluster load testing to prove.",
    advice: "Never present benchmark figures as verified facts unless you have real load-testing data to show.",
  },
};

export function ClaimsRealityPanel({
  claims,
  activeEvidenceId,
  onSelectEvidence,
}: ClaimsRealityPanelProps) {
  const [statusFilter, setStatusFilter] = useState<ClaimFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const counts = useMemo(() => {
    const map: Record<ClaimStatus, number> = {
      SUPPORTED: 0,
      PARTIALLY_SUPPORTED: 0,
      NOT_FOUND_IN_INSPECTED_FILES: 0,
      NOT_STATICALLY_VERIFIABLE: 0,
    };
    for (const claim of claims) {
      map[claim.status] += 1;
    }
    return map;
  }, [claims]);

  const filteredClaims = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return claims.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      if (!normalized) return true;
      return (
        item.claim.toLowerCase().includes(normalized) ||
        item.explanation.toLowerCase().includes(normalized) ||
        item.sourceSection.toLowerCase().includes(normalized)
      );
    });
  }, [claims, statusFilter, searchQuery]);

  return (
    <section
      aria-labelledby="claims-reality-heading"
      className="rounded-2xl border border-[#DCD6CA] bg-surface p-6 shadow-xs space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#EAE5DC] pb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C15C3D]/10 text-accent"
            aria-hidden="true"
          >
            <Scale className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="claims-reality-heading"
                className="text-base font-bold text-foreground"
              >
                README vs Code Check
              </h2>
              <Badge variant="default">{claims.length} claims audited</Badge>
            </div>
            <p className="text-xs text-muted">
              We compared your README promises against your code so you aren&apos;t caught off guard in an interview.
            </p>
          </div>
        </div>
      </div>

      {/* Filter tabs + Search */}
      <div className="flex flex-col gap-3">
        <Tabs<ClaimFilter>
          ariaLabel="Filter claims by verification status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "ALL", label: "All", count: claims.length },
            {
              value: "SUPPORTED",
              label: "Verified",
              count: counts.SUPPORTED,
            },
            {
              value: "PARTIALLY_SUPPORTED",
              label: "Partial",
              count: counts.PARTIALLY_SUPPORTED,
            },
            {
              value: "NOT_FOUND_IN_INSPECTED_FILES",
              label: "Not Found",
              count: counts.NOT_FOUND_IN_INSPECTED_FILES,
            },
            {
              value: "NOT_STATICALLY_VERIFIABLE",
              label: "Live Test Required",
              count: counts.NOT_STATICALLY_VERIFIABLE,
            },
          ]}
        />

        <Input
          id="claims-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search claims by keyword, file, or README heading..."
          aria-label="Filter claims by keyword"
          leadingIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {/* Claims list */}
      {filteredClaims.length === 0 ? (
        <EmptyState
          title="No claims match your filter"
          description="Try switching back to All or clearing your search keywords."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStatusFilter("ALL");
                setSearchQuery("");
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((item) => {
            const meta = STUDENT_STATUS_META[item.status];
            return (
              <article
                key={item.id}
                className="rounded-xl border border-border bg-subtle/40 p-5 space-y-3.5 transition-colors hover:border-border-strong"
              >
                {/* Header: Status and README Section */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={meta.tone} className="gap-1.5 font-medium">
                    {meta.tone === "success" && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {meta.tone === "warning" && <AlertCircle className="h-3.5 w-3.5" />}
                    {meta.tone === "error" && <AlertCircle className="h-3.5 w-3.5" />}
                    {meta.tone === "info" && <HelpCircle className="h-3.5 w-3.5" />}
                    <span>{meta.badgeLabel}</span>
                  </Badge>
                  <span className="font-mono text-[11px] text-muted">
                    README Section: {item.sourceSection}
                  </span>
                </div>

                {/* 1. What your README says */}
                <div className="space-y-1">
                  <p className="font-mono text-[11px] font-bold text-muted uppercase">
                    What your README says:
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    &ldquo;{item.claim}&rdquo;
                  </p>
                </div>

                {/* 2. What we found in your code */}
                <div className="space-y-1 rounded-lg border border-border bg-surface p-3 text-xs">
                  <p className="font-mono text-[11px] font-bold text-foreground">
                    What we found in your code:
                  </p>
                  <p className="leading-relaxed text-muted">
                    {item.explanation}
                  </p>
                </div>

                {/* 3. What might be missing or interview advice */}
                <div className="rounded-lg border border-accent/20 bg-accent-soft p-3 text-xs space-y-1">
                  <p className="font-mono text-[11px] font-bold text-accent">
                    Viva Coaching Tip:
                  </p>
                  <p className="leading-relaxed text-foreground">
                    {meta.advice}
                  </p>
                </div>

                {/* 4. Evidence citations (Clickable file references) */}
                {item.evidenceReferences.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <p className="font-mono text-[11px] text-muted">
                      Cited code evidence (click to view lines in Evidence Panel):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.evidenceReferences.map((ref) => {
                        const isSelected = activeEvidenceId === ref.id;
                        return (
                          <FileReference
                            key={ref.id}
                            reference={ref}
                            selected={isSelected}
                            onClick={() => onSelectEvidence(item, ref)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
