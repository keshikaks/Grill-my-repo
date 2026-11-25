import { z } from "zod";
import { EvidenceReferenceSchema } from "./repository.ts";

export const ClaimStatusSchema = z.enum([
  "SUPPORTED",
  "PARTIALLY_SUPPORTED",
  "NOT_FOUND_IN_INSPECTED_FILES",
  "NOT_STATICALLY_VERIFIABLE",
]);

export const ClaimVerificationSchema = z.object({
  id: z.string().min(1),
  claim: z.string().min(1),
  sourceSection: z.string().min(1),
  status: ClaimStatusSchema,
  explanation: z.string().min(1),
  evidenceReferences: z.array(EvidenceReferenceSchema),
});

export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;
export type ClaimVerification = z.infer<typeof ClaimVerificationSchema>;

export const CLAIM_STATUS_META: Record<
  ClaimStatus,
  {
    label: string;
    shortLabel: string;
    description: string;
    tone: "success" | "warning" | "error" | "info";
  }
> = {
  SUPPORTED: {
    label: "Supported",
    shortLabel: "Supported",
    description: "Direct implementation evidence found in inspected source files.",
    tone: "success",
  },
  PARTIALLY_SUPPORTED: {
    label: "Partially Supported",
    shortLabel: "Partial",
    description: "Core mechanism exists, but edge cases or documented guarantees are incomplete.",
    tone: "warning",
  },
  NOT_FOUND_IN_INSPECTED_FILES: {
    label: "Not Found in Inspected Files",
    shortLabel: "Not Found",
    description: "Claimed in documentation, with no matching implementation located in inspected files.",
    tone: "error",
  },
  NOT_STATICALLY_VERIFIABLE: {
    label: "Not Statically Verifiable",
    shortLabel: "Unverifiable",
    description: "Requires runtime telemetry, deployment environment, or load testing beyond static code inspection.",
    tone: "info",
  },
};
