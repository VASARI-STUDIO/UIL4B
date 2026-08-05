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
> **Taking over / new to the project?** Read
> [`BUILD-PLAN.md`](docs/BUILD-PLAN.md) first — the lean current-state hub,
> linking only to the stable tool tree, homepage contract and owner/decision
> queues. Read only the sub-file you need.

---

## Working with me (Dylan)

Designer-turned-vibe-coder and entrepreneur; I work autonomously — hand me a task
and let me run. My instructions are often unstructured / out of order (ADHD
tendencies) — **pull them apart, regroup, and re-sequence before acting.** Full
PM operating model: [`project-manager.md`](docs/reference/project-manager.md).

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
- **[Project Manager](docs/reference/project-manager.md)** — how the PM parses +
  routes work. **The PM never writes code.**
- **[Tech Stack](docs/reference/tech-stack.md)** — frameworks, AI backends,
  client/server boundary.
- **[Architecture](docs/reference/architecture.md)** — pages, contexts,
  components, `/api` (12-function limit), analytics.
- **[Colour System Method](docs/reference/color-system-m3.md)** — M3-based colour
  method (seed → tonal palettes → roles → light/dark).
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
| Direction, what shipped, where open work is tracked | [`BUILD-PLAN.md`](docs/BUILD-PLAN.md) |
| **Every gate baseline number** (lint warnings, test counts) | [`build-and-verify.md`](docs/reference/build-and-verify.md) |
| Founder decisions, open and resolved | [`DECISIONS-NEEDED.md`](docs/DECISIONS-NEEDED.md) |
| Founder-only console / credential / live-service work | [`OWNER-ACTIONS.md`](docs/OWNER-ACTIONS.md) |
| Execution order, blockers, known-unfixed bugs | `src/data/pipeline.js` |
| Per-module product status | `src/data/moduleBoard.js` |
| Shipped release history | [`CHANGELOG.md`](CHANGELOG.md) |
| Tool structure, routes, Soon-vs-live | [`tool-tree.md`](docs/build-plan/tool-tree.md) |
| Homepage acceptance contract | [`HOMEPAGE-CHAOS-TO-CALM.md`](docs/build-plan/HOMEPAGE-CHAOS-TO-CALM.md) |

If a fact appears in two places, the table above wins and the other copy is a
bug — delete it and link instead. Git history is the archive; do not create
parallel historical planning docs. Subagent roster:
[`.claude/agents/README.md`](.claude/agents/README.md).

**Sourcing rule.** Never write that the founder approved, confirmed, decided or
published something unless you can point at where that is recorded — this table,
a commit, or a PR. If you can't source it, write what is verifiable or mark it
UNVERIFIED. Do not smooth over uncertainty.
