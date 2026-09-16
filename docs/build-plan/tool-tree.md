# Tool tree & site structure

_Stable scaffolding reference — read when building/placing a tool or touching
nav. Structure founder-confirmed 2026-07-02; route and live/Soon status
re-derived from source 2026-08-31 (post-#266 `/create/*` flattening). Hub →
[`../../CLAUDE.md`](../../CLAUDE.md)._

> **How to keep this true.** `src/data/toolTree.js` is the single source of
> truth for tool routes and their Soon flags — `createRoutes()` derives the
> mounted paths from it, so nothing here is independently configured. If this
> document and that file disagree, the file is right and this is a bug. Re-derive
> rather than hand-edit route lists.

---

## Site structure & navigation

**Top nav:** logo · **Create ▾** · **Discover ▾** · **Learn ▾** · search ·
account. Each ▾ opens a mega-menu: a large bold main-tool heading with smaller
sub-tool links beneath, each carrying a one-line description. Tool pages use the
top navigation and a full-width workbench; the retired left rail is not part of
the current shell.

**Home (`/`)** is the **sales page** — and it is a working demo of the product,
not a screenshot of one. A first-time visitor should understand what UIL4B does
immediately, and the mini-workbench on the page is the proof rather than the
claim. **Dashboard is removed.** The "Create" label + surface id is `create`
(renamed from the old `workspace`).

> Describe this page in our own terms. Do not define it by another product's
> name — earlier drafts of this file called it a "Mobbin-style sales page" and
> the mega-menu a "Coolors footer style" menu, which recorded a passing
> reference as if it were the design. Founder, 2026-08-15: *"i dont want our
> homepage described as another apps syle, that was a design direction at the
> time not permantly."* Naming external products is still correct where they
> are genuinely external — the curated Inspiration links below are real
> destinations, not a description of us.

**How routes are mounted (not obvious from `App.jsx`).** Create tools do not
appear as `<Route>` entries. `createRoutes()` builds `CREATE_PATHS` from the tool
tree, `CHROMELESS_PATHS` adds `/discover` and `/learn`, and an early return in
`App.jsx` renders those paths chromeless — `<ColorLanding />` for
`/create/color`, `<SurfaceLanding />` for the two surface landings, and
`<CreateTool />` for every live tool. Grepping `App.jsx` for
`path="/create/palette"` finds nothing and that is expected.

**Two "not-ready" systems, kept distinct:**
1. **Soon-badged tools** — public, in the nav, badged "Soon" (chosen over a `#`
   prefix so the public menu reads as intentional). They still resolve, to an
   honest workshop state.
2. **Unbuilt direct routes** — resolved by `CreateTool` to that same state;
   dormant implementations are not mounted until activated.

**Legacy URLs redirect, they are not duplicates.** The full table is
`src/data/legacyRoutes.js` — do not re-list it here. It has two halves:
`CREATE_ROUTE_MIGRATION` (every pre-#266 tool URL → its `/create/*`
replacement, e.g. `/color/palette` → `/create/palette`, `/fontgallery` →
`/create/font-gallery`, `/ratio` → `/create/aspect-ratio`) and `RETIRED_ROUTES`
(older names retargeted straight at the live `/create/*` URL so no redirect
chains, e.g. `/palette` → `/create/palette`, `/color-studio` and `/export` →
`/create/color`). `scripts/sync-vercel-rewrites.mjs` writes them into
`vercel.json` as HTTP **301**s; `App.jsx` renders the same pairs as client
`<Navigate>` routes; `tests/unit/redirects.test.js` fails the build if the two
disagree, if a redirect is not a 301, or if one chains or loops.

---

## Tool tree

Main tools = **large heading** (a *system* with sub-tools built in). Sub-tools =
**smaller font** beneath, each also getting its **own standalone page** (reused
components). Colour is client-side (no Vercel function). The serverless function
budget and the current count are owned by
[`../reference/architecture.md`](../reference/architecture.md) — check there
before a new tool consumes a slot.

**Live** = built and usable. **Soon** = badged in the nav, resolves to the
workshop state.

### CREATE (build)

Every Create URL is `/create/<pagetitle>` (founder decision 2026-08-20, shipped
in #266). Category homes keep their own final segment; three slugs are not the
bare tool id, because flattening removed the parent segment that carried half
the meaning — `semantic-color`, `aspect-ratio`, and `component-designer` under
`/create/components`. The reasoning is written out in `legacyRoutes.js`.

- **Colour System Generator** — landing at `/create/color`
  - Palette Generator `/create/palette` — **live**
  - Semantic (UI-state) Colour Generator `/create/semantic-color` — **live**
  - Tint Generator `/create/tint` — **live**
  - Gradient Generator `/create/gradient` — **live**
  - Contrast Checker `/create/contrast` — **live**
  - **UI System Builder** — **unwired**, and not a route in the tool tree.
    It *was* admin-only, entered from a "Build UI system" button inside the
    Palette Builder and gated by `canUseUiSystem` (founder decision, batch 4:
    *"make the internal design system for admins only."*). That is no longer the
    state and this entry described it wrongly until 2026-09-07. On 2026-09-05 the
    founder removed **both** doors — the button and the "UI System / Admin"
    breadcrumb — in favour of a guided walkthrough from the nav
    (`components/UIKitGuide.jsx`). Nothing imports `components/UiSystemBuilder
    .jsx` now, so it is in no chunk of any build: **no admin can reach it
    either.** Its acceptance suite
    (`tests/user-sim/12-ui-system-builder.spec.js`) is skipped in full — not
    because the suite runs signed out (it could sign in since #407), but because
    there is no door for it to walk through. Skipped is the honest state, not a
    broken test. Re-entering the tool means giving it its own route.
- **Typography System Builder** — landing at `/create/typography`
  - Font Gallery `/create/font-gallery` — **live**
  - Font Pair Tool `/create/font-pair` — **live**
  - Type Scale `/create/type-scale` — **live**
- **UI Component Builder** — landing at `/create/components` — Soon (the whole
  group carries `soon: true`)
  - Component Designer `/create/component-designer` — Soon
  - Box Shadow Generator `/create/box-shadow` — Soon
  - UI Auto-Builder `/create/auto-builder` — Soon
- **Imagery & Media** — landing at `/create/imagery`
  - File Converter `/create/file-converter` (image + video + frames merged) —
    **live**
  - Aspect-Ratio Calculator `/create/aspect-ratio` — **live**
- **AI Studio** — landing at `/create/ai-tools`
  - Alt-Text Generator `/create/alt-text` — **live** (the only live AI tool)
  - AI Image-Prompt Generator `/create/ai-prompt` — Soon
  - AI Landing-Page Prompt Generator `/create/landing-prompts` — Soon
- **Icons & Emoji** — landing at `/create/icons-emoji`, one pill-toggle surface
  - Icon Library `/create/icons` — **live** · Emoji Library `/create/emoji` —
    **live**

### DISCOVER (browse — community: inspiration + free-to-copy assets)

Surface landing `/discover` — **live**.

Six of the eight groups are live. `DISCOVER_GROUPS` in `src/data/toolTree.js`
carries the flags; check there rather than trusting the bolding here.

- **Palette Library** `/discover/palettes` — **live**
- **Gradient Library** `/discover/gradients` — **live**
- **Font Gallery** — **live** (the Create tool, surfaced here to browse)
- **Icon Library** — **live** (same)
- **Prompt Library** `/discover/prompts` — **live.** A free selection for
  everyone; the full library with Pro. *(This moved: it is no longer `/prompts`.)*
- **Curated Resources** `/discover/resources` — **live** (#377). The links in
  `discoverResources.js`, each carrying its related UIL4B tool.
- **Inspiration** — Soon. Curated external sites (Mobbin, Godly, Lapa Ninja, …),
  each linking back to the relevant Create tool. Real outbound destinations.
- **Collections** — Soon.

Community **publishing** is a separate thing from these browse surfaces and is
deliberately not built yet: #377 re-scoped it, and §3.9 of `OWNER-ACTIONS.md`
records the founder's decision that nothing publishes without his approval. That
document is local-only since 2026-09-16 and is not in this repository, so the
decision is cited here rather than linked; the behaviour it describes is what
ships.

### LEARN (understand — all documentation)

Surface landing `/learn` — **live**, and it lists what is written and what is not.

**Learn has real content now.** This section used to say "there is no live Learn
content yet"; that stopped being true with #380 and #403. Five guides are
published, prerendered, and reachable at `/learn/<slug>`:

- `colour-contrast` · `type-scales` · `colour-spaces` · `theme-systems` ·
  `brand-colour`

They are **design education, not documentation for our tools**, and their voice
is neutral and factual — both founder decisions, 2026-09-05. The bodies live in
`src/data/learn/`, indexed by `src/data/learnIndex.js`.

**The roadmap is derived, not listed here.** `LEARN_GROUPS` in
`src/data/toolTree.js` carries the eight topic areas and a `soon` flag on each;
`LEARN_ROADMAP` is the filtered "still to write" list, and every surface that
shows the roadmap reads it. Two areas are delivered (**UI Themes**, **Brand
Colour Guide**) and six still carry `soon`. Flip a row's flag when a guide
covering it ships — do not re-list them here, or this file becomes the second
copy again.

Every `/docs-*` URL is still a **301 to `/learn`**, not a page: `/docs` ·
`/docs-design` · `/docs-social` · `/docs-themes` · `/docs-brand` · `/docs-seo` ·
`/docs-marketing` · `/docs-ai` · `/design-reference`. The seven `Docs*.jsx`
components those names came from are unrouted drafts and are **not** what
`/learn` serves.

**Genuinely live, in the app shell rather than the tool tree:** `/help`
(Help Centre) and `/info` (Info Centre). `/faq` redirects to `/help#faq`.

---

## Reusable tool code (do NOT delete — reuse when each tool is actioned)

Colour tools (`/create/palette`, `/create/semantic-color`, `/create/tint`,
`/create/gradient`, `/create/contrast`; `/create/color` is their landing) ·
Typography (`/create/font-gallery`, `/create/font-pair`, `/create/type-scale`) ·
UI (`/create/component-designer`, `/create/box-shadow`,
`/create/auto-builder`) · Imagery (`/create/file-converter`,
`/create/aspect-ratio`) · AI (`/create/ai-prompt`, `/create/landing-prompts`,
`/create/alt-text`) · Prompt Library (`/discover/prompts`) · Icons/Emoji
(`/create/icons`, `/create/emoji`).

**Kept infra/features:** Firebase Auth/Firestore, Stripe, OpenRouter/Gemini AI,
feedback tool, admin dashboard, `sections.jsx` surface model (Workspace→Create),
and the `CreateTool` workshop state. **Removed from runtime:** Dashboard and the
old tool rail. Backup of the pre-rebuild app: `backup/pre-redesign-2026-07-02`.
