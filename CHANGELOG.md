# Changelog

All notable changes to UIL4B.

This file is the canonical shipped-release history, and it carries the standing
record of the **founder decisions** behind each release — cite it when a document
needs to point at where a call was actually made. Current product direction lives
in [`CLAUDE.md`](CLAUDE.md) (Direction); ideas still awaiting a founder verdict
live in [`docs/PROPOSALS.md`](docs/PROPOSALS.md); open engineering work lives in
`src/data/pipeline.js`. Don't use this file as a backlog.

---

## Unreleased

### The Library filter tray does multi-select

Founder request (2026-08-08). Two of its three parts turned out to be **already
shipped** — the sliding pill indicator and the Warm / Cool / Dark / Light colour
dots both landed with the `src/components/library/` extraction. What was missing
was multi-select.

`LibraryFilterGroup` takes an opt-in `multiSelect`; `value` then holds an array.
Shift, Ctrl or Cmd + click is additive, and two states collapse back to the
reset option because they are the same view of the data: **every option
selected** (the founder's "selecting all three types resets to All types" — three
lit pills that exclude nothing claim a narrowing that is not happening) and
**no option selected**.

**The keyboard equivalent is the same gesture, not a second one.** A button
activated with Enter or Space carries the live modifier state on the click event
it dispatches, so Shift+Enter is additive for the same reason Shift+Click is —
one code path, no chance of the two drifting apart. That is easy to assume and
easy to be wrong about, so there is a rendered test for Shift+Enter specifically.

The sliding indicator hides itself once more than one option is on: one box
cannot point at three things, and leaving it on the first would report a
narrower filter than is applied. The lit pills take over drawing their own fill,
so the tray reads the same either way, and `aria-pressed` carried the state all
along.

Enabled on the gradient **type** tray, which is what the request named. Every
other tray — including the mood tray beside it — keeps single-select until
someone opts it in, and there is a test pinning that.

### The One Tap guard stops failing runs at random

`assertOneTapNeverLeft()` fails the whole browser run if a single request
reaches `accounts.google.com`. It was failing runs that had not — on branches
that touched nothing near it, with a different spec implicated each time.

The stub was fine. The guard's bookkeeping was not: a failed request was called
an escape when the `context.route` handler had never taken charge of it.
Interception and the handler running are not the same instant, so a request
raised and then cancelled by a closing context was never in the WeakSet, and was
reported as having reached Google.

Classification now comes from the failure's own error text — DNS, connection,
proxy, TLS and timeout mean the request left the browser; everything else,
`net::ERR_ABORTED` above all, means it was cancelled where it stood. This is
also **stricter** in the case that matters: a network-class failure on a request
the handler *had* taken charge of used to be counted as an abort and hidden from
the report. The primary proof of an escape is unchanged and was never this — a
response from that host without the stub's header could only have come from
Google.

A guard that cries wolf is one people start ignoring, which is worse than not
having it.

### Two founder requests from 2026-08-08

**The gradient randomiser favours a two-stop linear.** "A weighting, not an
exclusion" — so every type and both stop counts still appear. Type is now
Linear 50% / Radial 25% / Conic 25% and the stop count 2 at 60%, which takes a
two-stop linear from 16.7% (tied-least-likely with every other combination) to
30% (the most likely), while the rarest combination stays at 10%. The pickers in
`src/utils/gradientRandom.js` take the roll as an argument rather than calling
`Math.random` themselves, so the distribution is asserted exactly instead of
sampled.

**The nav search expands on hover and types.** Hover or focus takes the field
from 300px to 390px and types six real tool names a character at a time, holding
and erasing between them.

- **Nothing runs until the pointer arrives.** The timer only exists while the
  field is hot, so the load-time budgets on `homepage-field-metrics` are
  untouched — and there is a test that asserts it.
- **Reduced motion gets the static label and no timer at all.** The global
  `transition-duration: 0.01ms` rule handles the width, but it cannot reach a
  `setState` loop, so the typing is gated on the resolved `reducedMotion`.
- **Assistive technology never hears it.** The button keeps its fixed
  "Search UIL4B" name and the animated span is `aria-hidden`.
- **A visible side effect, deliberately kept.** `.pnav-lead` is `justify-self:
  start` in a `1fr` track, so it is shrink-to-fit and the existing
  `flex-basis: 300px` was inert — the resting field was sized by its text, at
  ~177px. Measured on the first attempt at this: hovering made the field
  *narrower* (177px → 88px), because a half-typed word is shorter than
  "Search tools…". A definite `width` fixes that, and the resting field is now
  the 300px the stylesheet always claimed. Below 1180px the definite width comes
  back off, `.is-hot` named explicitly alongside it — a media query adds no
  specificity, so `.pnav-search.is-hot` would otherwise keep winning at widths
  that have no hover and no placeholder.

### The nav popover can be walked with the arrow keys

`usePopover` gained an opt-in `arrowNav`, and the nav's account panel (avatar
when signed in, meatball when signed out) turns it on. Up/Down step through the
panel's controls and wrap at both ends, Home/End reach either end in one press.

The panel stays a **disclosure**, not a `role="menu"`. That distinction was an
earlier deliberate correction — the panel holds a segmented theme control, links
and a status line, and menu semantics promise assistive technology a
single-tab-stop widget it is not — so the arrows are movement layered on top:
every control keeps its own tab stop, and a user who ignores the arrows loses
nothing. Escape-to-trigger, outside-press dismissal, focus-on-open and
Tab-past-the-end-closes were already in the hook and are asserted here so the
new handling cannot quietly swallow them.

Two guards worth naming, because both were reachable: the handler is bound on
the document in the capture phase, so without a containment check it would have
hijacked every arrow key on the site for as long as any popover was open; and
Home/End/arrows are never taken from a text-entry control, where they belong to
the caret.


### Design Language V2 — token foundation

The token layer of [`docs/reference/design-language-v2.md`](docs/reference/design-language-v2.md),
which is added here as the source of truth for the V2 look. Values move; token
**names** and the M3 role-generation method do not, so the rest of the product
inherits V2 without a call-site sweep.

- **Type.** Two families replace Outfit in all three roles: **Manrope**
  (`--font`/`--serif`) and **JetBrains Mono** (`--mono`). `--serif` is retired as
  a distinct role and aliases `--font`; the name stays so its call sites keep
  resolving. Both self-hosted and variable, as Outfit was. Both latin subsets are
  now preloaded — V2 makes mono load-bearing *above the fold* (nav wordmark,
  eyebrows, stat line), so it is a first-paint font rather than a detail font.
- **Radius.** Remapped in the token block only — 6/10/12/14/16/18, plus a new
  `--radius-3xl:24px`. Roughly 1000 existing call sites inherited V2 rounding
  from that single edit, which is the entire point of having a named scale.
- **Colour.** Reseeded onto the existing `--bg-0..4` / `--t0..t3` / `--border` /
  `--card` names. Light is a warm bone page (`#EFEEE9`) with white cards, ink
  `#0F0F10`, mute `#6C6C66`, line `#DAD8CF`. Dark is `#101012` / `#191A1D` /
  `#F2F1EC` / `#8E8E88` / `#2A2B2F`. The accent is the **founder-selected blue**
  (decision recorded 2026-08-16 in `design-language-v2.md`): `#0F6FFF` light,
  `#6FA8FF` dark. The design file's default violet is **not** used anywhere.
  Every `rgba()` wash that was hard-coded from `37,99,235` was recomputed from
  the new seed rather than left behind.
- **New tokens.** `--hi` (`#E9FF64`) and `--hi-fg`, deliberately identical in
  both themes — the accent lightens in dark, the highlight does not. Plus
  `--shadow-cmd` and `--shadow-panel`, and a global `::selection` using the
  highlight.
- **Shape.** V2 has one button shape. The shared `.btn` family moved to
  `--radius-pill` with three treatments: Primary, the new `.btn-inverse`
  (ink fill, page-coloured label), and Quiet (the base rule). Adds `.hover-lift`
  — `border-color` to ink **and** `translateY(-3px)`, together, on the named
  motion scale.

**Two things measurement changed, rather than confirmed.**

The light background ladder is no longer a straight grey ramp. On a `#EFEEE9`
ground, *no* darker-than-page surface can carry the spec's mute at AA — the
closest candidate still measured 4.43:1 — so cards rise to white instead:
`--bg-2` now sits between bone and white, and only `--bg-3`/`--bg-4` recede.
`--t3 #6C6C66` measures **5.28 / 4.55 / 4.84** on the three grounds it is
actually used against. The 4.55 has 0.05 of headroom over the AA floor, so the
page cannot get darker without moving the ink with it.

Manrope's real variable axis is **200..800** — read from the shipped `fvar`
table, not assumed — against Outfit's 100..900. Two Palette Builder preview
headings ask for `900` and now clamp to 800. V2's own display scale tops out at
800, so this is accepted rather than swept, and
`tests/unit/hero-entrance.test.js` now bounds the exception so a third
out-of-axis weight fails the gate instead of clamping silently.

**The blue is not safe for small text, and that shaped the whole slice.**
`#0F6FFF` measures **3.82 / 4.43 / 4.06** on the page, white and `--bg-2`. It
clears the 3:1 floor for large display text and non-text UI but misses 4.5:1 for
normal text — and V2 leans on 11–12px mono eyebrows, counts and category labels.
So the two accent tokens now carry different jobs: `--accent` for fills, borders,
icons, focus rings and large display text; **`--accent-strong` `#0B5ED7`
(5.03 / 5.84 / 5.35) for all accent-coloured text below large size**.

The same split fixed two failures found by rendering rather than by reading.
`.ui-pill-accent` — the shared primitive behind the nav "Start for Free" and the
hero CTA, the most-seen control in the product — filled with `--accent` and put
white on it: **4.43:1**. Worse, its rule reached the readable `--accent-strong`
only on *hover*, so the resting state was the failing one. `.btn-accent` had the
mirror problem, and its `--brand-soft` hover dropped the label to **3.11:1** —
hovering a button made it harder to read. Both now fill with `--accent-strong`
and express hover through lift and shadow, which costs nothing in contrast.

`--accent-fg` is theme-scoped for the first time: white in light, ink in dark.
The dark accent is a *light* blue, so white on it measured **2.41:1** — a bad
failure across every accent-filled control, not just buttons. Ink on the same
fill is 7.89:1, and the flip is the correct M3 on-primary behaviour.

**Verified by rendering, not by reading the stylesheet.** A whole-page contrast
audit that composites translucent stacks down to opaque colour was run at 1440
and 390 in both themes: `/plans` dark is **0 failures across 107 text
elements**, and the homepage CTA moved 4.43 → **5.84** (light) / **6.09** (dark).

**Known, not fixed** — all owned by `Home.jsx`, which is out of scope for this
slice: 11 `.hsat-proxy-label` tool labels measure 4.03–4.37 against a 4.5 floor,
and `.home-report-*` / `.hw-pal-hex` render *generated* colours, where a low
ratio is the tool honestly displaying a bad pair rather than a UI defect. The
homepage also paints a blue radial wash over the page, which the spec explicitly
forbids ("do not tint the page with the accent hue"). All handed to the Home
workstream.

---

## 2026-08-15 — The hero, measured rather than guessed (#248, #249)

Founder report, for the second time: *"also make the hero animation better its
not smooth."* #215 had already rebuilt the hero, so this needed measurement, not
another rewrite. Removing the obvious suspect — a `filter: blur(12px)` tween —
moved dropped frames from 21 to 22, i.e. nothing. A CPU profile then showed 66%
idle, ruling out script, and a devtools trace found four separate faults:

- **The entrance could not start until a ~40KB chunk arrived.** It ran from a
  GSAP timeline with a JS class holding the headline at `opacity: 0` until the
  dynamic import resolved — ~350ms of blank hero on a throttled CPU, then a pop.
  It is CSS keyframes now: it begins at first paint and survives the motion
  chunk failing outright
- **It animated `filter: blur(12px)`** across the largest text on the page,
  re-rasterising every frame. Transform and opacity only now; a trace confirms
  `compositeFailed: 0`, so a busy main thread no longer stutters it
- **The "clip up" never clipped.** `.home-hero-line` had no `overflow: hidden`,
  so despite `yPercent: 110` the two headline lines slid *through* each other
- **The font took two sequential third-party round trips** and landed at ~587ms,
  dirtying all 851 boxes in a 262ms full-document relayout mid-entrance. Outfit
  is self-hosted and preloaded now

Layout total fell 407ms → ~200ms; CLS measured **0.0000** against a 0.05 budget.
The decisive experiment was a warm-cache run — same page, same DOM, 27ms of
layout — which proved the cost was resource arrival time, not the page.

**A design bug found on the way.** `global.css` authors sixteen weights, ten not
multiples of 100 (450, 550, 720, 750 …), but the request asked for nine *static*
instances, so every one was silently rounded — the hero `h1` asks for 720 and was
rendering at 700. The variable axis renders them as authored, in one file
instead of nine.

**Honest negative result:** blocking Google One Tap changed layout not at all
(397ms vs 407ms). It still costs a 247ms background parse and five requests on a
signed-out homepage — a real issue, but not this one.

## 2026-08-15 — The free tier is a foot in the door (#247)

Founder verdict on PROPOSALS P-003, recorded verbatim: *"the free tier is a food
in the door"*. The Palette Builder silently collapsed non-free harmony systems
for signed-out and Free users — the paid edge was invisible, so it read as the
tool being broken rather than as something to upgrade for. The collapse is now
explicit and named. Also completed a missed P-004 fallback (`'analogous'` →
`'auto'`).

## 2026-08-14 — Instrumentation, and the questions it answers (#245, #246)

- **P-001 — stop counting ourselves.** Every environment (localhost, every
  preview deploy, every CI run walking ~30 routes) wrote into the same shared
  `analytics-daily` counters, so the admin dashboard mixed real users with our
  own robots. Shared analytics are now allowlisted to production hosts only,
  fail-safe: an environment we do not positively recognise is not production
- **P-002 — a bug report now says where the user was.** Reports arrived as free
  text with no route, no tool and no state, so acting on one began with "which
  page were you on?" — and most people never reply. Context is captured
  automatically. Deliberately *not* captured: document content, palette colours,
  prompt text, project names. The query string is dropped too, because the
  colour tools encode full palettes into `?c=`

## 2026-08-14 — Colour, type and the tokens that never applied (#242, #243, #244)

- **Seven design tokens did not exist**, so 20 declarations were silently
  invalid and dropped — undefined CSS custom properties kill the whole
  declaration, which is why the symptom was square corners and flat shadows
  rather than an error
- **Palette slot labels now describe the colour actually in the slot.** Every
  harmony system showed the same five labels (PRIMARY, SECONDARY, ACCENT,
  SUBTLE, DEEP) regardless of what it generated. Founder report: *"these should
  update based on system."* Labels are now per-system; the underlying export
  token identity is unchanged
- **Heading structure, a duplicated `h1`, font-gallery corners, and wider type
  scales** — including the typical web type scales the founder asked for

## 2026-08-13 / 14 — Accounts, community and honesty (#235–#241)

- **Community submissions never left the browser, and nobody could review
  them** (#241). The admin claim was never actually granted, so moderation had
  never worked for anyone. Founder report: *"my user submitted other gradients
  that i do not see under my pending submissions"*
- **Onboarding is shown once per person, not once per browser** (#240) —
  founder report: onboarding should only appear on first login
- **A new account no longer lands on the page trying to acquire it** (#239)
- **The Community page invented twelve designers and their save counts** (#238).
  Fabricated social proof, removed
- **The feedback form had no labels, and focus was invisible on swatches** (#237)
- **Nothing is clipped out of reach at 320px** (#236) — the flex/grid
  `min-width: auto` trap across four routes
- **A real 404, and a CI build that runs what production runs** (#235). CI ran
  `npx vite build`, which skips the prerender step, so the build production
  actually deploys had no coverage. Also fixed an offline `vite:preloadError`
  reload loop that was both a CI flake and a real user bug

## 2026-08-12 — Account lifecycle (#231–#234)

- **Account deletion that is legal and actually works** (#231). Order is
  billing → data → auth, deliberately. Took the last of the 12 Vercel function
  slots
- **Show the AI allowance before someone hits it** (#232)
- **"Export my data" now means all of it** (#233)
- **The style guide as an image** (#234)

## 2026-08-12 — Billing signals: the state we collected but never showed

`api/stripe-webhook.js` had written `paymentFailed`, `hostedInvoiceUrl`,
`trialEndsAt` and `trialEndingSoon` to Firestore since it was built. Grepping
`src/` for any of the four returned **zero hits** — finished backend work with
no consumer. Meanwhile `SubscriptionContext` dropped a user to Free the instant
Stripe flipped status, so an expired card silently removed Pro and the customer
discovered it by hitting a limit.

- **A seven-day grace window.** A `past_due` subscription keeps Pro while
  Stripe retries the charge, on the server (`api/_lib/plans.js`, the security
  boundary) and mirrored on the client. Not extended to `unpaid` or `canceled` —
  those mean the retry schedule is exhausted
- **An app-wide banner** naming what happened, what it costs, and the one link
  that fixes it — the hosted Stripe invoice URL the webhook had been storing
  and nothing had ever used. Mounted outside `AppInner` so it reaches the
  chromeless Create tools, which is exactly where a lapse gets felt
- Also surfaces **trial ending** (with the date) and **scheduled cancellation**
  (stating plainly that nothing is deleted, because nothing is)
- Two webhook correctness fixes found while wiring it up: `paymentFailedAt` is
  now stamped once and preserved across retries, and `writeSubscription` only
  clears the failure flags on a healthy status

**The trap worth remembering:** the grace window cannot be anchored on
`currentPeriodEnd`. Stripe advances the period end *before* it finalises the
renewal invoice, so when that invoice fails the period end is already a month
out — grace measured from it would have run ~37 days instead of 7.

Unit 229 → 251, browser acceptance 205 → 208, lint unchanged at 32.
Full detail: [`docs/account-lifecycle-audit-2026-08-12.md`](docs/account-lifecycle-audit-2026-08-12.md) § B1.

---

## 2026-08-12 — The style guide as an image

Completes the export work: the style guide now also exports as a **single A4
sheet**, PNG or JPEG, at 2× (1588×2246).

- Palette with the hex on each swatch and its measured contrast underneath
- The full type ladder, set in the system’s own fonts
- Free exports carry the credit line; Pro exports are clean — the same policy
  the HTML guide already follows

**Drawn on a canvas, not rasterised from the HTML.** `<foreignObject>` silently
drops webfonts in several browsers and taints the canvas the moment anything
external is referenced, so the download either fails or comes out in Times New
Roman — a style guide that misrepresents the user’s typography is worse than no
image. html2canvas is ~200KB that reimplements a layout engine approximately.
This document is a known structure over known data, so drawing it directly is
exact, dependency-free and deterministic.

**One sheet, not the HTML version’s four pages.** An image is for pasting into
a deck or a handoff ticket; four PNGs would need a zip and nobody pastes four
images. The booklet already exists as HTML → print to PDF.

The layout is a pure function returning draw operations, so the composition is
unit-tested without a DOM — including that nothing runs off the page on an
aggressive type scale, that a capped drawing still prints the **true** size,
and that every hex label is drawn in an ink that actually passes on its swatch.

Two bugs those tests caught before they shipped: `inkFor()` returns
`{ ink, ratio, label }` and was being used as a colour string (every hex label
would have drawn in the wrong colour), and the type ladder’s field is `px`, not
`size` (every specimen would have been `NaN`).

Unit 313 → 330.

---

## 2026-08-12 — "Export my data" now means all of it

The export iterated a hand-maintained 15-key list while the app writes about
forty. Measured on a real browser: **16 keys present, 9 of them missing** from
a file the user was told was their data. `vs-accounts` — email, display name
and photo for up to five accounts — was neither disclosed, exported, nor
cleared. And it read localStorage only, so a signed-in user got none of their
Firestore profile or synced projects.

- **Enumerated by prefix, never by list.** A list is a promise someone will
  remember to update it, and that promise had already been broken nine times
- The export now carries localStorage, sessionStorage, the Firestore profile,
  `users/{uid}/sync/data` and the account identity. A server read that fails is
  **recorded in the file** rather than silently dropped
- An undescribed key is still exported and still disclosed, marked
  `pii: unknown` — a documentation gap must not become a data gap

**The privacy policy described storage that does not exist.** It held a third
hand-written copy of the list, disclosing `vs-users` — *"Account credentials
(email + hashed password) for local accounts"* — and `vs-session`. Neither key
exists; the app moved to Firebase Auth and stores no password, hashed or
otherwise. The table is now generated from the shared source.

**Settings claimed "Everything UIL4B stores lives in your browser."** False for
any signed-in account.

**A white screen, found while verifying the above.** `analytics.js` loaded
stored values with `JSON.parse(...) || fallback`, which only catches null — so
a valid-JSON *object* where an array was expected passed through and threw
`push is not a function` on the next page view, on **every page load**, until
the user cleared their storage. Reachable by a stale schema or by someone
hand-restoring their own data export. Now shape-checked against the fallback.

Unit 294 → 313. Lint 32 → **31** (the inline `style={}` objects moved to
global.css, retiring one warning).

---

## 2026-08-12 — The AI allowance, shown before you hit it

The warning machinery was already written and wired to nothing.
`usageTracker.js` exported `getRemainingUses` and `getResetTime` — exactly the
two functions needed — and neither was imported anywhere. `purgeStaleUsage` was
never called once, so every `vs-usage-<tool>-<date>` key a user generated stayed
in their browser forever. The server returned `usage: { used, limit, remaining }`
on every response and no caller read it.

- **The monthly ceiling is visible at last.** Free is 5/day *and* 40/month, but
  the client only ever knew the daily figure — so a free user hit the monthly
  wall on day 8 with no warning, and the server's `period: 'month'` refusal
  rendered as a generic error. Both bars now show, and both tools block on
  whichever ceiling comes first
- **The meter sits above the tool, not beside the button.** The allowance is
  something to know before uploading forty images, not after the eighth refusal
- `api/ai.js` now returns the monthly figures on **success** too, not only in
  the 429 that enforces them
- `purgeStaleUsage()` runs on app start

Two rules the code holds, because getting either backwards is what made the old
behaviour feel broken rather than metered:

**The server is the truth.** The localStorage tracker counts one browser; the
ceiling is per account. A second device, a cleared cache or a private window all
make the local count an undercount, so where the two disagree the figure leaving
*less* headroom wins. A quota that reads generous and then refuses only fails at
the moment of use.

**Never name the wrong reset.** The daily bucket resets at midnight, the monthly
one on the 1st. Telling someone their monthly wall "resets at midnight" is a lie
they act on by coming back tomorrow to the same wall.

Unit 273 → 294, lint unchanged at 32.

---

## 2026-08-12 — Account deletion that is legal and actually works

Founder decision: explicit approval to proceed on the auth/Stripe/deletion work
that [`human-validation-zones.md`](docs/reference/human-validation-zones.md)
gates ("continue all you have full permissions").

Deleting an account used to do three things wrong at once:

- **It never touched Stripe.** A Pro user who deleted their account **kept being
  charged**, and the billing portal — the only cancellation route — needs an ID
  token they can never mint again. Support email or chargeback were the only
  outs. Now every subscription that can still bill is cancelled first, and a
  Stripe failure **aborts the deletion** rather than deleting an account we are
  still billing
- **It left the data.** It deleted `users/{uid}` alone, and Firestore does not
  remove subcollections with their parent — so `users/{uid}/sync/data`, holding
  every synced project, prompt and design, survived a dialog that said "and all
  associated data". Now the profile, sync data, community prompts, feedback,
  uploaded media and AI usage counters all go
- **It was broken for Google users** — the primary sign-in method. It skipped
  reauthentication for them and then called `deleteUser()`, which throws
  `requires-recent-login`. Meanwhile the dialog asked a Google-only account for
  a password it does not have, and mapped only `auth/wrong-password`, so
  everything else surfaced as `Firebase: Error (auth/requires-recent-login).`

Deletion is now one server-side transaction (`api/delete-account.js`), which is
also what makes the Google case work: the Admin SDK needs no recent login. The
security reauthentication was providing is kept by verifying `auth_time` on the
token — five minutes — somewhere the client cannot lie about it.

**The order is the safety property, and a test asserts it:** billing → data →
auth. The auth user is deleted last, because a failure after it is gone orphans
data with no token left that could ever authorise another attempt.

The Settings dialog no longer asserts "all associated data"; it lists what goes,
and the list is now true.

Unit 251 → 273, lint unchanged at 32. **The API is now at exactly 12 of 12
Vercel functions** — the next endpoint has to replace one, and a test fails the
build if the count goes over.

---

## 2026-08-11 — Founder batch 4: sliders, honest pricing, the hero, and the fold

Six PRs, each verified in a rendered browser and merged green to `main`:
[#213](https://github.com/VASARI-STUDIO/UIL4B/pull/213),
[#214](https://github.com/VASARI-STUDIO/UIL4B/pull/214),
[#215](https://github.com/VASARI-STUDIO/UIL4B/pull/215),
[#216](https://github.com/VASARI-STUDIO/UIL4B/pull/216),
[#217](https://github.com/VASARI-STUDIO/UIL4B/pull/217),
[#218](https://github.com/VASARI-STUDIO/UIL4B/pull/218).

### Palette Builder
- The four adjust sliders **soft-snap to centre**. A snap point can now carry
  its own radius, so zero gets a wide detent while the intermediate marks stay
  light — one shared radius could only make all three equally sticky
- **All four tracks follow the palette.** Pulling Hue to orange repaints the
  Saturation, Tone and Temperature bars in orange, instead of leaving them in
  the blue that no longer exists on screen
- **Hue is ±50**, not ±180. Boards saved under the old range open looking
  exactly as they were saved, through the existing re-derive-and-compare check
- **The hex field reports the colour on screen.** It showed the *base* seed
  while the board showed it hue-rotated, so a field reading `#4A56AE` sat above
  an orange palette. Typing a seed now zeroes the lens

### Access
- **UI System mode is admin-only** while unfinished — it was advertising a Pro
  upgrade for something not ready to sell
- **`/style-guide` is admin-only.** It was behind sign-in alone, so every
  account on the site could read the internal design system

### Plans — founder decision: free provider tiers only, no spend until revenue
- AI limits recalculated from the **shared** ceiling downward. Free tiers meter
  *per project*, not per user, so the old 1,000/day Pro figure was oversold at
  two simultaneous users. Now **Free 5/day · 40/month, Pro 30/day · 300/month**,
  with the arithmetic recorded in `api/_lib/plans.js`
- A **monthly ceiling** is now enforced, not just advertised
- The claim was wrong in **seven** files including Checkout — the page read at
  the moment of payment. All now derive from one table, guarded by a test
- **"Higher-quality AI models" removed.** Both plans resolve to the same model
- **The one-off tier is no longer sold.** Existing entitlements still honoured
- Fixed: the Pro CTA invited payment even when the price service returned null

### Home
- **The hero owns the first screen** (`min(100svh, 980px)`), so the workbench is
  no longer visible before scrolling. Four tests assert it across four viewports
- **The jitter is fixed at its root.** Eleven infinite tweens drifted the
  satellites while the convergence measured its travel vector from inside those
  moving elements — the two were animating the same coordinates against each
  other
- The **splash is gone**; the arrival is one quiet settle of the shell
- The workbench wears **app chrome** — title bar, live breadcrumb, state readout

### Type Scale
- **A real ladder per breakpoint**, joined by `clamp()`. Mobile gets its own
  base and its own gentler ratio, because a ratio compounds and one cannot serve
  both ends. The preview reads from the same helper the export is built from, so
  it can no longer show one thing and ship another

### Discover
- **The Prompt Library is live** at `/discover/prompts` — it was finished but
  never mounted, so `/prompts` rendered the "still building" state. Free tier
  raised 5 → 12
- **Alt Text Generator restored**, in the nav and the crawler sitemap
- **Palette Library swatches carry hover actions** — Builder, Project, Gradient,
  CSS, Hex — reachable by keyboard as well as pointer

### Testing
- Three agents added: `ux-researcher`, `usability-tester`, `monetisation`
- **The recurring Iconify CI flake is fixed at root**: an unbounded
  `waitForLoadState('networkidle')` in a spec that reaches a third-party API let
  a slow request eat the whole test budget, then failed reporting something else

Baselines moved to lint 32 (one fewer — the plan tables moved out of a component
module), unit 210, browser 183 pass / 13 skipped. The 13 skipped are
`12-ui-system-builder.spec.js`, unreachable while the tool is admin-only and the
suite runs signed out.

---

## Unreleased — Founder batch 3: in-place sign-in, a continuous snap, a bounded panel

On the `fix/nav-login-slider-panel` branch. Three founder-reported defects,
each reproduced in a browser before it was touched and each left with a
regression test.

### Account
- Signing in from the nav no longer navigates. "Log in" and "Start for Free" —
  in the bar, the signed-out menu and the mobile sheet — now open the login
  popup over the page you are on, so both the X and a successful sign-in leave
  you exactly where you were. Previously they routed to `/login`, which
  unmounted the page before the popup existed and dropped the user on `/home`
  when they closed it. `/login` is unchanged as a route, for bookmarks and for
  protected-route redirects
- The bottom-of-page "Start building free" block on the sales pages does the
  same for signed-out visitors
- A brand-new sign-up started from anywhere still returns to where it started
  after onboarding: the destination is now recorded where the popup opens
  rather than on the `/login` route, and a launcher is no longer recorded as a
  destination
- A protected route now carries its query string through the sign-in redirect,
  so `/checkout?plan=yearly` no longer loses the chosen plan

### Palette Builder
- Temperature crosses zero continuously. Magnetic snapping used to switch off
  at the snap radius, so the value leapt by the whole radius as the pointer
  crossed it — the readout went 7 → 0 → −7 and nothing in between could be
  reached by dragging. The snap's pull now fades to nothing at the radius
  instead, so one pixel of pointer travel moves the value by at most one step
  more than the track's own resolution. Snapping itself is unchanged in feel
  near the snap, and keyboard stepping still bypasses it entirely. Applies to
  every shared `SnapSlider`

### Font Pair · Tint Scale
- The sticky "Choose the pair" configuration panel is bounded by the viewport
  and scrolls internally, so "Build a scale from this pair" is always
  reachable. It previously stood 906px tall against 808px of usable height at
  1440×900 and was clipped rather than scrollable. The Tint Scale panel had the
  same unbounded pattern and was fixed with it. The sticky movement is
  unchanged, and below 981px both panels stack in the page flow as before

### Founder direction (2026-08-08, in conversation)
- Reported the auth popup closing to the wrong page, the Temperature slider
  glitching around zero, and the Font Pair panel running off the screen

---

## 2.8.1 — Palette temperature and shared layout rhythm

### Palette Builder
- Temperature no longer moves out from under the pointer on the first drag.
  The Reset action now reserves its row space at rest, and edited-label
  emphasis no longer changes the adjustment grid's measurements
- Temperature now reaches genuinely cool and warm endpoints. The old half-pull
  stopped blue and purple palettes in magenta at the warm end; the HCT path and
  its HSL fallback now follow the same full-range behaviour
- Every shared `SnapSlider` now exposes and visibly bolds an edited value. The
  Palette Builder also emphasises the matching field label without shifting its
  track, then returns both to rest styling when the value returns to its default

### Shared interface
- Expanded the shared desktop content span from roughly 1400px to 1680px for
  the PillNav, tool bars, tool footers, UI-system sections and app footer.
  Existing compact mobile spacing is preserved

### Founder direction (2026-08-07, in conversation)
- Requested a working Temperature control, unmistakable edited slider values,
  and wider left/right spacing across the shared navigation, tools and footer

---

## Unreleased — The Director model, and one home per fact

Documentation and records only; no application behaviour changed. On the
`docs/director-model` branch.

### Roles and structure
- The project-manager role became the **Director**: the same never-writes-code
  rule, plus responsibility for proposing product ideas and reading user
  feedback, measured against whether work landed with users rather than whether
  it landed on `main`. Operating doc: `docs/reference/director.md`, which
  supersedes and replaces the retired `docs/reference/project-manager.md`
- Added `docs/PROPOSALS.md` — the standing queue of ideas the Director proposes
  and the founder approves or denies, each with an honest evidence class and an
  explicit verdict line. Bugs never go there; they go to `src/data/pipeline.js`
- Retired `docs/BUILD-PLAN.md`. Product direction moved into `CLAUDE.md`
  (Direction), the canonical map and standing release rules moved into `CLAUDE.md`,
  and everything else it held was already a pointer to `src/data/pipeline.js`,
  `CHANGELOG.md` or `docs/OWNER-ACTIONS.md`
- Retired `docs/DECISIONS-NEEDED.md`. Its resolved-decision record is now kept in
  this file, per release; its one open item was approved and became engineering
  work (below)
- Repointed every agent, skill and reference document at the surviving homes, and
  renamed the coordinator from "the PM" to "the Director" throughout

### Founder decisions (2026-08-07, in conversation with the Director)
- **Approved: fix the subscription-chargeback gap.** The refund and dispute
  revocation path in `api/stripe-webhook.js` is keyed to the one-off
  `lifetimeEntitlement.paymentIntentId`, so a reversed *subscription* charge can
  leave a yearly entitlement active. This is no longer an open product decision —
  it is a queued P1 security item requiring a Human Validation Zone slice and a
  security review before merge. Not yet implemented
- **Recorded: the production OpenRouter key is set and redeployed.** Founder
  statement: "openrouter key is updated and redeployed". This closes the owner
  action that had blocked it. It does **not** mean the OpenRouter path has been
  exercised — no production request has been verified through it, and a wrong or
  rate-limited key fails over to Gemini silently, so a new queue item covers that
  verification

---

## Unreleased — Palette Builder founder batch 2

On the `fix/palette-builder-founder-batch-2` branch, not yet merged.
`package.json` stays `2.8.0`; cutting a version number is a release decision,
not something this batch assumes.

### Palette Builder
- Toolbar icon buttons now EXPAND to hold their label instead of floating it
  over the control beside them: the label moved into the button's normal flow,
  so the box grows across the label's real width and the text always sits
  inside the button's own bounds
- Below 961px, where the toolbar's action group is a horizontal scroller, those
  labels are pinned open rather than revealed on hover — which also closes the
  separate report of labels being clipped in that band
- Each colour column is now titled with a name describing the colour in the
  slot, derived from the colour itself, so switching colour system re-titles
  every column whose colour moved. The name is deterministic per colour, so the
  same colour always reads the same and nothing churns on an unrelated
  re-render. The positional role (PRIMARY … DEEP) stays as an eyebrow — exports,
  tints and the UI preview key off it
- "Continue in Palette Builder" on the homepage mini-builder now hands the board
  the five swatches the visitor generated AND the colour system to open on:
  **Auto**, the tonal system that is free for everyone. It previously carried
  nothing, so the board fell through to its own default of Analogous — a paid
  system for a signed-out visitor

### Accessibility
- Fixed a keyboard trap in `SnapSlider`, which affected every caller (Palette
  Builder, Tint Scale, Type Scale, File Converter, Icon Library, the HCT
  picker): every change ran through the magnetic snap, including keyboard ones,
  so from a snap point an arrow key produced a value inside the snap radius and
  was pulled straight back. A keyboard user could not move these sliders at all.
  Snapping is now gated on a pointer being down — deliberate magnetism for
  drags — while arrow keys step exactly, PageUp/PageDown move a tenth of the
  range and Home/End reach the ends

---

## On `main`, not yet version-tagged — Palette & Gradient founder batch (#202)

Merged to `main` at `8f4e5ae` and therefore live via the Vercel auto-deploy.
`package.json` is still `2.8.0`; cutting the next version number is a release
decision the founder/release-captain makes, not something this batch assumed.

### Font Gallery
- Rebuilt the catalogue as a single, full-width editorial list with one typeface per line and responsive mobile geometry
- Removed programming, monospace, emoji, icon, barcode and symbol families from gallery search, counts and category controls

### Palette Builder
- Made each global-adjust slider handle a lens onto its own track: the dot's centre now shows the colour that position represents, sampled from the same stop list that paints the gradient, inside opposed white/near-black rings that stay visible against any track colour in either theme
- Fixed hovering a toolbar icon button revealing an empty pill instead of its label — the absolutely positioned reveal label had an indefinite inline size, so the `0fr → 1fr` track resolved to `0px`
- Made Randomise respect the selected colour system; Monochromatic was routed to the tonal engine, which puts one role on a sibling hue, so a mono shuffle returned two hues

### Gradient Generator
- Adding a stop is now one press-and-drag gesture: the handle is created on pointer-down, stays visible and enlarged throughout the drag, shows a live position readout, and takes focus so the arrow keys nudge it straight away
- Added `touch-action:none` to the stop rail and handles so a touch drag moves the stop instead of being claimed by the page scroller
- Added "Submit for review" — a gradient can be queued for the gradient library on the existing local-first submission pattern, shown as pending (never published) in the gallery, and withdrawable

---

## v2.8.0 — Typography & UI System Release (2026-07-31)

Shipped across #196–#200.

### Search, Motion & Housekeeping
- Added per-route canonical, Open Graph and Twitter metadata, and `noindex,follow`
  for Soon routes, replacing the single static homepage canonical every route had
  been emitting (#198)
- Consolidated every duration and easing onto one motion token scale, converted
  the hover-reveal labels from `max-width` to `0fr → 1fr` so the whole easing
  curve plays across the real content width, and made reduced motion near-instant
  rather than merely fast (#199)
- Removed 6 unrouted pages, 7 unreferenced components and their orphaned CSS,
  each confirmed unreferenced before deletion (#196)
- Stopped tracking `node_modules`, which had been committed as a self-referential
  symlink that broke `npm ci` on any clone into the same path (#199)

### Typography & Homepage
- Activated Font Gallery, Font Pair Finder and Type Scale as three live, connected Create tools with a shared resilient Google Fonts catalogue
- Added Typography as the fifth homepage mini-workspace mode, with icon-led tool satellites and a reduced-motion-safe merge and splash sequence
- Added versioned in-memory hand-offs between the homepage and typography tools, plus loading, fallback, retry, keyboard and dialog coverage

### Palette & Tint
- Reconciled Palette Builder gutters and control sizing, removed toolbar height shifts, matched the initial random seed to the first swatch and kept Palette ↔ Tint navigation explicit
- Improved Temperature and other slider tracks, repaired requested-versus-achieved HCT editing, moved contrast guidance to each swatch and added directional swap and multi-insert menus
- Replaced generic preview placeholders with authored UI, brand and graphic scenes, while keeping additional preview scenes visibly Pro-gated

### UI System Mode
- Added deterministic perceptual 100–900 Brand, Success, Warning, Error, Information and Neutral scales from a user-selected 500 seed
- Added per-shade editing and copy, WCAG AA/AAA evidence, black/white text recommendations, light/dark component labs and five applied interface scenes
- Kept complete generated-system previews visible to Free users while Pro gates editing, expanded scenes and CSS, DTCG and Tailwind exports

### Project Truth & Quality
- Consolidated current planning, owner actions and founder decisions into a single canonical hub, removing duplicate and closed audit/setup documents
- Recorded the founder-confirmed Firestore rules publication while keeping Storage, custom-claim, live auth/payment and other external checks explicitly open

### Founder decisions behind this release

Six calls made across 2026-07-28 → 2026-07-31 set the shape of v2.8.0 and the
billing work that preceded it. They are recorded here because this is where the
decisions and the release that carried them meet — nothing else in the repository
holds them.

- **2026-07-31 — Free-tier caps: keep them.** 3 saved projects and 8 custom icons stay as they are
- **2026-07-31 — Community publishing architecture: Firebase.** Firestore plus Storage, with a transactional lowercased handle registry and moderation state
- **2026-07-31 — Public SEO rendering: prerender, yes.** Prerender eligible public routes; exclude Soon, authenticated and admin routes
- **2026-07-31 — Homepage typography: add it.** Typography becomes the fifth mini-workspace tab, and Font Gallery, Font Pair Finder and Type Scale are activated as live tools
- **2026-07-31 — UI System Mode: build the functional premium mode now.** Free users may preview the generated output while editing and export stay Pro initially
- **2026-07-28 — Lifetime tier: build it.** Ship one-off billing support; the owner still controls creation and activation of the live Stripe price

---

## v2.7.0 — Public UI Quality Release (2026-07-25)

### Public Shell
- Reframed the home hero around one connected UI system while preserving the interactive Create preview directly below it
- Rebuilt mega-menus around task-led editorial hierarchy, complete keyboard navigation and a focus-safe mobile sheet
- Added a reusable beams-style closing CTA to Home, Colour, Surface and Plans, plus a clearer public footer
- Removed UI Colour from public navigation, search and sitemap data; `/color/ui` now redirects safely to `/color`

### Tool Workflows
- Refined Gradient, Tint and Semantic Colour workbenches for clearer responsive use
- Added Palette Builder Reset with immediate Undo and clarified the existing Save / export group without removing options
- Unified the Icon + Emoji command header with distinct mode symbols, keyboard switching and visible loading/offline states

### Community & Quality
- Added the founder public identity **Dylan Coleman 👑** with an accessible owner treatment
- Reconciled the Build Plan, pipeline, module board, README, changelog and tool tree; archived completed floating task lists
- Release-gated with production build, lint, interaction and cross-device checks

---

## v2.6.0 — Workspace Repositioning, Nav & Home Rebuild, Colour + Icon Tool Overhauls

### Positioning & App Shell
- Product repositioned around three surfaces: **Create** (build), **Discover** (browse), **Learn** (understand)
- Home page rebuilt (Mobbin-inspired) with live Create previews and a two-line hero
- Navigation rebuilt: fixed full-width top bar with mega-menus (labelled column groupings, deep links), global section switcher, centred search, and a 3-dot utility menu; profile popover absorbs settings and promotes the Upgrade CTA
- New public pages: `/plans` pricing page, visual site map at `/sitemap`, Discover/Learn sales pages

### Colour Tools
- Colour Studio rebuilt in slices: Colour System popup, "See it shipped" UI previews, dark-default theme
- Every colour feature split onto its own routed tool page with real page chrome and a cross-link footer; `/color` sales page with Design System Builder entry
- **Palette Builder v3** (7 waves): full-bleed workbench, unified toolbar/button system, canonical Pro modal, drag-anywhere swatch reorder, free colour cap raised 6 → 8, persisted variations, brand-territory seed randomiser, wholesale brand-system apply with proper Pro gating, drag-and-drop image picker, bookmark save + community submit popup, editorial palette names, user handles & flair
- Tint tool upgraded: multi-ramp, palette import, real perceived/linear scales, 0–1000 steps
- **Gradient Cockpit** overhaul: restyled to the design system, palette/project import, presets, and a new Discover gradient gallery (38 curated gradients with search, tag/type filters, likes, Copy CSS, and one-click "Open in Cockpit" hand-off)
- UI State Colours page redesigned; palette-picker replacement; fixed Palette Builder blank first load and cross-tool palette state loss

### Icon & Emoji Libraries
- Live Iconify-backed Icon Library and fuller Emoji Library, merged into one pill-toggle surface
- Icon customizer + Custom Icons library ("My Icons"), save-to-project picker, similar-icons row, theme-follow preview, sticky stroke width
- Cross-pack collection filtering, filter/search/pack composition fixes, pack sort, clear-recent
- Pro-gated line-style controls (cap + join) with a lighter upgrade popup (shows yearly plan at its monthly rate); copy tracking with a daily free copy cap
- Performance: keep-alive tabs, collection cache, faster emoji load

### Imagery & Media Tools
- File Converter wired live + redesigned: ICO favicon output, JPEG background fill, GIF trim, frame ranges
- Aspect & Resolution Calculator rebuilt: canonical ratio names, device/screen presets, merged size finder

### Discover
- Discover surface supersedes External Resources: community fold with curated galleries
- Palette gallery + palette history, and the new gradient gallery

### Pricing, Pro & Accounts
- All price surfaces wired to live Stripe prices via a shared hook — no hardcoded prices
- Free-tier caps enforced (3 projects / 8 custom icons); founder accounts get Pro without Stripe
- Device-level multi-account switching; custom profile photos; gradient default avatars; Settings Accessibility section
- Checkout fixes: embedded Checkout migrated to `embedded_page`, silent 500 branches now logged, base64 service-account key support

### Platform & AI
- Primary AI provider migrated DeepSeek → OpenRouter with Gemini fallback
- AI routes consolidated into a single `/api/ai` dispatcher; new `/api/share` OG endpoint
- Admin dashboard rebuilt: users tab, Stripe auto-fill, overview categories

### Consistency & Quality
- All full-screen modals unified onto the canonical `.ui-modal` system and `--scrim` backdrop; toast restyled to the design system
- Fixed the Colour→Color label flash on first paint; filled missing icon/emoji locale headers
- Responsive passes across tools and galleries (down to 380px, no horizontal overflow)

---

## v2.5.0 — Projects, Pro Features, Admin Tools & Security Hardening

### Projects
- Auto-created "Default Project" on first sign-in
- "Save current" renamed to "Add to Project" across the app
- Archive/restore projects; deletion now requires typing the project name to confirm
- Colour Studio: sticky "Add to Project" bar with colour pick tracking

### Pro & Monetisation
- Stripe Embedded Checkout with monthly/yearly plans (7-day trial on yearly)
- Cancellation retention flow: reason survey + tailored offers (discount, pause, free month)
- Rotating price comparison on the Pro tier ("less than 2 coffees" and friends)
- Premium Plus coming-soon tier preview
- Export watermark for free users; Pro unlocks all export formats
- Prompt Library: community prompts Pro-gated beyond the first 5; +25 AI generations for approved contributor submissions

### UI Builder
- New Component Designer: buttons, cards, inputs, badges, toggles, tables, tabs with shared design tokens and CSS export
- Guided mode: step-by-step progress bar walking through each component type

### Admin
- Design Analytics tab: most copied fonts, most picked colours (with swatch visualisations), tool usage
- Community prompt review with inline editing (title, text, tags) before approval
- Server-side admin verification via `/api/verify-admin` (Firebase Admin SDK)
- Admin-only `/style-guide` page documenting the internal design system

### Internationalisation
- New English (US) locale; English (AU) gains Aussie slang
- Browser language auto-detection for first-time visitors

### Security
- Removed spoofable localStorage admin unlock (session-only now)
- Input validation on the support endpoint (email format, length limits, type whitelist)
- HTML escaping in feedback email notifications
- Origin whitelist for Stripe checkout/portal return URLs
- Firestore rules for the community-prompts collection

### Consistency & Quality
- All modals standardised on the Font Gallery popup pattern
- `ADMIN_EMAILS` extracted to a shared constant; case-insensitive email checks
- External Resources: user-added custom resources with name, URL, and colour

---

## v2.4.0 — Bug Fixes & Visual Polish

### Bug Fixes
- Fixed I18nProvider blank screen on initial load — children now render immediately with a fallback `t()` function while locale data loads
- Fixed `useToast` timer firing on unmounted components — added cleanup in `useEffect`
- Fixed `useClipboard` silently failing on permission denied — added `.catch()` handler
- Replaced `prompt()` dialog in Settings email change with inline two-step password confirmation
- Replaced hardcoded colour values (`#ef4444`, `#22c55e`, `#f59e0b`) in CSS and Settings with theme-aware custom properties (`var(--err)`, `var(--ok)`, `var(--warn)`)
- Deleted unreachable `DesignSystemExport.jsx` (functionality already merged into Colour Studio)
- Added missing `videoFrames` and `promptLibrary` locale keys to all 8 non-English locale files

### Visual Polish
- **Colour Studio**: sticky anchor nav linking to all 6 sections, each section collapsible via chevron toggle, IntersectionObserver highlights active section
- **Sidebar**: redesigned active state from solid inverted background to subtle accent tint
- **Dashboard**: gradient text on hero greeting, staggered card entry animations (40ms per card)
- Added global `:focus-visible` outline styles for keyboard accessibility

### Community & Feedback
- Community page: replaced "coming soon" placeholder with GitHub repository, Discussions, and Issue report links
- Feedback page: added mailto export and "Open GitHub Issue" button
- Added community and feedback locale keys to all 9 languages

---

## v2.3.0 — Export Dropdown & Default Pins

### Design System Export
- Moved export from standalone page into TopBar dropdown — contextually visible only on Colour Studio
- Export options: HTML (styled reference page), CSS (custom properties file), Copy CSS Variables
- Export now includes UI state colours (success, error, warning, info — all 10 shades each)

### Dashboard
- Updated default pinned tools: Colour Studio, Image Converter, Icon Library, External Resources

---

## v2.2.0 — Dashboard Drag & Drop, Sidebar Fix, Export Context

### Dashboard
- Drag-and-drop reorder for pinned tools with visual feedback
- "+ Add Tools" browser to pin/unpin from all available tools
- Empty state with pin hint

### Sidebar
- Single-tool categories (e.g. Colour Studio) no longer show numbered hierarchy (1/1.1)

### Architecture
- Added `ExportContext` to share export actions between Colour Studio and TopBar
- Added `reorderPinned` to `WorkspaceContext`

---

## v2.1.0 — Video to Frames, i18n, Accounts

### New Tool: Video to Frames
- Drag-and-drop video upload with preview
- Frame extraction with format (PNG/JPEG/WebP), quality, scale, and interval controls
- Canvas-based extraction with progress bar
- Frame grid with individual and batch ZIP download (via JSZip)

### Internationalisation
- 9 languages: English (AU), Deutsch, Español, Français, Italiano, Português, 日本語, 中文, 한국어
- Dynamic locale loading with `import()` and caching
- `localiseTools()` and `localiseCategories()` for data-driven sidebar/dashboard translation

### Account System
- Local auth with localStorage (`vs-users`, `vs-session`)
- Profile management: display name, location, company, website, bio
- Password change with current password verification
- Account deletion with password confirmation
- Data export (prompts, settings) as JSON

---

## v2.0.0 — React + Vite Rewrite

Full rewrite from vanilla HTML/CSS/JS to React SPA with Vite.

### Architecture
- React 19 with React Router (HashRouter for GitHub Pages)
- CSS custom properties theming (warm light / dark mode)
- Context-based state: Auth, Theme, I18n, Palette, Workspace, Export
- Command palette (`Cmd/Ctrl + K`) for quick tool access

### Tools
- **Colour Studio** — unified page combining palette builder (6 harmony modes), tint scale generator, WCAG contrast checker, gradient builder (16 presets), and interactive UI preview
- **Type Scale** — modular scale with 6 ratio presets
- **Font Pair Finder** — Google Fonts pairings
- **Icon Library** — Iconify API search
- **Image Converter** — local convert/compress/resize
- **Prompt Library** — AI image prompt storage with previews
- **Design Principles** — visual hierarchy, cognitive load, brand psychology
- **Social & Marketing** — content strategy reference
- **Design Reference** — spacing, shadows, radii, design tokens
- **External Resources** — curated links to design tools and inspiration

### Dashboard
- Personalised time-based greeting
- Pinnable tool cards with category exploration
- Animated card entries

---
