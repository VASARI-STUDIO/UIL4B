# UIL4B agent roster

The main thread is the **Director** — the agent Dylan talks to. Its operating
doc is [`docs/reference/director.md`](../../docs/reference/director.md). It
routes the fewest agents needed and never writes code.

**Five agents.** Reset from thirteen on 2026-08-20 at the founder's instruction
("simplify our agent tree… we need a soft reset"). What changed and why is in
[Retired roles](#retired-roles-2026-08-20) at the bottom — read it before
proposing a sixth.

## The rule that keeps this small

**Agents are roles. Skills are knowledge.**

| | Owns | Count |
|---|---|---|
| **Agent** | Accountability, judgement, hand-off, stop conditions | Few, stable |
| **Skill** | A reusable method, checklist or quality bar | Many, on demand |

Most of the thirteen were **methods wearing a role's clothes**. An SEO audit, a
usability protocol, an accessibility sweep and a release checklist are things an
accountable agent *does*; they are not separate accountabilities. Several of
them duplicated skills that already existed, so the roster carried the
maintenance cost of thirteen briefs to deliver five real roles.

Before adding an agent, ask: *is this a new kind of accountability, or a method
an existing role should load?* If it is a method, write a skill.

## The five

| Agent | Model | Accountable outcome |
|---|---|---|
| **research** | `claude-opus-5` | Cited, decision-ready evidence — market, users, and **interface patterns via Mobbin** — with every claim carrying its evidence class. |
| **design** | `claude-opus-5` | Direction, flows, specifications and anti-slop critique that an engineer can build without guessing. |
| **engineer** | `claude-opus-5` | The smallest complete implementation, with a green gate and rendered proof. |
| **reviewer** | `claude-opus-5` | One severity-ranked verdict covering correctness, security and secrets, with line-level evidence. |
| **qa** | `claude-sonnet-5` | Whether it actually works — rendered, across viewports, keyboard and assistive paths. |

**Model assignments are a founder decision.** Three changed in this reset and
each is flagged for Dylan to overrule:

- **research** sonnet → **opus**. It absorbs `ux-researcher` (was opus), and the
  Mobbin pattern research on 2026-08-20 ran on opus and produced 95 cited
  references with honest confidence labelling.
- **reviewer** → **opus**, taking the highest of the three it merges
  (`security-reviewer` was opus). A merged reviewer that misses a security
  finding is worse than three that overlap.
- **qa** stays **sonnet**. Rendered verification is mechanical and high-volume.

Keep this table and each agent's `model:` field in sync. Three files previously
drifted to bare `opus` / `sonnet` while the rest used full ids; all five now use
full ids.

## Tools — and the gap this reset fixes

**Not one of the previous thirteen agents could use Mobbin.** `design` and
`research` were granted `WebSearch, WebFetch, Read, Grep, Glob` and no
`mcp__mobbin__*` tool at all. So when the founder asked on 2026-08-20 to "let
the design agent use mobbin and the research agents", the roster made that
structurally impossible — every Mobbin result that day came from a
general-purpose agent briefed by hand.

`research` and `design` now hold the Mobbin tools explicitly. That was the
single most expensive defect in the old tree, because it silently produced
taste-based design work while looking like researched design work.

### ⚠ Pending: grant `motionsites` to `research` and `design`

The founder registered a **`motionsites`** MCP server on 2026-08-23 specifically
to close the gap Mobbin cannot: **Mobbin is a stills library and is silent on
motion, timing and easing.** Two deliverables have already had to label their
motion recommendations `judgement` for exactly this reason — the workbench
tab-switch transition and the search-bar typing animation.

**This is not done yet.** The server's tool names must be read from a live
connection and added to the `tools:` line of `research.md` and `design.md`. Do
not guess them — guessing is how the Mobbin grant was missing in the first
place. Once granted, the standing rule is:

> **Mobbin for structure, layout, labelling and state. `motionsites` for motion,
> timing and easing.** A motion recommendation that cites neither is
> `judgement`, and must say so.

| Agent | Writes files | Runs commands | Browser | Web | Mobbin |
|---|---|---|---|---|---|
| research | no | no | no | yes | **yes** |
| design | no | no | no | yes | **yes** |
| engineer | **yes** | **yes** | yes | no | no |
| reviewer | no | yes | no | no | no |
| qa | no | yes | **yes** | no | no |

Only `engineer` writes. A reviewer that can edit is not a reviewer.

## Skills, loaded on demand

Knowledge lives here, not in a persona.

| Need | Skill |
|---|---|
| Brand identity, anti-slop vocabulary | `uil4b-brand-design` |
| Running a visual / responsive review on a rendered surface | `uil4b-surface-review` |
| Building UI | `frontend-ui-engineering` |
| Landing a change in slices | `incremental-implementation` |
| Root-causing a failure | `debugging-and-error-recovery` |
| Rendered browser testing | `browser-testing-with-devtools` |
| Performance work | `performance-optimization` |
| Writing a spec first | `spec-driven-development` |
| SEO audit | `skene-seo-audit` |
| Accessibility audit | `skene-accessibility-audit` |
| Usability testing protocol | `usability-testing` |
| Conversion review | `skene-page-cro` |

The last four are why four agents were retired: the method already existed as a
skill, so the agent added a brief to maintain and nothing else.

Loading a skill grants no authority outside the role. The reviewer may use the
brand quality bar and still cannot edit a file.

## Sources of truth

Resolve conflicts in this order:

1. The founder's current explicit instruction.
2. `CLAUDE.md` and canonical `docs/reference/` decisions.
3. The approved specification and acceptance criteria.
4. Relevant project skills.
5. The current implementation and tests.
6. General best practice.

Delivery state has two homes: `src/data/pipeline.js` for the queue, blockers and
known-unfixed bugs, and `CHANGELOG.md` for shipped history and the founder
decisions behind it. Read source documents; do not copy facts that will drift.

## What UIL4B is

The **operating workspace for UI system creation** — build, organise, validate
and export interface foundations without tab-hopping. Three surfaces: **Create**
(build; the primary live surface), **Discover** (community + curated resources),
**Learn** (honest coming-soon).

> Do not describe this as a "UI-inspiration platform" — that framing is retired.
> `CLAUDE.md` Direction is canonical; if this file disagrees with it, this file
> is the bug.

## Evidence boundaries — binding on every agent

Four kinds of evidence answer four different questions. No agent may present one
as another, and no agent may produce the two we currently cannot gather.

| Branch | Answers | Available to agents |
|---|---|---|
| Rendered verification | Does it do what it claims in a real browser? | **Yes** — `qa`, and any agent with `Bash` + Playwright |
| Accessibility evaluation | Does it meet access requirements? | **Yes**, except screen-reader output and physical touch devices |
| Usability evidence | Can representative people complete and understand the task? | **No** — requires observed participants |
| Discovery / demand | What do people need, and would they pay? | **No** |

**UIL4B has no shipped activation instrumentation and no user-feedback intake**
(P-001 and P-002 are approved but unbuilt). Until they land, an agent asked for
"user testing" delivers rendered and accessibility verification and **says so**;
it does not invent participants, sessions, quotes, satisfaction levels or
task-success rates. Predicted user confusion is a hypothesis and must carry that
label. "Not run" is always a valid answer; a fabricated finding never is.

**Severity is five dimensions, not one.** Impact, frequency (with its
denominator), recovery, reach and confidence are judged independently before a
tier is assigned. A rare safety, privacy, data-loss or accessibility blocker can
stop a release on impact alone; a constant cosmetic wobble does not become a P0
by being constant.

**Reject proxy substitution.** Tour completion is not value; time-on-page is not
success; aesthetic preference is not task performance; a green build is not a
working feature.

### Evidence classes

Every claim carries one, honestly. Weakest is allowed; disguised is not.

| Class | Means |
|---|---|
| `measured` | Instrumentation, a metric, a test, a reproduction |
| `observed` | A founder or user report, a review, a support message |
| `inferred` | Derived from code, a competitor, or a known pattern |
| `judgement` | Taste and experience, nothing behind it yet |

If the honest label is `judgement`, write `judgement` — and say what evidence
would settle it.

## Routing

No mandatory chain. Use the fewest agents that cover the task.

| Task | Route |
|---|---|
| Pattern, market or user question | `research` |
| Ambiguous product or brand direction | `design` (after `research` if references are missing) |
| A clear, bounded change | `engineer` |
| A new end-to-end surface | `research` → `design` → `engineer` → `reviewer` + `qa` |
| A diff to check | `reviewer` |
| Does it actually work? | `qa` |

**Security is never batched away.** Anything touching `/api`, auth, Stripe or
user-generated content takes a `reviewer` pass every time, and the reviewer runs
its secret scan on every diff rather than as a separate invocation.

**Brief properly.** Most failures in this project came from briefs, not models:
scope too large to finish in one session, or so loose the agent invented work.
State the scope, the known root cause if there is one, what is out of bounds,
the current gate baselines, and that merging is the Director's job.

**Commit early.** Session limits have killed slices mid-flight. A committed
partial slice is recoverable; an uncommitted one is not.

## Retired roles, 2026-08-20

Nothing here was deleted for being bad. Each was a method that belongs in a
skill, or an accountability another role already held.

| Retired | Where it went |
|---|---|
| `ux-researcher` | → `research`. Two research roles split evidence for no gain. |
| `usability-tester` | → `qa` + the `usability-testing` skill. Its real output was rendered verification, which `qa` owns — and the evidence boundaries above forbid it claiming more. |
| `code-reviewer` | → `reviewer` |
| `security-reviewer` | → `reviewer`, which inherits opus for this reason |
| `secret-scanner` | → `reviewer`, run on **every** diff rather than as a separate step it was easy to skip |
| `seo` | → `research` + the `skene-seo-audit` skill |
| `analytics` | → `research` for measurement design, `engineer` for instrumentation |
| `monetisation` | → `design` for the offer, `engineer` for the limits. It also held `Write` + `Bash` over Human Validation Zone files, which is authority a specialist advisory role should not have carried |
| `release-captain` | → the **Director**, which already owns verification and merging per `director.md`. This one duplicated the main thread outright |

**Git history is the archive.** These files are recoverable from it; they were
not copied into a parallel doc.
