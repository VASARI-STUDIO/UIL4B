# Founder batch — 2026-08-20

Dylan's instruction batch of 2026-08-20, pulled apart into atomic items,
regrouped and sequenced. This file is the **routing plan** for that batch only.
It does not own status — `src/data/pipeline.js` does. When an item here is
queued, it moves there and this row links to it.

**Critical path: none of the engineering can start.** Seven green PRs are open
and the merge action is blocked for the Director in this environment. Four of
them (#254 → #255 → #258 → #259) are a stack that rewrites the library browsing
language, the typography surfaces, the modal layer and the palette card — the
exact surfaces this batch redesigns. Routing engineering before they merge
guarantees conflicts in every file that matters.

---

## Findings verified by the Director before routing

These were measured, not assumed. Each saves an agent a diagnosis round trip.

### F-1 · Three different prices are shipped. `measured`

Founder instruction: "make sure anywhere you show pricing you show the same
pricing." There are three sources and they disagree:

| Source | Monthly | Quarterly | Yearly | Lifetime |
|---|---|---|---|---|
| `src/config/planLadder.js` (`approvedTotal`) | **$7** | **$18** | **$48** | — |
| `api/_lib/pricing.js` (`DEFAULT_PRICES`, USD) | **$4.99** | *absent* | **$39.99** | $89.99 |
| `src/locales/*.json` (7 files) | **$4.99** | — | — | — |

`planLadder.js` cites `design-language-v2.md` "Deviations from the mock",
founder-approved 2026-08-16, for the $7/$18/$48 ladder. The server has never
been moved to it and has no quarterly interval at all.

Live Stripe prices win at runtime, so what a visitor actually sees depends on
whether `/api/get-prices` answers. When it does not, the client fallback says
$7 and the server default says $4.99 — **the same visitor can be shown either
number.**

The locale `"price": "$4.99"` strings are **dead** — no component reads
`plans.pro.price`; verified by grep across `src/`. They mislead translators and
future readers but are not currently rendered.

> **Blocked on the founder.** `api/_lib/pricing.js` is a Human Validation Zone
> file. Which ladder is real is a pricing decision, not an engineering one.
> Nothing in this batch that quotes a price can be built until it is answered.

### F-2 · Why the hero highlight clips the text above it. `measured`

Founder instruction: "the hero text needs more spacing the highlight clips the
top text." Reproduced from the stylesheet; the cause is exact:

```
.home-hero-h1  { line-height:.98 }                            /* global.css:5340 */
.home-hero-line{ overflow:hidden;
                 padding-bottom:.14em; margin-bottom:-.14em }  /* :5350 */
.home-mark     { background:var(--hi); padding:0 .1em }        /* :5427 */
```

`.home-hero-line` is the **clip container** for the `home-hero-clip-up`
entrance animation, so `overflow:hidden` is load-bearing and cannot simply be
removed. It compensates for descenders at the **bottom only** — there is no top
equivalent. With `line-height:.98` the inline box is shorter than the font's em
box, so the `--hi` highlight background (which paints the full inline box)
overflows the top of the line box and `overflow:hidden` shears it off.

**Fix shape:** mirror the existing bottom trick at the top, and/or relax
`line-height`.

> **Corrected 2026-08-20 by measurement.** This entry originally proposed
> mirroring `.14em`. Measured in a browser, **19px** shears off the top (and 4px
> off the bottom) at a 95px computed hero size. `.14em × 95px = 13.3px` — the
> mirrored value would still clip. The font-metric derivation gives **0.2em**.
> Design spec §C5 carries the derivation.

**Trap:** the clip container is what masks the entrance animation. Changing its
top padding changes where the mask starts, so the entrance must be re-verified
in a browser, not just measured statically. The reduced-motion paths at
`global.css:5386-5388` must stay correct.

### F-3 · The homepage gradient preview is violet; the brand is blue. `observed`

`HomeWorkbench.jsx:239` — `DEFAULT_GRADIENT = { from:'#7C3AED', to:'#22D3EE' }`.
`#7C3AED` is the design file's default violet. `CHANGELOG.md` records for V2:
"The design file's default violet is **not** used anywhere." It is sample
gradient content rather than an accent token, so this is not a token bug — but
the first thing a visitor sees demonstrated is violet/cyan while the product's
accent is `#0F6FFF`. Worth a deliberate decision in the design pass.

### F-4 · Documentation drift, corrected 2026-08-20

- `docs/reference/constants-and-config.md` still listed the **pre-V2** accent
  (`#3B82F6` dark / `#2563EB` light). Live values read from `global.css` are
  `#6FA8FF` dark / `#0F6FFF` light. **Corrected.**
- `docs/reference/build-and-verify.md` prose said "32 lint warnings" while its
  own canonical table said 31. `npx eslint .` re-run: **0 errors, 31 warnings**.
  The table was right. **Corrected.**
- Workspace-root `README.md` described a product that does not exist
  ("450,000+ searchable UI screenshots", Mobbin Inspector, moodboard creator).
  **Replaced** with a pointer to the real repo.
- 69 loose screenshots (8.9 MB) and a dead static `index.html` moved to
  `_archive/2026-08-20-cleanup/`. Untracked, reversible, referenced by nothing.
- Still open: `screenshots/` inside the repo is **tracked** but referenced by no
  doc and no code. Removing it needs a commit, so it is queued below rather than
  done here.
### F-5 · PR #257 will fail its own guard test the moment it merges. `measured`

**This is a merge hazard on a PR currently showing green.** #257 adds
`tests/unit/surface-vocabulary.test.js`, which reads `src/pages/Home.jsx` from
the working tree and fails on any line matching `/workspace/i` outside a fixed
allowlist. #257 was branched 2026-08-15. The **V2 homepage rebuild landed on
main afterwards and reintroduced the exact string the test bans.**

Simulating the test's own logic against current `main`:

```
OFFENDERS on current main Home.jsx: 2
  - 'ONE WORKSPACE',
  - <span className="hbrow">[ THE WORKSPACE ]</span>
```

CI is green because it ran against #257's base, not against current `main`.
**#257 must be rebased onto `main` and those two strings resolved before it is
merged**, or it lands red.

This also settles a question the design spec raised: `[ THE WORKSPACE ]` is not
merely inconsistent with the `CLAUDE.md` surface-label rule — there is an
incoming test that makes it a build failure. The eyebrow has to change
regardless of taste, so the design spec should pick its replacement.

### F-6 · The rejected phrase also ships on `/discover`. `measured`

The founder rejected "Systems worth stealing." on the homepage
(`Home.jsx:386`). The same phrase is the `/discover` H1 —
`SurfaceLanding.jsx:22`, "Find systems worth stealing." Fixing only the
homepage would leave the rejected line live one click away. Both change
together; this is batch item D3.

### F-7 · Centring the sticky graphic is blocked by an uncapped panel. `measured`

Founder item C1 ("the graphic should be centred vertically") cannot be
implemented as asked until C3 is fixed first. Measured in a browser, `.hw-shell`
jumps **441→758px** at 1440×900 and **467→918px** at 1024×768 — a 451px change
on one tab click. At 1024×768 the tallest panel is 150px taller than the entire
viewport, so there is no stable box to centre. **A fixed/capped frame is a
precondition for both C1 and C3**, and it is also the real cause of the
"jumpy" tab switch — panel height, not transition speed.

---

## Founder decisions — recorded 2026-08-20

Answers given by Dylan in conversation with the Director on 2026-08-20, in
response to the six-item decision table. Quoted verbatim; nothing inferred.
**These have not shipped.** When the work lands, the decision moves to its
canonical home in `CHANGELOG.md` and this section links there instead.

| # | Question | Answer | Status |
|---|---|---|---|
| 1 | Merge order, with #257 rebased first | "yes do that" | **Approved. Still blocked** — see A1 |
| 2 | Price ladder: $7 / $18 / $48, server moved to it | "yes do that" | **Approved.** HVZ work |
| 3 | Portfolio URL `dylan-coleman.com` | "yes" | **Confirmed** |
| 4 | Step numbering Option B (route + connector) | "yes but all the urls for the create tools should be /create/pagetitle not /color/ or other" | **Approved, with new scope** — see Group F |
| 5 | C2 sticky trigger at the 52/44 default | "okay do that" | **Approved** |
| 6 | Update `positioning.md` to match shipped export behaviour | "yes do that" | **Approved** |

Decision 2 supersedes the server defaults in `api/_lib/pricing.js`
($4.99 / $39.99, no quarterly). Note this is a **price rise on yearly**
($39.99 → $48) and it was flagged as such before approval.

Decision 6 resolves the conflict in favour of what ships: free exports carry a
footer credit; `positioning.md`'s "Pro = all file exports" is the line that
changes, not the code.

### F-8 · The URL migration would leak the tool pages out of the index. `measured`

Decision 4 moves every Create tool to `/create/<pagetitle>`. Before that runs,
understand how routing is actually served, because the current setup makes a
silent migration failure very easy.

`vercel.json` has **no `redirects` key at all** — only 29 `rewrites` and 2
`headers`. Routes are **prerendered to static HTML per path**
(`/color/palette` → `/color/palette/index.html`), and the final rewrite is a
catch-all to `/404.html`.

The 24 legacy paths in `App.jsx` that use React Router `<Navigate>`
(`/palette`, `/gradients`, `/docs-design`, `/pricing`, …) are **none of them**
in the rewrite list, so they all fall to the catch-all.

What that means, stated precisely:

- **For users it works.** `dist/404.html` contains `id="root"` and the app
  bundle, so it boots the SPA, React Router reads the URL and performs the
  redirect. No user hits a dead end.
- **For search it leaks.** `404.html` carries `noindex`, and there is no HTTP
  301 anywhere in the configuration. Old URLs are therefore served a
  no-index document and pass no link equity to their replacement.
- **Not verified from here:** whether Vercel returns 200 or 404 for that
  catch-all in production. This sandbox cannot reach `www.uil4b.com`, and
  `npm run preview` does not apply `vercel.json`. Treat the status code as
  unknown until checked against the live host.

**Consequence for Decision 4.** The Create tool routes are the pages most
likely to hold real search value. Migrating them the way the existing
redirects were done would apply this same leak to all of them at once.

**Required approach:** add a real `redirects` block to `vercel.json` issuing
**301s** from every old Create path to its `/create/*` replacement, and keep
the prerender manifest, `routeMetaMap.js`, `toolTree.js`, `tools.jsx`, the
sitemap and every canonical tag moving in the same change. The existing 24
client-side redirects should be converted to 301s in the same pass — they are
the same defect, already live.

### Group F — Create route migration (new, from Decision 4)

| # | Item |
|---|---|
| F1 | Define the full old → new route map for every Create tool |
| F2 | Add `redirects` (301) to `vercel.json`; convert the 24 existing `<Navigate>` redirects too |
| F3 | Update `routeMetaMap.js`, `toolTree.js`, `tools.jsx`, prerender inputs, sitemap and canonical tags together |
| F4 | Re-point every internal link, including the design spec's Option B rail strings |
| F5 | Verify: no route serves `noindex` as its canonical destination; old paths 301 rather than rewrite |

**Sequencing note.** Decision 4's step-numbering rail *displays the route*, so
the migration must land **before or with** the numbering change, or the rail
ships showing URLs that are about to move.

### F-9 · The app ignored `prefers-reduced-motion` for every default visitor. `measured`

Found 2026-08-20 by the C6 slice, whose acceptance criterion was otherwise
unsatisfiable. Verified independently by the Director.

`index.html:86` bootstraps appearance from `localStorage` and ends with:

```js
r.setAttribute('data-reduced-motion', String(!!a.reducedMotion))
```

For anyone who has never opened Settings, `vs-appearance` has no
`reducedMotion` key, so `!!undefined` is `false` and the attribute is stamped
as the **explicit string `"false"`**. Every reduced-motion rule in the
stylesheet is guarded by `html:not([data-reduced-motion="false"])`, and an
explicit `"false"` beats the OS media query by contract.

**Consequence: 10 rule sites were dead code for every default visitor**, the
first of which (`global.css:101`) is the *global* reset — the one that forces
`transition-duration:0.01ms`, `animation-duration:0.01ms` and
`scroll-behavior:auto` across the entire document. So a visitor with reduced
motion enabled at OS level got the full motion treatment everywhere in the app,
not merely on the homepage.

Measured: OS reduce on, fresh profile, attribute reads `"false"` at
`DOMContentLoaded`.

**Fixed** in PR #269 because C6 could not otherwise meet its criterion. But note
what that implies and do not gloss it: **those ten reduced-motion branches have
never actually executed for a default visitor, so none of them is verified.**
They are newly-live code paths, not restored ones. Each needs a rendered pass
before anyone claims reduced motion works.

Related, same PR: **WCAG 2.2.2 is only partially met** for the new typing
animation. The stop is real and announced to assistive tech, and any first
interaction ends it — but there is **no visible stop affordance for a sighted
user**. Stated rather than implied.

---

## The batch, regrouped

Founder wording is quoted where the wording carries the requirement.

### Group A — Blocked on the founder (nothing else can resolve these)

| # | Item | Needs |
|---|---|---|
| A1 | Merge #254 → #255 → #258 → #259 in that order, plus #256, #257, #212 | Merge permission, or Dylan merging |
| A2 | Settle the price ladder (F-1) | A pricing decision; `api/_lib/pricing.js` is HVZ |
| A3 | Footer: "built in brisbane by dylan coleman", linking his portfolio | Confirm the exact URL — batch says `Dylan-coleman.com` |

### Group B — Research (running; gates all design)

Founder: "use Mobbin to look at mobile screens and apps of sections, flows, and
more that could relate to our app" and "make sure to let the design agent use
mobbin and the research agents, i want to make sure we do proper research using
our MCP."

| # | Item |
|---|---|
| B1 | Mobbin pattern research → `docs/research/homepage-patterns-2026-08.md` |
| B2 | Responsive breakpoint audit → `docs/qa/responsive-audit-2026-08.md` |

### Group C — Homepage design specification (after B)

| # | Item | Founder's words |
|---|---|---|
| C1 | Sticky scroll: centre the graphic vertically | "the graphic should be centred vertically" |
| C2 | Sticky scroll: change trigger point | "should change when the text is slighly higher on the screen maybe just before centre" |
| C3 | Mini-tool tab transition | "too snappy it looks jumpy" |
| C4 | Live previews to feel like the real app | "make the live previews look and feel more like the actual app" |
| C5 | Hero spacing / highlight clip | See F-2 — root cause known |
| C6 | Search bar typing + backspace animation | Merges with queued `nav-search-hover-expand` |
| C7 | Centre the "try" line under the search bar | "make the try line below it centered" |
| C8 | Kill "Not a screenshot. The actual tools, running here." | "this just sounds stupid" |
| C9 | Rework `02 / GRADIENT` numbering | "looks AI sloppy… move it, change it, remove it" |
| C10 | Rework "Six categories. One account." | "makes me feel like skipping over it" |
| C11 | Pivot "Systems worth stealing." to the community gallery | "this whole section is to showcase the community gallery" |
| C12 | NEW section: export abilities | "showcasing the export abilities" |
| C13 | NEW section: Learn | "information that makes you a better designer / brand designer / builder" |

### Group D — Other surfaces (after C settles the language)

| # | Item |
|---|---|
| D1 | Pricing page redesign to match homepage + pricing panel — **gated by A2** |
| D2 | Learn sales page: UI/UX to the new homepage system |
| D3 | Discover sales page: UI/UX to the new homepage system |
| D4 | NEW "Help & Getting Started" page — sales-page style, not a document |
| D5 | NEW "Design Principles" page — same treatment |

D4/D5 founder direction: "these are less documents are more designed like a
sales page style of large visual, main point, simple not overly verbose points
underneath."

### Group E — Engineering, once main is clean

| # | Item |
|---|---|
| E1 | Implement C1–C13 in reviewable slices |
| E2 | Fix the breakpoint defects B2 finds, worst first (Palette Builder named) |
| E3 | Retire the dead locale `price` keys (F-1) |
| E4 | Remove or justify the referenced-by-nothing `screenshots/` directory |

---

## Standing constraints that apply to every item here

- **12/12 Vercel functions.** No item may add an endpoint without replacing one
  or folding into `api/_lib/`.
- `/api`, auth, Stripe and user-generated content take `secret-scanner` +
  `security-reviewer` every time — never batched away.
- Every slice passes the gate in `build-and-verify.md` plus rendered
  verification. Baselines live there and nowhere else.
- New copy is checked against `docs/reference/growth-persuasion.md`.
- Copy in this batch is founder-voice sensitive. The related queued item
  `founder-intro-popup` records the standing rule: do not invent biography, and
  Australian-English founder voice is founder-owned.
