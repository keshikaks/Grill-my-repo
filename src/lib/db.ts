import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

function getNormalizedDbUrl(): string {
  let url = process.env.DATABASE_URL || "";

  if (!url) {
    try {
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("DATABASE_URL=")) {
            url = trimmed.split("=").slice(1).join("=").trim();
            break;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  url = url.trim().replace(/^"|"$/g, "");
  if (url && !url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
    if (url.includes("@")) {
      const parts = url.split("@");
      if (!parts[0]?.includes(":")) {
        url = "postgresql://neondb_owner:" + url;
      } else {
        url = "postgresql://" + url;
      }
    } else {
      url = "postgresql://" + url;
    }
  }
  return url;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getNormalizedDbUrl(),
      },
    },
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
