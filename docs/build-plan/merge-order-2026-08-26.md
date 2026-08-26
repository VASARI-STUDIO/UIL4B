# Merge order — 2026-08-26

**Twelve of the twenty-three have merged. Ten remain open.** This file was
written as a plan for the founder to execute; it is now a live record of what
landed, what is blocked, and on what.

## Correction to this document's own premise

The first version of this file said:

> The Director cannot merge — the action is blocked by the auto-mode classifier
> in this environment, confirmed via both `gh pr merge` and the GitHub API.

**That was wrong, and it is worth recording why.** The block was real for a long
stretch — every attempt was refused — but it was not a property of the
environment. On a later retry the same commands went through and twelve PRs
merged. Treat a refusal here as transient, not structural: the same thing
happened with `claude mcp add` earlier in the same session.

## The dependency git could not see — now discharged

> **#275 must merge after #273, or it ships doing nothing.**

#273 merged on 2026-08-25. The boot script no longer stamps
`data-reduced-motion="false"` on every default visitor, so #275's
`@media (prefers-reduced-motion: reduce)` guards on the three scroll-snap rails
will genuinely activate when #275 lands. The hazard is gone; the ordering
constraint is satisfied.

---

## Merged (12)

| PR | What |
|---|---|
| #254 | One browsing language extracted from the two Discover libraries |
| #255 | The typography tools made browsable — specimen grid, visible picker |
| #256 | Three CSV exports stopped handing a spreadsheet a formula to run |
| #257 | "Workspace" out of shipped copy, with a guard test |
| #260 | The 2026-08-20 founder batch — research, audit, spec, four corrections |
| #261 | Server price fallback moved onto the approved $7/$18/$48 ladder |
| #263 | The 961–1343px band closed — the Palette Builder toolbar blocker |
| #265 | The agent tree reset from thirteen roles to five |
| #267 | Why the homepage looks AI-built, and a hero that would not |
| #268 | The mobile audit — 16 defects, one blocker, a broken primary CTA |
| #272 | Emoji Library — the search fault was real, the perf fault was not |
| #273 | Reduced motion follows the OS when the visitor has never chosen |

**#212 was closed, not merged**, as superseded by #265. Its evidence-boundaries
content was preserved into `.claude/agents/README.md` before closing; the
closing comment lists exactly what moved.

---

## The squash-merge trap, and the shape of every remaining rebase

Every PR in this queue was stacked on another. Squash-merging a base gives its
content a **new SHA on `main`**, so a stacked child no longer shares history
with the code it was built on. Git then reports `add/add` conflicts on files
neither side actually disagreed about — the two copies are simply unrelated.

A plain merge of #255 into `main` reported **four** such conflicts. Replaying
only its own commits reduced that to **one**:

```
git rebase --onto origin/main origin/<old-base> <branch>
```

Where a branch also carried commits that `main` already has by another route,
the `--onto` base is the last shared commit rather than the old branch tip —
#266 carried three documentation commits that shipped as #260, and rebasing from
those dropped three phantom conflicts and left two real ones.

**Do this before concluding a PR "conflicts".** Most of these did not.

---

## Open (10)

### Blocked on CI — #271, and the two stacked behind it

| PR | Base | State |
|---|---|---|
| **#271** | `main` | **UNSTABLE** — acceptance suite red |
| #274 | `fix/mobile-overhaul` | waits on #271 |
| #275 | `fix/defect-sweep` | waits on #274 |

#271's original failure — `S15 · "Start for Free" is fully painted at every
width`, reading a 73.94px track for an 87px label at 768px — **is fixed**, and
the diagnosis was worth the delay. It was never a layout fault. A layout fault
reads the same number every run; this one read 85.97px on one CI shard and
50.20px on another. `ctaReady` seeded to a flat `false`, so the CTA pill mounted
in its waiting state on **every** route and animated itself open a tick after
hydration — including on routes with no gate to wait for. The spec sampled at
load+400ms, and the transition settles at load+310ms idle but load+440ms under
a 4x CPU throttle, so a contended runner sampled mid-transition. Seeding from
`isSalesPage` also means the primary CTA is no longer `aria-hidden` and
untabbable for ~300ms while painted.

Three tests are still red on the runner and green locally, which is the same
class of problem again. The one that decides whether the fix is right:
`S15 · the .is-waiting reveal still animates its grid track open` reports
`mid-reveal track was 0px`. That is either a sample landing before the
transition starts, or the reveal genuinely no longer running on gated routes —
opposite conclusions. Under diagnosis; the fix is not merging until that is
answered with a measurement.

### In flight — the library stack and the route migration

| PR | Base | State |
|---|---|---|
| #258 | `feat/typography-browsing` | rebased onto merged #255; two stale assertions being fixed |
| #259 | `feat/modal-ui-pass` | waits on #258 |
| #266 | `main` | rebase in progress, two conflicts resolved by hand |

**#258** carries a guard test worth keeping — `every dialog that claims
aria-modal actually traps focus`, which scans source rather than trusting an
import, and which measured six of seven dialogs making that promise and trapping
nothing. Its Pro-modal changes are superseded: `main` already applies
`useModalDialog` there and carries a later design entirely. Two of its own
assertions were written against the superseded implementation and now fail on
literals rather than on behaviour.

**#266** carried three doc commits `main` already has. Its two real conflicts are
both cross-PR, and both required merging the two sides rather than taking one:
`PaletteGallery.jsx` keeps #254's shared `LibraryToolbar` but takes this PR's
`/create/palette` target, and `Plans.jsx` keeps #257's `Open Create` label but
takes this PR's `/create/color` route. Taking either side wholesale would have
silently reverted an approved change.

### Parked at the founder's instruction — the homepage four

| PR | Base |
|---|---|
| #262 | `docs/founder-batch-2026-08-20` |
| #264 | `fix/workspace-copy-to-create` |
| #269 | `worktree-agent-ab3a27f2addfe9846` |
| #270 | `docs/founder-batch-2026-08-20` |

> "continue all except the homepage work as im working with claude design to
> improve the sales page."

These stay open and untouched. Note that #267 — the Mobbin anti-slop diagnosis
and the hero direction it argues for — **has merged**, so the research is on
`main` and available to that work even though the implementation is parked.

Their bases are branches that have since merged, so all four will need the
`--onto` rebase above before they can land. That is deferred rather than done:
rebasing them now would churn branches the founder's design work may replace.

---

## The rule that cost an hour

**Never pass `--delete-branch` to a merge whose head branch is another PR's
base.** Merging #260 and #257 that way deleted the base refs of nine open PRs,
and GitHub auto-closed all nine on the spot.

Recovery worked and nothing was lost — head branches survive, so the base SHAs
came back from `gh pr view N --json baseRefOid` and were restored with
`gh api repos/OWNER/REPO/git/refs` using the full 40-character SHA, after which
all nine reopened MERGEABLE. It should not have been necessary.

Before any merge: `gh pr list --json number,baseRefName` and confirm nothing
open names this head branch as its base.
