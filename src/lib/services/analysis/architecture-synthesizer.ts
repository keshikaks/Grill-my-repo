import type { ArchitectureOverview, ArchitectureLayer } from "../../contracts/analysis.ts";
import type { IngestedFile } from "../github/types.ts";

export function synthesizeArchitecture(
  files: IngestedFile[],
  repoName: string
): ArchitectureOverview {
  const filePaths = files.map((f) => f.path);

  // Group files by typical layers
  const ingestionFiles = filePaths.filter(
    (p) =>
      p.includes("route") ||
      p.includes("api/") ||
      p.includes("controller") ||
      p.includes("handler") ||
      p.includes("server") ||
      p.includes("app/") ||
      p.includes("pages/")
  );

  const domainFiles = filePaths.filter(
    (p) =>
      p.includes("service") ||
      p.includes("worker") ||
      p.includes("queue") ||
      p.includes("job") ||
      p.includes("core") ||
      p.includes("domain") ||
      p.includes("lib/")
  );

  const dataFiles = filePaths.filter(
    (p) =>
      p.includes("db/") ||
      p.includes("database") ||
      p.includes("migration") ||
      p.includes("schema") ||
      p.includes("model") ||
      p.includes("entity") ||
      p.includes("repository") ||
      p.endsWith(".sql") ||
      p.endsWith(".prisma")
  );

  const securityFiles = filePaths.filter(
    (p) =>
      p.includes("auth") ||
      p.includes("security") ||
      p.includes("crypto") ||
      p.includes("middleware")
  );

  // Determine architectural pattern
  let pattern = "Modular Multi-Layer Application";
  if (filePaths.some((p) => p.includes("worker") || p.includes("queue") || p.includes("stream"))) {
    pattern = "Event-Driven Background Processing Architecture";
  } else if (filePaths.some((p) => p.includes("app/") && p.includes("route."))) {
    pattern = "Next.js App Router Server Architecture";
  } else if (filePaths.some((p) => p.includes("controller") && p.includes("service"))) {
    pattern = "Layered Service-Repository Architecture";
  }

  const layers: ArchitectureLayer[] = [];

  // 1. Ingestion / Presentation layer
  if (ingestionFiles.length > 0) {
    layers.push({
      id: "ingestion",
      name: "API & Ingestion Boundary",
      responsibility:
        "Validates external requests, manages protocol headers, and dispatches requests to downstream handlers.",
      keyFiles: ingestionFiles.slice(0, 4),
      tradeOffs:
        "Separating HTTP transport handlers from internal business logic enables modular testing, though requires contract translation between layers.",
    });
  }

  // 2. Domain / Business logic layer
  if (domainFiles.length > 0) {
    layers.push({
      id: "domain",
      name: "Core Business & Orchestration Layer",
      responsibility:
        "Executes primary application workflows, coordinates background jobs, and enforces business invariants.",
      keyFiles: domainFiles.slice(0, 4),
      tradeOffs:
        "Encapsulating logic within stateless services facilitates concurrent scaling, but requires explicit distributed state synchronization.",
    });
  }

  // 3. Security & Validation layer
  if (securityFiles.length > 0) {
    layers.push({
      id: "security",
      name: "Security, Auth & Middleware",
      responsibility:
        "Enforces authentication tokens, cryptographic verification, and request sanitization prior to domain execution.",
      keyFiles: securityFiles.slice(0, 4),
      tradeOffs:
        "Centralized cryptographic and validation middleware ensures consistent security postures, but adds latency to request pipelines.",
    });
  }

  // 4. Persistence & Data layer
  if (dataFiles.length > 0) {
    layers.push({
      id: "persistence",
      name: "Persistence & Data Storage Layer",
      responsibility:
        "Manages database connections, schemas, migrations, and transactional data integrity.",
      keyFiles: dataFiles.slice(0, 4),
      tradeOffs:
        "Relational schemas provide strong consistency and constraint checking, while requiring proactive connection pooling and migration discipline.",
    });
  }

  // Fallback layer if repository is very compact
  if (layers.length === 0) {
    layers.push({
      id: "core",
      name: "Application Core",
      responsibility: "Encapsulates repository execution, configuration, and primary logic routines.",
      keyFiles: filePaths.slice(0, 4),
      tradeOffs: "Monolithic file placement simplifies initial setup but increases coupling as the codebase expands.",
    });
  }

  // Data flow synthesis
  const dataFlow: string[] = [];
  if (ingestionFiles.length > 0) {
    dataFlow.push(`Client sends request to ${ingestionFiles[0]} boundary.`);
  } else {
    dataFlow.push(`Entry point initiates execution.`);
  }

  if (securityFiles.length > 0) {
    dataFlow.push(`Security middleware in ${securityFiles[0]} validates tokens and request inputs.`);
  }

  if (domainFiles.length > 0) {
    dataFlow.push(`Business logic in ${domainFiles[0]} processes the core application state.`);
  }

  if (dataFiles.length > 0) {
    dataFlow.push(`Persistence routines in ${dataFiles[0]} commit durable records.`);
  }

  dataFlow.push("Execution concludes with structured response or status acknowledgement.");

  return {
    pattern,
    summary: `${repoName} implements an observed ${pattern} organizing work across ${layers.length} identifiable functional boundaries.`,
    dataFlow,
    layers,
  };
}
