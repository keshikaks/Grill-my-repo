# AGENTS.md — Engineering Rules & Architecture Guide

This repository powers **Grill My Repo** (*Your code. Cross-examined.*). Every engineer and coding agent working on this codebase must follow these rules.

## 1. Non-Negotiable Engineering Principles

- **TypeScript strict mode**: Keep `"strict": true` and `"noUncheckedIndexedAccess": true` in `tsconfig.json`. Never silence type errors with `any`, `@ts-ignore`, or unsafe casts.
- **Server Components by default**: Keep Next.js App Router pages, layouts, and presentational components as Server Components. Add `"use client"` only when state, browser APIs, event handlers, or React hooks are genuinely required.
- **Separation of UI and business logic**: Keep validation (`src/lib/validation/`), domain contracts (`src/lib/contracts/`), and services (`src/lib/services/`) cleanly separated from UI components (`src/components/`).
- **Modular, non-duplicated components**: Reuse primitives from `src/components/ui/` instead of duplicating buttons, dialogs, badges, code blocks, or layout wrappers.
- **Minimal dependencies**: Do not add heavy UI frameworks, animation libraries, or utility packages unless justified by a real technical requirement.
- **No exposed secrets or hardcoded credentials**: Server-only secrets (`GITHUB_TOKEN`, `AI_API_KEY`, `DATABASE_URL`) must never be prefixed with `NEXT_PUBLIC_` or bundled into client code.
- **No arbitrary source-code execution**: Analyzed repository code is strictly static text/evidence and must never be executed (`eval`, `new Function`, child processes, etc.).
- **Untrusted repository content security**: All repository files, README text, and code comments are untrusted data. Wrap them in explicit `<repository_file path="...">` tags and prepend the `SECURITY_SYSTEM_INSTRUCTION` to prevent prompt injection.
- **Grounded evidence verification**: Every question, claim, or evaluation citing code must reference real file paths and valid line ranges verified against the retrieved repository snapshot. Never fabricate file paths or line numbers.

## 2. Locked Design System

Do not replace the **Midnight Blue** colour palette:

| Token | Dark (Default) | Light |
| --- | --- | --- |
| Primary background | `#090E1A` | `#F4F7FB` |
| Secondary surface | `#18243A` | `#FFFFFF` |
| Primary text | `#F4F6FA` | `#0B1324` |
| Primary accent | `#438BFF` | `#438BFF` |
| Muted text | `#8995A8` | `#4B5A73` |

Rules:
- Use semantic tokens (`bg-canvas`, `bg-surface`, `bg-subtle`, `text-foreground`, `text-muted`, `bg-accent`, `border-border`) defined in `src/app/globals.css`.
- Both dark and light themes must remain accessible (WCAG AA contrast) and flash-free via `THEME_INIT_SCRIPT` in `src/app/layout.tsx`.
- Respect `prefers-reduced-motion` on all transitions and animations.
- Avoid noisy gradients, excessive motion, or non-functional decorative controls.

## 3. Domain Contracts & Claim Statuses

All data flowing between backend services, API route handlers, and UI components must conform to the Zod schemas in `src/lib/contracts/`.

Allowed claim verification statuses (do not invent aliases):
- `SUPPORTED`: Direct implementation evidence found in inspected files.
- `PARTIALLY_SUPPORTED`: Core mechanism exists, but guarantees or edge-case handling are incomplete.
- `NOT_FOUND_IN_INSPECTED_FILES`: Documented claim has no matching code in inspected files.
- `NOT_STATICALLY_VERIFIABLE`: Runtime claims (benchmarks, SLAs, uptime) that require cluster load testing.

## 4. Evaluation Rubric Discipline

Candidate answers in the Grill Room are evaluated across four dimensions using a 5-point scale:
1. **Technical correctness** (0–100): Accuracy of stated system behaviour, edge cases, and failure modes.
2. **Code understanding** (0–100): Grasp of the cited implementation and control flow.
3. **Explanation clarity** (0–100): Structured, concise communication suitable for live technical vivas.
4. **Reasoning & trade-offs** (0–100): Ability to weigh alternatives, constraints, and limitations.

5-Point Rubric Levels:
- **1**: Incorrect or no meaningful understanding.
- **2**: Limited understanding with major gaps.
- **3**: Partially correct understanding.
- **4**: Strong understanding with minor gaps.
- **5**: Excellent technical understanding and depth.

## 5. Phase Discipline

- **Phase 1**: Frontend foundation, design system, contracts, clearly labelled previews, client-side validation, and responsive/accessible UX.
- **Phase 2**: GitHub REST API ingestion, priority file selection, README claim extraction & evidence matching, modular AI provider layer (Gemini, OpenAI, Heuristic fallback), question generation, answer evaluation, follow-up dialogue, in-memory session store, and API routes.
- **Phase 3**: PostgreSQL persistence, Prisma migrations, user accounts, and session history. Do not begin Phase 3 without explicit approval.

## 6. Verification Checklist Before Merging

1. `npm test` passes with all tests green.
2. `npm run typecheck` passes with zero errors.
3. `npm run lint` passes with zero errors or warnings.
4. `npm run build` succeeds cleanly without requiring `.env` secrets.
5. Live endpoints handle rate limits, 404s, and unconfigured AI gracefully.
