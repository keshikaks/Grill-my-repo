import test from "node:test";
import assert from "node:assert";
import {
  parseGitHubRepoUrl,
  validateGitHubRepoUrl,
} from "../src/lib/validation/github-url.ts";

test("GitHub URL Parsing - Valid URLs", () => {
  const cases = [
    {
      input: "https://github.com/acme-eng/pulsequeue",
      owner: "acme-eng",
      name: "pulsequeue",
    },
    {
      input: "https://github.com/vercel/next.js.git",
      owner: "vercel",
      name: "next.js",
    },
    {
      input: "github.com/facebook/react",
      owner: "facebook",
      name: "react",
    },
    {
      input: "http://github.com/torvalds/linux",
      owner: "torvalds",
      name: "linux",
    },
  ];

  for (const c of cases) {
    const res = validateGitHubRepoUrl(c.input);
    assert.strictEqual(res.success, true, `Expected ${c.input} to be valid`);
    if (res.success) {
      assert.strictEqual(res.data.owner, c.owner);
      assert.strictEqual(res.data.name, c.name);
      assert.strictEqual(
        res.data.normalizedUrl,
        `https://github.com/${c.owner}/${c.name}`
      );
    }
  }
});

test("GitHub URL Parsing - Invalid & Unsupported URLs", () => {
  const invalidCases = [
    "",
    "   ",
    "not-a-url",
    "https://gitlab.com/user/repo",
    "https://bitbucket.org/user/repo",
    "https://github.com/",
    "https://github.com/onlyowner",
    "https://github.com/settings/profile",
    "https://github.com/explore/trending",
    "https://github.com/login",
    "https://github.com/invalid_owner$/repo",
  ];

  for (const inv of invalidCases) {
    const res = validateGitHubRepoUrl(inv);
    assert.strictEqual(res.success, false, `Expected ${inv} to be invalid`);
  }
});
