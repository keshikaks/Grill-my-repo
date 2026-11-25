import {
  RepositoryMetadataSchema,
  type RepositoryMetadata,
} from "@/lib/contracts/repository";

export const SAMPLE_REPOSITORY: RepositoryMetadata =
  RepositoryMetadataSchema.parse({
    owner: "acme-eng",
    name: "pulsequeue",
    description:
      "Distributed background job queue and HMAC-signed webhook delivery engine built with TypeScript, Redis Streams, and PostgreSQL.",
    defaultBranch: "main",
    commitSha: "9f4c2b8e1a73d05c6f89b412e30a9c5d721f8a10",
    url: "https://github.com/acme-eng/pulsequeue",
    frameworks: ["Node.js", "Fastify", "Redis Streams", "PostgreSQL", "Zod"],
    inspectedFileCount: 42,
    totalLinesOfCode: 4860,
    analyzedAt: "2026-10-14T10:30:00.000Z",
    languages: [
      { name: "TypeScript", percentage: 84.2, bytes: 142800 },
      { name: "SQL", percentage: 9.6, bytes: 16280 },
      { name: "Dockerfile", percentage: 3.4, bytes: 5760 },
      { name: "Shell", percentage: 2.8, bytes: 4750 },
    ],
  });
