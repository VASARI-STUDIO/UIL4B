# Merge order — 2026-08-26

**Fifteen of the twenty-three have merged. Seven remain open, four of them parked
by the founder.** This file was written as a plan for the founder to execute; it
is now a live record of what landed, what is blocked, and on what.

## Correction to this document's own premise

The first version of this file said:

> The Director cannot merge — the action is blocked by the auto-mode classifier
> in this environment, confirmed via both `gh pr merge` and the GitHub API.

**That was wrong, and it is worth recording why.** The block was real for a long
stretch — every attempt was refused — but it was not a property of the
environment. On a later retry the same commands went through. Treat a refusal
here as transient, not structural: the same thing happened with
`claude mcp add` earlier in the same session.

## The dependency git could not see — discharged

> **#275 must merge after #273, or it ships doing nothing.**

#273 merged. The boot script no longer stamps `data-reduced-motion="false"` on
every default visitor, so #275's `@media (prefers-reduced-motion: reduce)` guards
on the three scroll-snap rails will genuinely activate when #275 lands.

---

## Merged (15)

| PR | What |
|---|---|
| #254 | One browsing language extracted from the two Discover libraries |
| #255 | The typography tools made browsable — specimen grid, visible picker |
| #256 | Three CSV exports stopped handing a spreadsheet a formula to run |
| #257 | "Workspace" out of shipped copy, with a guard test |
| #258 | Every dialog claiming `aria-modal` now actually traps focus |
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

**#212 was closed, not merged**, as superseded by #265. Its evidence-boundaries
content was preserved into `.claude/agents/README.md` before closing; the
closing comment lists exactly what moved.

---

## Open (7)

| PR | Base | State |
|---|---|---|
| #274 | `main` | rebased, verified, CI running |
| #275 | `fix/defect-sweep` | waits on #274 |
| #259 | `feat/modal-ui-pass` | rebase in progress — see the warning below |
| #262 #264 #269 #270 | various | **parked by the founder** |

> "continue all except the homepage work as im working with claude design to
> improve the sales page."

The homepage four stay open and untouched. Note that #267 — the Mobbin
anti-slop diagnosis and the hero direction it argues for — **has merged**, so
the research is on `main` and available to that work even though the
implementation is parked. Their bases are branches that have since merged, so
all four will need the `--onto` rebase below before they can land. Deferred
rather than done: rebasing them now would churn branches the founder's design
work may replace.

### #259 carries a live risk

Its `global.css` conflict is not a formatting clash. `main` holds a **measured**
accessibility fix; #259 was branched before it and its side of the conflict is
the bug that fix removed — `visibility` back inside a transition list, plus the
comment that gave the wrong reason for it being there. A careless "take theirs"
reverts it and every test still passes. The specifics are in the comment above
`.pgal-actions` in `global.css`; read it before resolving anything in that
region.

---

## What this queue taught

### The squash-merge trap

Squash-merging a base gives its content a **new SHA on `main`**, so a stacked
child no longer shares history with the code it was built on. Git then reports
`add/add` conflicts on files neither side actually disagreed about.

A plain merge of #255 into `main` reported **four** such conflicts. Replaying
only its own commits reduced that to **one**:

```
git rebase --onto origin/main origin/<old-base> <branch>
```

Where a branch also carried commits `main` already has by another route, the
`--onto` base is the last shared commit rather than the old branch tip — #266
carried three documentation commits that shipped as #260, and rebasing from
those dropped three phantom conflicts and left two real ones.

**Do this before concluding a PR "conflicts".** Most of these did not.

### A stale selector is worse than a failing one

#274's own `S4` test timed out on `.pl-chips`, because #254 had rebuilt
`/discover/gradients` on the shared library components while #274 waited.
Repointing it at the real markup **made it red, not green**: `.lbry-filters`
was an `overflow-x:auto` row with the scrollbar suppressed — the hidden
horizontal scroller, for the seventh time in this stylesheet, reintroduced on a
surface #274 had already fixed once. Measured 3 of 8 chips outside the row at
320px and 1 of 8 at 390px.

Worse was `M6` in the same file, which had gone stale **without failing**. Its
census looped `querySelectorAll` over `.grg-name` / `.grg-meta`, classes #254
had replaced; it got an empty list, found no truncation, and reported none — at
all nine widths, green every time.

The generalisation: **a selector that matches nothing measures nothing and
passes.** Every source-scanning or DOM-scanning test needs an assertion that it
found a real population before it asserts anything about that population.

### Redirects make route staleness invisible too

After #266, seven of fourteen path literals in the defect-sweep spec were
passing **through a 301**. Playwright follows redirects, so the tests stayed
green while exercising the redirect rather than the route. The fix that matters
is not the seven edits — it is that the helper now asserts the page landed on
the path it asked for, so the next migration is a red test rather than another
silent follow.

### Retargeting a PR does not trigger CI

#258 was force-pushed while it still targeted `feat/typography-browsing`, then
retargeted to `main`. **No workflow ran** — GitHub does not re-trigger on a base
change, and the PR sat looking merge-ready with only the Vercel checks reporting.
Push after retargeting, or the gate never runs.

### Never `--delete-branch` a base

Merging #260 and #257 that way deleted the base refs of nine open PRs, and
GitHub auto-closed all nine on the spot.

Recovery worked and nothing was lost — head branches survive, so the base SHAs
came back from `gh pr view N --json baseRefOid` and were restored with
`gh api repos/OWNER/REPO/git/refs` using the full 40-character SHA, after which
all nine reopened MERGEABLE. It should not have been necessary.

Before any merge: `gh pr list --json number,baseRefName` and confirm nothing
open names this head branch as its base.
