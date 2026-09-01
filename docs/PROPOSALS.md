# UIL4B — Proposals

**The Director proposes; Dylan approves or denies.** This is the standing queue
of ideas for where the product could go — not a list of work Dylan has asked for,
and not a list of bugs. Bugs live in `src/data/pipeline.js` and get fixed without
asking.

It also carries the **open decisions** — questions only Dylan can settle, which
were raised while doing work he did ask for. A `P-0xx` entry does not block the
rest of the queue, but several of these block one specific slice, and each says
which.

**To answer:** write `APPROVED`, `DENIED` or a note on the verdict line. That is
the record — no other confirmation is needed, and no agent may claim a verdict
that is not written here.

_Last reviewed: 2026-09-01._

## How to read an entry

Every proposal carries an **evidence class**, stated honestly:

- `measured` — instrumentation, field metrics, a test or a reproduction
- `observed` — a founder or user report, a review, a support message
- `inferred` — derived from the code, a competitor, or a known pattern
- `judgement` — taste and experience, nothing behind it yet

`judgement` is allowed and often right. It is never disguised as something
stronger. Each entry also says **what evidence would settle it**.

---

## P-001 · Ship the instrumentation before shipping more features

**Evidence: `measured`** — `analytics-env-guard` and `upgrade-activation-events`
are both still `todo` in `src/data/pipeline.js`; neither has shipped.

**The user problem.** We cannot currently tell whether anyone reaches value in
this product. There is no answer to "did this user build something?", "what did
they do before upgrading?", or "where do people stop?". Development and preview
traffic also mixes into production aggregates, so what data does exist is
untrustworthy.

**Why it matters more than it looks.** Every other proposal in this file is
`inferred` or `judgement` *because of this gap*. Instrumentation is not
housekeeping — it is the thing that converts opinion into evidence and makes this
whole queue worth reading.

**Smallest version.** The environment guard (fail-safe: unknown environment is
never counted as production), plus one activation event per tool defined as
"completed a real piece of work" — saved or exported a palette, gradient or type
scale — and one canonical upgrade-gate event.

**Cost / risk.** Small-to-moderate, no user-facing change. Risk is choosing the
wrong activation definition and having to re-cut it later; cheap to revise.

**Verdict:** _(APPROVE)_

---

## P-002 · Give users somewhere to tell us something is wrong

**Evidence: `inferred`** — the repo has an `/api/support` route but no in-product
feedback path tied to the surface a user is on.

**The user problem.** When a tool misbehaves, a user's only options are to leave
or to email. Most leave. We then learn nothing, and silent churn leaves no
review — so the absence of complaints reads, wrongly, as satisfaction.

**Smallest version.** A lightweight "something's wrong here" affordance on tool
surfaces that captures the route, the tool state and an optional message. No
public visibility, no moderation surface, no new backend if the existing support
path can carry it.

**Cost / risk.** Small. Risk is low-quality volume; mitigated by capturing
context automatically so the user need not describe it. Note `/api` is a Human
Validation Zone — needs founder approval before any route change.

**What would settle it.** Even a fortnight of captured reports would tell us
whether the silence is contentment or attrition.

**Verdict:** _(APPROVEvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv)_

---

## P-003 · Decide what the free tier is *for*

**Evidence: `inferred`** — free caps are 3 saved projects / 8 custom icons
(resolved 2026-07-31); Auto is always free while paid harmonies "collapse to
auto" for free users; brand palettes in the library are Pro-gated.

**The user problem.** The free tier currently reads as a *reduced* product rather
than a *complete small* one. A free user meets several silent collapses — a
system quietly downgraded, a palette they can see but not open. Silent
degradation teaches users the product is unreliable rather than that it is paid.

**The question underneath.** Is free a trial of everything, or a genuinely useful
small tool? Both are defensible; the product currently implies both at once, and
the seams show.

**Smallest version.** Not code. Pick the answer, then make every gate *explicit*
rather than silent — the user should always know they hit a paid edge, never
merely find that something behaved oddly.

**Cost / risk.** Cheap to decide, moderate to apply consistently. Real revenue
implications either way, which is why it is Dylan's call and not mine.

**Verdict:** _(APPROVED — "the free tier is a foot in the door")_

---

## P-004 · Make Auto the default colour system app-wide

**Evidence: `observed`** — founder reported the homepage hand-off landing on
Analogous; fixed for the hand-off in #207. The wider default is untouched.

**The user problem.** A new board still defaults to `analogous` via
`DEFAULT_DESIGN` in `src/contexts/ProjectContext.jsx`. For a free user that is a
*paid* system the engine silently collapses to Auto anyway — so their first
experience is a system that does not do what its label says.

**Smallest version.** One line: `harmony: 'analogous'` → `'auto'`. ColorStudio's
own fallback chain must move in the same pass or the two surfaces disagree.

**Cost / risk.** Trivial to implement. It changes the first impression of every
new board — one hue in five tones rather than five hues. That is a taste call as
much as a correctness one, which is why it is here rather than done.

**Verdict:** _(APPROVE)_

---

## P-005 · Where should a colour control take a gradient or an image?

**Evidence: `observed`** — founder request, 2026-08-08: *"Solid / Gradient /
Image tabs, an SV field, hue and alpha sliders, a format dropdown and saved
swatches"* for the colour picker. Everything in that list except the tabs and
the alpha slider has now shipped (`colour-picker-ui`). These two are here rather
than done because building them needs an answer this document is for.

**The problem with just building them.** `ColorPickerPop` has exactly three call
sites, and none of them can consume what those two controls produce:

| Call site | Why not |
|---|---|
| Palette Builder swatch | Must stay an opaque hex. The contrast maths, the tint scales and every export assume it. A gradient or a translucent swatch is not a nicer colour — it is a corrupt palette. |
| Gradient Generator **stop** | A stop cannot itself be a gradient. Alpha *is* meaningful, but a stop is `{ color, position }` — alpha would have to reach `gradientCss`, `gradientSvg`, every export format, the saved-gradient shape and the library data before it meant anything. |
| Icon Library colour | One SVG fill. Same story as a stop. |

So the tabs would be three tabs where two do nothing, and the alpha slider would
move a value nothing stores. Both would look finished and be dead.

**What is actually being asked, underneath.** Almost certainly a **fill picker**
— a control for "what goes in this box" rather than "what colour is this" —
which is a different component with a different output type (`{ type: 'solid' |
'gradient' | 'image', … }`). That is a real and useful thing to have. It needs a
surface that takes a fill.

**Three ways to go, cheapest first.**

1. **Transparent gradient stops only.** Add alpha to the stop model and its four
   output paths. Fade-to-transparent is the single most-asked-for gradient
   shape, so this earns its keep on its own. Does not answer the tabs.
2. **A fill picker for one named surface** — a UI Component Builder background,
   a preview scene, an export canvas. Needs that surface to exist first.
3. **Neither.** The picker is a *colour* picker, the Gradient Generator is where
   gradients are made, and the two are not the same job.

**Cost / risk.** (1) is a contained slice with a clear test surface. (2) is a
new component plus a consumer, and is the only one that delivers the tabs as
asked. (3) costs nothing and closes the request.

**What would settle it.** Naming the surface that should accept a gradient or an
image fill — or saying there isn't one.

**Verdict:** _(PENDING)_

---

# Open decisions

Thirteen questions that were waiting on Dylan while living in design specs, a
build plan and the notes field of `src/data/pipeline.js` — which meant this
queue read as almost empty while thirteen things were in fact blocked on him.
They are gathered here on 2026-09-01 so the queue tells the truth. The analysis
behind each one already exists and is cited; these entries are the **question**,
not a re-run of the work.

Six of them are the homepage, and they arrive together because the four homepage
PRs are parked: *"continue all except the homepage work as im working with claude
design to improve the sales page."* Answering P-006 to P-011 is what unparks
them.

---

## P-006 · Which hero headline

**Evidence: `judgement`** — `docs/design/anti-slop-and-hero-2026-08.md` §2.12.1.

Option A — **"A UI system that survives the handoff."** — is the more authored
sentence and does not collide with the H2 one section below it. Option B —
**"Design the system. Leave with the code."** — is the plainer one for a visitor
who does not already know the vocabulary.

The anti-slop pass recommends **A**. This is one call and it sets the tone of the
whole page, which is why it is here rather than decided.

**Verdict:** _(PENDING)_

---

## P-007 · Whether to delete the hero stat line

**Evidence: `judgement`** — same source, §2.12.2.

The two catalogue numbers in the hero (200K icons, 1,500+ fonts) are real
libraries and honest *in context*. In a stat strip they read as **ours**, which
is the borrowed-credibility tell the whole anti-slop pass exists to remove. The
spec deletes them.

If you want a number above the fold anyway, `13` survives in the command-bar
placeholder and the proof band carries `n of 6 pairs clear AA`. The question is
just: is that enough?

**Verdict:** _(PENDING)_

---

## P-008 · WCAG 2.2.2 on the hero typing animation

**Evidence: `judgement`** — same source, §2.12.3, and the note recorded when the
animation shipped.

WCAG 2.2.2 is **partially met and was stated rather than implied**: the stop is
real and announced to assistive technology, and any first interaction ends the
animation — but there is **no visible stop affordance for a sighted user**.

Two ways to close it: the label-only fix, or a visible pause control. The spec
recommends **label-only**, because a visible control adds a seventh interactive
element to a viewport that already has six. An accessibility reviewer should
confirm that is sufficient — the recommendation is taste, not a measurement.

**Verdict:** _(PENDING)_

---

## P-009 · The third risk-reversal line

**Evidence: `judgement`** — same source, §2.12.4.

The page says "no risk" three times. The hero's shrinks to a capability
statement and `SystemCTA` keeps the payment one; the pricing lede's *"no card
and no trial clock"* is the remaining duplicate. Cut it or keep it. `.hprice` is
outside the anti-slop spec's surface, so it was flagged rather than changed.

**Verdict:** _(PENDING)_

---

## P-010 · The three below-the-fold anti-slop items

**Evidence: `inferred`** — same source, Part 1 §1.5.

None of the three is in any current spec, and all three are cheap:

1. **The six tool cards of identical weight**, one group of which is entirely
   unbuilt — the Colour group has five live tools, the Component group has
   three, all `soon: true`, and both render as the same card. Symmetry
   overriding truth is on the founder's own tell list. This is the **largest
   remaining anti-slop win on the page after the hero**.
2. **The five templated step titles.**
3. **`[ THE TOOLSET ]` → `[ TOOLSET ]`.**

**Verdict:** _(PENDING)_

---

## P-011 · Section order — export before or after pricing

**Evidence: `judgement`** — `docs/design/homepage-spec-2026-08.md` §14.3.

The spec puts the export section **before** pricing; the Mobbin research
recommends it **straight after the workbench**. §1 of the spec states its
reasoning for deviating. Cheap to swap either way, but it changes the order a
visitor meets the argument in.

**Verdict:** _(PENDING)_

---

## P-012 · When the four parked homepage PRs resume

**Evidence: `observed`** — founder instruction, 2026-08-20.

#262 (C1/C3/C5/C7), #264 (C8–C13), #269 (C2/C4/C6) and #270 (the hero's
decoration replaced with the product's own output) are open and deliberately
untouched. Three things to know before they move:

- **#267 has merged**, so the anti-slop diagnosis and the hero direction it
  argues for are on `main` and available to that work even though the
  implementation is parked.
- **Three of the four will revert the route migration when rebased.** #262, #264
  and #269 each carry an `AppFooter.jsx` diff changing `/create/color` back to
  `/color`, because they were branched before #266. That is stale, not a
  disagreement — the `--onto` rebase in `docs/reference/git-workflow.md` clears
  it.
- **Build order** if they all land: #262 → #264 → this.

**Verdict:** _(PENDING)_

---

## P-013 · Recapture the portfolio screenshots, or leave them stale

**Evidence: `measured`** — the `screenshots/` directory was audited on
2026-08-20 and kept.

They are deliberate 4K portfolio assets, not dead weight, and the justification
now lives in `screenshots/README.md`. But they were captured in June, **before
the routes moved and the surfaces were rebuilt**, so they show a product that no
longer exists. Recapture them, or accept them as an archive and say so.

**Verdict:** _(PENDING)_

---

## P-014 · Icon-grid density — long icon names truncate at every width

**Evidence: `measured`** — `docs/qa/responsive-audit-2026-08.md` N5.

On `/create/icons`, `align-center-horizontal` needs 117px against a 79px cell;
**51–75 labels are truncated at any given width**, from 320px to 1920px. The
ellipsis is present and the tile size is fixed by design, so this is *not* a
breakpoint fault — it is width-invariant, which is what makes it a content
density decision rather than a bug.

The consequence is that a large fraction of the library cannot be identified by
name without hovering. Bigger tiles, fewer per row, a two-line label, or leave it.

**Verdict:** _(PENDING)_

---

## P-015 · The homepage gradient preview is violet; the brand is blue

**Evidence: `observed`** — measured 2026-08-20, still true.

`HomeWorkbench.jsx` sets `DEFAULT_GRADIENT = { from: '#7C3AED', to: '#22D3EE' }`.
`#7C3AED` is the design file's default violet, and `CHANGELOG.md` records for V2
that *"the design file's default violet is **not** used anywhere."*

It is sample gradient *content* rather than an accent token, so this is not a
token bug — but the first thing a visitor sees demonstrated is violet/cyan while
the product's accent is `#0F6FFF`. Worth a deliberate call rather than an
inherited default.

**Verdict:** _(PENDING)_

---

## P-016 · What does Pro mean for the typography tools?

**Evidence: `measured`** — 2026-08-15, tracked as `typography-paywall-model` in
`src/data/pipeline.js`.

**There is no paywall.** `FontGallery.jsx`, `FontMatcher.jsx` and
`TypeScale.jsx` contain zero references to `openProModal`, `isPro`,
`useSubscription` or `AuthGate`; `src/config/plans.js` has no typography limit of
any kind; the Plans page does not mention fonts or typography anywhere. The
entire monetisation model is `AI_LIMITS` plus `FREE_SAVE_LIMITS`, so typography
sits wholly outside it.

Against the approved P-003 direction — "the free tier is a foot in the door" —
typography is currently all door and no room. **No gate can be built until this
is answered**, and note the P-003 lesson: whatever is gated must be visible and
named, because a silent collapse reads as broken.

**Verdict:** _(PENDING)_

---

## P-017 · Who owns the imagery in a "fonts in use" surface?

**Evidence: `observed`** — founder request 2026-08-08, restated 2026-08-15:
*"i want a way of seeing fonts with real life use cases of them and images and
abouts"*. Tracked as `fonts-in-use-surface`.

The restatement makes the blocker **sharper, not softer** — "images" of real
brand work is precisely the part that needs rights clearance. Four questions,
all founder-only: who owns the imagery, under what licence it may be shown, who
curates it, and what provenance is displayed. Reference: fontsinuse.com.

Building it before that is answered creates a takedown surface, so the queue
item stays blocked rather than started.

**Verdict:** _(PENDING)_

---

## P-018 · Should a chargeback also cancel the Stripe subscription?

**Evidence: `measured`** — shipped behaviour, `subscription-chargeback-revocation`.

Access revocation is done and tested: a refunded or disputed subscription charge
now sets a sticky `accessRevoked` that both plan resolvers honour ahead of the
past-due grace window. **The Stripe subscription itself is deliberately not
cancelled**, and the log line says so.

The reasoning for leaving it: cancelling is an irreversible outward action on a
live billing account, taken off a single webhook, and Stripe already cancels on
a chargeback in most configurations. That is a judgement about someone's money,
which makes it a founder call rather than an engineering one. Confirm the
current behaviour or change it.

**Verdict:** _(PENDING)_

---

## Resolved

| Date | Proposal | Verdict |
|---|---|---|
| 2026-08-14 | P-001 · Ship the instrumentation before shipping more features | APPROVED — env guard + gate event shipped; per-tool activation partial |
| 2026-08-14 | P-002 · Give users somewhere to tell us something is wrong | APPROVED — every report now carries its route, tool and state; no API change needed |
| 2026-08-14 | P-003 · Decide what the free tier is for | ANSWERED — "a foot in the door". Silent system collapse now names the paid edge; remaining gates still to audit |
| 2026-08-14 | P-004 · Make Auto the default colour system app-wide | APPROVED — shipped |
