import test from "node:test";
import assert from "node:assert";
import { GitHubClient, GitHubApiError } from "../src/lib/services/github/github-client.ts";

test("GitHub Client - Ingests repository snapshot with mocked fetch", async (t) => {
  const originalFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (url) => {
    const urlStr = String(url);

    if (urlStr.includes("/repos/mock-owner/mock-repo/languages")) {
      return new Response(JSON.stringify({ TypeScript: 8000, SQL: 2000 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (urlStr.includes("/repos/mock-owner/mock-repo/commits/main")) {
      return new Response(JSON.stringify({ sha: "sha_commit_abc123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (urlStr.includes("/git/trees/sha_commit_abc123")) {
      return new Response(
        JSON.stringify({
          sha: "sha_commit_abc123",
          url: "tree-url",
          truncated: false,
          tree: [
            { path: "README.md", type: "blob", mode: "100644", sha: "sha_r", size: 50 },
            { path: "package.json", type: "blob", mode: "100644", sha: "sha_p", size: 100 },
            { path: "src/server.ts", type: "blob", mode: "100644", sha: "sha_s", size: 150 },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (urlStr.includes("/repos/mock-owner/mock-repo")) {
      return new Response(
        JSON.stringify({
          id: 1,
          name: "mock-repo",
          full_name: "mock-owner/mock-repo",
          owner: { login: "mock-owner" },
          private: false,
          html_url: "https://github.com/mock-owner/mock-repo",
          description: "Mock repository for testing",
          default_branch: "main",
          stargazers_count: 10,
          forks_count: 2,
          open_issues_count: 0,
          language: "TypeScript",
          topics: ["api", "testing"],
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
          pushed_at: "2026-01-03T00:00:00Z",
          size: 500,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (urlStr.includes("README.md")) {
      return new Response("# Mock Repo\n- High throughput guarantee.", { status: 200 });
    }

    if (urlStr.includes("package.json")) {
      return new Response(JSON.stringify({ dependencies: { fastify: "^5.0.0" } }), { status: 200 });
    }

    if (urlStr.includes("src/server.ts")) {
      return new Response("export const server = true;", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  };

  const client = new GitHubClient();
  const snapshot = await client.ingestRepository("mock-owner", "mock-repo");

  assert.strictEqual(snapshot.owner, "mock-owner");
  assert.strictEqual(snapshot.name, "mock-repo");
  assert.strictEqual(snapshot.commitSha, "sha_commit_abc123");
  assert.strictEqual(snapshot.languages[0]?.name, "TypeScript");
  assert.strictEqual(snapshot.languages[0]?.percentage, 80);
  assert.strictEqual(snapshot.languages[1]?.name, "SQL");
  assert.strictEqual(snapshot.languages[1]?.percentage, 20);
  assert.ok(snapshot.files.length >= 2);
  assert.ok(snapshot.readmeContent?.includes("Mock Repo"));
});

test("GitHub Client - Detects rate limit 403 response", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
      status: 403,
      headers: {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1700000000",
      },
    });
  };

  const client = new GitHubClient();
  await assert.rejects(
    async () => {
      await client.ingestRepository("owner", "repo");
    },
    (err) => {
      assert.ok(err instanceof GitHubApiError);
      assert.strictEqual(err.isRateLimit, true);
      assert.ok(err.message.includes("rate limit exceeded"));
      return true;
    }
  );
});

test("GitHub Client - Handles 404 not found", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ message: "Not Found" }), {
      status: 404,
    });
  };

  const client = new GitHubClient();
  await assert.rejects(
    async () => {
      await client.ingestRepository("ghost-owner", "ghost-repo");
    },
    (err) => {
      assert.ok(err instanceof GitHubApiError);
      assert.strictEqual(err.statusCode, 404);
      return true;
    }
  );
});
