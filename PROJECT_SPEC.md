# PROJECT_SPEC.md — Grill My Repo

**Product**: Grill My Repo  
**Tagline**: Your code. Cross-examined.

## 1. Product Vision

Grill My Repo is an AI-powered GitHub repository analysis and project defence platform designed for:
- Engineering students
- Fresh graduates
- Developers preparing for placements
- Self-taught developers
- Developers preparing for technical interviews and project vivas

## 2. Core User Journey

1. **Authentication & Onboarding (`/login`, `/register`, `/reset-password`)**: Secure account registration and login via bcryptjs password hashing and HTTP-only JWT cookies.
2. **Repository Submission (`/`)**: Submit any public GitHub repository URL (`https://github.com/owner/repo`). Validates URL client-side and triggers live server ingestion via `/api/repository/analyze`. Unauthenticated users are guided to sign in while preserving their target repository URL.
3. **Repository Analysis & Claims vs Reality (`/analysis?session=...`)**: Inspect real repository metadata, default branch commit SHA, technology stack, architecture layers, important files with code snippets, and README claims cross-checked against implementation evidence with line-level references.
4. **Interactive Grill Room (`/grill?session=...`)**: Defend architectural choices across 5–8 repository-grounded questions with cited source code pinned alongside the answer editor. Receive real-time AI evaluation across a 5-point rubric and 4 dimensions, and ask follow-up questions to probe the interviewer's critique.
5. **Final Report Card (`/report?session=...`)**: Review aggregated readiness score, 4-axis rubric breakdown (Technical Correctness, Code Understanding, Explanation Clarity, Reasoning & Trade-offs), question-by-question breakdown, and checkable revision topics.
6. **User Dashboard (`/dashboard`)**: View aggregated statistics, previous repository analyses, completed viva sessions, final defence reports, and manage repositories with cascade deletion.

## 3. Architecture & Data Contracts

All domain contracts are defined with Zod schemas and inferred TypeScript types in `src/lib/contracts/`:

- `repository.ts`: `RepositoryMetadataSchema`, `RepositoryFileSchema`, `EvidenceReferenceSchema`
- `analysis.ts`: `AnalysisResultSchema`, `AnalysisStageSchema`, `TechnologyItemSchema`, `ArchitectureOverviewSchema`
- `claims.ts`: `ClaimStatusSchema`, `ClaimVerificationSchema`
- `grill.ts`: `GrillQuestionSchema`, `GrillAnswerSchema`, `AnswerEvaluationSchema`, `FollowUpItemSchema`
- `report.ts`: `FinalReportSchema`, `CategoryScoresSchema`, `QuestionResultSchema`, `RevisionTopicSchema`
- `integration.ts`: Client API methods (`analyzeRepositoryApi`, `fetchRepositorySessionApi`, `submitGrillAnswerApi`, etc.)
- `auth.ts` (`src/lib/validation/auth.ts`): `RegisterInputSchema`, `LoginInputSchema`, `ResetPasswordRequestSchema`, `ResetPasswordConfirmSchema`

## 4. Backend Services (`src/lib/services/`)

- **Database & Persistence (`src/lib/db.ts`, `src/lib/services/persistence/`)**:
  - Singleton `PrismaClient` with connection pooling and URL protocol normalization for Neon PostgreSQL.
  - `persistence-service`: CRUD operations for users, repositories, analyses, questions, answers, and reports with server-side ownership (IDOR) verification.
- **Authentication & Security (`src/lib/services/auth/`)**:
  - `password`: `bcryptjs` hashing with 12 rounds and constant-time verification.
  - `jwt`: `jose` HS256 signed session tokens with 7-day expiration.
  - `session`: HTTP-only, SameSite=Lax cookie lifecycle with `getCurrentUser` and `requireAuth`.
  - `auth-service`: Registration, credential login, token issuance, and password recovery.
- **GitHub Ingestion (`src/lib/services/github/`)**:
  - `GitHubClient`: Fetches metadata, language distribution, default branch commit, recursive git tree, and file contents. Handles 403/429 rate limits with reset time guidance.
  - `file-selector`: Prioritizes entry points, manifests, routes, services, schemas, and security files; excludes binaries, media, lockfiles, and `.git`/`node_modules`/`.next`/`build`/`target`/`venv`.
- **AI Provider Layer (`src/lib/services/ai/`)**:
  - Configurable: `GeminiProvider`, `OpenAiProvider`, and `HeuristicProvider` (fallback).
  - Robust structured output extraction and Zod validation (`prompt-utils`).
  - Security prompt wrapping with untrusted data delimiters.
- **Repository Intelligence & Claims (`src/lib/services/analysis/`)**:
  - `tech-analyzer`: Identifies dependencies, languages, and tools from manifests.
  - `architecture-synthesizer`: Detects patterns (Event-Driven, Next.js App Router, Layered REST) and maps functional layers.
  - `claims-extractor`: Extracts technical assertions from README and cross-checks against actual file lines.
- **Grilling & Evaluation (`src/lib/services/grill/`)**:
  - `question-generator`: Synthesizes 5–8 questions grounded in inspected files.
  - `answer-evaluator`: Implements the 5-point evaluation rubric, 4 dimensions, and follow-up interaction.
- **In-Memory Session Store (`src/lib/services/session/`)**:
  - Thread-safe caching layer with 2-hour TTL and automated cleanup.

## 5. API Routes (`src/app/api/`)

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Registers a new user account | No |
| `POST` | `/api/auth/login` | Authenticates user and issues HTTP-only JWT cookie | No |
| `POST` | `/api/auth/logout` | Revokes session and clears auth cookie | Yes |
| `GET` | `/api/auth/me` | Returns profile of current authenticated user | No (Optional) |
| `POST` | `/api/auth/reset-password` | Requests password reset or confirms new password | No |
| `GET` | `/api/dashboard` | Returns user statistics, repos, sessions, and reports | Yes |
| `POST` | `/api/repository/analyze` | Ingests repo, runs analysis, persists records to DB | Yes |
| `GET` | `/api/repository/[sessionId]` | Retrieves session metadata and claims | Yes (Ownership) |
| `POST` | `/api/repository/delete` | Deletes repository and associated sessions | Yes (Ownership) |
| `GET` | `/api/grill/[sessionId]/questions` | Retrieves session questions and answers | Yes (Ownership) |
| `POST` | `/api/grill/[sessionId]/answer` | Evaluates submitted answer, persists score to DB | Yes (Ownership) |
| `POST` | `/api/grill/[sessionId]/followup` | Generates and persists contextual follow-up dialogue | Yes (Ownership) |
| `GET` | `/api/report/[sessionId]` | Computes and persists final defence report | Yes (Ownership) |
| `GET` | `/api/health` | Service status, phase capability flags, AI info | No |

## 6. Phased Roadmap

### Phase 1 — Foundation & Experience (Complete)
- Midnight Blue design system, dark/light themes, accessible reusable UI component library.

### Phase 2 — Intelligence Engine (Complete)
- Live GitHub REST API ingestion, README Claims vs Reality engine, AI question generation, 5-point answer evaluation, follow-up dialogue, in-memory sessions, and end-to-end integration.

### Phase 3 — Persistence, Authentication & Production Readiness (Complete)
- Neon PostgreSQL database with Prisma ORM, user accounts, JWT cookies, persistent session and viva history, user dashboard, ownership access control (IDOR prevention), and comprehensive automated testing.
