import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Load local environment for database integration testing if present
if (fs.existsSync(".env.local")) {
  const content = fs.readFileSync(".env.local", "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [k, ...rest] = trimmed.split("=");
      const val = rest.join("=").trim().replace(/^"|"$/g, "");
      if (!process.env[k]) {
        process.env[k] = val;
      }
    }
  }
}

import { hashPassword, verifyPassword } from "../src/lib/services/auth/password.ts";
import { createSessionToken, verifySessionToken } from "../src/lib/services/auth/jwt.ts";
import {
  RegisterInputSchema,
  LoginInputSchema,
  ResetPasswordRequestSchema,
  ResetPasswordConfirmSchema,
} from "../src/lib/validation/auth.ts";
import {
  registerUser,
  loginUser,
  AuthError,
} from "../src/lib/services/auth/auth-service.ts";
import {
  saveRepositoryAndAnalysis,
  getSessionAnalysis,
  getSessionQuestions,
  recordPersistentAnswer,
  getSessionReport,
  getUserDashboardData,
  deleteUserRepository,
  OwnershipError,
} from "../src/lib/services/persistence/persistence-service.ts";
import { prisma } from "../src/lib/db.ts";

test("Auth Security - Password Hashing & Verification", async () => {
  const password = "Secur3Password!99";
  const hash1 = await hashPassword(password);
  const hash2 = await hashPassword(password);

  // 1. Password must not be plaintext
  assert.notEqual(hash1, password);
  assert.match(hash1, /^\$2[aby]\$/);

  // 2. Separate salts for same password
  assert.notEqual(hash1, hash2);

  // 3. Verification works
  const isValid = await verifyPassword(password, hash1);
  assert.equal(isValid, true);

  // 4. Incorrect password rejected
  const isInvalid = await verifyPassword("WrongPassword123", hash1);
  assert.equal(isInvalid, false);
});

test("Auth Security - JWT Session Token Lifecycle", async () => {
  const payload = {
    userId: "usr_test_12345",
    email: "alex@example.com",
    name: "Alex Morgan",
  };

  // 1. Create token
  const token = await createSessionToken(payload, "2h");
  assert.equal(typeof token, "string");
  assert.ok(token.length > 30);

  // 2. Verify token
  const verified = await verifySessionToken(token);
  assert.ok(verified !== null);
  assert.equal(verified?.userId, payload.userId);
  assert.equal(verified?.email, payload.email);
  assert.equal(verified?.name, payload.name);

  // 3. Tampered token rejected
  const tampered = token.slice(0, -6) + "xxxxxx";
  const tamperedResult = await verifySessionToken(tampered);
  assert.equal(tamperedResult, null);
});

test("Auth Validation - Zod Schemas", () => {
  // Valid registration
  const validReg = RegisterInputSchema.safeParse({
    name: "Dev User",
    email: "dev@example.com",
    password: "Password1",
    confirmPassword: "Password1",
  });
  assert.equal(validReg.success, true);

  // Mismatched passwords
  const mismatchReg = RegisterInputSchema.safeParse({
    name: "Dev User",
    email: "dev@example.com",
    password: "Password1",
    confirmPassword: "DifferentPassword1",
  });
  assert.equal(mismatchReg.success, false);

  // Password missing number
  const noNumReg = RegisterInputSchema.safeParse({
    name: "Dev User",
    email: "dev@example.com",
    password: "PasswordOnly",
    confirmPassword: "PasswordOnly",
  });
  assert.equal(noNumReg.success, false);

  // Valid login
  const validLogin = LoginInputSchema.safeParse({
    email: "dev@example.com",
    password: "anypassword",
  });
  assert.equal(validLogin.success, true);

  // Invalid email
  const invalidEmail = LoginInputSchema.safeParse({
    email: "not-an-email",
    password: "anypassword",
  });
  assert.equal(invalidEmail.success, false);
});

// Database Integration Suite (Only runs when DATABASE_URL is accessible)
test("Database Persistence & User Data Ownership Isolation (Neon DB)", async (t) => {
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
  const userAEmail = `test-a-${runId}@grillmyrepo.dev`;
  const userBEmail = `test-b-${runId}@grillmyrepo.dev`;

  let userA, userB;

  try {
    // 1. Register User A
    const regA = await registerUser({
      name: "User Alpha",
      email: userAEmail,
      password: "Password1",
      confirmPassword: "Password1",
    });
    userA = regA.user;
    assert.equal(userA.email, userAEmail);
    assert.ok(regA.token);

    // 2. Duplicate registration rejected
    await assert.rejects(
      async () => {
        await registerUser({
          name: "Duplicate User",
          email: userAEmail,
          password: "Password1",
          confirmPassword: "Password1",
        });
      },
      (err) => err instanceof AuthError && err.code === "EMAIL_EXISTS"
    );

    // 3. Register User B
    const regB = await registerUser({
      name: "User Beta",
      email: userBEmail,
      password: "Password2",
      confirmPassword: "Password2",
    });
    userB = regB.user;
    assert.equal(userB.email, userBEmail);

    // 4. Login User A
    const loginA = await loginUser({
      email: userAEmail,
      password: "Password1",
    });
    assert.equal(loginA.user.id, userA.id);

    // 5. User A creates Repository, Analysis, and GrillSession
    const mockSnapshot = {
      owner: "test-org",
      name: `repo-${runId}`,
      fullName: `test-org/repo-${runId}`,
      htmlUrl: `https://github.com/test-org/repo-${runId}`,
      description: "Test repo for persistence",
      defaultBranch: "main",
      commitSha: "sha1234567890",
      languages: [{ name: "TypeScript", percentage: 100 }],
      frameworks: ["Next.js"],
      readmeContent: "# Test Repo",
      files: [],
      totalFileCount: 1,
      inspectedFileCount: 1,
      totalLinesOfCode: 50,
      treeTruncated: false,
      ingestedAt: new Date().toISOString(),
    };

    const mockMeta = {
      owner: "test-org",
      name: `repo-${runId}`,
      description: "Test repo",
      defaultBranch: "main",
      commitSha: "sha1234567890",
      languages: [{ name: "TypeScript", percentage: 100 }],
      url: `https://github.com/test-org/repo-${runId}`,
      frameworks: ["Next.js"],
      inspectedFileCount: 1,
      totalLinesOfCode: 50,
      analyzedAt: new Date().toISOString(),
    };

    const mockAnalysis = {
      overview: "Overview text",
      pattern: "Monolith",
      technologies: [{ name: "TypeScript", category: "Language", version: "5.0" }],
      functionalLayers: [],
      keyComponents: [],
      requestFlows: [],
      unverifiedAspects: [],
      headline: "Headline",
      observations: [],
      durationMs: 100,
    };

    const mockQuestions = [
      {
        id: `q-${runId}-1`,
        order: 1,
        text: "How is routing structured?",
        category: "Architecture",
        difficulty: "FOUNDATIONAL",
        evidenceReferences: [],
        expectedConcepts: ["Next.js App Router"],
      },
    ];

    const saved = await saveRepositoryAndAnalysis({
      userId: userA.id,
      snapshot: mockSnapshot,
      metadata: mockMeta,
      analysis: mockAnalysis,
      claims: [],
      questions: mockQuestions,
    });

    assert.ok(saved.sessionId);
    assert.ok(saved.repositoryId);

    // 6. User A retrieves own session -> SUCCESS
    const sessionForA = await getSessionAnalysis(saved.sessionId, userA.id);
    assert.ok(sessionForA);
    assert.equal(sessionForA.userId, userA.id);
    assert.equal(sessionForA.metadata.name, `repo-${runId}`);

    // 7. USER B ATTEMPTS TO ACCESS USER A'S SESSION -> IDOR REJECTED
    await assert.rejects(
      async () => {
        await getSessionAnalysis(saved.sessionId, userB.id);
      },
      (err) => err instanceof OwnershipError
    );

    // 8. User B attempts to fetch User A's questions -> IDOR REJECTED
    await assert.rejects(
      async () => {
        await getSessionQuestions(saved.sessionId, userB.id);
      },
      (err) => err instanceof OwnershipError
    );

    // 9. User A records answer
    const questionsA = await getSessionQuestions(saved.sessionId, userA.id);
    const targetQ = questionsA.questions[0];

    const evaluation = {
      rubricScore: 4,
      correctness: 85,
      codeUnderstanding: 80,
      clarity: 90,
      reasoning: 80,
      feedback: "Strong architectural explanation.",
      suggestedImprovements: [],
      correctPoints: ["App Router understanding"],
      missingConcepts: [],
      technicalInaccuracies: [],
      improvedExplanation: "Model answer",
    };

    const recordedAns = await recordPersistentAnswer({
      sessionId: saved.sessionId,
      questionId: targetQ.id,
      userId: userA.id,
      answerText: "We use Next.js App Router file-system routing conventions.",
      evaluation,
    });
    assert.ok(recordedAns.id);

    // 10. User B attempts to answer User A's question -> IDOR REJECTED
    await assert.rejects(
      async () => {
        await recordPersistentAnswer({
          sessionId: saved.sessionId,
          questionId: targetQ.id,
          userId: userB.id,
          answerText: "Unauthorized answer injection attempt.",
          evaluation,
        });
      },
      (err) => err instanceof OwnershipError
    );

    // 11. User A generates and retrieves report
    const reportA = await getSessionReport(saved.sessionId, userA.id);
    assert.ok(reportA);
    assert.ok(reportA.overallScore >= 0);

    // 12. User B attempts to read User A's report -> IDOR REJECTED
    await assert.rejects(
      async () => {
        await getSessionReport(saved.sessionId, userB.id);
      },
      (err) => err instanceof OwnershipError
    );

    // 13. Dashboard stats
    const dashA = await getUserDashboardData(userA.id);
    assert.equal(dashA.stats.totalRepositories, 1);
    assert.equal(dashA.stats.totalSessions, 1);
    assert.ok(dashA.stats.averageScore > 0);

    const dashB = await getUserDashboardData(userB.id);
    assert.equal(dashB.stats.totalRepositories, 0);
    assert.equal(dashB.stats.totalSessions, 0);

    // 14. User B attempts to delete User A's repository -> IDOR REJECTED
    await assert.rejects(
      async () => {
        await deleteUserRepository(saved.repositoryId, userB.id);
      },
      (err) => err instanceof OwnershipError
    );

    // 15. User A deletes own repository -> CASCADES CLEANLY
    const deleteResult = await deleteUserRepository(saved.repositoryId, userA.id);
    assert.equal(deleteResult.success, true);

    const postDeleteDash = await getUserDashboardData(userA.id);
    assert.equal(postDeleteDash.stats.totalRepositories, 0);
  } finally {
    // Cleanup test users
    try {
      if (userA) await prisma.user.delete({ where: { id: userA.id } });
      if (userB) await prisma.user.delete({ where: { id: userB.id } });
    } catch {}
    await prisma.$disconnect();
  }
});
