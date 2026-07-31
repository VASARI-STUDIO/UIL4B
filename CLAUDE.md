# UIL4B — The UI System Workspace

UIL4B is the **operating workspace for UI system creation** — build, organize,
validate, and export interface foundations without tab-hopping. One product, one
account, one Stripe subscription, three surfaces: **Workspace** (currently
labelled Create in parts of the product), **Discover**, and **Learn**. React 19
SPA (Vite + Vercel); Firebase Auth + Firestore; Stripe subscriptions; OpenRouter
AI with Gemini fallback.

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

**State & planning (canonical map):**
[`BUILD-PLAN.md`](docs/BUILD-PLAN.md) owns direction, current truth, the active
batch and release gaps; `src/data/pipeline.js` owns execution order, blocks and
workstream progress; `src/data/moduleBoard.js` owns per-module status;
[`OWNER-ACTIONS.md`](docs/OWNER-ACTIONS.md) owns unresolved founder-only
dashboard/credential work; [`DECISIONS-NEEDED.md`](docs/DECISIONS-NEEDED.md)
owns unresolved founder calls plus the compact resolved-decision record.
[`docs/build-plan/tool-tree.md`](docs/build-plan/tool-tree.md) and
[`docs/build-plan/HOMEPAGE-CHAOS-TO-CALM.md`](docs/build-plan/HOMEPAGE-CHAOS-TO-CALM.md)
are the retained stable implementation references. Git history is the archive;
do not create parallel historical planning docs. Subagent roster:
[`.claude/agents/README.md`](.claude/agents/README.md).
