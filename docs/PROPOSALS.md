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

_Last reviewed: 2026-09-05._

## What is waiting on you, shortest first

| | Question | The answer we would give |
|---|---|---|
| **P-023** | Quieter text is now readable everywhere but looks like body text on 19% of palettes. Keep it? | Keep — it shipped, and the alternative is unreadable text |
| **P-006** | Which hero shape — A, B or C? Look at `/?hero=a`, `?hero=b`, `?hero=c` | No recommendation. Direction C is shown at 45% opacity **on purpose** — judge the shape, not the paleness |
| P-005, P-008 … P-018 | Ten older questions. None blocks anything today. | See each entry |

**Answered 2026-09-05 and now closed:** P-016 (typography pricing), P-019 (the
token vocabulary), P-020 (`pepsi`), P-021 (`google`), P-022 (`/community` ink).
Their verdicts are on each entry and in the Resolved table at the foot of this
file. **Do not re-ask them.**

The two still open are restated as a to-do list, each with a cost of delay, in
[`OWNER-ACTIONS.md` §2](OWNER-ACTIONS.md), alongside the one piece of writing
only the founder can do. **Answering in either file counts.**
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

**Verdict:** _(APPROVED)_ — recorded 2026-08-14. The stored line held a stuck-key run of `v`s; normalised 2026-09-05 to match the Resolved table below, which has read APPROVED since the day it was answered.

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

> **Read the hero-shape question first.** #290 rewrote the words inside the
> current hero against the anti-slop bar and the founder’s complaint survived it,
> so the words are not the variable — the shape is. Three shapes are live at
> `/?hero=a|b|c` ([`OWNER-ACTIONS.md` §2.1](OWNER-ACTIONS.md)). **If direction C
> wins, this proposal is moot**: C’s deliverable is one sentence in the founder’s
> own words, which is not ours to choose between.

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

**Verdict: RESOLVED on `main`, and by a third option neither side proposed.**
Recorded 2026-09-04 by the Director after #328's triage measured it. `main`
deleted the *strip* and **kept the numbers**, re-sited beside the toolset grid
with attribution — so they no longer read as ours, which was the entire
objection, without discarding two true facts. Note this also settles part of
#270: landing that PR as written would now *delete honest attributed facts*, so
it must not be revived for this reason.

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

> **ANSWERED 2026-09-03 by #328.** A triage re-measured all four in Chromium
> against a fresh build of `main` — not read off the PR bodies — and returned a
> verdict and a cost per PR: **#262 revive** (its defects still reproduce with
> byte-identical numbers, and #293's `line-height:1` never fixed the sheared
> mark and could not have, because an inline background paints over the font's
> content area, not the line box); **#264 extract four items, then close** (its
> copy half now contradicts #290, which deliberately deleted the bracketed
> eyebrow motif that #264 adds three more of); **#269 extract C2 and C4, close
> the rest** (C6 shipped in #320); **#270 extract the specimen band only**, and
> that band is **gated on the founder's hero-shape choice**, because it adds
> 96–144px desktop / 240px phone under the headline and so changes the very
> shape being chosen between. Full detail is on each PR as a comment and in
> `homepage-parked-prs-triage` in `src/data/pipeline.js`. **The text below is
> the pre-triage framing, kept for its context only.**
>
> **CORRECTED 2026-09-04 by #365, which rebased all four rather than estimating.**
> Three of the conclusions above changed. **#262 is merged** — it was revived,
> rebased and landed. **#269 is now empty**: its one surviving change shipped as
> #363, and the PR can be closed. **#264 cannot be rebased at all** — it edits
> `src/components/TopBar.jsx`, which no longer exists on `main`; re-implement its
> survivors against `main`, one commit each. And **#270 is NOT gated on the hero
> choice** — that was the stated reason to wait, and it is wrong. Measured at
> 1440×900, direction A leaves 183.9px of empty flow, B 256.6px and C 253.2px
> against a band budget of 96–144px, so the specimen band fits in all three, on
> desktop and on phone. It should still be *designed into* the chosen shape
> rather than bolted on, but that is a preference, not a blocker.

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

**Evidence: `measured`** — the August 2026 responsive audit, finding N5. That
audit was deleted on 2026-09-05; the finding survives in
`docs/qa/defect-register-2026-08.md`.

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

**Verdict:** _(ANSWERED 2026-09-05 — **browsing is free, saving is Pro**.)_

Anyone may browse fonts, pair them and build a type scale. **Pro is required to
save, to export, or to keep a type system in a project.** The founder picked it
because it is exactly how the colour tools already gate — so it introduces no new
concept to explain, and it satisfies the P-003 lesson this entry raised: what is
gated stays visible and named, because a silent collapse reads as broken.

The gate can now be built. `typography-paywall-model` in `src/data/pipeline.js`
carries the implementation.

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

## P-019 · What we call design tokens on the site

> **DECIDED 2026-09-05 — the answer is “Styles”.**
>
> The founder was shown all three options with the reasoning below and picked
> **C, “Styles”**. **We had recommended A, “Foundations”; he chose otherwise, and
> this is his call, not ours.** The evidence below is kept because it is why the
> question was worth asking — not because the answer is still open.
>
> **Rule R holds, and it was never in question:** the word *token* survives only
> past the export boundary — the export panel, the generated file names, the code
> blocks, the `@uil4b/tokens` package. Renaming it there would break customers’
> code for no gain. It comes out of every sales, navigation and tool-heading
> surface.
>
> **Implementation is complete as of 2026-09-06.** It shipped in two slices —
> 22 strings on 2026-09-05, then the homepage on 2026-09-06 — and the backlog
> item `token-vocabulary-undersells` carries the full record of what changed,
> what was deliberately kept, and the three borderline occurrences that were
> classified and left.
>
> The evidence and the full working are below.

**Evidence: `observed` + `inferred`** — founder request 2026-09-04, recorded
verbatim in `token-vocabulary-undersells`; competitor naming checked against 22
shipped product surfaces via Mobbin.

**The problem, in the founder's words.** "i dont like tokens being such an
important word we are using around the site, tokens means alot of things and in
the context we are using it doesnt make it seem like its a huge value add".

**Two things are wrong, and the second one costs money.** *Token* is ambiguous
— it reads as crypto, as an LLM billing unit, or as an auth credential before
it reads as a design value. And it names the **mechanism** (how the value is
stored), not the **benefit** (the hex you change in the palette builder is the
hex your export ships). The homepage already says the benefit in plain words;
the tools then fall back on the jargon.

**The collision is internal, not just external.** UIL4B ships all three meanings
of the word today: *design* tokens across the Create tools, the *auth* token
(`Bearer ${token}` in Admin and the three AI tools), and the *LLM* token in
Learn — `/learn/ai` renders stat tiles reading "Token context limit" and
"Per session token usage". A visitor can meet two different meanings of our most
important noun in one session.

### What comparable products actually call it

Checked 22 shipped surfaces on Mobbin. **Not one uses "token" in navigation or
section headings.** Two patterns dominate:

- **Name the things.** [Customer.io Design Studio](https://mobbin.com/screens/e087a5c7-06ed-4c1c-bb24-b4321127202c)
  (Colors, Fonts, Radius, Spacing), [Retool](https://mobbin.com/screens/77a46731-0e18-442d-8fb3-5890a65a8fc1)
  (Color, Typography, Metrics), [Gamma](https://mobbin.com/screens/2b7d6d36-9b4f-44da-a994-f005fc7f3ccf),
  [Zendesk](https://mobbin.com/screens/c622a256-81a1-4145-b050-20ff2fa722b5),
  [GitBook](https://mobbin.com/screens/e8cebaad-fe0b-49fc-ba51-ecdb0de2da06),
  [Whereby](https://mobbin.com/screens/6b097ab8-61dd-4fcd-a42c-2a9545798108).
  Every brand-kit surface does the same — Logos / Colors / Fonts in
  [Canva](https://mobbin.com/screens/886a741b-5211-4dc3-9b41-b33f3c6418dc),
  [Mailchimp](https://mobbin.com/screens/7b7b620b-5f21-4cbf-bbc3-9b963e71f7a3),
  [HubSpot](https://mobbin.com/screens/6216459c-4fa2-481e-b69b-416c4773a1f4),
  [Adobe Express](https://mobbin.com/screens/900bcf05-9fc0-4e7a-a006-1a99d319c38b),
  [Typeform](https://mobbin.com/screens/f8b77807-61d0-4586-83c0-5f775010c7e9).
- **A container noun tied to the outcome.** *Foundations* —
  [Frontify](https://mobbin.com/sites/sections/b404b671-cffd-4338-a417-8dda0e513d7a)
  (Foundations: Logo, Color, Text, Icons, Imagery, Layout) and
  [Cash App Design](https://mobbin.com/sites/sections/b30a76a3-b180-4300-b41b-c55e590e4524)
  (nav reads "Design Foundations"). *Global Styles* —
  [Customer.io](https://mobbin.com/sites/sections/b055c129-1ebf-479a-8edd-73e7190634f0).

**The most useful precedent is [Sketch](https://mobbin.com/sites/sections/3ea93e9a-8591-423b-aef7-d78fedddd674).**
It calls them **Color Variables** in the editor and **Color Tokens** only at the
export boundary: "we'll automatically generate Color Tokens... grab your tokens
in CSS or JSON formats". That is exactly the split proposed below — plain
words where you *choose*, the industry term where you *consume*.

### Three options

Each keeps rule R below. Pick the name; R applies either way.

**Option A — "Foundations" (recommended).** A collective noun, with the things
named beneath it: Colour, Type, Spacing, Icons.
- *Wording:* hero "Colour, type and **spacing** that stay one system." ·
  workbench row "Design tokens" → "**Foundations**" · Style Guide
  "Tokens, components, and patterns" → "**Foundations**, components, and
  patterns" · Landing "Design tokens at your fingertips" → "**Every value
  your system needs**".
- *Gains:* unambiguous; works as a nav label; industry-legible without being
  jargon; and **it is already our word** — `CLAUDE.md` opens with "build,
  organize, validate, and export interface **foundations**", and the simulated
  docs nav we ship in `UiSystemLab.jsx` already reads **Foundations**. Adopting
  it is alignment, not invention.
- *Costs:* still a collective abstraction — it names the role, not the payoff.
  Slightly grand for a spacing value.

**Option B — name the things; no collective noun at all.** "Colour, type and
spacing", everywhere the collective would have gone.
- *Gains:* zero jargon, zero ambiguity, and the single most-supported pattern in
  the evidence above. Concrete — a visitor knows what they get.
- *Costs:* there is then **no word for the nav label or a section heading**, and
  it is verbose in tight UI. It also drops the claim that these are *one
  connected system*, which is the actual differentiator.

**Option C — "Styles".** The plainest available word; Customer.io ("Global
Styles"), Framer ("Shared styles"), Sketch ("Symbols and Styles"), Figma.
- *Gains:* plain English, short, huge precedent, no ambiguity.
- *Costs:* the weakest claim of the three — "styles" sounds cosmetic, and
  undersells that these values are the single source of truth that ships to
  code. It also collides with *stylesheet*.

**Rule R — "token" survives only past the export boundary.** Keep the word in
the export panel, the generated file names, the code blocks and the
`@uil4b/tokens` package — the one place it is correct, expected, and
searched for by the developer who consumes it. Renaming there would break users'
code for no gain. Remove it from every sales, navigation and tool-heading
surface.

**Considered and rejected: "Brand kit"** (7 of 10 brand-kit surfaces use it). It
is the most familiar phrase available, but it repositions UIL4B as marketing-
asset storage rather than a UI system workspace. Wrong altitude.

### Two corrections to the backlog item's own scope

Both were measured on the branch, and both make this **much smaller** than the
item claims:

1. **"~390 occurrences" is a raw grep count and badly overstates the copy job.**
   Actual user-facing English prose is **~35 strings**. The rest are internal
   identifiers (71 lines in `UIBuilder.jsx` alone are `tokens.spacing`-style
   template literals), plus 9 `Bearer ${token}` auth calls.
2. **There is no translation job. The locale strings are dead code.** All four
   "token" strings in each of the ten locale files sit under the top-level
   `designExport` namespace — the retired Design System Export tool. **Nothing
   in `src/` reads that namespace**, key resolution is static (`resolve()` in
   `I18nContext.jsx` splits a literal dotted path; no dynamic key building
   reaches it), and the only other reference in the repo is a comment in
   `tests/unit/locale-tool-copy.test.js`. So layer (a) is English-only *by
   construction* — the "rewriting ten locales" risk the item is built around
   does not exist. (Worth noting separately: those dead strings translate
   *badly*, which is itself evidence for this proposal. French renders it
   "Jetons" — casino chips; Chinese renders it "令牌" — an
   authorisation tally, i.e. the auth meaning. No translator could carry the
   intended sense.)

**Cost / risk.** Small. ~35 English strings, no locale work, no exported-artefact
renames, no internal identifier churn. The homepage H1 is among them, so the
homepage behaviour contract (`tests/user-sim/10-home-chaos-to-calm.spec.js`)
will need its assertion updated deliberately alongside.

**What would settle it:** your pick of A, B or C. Nothing was rewritten — the
item asked for options first, and the word choice is the whole decision.

**Verdict:** _(DECIDED 2026-09-05 — **C, “Styles”**.)_ Chosen by the founder over our recommendation of A. Rule R stands: `token` survives past the export boundary only. **Shipped in two slices.** 2026-09-05 — 22 user-facing strings across 10 files, plus the 2 spec assertions that named the old copy. 2026-09-06 — the homepage, which the first slice could not take because another agent held the files: the H1 is now `Colour, type and icons that stay one system`, the tools heading dropped the noun rather than replacing it (`Colour, type, icons, imagery, export.`), the workbench UI-preview row reads `Styles`, `public/llms.txt` lost one more instance found by enumeration, and `public/previews/cards.json` was regenerated so the share card and the page agree. **Where the H1 names `icons` rather than `Styles`, that is this rule applied, not waived:** Styles is the collective noun where a collective is needed, and a list of three concrete things is not one — Styles is a superset of the two nouns beside it there. The hero's *shape* is a separate open question and stays with `hero-copy-still-reads-ai`.

---

## P-020 · The `pepsi` brand palette cannot be verified — keep, rename, or drop

**Evidence: `measured`** — a full provenance attempt on 2026-09-04, recorded in
the header of `src/data/brandPalettes.js` and in `brand-palette-provenance`.

**The problem in one line.** We sell a paid palette called **Pepsi** and cannot
prove the five colours in it are Pepsi's.

**What was actually tried, so nobody repeats it.** Blocked to every fetcher —
plain curl, agent fetch, and a real headless Chromium with a browser UA:
`pepsico.com`, `design.pepsico.com`, `contact.pepsico.com`,
`investor.pepsico.com`, `pepsico.co.uk`, `pepsi.co.uk`, `pepsico.de`,
`pepsicobeveragefacts.com`. It is an edge WAF, not a user-agent check, so a
better UA will not fix it. `pepsi.com` answers 400 to curl and geo-redirects a
real browser to a Facebook page. **Reachable and useful:** `digitalassets.pepsico.com`
serves 200 — but every asset behind it is the **PepsiCo corporate mark**, not
the Pepsi cola brand, and PepsiCo refreshed the corporate identity separately in
2025, so those files answer a different question. PepsiCo's own 2023 announcement
describes *"electric blue and the black of Pepsi Zero Sugar"* and publishes **no
hex**. Three PepsiCo portals serve `#0065C3` in their site chrome, which is one
of this row's current values — **that is a coincidence, not a confirmation**, and
naming it is the point: a marketing theme is not a logo palette.

The pre-2023 values were therefore **left in place rather than guessed from an
aggregator**. This is a product call about shipping an unverifiable claim, not a
data problem — the data work is finished and it failed.

### Three options

- **A — rename it to its era**, e.g. "Cola Blue (pre-2023)" *(recommended)*.
  Honest, keeps the palette, and stops us asserting anything about today's brand.
  Costs the same as B.
- **B — keep it as "Pepsi".** Fastest. We continue selling a claim we cannot
  substantiate, and it is now knowingly rather than accidentally.
- **C — delete the row.** Safest. Costs one of 31 paid palettes.

**Cost / risk.** Minutes either way. The naming rule the file already carries —
*a row named after a company must hold that company's identity colours* — is what
makes B uncomfortable, and it was written after `material` was found holding
Material 3's purple under Google's name.

**What would settle it:** your pick of A, B or C. No further research will help;
the sources are closed.

**Verdict:** _(DECIDED 2026-09-05 — **A, rename it to its era**.)_ Matches the recommendation. The palette stays; the name stops asserting anything about today’s brand. No further provenance work — the sources are closed.

---

## P-021 · `google` left the free tier as a side effect. Intended?

**Evidence: `measured`** — `src/data/brandPalettes.js`, verified 2026-09-05:
`{ id: 'google', … free: false }`, and no other row is named Google.

**What happened, and it was not a pricing decision.** #354 found the row named
`google` was holding **Material 3's** default purple rather than Google's
colours. Correcting that meant splitting it in two: **`material` — "Material 3
Baseline"** kept the purple and stayed **free**, and a **new `google` row**
(`#4285F4` `#EA4335` `#FBBC04` `#34A853` `#202124`) was created and marked
**paid**, alongside the other company brands.

The consequence nobody chose: **the free tier now contains nothing called
Google.** It is six palettes — Apple, Material 3 Baseline, Netflix, Discord,
Stripe, Spotify — against 31 paid.

### Two options

- **A — leave it** *(recommended)*. Material 3 Baseline is the better free
  starting point: it is a whole system a user can build on, not one company's
  brand identity. And the free tier keeps six recognisable names.
- **B — make `google` free too**, and move something else across to hold the
  free/paid balance.

**Cost / risk.** One boolean either way. `tests/unit/free-tier-gates.test.js` and
`locked-library-tease.test.js` cover the gate, so the change is safe; the
question is only which side of it Google belongs on.

**What would settle it:** a yes or a no. This is a check, not a defect — A is
defensible and is what ships today.

**Verdict:** _(DECIDED 2026-09-05 — **B, make `google` free**.)_ **Chosen against our recommendation of A**, and knowingly: the founder was told the free tier already held six palettes. The free tier becomes seven; `material` stays free beside it.

---

## P-022 · `/community` monogram contrast — 9 of 12 tiles fail the floor

**Evidence: `measured`** — WCAG contrast computed over
`COMMUNITY_DESIGNS` × `.ch-thumb-mono` (`rgba(255,255,255,.92)`) on 2026-09-05.

**The problem in plain words.** Each of the twelve tiles on `/community` shows two
large letters on a coloured square. On **nine of the twelve** the letters are too
faint to read. Large text needs **3:1**; the worst tile — "Product & checkout
flows", `#059669 → #6EE7B7` — measures **1.47:1**. Every failing tile is a light
or mid-tone gradient with white letters painted on it.

The tiles are the first thing a visitor sees on that page, and it is a page we
point new visitors at.

### Four options were compared; one wins on the only axis that is measured

| | Option | What it does to the page |
|---|---|---|
| **A** | **Per-item ink** — pick black or white per tile *(recommended)* | **No colour changes at all.** Worst case rises from 1.47:1 to **3.69:1**, clear of the floor. But **10 of the 12 monograms flip white → black**, which visibly changes the page. |
| B | Darken every gradient until white clears 3:1 | Changes the look of all twelve tiles, including the three that already pass |
| C | Add a scrim behind the letters | A grey wash over every tile, muddying the gradient that is the whole point of the tile |
| D | Heavier text shadow | A shadow does not create contrast against a mid-tone; it fails the floor and reads as a 2010s treatment |

**A is the only one of the four that changes no colour**, which is why it wins
despite the visible flip. The flip is the thing to say yes or no to — everything
else about it is settled.

**Cost / risk.** Small: one derived value, plus a unit test that fails the build
if a new community row lands below the floor. Risk is aesthetic only.

**What would settle it:** yes or no to the white → black flip on ten tiles.

**Verdict:** _(DECIDED 2026-09-05 — **yes, per-item ink**.)_ Matches the recommendation. Ten of the twelve monograms flip white → black; no colour changes. **Shipped 2026-09-05** — worst 1.47:1 → 3.46:1 against a 3.0 floor, identical in both themes because the ground is per-item data rather than a theme token. The test asked for is `tests/unit/community-monogram-ink.test.js` (the guarantee is about the function, so it holds for a new row too), and `KNOWN_BELOW_FLOOR` in `48-text-over-gradients.spec.js` is now an empty exact-match list, which fails the moment any new surface drops below its floor.

---

## P-023 · Muted text now looks like body text on 19% of palettes — keep it?

**Evidence: `measured`** — 6,000 generated palettes × 2 themes, an sRGB grid
sweep of 48,778 more, and 840 rendered samples per theme on `/create/palette`.
Full numbers in `preview-muted-on-surface` in `src/data/pipeline.js`.

**What shipped, and why.** The palette previews paint two levels of text: normal,
and a quieter second level. The quieter one was **unreadable on most palettes** —
12,000 of 12,000 samples on the panel ground were under 4.5:1, worst 2.951. #372
guaranteed both ink roles against **every** ground the engine paints them on. All
of those are now clear.

**The cost, measured not described.** On a saturated canvas the whole ink budget
goes on clearing the background, so there is nothing left to build a *second,
quieter* level out of. Pairs where muted is visually indistinguishable from text
— under 1.15:1 between the two — went from **3.02%** to **19.10%** of palettes ×
themes.

**It is not tunable.** Shrinking the dark panel step from 10% to 4% only moves
the collapse from 16.27% to 12.27%, because the binding ground is the canvas and
not the panel. A hue-preserving walk that keeps the mix's hue and moves only
lightness rescues **24 of 1,895** collapses — contrast is a luminance property,
and no hue at that luminance is far enough from the text colour.

### Three options

- **A — ship as is** *(recommended, and this is what shipped)*. Everything is
  readable everywhere; on the 19% the hierarchy is carried by size and weight
  instead of colour.
- **B — move the canvas colour too**, the way the homepage cards do. Buys the
  hierarchy back, and shows the user a canvas colour they did not choose.
- **C — say so in the product**, the way Linear prints *"Contrast has been
  adjusted"* beside a user-picked colour. Extra build, extra words on screen.

**Why A was taken without asking first.** The alternative was leaving text
unreadable on most palettes, which is a live accessibility defect rather than a
preference — so it was taken **by the Director under standing authority** and is
brought here to be confirmed or reversed rather than to be approved in advance.

**The evidence for A is not taste.** Of eight comparable products checked on
Mobbin, where the canvas is a saturated user-chosen colour, **Polywork and
Squarespace both paint secondary copy in the same ink as the heading** and carry
the hierarchy with size and weight; Mailchimp, GitBook and Gamma keep the canvas
neutral instead and put the colour in blocks and accents. **Not one of the eight
paints a low-contrast tint of the ink on a saturated ground.**

**What would settle it:** keep, reverse, or add the on-screen note.

**Verdict:** _(PENDING)_

---

## Resolved

| Date | Proposal | Verdict |
|---|---|---|
| 2026-08-14 | P-001 · Ship the instrumentation before shipping more features | APPROVED — env guard + gate event shipped; per-tool activation partial |
| 2026-08-14 | P-002 · Give users somewhere to tell us something is wrong | APPROVED — every report now carries its route, tool and state; no API change needed |
| 2026-08-14 | P-003 · Decide what the free tier is for | ANSWERED — "a foot in the door". Silent system collapse now names the paid edge; remaining gates still to audit |
| 2026-08-14 | P-004 · Make Auto the default colour system app-wide | APPROVED — shipped |
| 2026-09-03 | P-012 · When the four parked homepage PRs resume | ANSWERED by #328 and corrected by #365 — a verdict and a cost per PR, re-measured by rebasing rather than estimating. Open only for the founder’s hero pick |
| 2026-09-04 | P-007 · Whether to delete the hero stat line | RESOLVED by the Director on `main`, by a third option neither side proposed — the strip is deleted, the numbers kept and attributed |
| 2026-09-05 | P-016 · What does Pro mean for the typography tools | ANSWERED — browsing is free, saving is Pro. Matches how the colour tools already gate |
| 2026-09-05 | P-019 · What we call design tokens on the site | DECIDED — **“Styles”** (option C), over our recommendation of “Foundations”. `token` survives past the export boundary only |
| 2026-09-05 | P-020 · The `pepsi` brand palette cannot be verified | DECIDED — rename it to its era. The palette stays, the claim goes |
| 2026-09-05 | P-021 · `google` left the free tier as a side effect | DECIDED — **make it free**, against our recommendation, knowing the tier already held six |
| 2026-09-05 | P-022 · `/community` monogram contrast | DECIDED — yes, per-item ink. Ten of twelve flip white → black, no colour changes |
