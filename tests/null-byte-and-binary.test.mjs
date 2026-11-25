import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Load local environment for database integration testing if present
if (fs.existsSync(".env.local")) {
  const content = fs.readFileSync(".env.local", "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^"|"$/g, "");
        if (!process.env[k]) {
          process.env[k] = val;
        }
      }
    }
  }
}

import {
  sanitizeNullBytes,
  isBinaryBuffer,
  isBinaryPath,
  sanitizeForPostgres,
} from "../src/lib/utils/sanitizer.ts";
import {
  isInspectableFile,
  selectPriorityFiles,
} from "../src/lib/services/github/file-selector.ts";
import { GitHubClient } from "../src/lib/services/github/github-client.ts";
import {
  saveRepositoryAndAnalysis,
  getSessionAnalysis,
  deleteUserRepository,
} from "../src/lib/services/persistence/persistence-service.ts";
import { registerUser } from "../src/lib/services/auth/auth-service.ts";
import { prisma } from "../src/lib/db.ts";

test("Null Byte Sanitizer - Text Sanitization", () => {
  // 1. Single null byte in text
  const text1 = "const secret = 'abc\u0000def';";
  assert.equal(sanitizeNullBytes(text1), "const secret = 'abcdef';");

  // 2. Multiple null bytes
  const text2 = "\u0000hello\u0000world\u0000";
  assert.equal(sanitizeNullBytes(text2), "helloworld");

  // 3. Stringified escaped null byte sequence
  const text3 = "export const val = 'test\\u0000payload';";
  assert.equal(sanitizeNullBytes(text3), "export const val = 'testpayload';");

  // 4. Clean source code remains unmodified
  const cleanCode = `export function add(a: number, b: number): number {
  return a + b;
}`;
  assert.equal(sanitizeNullBytes(cleanCode), cleanCode);

  // 5. Empty and non-string inputs handled safely
  assert.equal(sanitizeNullBytes(""), "");
  assert.equal(sanitizeNullBytes(null), null);
  assert.equal(sanitizeNullBytes(undefined), undefined);
});

test("Binary Detection - Known Extensions and Paths", () => {
  // Common binary extensions must be identified
  assert.equal(isBinaryPath("assets/logo.png"), true);
  assert.equal(isBinaryPath("db/data.sqlite"), true);
  assert.equal(isBinaryPath("db/records.sqlite3"), true);
  assert.equal(isBinaryPath("dist/bundle.wasm"), true);
  assert.equal(isBinaryPath("cache/compiled.pyc"), true);
  assert.equal(isBinaryPath("lib/native.so"), true);
  assert.equal(isBinaryPath("bin/server.exe"), true);
  assert.equal(isBinaryPath("data/sample.parquet"), true);
  assert.equal(isBinaryPath("archive/backup.tar.gz"), true);

  // Source code files must NOT be identified as binary paths
  assert.equal(isBinaryPath("src/index.ts"), false);
  assert.equal(isBinaryPath("src/app.tsx"), false);
  assert.equal(isBinaryPath("src/main.py"), false);
  assert.equal(isBinaryPath("README.md"), false);
  assert.equal(isBinaryPath("package.json"), false);
  assert.equal(isBinaryPath("schema.prisma"), false);
});

test("Binary Detection - Buffer Content & Magic Numbers", () => {
  // 1. PNG magic number
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  assert.equal(isBinaryBuffer(pngHeader), true);

  // 2. SQLite database header
  const sqliteHeader = Buffer.from("SQLite format 3\0testdatabasecontent123");
  assert.equal(isBinaryBuffer(sqliteHeader), true);

  // 3. WASM magic number (\0asm)
  const wasmHeader = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
  assert.equal(isBinaryBuffer(wasmHeader), true);

  // 4. Raw buffer with high null-byte density
  const binaryPayload = Buffer.alloc(100);
  binaryPayload.write("random", 0);
  binaryPayload[15] = 0x00;
  binaryPayload[25] = 0x00;
  binaryPayload[35] = 0x00;
  binaryPayload[45] = 0x00;
  assert.equal(isBinaryBuffer(binaryPayload), true);

  // 5. Valid UTF-8 source code buffer must NOT be treated as binary
  const sourceCodeBuffer = Buffer.from(`import { useState } from "react";
export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}`);
  assert.equal(isBinaryBuffer(sourceCodeBuffer), false);

  // 6. Source code with a single isolated null byte (e.g. test fixture) is not rejected as pure binary
  const textWithIsolatedNull = Buffer.from("const message = 'test\0message';");
  assert.equal(isBinaryBuffer(textWithIsolatedNull), false);
});

test("Deep PostgreSQL Sanitizer - Nested Objects & Arrays", () => {
  const payload = {
    repoName: "test\u0000repo",
    readme: "# Title\u0000 with null",
    active: true,
    fileCount: 42,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    tags: ["node\u0000js", "nextjs", "\u0000prisma"],
    files: [
      {
        path: "src/\u0000index.ts",
        content: "console.log('hello\u0000world');",
        lines: ["console.log('hello\u0000world');"],
      },
    ],
    metadata: {
      "key\u0000one": "value\u0000one",
    },
  };

  const sanitized = sanitizeForPostgres(payload);

  assert.equal(sanitized.repoName, "testrepo");
  assert.equal(sanitized.readme, "# Title with null");
  assert.equal(sanitized.active, true);
  assert.equal(sanitized.fileCount, 42);
  assert.equal(sanitized.createdAt instanceof Date, true);
  assert.deepEqual(sanitized.tags, ["nodejs", "nextjs", "prisma"]);
  assert.equal(sanitized.files[0]?.path, "src/index.ts");
  assert.equal(sanitized.files[0]?.content, "console.log('helloworld');");
  assert.deepEqual(sanitized.files[0]?.lines, ["console.log('helloworld');"]);
  assert.equal(sanitized.metadata["keyone"], "valueone");

  // Serialized JSON must contain zero null escapes
  const json = JSON.stringify(sanitized);
  assert.equal(json.includes("\u0000"), false);
  assert.equal(json.includes("\\u0000"), false);
});

test("File Selector - Binary Files Are Excluded From Source Inspection", () => {
  const treeItems = [
    { path: "src/server.ts", mode: "100644", type: "blob", sha: "sha1", size: 1024 },
    { path: "assets/logo.png", mode: "100644", type: "blob", sha: "sha2", size: 5000 },
    { path: "db/app.sqlite", mode: "100644", type: "blob", sha: "sha3", size: 8000 },
    { path: "dist/module.wasm", mode: "100644", type: "blob", sha: "sha4", size: 12000 },
    { path: "README.md", mode: "100644", type: "blob", sha: "sha5", size: 2048 },
  ];

  // Inspectable checks
  assert.equal(isInspectableFile(treeItems[0]), true);
  assert.equal(isInspectableFile(treeItems[1]), false); // png rejected
  assert.equal(isInspectableFile(treeItems[2]), false); // sqlite rejected
  assert.equal(isInspectableFile(treeItems[3]), false); // wasm rejected
  assert.equal(isInspectableFile(treeItems[4]), true); // README accepted

  const priority = selectPriorityFiles(treeItems);
  const paths = priority.map((p) => p.path);

  assert.ok(paths.includes("README.md"));
  assert.ok(paths.includes("src/server.ts"));
  assert.equal(paths.includes("assets/logo.png"), false);
  assert.equal(paths.includes("db/app.sqlite"), false);
  assert.equal(paths.includes("dist/module.wasm"), false);
});

test("GitHub Client - Fault Tolerance (Problematic File Does Not Crash Ingestion)", async () => {
  const client = new GitHubClient();

  // Mock fetch to simulate:
  // 1. One normal file returning code
  // 2. One binary file returning binary buffer
  // 3. One problematic file throwing a network/fetch exception
  // 4. One file containing a null byte
  let fetchCallCount = 0;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const urlStr = url.toString();
    fetchCallCount++;

    if (urlStr.includes("api.github.com/repos/mock-owner/mock-repo/languages")) {
      return new Response(JSON.stringify({ TypeScript: 1000 }), { status: 200 });
    }
    if (urlStr.includes("api.github.com/repos/mock-owner/mock-repo/commits/")) {
      return new Response(JSON.stringify({ sha: "commit12345" }), { status: 200 });
    }
    if (urlStr.includes("api.github.com/repos/mock-owner/mock-repo/git/trees/")) {
      return new Response(
        JSON.stringify({
          sha: "tree123",
          url: "https://api.github.com/repos/mock-owner/mock-repo/git/trees/tree123",
          truncated: false,
          tree: [
            { path: "src/normal.ts", mode: "100644", type: "blob", sha: "sha1", size: 100 },
            { path: "src/corrupt.ts", mode: "100644", type: "blob", sha: "sha2", size: 100 },
            { path: "src/nullbyte.ts", mode: "100644", type: "blob", sha: "sha3", size: 100 },
            { path: "data/binary.dat", mode: "100644", type: "blob", sha: "sha4", size: 100 },
            { path: "README.md", mode: "100644", type: "blob", sha: "sha5", size: 100 },
          ],
        }),
        { status: 200 }
      );
    }
    if (urlStr.includes("api.github.com/repos/mock-owner/mock-repo")) {
      return new Response(
        JSON.stringify({
          id: 1,
          name: "mock-repo",
          full_name: "mock-owner/mock-repo",
          owner: { login: "mock-owner" },
          private: false,
          html_url: "https://github.com/mock-owner/mock-repo",
          description: "Mock repo description",
          default_branch: "main",
          size: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          pushed_at: new Date().toISOString(),
        }),
        { status: 200 }
      );
    }

    // Raw file content mock
    if (urlStr.includes("src/normal.ts")) {
      return new Response("export const version = '1.0.0';", { status: 200 });
    }
    if (urlStr.includes("src/corrupt.ts")) {
      // Problematic file that crashes or throws
      throw new Error("Simulated network corruption / reset on socket");
    }
    if (urlStr.includes("src/nullbyte.ts")) {
      // Source file with an embedded null byte
      return new Response("export const greeting = 'hello\u0000world';", { status: 200 });
    }
    if (urlStr.includes("README.md")) {
      return new Response("# Mock Readme\u0000 with null", { status: 200 });
    }

    return new Response(null, { status: 404 });
  };

  try {
    const snapshot = await client.ingestRepository("mock-owner", "mock-repo");

    // Ingestion MUST succeed despite src/corrupt.ts throwing an exception!
    assert.equal(snapshot.owner, "mock-owner");
    assert.equal(snapshot.name, "mock-repo");

    // normal.ts is present
    const normalFile = snapshot.files.find((f) => f.path === "src/normal.ts");
    assert.ok(normalFile);
    assert.equal(normalFile.content, "export const version = '1.0.0';");

    // nullbyte.ts was sanitized (null byte removed, code preserved)
    const nullFile = snapshot.files.find((f) => f.path === "src/nullbyte.ts");
    assert.ok(nullFile);
    assert.equal(nullFile.content, "export const greeting = 'helloworld';");
    assert.equal(nullFile.content.includes("\u0000"), false);

    // corrupt.ts was gracefully caught and skipped without crashing the ingestion
    const corruptFile = snapshot.files.find((f) => f.path === "src/corrupt.ts");
    assert.equal(corruptFile, undefined);

    // README null byte was sanitized
    assert.ok(snapshot.readmeContent);
    assert.equal(snapshot.readmeContent.includes("\u0000"), false);
    assert.equal(snapshot.readmeContent, "# Mock Readme with null");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// Database Integration Suite: Verifies saving and retrieving repository analysis with null bytes on Neon PostgreSQL
test("PostgreSQL Persistence - Null Byte Sanitization & Recovery on Neon DB", async (t) => {
  let isDbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbConnected = true;
  } catch (err) {
    t.skip("Neon PostgreSQL connection not available in local test sandbox: " + err.message);
    return;
  }

  assert.equal(isDbConnected, true, "Neon DB must be connected");

  const runId = Date.now().toString(36);
  const testEmail = `nullbyte-${runId}@grillmyrepo.dev`;
  let testUser;

  try {
    // 1. Register a test user
    const reg = await registerUser({
      name: "NullByte Tester",
      email: testEmail,
      password: "TestPassword123!",
      confirmPassword: "TestPassword123!",
    });
    testUser = reg.user;

    // 2. Build a repository snapshot containing null bytes in file contents, lines, and README
    const snapshotWithNullBytes = {
      owner: "acme-test",
      name: `nullbyte-repo-${runId}`,
      fullName: `acme-test/nullbyte-repo-${runId}`,
      htmlUrl: `https://github.com/acme-test/nullbyte-repo-${runId}`,
      description: "Repo with embedded null \u0000 byte in description",
      defaultBranch: "main",
      commitSha: "sha-nullbyte-12345",
      languages: [{ name: "TypeScript", percentage: 100 }],
      frameworks: ["Next.js"],
      readmeContent: "# Readme Header\u0000 with null byte inside text",
      files: [
        {
          path: "src/worker\u0000.ts",
          extension: ".ts",
          size: 120,
          content: "export function run() {\n  return 'null\u0000value';\n}",
          lines: ["export function run() {", "  return 'null\u0000value';", "}"],
          lineCount: 3,
          sha: "sha-f1",
        },
      ],
      totalFileCount: 1,
      inspectedFileCount: 1,
      totalLinesOfCode: 3,
      treeTruncated: false,
      ingestedAt: new Date().toISOString(),
    };

    const metadataWithNullBytes = {
      owner: "acme-test",
      name: `nullbyte-repo-${runId}`,
      description: "Description with \u0000 null byte",
      defaultBranch: "main",
      commitSha: "sha-nullbyte-12345",
      languages: [{ name: "TypeScript", percentage: 100 }],
      url: `https://github.com/acme-test/nullbyte-repo-${runId}`,
      frameworks: ["Next.js"],
      inspectedFileCount: 1,
      totalLinesOfCode: 3,
      analyzedAt: new Date().toISOString(),
    };

    const analysisWithNullBytes = {
      summary: "Analysis summary with \u0000 null byte",
      technologies: [{ name: "TypeScript\u0000", category: "Language", confidence: 1 }],
      layers: [],
      entrypoints: [],
      dependencies: [],
      analyzedAt: new Date().toISOString(),
    };

    const claimsWithNullBytes = [
      {
        id: "claim-1",
        claimText: "Guarantees zero-loss processing\u0000 on crash",
        extractedQuote: "Zero-loss\u0000 guaranteed",
        status: "SUPPORTED",
        confidence: 0.9,
        category: "RELIABILITY",
        evidence: [
          {
            filePath: "src/worker.ts",
            startLine: 1,
            endLine: 3,
            excerpt: "export function run() {\n  return 'null\u0000value';\n}",
            relevanceNote: "Evidence excerpt with \u0000 null byte",
          },
        ],
      },
    ];

    const questionsWithNullBytes = [
      {
        id: "q-1",
        order: 1,
        text: "Explain how worker crash recovery works without \u0000 data loss?",
        category: "ARCHITECTURE",
        difficulty: "MEDIUM",
        evidenceReferences: [
          {
            filePath: "src/worker.ts",
            startLine: 1,
            endLine: 3,
            excerpt: "return 'null\u0000value';",
            language: "typescript",
          },
        ],
        expectedConcepts: ["idempotency\u0000", "dead-letter"],
      },
    ];

    // 3. Save to Neon PostgreSQL - MUST succeed without PostgresError: \u0000
    const { sessionId, repositoryId } = await saveRepositoryAndAnalysis({
      userId: testUser.id,
      snapshot: snapshotWithNullBytes,
      metadata: metadataWithNullBytes,
      analysis: analysisWithNullBytes,
      claims: claimsWithNullBytes,
      questions: questionsWithNullBytes,
    });

    assert.ok(sessionId, "Session ID must be generated");
    assert.ok(repositoryId, "Repository ID must be generated");

    // 4. Retrieve saved analysis from Neon PostgreSQL
    const saved = await getSessionAnalysis(sessionId, testUser.id);
    assert.ok(saved, "Saved session must be retrievable from Neon DB");
    assert.equal(saved.metadata.name, `nullbyte-repo-${runId}`);
    assert.equal(saved.metadata.description.includes("\u0000"), false);
    assert.equal(saved.analysis.summary.includes("\u0000"), false);
    assert.equal(saved.claims[0]?.claimText.includes("\u0000"), false);

    // 5. Clean up test repository
    await deleteUserRepository(repositoryId, testUser.id);
  } finally {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  }
});
