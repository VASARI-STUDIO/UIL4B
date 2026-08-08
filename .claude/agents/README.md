# UIL4B agent roster

UIL4B uses specialised agents for accountable roles and project-scoped skills
for reusable methods and knowledge. The main thread is the **Director**: it
understands the request, loads current context, and routes the fewest agents
needed for the outcome. Its operating doc is
[`docs/reference/director.md`](../../docs/reference/director.md).

## Agent and skill boundary

| Layer | Owns | Must not own |
|---|---|---|
| Agent | Role, judgement, evidence, hand-off, stop conditions | Replaceable brand values, framework details, duplicated project facts |
| Skill | Reusable workflow, quality bar, and domain knowledge | Task status or a fictional persona |
| Project docs | Current product, architecture, constraints, and policy | Generic methods already expressed by a skill |
| Live code | Implemented behaviour and tokens | Unreviewed product or brand strategy |
| Private wiki | Long-term research, synthesis, and learning | A hidden runtime dependency for the repository |

Knowledge from the private Vasari Studio wiki must be distilled into a
repository-local skill or project document before an app agent depends on it.
Never add an absolute vault path to an agent.

Brand literals and visual-system decisions belong to
`.claude/skills/uil4b-brand-design/` and the live sources it references. They do
not belong in `design.md`.

## Sources of truth

Resolve conflicts in this order:

1. The user's current explicit instruction.
2. `CLAUDE.md` and canonical `docs/reference/` decisions.
3. The approved task specification and acceptance criteria.
4. Relevant project skills.
5. The current implementation and tests.
6. General best practice and external references.

Current delivery state has two homes: `src/data/pipeline.js` for the queue,
blockers and known-unfixed bugs, and `CHANGELOG.md` for shipped history and the
founder decisions behind each release. Product direction is in `CLAUDE.md`.
Agents should read source documents rather than copying facts that will drift.

## The ten agents

| Agent | Model | Accountable outcome |
|---|---|---|
| **research** | claude-sonnet-5 | Cited, decision-ready evidence about a defined market, user, or technical question. |
| **design** | claude-opus-5 | Coherent user flows, experience direction, anti-slop critique, and buildable acceptance criteria. |
| **seo** | claude-sonnet-5 | Prioritised technical and content search improvements supported by current evidence. |
| **engineer** | claude-opus-5 | The smallest complete implementation with runtime and build evidence. |
| **code-reviewer** | claude-sonnet-5 | Severity-ranked outcome and code-quality findings with line-level evidence. |
| **security-reviewer** | claude-opus-5 | Threat-focused review and concrete remediation for security-sensitive changes. |
| **secret-scanner** | claude-sonnet-5 | Pre-commit secret and credential-leak verdict with safe redaction. |
| **qa** | claude-sonnet-5 | End-to-end functional verdict across requirements, states, viewports, and accessibility. |
| **release-captain** | claude-sonnet-5 | Evidence-based release readiness and prepared hand-off to the Director. |
| **analytics** | claude-sonnet-5 | Measurement plans and instrumentation that answer defined product questions. |

Model assignments are a founder decision. Keep this table and each agent's
`model:` field in sync.

## Core-agent skill routing

| Agent | Always or conditionally load |
|---|---|
| **design** | `uil4b-brand-design` for all brand-facing work; target project sources; accessibility and research standards as needed |
| **engineer** | `incremental-implementation` or `debugging-and-error-recovery`; `frontend-ui-engineering` and `uil4b-brand-design` for user-facing UI; browser and performance skills when relevant |
| **code-reviewer** | Approved criteria and diff; `frontend-ui-engineering` and `uil4b-brand-design` for user-facing changes |
| **qa** | Build-and-verify and Murphy-state references; `browser-testing-with-devtools` and `skene-webapp-testing` for rendered flows; `skene-accessibility-audit` for access barriers |
| **research** | Primary-source and citation discipline; product positioning before interpreting external material |

Loading a skill does not give an agent authority outside its role. For example,
the reviewer may use the brand quality bar but remains read-only.

## Routing

There is no mandatory agent chain. Use the fewest agents that cover the task:

- Advisory work normally needs one accountable specialist.
- Product or brand ambiguity goes to `design` before implementation.
- A clear, bounded implementation goes directly to `engineer`.
- A related cluster receives one combined `code-reviewer` and `qa` pass before
  release, not one pass per micro-edit.
- Changes involving API boundaries, authentication, billing, uploads, user
  content, or credentials receive the specialist security gates required by
  `docs/reference/director.md`.
- `release-captain` prepares release evidence; the main thread performs external
  GitHub actions only when the user authorises them.

## Non-negotiable gates

- Follow `docs/reference/build-and-verify.md`; compilation alone is not runtime
  verification.
- Follow `docs/reference/human-validation-zones.md`; do not duplicate or guess
  its protected scope.
- Critical security findings, leaked secrets, and a red required build are hard
  release blockers.
- Preserve unrelated local work and state assumptions or untested boundaries.
- Never fabricate research, analytics, product proof, testimonials, or success.

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

## Keeping the system current

When project truth changes, update its canonical document or code source. When a
reusable method improves, update its skill. When founder feedback reveals a
durable identity preference, use the brand skill's learning loop. Change an agent
only when its role, judgement, evidence standard, or hand-off needs to change.
