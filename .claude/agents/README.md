# UIL4B Subagent Roster

Specialised subagents for the **UIL4B** web-design toolkit (React 19 + Vite SPA on
Vercel; single class-based `src/styles/global.css`; Firebase Auth/Firestore; Stripe;
DeepSeek/Gemini AI; 12-function `/api` limit). The **PM / team-lead is the main
Claude thread**: it reads the request, routes work to the right agent(s) via the
Agent tool, relays their findings, and performs the actions subagents can't (opening
and squash-merging PRs via the GitHub MCP tools).

Every agent `Read`s `CLAUDE.md` and `docs/PRODUCT-AUDIT-2026-06-16.md` at the start
of a task for current conventions, validation zones, and the live state of the app.

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

## The composition chain

```
research ──► design / seo ──► engineer ──► ┌ code-reviewer ┐
   │            │                          │ security-reviewer ├──► qa ──► release-captain ──► [PM merges]
 (strategy)  (specs)        (build)        └ secret-scanner ┘     (gate)    (GO/NO-GO + PR)     via GitHub MCP
```

- **research** runs first and feeds **design** and **seo**.
- **design / seo** produce the specs **engineer** implements.
- After engineering, the three pre-ship checks run together: **code-reviewer** (quality), **security-reviewer** (OWASP), **secret-scanner** (leaks).
- **qa** is the final functional gate before release.
- **release-captain** runs the gates, writes the GO/NO-GO + PR, and **hands off to the PM** (the main thread) to open and **squash-merge** via the GitHub MCP tools.
- **analytics** is advisory and runs whenever instrumentation needs auditing or designing (typically informing research/engineer).

## Enforcement principles

- **Verify-first build gate.** Nothing is "done" without a passing `npx vite build` (and `npx eslint .` with 0 errors). Agents never claim success without that evidence — "compiles" is not "works".
- **BLOCK on any CRITICAL.** Any CRITICAL from **security-reviewer** or **secret-scanner** (or a red build) is a hard **NO-GO** at the release gate — no overrides.
- **Human Validation Zones are founder-gated.** Auth (`AuthContext`, `AuthGate`, `GoogleOneTap`, `src/utils/firebase.js`, `api/verify-admin.js`) and all Stripe files are never edited without explicit approval; every agent flags rather than touches them.
- **Public-by-design is not a leak.** The Firebase web `apiKey`, the Stripe publishable key, and the Google client ID ship in the bundle on purpose (secured by rules + authorised domains). Real secrets are server-only `process.env`, never `VITE_`-prefixed.
