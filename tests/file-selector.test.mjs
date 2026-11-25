import test from "node:test";
import assert from "node:assert";
import {
  isInspectableFile,
  selectPriorityFiles,
} from "../src/lib/services/github/file-selector.ts";

test("File Selector - Excludes prohibited paths and extensions", () => {
  const rejectedItems = [
    { path: "node_modules/fastify/index.js", type: "blob" },
    { path: ".git/HEAD", type: "blob" },
    { path: ".next/types/route.d.ts", type: "blob" },
    { path: "dist/bundle.js", type: "blob" },
    { path: "build/main.js", type: "blob" },
    { path: "package-lock.json", type: "blob" },
    { path: "yarn.lock", type: "blob" },
    { path: "public/logo.png", type: "blob" },
    { path: "vendor/bundle.rb", type: "blob" },
    { path: "src/image.svg", type: "blob" },
    { path: "src/", type: "tree" }, // directory
  ];

  for (const item of rejectedItems) {
    const inspectable = isInspectableFile(item);
    assert.strictEqual(
      inspectable,
      false,
      `Expected ${item.path} to be rejected`
    );
  }
});

test("File Selector - Accepts valid source files", () => {
  const acceptedItems = [
    { path: "README.md", type: "blob" },
    { path: "package.json", type: "blob" },
    { path: "tsconfig.json", type: "blob" },
    { path: "src/server.ts", type: "blob" },
    { path: "src/routes/jobs.ts", type: "blob" },
    { path: "src/db/schema.prisma", type: "blob" },
    { path: "Dockerfile", type: "blob" },
    { path: "main.py", type: "blob" },
    { path: "go.mod", type: "blob" },
  ];

  for (const item of acceptedItems) {
    const inspectable = isInspectableFile(item);
    assert.strictEqual(
      inspectable,
      true,
      `Expected ${item.path} to be accepted`
    );
  }
});

test("File Selector - Priority sorting and limits", () => {
  const items = [
    { path: "tests/util.test.ts", type: "blob", size: 500 },
    { path: "README.md", type: "blob", size: 4000 },
    { path: "package.json", type: "blob", size: 1000 },
    { path: "src/api/routes.ts", type: "blob", size: 2500 },
    { path: "src/worker/job.ts", type: "blob", size: 3000 },
    { path: "src/server.ts", type: "blob", size: 1500 },
    { path: "src/auth/token.ts", type: "blob", size: 2000 },
  ];

  const selected = selectPriorityFiles(items, { maxFiles: 4 });
  assert.strictEqual(selected.length, 4);

  // README.md, package.json, and server.ts should be highest priority
  const selectedPaths = selected.map((s) => s.path);
  assert.ok(selectedPaths.includes("README.md"));
  assert.ok(selectedPaths.includes("package.json"));
  assert.ok(selectedPaths.includes("src/server.ts"));
});
