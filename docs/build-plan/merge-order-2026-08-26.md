# Merge order — 2026-08-26

**23 PRs are open. Nothing has merged since #253.** This file is the order to
merge them in, and why. Written because the queue now has dependencies that
`git` cannot see, and one of them will silently ship dead code if ignored.

The Director cannot merge — the action is blocked by the auto-mode classifier in
this environment, confirmed via both `gh pr merge` and the GitHub API. This is
therefore a plan for the founder to execute, not a record of work done.

---

## The one dependency git cannot see

> **#275 must merge after #273, or it ships doing nothing.**

#275 adds `@media (prefers-reduced-motion: reduce)` guards to three scroll-snap
rails that genuinely pull 30–74px of unrequested scroll. Those guards only
activate once the **boot script stops stamping `data-reduced-motion="false"`**
on every default visitor — which is #273's fix.

#275 is stacked on `fix/defect-sweep`, which does **not** contain #273. Verified:
`index.html` on `fix/defect-sweep` still writes `String(!!a.reducedMotion)`.

Merging #275 without #273 produces guards that pass their tests and protect
nobody. Both must land; #273 first.

---

## Order

### 1 · Roots — merge these first, everything else descends from them

| PR | What | State |
|---|---|---|
| **#260** | The 2026-08-20 batch docs, research, audits, spec, corrections | MERGEABLE |
| **#257** | Stop calling a UIL4B surface "the workspace" | MERGEABLE |

Nine PRs are based on `#260` and two on `#257`. Merging these first lets GitHub
retarget the rest automatically.

### 2 · Independent — any order, no dependants

| PR | What | Note |
|---|---|---|
| **#256** | CSV formula injection in three exports | Security. Oldest unmerged fix here. |
| **#265** | Agent tree, thirteen roles → five | **Supersedes #212** — see below |
| **#267** | Anti-slop diagnosis + hero direction | Docs only; safe to land even with the hero parked |
| **#268** | Mobile audit, 16 defects | Docs only |

### 3 · The app-surface stack — strict order

```
#273  reduced motion follows the OS          ← MUST precede #275
#271  mobile overhaul, 10 defects
 └─ #274  defect sweep + the founder's 4:3 report
     └─ #275  scroll-snap guards             ← dormant without #273
```

`#272` (Emoji Library) sits on `#260` and is independent of that chain.

`#263` (the 961–1343px responsive band) and `#266` (the `/create/*` route
migration with 50 permanent 301s) also sit on `#260`.

> **#263 is the one to prioritise inside this group.** The founder has reported
> Palette Builder clipping **twice**, and part of what he is seeing is #263's
> toolbar blocker — fixed, gated, and unmerged. He is hitting a solved bug.

### 4 · The library stack — strict order, untouched since 2026-08-15

```
#254 → #255 → #258 → #259
```

The oldest work in the queue. Nothing else depends on it.

### 5 · Parked — do not merge yet

The founder is reworking the homepage sales page with Claude Design
(2026-08-24). These four touch that surface and may be superseded:

| PR | What |
|---|---|
| **#262** | Homepage C1/C3/C5/C7 — workbench frame, centred panel, unclipped mark |
| **#264** | Homepage C8–C13 — copy, gallery, export and Learn sections |
| **#269** | Homepage C2/C4/C6 — centre-swap, two-zone panel, typing bar |
| **#270** | The hero specimen band |

> **#269 held an app-wide accessibility fix that had nothing to do with the
> homepage.** It has been extracted into **#273**, which is *not* parked and
> should merge normally. That extraction is why the reduced-motion fix is not
> hostage to a redesign.

Also note `integration/v2-hero-plus-preview` (branch, no PR) — a **parked,
ungated** merge of #269 into #270. Its three conflicts are resolved but it has
never been built or tested. Do not merge it; it exists so the resolution is not
lost if the hero work resumes.

### 6 · Close, do not merge

**#212** — `CONFLICTING`, open since 2026-08-09. It edits eight agent files that
**#265 deletes**. Its genuinely valuable content — the evidence-boundaries table,
the no-invented-participants rule, five-dimension severity, and
reject-proxy-substitution — was **preserved into `.claude/agents/README.md`** by
#265, where all five surviving agents inherit it. Close as superseded once #265
lands.

---

## What merging unblocks

Held behind this queue right now:

- The **Palette Builder toolbar blocker** the founder has reported twice (#263)
- **`prefers-reduced-motion` doing anything at all** for a default visitor —
  ten rule sites including the global document-wide clamp (#273)
- **18 mobile defects**, including a primary CTA that renders as `tart for Fre`
  on iPad portrait and landscape phones (#271, #274)
- **Emoji search working** — it currently selects whole categories, so `laptop`
  returns nothing (#272)
- **A CSV formula-injection fix** (#256)
- The **agent roster** that actually grants Mobbin to the agents expected to use
  it (#265)

## What is genuinely unfinished, and needs the founder rather than an engineer

- **The Stripe price ladder.** #261 aligns the *displayed* fallback to
  $7/$18/$48. What Stripe charges is unchanged and is an owner action — and
  yearly is a **rise**, $39.99 → $48, which needs a decision about existing
  subscribers.
- **Two homepage copy verdicts** — the headline, and whether deleting the stat
  line is accepted. Both built to be cheap to reverse.
- **N7** (mobile audit) — both candidate fixes break something: one puts tab
  targets under the WCAG 2.5.8 floor (they are already 25px, 1px over), the
  other contradicts the documented V2 pill rule. A design call.
- **N5** — width-invariant; needs a tile-grid redesign, not a patch.
