# UIL4B Subagent Roster

Specialised subagents for the **UIL4B** web-design toolkit (React 19 + Vite SPA on
Vercel; single class-based `src/styles/global.css`; Firebase Auth/Firestore; Stripe;
DeepSeek/Gemini AI; 12-function `/api` limit). The **PM / team-lead is the main
Claude thread**: it reads the request, routes work to the right agent(s) via the
Agent tool, relays their findings, and performs the actions subagents can't (opening
and squash-merging PRs via the GitHub MCP tools).

Every agent `Read`s `CLAUDE.md` at the start of a task, plus the relevant
`docs/reference/*.md` for its area (conventions, validation zones, constants),
and `docs/PRODUCT-AUDIT-2026-06-16.md` for the live state of the app.

## The 10 agents

| Agent | Model | Purpose (one line) |
|---|---|---|
| **research** | opus | First phase — market & competitor intelligence; cited, decision-ready strategy reports. |
| **design** | opus | AAA, agency-grade UI/UX specs and design reviews, grounded in references + behavioural science. |
| **seo** | opus | Technical + content + AI-search SEO; prioritised, data-backed organic-growth specs. |
| **engineer** | opus | The executor — turns approved specs into clean, convention-true React/CSS/`/api` code; verifies with a green build. |
| **code-reviewer** | sonnet | Severity-ranked code-QUALITY review of a diff (naming, complexity, errors, DRY, UX-state gaps) with `file:line` fixes. |
| **security-reviewer** | opus | OWASP-style security review of `/api`, authz, UGC, uploads, and fetches; concrete exploit + remediation per finding. |
| **secret-scanner** | haiku | Pre-commit hardcoded-secret detector; redacts matches, BLOCK/PASS verdict, knows the public-by-design values. |
| **qa** | sonnet | Final functional gate — PASS/FAIL on functionality, responsive, a11y, performance, UX states, honesty, SEO/meta. |
| **release-captain** | sonnet | Drives the branch through the gates; GO/NO-GO report + prepared PR title/body; hands the merge to the PM. |
| **analytics** | sonnet | Instrumentation specialist — audits the localStorage + `analytics-daily` layer and designs goal-aligned events/funnels. |

## Routing (task-dependent — no fixed chain)

There is **no fixed composition chain**. Every task varies in which agent(s)
handle it, and the goal is to use the **fewest agents that do the job well** —
each unnecessary agent burns context. The **PM (main thread) routes per task**;
the routing rules live in
[`docs/reference/project-manager.md`](../../docs/reference/project-manager.md).

Quick orientation (defaults, not a mandated sequence):

- **Advisory/strategy** tasks (research, seo, analytics, design reviews) usually
  need **one** agent — don't add gates that have nothing to gate.
- **Code changes** are implemented by **engineer** and always end at a green
  build; before a PR they pass **secret-scanner** + **code-reviewer**
  (+ **security-reviewer** for `/api`/auth/UGC/uploads) + **qa**.
- **release-captain** prepares the GO/NO-GO + PR and **hands off to the PM**,
  who opens and **squash-merges** via the GitHub MCP tools (only when asked).
- **Human Validation Zones** (auth, Stripe) are flagged to the founder for
  approval **before** any implementation.

## Enforcement principles

- **Verify-first build gate.** Nothing is "done" without a passing `npx vite build` (and `npx eslint .` with 0 errors). Agents never claim success without that evidence — "compiles" is not "works".
- **BLOCK on any CRITICAL.** Any CRITICAL from **security-reviewer** or **secret-scanner** (or a red build) is a hard **NO-GO** at the release gate — no overrides.
- **Human Validation Zones are founder-gated.** Auth (`AuthContext`, `AuthGate`, `GoogleOneTap`, `src/utils/firebase.js`, `api/verify-admin.js`) and all Stripe files are never edited without explicit approval; every agent flags rather than touches them.
- **Public-by-design is not a leak.** The Firebase web `apiKey`, the Stripe publishable key, and the Google client ID ship in the bundle on purpose (secured by rules + authorised domains). Real secrets are server-only `process.env`, never `VITE_`-prefixed.
