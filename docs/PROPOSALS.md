# UIL4B — Proposals

**The Director proposes; Dylan approves or denies.** This is the standing queue
of ideas for where the product could go — not a list of work Dylan has asked for,
and not a list of bugs. Bugs live in `src/data/pipeline.js` and get fixed without
asking.

Nothing here blocks anything. Requested work proceeds while these sit unanswered.

**To answer:** write `APPROVED`, `DENIED` or a note on the verdict line. That is
the record — no other confirmation is needed, and no agent may claim a verdict
that is not written here.

_Last reviewed: 2026-08-07._

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

## Resolved

| Date | Proposal | Verdict |
|---|---|---|
| 2026-08-14 | P-001 · Ship the instrumentation before shipping more features | APPROVED — env guard + gate event shipped; per-tool activation partial |
| 2026-08-14 | P-002 · Give users somewhere to tell us something is wrong | APPROVED — every report now carries its route, tool and state; no API change needed |
| 2026-08-14 | P-003 · Decide what the free tier is for | ANSWERED — "a foot in the door". Silent system collapse now names the paid edge; remaining gates still to audit |
| 2026-08-14 | P-004 · Make Auto the default colour system app-wide | APPROVED — shipped |
