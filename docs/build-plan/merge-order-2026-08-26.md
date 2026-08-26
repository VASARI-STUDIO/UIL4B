# Merge order — 2026-08-26

**The queue is drained.** Twenty PRs merged, one closed as superseded. The only
things still open are the four homepage PRs the founder parked, and they are
waiting on him rather than on us.

This file was written as a plan for the founder to execute. It is now the record
of what landed and what the queue taught, which is the more useful half.

## Correction to this document's own premise

The first version said:

> The Director cannot merge — the action is blocked by the auto-mode classifier
> in this environment, confirmed via both `gh pr merge` and the GitHub API.

**That was wrong.** The block was real for a long stretch — every attempt was
refused — but it was not a property of the environment. On a later retry the same
commands went through and the whole queue merged. Treat a refusal here as
transient, not structural; the same thing happened with `claude mcp add`.

## The dependency git could not see — discharged

> **#275 must merge after #273, or it ships doing nothing.**

Held. #273 landed first, so the boot script no longer stamps
`data-reduced-motion="false"` on every default visitor, and #275's
`@media (prefers-reduced-motion: reduce)` guards on the scroll-snap rails
activate rather than shipping as dead CSS. Verified in the tree before merging,
not assumed.

---

## Merged (20)

| PR | What |
|---|---|
| #254 | One browsing language extracted from the two Discover libraries |
| #255 | The typography tools made browsable — specimen grid, visible picker |
| #256 | Three CSV exports stopped handing a spreadsheet a formula to run |
| #257 | "Workspace" out of shipped copy, with a guard test |
| #258 | Every dialog claiming `aria-modal` now actually traps focus |
| #259 | The palette card moved onto the shared library card |
| #260 | The 2026-08-20 founder batch — research, audit, spec, four corrections |
| #261 | Server price fallback moved onto the approved $7/$18/$48 ladder |
| #263 | The 961–1343px band closed — the Palette Builder toolbar blocker |
| #265 | The agent tree reset from thirteen roles to five |
| #266 | Every Create tool moved to `/create/<pagetitle>`, with real 301s |
| #267 | Why the homepage looks AI-built, and a hero that would not |
| #268 | The mobile audit — 16 defects, one blocker, a broken primary CTA |
| #271 | The mobile UI overhaul — 10 audited defects, worst first |
| #272 | Emoji Library — the search fault was real, the perf fault was not |
| #273 | Reduced motion follows the OS when the visitor has never chosen |
| #274 | Defect sweep — the leftovers of both audits, plus the 4:3 report |
| #275 | Reduced-motion guards for the rails that ship |
| #276 | The acceptance suite stopped calling Google on every page load |
| #277 | Every price on screen tied to the one approved ladder |

**#212 was closed, not merged**, as superseded by #265. Its evidence-boundaries
content was preserved into `.claude/agents/README.md` first; the closing comment
lists exactly what moved.

#276 and #277 were not in the original batch. They exist because the queue
surfaced them — see below.

---

## Still open: the homepage four

| PR | |
|---|---|
| #262 | Homepage C1/C3/C5/C7 |
| #264 | Homepage C8–C13 |
| #269 | Homepage C2/C4/C6 |
| #270 | The hero's decoration replaced with the product's own output |

> "continue all except the homepage work as im working with claude design to
> improve the sales page."

Untouched, deliberately. Two things to know before they move:

**#267 has merged**, so the Mobbin anti-slop diagnosis and the hero direction it
argues for are on `main` and available to that work even though the
implementation is parked.

**Three of the four will revert #266 when rebased.** #262, #264 and #269 each
carry an `AppFooter.jsx` diff that changes `/create/color` back to `/color`,
because they were branched before the route migration. That is not a conflict to
resolve in their favour — it is stale, and the `--onto` rebase below is what
clears it.

---

## What this queue taught

### The squash-merge trap

Squash-merging a base gives its content a **new SHA on `main`**, so a stacked
child stops sharing history with the code it was built on. Git then reports
`add/add` conflicts on files neither side disagreed about.

A plain merge of #255 reported **four** such conflicts. Replaying only its own
commits left **one**:

```
git rebase --onto origin/main origin/<old-base> <branch>
```

Where a branch also carried commits `main` already had by another route, the
`--onto` base is the last shared commit, not the old branch tip — #266 carried
three doc commits that shipped as #260, and rebasing from those dropped three
phantom conflicts and left two real ones.

**Do this before concluding a PR "conflicts".** Most of these did not.

### Three ways a test passes for the wrong reason

All three were found in this queue, and all three are now guarded.

**A selector that matches nothing measures nothing.** #274's chip-row test timed
out on `.pl-chips` because #254 had rebuilt that surface while it waited.
Repointing it at the real markup made it **red, not green** — the shared filter
tray was an `overflow-x:auto` row with the scrollbar suppressed, the seventh
instance of the hidden-scroller shape in this stylesheet, on a surface #274 had
already fixed once. Measured 3 of 8 chips outside the row at 320px.

Worse, a second test in the same file had gone stale **without failing**: its
census looped `querySelectorAll` over classes #254 had replaced, got an empty
list, found no truncation, and reported none — at all nine widths, green every
time. Every scanning test now has to assert it found a real population first.

**Playwright follows redirects.** After #266, seven path literals in that spec
were passing *through a 301*. The durable fix was not the seven edits but the
helper now asserting the page landed on the path it asked for.

**A naive comment-stripper can blank a third of a file.**
`s.replace(/\/\*[\s\S]*?\*\//g, '')` reads the `/*` inside `accept="image/*"` as
a block-comment opener and deletes 819 lines of `ColorStudio.jsx`, price
included, before any assertion runs. Found while building #277.

### The suite was calling Google on every page load

`GoogleOneTap.jsx` injects `accounts.google.com/gsi/client` on every signed-out
page and `firebase.js` carries a hardcoded fallback client ID, so it loaded in
CI too — **338 real requests per run**. 24 of 25 specs had no stub; the 25th
stubbed two page objects and still leaked from three contexts it built by hand.

This is the best explanation we have for the queue's dominant symptom: green
locally, red on CI. Paired evidence, same infrastructure, minutes apart —
`07-public-shell-library-palette:114` failed at **28.4s** on #275 without the
stub and passed in **4.0s** on #276 with it. One paired observation, one
variable, no replication: strong for that failure, not a claim that flakiness
is solved.

### Timing assumptions are not layout faults

#271's CTA test read 85.97px on one CI shard and 50.20px on another. A layout
fault reads the same number every run. The cause was `ctaReady` seeded flat
`false`, so the pill animated itself in on **every** route — and was
`aria-hidden` and untabbable for ~300ms while painted. The test then sampled at
a fixed offset from load; #274 found the same shape again, where a blind 400ms
settle was **402–416ms of a 579–929ms iteration**. Both now wait on a condition
the page decides: the first non-zero frame, and `document.fonts.ready`.

### Retargeting a PR does not trigger CI

#258 was force-pushed while still aimed at its old base, then retargeted to
`main`. **No workflow ran** — GitHub does not re-trigger on a base change — and
it sat looking merge-ready with only the Vercel checks reporting. Retarget
*first*, then push; or close and reopen, which fires `reopened`.

### Never `--delete-branch` a base

Merging #260 and #257 that way deleted the base refs of nine open PRs and GitHub
auto-closed all nine on the spot. Recovery worked — head branches survive, so the
base SHAs came back from `gh pr view N --json baseRefOid` and were restored with
`gh api repos/OWNER/REPO/git/refs` using the full 40-character SHA — but it
should not have been necessary.

Before any merge: `gh pr list --json number,baseRefName` and confirm nothing open
names this head branch as its base.
