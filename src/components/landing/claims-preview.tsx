"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  CLAIM_STATUS_META,
  type ClaimStatus,
  type ClaimVerification,
} from "@/lib/contracts/claims";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileReference } from "@/components/ui/file-reference";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Tabs } from "@/components/ui/tabs";

interface ClaimsPreviewProps {
  claims: ClaimVerification[];
}

type FilterOption = "ALL" | ClaimStatus;

export function ClaimsPreview({ claims }: ClaimsPreviewProps) {
  const [filter, setFilter] = useState<FilterOption>("ALL");

  const filtered =
    filter === "ALL" ? claims.slice(0, 4) : claims.filter((c) => c.status === filter);

  return (
    <section
      aria-labelledby="claims-preview-heading"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2.5">
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs uppercase tracking-widest text-accent-text">
              Claims vs Reality
            </p>
            <Badge variant="accent">Interactive Preview</Badge>
          </div>
          <h2
            id="claims-preview-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Every README claim audited against inspected files
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            Avoid being caught off-guard when an interviewer asks where a claimed
            feature actually lives in your repository.
          </p>
        </div>

        <Link
          href="/analysis"
          className={buttonClassName({
            variant: "secondary",
            size: "md",
            className: "self-start lg:self-auto",
          })}
        >
          <span>Open Full Analysis</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        <Tabs<FilterOption>
          ariaLabel="Filter preview claims by verification status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "Featured", count: Math.min(4, claims.length) },
            {
              value: "SUPPORTED",
              label: "Supported",
              count: claims.filter((c) => c.status === "SUPPORTED").length,
            },
            {
              value: "PARTIALLY_SUPPORTED",
              label: "Partial",
              count: claims.filter((c) => c.status === "PARTIALLY_SUPPORTED").length,
            },
            {
              value: "NOT_FOUND_IN_INSPECTED_FILES",
              label: "Not Found",
              count: claims.filter((c) => c.status === "NOT_FOUND_IN_INSPECTED_FILES")
                .length,
            },
            {
              value: "NOT_STATICALLY_VERIFIABLE",
              label: "Unverifiable",
              count: claims.filter((c) => c.status === "NOT_STATICALLY_VERIFIABLE")
                .length,
            },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => {
            const meta = CLAIM_STATUS_META[item.status];
            const firstEvidence = item.evidenceReferences[0];

            return (
              <Card key={item.id} interactive className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-muted">
                      {item.sourceSection}
                    </span>
                    <StatusIndicator label={meta.label} tone={meta.tone} />
                  </div>
                  <CardTitle className="pt-1 text-sm leading-snug">
                    &ldquo;{item.claim}&rdquo;
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-1">
                  <p className="text-xs leading-relaxed text-muted">
                    {item.explanation}
                  </p>
                  {firstEvidence && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <FileReference
                        filePath={firstEvidence.filePath}
                        startLine={firstEvidence.startLine}
                        endLine={firstEvidence.endLine}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
