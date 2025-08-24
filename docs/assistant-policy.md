# Assistant Policy (GPT‑5 aligned) for AOMA Mesh MCP

This document codifies how I (Cascade) operate in this repository, aligned to OpenAI’s GPT‑5 prompting guide and your workspace rules.

## Core principles

- Use `pnpm` for all package tasks.
- Linting: prefer Standard‑TS/JS style but keep it non‑pedantic; don’t block progress on minor style. Comment out `console.log` rather than removing it.
- Respect protected regions: never modify code between `// AI-PROTECT-START` and `// AI-PROTECT-END`.
- File size: soft guideline ≤200 lines (200–300 lines is getting big; refactor when value‑add).
- Secrets: store only in `.env*` files (gitignored). Never hardcode or commit secrets.
- Commits: propose `git acm '...'` using Conventional Commits, then `git push origin <branch>` after approval.

## Tech stack assumptions

- Frontend: Next.js 15+ (App Router), Tailwind CSS, shadcn/ui, Radix UI primitives.
- AI: Vercel AI SDK v5+ and Vercel AI Elements.
- Deployment: Vercel platform (SSR/Edge as appropriate). Prefer streaming where it improves UX.
- Testing selectors: add `data-test-id` to new HTML elements for Playwright E2E.

## Agentic behavior and tool budgets

- Default eagerness: medium (balanced). Prefer acting over excessive searching.
- Quick tasks: cap at ~2 tool calls, then either act or ask to proceed.
- Complex tasks: allow one additional focused search batch if signals conflict; proceed proactively.
- Proactive edits: implement the plan and propose changes for you to accept/reject. Avoid asking “should I proceed?” unless necessary (e.g., secrets/approvals).

## Reasoning and verbosity
 
 - Reasoning effort: default medium. Use minimal/low for latency‑sensitive tasks; high for multi‑file refactors or ambiguous bugs.
 - Verbosity targeting: chat responses concise; code/diffs/tests use higher verbosity for clarity and reviewability.

## Tool preambles (when running tools)
 
 1) Restate the goal briefly.
 2) Outline a short, numbered plan.
 3) Narrate only the helpful milestones during execution.
 4) End with a compact “Completed vs Next steps” summary.

## Verification policy (always test before commit/deploy)
 
 - Default pipeline: `pnpm typecheck` → `pnpm lint` (loose) → `pnpm test`.
 - Testing preferences: prefer Playwright E2E; keep Jest for unit/integration.
 - Add `data-test-id` to any new HTML elements for future E2E.
 - Author additional tests when appropriate to cover new behavior or regressions.

## Playwright and TestSprite
 
 - Playwright: add a root‑level setup (in addition to existing `jira-upgrade-testing/`) to cover app‑wide E2E flows.
 - TestSprite MCP: evaluate benefits and integration points for E2E/benchmarks.

## CI and Docker
 
 - Pre‑merge checks: run `pnpm typecheck && pnpm lint && pnpm test` (and Playwright optionally) with minimal strictness. Don’t get stuck on nitpicks.
 - Docker: follow and understand this repo’s Docker development and build process; always run tests before deployment.

## Markdown and metaprompting
 
 - Use Markdown only where semantically helpful; always cite paths/functions with backticks (e.g., `src/server/aoma-mesh-server-modular.ts`).
 - When friction recurs, propose minimal prompt/policy edits (metaprompting) for approval.

## Termination discipline
 
 - As an agent, complete all required subtasks before yielding. Only wait when blocked on secrets, approvals, or missing information.

## Open confirmations (pending)
 
 - Eagerness default, reasoning default, chat/code verbosity, and preamble frequency can be tuned further based on your answers; current defaults are set as above.

—
Maintained by Cascade. Update this file when preferences change; I will mirror it in memory and behavior.
