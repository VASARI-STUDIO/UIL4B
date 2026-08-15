# Tool tree & site structure

_Stable scaffolding reference — read when building/placing a tool or touching
nav. Structure founder-confirmed 2026-07-02; route and live/Soon status
re-derived from source 2026-08-15. Hub → [`../../CLAUDE.md`](../../CLAUDE.md)._

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
`App.jsx` renders those paths chromeless — `<ColorLanding />` for `/color`,
`<SurfaceLanding />` for the two surface landings, and `<CreateTool />` for every
live tool. Grepping `App.jsx` for `path="/color/palette"` finds nothing and that
is expected.

**Two "not-ready" systems, kept distinct:**
1. **Soon-badged tools** — public, in the nav, badged "Soon" (chosen over a `#`
   prefix so the public menu reads as intentional). They still resolve, to an
   honest workshop state.
2. **Unbuilt direct routes** — resolved by `CreateTool` to that same state;
   dormant implementations are not mounted until activated.

**Legacy URLs redirect, they are not duplicates.** `/palette` → `/color/palette`,
`/tints` → `/color/tint`, `/gradients` → `/color/gradient`, `/contrast` →
`/color/contrast`, `/color-studio` and `/export` → `/color`, `/color/ui` →
`/color`.

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

- **Colour System Generator** — landing at `/color`
  - Palette Generator `/color/palette` — **live**
  - Semantic (UI-state) Colour Generator `/color/semantic` — **live**
  - Tint Generator `/color/tint` — **live**
  - Gradient Generator `/color/gradient` — **live**
  - Contrast Checker `/color/contrast` — **live**
  - **UI System Builder** — **admin-only.** Entered from a "Build UI system"
    button inside the Palette Builder, gated by `canUseUiSystem`. Founder
    decision, batch 4: *"make the internal design system for admins only."*
    Its acceptance suite (`tests/user-sim/12-ui-system-builder.spec.js`, 13
    tests) is skipped because that suite runs signed out and the surface is
    therefore unreachable — skipped is the honest state, not a broken test.
- **Typography System Builder**
  - Font Gallery `/fontgallery` — **live**
  - Font Pair Tool `/fontpairs` — **live**
  - Type Scale `/typescale` — **live**
- **UI Component Builder**
  - Component Designer `/ui-builder` — Soon
  - Box Shadow Generator `/box-shadow` — Soon
  - UI Auto-Builder `/auto-builder` — Soon
- **Imagery & Media**
  - File Converter `/file-converter` (image + video + frames merged) — **live**
  - Aspect-Ratio Calculator `/ratio` — **live**
- **AI Studio**
  - Alt-Text Generator `/alt-text` — **live** (the only live AI tool)
  - AI Image-Prompt Generator `/ai-prompt` — Soon
  - AI Landing-Page Prompt Generator `/landing-prompts` — Soon
- **Icons & Emoji** — unified into one pill-toggle surface
  - Icon Library `/icons` — **live** · Emoji Library `/emoji` — **live**

### DISCOVER (browse — community: inspiration + free-to-copy assets)

Surface landing `/discover` — Soon.

- **Community Palettes** `/discover/palettes` — **live**
- **Community Gradients** `/discover/gradients` — **live**
- **Prompt Library** `/discover/prompts` — **live.** A free selection for
  everyone; the full library with Pro. *(This moved: it is no longer `/prompts`.)*
- **Inspiration** — curated external sites (Mobbin, Godly, Lapa Ninja, …), each
  linking back to the relevant Create tool. Real outbound destinations.
- **Curated Resources** — the ~45 links in `discoverResources.js`
- **Collections**

### LEARN (understand — all documentation)

Surface landing `/learn` — Soon.

**There is no live Learn content yet, and the route list makes that look
otherwise.** Every `/docs-*` URL is a **redirect to `/learn`**, not a page:
`/docs` · `/docs-design` · `/docs-social` · `/docs-themes` · `/docs-brand` ·
`/docs-seo` · `/docs-marketing` · `/docs-ai` · `/design-reference`. The planned
subjects below are therefore scope, not shipped surface:

- Design Principles · UI Themes · Brand Colour Guide · Typography Guide ·
  SEO (Small-Business + Specialist) · Marketing Fundamentals / Social &
  Marketing · AI Coding Assistants

**Genuinely live, in the app shell rather than the tool tree:** `/help`
(Help Centre) and `/info` (Info Centre). `/faq` redirects to `/help#faq`.

---

## Reusable tool code (do NOT delete — reuse when each tool is actioned)

Colour tools (`/color/*`; `/color` is their landing) ·
Typography (`/fontgallery`, `/fontpairs`, `/typescale`) · UI (`/ui-builder`,
`/box-shadow`, `/auto-builder`) · Imagery (`/file-converter`, `/ratio`) · AI
(`/ai-prompt`, `/landing-prompts`, `/alt-text`) · Prompt Library
(`/discover/prompts`) · Icons/Emoji (`/icons`, `/emoji`).

**Kept infra/features:** Firebase Auth/Firestore, Stripe, OpenRouter/Gemini AI,
feedback tool, admin dashboard, `sections.jsx` surface model (Workspace→Create),
and the `CreateTool` workshop state. **Removed from runtime:** Dashboard and the
old tool rail. Backup of the pre-rebuild app: `backup/pre-redesign-2026-07-02`.
