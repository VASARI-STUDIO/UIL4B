# Git Workflow

> Reference doc for UIL4B. Linked from `CLAUDE.md`.

## Branching

- **Always work on the designated feature branch** — never commit directly to
  `main`.
- Create the feature branch locally if it doesn't exist yet.
- **Never push to a different branch** without explicit permission.

## Committing

- **Descriptive, component-prefixed messages** (e.g. `cs:`, `adm:`, `aipg:`,
  `docs:`) describing what changed and why.
- Commit only when the work is verified (build passes — see
  `build-and-verify.md`).
- **Never force-push** without explicit permission.

## Pushing

```bash
git push -u origin <branch-name>
```

- On **network failure only**, retry up to 4 times with exponential backoff
  (2s, 4s, 8s, 16s).

## Merging to `main`

- **Via PR only.** Direct push to `main` returns **503**.
- **Do NOT open a pull request unless the user explicitly asks for one.**
- The Director (main thread) opens and squash-merges PRs; subagents cannot.
  See `director.md`.

## Release gate (when a PR is requested)

Before a PR is prepared, the branch passes the quality gates:

1. Clean tree, on the feature branch (not `main`).
2. `npm run build` passes.
3. `npx eslint .` is clean.
4. One `reviewer` pass — secrets, correctness and security in a single
   verdict — **BLOCK on any critical**.
5. Version + CHANGELOG updated.

The **Director** drives this and executes the merge. The former
`release-captain` agent was retired on 2026-08-20 because it duplicated the
Director, which already owns release verification and merging — see
[`.claude/agents/README.md`](../../.claude/agents/README.md).

---

## What a merge queue teaches

Twenty PRs were merged out of one stacked queue in August 2026. These are the
things that cost time, recorded so they cost it once. They are not general Git
advice — every one of them was measured here.

### Before you merge anything: check who is standing on this branch

**Never `--delete-branch` a base.** Merging two PRs that way deleted the base
refs of **nine** open PRs, and GitHub auto-closed all nine on the spot. Recovery
worked — head branches survive, so the base SHAs came back from
`gh pr view N --json baseRefOid` and were restored with
`gh api repos/OWNER/REPO/git/refs` using the full 40-character SHA — but it
should never have been needed.

```bash
gh pr list --json number,baseRefName   # nothing open may name this head as its base
```

### A merge refusal here is transient, not structural

For a long stretch every merge attempt was refused — via `gh pr merge` and via
the GitHub API alike — and that was written down as a property of the
environment. **It was not.** On a later retry the same commands went through and
the whole queue merged. The same pattern showed up with `claude mcp add`. Retry
before concluding you are blocked, and do not encode a refusal as a permanent
fact in a document.

### The squash-merge trap

Squash-merging a base gives its content a **new SHA on `main`**, so a stacked
child stops sharing history with the code it was built on. Git then reports
`add/add` conflicts on files neither side disagreed about. A plain merge of one
branch here reported **four** such conflicts; replaying only its own commits left
**one**.

```bash
git rebase --onto origin/main origin/<old-base> <branch>
```

Where a branch also carries commits `main` already has by another route, the
`--onto` base is **the last shared commit, not the old branch tip** — one branch
carried three doc commits that had shipped inside a different PR, and rebasing
from those dropped three phantom conflicts and left two real ones.

**Do this before concluding a PR "conflicts".** Most of them did not.

### A guard test is only ever validated against its own base

A PR that adds a test asserting something about the working tree is green
because CI ran it **against that PR's base**, not against current `main`. One PR
here added a test banning a string from `src/pages/Home.jsx`; a rebuild of that
page landed on `main` afterwards and reintroduced the exact string. The PR
showed green and would have landed red.

**Rebase a guard-test PR onto `main` and re-run before merging it**, or simulate
the test's own logic against current `main` first.

### Retargeting a PR does not trigger CI

A PR was force-pushed while still aimed at its old base, then retargeted to
`main`. **No workflow ran** — GitHub does not re-trigger on a base change — and
it sat looking merge-ready with only the deploy checks reporting. Retarget
*first*, then push; or close and reopen, which fires `reopened`.

### Three ways a test passes for the wrong reason

All three were found in this queue, and all three are now guarded.

**A selector that matches nothing measures nothing.** A chip-row test timed out
because another PR had rebuilt that surface while it waited. Repointing it at the
real markup made it **red, not green**. Worse, a second test in the same file had
gone stale *without failing*: its census looped `querySelectorAll` over classes
that had been replaced, got an empty list, found no truncation, and reported
none — at all nine widths, green every time. **Every scanning test must assert it
found a real population before it asserts anything about that population.**

**Playwright follows redirects.** After the `/create/*` route migration, seven
path literals in one spec were quietly passing *through a 301*. The durable fix
was not the seven edits — it was the helper now asserting the page landed on the
path it asked for.

**A naive comment-stripper can blank a third of a file.**
`s.replace(/\/\*[\s\S]*?\*\//g, '')` reads the `/*` inside `accept="image/*"` as
a block-comment opener and deletes 819 lines of a page component, price
included, before any assertion runs.

### Timing assumptions are not layout faults

A CTA test read 85.97px on one CI shard and 50.20px on another. **A layout fault
reads the same number every run.** The cause was a flag seeded flat `false`, so
the pill animated itself in on every route and was `aria-hidden` and untabbable
for ~300ms while painted; the test sampled at a fixed offset from load. The same
shape turned up again where a blind 400ms settle was 402–416ms of a 579–929ms
iteration. **Wait on a condition the page decides** — the first non-zero frame,
`document.fonts.ready` — never on a number you chose.

### Third-party network calls leak into CI

A One Tap component injected `accounts.google.com/gsi/client` on every
signed-out page, and the Firebase config carried a hardcoded fallback client ID,
so it loaded under test too — **338 real requests per run**. 24 of 25 specs had
no stub; the 25th stubbed two page objects and still leaked from three contexts
it built by hand.

This is the best explanation we have for the queue's dominant symptom: **green
locally, red on CI**. Paired evidence, same infrastructure, minutes apart — one
spec failed at **28.4s** without the stub and passed in **4.0s** with it. That is
one paired observation with one variable and no replication: strong for that
failure, not a claim that flakiness is solved.
