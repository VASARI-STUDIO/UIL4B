# UIL4B — The UI System Workspace

UIL4B is the **operating workspace for UI system creation** — build, organize,
validate, and export interface foundations without tab-hopping. One product, one
account, one Stripe subscription, three surfaces: **Create**, **Discover**, and
**Learn**. React 19 SPA (Vite + Vercel); Firebase Auth + Firestore; Stripe
subscriptions; OpenRouter AI with Gemini fallback.

> The user-facing surface label is **Create** everywhere in the shipped nav.
> "Workspace" survives only as an internal code name (`WorkspaceContext`) and in
> the strategy framing in `positioning.md`. Don't reintroduce it in UI copy.

> Lean index. Canonical story → [`positioning.md`](docs/reference/positioning.md).
> **Taking over / new to the project?** Read this file, then the canonical map
> below, then only the sub-file you need.

---

## Direction

**The goal is to make users happy.** Revenue follows that; it does not lead it.
Shipping is not success — a feature nobody reaches, understands or returns to has
failed, however green its build.

Keep the working product infrastructure (Firebase, Stripe, AI providers, reusable
tool logic) while the interface follows one coherent light-first design language:
clear sales-page structure, continuous Create workbenches, restrained motion,
consistent controls. Three surfaces:

- **Create** — build, validate and export. The primary live surface.
- **Discover** — browse community systems and curated resources. Intentionally
  partial; the wider gallery and community build remains.
- **Learn** — understand the methods behind the tools. Honest coming-soon until
  scoped content routes ship.

The homepage is a sales page with a working mini-workspace, not a dashboard. A
first-time visitor should understand what the product does immediately.

## Working with me (Dylan)

Designer-turned-vibe-coder and entrepreneur; I work autonomously — hand me a task
and let me run. My instructions are often unstructured / out of order (ADHD
tendencies) — **pull them apart, regroup, and re-sequence before acting.**

The main thread is the **Director**: it executes what I ask, and it also brings me
ideas. Full operating model: [`director.md`](docs/reference/director.md).
Proposals for me to approve or deny: [`PROPOSALS.md`](docs/PROPOSALS.md).

## Decision rules

- Action over asking · Concise over verbose · Automation over manual · Execute
  first, refine later.
- **Priorities:** 1) User experience 2) Reliability 3) Speed 4) Visual quality.
- **When solutions compete:** maintainability > cleverness · reuse > duplication
  · production-ready > clever · scalable > quick · user value > perfection.

## Core behaviors

- Exhaust options before asking. Give real opinions, not pros/cons lists.
- Confirm before irreversible external actions.
- Never mark work complete without running it
  ([`build-and-verify.md`](docs/reference/build-and-verify.md)).

## Token economy

Every turn re-sends the whole conversation, so large tool outputs get re-billed
every turn until compaction — cost ≈ (tokens/turn) × (turns). Keep both low:

- **Model:** mechanical/bulk work (edits, lint fixes, file moves, greps) → run
  on Sonnet; reserve Opus for judgment-heavy design/architecture (Opus ≈ 5×).
- **Sessions:** one task per session; `/clear` between unrelated tasks so the
  old transcript stops being re-sent.
- **Tool output is the biggest lever:** targeted Grep / `Read` with offset over
  whole-file reads; cap MCP results (`perPage`, `minimal_output`, `errorsOnly`);
  minimise screenshots; batch independent calls into one turn.

## Self-extension (auto skill creation)

When a request reveals a **reusable, structured** capability gap no skill covers,
create and validate a skill. Put UIL4B-specific knowledge in
`.claude/skills/[name]/` so it travels with the repository; reserve
`~/.claude/skills/` for genuinely cross-project capabilities. Keep agent roles
free of replaceable domain knowledge, use the skill immediately, and report what
was created.

---

## Reference docs

Read the relevant one before working in that area.

- **[Positioning & Surfaces](docs/reference/positioning.md)** — source of truth:
  what UIL4B is + the three surfaces.
- **[Discover](docs/reference/discover.md)** — community + curated-resource hub
  (replaces "Library").
- **[Director](docs/reference/director.md)** — how the main thread parses, routes,
  verifies and proposes. **The Director never writes code.**
- **[Tech Stack](docs/reference/tech-stack.md)** — frameworks, AI backends,
  client/server boundary.
- **[Architecture](docs/reference/architecture.md)** — pages, contexts,
  components, `/api` (12-function limit), analytics.
- **[Colour System Method](docs/reference/color-system-m3.md)** — M3-based colour
  method (seed → tonal palettes → roles → light/dark).
- **[Design Language V2](docs/reference/design-language-v2.md)** — the shipped V2
  visual language, and "Deviations from the mock" (founder-approved, including
  the plan ladder). Read before changing type, spacing or surface treatment.
- **[Build & Verify](docs/reference/build-and-verify.md)** — the verify gate +
  when to run simple vs. batched checks.
- **⚠️ [Human Validation Zones](docs/reference/human-validation-zones.md)** —
  founder-gated auth/Stripe files. Read before touching auth or payments.
- **[Murphy's Law](docs/reference/murphys-law.md)** — required
  loading/empty/error/offline states.
- **[Constants & Config](docs/reference/constants-and-config.md)** — admin
  emails/code, Firebase IDs, brand colour, tokens, env vars.
- **[CSS Conventions](docs/reference/css-conventions.md)** — single `global.css`,
  design tokens, class prefixes, breakpoints.
- **[Git Workflow](docs/reference/git-workflow.md)** — branch, commit, push,
  PR-only merge to `main`.
- **[Growth & Persuasion](docs/reference/growth-persuasion.md)** — ethical
  activation, belonging, and social-proof playbook (read before onboarding /
  upgrade / empty-state / marketing copy).
- **[UIL4B Brand Design](.claude/skills/uil4b-brand-design/SKILL.md)** — evolving
  product identity, product/sales continuity, and anti-slop quality bar. Read for
  any brand-facing design, implementation, or review.

**State & planning (canonical map).** One home per fact — read it, don't copy it:

| Fact | Canonical home |
|---|---|
| Product direction and the goal | **This file** (see Direction, above) |
| Ideas awaiting founder approve/deny, and their verdicts | [`PROPOSALS.md`](docs/PROPOSALS.md) |
| **Every gate baseline number** (lint warnings, test counts) | [`build-and-verify.md`](docs/reference/build-and-verify.md) |
| Founder-only console / credential / live-service work | [`OWNER-ACTIONS.md`](docs/OWNER-ACTIONS.md) |
| Execution order, blockers, known-unfixed bugs | `src/data/pipeline.js` |
| Per-module product status | `src/data/moduleBoard.js` |
| Shipped release history, and the record of founder decisions already made | [`CHANGELOG.md`](CHANGELOG.md) |
| Tool structure, routes, Soon-vs-live | [`tool-tree.md`](docs/build-plan/tool-tree.md) |
| Homepage behaviour contract | `tests/user-sim/10-home-chaos-to-calm.spec.js` (the tests are the contract) |

If a fact appears in two places, the table above wins and the other copy is a
bug — delete it and link instead. Git history is the archive; do not create
parallel historical planning docs. Subagent roster:
[`.claude/agents/README.md`](.claude/agents/README.md).

## Standing rules

**Sourcing.** Never write that the founder approved, confirmed, decided or
published something unless you can point at where that is recorded — the
`PROPOSALS.md` verdict line, the founder-decision record in `CHANGELOG.md`, this
table, a commit, or a PR. If you can't source
it, write what is verifiable or mark it UNVERIFIED. Do not smooth over
uncertainty.

**No unrun check may be claimed as passed.** Production, custom-claim, Storage,
live-payment and load/concurrency checks have not been run. Silence is not a
pass — write "not run".

**Every slice passes the gate** in
[`build-and-verify.md`](docs/reference/build-and-verify.md) plus focused rendered
verification before it is called complete. Anything touching `/api`, auth, Stripe
or user-generated content takes the security gate every time — see
[`human-validation-zones.md`](docs/reference/human-validation-zones.md).

**Bugs are not proposals.** Defects, regressions and accessibility failures go
straight into `src/data/pipeline.js` and get fixed. Only genuine product
direction goes to `PROPOSALS.md` for a verdict.
