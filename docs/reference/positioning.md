# Positioning & Product Surfaces

> Reference doc for UIL4B. Linked from `CLAUDE.md`. This is the **single source of
> truth** for what UIL4B is, who it's for, and how its surfaces are organised.
> Read before writing marketing copy, naming a tool, designing a page, or
> deciding where a new feature lives.

## The one-line positioning

**UIL4B is the operating workspace for UI system creation — build, organize,
validate, and export interface foundations without tab-hopping.**

That sentence is canonical. The homepage hero may express it in punchier
marketing language, but it must not contradict it.

## The founder's value proposition — his words, 2026-09-07

These four sentences are the canonical statement of what UIL4B is for. They
are the **founder's own words**, given on 2026-09-07. The only edits applied
are the two a proofreader would make — `your` → `you're`, and sentence case
with a closing full stop. Nothing is tightened, re-ordered or paraphrased.

| id | Line |
|---|---|
| `forget-the-app-name` | No more trying to remember the name of the specific app for the tool you liked. |
| `bookmark-folders` | Gone are the days of searching through bookmark folders upon bookmark folders to find each tool. |
| `build-and-export` | Build and export UI and brand design kits and content for website building. |
| `one-unified-location` | All the design tools you're constantly searching for, in one unified location. |

**No surface types these.** `src/data/positioning.js` is the machine-readable
copy and every sales surface derives from it —  the homepage hero sub-line,
`/plans`'s framing line, `/help`'s opening, `public/llms.txt`'s summary and the
share cards. `tests/unit/positioning-truth.test.js` fails the build if a
surface states a competing value claim of its own.

**Do not add a fifth line.** The array is a record of what the founder said,
not a copy deck an agent tops up. A new claim needs him to make it.

Two more surfaces read a line by id since the 2026-09-09 anti-slop audit, and
neither adds a word: the homepage export section's heading is
`build-and-export` (it replaced "Your system leaves as a document, not a
screenshot.") and the `/plans` closing band's heading is `one-unified-location`
(it replaced "Build first. Upgrade when your workflow asks for it."). The
mapping is `SURFACE_LINE` in `src/data/positioning.js`.

### The hero headline is assembled from two of them, and he approved it on 2026-09-10

> **Build and export UI and brand design kits, _in one unified location_.**

Every word traces to a line above: the lead is the verbatim head of
`build-and-export`, the marked run is the verbatim tail of
`one-unified-location`. The comma is punctuation. The founder chose "build one
from my words only" over an agent draft, and on **2026-09-10 he read the
assembled line beside the two phrases it was cut from and said ship it**.

So it is settled, and it is his: **do not reword it without him** — not a
tightening, not a synonym, not the comma. If it ever does have to change, the
replacement is another splice of these same sentences and not an agent
sentence, and it still needs him. `tests/unit/positioning-truth.test.js` pins
the exact string, so an edit to the headline fails the build until somebody
moves the pin, which is the point at which to go and ask.

### Relationship to the canonical one-liner above

The operating-workspace sentence stays canonical for *strategy* — what the
product is and how its surfaces are organised. These four are canonical for
*what the product says to a visitor*. They do not contradict it: "one unified
location" and "without tab-hopping" are the same claim, and "build and export
UI and brand design kits" is the export-for-handoff outcome named in plainer
words.
## Why the shift

UIL4B was framed as "every design tool in one place" / "a free browser-based
design toolkit." That framing sells a *grab-bag of tools*. It undersells what
the product actually does: it is where a designer or front-end developer
**creates a coherent UI system end-to-end** — colour, type, spacing, tokens,
assets, accessibility — and **exports it for handoff** without bouncing between
a dozen scattered single-purpose sites.

The repositioning keeps the product exactly as it is commercially — **one
product, one brand, one account, one Stripe subscription** — and changes the
*story*: from a toolkit to a workspace; from features to outcomes.

> Strategic guardrail (from the direction analysis): **do not split UIL4B into
> multiple standalone products. Split it into multiple product _surfaces_.**

## The three surfaces

These are surfaces *within one product*, not separate apps, accounts, or
billing. They are how the product's story — and, over time, its information
architecture — is organised.

### 1. Workspace — the core

> **Naming note:** this surface ships as **Create** in the product — nav, URLs
> and copy all say Create. "Workspace" is kept in this document because it is the
> strategic frame the repositioning was written in, and it survives in code as
> `WorkspaceContext`. Treat the two as the same surface; use **Create** in
> anything user-facing.

Where you build interface foundations. Five sub-areas:

- **Foundations** — colour, type, spacing, grid, radius, shadows, motion.
- **Assets** — icons, image convert/compress, favicon prep, video frames.
- **Accessibility** — alt text, contrast, non-text contrast, colour-blind previews.
- **Tokens & Themes** — token editor, mode/theme manager, DTCG validation.
- **Export & Handoff** — CSS vars, Tailwind theme vars, Style Dictionary export, snippets.
  *(Intent, not inventory — checked 2026-09-10: `css` and `tailwind` are*
  *`live: false` in `src/config/exportFormats.js`, and nothing named*
  *"Style Dictionary" is built. What ships today is HTML, Markdown, PNG and*
  *JPEG, plus the two Pro documents. Read `src/config/exportFormats.js` for*
  *what exists.)*

### 2. Discover — community & external resource hub

**Replaces the old "Library" framing.** Not a static shelf of saved items — a
**community and external-resource discovery hub** users return to regularly.

Mental model: **Tools create, Discover browses, Learn explains.** In Discover
you browse, find, save, remix, submit, and get inspired.

It curates two streams side by side:

- **Internal UIL4B resources** — community UI systems, palettes, gradients, font
  pairings, website prompts, AI image prompts, UI presets, featured projects.
- **Curated external resources** — hand-picked design/dev tools, inspiration
  sites, font/icon/colour/gradient resources, free assets, references. Curated,
  never a link dump: each carries a title, description, category, tags, use
  case, free/paid label, save + report-broken-link — and **links back to the
  relevant UIL4B tools** so Discover drives users *into* the product, not away.

Optimised for engagement: featured/trending, most-saved/-remixed, staff picks,
collections, save/like/remix/submit, creator visibility. Full structure,
categories, engagement features, external-resource rules, and MVP scope live in
[`discover.md`](discover.md).

### 3. Learn — knowledge, separate from tools

Docs, design-system principles, AI-prompting guidance, UI education, and
marketing-strategy content. Deliberately a **separate IA from the tools** so
education doesn't clutter the build surface.

## Name tools around outcomes, not mechanics

Reframe tool names toward the outcome they produce, collapsing several
single-purpose tools into one system-builder where it makes sense. Examples of
the intended direction (not a shipped rename list):

- **Colour System Builder** instead of separate Palette / Tints / Gradient / CSS-Export.
- **Type System Builder** instead of separate pairing / scale tools.
- **Token Studio** / **System Exporter** as the unified tokens-and-handoff surface.

When naming or describing a tool, lead with what the user walks away with.

## What changes now vs. the north star

- **Now (this repositioning):** the *story* changes — homepage, written docs,
  meta/marketing copy, and agent process all describe UIL4B as the operating
  workspace organised around Workspace / Discover / Learn. No routes are
  removed; no in-app navigation is rebuilt yet.
- **North star (a larger follow-on):** the in-app information architecture
  (the `PillNav` mega-menu, routes, `src/data/tools.jsx` taxonomy) is
  reorganised so the three
  surfaces and the five Workspace sub-areas become the real navigation, and the
  outcome-oriented tool consolidations are actually built. This is a multi-slice
  effort, tracked separately — not part of the repositioning slice.

## Indicative surface mapping (target IA)

Where today's pages belong under the three-surface model. Indicative — alpha and
admin gating stay exactly as they are today. This section used to re-list every
tool route. It does not any more: routes,
their live-vs-Soon status and the legacy redirects have one home,
[`tool-tree.md`](../build-plan/tool-tree.md), derived from
`src/data/toolTree.js`. The copy here went stale the day #266 flattened every
Create URL to `/create/*`, which is exactly the failure mode a second copy
produces.

What this doc still owns is the *shape*: **Create** holds the sub-areas
Foundations, Assets, Accessibility, Tokens & Themes, and Export & Handoff, plus
Projects (the user's private saved work — the output of building, not a browse
surface). **Discover** holds the community and curated-resource browse
surfaces. **Learn** holds the guides plus the Help and Info centres. Which page
sits in which sub-area is read from `tool-tree.md`.

## Audience & messaging

- **Audience:** product/web designers, front-end developers, and indie hackers
  who assemble and hand off UI systems.
- **Core promise:** create, organize, validate, and export a UI system in one
  place — no tab-hopping.
- **Free vs Pro:** Free = save projects (capped), share a live preview URL, and
  **export the four standard formats (HTML, Markdown, PNG, JPEG) with a visible
  footer credit**. Pro removes the credit, lifts the caps, and adds the two
  document exports — the **design system book** and the **brand guidelines**.
  (See `human-validation-zones.md` for the Stripe surface.)

> **Corrected 2026-08-20, founder-approved.** This line read "Pro = all file
> exports", which the product does not do and has not done. `ExportPanel.jsx`
> passes `watermark: !isPro` to every builder — a free user gets the same
> formats, credited. The doc was changed to match the code rather than the code
> changed to match the doc, on the founder's decision, because credited-free
> export is the better expression of the approved "foot in the door" free tier
> (P-003). Any surface currently implying exports are Pro-only is now the thing
> that is wrong.
>
> **RESOLVED 2026-09-14 by the founder: the pages are right, and this line was
> the thing that was wrong.** The 2026-08-20 correction above was made when
> every export was watermark-gated, and it was true of the product as it then
> stood. Two formats shipped *after* it and are gated by name instead: `book`
> and `guidelines` are `pro: true` in `src/config/exportFormats.js`,
> `proOnlyFormats()` returns both, `/plans` prints them as "Not included" for
> Free, and `Home.jsx`'s `PRO_INCLUDES` lists them under "Everything in Free,
> plus:". Asked which side moves, he chose the pages — so the sentence above
> now names the four free formats rather than claiming all of them, and the
> watermark model it describes still holds exactly where it was written about:
> `html`, `md`, `png` and `jpeg` are `pro: false` and still pass
> `watermark: !isPro`. Nothing on a page moved. See `docs/OWNER-ACTIONS.md`
> §2.3 for the question as it was put to him.**
