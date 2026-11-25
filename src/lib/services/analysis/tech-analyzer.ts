import type { TechnologyItem } from "../../contracts/analysis.ts";
import type { IngestedFile } from "../github/types.ts";

interface DependencyMapping {
  name: string;
  category: TechnologyItem["category"];
  purpose: string;
}

const KNOWN_JS_DEPS: Record<string, DependencyMapping> = {
  next: {
    name: "Next.js",
    category: "Framework & API",
    purpose: "React server framework for full-stack application routing and rendering.",
  },
  react: {
    name: "React",
    category: "Framework & API",
    purpose: "Declarative component-based user interface rendering.",
  },
  typescript: {
    name: "TypeScript",
    category: "Runtime & Language",
    purpose: "Static type checking and enhanced developer tooling.",
  },
  fastify: {
    name: "Fastify",
    category: "Framework & API",
    purpose: "Low-overhead HTTP server for fast request ingestion.",
  },
  express: {
    name: "Express",
    category: "Framework & API",
    purpose: "Minimalist web framework for HTTP API routing and middleware.",
  },
  "@nestjs/core": {
    name: "NestJS",
    category: "Framework & API",
    purpose: "Opinionated architectural framework for scalable enterprise Node.js services.",
  },
  tailwindcss: {
    name: "Tailwind CSS",
    category: "Framework & API",
    purpose: "Utility-first CSS styling engine.",
  },
  zod: {
    name: "Zod",
    category: "Framework & API",
    purpose: "TypeScript-first schema validation and static type inference.",
  },
  prisma: {
    name: "Prisma",
    category: "Data & Messaging",
    purpose: "Type-safe ORM and declarative database migration tool.",
  },
  "@prisma/client": {
    name: "Prisma Client",
    category: "Data & Messaging",
    purpose: "Auto-generated type-safe database query client.",
  },
  "drizzle-orm": {
    name: "Drizzle ORM",
    category: "Data & Messaging",
    purpose: "Lightweight, SQL-like type-safe query builder and ORM.",
  },
  ioredis: {
    name: "Redis (ioredis)",
    category: "Data & Messaging",
    purpose: "In-memory data store for caching, queues, and streaming event delivery.",
  },
  redis: {
    name: "Redis",
    category: "Data & Messaging",
    purpose: "In-memory key-value storage and message pub/sub.",
  },
  pg: {
    name: "PostgreSQL (node-pg)",
    category: "Data & Messaging",
    purpose: "Relational database client for executing raw SQL queries and connection pooling.",
  },
  vitest: {
    name: "Vitest",
    category: "Testing & Tooling",
    purpose: "Fast unit testing framework powered by Vite.",
  },
  jest: {
    name: "Jest",
    category: "Testing & Tooling",
    purpose: "Delightful JavaScript and TypeScript testing framework.",
  },
  eslint: {
    name: "ESLint",
    category: "Testing & Tooling",
    purpose: "Static code analysis to enforce code quality and stylistic rules.",
  },
};

const KNOWN_PYTHON_DEPS: Record<string, DependencyMapping> = {
  fastapi: {
    name: "FastAPI",
    category: "Framework & API",
    purpose: "High-performance Python web framework with automatic OpenAPI documentation.",
  },
  django: {
    name: "Django",
    category: "Framework & API",
    purpose: "Batteries-included web framework for rapid development with built-in ORM.",
  },
  flask: {
    name: "Flask",
    category: "Framework & API",
    purpose: "Lightweight WSGI web application framework.",
  },
  sqlalchemy: {
    name: "SQLAlchemy",
    category: "Data & Messaging",
    purpose: "Python SQL toolkit and Object Relational Mapper.",
  },
  pydantic: {
    name: "Pydantic",
    category: "Framework & API",
    purpose: "Data validation and settings management using Python type hints.",
  },
  celery: {
    name: "Celery",
    category: "Data & Messaging",
    purpose: "Distributed task queue for asynchronous background execution.",
  },
  pytest: {
    name: "Pytest",
    category: "Testing & Tooling",
    purpose: "Testing framework for scalable and expressive Python test suites.",
  },
};

export function extractTechnologies(files: IngestedFile[]): TechnologyItem[] {
  const result: TechnologyItem[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const lower = file.path.toLowerCase();

    // Node.js / JavaScript / TypeScript
    if (lower === "package.json") {
      try {
        const pkg = JSON.parse(file.content);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        for (const [dep, meta] of Object.entries(KNOWN_JS_DEPS)) {
          if (deps[dep] && !seen.has(meta.name)) {
            seen.add(meta.name);
            result.push({
              name: meta.name,
              category: meta.category,
              detectedIn: file.path,
              purpose: meta.purpose,
            });
          }
        }
      } catch {
        // ignore
      }
    }

    // TypeScript config
    if (lower === "tsconfig.json" && !seen.has("TypeScript")) {
      seen.add("TypeScript");
      result.push({
        name: "TypeScript",
        category: "Runtime & Language",
        detectedIn: file.path,
        purpose: "Strict static typing and modern JavaScript compilation.",
      });
    }

    // Python dependencies
    if (lower === "requirements.txt" || lower === "pyproject.toml") {
      for (const [dep, meta] of Object.entries(KNOWN_PYTHON_DEPS)) {
        if (file.content.toLowerCase().includes(dep) && !seen.has(meta.name)) {
          seen.add(meta.name);
          result.push({
            name: meta.name,
            category: meta.category,
            detectedIn: file.path,
            purpose: meta.purpose,
          });
        }
      }
    }

    // Go modules
    if (lower === "go.mod" && !seen.has("Go")) {
      seen.add("Go");
      result.push({
        name: "Go",
        category: "Runtime & Language",
        detectedIn: file.path,
        purpose: "Compiled concurrent systems programming language.",
      });
      if (file.content.includes("gin-gonic/gin") && !seen.has("Gin")) {
        seen.add("Gin");
        result.push({
          name: "Gin",
          category: "Framework & API",
          detectedIn: file.path,
          purpose: "High-performance HTTP web framework for Go.",
        });
      }
    }

    // Rust Cargo
    if (lower === "cargo.toml" && !seen.has("Rust")) {
      seen.add("Rust");
      result.push({
        name: "Rust",
        category: "Runtime & Language",
        detectedIn: file.path,
        purpose: "Memory-safe systems programming language without garbage collection.",
      });
    }

    // Docker
    if (lower.includes("dockerfile") && !seen.has("Docker")) {
      seen.add("Docker");
      result.push({
        name: "Docker",
        category: "Infrastructure",
        detectedIn: file.path,
        purpose: "Containerized deployment environment packaging.",
      });
    }
  }

  // Fallback if very few detected
  if (result.length === 0) {
    result.push({
      name: "Source Code Repository",
      category: "Runtime & Language",
      detectedIn: "Repository files",
      purpose: "Source files analyzed directly.",
    });
  }

  return result;
}
