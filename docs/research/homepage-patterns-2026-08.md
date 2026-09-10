# Homepage Patterns — Mobbin Research, August 2026

> ## Status, 2026-09-10 — **SUPERSEDED RECORD. Kept for its reasoning.**
>
> 95 Mobbin captures from 2026-08-20, gathered for the V2 homepage rework and
> the pricing-page redesign. **The captures are still real and the reasoning is
> still good**; what has dated is the homepage it was gathered for.
>
> **It has exactly two consumers, and both are themselves superseded records:**
> it is the cited Inputs line of `docs/design/homepage-spec-2026-08.md` and the
> Sources line of `docs/design/anti-slop-and-hero-2026-08.md`. Deleting it
> while either stands would leave a live citation pointing at nothing, so it
> goes in the same commit as the last of them and not before.
>
> **Before citing a capture from here, open it.** Mobbin links go stale, and a
> capture nobody has looked at since August is evidence of what a page looked
> like in August.

> Research deliverable for the V2 homepage rework and the pricing-page redesign.
> **Advisory only.** No code, copy or design in this file — the `design` agent
> builds from it.
>
> **Method.** Every finding below comes from Mobbin MCP searches (web sections,
> iOS screens, web flows) run 2026-08-20. Each cited example is a real captured
> section or screen and carries its Mobbin link so a designer can open it.
> Where Mobbin genuinely could not answer a question, that is stated in the
> topic rather than papered over with generic advice.
>
> **What Mobbin cannot do.** Mobbin captures **states, not motion**. It stores
> stills of sections and screens, and flows of 2–3 evenly-spaced frames. It will
> not tell you a duration, an easing curve, or how a transition feels. Topics 8
> and 9 are motion questions, so they are the two weakest topics here and are
> labelled as such.
>
> **Evidence classes:** `measured` (a number actually run) · `observed` (seen
> directly in a cited Mobbin capture) · `inferred` (deduced from observed
> evidence) · `judgement` (design opinion, no evidence behind it). **Nothing in
> this document is `measured`** — no contrast, timing or performance testing was
> run for it.

---

## Topic 0 — One correction before the design work starts

The founder's complaint is that `02 / GRADIENT` "looks AI sloppy". Worth being
precise about where that string lives, because the fix targets differ:

- **`02 / GRADIENT` is the step rail**, not a section label. It is `.hstep-num`
  inside the sticky-scroll `<ol>` in `src/pages/Home.jsx` (`STEPS[].num` +
  `STEPS[].kicker`, rendered as `01` `/` `COLOUR`). Five of them, one per
  workbench mode.
- **The section eyebrows are separate** and are bracketed mono words:
  `[ THE WORKSPACE ]`, `[ THE TOOLSET ]`, `[ COMMUNITY ]`, `[ PRICING ]`
  (`.hbrow`).

This matters because the Mobbin evidence points in **opposite directions** for
the two. The bracketed mono eyebrow is corroborated by strong products; the
ordinal-plus-category-word pairing is not. See Topic 1.

---

## Topic 1 — Section eyebrow numbering

**Founder:** `02 / GRADIENT` "looks AI sloppy, this is a common trait of AI
generated sites — either move it, change it, remove it, do something else."

### What Mobbin shows

**The bracketed mono eyebrow is fine, and serious products use it.**

- **Grok (xAI)** — [products section](https://mobbin.com/sites/sections/af82f082-c333-48b4-8601-ca330ec1b109).
  Sets `[ PRODUCTS ]` in small mono caps, muted grey, above a large lightweight
  headline "AI for all humanity" on a black ground. Identical device to our
  `.hbrow`. Below it, three columns divided by hairline vertical rules, each
  ending in a mono pill CTA (`USE NOW ↗`, `BUILD NOW ↗`, `LEARN MORE ↗`).
- **BitcoinOS** — [article section](https://mobbin.com/sites/sections/744a8baf-ae51-43ce-916d-7ac79130e96d).
  Uses `[ Article ]` — bracketed, mono, centred, tiny — directly above a heavy
  condensed headline.

So the bracket-mono eyebrow is **not** the AI tell. The number is.

**Nobody in the sample numbers a section `NN / CATEGORY-WORD`.** What real
products do with sequence instead, in four families:

**1. Number as the graphic, not the label.**

- **Squarespace** — [how-it-works](https://mobbin.com/sites/sections/ef3efe83-bc75-4ef1-8ead-f758883587b3).
  `1` `2` `3` set at roughly 90–100px, near-black, in the left gutter of each
  row, optically aligned to the row's heading. The numeral is the visual rhythm
  of the column; no word is attached to it.
- **Trawelt** — [services](https://mobbin.com/sites/sections/629aae31-4a94-46df-a97f-3180a6ae22e0).
  `01` set enormous (roughly 160px+), bleeding off the right edge of the column,
  a hairline rule above each item, and a two-line label
  (`Mapping the Expedition` / `Planning & Preparation`) small at the left of the
  same rule. The number is scenery; the label carries meaning.
- **FOLLOW.ART** — [step cards](https://mobbin.com/sites/sections/c3c85947-b979-45d6-83d5-82cc5d1e2622).
  Numerals live *inside* tilted cards as large ghosted figures, plus a
  tick-ruler scrubber at the bottom of the viewport marked `Step 1`.

**2. Number as a position-of-total fraction — the strongest replacement.**

- **Daydream** — [operating model](https://mobbin.com/sites/sections/db6e26f1-2858-4509-85e9-0236e05f3802).
  Above the active step's title sits `01 / 04` in the accent colour, small.
  Underneath: title, body, and a pair of circular prev/next arrow buttons. Above
  the whole thing, an `Explore our model:` label and a wrapped row of radio-chip
  tabs naming all four steps.
- **Shupatto** — [product section](https://mobbin.com/sites/sections/e0460d85-effa-409c-8d0a-c6a6478bda16).
  `1 / 5` pinned to the **top-right corner of the viewport**, far from the
  heading, with `ACTIONS: Maximize / Minimize` as a mono label top-left.
- **Dropbox Work in Progress** — [blog index](https://mobbin.com/sites/sections/394b4270-60ea-4bc1-b723-e62e47b39ad5).
  `506 Articles — Page 1 of 57` as the only meta line. Quantity and position,
  never a bare ordinal.

**3. Word-label instead of a number.**

- **Wild** — [process section](https://mobbin.com/sites/sections/eef9343d-0d21-41e4-9524-54462b7612db).
  Four milestones — `Explore` `Generate` `Refine` `Scale` — each with a small
  circular glyph badge, spread along the x-axis of a data-viz that *is* the
  sequence. No numbers anywhere; the graphic encodes the order.
- **Ditto** — [workflow section](https://mobbin.com/sites/sections/74f2a8a6-5b4f-4590-8ae1-7a9ae2231aa5).
  Vertical left rail: `Draft` `Design` `Review` `Translate`, each a coloured dot
  on a shared vertical connector line. Order is spatial.

**4. A different meta dimension entirely — date, duration, category, quantity.**

- **Seed** — [benefits timeline](https://mobbin.com/sites/sections/0a635ee3-8326-4ebe-bd7f-89a3230a8d2e).
  Rail labels are `Day 1`, `Week 4`, `Week 8` as small pill tags on a vertical
  connector. Time replaces ordinality and adds information.
- **Sketch blog** — [feature card](https://mobbin.com/sites/sections/0aa61d33-7cfb-43eb-b005-55c4718fb1f5).
  Mono kicker reads `INDUSTRY  8 DEC` — category plus date. And the headline
  carries an inverted black mono box reading `Inside Sketch:` inline before the
  roman title. That inverted inline tag is a genuinely good, under-used
  substitute for a floating eyebrow.
- **MOUTHWASH Studio** — [journal item](https://mobbin.com/sites/sections/18b9940f-7494-4680-9013-07b8fbe47943).
  Title, dek, then `Jan 2025` in tiny type. That is the entire meta.

**Where the label sits.** Three placements observed, and only one is what we do:
attached above the heading (Grok, Mailchimp, BitcoinOS); in the outer margin away
from the content (Stripe Newsroom puts the date in the left margin behind a
vertical rule; Shupatto puts `1 / 5` in the page corner); or inline inside the
heading itself (Sketch's inverted `Inside Sketch:` box).

### The pattern

A sequence marker earns its place when it carries **information the reader cannot
already see**. Three things qualify:

- **Position within a known total** (`01 / 04`) — tells you how much is left.
- **A different axis** (date, duration, read-time, count) — adds a fact.
- **A cross-reference** — the number exists because it points at something else
  on screen. **Grammarly**
  ([business section](https://mobbin.com/sites/sections/1db9aea8-a59f-4359-9e58-d46d4d73b84a))
  is the clean example: small green circled `1` `2` `3` under three copy columns,
  matching identically-styled numbered callout pins on the product screenshot
  directly above. Remove the pins and the numbers become decoration. That is the
  test.

`02 / GRADIENT` fails all three. The `02` has no visible denominator, and
`GRADIENT` is the category word the step heading already implies. It is a number
bolted to a redundant label — the fingerprint of generated design: the *form* of
meta-information without the meta-information.

### Recommendation for UIL4B

1. **Keep `.hbrow`.** `[ THE WORKSPACE ]`, `[ COMMUNITY ]`, `[ PRICING ]` are
   corroborated by Grok and BitcoinOS and are load-bearing in V2's mono texture
   (`design-language-v2.md` §Structural patterns 4). Do not touch them. The
   contrast rule still applies: at 11–12px they need `--accent-strong`, not
   `--accent`.
2. **Change the step rail, and change it to a fraction.** `01 / COLOUR` becomes
   `01 / 05` in mono `--accent-strong`, with `COLOUR` folded into or dropped from
   the step title. One character-class of change; it preserves the mono texture,
   it gives the reader a progress signal through the sticky section that they do
   not currently have, and it matches Daydream exactly. It also closes a real UX
   gap — a pinned scroll section with no length indicator is the classic
   scrollytelling failure.
3. **If the founder wants the number gone entirely:** adopt Ditto's model — a
   vertical connector line down the rail, a dot per step, active dot filled
   `--accent`, no numerals. Order becomes spatial. Costs nothing in the V2
   language (the rail is already an `<ol>` with an active state) and is the more
   restrained choice.
4. **Avoid the Squarespace/Trawelt giant-numeral treatment.** It is real and it
   works, but it is a display-typography move that would fight the workbench
   panel for attention, and V2's emphasis budget is already spent on the inverted
   pricing panel and the one-`--hi`-element-per-viewport rule.

**Confidence:** `observed` for every cited example and placement. `inferred` for
the "carries information the reader cannot already see" rule — a generalisation
across eight captures, not a stated principle from any one of them. `judgement`
for preferring the fraction over the dot rail.

---

## Topic 2 — Community gallery showcase

**Founder:** "Systems worth stealing." is bad copy; the section should pivot to
showcasing the **community gallery**.

### What Mobbin shows

**The reference implementation is Lovable.** Its
[From the Community](https://mobbin.com/sites/sections/bf12496d-52c5-487f-997e-eb9f6b9bdeab)
section is the closest analogue to what UIL4B needs:

- Heading `From the Community` at small-to-mid size — **not** a display headline
  — with `View All` as a plain text link on the same baseline, right aligned.
- A **4-column** grid of live-site thumbnails. Dense: twelve visible.
- Attribution under each thumbnail is a **single row**: circular avatar (~20px,
  letter-monograms where there is no photo) + the project slug in regular weight.
- **One metric only** — `359 Remixes`, `168 Remixes`, `0 Remixes` — muted, small,
  second line. Note they render `0 Remixes` rather than hiding the zero. Honest
  counts are survivable.
- The grid ends in a centred `Show More` pill
  ([lower half](https://mobbin.com/sites/sections/c0aa7b35-1950-418e-aa77-11a0c882631a)),
  which expands rather than navigating away.
- The metric chosen is the **reuse** metric, not a vanity metric. "Remixes" means
  "other people started from this" — the thing a visitor actually wants to know.

**Figma Community** —
[join the community](https://mobbin.com/sites/sections/a807fcdf-407a-4edf-aaef-606f9fb6cf04) —
is the editorialised variant:

- A marquee ticker of the word `Community` repeating across the top edge.
- A short intro naming the *people* ("designers, plugin creators, researchers,
  illustrators, content writers").
- Then **stacked labelled sub-rows**, each with its own tiny mono-caps eyebrow in
  yellow: `BUZZWORTHY` → "Excellent files by and for our community", then
  `THIS WEEK` below. Three wide cards per row: cover art on top, footer bar with
  brand avatar + name at left (`Spotify`, `Alzeo`, `Material Design`) and a
  `+41.2K` count at right.
- The count is `+`-prefixed and abbreviated — it reads as momentum, not statistic.

**Uxcel** —
[contest winners](https://mobbin.com/sites/sections/41e2650d-c0dc-40c1-94fa-e24bdfca1a1d) —
the ranked variant: gold/silver/bronze medallion numerals overlapping the
top-right corner of the first three cards, an upvote count in a pill (`▲ 749`),
author name with avatar, and a `Submission #4` line.

**Webflow** —
[community stories](https://mobbin.com/sites/sections/24f4fa68-cd9f-4a24-bc91-bf9310a0061f) —
a masonry wall of quoted posts with a **top fade mask** so the first row bleeds
out of view, implying depth beyond the crop.

**The hover-to-preview affordance is confirmed by three separate flows:**

- **Gamma** — [template preview flow](https://mobbin.com/flows/691a707b-e858-47dd-be49-93e9e6fbbb4f).
  Frame 1: grid at rest, thumbnail + title only. Frame 2: hovered card reveals
  **two stacked buttons over the thumbnail** — `Use template` (filled primary)
  above `Preview` (secondary). Frame 3: a modal with the large preview left, a
  `Use this template` primary top-right, and a rail of alternative theme variants
  down the right side.
- **Mural** — [preview a template flow](https://mobbin.com/flows/e81aba69-d55b-426e-9c5c-e078b3f366fa).
  Rest → hover reveals a **single centred `Preview` pill with an eye icon** →
  detail modal with `Back to all templates`, zoom controls, a `Show example`
  toggle, and three actions: `Copy share link` (text), `Add to Starred` (quiet),
  `Use the template` (primary).
- **Figma Community** — [template details flow](https://mobbin.com/flows/1fe086ce-7352-4497-b9b4-a50083696f86).
  Grid cards carry `by Figma` plus **two** icon metrics (`♡ 2.1k`,
  `9.1k users`); the modal adds a thumbnail filmstrip, `Use template` primary, a
  heart save button, and About / Details columns where Details is a list of
  icon+label facts.

### The pattern

A marketing-page community gallery is a **density + attribution + one metric +
one verb** problem:

- **Density beats size.** Lovable shows 12 thumbnails in 4 columns; Figma shows 3
  large ones but stacks multiple labelled rows. Either way the visitor sees
  enough to believe a corpus exists. Six large cards in three columns — what
  UIL4B has now — reads as a curated sample, not a gallery.
- **Attribution must show a human.** Every strong example puts an avatar beside
  the name; Lovable uses letter-monograms rather than dropping the avatar.
- **One metric, and it should be the reuse metric.** Remixes (Lovable), users
  (Figma), upvotes (Uxcel).
- **The hover reveals the verb, and the verb is *use*.** All three flows put the
  primary action on hover over the thumbnail, and all three chose the use verb
  over the view verb. Preview is always secondary.
- **The section CTA is a quiet text link, not a big button.** The gallery is the
  persuasion; the link is plumbing.

### Recommendation for UIL4B

1. **Retitle around the artefact and the people, not the theft metaphor.**
   "Systems worth stealing." is a Dribbble-era joke and it fights our own
   positioning — `positioning.md` frames Discover as "browse, find, save, remix,
   submit, and get inspired". Lovable's flat `From the Community` works precisely
   because the grid does the talking.
2. **Go to a 4-column grid, 12 items instead of 6**, with a `Show more` pill that
   expands in place. `--radius-xl` (16px) is already specified for community/feed
   cards in `design-language-v2.md`.
3. **Add the avatar row.** Today `COMMUNITY_DESIGNS` renders `source` +
   `category` + `saves` with no human in the frame. A monogram avatar is enough
   and needs no asset pipeline — consistent with the existing generated-gradient
   thumbnails that deliberately avoid Storage.
4. **Keep the honesty note, but shrink it and move it.** The current
   `.hcomm-note` ("Ranking arrives with member submissions…") is doing real
   integrity work and must survive. But it sits between the heading and the grid,
   in the lede position, so the section opens on a disclaimer. Put it under the
   grid beside the CTA, at meta size.
5. **Add hover → `Preview` → a use verb.** Right now `.hcomm-card-link` opens an
   external URL in a new tab, which sends the visitor *away* — the exact failure
   `positioning.md` warns about ("links back to the relevant UIL4B tools so
   Discover drives users into the product, not away"). Gamma's two-button hover
   is the fix: `Open in Colour Studio` primary, `Preview` secondary.
6. **When the community backend lands, switch the metric to remixes/uses**, not
   saves. Stronger signal, and what all three references chose.

**Confidence:** `observed` for all grid structures, metric labels, avatar
treatments and the three hover→modal flows. `inferred` for "density beats size".
`judgement` for moving the honesty note and for the later metric switch.

---

## Topic 3 — Category / tool overview sections

**Founder:** "Six categories. One account." makes me want to skip it.

### What Mobbin shows

The founder's instinct is right, and Mobbin explains why. There are two clearly
separated families, and UIL4B is currently in the wrong one.

**Family A — the directory dump (avoid).**

- **Patreon** —
  [all tools and resources](https://mobbin.com/sites/sections/2c5b55e8-5381-40a0-9788-39b88eab081a).
  A 4-across grid of logo tiles (Vimeo, 99designs, Discord, Keeper, Crowdcast,
  Absolute, AudioMob, Bestow) with one line of text each. It is a directory, and
  it is the least persuasive section in the entire sample — nothing rewards
  reading past the third tile, because every tile has identical visual weight and
  the copy is descriptive rather than consequential.

**Family B — the catalogue that rewards reading.** Four mechanisms:

**1. Show the tool working inside the card.**

- **ElevenLabs** —
  [creative suite](https://mobbin.com/sites/sections/096778a1-7d16-4119-8b49-6db127275d74).
  Heading is an outcome sentence: "Our creative suite of AI audio tools
  reimagines professional workflows". Each card carries a mono-caps product name
  with a small line icon (`DUBBING STUDIO`, `STUDIO`, `AUDIO…`), then a
  **screenshot of that tool actually in use**, then one line of copy. Cards sit in
  a horizontal carousel with prev/next circular buttons — the overflow is
  deliberate, so the set feels larger than the viewport.
- **Teachable** —
  [more options](https://mobbin.com/sites/sections/24bd8e84-5b3c-4fd2-8020-04c5a8335275).
  Five cards, each with a **distinct coloured illustration band** at the top
  showing the product in context, then a mono-caps title (`ONLINE COURSES`,
  `DIGITAL DOWNLOADS`, `COACHING`, `MEMBERSHIPS`, `COMMUNITY`), one line, and a
  `Learn more` underlined link. The five sit 3-then-2, centred — an asymmetric
  grid, not a rigid 3×2.
- **Anchor** —
  [products](https://mobbin.com/sites/sections/1ade62cd-d44c-4e2e-99d2-778ce531446b).
  Tall cards, copy at the top, custom illustration filling the bottom, category
  name (`Accounts`, `Payments`, `Cards`) on a raised tab at the card's foot.
  Cards are staggered at different vertical offsets so the row scans as a set of
  objects rather than a table.

**2. Segment by audience, not by mechanism.**

- **1Password** —
  [protection for all](https://mobbin.com/sites/sections/41ed7eaf-aed8-4ca6-a362-7757f2f91146).
  Three cards labelled `BUSINESS`, `PERSONAL`, `DEVELOPERS` in tiny mono caps
  above the card title. The heading — "Protection for all – from enterprises to
  individuals" — states the span, so the reader self-selects in one glance
  instead of reading three feature lists.

**3. Make the list a control.**

- **Figma FigJam** —
  [the right tool for any job](https://mobbin.com/sites/sections/45aee286-54a3-4545-a416-a85f6fa6ca62).
  A **vertical left rail** of five categories (`Brainstorming`, `Diagramming`,
  `Meetings & workshops`, `Agile workflows`, `Strategy & planning`) separated by
  hairline rules, the active item carrying a glyph and heavier weight; the canvas
  to the right shows that category in action. The catalogue *is* the navigation.
- **Mural** —
  [start strong](https://mobbin.com/sites/sections/94100049-8b7d-4b4a-a114-bde6f6dd71f5).
  Same idea, but the **active item expands** into a filled card revealing a
  description line, while the four inactive items collapse to bare titles on
  hairline dividers. The most information-efficient version of the pattern in the
  sample.

**4. Restrained columns with rules and mono CTAs.**

- **Grok** —
  [products](https://mobbin.com/sites/sections/af82f082-c333-48b4-8601-ca330ec1b109).
  Three columns divided by hairline vertical rules, each with a title, two lines
  of copy, a line-art sketch, and a mono pill CTA. No screenshots, no colour — and
  it still reads, because there are only three and each ends in a different verb.

**The heading matters as much as the grid.** Compare: "Our creative suite of AI
audio tools reimagines professional workflows" (ElevenLabs), "Protection for all
– from enterprises to individuals" (1Password), "The right tool for any job"
(Figma), "More options for more sales" (Teachable). Every one names a
**consequence for the reader**. "Six categories. One account." names an inventory
and a billing fact.

### The pattern

A tool catalogue rewards reading when each entry is **visually differentiated and
consequentially labelled**: give each entry its own image or colour identity,
title it with the outcome, cap the visible set, and make the heading a promise
rather than a count. The moment every entry looks the same and reads the same,
the reader correctly infers they can skip the block — which is exactly what the
founder did.

### Recommendation for UIL4B

The current `.htools` section is six identical `--surf` cards, each with an icon
glyph, a title, a description, and **a nested `<ul>` of every tool route**. That
nested list is the specific thing making it a directory dump — Patreon's failure
mode with more text.

1. **Cut the nested tool lists from the card face.** Show six cards, each with the
   category, the outcome line, and a count (`7 tools · 2 soon`). The full route
   list belongs on the category page, which `group.home` already links to.
2. **Replace the icon glyph with evidence.** Every persuasive example shows the
   product working. UIL4B has an advantage none of these companies had:
   `HomeWorkbench` already renders live output for five of the six categories. A
   small, static, non-interactive render — a five-step ramp for Colour, a type
   specimen for Type, a 3×3 icon set for Icons — turns each card from a label
   into proof. Highest-value change in this topic.
3. **Rewrite the heading toward the consequence.** The real promise, straight out
   of `positioning.md`, is that a decision made in one tool is the same decision
   everywhere else — the sentence currently buried in `.hlede`. It should be the
   H2.
4. **Consider the Mural rail instead of a 3×2 grid.** If the founder wants this
   section shorter rather than better, the Mural pattern — six titles in a left
   rail, active one expands with its description, evidence panel on the right —
   collapses the block to about one viewport and turns a skim into an
   interaction. **Caveat:** the page already has one sticky-scroll interaction
   above it, and two scroll-driven mechanics in sequence is a lot. If the Mural
   rail goes in, make it click-driven, not scroll-driven.
5. **Keep the `Soon` badges.** No Mobbin evidence needed; standing honesty rule,
   and none of the references had an equivalent problem to solve.

**Confidence:** `observed` for all cited sections, headings and card structures.
`inferred` for "the nested list is what makes it a dump" — Patreon's tile grid is
the closest observed analogue but is not identical. `judgement` for the
live-render-in-card recommendation and the Mural-rail caveat.

---

## Topic 4 — Export capability showcase (NEW section)

**Founder:** a new section showing off export abilities — CSS custom properties,
DTCG tokens, Tailwind, styled HTML page.

### What Mobbin shows

This is the **best-covered topic in the whole research**. Developer-facing "you
get real code out" sections are a mature, well-solved pattern.

**Resend is the reference** —
[integrate this morning](https://mobbin.com/sites/sections/ba73bbd7-0644-4c95-b730-f32830a6ef34).
It uses a **two-tier switcher**, and the tiers do different jobs:

- **Tier 1 — a row of 12 icon tiles** with a label under each: `Node.js`,
  `Serverless`, `Ruby`, `Python`, `PHP`, `Go`, `Rust`, `Java`, `Elixir`, `.NET`,
  `REST`, `SMTP`. Each is a rounded square carrying the language mark. The active
  tile is outlined and its label goes full-contrast; the rest sit muted. This tier
  says *"we support all of these"* — the count is the message.
- **Tier 2 — sub-tabs inside the code panel's own title bar**: `Node.js`,
  `Next.js`, `Remix`, `Nuxt`, `Express`, `Hono`, `Redwood`, `Bun`, `Astro`.
  Active tab is a filled pill within the bar.
- The panel body is syntax-highlighted, has **line numbers in a muted gutter**,
  and a **copy icon at top-right**.
- The panel **footer** carries two quiet text actions with icons:
  `View on GitHub` and `Download ZIP`.
- The heading colours its second half — "Integrate **this morning**" — and the
  sub-line names the deliverable.

**Stripe** —
[designed for developers](https://mobbin.com/sites/sections/286613b2-cec3-4b45-ba6e-77930aa42ef4) —
adds the move that makes a code block persuasive rather than decorative: it stacks
**the code above its own output**. Top panel is
`stripe.paymentIntents.create({…})` with a visible cursor; bottom panel is a
terminal showing a `NORMAL server.js` status bar and real log lines
`[200] payment_intent.created`, `[200] charge.succeeded`,
`[200] payment_intent.succeeded`. Input and result in one frame. Beneath, four
icon+title+link columns each ending in a different verb (`See libraries ›`,
`Explore no-code ›`, `View connectors ›`, `Learn about apps ›`).

**Webflow** —
[developers](https://mobbin.com/sites/sections/cb749566-b4c0-4a83-a3b2-6799ac6b0cbe) —
does the same request/response pairing inside a **single** panel with two tabs
(`shell` / `javascript`, active underlined): the block literally contains
`CURL request:` then `JSON response:` as inline comments.

**Browserbase** —
[works with the tools you already use](https://mobbin.com/sites/sections/7b413555-643c-4e2d-9efb-2ee108b6b90c) —
the minimal, tasteful version: heading, one sub-line, two CTA pills
(`Get started with Stagehand` filled dark, `Get started with CLI` quiet), then a
code panel with **three traffic-light dots**, two tabs (`Typescript`, `Python`),
an active-tab underline in the brand colour, a copy button at bottom-right, and
**inline `// comments` used as narration** (`// Let AI click`,
`// Extract structured data`). The comments do the explaining a paragraph would
otherwise do.

**Bird** —
[developer ecosystem](https://mobbin.com/sites/sections/cddb70d8-8531-4a78-991e-d472aeeb2d95) —
tab row `Go · Node · Ruby · Python · Java · PHP` over a JSON block with line
numbers, floated on a gradient panel, three supporting columns beneath.

**Airtable** —
[develop solutions](https://mobbin.com/sites/sections/1ba5eee9-25f4-48a7-9eb3-48cdacddb654) —
puts a **blue `▶ Run` button floating over the code panel**, converting a static
block into an implied demo.

**And the closest analogue to UIL4B's actual product** — **Sketch**,
[make handoff colorful](https://mobbin.com/sites/sections/3ea93e9a-8591-423b-aef7-d78fedddd674).
This is a colour-token export section, which is exactly our problem:

- A two-item switch, `for Mac` / `for Web`, with a hand-drawn arrow annotation
  reading "Switch" pointing at it.
- The visual is **a screenshot of the real context menu** — `Copy To Clipboard ›`
  expanding to `Hex`, `RGB`, `HSL`, `NSColor`, `UIColor`, `Objective-C`, `Swift`.
  The format list is shown as the product's own UI, not as marketing chips.
- The body copy names formats explicitly: "you can grab your tokens in CSS or
  JSON formats from the web app, or generate a URL that stays up to date with any
  changes you make."

**The token-card pattern**, for the "what a token looks like" half:
**Mural** ([colour palette](https://mobbin.com/sites/sections/617cde5a-9515-4ce1-b1f2-5e78811b29ef))
— white card, colour block on top, name, hairline rule, `Hex #FF4B4B` in mono.
**Discord** ([colours](https://mobbin.com/sites/sections/76199585-720a-4513-b0cf-37309cf479b4))
— name inside the swatch, `#5865F2` and `CMYK 56, 43, 0, 0` stacked in mono
beneath. **Linear**
([brand colours](https://mobbin.com/sites/sections/f0c7f39b-7818-4461-a3f7-ab32ee183c67))
— value centred *inside* the swatch, hex above RGB, with a paragraph explaining
*when* each is correct. **Glide**
([brand](https://mobbin.com/sites/sections/6f697904-0d8a-498d-9252-8d8bc401db9a))
— states the affordance in words: "Colours — **Click to copy hex value**".

### The pattern

The persuasive "real code out" section is four elements:

1. **A format switcher that is also a claim about breadth.** The row of format
   names is the message; the code is the evidence. Resend's 12 tiles say "any
   stack" before you read a line.
2. **A code panel with tool-chrome signals**: line numbers or traffic lights,
   syntax colour, and a copy affordance **visible at rest**, not on hover.
3. **The output, not just the input.** Stripe's log panel and Webflow's
   request/response pairing separate "here is some code" from "here is what you
   get". Airtable's `Run` button is the cheap version.
4. **A destination in the panel footer.** `View on GitHub` / `Download ZIP`
   (Resend), `Read the documentation ↗` (Webflow). The block ends in an exit.

### Recommendation for UIL4B

This should be the **proof section for the Pro line**, because exports are exactly
what Pro unlocks (`positioning.md`: "Free = save projects + share a live preview
URL. Pro = all file exports").

1. **Use Resend's structure, collapsed to one tier.** Four formats is not twelve —
   a single row of four pill tabs is correct: `CSS custom properties` ·
   `DTCG tokens` · `Tailwind` · `HTML page`. Pills are already the only button
   shape in V2 (`design-language-v2.md` §Shape), so this needs no new component.
2. **Feed it from the real exporter.** `src/utils/exportBuilder.js` already
   produces these. Render its actual output for a fixed sample system so the code
   can never drift from the product — the same principle `Home.jsx` already
   applies to `LIVE_TOOL_COUNT`. A hand-written code sample here would be the one
   dishonest thing on the page.
3. **Show input and output side by side, Stripe-style.** Left panel: the system as
   the user sees it (a five-swatch ramp with names — the Mural/Linear token-card
   treatment). Right panel: the same system as
   `--color-primary-500: #0F6FFF;`. That pairing is the entire pitch of the
   product in one frame, and no competitor in the sample has an equivalent.
4. **Panel chrome:** V2 already specifies browser chrome for the sticky demo panel
   (three `--line` dots + a mono label). Reuse it — the mono label becomes the
   filename (`tokens.css`, `tokens.json`, `tailwind.config.js`,
   `styleguide.html`), a free extra signal that the export is a *file*.
   `--radius-2xl` / `--shadow-panel` per the V2 doc.
5. **Copy button visible at rest, and a footer exit** (`Open Export & Handoff →`).
6. **The HTML-page format needs a different visual.** Three of the four formats
   are code; the styled HTML page is a *rendered artefact*. When that tab is
   active, show the rendered page in the panel rather than its source. The one
   place the pattern needs adapting rather than copying.
7. **Placement:** immediately after the sticky workbench section and before the
   community grid. Narrative becomes: here are the tools working → here is what
   comes out → here is what other people made → here is the price.

**Confidence:** `observed` for every switcher, panel-chrome and token-card detail
cited. `inferred` for the ordering recommendation. `judgement` for routing this as
the Pro proof point and for the HTML-tab exception.

---

## Topic 5 — Learn / education surface (NEW section)

**Founder:** a new homepage section about the Learn tab — "information that makes
you a better designer / brand designer / builder".

### What Mobbin shows

Mobbin covers education sections well, and there is a clear split between
**destination pages** (a whole Learn page) and **homepage strips** (a small block
that points at Learn). UIL4B needs the second, but the first tells you what to
promise.

**Destination pages — the taxonomy is the design.**

- **Sketch** —
  [Guides & Courses](https://mobbin.com/sites/sections/7fde2329-84c2-4efa-ad6f-5f933dfaab80).
  Huge display heading, a two-line dek pitched at both ends of the skill range
  ("Whether you're new to Sketch, or looking to sharpen up your skills"), then a
  **row of eight pill filter chips**: `Templates`, `Courses`, `Documentation`,
  `Guides`, `Tutorials`, `Tours`, `Stories`, `Quick links`. Loose collaged
  screenshots float to the right of the heading.
- Below ([content rows](https://mobbin.com/sites/sections/ef7483b8-34cf-4f12-b669-80215cff072a)),
  each content *type* gets its own row: a title, a `See more` pill button beside
  it, a one-line description of what that type is for ("Discover how to make the
  most of Sketch, from simple tricks to pro techniques"), then a horizontal
  carousel of cards with abstract 3D cover art and a next-arrow. Rows repeat:
  `Guides`, then `Tutorials`. **The chips and the rows mirror each other** — the
  chip row is a table of contents for the page.
- **Framer** — [Learn.](https://mobbin.com/sites/sections/69d896de-a80a-4b68-a0a6-b38b29d776f6).
  One word as the headline, in gradient. The dek lists formats: "Tutorials,
  videos, examples, and articles". Then two very large gradient cards whose titles
  name **the format and the time cost**: `In-App Tour` ("An interactive overview
  of the basics within Framer") and `3 Hour Course` ("Build a 3D site without code
  with Framer").
- **Notion** — [Guides](https://mobbin.com/sites/sections/a95193d9-49c3-4eb6-afe3-d11978328845).
  Left sidebar taxonomy (Help / Notion Academy / Guides & courses / API), and each
  card carries a screenshot, a title, a one-line dek, and a **`5 min read` /
  `6 min read` duration** with a small book glyph.
- **Stripe** —
  [Guides and resources](https://mobbin.com/sites/sections/ea7fe67c-9a3c-4245-bd54-ab6af4822260).
  Guides as tall staggered "book cover" tiles in saturated brand colours, each
  carrying a category kicker *inside* the tile (`Product resources`,
  `Atlas guides`, `Industry updates`) above the title. No photography, no icons —
  the colour blocks are the identity.
- **Dropbox** —
  [fundamentals](https://mobbin.com/sites/sections/daaed103-83a8-4b8c-82f5-b2410feedeb0).
  Three cards split by **learning modality**, not topic — `Dropbox learning live`
  (instructor-led), `Self-guided learning` (video), `Dropbox quick start guides` —
  each with its own CTA button (`Sign up now`, `Explore courses`, `Get started`).
- **Customer.io** —
  [Ready to Learn?](https://mobbin.com/sites/sections/57233dd5-f1fd-455e-990f-73f23ad050a6).
  Underlined-heading + four tabs `All | Guides | Tutorials | Webinars` over a
  **list** (not a grid): each row is a small thumbnail left, title + dek right,
  full-width rows on white cards.

**The homepage strip — the minimal viable version.**

- **Figma** —
  [learn how to use Figma](https://mobbin.com/sites/sections/5e5e1437-b37b-4648-8649-e2fe6f7f71e0).
  Directly above the footer, on a black band: one line of heading
  ("Learn how to use Figma") and then **three underlined text links laid out
  inline on a single row**, each followed by a small coloured product glyph:
  `Figma Design: Beginner tutorial` · `Intro to design systems` ·
  `Guide to FigJam`. That is the entire section. Two lines of vertical space.

### The pattern

Education sections earn attention by answering three questions the reader has
before they click: **what format is it, how long will it take, and what will I be
able to do afterwards.**

- **Format is named, always** — tour, course, guide, tutorial, webinar, doc.
- **Time cost is named where it is short** — `5 min read` (Notion), `3 Hour
  Course` (Framer). This is the highest-signal, lowest-cost metadata available and
  most products skip it.
- **Taxonomy chips double as a promise of breadth.** Sketch's eight chips tell you
  the library is deep before you scroll a single row.
- **Modality segmentation beats topic segmentation** when the library is small
  (Dropbox). Three formats reads as a considered programme; three topics reads as
  three articles.
- **On a homepage, the strip is small.** Figma — a company with an enormous
  learning library — spends two lines on it. The homepage's job is to prove Learn
  *exists* and is worth a click; the Learn page does the selling.

### Recommendation for UIL4B

The constraint that dominates here: `CLAUDE.md` says Learn is "Honest coming-soon
until scoped content routes ship." So this section must not imply a library that
does not exist.

1. **Do not build the Sketch/Stripe destination-grid pattern on the homepage.** It
   requires a real corpus with cover art. Building the shell before the content
   produces the exact "AI generated site" feel the founder is objecting to
   elsewhere — a grid of plausible-looking cards that go nowhere.
2. **Build the Figma strip instead.** Heading, one line, and three-to-four named
   inline links to the routes that *actually exist today* — the Docs routes
   (`DocsDesign`, `DocsBrand`, `DocsSEO`, `DocsAI`) and `/help`, per the
   `positioning.md` surface mapping. Two lines of vertical space, zero fabrication
   risk, and it can grow into a grid when content lands.
3. **Take the one metadata idea worth stealing now: name the format and the time.**
   `Colour systems · 6 min read`. Notion and Framer both do it and it costs
   nothing but a word count.
4. **Frame it against the founder's angle — "makes you a better designer".** The
   observed headline that fits our voice is Sketch's dual-range dek ("whether
   you're new to X, or looking to sharpen up your skills") rather than Framer's
   single-word `Learn.` — because our audience per `positioning.md` is
   "visually literate, time-poor, and ruthless about craft", and a one-word
   headline promises a library we do not yet have.
5. **Placement:** between pricing and the closing `SystemCTA`, or immediately
   before pricing. Not high on the page — none of the observed homepage strips
   are; education is a retention surface, not an acquisition surface, and the
   homepage's acquisition job is Create.
6. **Modality segmentation for later.** When Learn has real content, Dropbox's
   three-modality split (read / watch / follow-along) is the right first cut for a
   small library — better than a topic taxonomy that will look sparse.

**Confidence:** `observed` for all cited education pages and the Figma strip.
`inferred` for "homepage strips are small" — four destination pages versus one
homepage strip is a thin base for that generalisation, and it is possible Mobbin
simply captures destination pages more often. `judgement` for the recommendation
to build the strip rather than the grid, which is driven by our coming-soon
constraint rather than by the pattern evidence.

---

## Topic 6 — Pricing page

**Founder:** must be redesigned to match the homepage and the in-app pricing
panel.

### What Mobbin shows

Well covered. Every result was a three-or-four-column card layout; the variation
is in five specific mechanisms.

**The billing toggle, and where it lives.**

- **Dub** — [pricing](https://mobbin.com/sites/sections/0d2d583d-2925-4080-a99e-001e46f0437f).
  A single toggle above the cards labelled `Annual discount (2 months free)` —
  **the saving is named in the toggle label itself**, in accent colour. The value
  is also repeated as a small `2 months free` pill next to the price inside the
  Pro card, so a reader who scrolled past the toggle still sees it.
- **Current** — [pricing](https://mobbin.com/sites/sections/43086f47-57f2-4d64-937f-3f18a780846b).
  The most interesting one for UIL4B: there is **no page-level toggle at all**.
  The `Monthly | Annual` segmented pill sits **inside the Pro card only**, right
  beneath the `$8/user/month` price, with a `-20%` pill beside it. Starter is
  "Free for everyone" and Enterprise is "Let's chat", so a global toggle would be
  meaningless for two of the three columns.
- **Maze** ([pricing](https://mobbin.com/sites/sections/b6220462-e7a4-421c-bda8-748b65ea8f65)),
  **Lyssna** ([pricing](https://mobbin.com/sites/sections/e09e57c8-5eb6-42ca-86a7-dbdd1366d474)),
  **Relume** ([pricing](https://mobbin.com/sites/sections/cfebceaa-e3dd-4748-bf7e-500b09e8d862)),
  **Copy.ai** ([pricing](https://mobbin.com/sites/sections/2b4ce5a9-1e9c-4069-b0bb-70358ab3a5b9)),
  **PamPam** ([pricing](https://mobbin.com/sites/sections/67e0a61a-3431-44e4-9f2b-23e3477c87d5)),
  **Oku** ([pricing](https://mobbin.com/sites/sections/f66ba39e-9d4f-4336-955d-8721fef92d47))
  all use a page-level toggle, and **five of the six name the saving next to it**
  (`25% OFF`, `Save 25%!`, `Yearly discount (30%)`, `Save 30%!`,
  `2 months free`). Naming the saving on the toggle is close to universal.

**Emphasising one plan.**

- **Dub**: a `Most popular` badge shaped as a **tab straddling the top border**
  of the middle card, in the accent colour.
- **Copy.ai**: the Pro card is physically **raised and taller** than its
  neighbours, with a coloured border and a `Most Popular` dark pill; its price is
  the only one with an accent-coloured value line (`Unlimited words`).
- **Relume**: the emphasised card gets a coloured 1px border and the plan names
  themselves are colour-coded (`Relume Pro` in orange, `Relume Team` in purple).
- **Oku**: tier tags as tiny pills at the card top (`PREMIUM`, `★ SUPPORTER`) with
  a faint tinted card background per tier.

**Carry-forward feature lists.** Universal and worth copying literally: `Everything
in Free, plus:` (Dub), `Everything in Starter plus…` (Current), `Everything in
Pro +` (Relume), `← Everything in Free` (Oku, with an arrow glyph). Nobody
re-lists shared features. Dub goes further and makes some feature names
**underlined links** so a reader can find out what "Advanced link features"
actually means without leaving the page.

**Trial and risk-reversal framing.**

- **Relume** puts `Start a free trial` as the button on **every** paid card, not
  as a separate offer.
- **Copy.ai** lists `7-day free trial of Pro Plan` as a **feature of the Free
  plan** — the trial is presented as something Free already includes.
- **Lyssna** and **Maze** put `No credit card required` in small text directly
  under each button.
- **Dub** uses `Free forever` as the Free plan's price sub-line rather than a
  blank.

**Currency and trust.**

- **Lyssna** writes `$0 USD / month`, `$89 USD / month` — currency inline with
  every amount.
- **Relume** does the same (`$40 USD` with `/month for one person` beneath).
- **Maze** and **Relume** both place a **customer logo row above the pricing
  cards** (GE, McKinsey, Cloudflare, Nubank, Vanguard, Air France KLM / Nike,
  Webflow, IDEO, DEPT, VML). Social proof precedes the ask.

**The closest tonal analogue to UIL4B.** **Oku** — an indie product at $6/month
with a "Premium Membership" heading and the dek "Our premium friends get some cool
extras, plus the warm feeling inside that comes from supporting an indie team."
Its $15 Supporter tier lists `Our eternal gratitude` and `Your own spot on our
supporter wall (coming soon)` as features — **and marks the coming-soon one as
coming soon inside the feature list**. That is the honest-pricing pattern UIL4B
needs, at almost exactly UIL4B's price point.

### The pattern

- **The toggle belongs wherever the choice actually applies.** If Free has no
  cadence and Enterprise has no price, a global toggle is a lie about two thirds
  of the page (Current's fix).
- **The saving must be named, not computed by the reader.** Every observed toggle
  states the discount.
- **Emphasis is one device, not four.** Each example picks *one* of: badge, raised
  card, coloured border, tint. Nobody stacks them.
- **Carry-forward lists, always.** `Everything in X, plus:`.
- **Risk reversal sits next to the button, not in a footnote.**
- **Currency inline** when the audience is international.

### Recommendation for UIL4B

The homepage already has the pricing panel it needs — the inverted `--fg` panel,
which `design-language-v2.md` designates as "the strongest emphasis device in the
system. One per page, maximum." The `/plans` page must match it without duplicating
it, because the homepage panel is display-only marketing copy and `/plans` is the
live, checkout-backed surface.

1. **UIL4B has a three-cadence ladder, not a two-state toggle** ($7 monthly / $18
   quarterly / $48 yearly). A binary switch cannot express it. **Current's
   in-card segmented control is the correct pattern**: Free has no cadence, so the
   three-way cadence selector belongs inside the Pro card. This also matches the
   homepage panel, which already renders the ladder as three rows rather than a
   toggle.
2. **Name the saving on every cadence row**, per the near-universal pattern. The
   current `PRICE_LADDER` notes (`Save $3 a quarter`, `Best value · 7-day free
   trial`) already do this — carry the same strings to `/plans` so the two
   surfaces cannot drift.
3. **Pick exactly one emphasis device for the yearly row.** The homepage panel
   currently uses `data-best` plus the `--hi` CTA. Per the V2 highlight budget
   (at most one `--hi` element per viewport), `--hi` should be spent on the CTA
   *or* the best-value row, not both.
4. **Carry-forward the feature list.** `Everything in Free, plus:` above
   `PRO_INCLUDES`. Free's own list should be explicit rather than implied — right
   now the homepage panel describes Free in prose ("Free covers the complete core
   toolkit…") while Pro gets a ticked list, which visually advantages Pro in a way
   the copy does not intend.
5. **Move the risk reversal next to the button.** `No credit card · 7-day free
   trial` under the CTA, Lyssna-style, not in the fine print block below.
6. **Keep currency inline.** `api/_lib/pricing.js` already has `BASE_CURRENCY =
   'usd'` and eight currencies; Lyssna's `$X USD / month` treatment is the honest
   rendering, and it removes the need for the current three-line disclaimer.
7. **Steal Oku's tone, not Maze's.** UIL4B is an indie product at an indie price
   with no enterprise logo row to show. Oku proves that framing works at this
   price point — and Oku's habit of marking a not-yet-shipped feature as
   coming-soon *inside the feature list* is directly compatible with the `Soon`
   badge language already in use.
8. **Do not restructure Stripe or the price service to achieve any of this.** The
   quarterly price does not exist in `useProPrice` / `api/_lib/pricing.js` today;
   that is a founder-gated workstream per `human-validation-zones.md`. The
   redesign should be visual and structural, and the in-card cadence selector
   should degrade to the two cadences the service actually knows until quarterly
   is wired.

**Confidence:** `observed` for every toggle placement, badge, carry-forward
string, trial framing and currency treatment cited. `inferred` for "emphasis is
one device, not four" — consistent across eight captures but not stated anywhere.
`judgement` for the recommendation to use Current's in-card control and for the
Oku-over-Maze tonal call.

---

## Topic 7 — Sticky scroll / scrollytelling

**Founder's context:** the homepage has a sticky pinned graphic beside scrolling
text. How is this executed well — when the pinned panel swaps content, vertical
centring, transition feel.

### What Mobbin shows

**Partial coverage, honestly.** Mobbin captures a *frame* of a scrollytelling
section, so it shows the layout and the active/inactive treatment, but it cannot
show when the swap fires or how it eases. What it does show clearly is the
**inactive-state treatment**, which is the part of the pattern most often got
wrong — and which is where UIL4B's current implementation differs from the best
references.

- **Mural** —
  [start strong, end smarter](https://mobbin.com/sites/sections/94100049-8b7d-4b4a-a114-bde6f6dd71f5).
  The single best capture for this topic. Left column: five step titles. The
  **active step is a filled card** (light fill against a black page) containing
  the title *and* a description line. The four inactive steps are **bare titles on
  hairline dividers, with no body copy at all**. The right panel is the graphic.
  So the left rail's height barely changes as the step advances, and the reader's
  eye has exactly one place to be.
- **Ditto** —
  [product workflow](https://mobbin.com/sites/sections/74f2a8a6-5b4f-4590-8ae1-7a9ae2231aa5).
  Vertical connector line down the left with a coloured dot per step (`Draft`,
  `Design`, `Review`, `Translate`); the panel to the right is a product
  screenshot. The connector makes the section's length legible at a glance.
- **Daydream** —
  [operating model](https://mobbin.com/sites/sections/db6e26f1-2858-4509-85e9-0236e05f3802).
  Chip tabs naming *all four* steps above the section, an `01 / 04` counter, the
  active step's title and body below it, an illustration to the right, and
  **manual prev/next circular buttons**. Scroll is not the only way through.
- **Anchor** —
  [product tabs](https://mobbin.com/sites/sections/682fde40-6191-44c4-a246-c75ad9d9c2f2).
  Vertical left rail of five products, active one filled dark green with a chevron.
  The capture happens to land **mid-transition**: the headline's first line
  ("Issue compliant accounts and") is fully rendered in solid ink while the second
  line ("digital wallets to your") is still in a lighter, italic-looking
  intermediate state. Direct visual evidence that the text swap is **staged /
  per-line**, not a single hard cut.
- **Faculty Department** —
  [split layout](https://mobbin.com/sites/sections/59838174-70f1-4a04-9985-8541f4e69473).
  A hard 50/50 split where the **left column scrolls independently** against a
  fixed right-hand image panel, with `01` as a small index number in the left
  column's own margin and a `VIEW MORE` link at the top right of the scrolling
  column.
- **Ditto's homepage** ([workflow](https://mobbin.com/sites/sections/74f2a8a6-5b4f-4590-8ae1-7a9ae2231aa5))
  and **Sana** ([product panel](https://mobbin.com/sites/sections/01be0505-beef-4ed0-a932-76fb40a07ae8))
  both float the pinned panel on a soft tinted ground with generous padding rather
  than letting it touch the viewport edges.

### The pattern

Three things the good examples do that a mediocre sticky section does not:

1. **The inactive state collapses.** Mural's inactive steps carry no body copy.
   UIL4B's rail renders **all five steps at full length simultaneously** — title,
   body paragraph, three bullet points with tick icons, and a CTA link, for every
   step — with only an opacity change on the title (`opacity: .4 → 1` per
   `design-language-v2.md` §Motion). Five full step blocks stacked is a very long
   left column, which forces a long scroll distance and makes the pinned panel
   feel like it is lagging.
2. **The set is legible before you scroll it.** Daydream lists all four steps as
   chips; Ditto draws a connector; Mural shows all five titles. The reader knows
   the shape of the section on arrival.
3. **There is a manual path through.** Daydream's prev/next buttons; Mural,
   Anchor, Figma and Ada all make the rail clickable. Scroll-only is an
   accessibility and impatience failure.

On **vertical centring**, Mobbin gives layout evidence but no measurement: the
pinned panels observed sit with visible margin above and below rather than filling
the viewport, and the active text block sits roughly at the vertical centre of the
pinned panel. V2 already specifies `position:sticky; top:96px` for the demo panel,
which is the same family of value.

### Recommendation for UIL4B

1. **Collapse the inactive steps.** Only the active step should render its body,
   its bullet list and its CTA; inactive steps render the title (and, if Topic 1's
   fraction is adopted, the `NN / 05`). This is the single change with the largest
   effect on this section — it shortens the rail dramatically, which shortens the
   scroll distance, which fixes the lag between text and panel without touching
   the motion code at all.
2. **Add a connector or a progress cue.** Ditto's vertical line with a filled
   active dot is the cheapest option and reuses the `--line` token.
3. **Make the rail clickable.** Each step title becomes a button that sets `mode`
   and pins it, exactly as `onTabChange` already does for the workbench tablist.
   The `pinnedRef` mechanism that stops scroll from overriding a user's manual
   choice already exists and is the right behaviour — Daydream's prev/next buttons
   are the same idea.
4. **Keep the existing motion ownership.** `design-language-v2.md` is explicit
   that the mock's raw `window.addEventListener('scroll')` must not be ported, and
   that `useHomeMotion()` (Lenis + GSAP, reduced-motion guarded) owns this. Nothing
   in the Mobbin evidence argues against that.
5. **Stage the text swap rather than cutting it.** Anchor's mid-transition frame
   is the only direct evidence of transition *feel* in this entire research, and
   it shows a per-line staged arrival rather than a block cross-fade. Applying the
   existing `--dur-3` / `--ease-standard` tokens with a small per-element stagger
   is consistent with both that observation and the V2 restraint rule.

**Confidence:** `observed` for all layouts, active/inactive treatments and the
Anchor mid-transition frame. `inferred` for "collapsing inactive steps shortens
the perceived lag" — that is a reasoning step from Mural's layout, not something
Mobbin demonstrates. `judgement` for the staged-swap recommendation. **No timing
or easing value in this topic is evidence-backed.**

---

## Topic 8 — Tab switching micro-animation

**Founder:** the homepage mini-tool switches tabs too abruptly — "too snappy,
looks jumpy".

### What Mobbin covered — and what it did not

**This is one of the two topics Mobbin does not cover well, and I am not going to
pretend otherwise.** Mobbin stores stills. It cannot tell you a duration, an
easing curve, or whether a height change is animated. Everything below about
*what animates* is `observed`; everything about *how long* is not evidenced at
all and is marked `judgement`.

What Mobbin does answer well is a different and still useful question: **what the
indicator looks like, and where the tab row sits relative to the panel.**

### What Mobbin shows

**Four indicator styles, observed:**

1. **Colour-only on icon + label, no moving pill.** **Framer** —
   [use cases](https://mobbin.com/sites/sections/556c62ee-b2af-4993-b400-187d98f1fd72).
   Four icon+label tabs (`Publish`, `Layout`, `Breakpoints`, `Animations`); the
   active one (`Breakpoints`) has both its icon and its label in the brand purple
   while the other three sit in grey. There is no underline, no pill, no
   background. Above it sits a *second* level of plain-text tabs (`Framer is
   for: Everyone | Marketing Teams | Freelancers | Organizations`) with a simple
   bold + underline active state.
2. **Filled pill inside a track.** **Zipline** —
   [platform section](https://mobbin.com/sites/sections/ce7e2b2b-54f9-4a13-952e-4a895a0f7c30):
   a two-item control (`Sunny` / `Stormy`), the active filled red with a small dot
   glyph, sitting centred directly beneath the H2 and above the graphic.
3. **Underline.** **Browserbase** and **Webflow** (cited in Topic 4) both use a
   1–2px accent underline under the active tab in a code-panel title bar.
   **Evernote** ([tool rail](https://mobbin.com/screens/866d750f-16ce-4ff4-937d-9dc196b88433))
   uses the same on a mobile tool rail, combined with the active tool being
   physically lifted.
4. **Expanding pill.** **Ada** —
   [top features](https://mobbin.com/sites/sections/9b10b8f3-262e-497f-9d9a-6dabc7e14593).
   A vertical stack of five pill tabs where the active one is filled black and
   **wider than the inactive ones**, which sit as white outlined pills. The layout
   reflows as selection moves — a much more aggressive transition than a track
   indicator.

**Where the tab row sits — and this is the more actionable finding.** Three of the
strongest examples do **not** put the control above the heading. They **float it
over the bottom edge of the media**:

- **Poly** —
  [view modes](https://mobbin.com/sites/sections/954077a6-b1a9-4625-8e1f-5e0d6fc7783d).
  A dark three-item segmented pill (`Discover` / `Showcase` / `Features`) with
  small icon glyphs, floating over the lower portion of the device shot, active
  item outlined in accent.
- **Sunday** —
  [designed for real use](https://mobbin.com/sites/sections/e8714fa3-9716-45f1-80a8-ec75f10465c1).
  A white segmented pill (`Features` / `360°` / `Anatomy`) floating at the bottom
  edge of the media card, active in a darker inner pill.
- **MOUTHWASH Studio** —
  [case study](https://mobbin.com/sites/sections/f1dc0b80-5422-410e-86fd-0d64a1b998e5).
  Same device (`Cell` / `Module` / `Battery`) on a product image.

The consequence: **the control is adjacent to the thing that changes.** When the
tabs sit far above the panel, a switch reads as two separate events — control
here, change there — which is a large part of what "jumpy" describes.

### The pattern

- **The indicator and the content are two separate animations, and only one of
  them should be fast.** The indicator (pill/underline/colour) is a small,
  positional change and reads as responsive when it is quick. The content is a
  large change and reads as violent at the same speed.
- **Height is the real culprit.** None of the observed panels change size between
  tabs — Poly, Sunday, Zipline and MOUTHWASH all switch content inside a
  fixed-size media frame. A tab switch that also reflows the container height
  produces the specific "jumpy" quality, because the elements *below* the panel
  move too.
- **Proximity reduces perceived abruptness.** Control docked to the panel, not
  floating above the section.

### Recommendation for UIL4B

`HomeWorkbench` has five tabs (palette, gradient, image, icon, typography) whose
panels almost certainly differ in natural height — a gradient panel with two
colour inputs and an angle slider is not the same height as a type-scale panel
with four computed rows. That height jump is my primary suspect for "jumpy", and
it is testable without any design work.

1. **Give the workbench panel a fixed minimum height equal to the tallest tab.**
   Every observed example switches inside a fixed frame. If the container stops
   resizing, the page below stops moving, and most of the "jumpy" complaint
   likely resolves on its own. This is the first thing to try.
2. **Separate the two animations.** Indicator on `--dur-2`; content cross-fade on
   `--dur-3`. Both tokens already exist in `css-conventions.md` and
   `design-language-v2.md` maps `.2s` and `.3s` onto them, so this needs no new
   values and introduces no raw literals.
3. **Cross-fade the content rather than cutting it**, with the outgoing panel
   fading before the incoming one arrives, not simultaneously — Anchor's staged
   frame (Topic 7) is the closest observed support for staggering rather than
   simultaneity.
4. **Consider docking the tablist to the panel.** V2 already gives the sticky demo
   panel browser chrome (three `--line` dots + mono label); the tabs could live in
   that chrome bar, which is exactly the Resend/Browserbase code-panel treatment
   from Topic 4 and puts the control on the thing it controls.
5. **Do not adopt Ada's expanding-pill treatment.** It reflows the layout on every
   selection, which is the opposite of the requested fix.
6. **Keep pills.** V2 permits no other button shape, and Zipline/Poly/Sunday all
   use pill segmented controls anyway.

**Confidence:** `observed` for all four indicator styles and all three
floating-control placements. `inferred` for "height change is the likely cause of
jumpiness" — grounded in the observation that no reference panel resizes, but not
verified against our own component. `judgement` for the specific duration pairing;
**Mobbin provided no timing evidence whatsoever and none should be attributed to
it.** The height hypothesis should be verified in the running app before any
motion values are changed.

---

## Topic 9 — Search field typing animation

**Founder:** a search bar that types a query, pauses, backspaces, types another.

### What Mobbin covered — and what it did not

**The second weak topic.** Mobbin cannot show a typing animation; it can only show
the *states such an animation passes through*. That turns out to be more useful
than it sounds, because the design question — "what does the field look like
mid-demo, and how do you keep it from looking like a broken input" — is a
state question.

Mobbin returned **no capture that is identifiably a typing animation**. What it
returned is the family of "hero search field with a sample query", which is the
static equivalent, plus the surrounding affordances that make a demo field
readable as a demo.

### What Mobbin shows

- **mymind** —
  [associative searching](https://mobbin.com/sites/sections/191d027d-69c2-4609-b3b6-60e57d42521e).
  The most sophisticated treatment found. A wide search field where the query
  `white marble` is set in a **large italic serif, much bigger than an input's
  normal type size**, with two removable filter chips (`last week ×`, `black ×`)
  sitting inside the field to the left of the query, and a magnifier at the right.
  Because the query is typeset as *content* rather than as input text, it reads as
  a demonstration and not as a text field someone left dirty. Above it, body copy
  that itself uses colour to mark the phrase being demonstrated ("search for the
  first thing that comes to mind").
- **ClickUp** —
  [get the answer](https://mobbin.com/sites/sections/7c24c474-7b8e-4c0a-a8be-b3588c67233f).
  A pill input pre-filled with `How do I set up automations?` in a **muted
  purple-grey**, a `Find my answer` dark button beside it, and a reassurance line
  underneath ("You'll see step-by-step ClickUp guidance pulled from our help
  center. No email required."). The muted colour is what signals "example, not
  your text".
- **Copy.ai** —
  [hero](https://mobbin.com/sites/sections/c646a2dd-b699-44fc-a414-9a9a8b908cc2).
  The input is rendered **focused** — accent border, visible caret in the
  placeholder — with an **open suggestion list beneath it** showing four sample
  queries (`about us`, `business plan`, `cart abandonment email`, `character bio`).
  The dropdown is the demo; the typing is implied.
- **Campsite** —
  [find everything](https://mobbin.com/sites/sections/e4547810-67d9-46bc-b103-77bb719fe9a6).
  A command-palette card floating on the page: a scope chip (`Home`) above a
  `Type a command or search…` placeholder, then three scoped rows
  (`Search projects…`, `Search people…`, `Search tags…`) with the first row
  highlighted as if arrow-keyed to.
- **Airbnb Resource Center** —
  [search](https://mobbin.com/sites/sections/04ec26fb-062e-4210-815d-08ef23fa0888).
  Search field plus a row of five topic chips beneath (`Pricing`, `Reviews`,
  `Superhost`, `Calendar`, `Airbnb policies`) — the static, clickable alternative
  to cycling queries.
- **Dovetail** —
  [find answers](https://mobbin.com/sites/sections/69a19630-a544-40ab-804f-c4c28f6fe9f7).
  Sample query in the field *and* the result state below it (`✦ Generating a
  summary`, then a row of result cards). The demo includes the payoff.

### The pattern

Every observed example makes the sample query **visually distinct from user
input** — muted colour (ClickUp), oversized non-input typography (mymind), or by
living in a dropdown rather than the field (Copy.ai). None of them render a fake
query in the same style as real typed text, because that produces a field the
visitor tries to clear.

And several show the **payoff**, not just the query — Copy.ai's suggestion list,
Dovetail's generating state, Campsite's scoped rows. A typing animation that types
into a void demonstrates a text field; one that types and then reveals results
demonstrates a product.

### Recommendation for UIL4B

`HomeCommandBar` already exists, already searches the real registry via
`queryCommandIndex`, and V2 specifies its anatomy (mono `>` prompt, borderless
input, `⌘K` keycap pill, `--shadow-cmd`, results panel of
`[glyph | title + body | category pill]` rows, quick-fill chips beneath).

1. **Animate the placeholder, never the value.** Cycling `placeholder` leaves the
   input genuinely empty, so the first keystroke replaces nothing and nothing has
   to be cleared. Cycling `value` creates a field the visitor must delete before
   using — the failure every observed example designs around.
2. **Stop on first interaction, permanently.** On `focus`, `input`, or any
   keypress, freeze the cycle for the session. The precedent is already in
   `Home.jsx`: `pinnedRef` stops scroll from overriding a user's manual tab choice
   because "nothing is more irritating than a control that keeps changing back."
   Same principle, same page.
3. **Accessibility is the part most implementations get wrong.**
   - Guard behind `prefers-reduced-motion` and show one static example query
     instead — `useHomeMotion()` already establishes this guard as the house rule.
   - The cycling text must not be announced. A placeholder that changes every few
     seconds inside a labelled combobox is a screen-reader interruption; the input
     needs a stable accessible name that does not come from the animating string.
   - Never put the cycling text where it would be read as the field's value.
4. **Type queries that are also the product's taxonomy.** The strongest version
   cycles real tool categories — the same strings the quick-fill chips use — so
   the animation is teaching the search vocabulary rather than being decorative.
   This is Airbnb's chip row expressed as motion.
5. **Consider the payoff.** Copy.ai and Dovetail both show a result state.
   Rendering the real results panel for the first cycled query — using the real
   `queryCommandIndex`, so it can never be fake — would make this the most
   convincing element on the page. This is an upgrade, not a requirement, and it
   costs a real render on load.
6. **Keep it slow.** No evidence backs any specific timing. But the pattern's
   whole risk is looking gimmicky, and a fast type-backspace-retype loop in the
   visitor's peripheral vision while they read the headline is the gimmicky
   version.

**Confidence:** `observed` for all six sample-query treatments cited. `inferred`
for "sample queries are always visually distinct from user input" — consistent
across all six but a small sample. `judgement` for the entire animation
specification: placeholder-not-value, stop-on-interaction, and pacing. **Mobbin
returned nothing that is a typing animation, and no timing here is
evidence-backed.** The accessibility requirements are house rules from
`murphys-law.md` and `useHomeMotion()`, not Mobbin findings.

---

## Topic 10 — Mobile patterns for tool-heavy UIs

**Brief:** how do design/creative tools handle dense control panels on phone and
tablet? Feeds a separate responsive audit.

### What Mobbin shows

Excellent coverage — this is the topic Mobbin is built for. A consistent
architecture appears across every serious creative tool captured.

**The canonical structure — canvas above, control drawer below.**

- **Spotify** —
  [create cover art](https://mobbin.com/screens/a10af09d-6ee0-4d3b-953d-ca6b55c17841).
  The clearest single example of a dense panel on a phone. Top ~55% is the live
  canvas. Bottom ~45% is a dark control drawer containing, in order:
  1. **Tabs inside the drawer** (`Mask` | `Effects`) with an underline indicator;
  2. a **horizontally scrolling row of option tiles** (`None`, `Radial blur`,
     `Fish-eye`, `Repeater`) — square, iconic, the active one inverted to white;
  3. **two labelled sliders, each with a numeric readout in a fixed column at the
     right** (`5`, `40`) and a small glyph at the left.
  Over the canvas floats a **contextual toolbar pill** (image / align / order /
  delete) attached to the selected object, plus a separate `Add Image +` pill.
- **Play** — [property inspector](https://mobbin.com/screens/e2228a8f-fd11-46e6-8321-76e7f46a608d).
  A bottom sheet titled `Glass` with a grab handle and an `×`. Below it, **one
  property per row**, each row label-left / control-right: a toggle, a value
  (`Regular`), a swatch strip, and a three-way segmented control (A / sun / moon).
  Dense but scannable because every row has the same skeleton.
- **Canva** — [colour picker](https://mobbin.com/screens/41a12697-be71-4090-8018-b9c20285addd).
  **Stacked sheets**: the `Colors` panel sits behind, and an `Untitled color`
  sheet slides in front of it with its own back arrow, delete, and rename affordance
  — so drilling into a sub-editor never loses the parent context. Inside:
  `Solid color` | `Gradient` tabs, a 2D spectrum, a hue slider, and a hex field
  with an eyedropper button.
- **Squarespace** — [edit palette](https://mobbin.com/screens/30f6998c-36ca-4505-bc77-6173d63e34fa).
  Full-height sheet with a breadcrumb (`Site Styles / Colors`), a **row of five
  palette swatches where the selected one carries a ring**, a large 2D picker, a
  hue slider, and — the detail worth stealing — a **`Hex ▾` format selector
  immediately left of the value field**, so the user switches notation without
  leaving the row. Below: `Presets` | `From Image` | `From Color` tabs.
- **The iOS system colour sheet**, captured across
  **Apple Notes** ([sliders](https://mobbin.com/screens/63d95cf0-0452-451f-aa1c-0a5c2654c4c4)),
  **Freeform** ([sliders](https://mobbin.com/screens/19bcec9c-e379-46b1-91d5-2150347a92b3)),
  **Apple Photos** ([markup](https://mobbin.com/screens/65a4497c-a853-456c-b19f-1cfcee0656d3)),
  **Tiimo** ([visuals](https://mobbin.com/screens/b7d1f354-f8cb-466b-aa66-a87e0776ad07)) and
  **yope** ([spectrum](https://mobbin.com/screens/295dd66d-022c-4d2d-98e2-386a05e1bc6d)).
  Consistent anatomy: a `Grid` | `Spectrum` | `Sliders` segmented control at the
  top; **every slider has an editable numeric text field pinned at its right**;
  the hex row is **labelled with its colour space** (`sRGB Hex Colour #`,
  `Display P3 Hex Color #`) rather than just `Hex`; a recents strip with a `+`
  sits at the bottom. Note the colour-space label — a design tool that says which
  space its hex is in is doing something most web tools skip.
- **Photoroom** — [text colour](https://mobbin.com/screens/c7b6819f-cc9d-4ecc-8808-130681ed3095).
  A sheet split into a `SUGGESTED` row (context-derived colours from the image)
  above a `STANDARD COLORS` grid of circular swatches, with an eyedropper. Six
  columns of circles is a lot of targets in a small space and it still works
  because they are grouped and labelled.
- **Linktree** — [style panel](https://mobbin.com/screens/3a795edb-c8ae-4277-9fe1-cd7fa67d8515).
  Sheet with `Text` | `Buttons` | `Colors` tabs, a **horizontally scrolling row of
  style previews** (`Fill`, `Glass`, …) where the active carries a dark outline,
  and a slider with **named endpoints** (`Square` ←→ `Round`) rather than numbers.

**The floating-toolbar family — for canvases that must stay full-bleed.**

- **Craft** — [canvas](https://mobbin.com/screens/d538c846-25d2-4ca6-b801-fe62b00f10fe).
  Two stacked floating pill bars docked above the home indicator: an upper
  **properties** bar (`L`, `Script`, align, shape, grid — each with a tiny
  chevron indicating a popover) and a lower **tools** bar (hand, cursor, shape,
  note, more) ending in a colour-wheel button. Top-right carries a compact
  `100% | undo | redo | pen` cluster. Nothing overlays the drawing area itself.
- **Apple Notes / Apple Mail / stoic.**
  ([Notes](https://mobbin.com/screens/83057132-c8b4-4079-a4c9-9cf8baffad03),
  [Mail](https://mobbin.com/screens/cc94f4c6-cfb6-4473-8d25-f0f6a4bfbccb),
  [stoic.](https://mobbin.com/screens/61126eae-5ed2-4d4a-a511-82f2e5c884a5))
  A horizontally scrolling tool rail of realistic pen/marker objects at the bottom
  edge, with the selected tool **physically raised out of the rail**, plus a
  colour well and `+`. Selection is communicated by position, not by a highlight.
- **Evernote** — [sketch](https://mobbin.com/screens/866d750f-16ce-4ff4-937d-9dc196b88433).
  Same rail, and the active pen carries **both** a blue underline and a small
  numeric badge (`02`) showing its size — state and setting in one 44px target.
- **Freeform** — [contextual bar](https://mobbin.com/screens/b5b4dd40-ecd4-4c5a-aee2-f441a5d02e15).
  Actions for the *selected object* appear in a bar at the bottom
  (image, crop, hide, duplicate, delete, more) — object actions and tool actions
  are kept in separate places.
- **Canva** — [animate sheet](https://mobbin.com/screens/570321fe-c277-46c2-a54d-7497bf3861cf).
  Top app bar reduced to icons only (menu, undo, redo, more, duplicate, comment,
  download, share); everything else is in the sheet.

### The pattern

Six rules, each observed in at least three apps:

1. **The canvas never leaves the screen.** Controls occupy the bottom half or
   float; they never replace the artefact. The user must see the effect of the
   control they are touching.
2. **Bottom sheet, with a grab handle and an explicit close.** Universal.
3. **Tabs live *inside* the sheet**, not in the page chrome — Spotify, Canva,
   Linktree, Squarespace and the iOS system sheet all put the segmented control at
   the top of the sheet.
4. **Horizontal scrolling for option sets, vertical for property rows.** Options
   (styles, effects, presets, tools) scroll sideways in a rail; properties stack
   vertically as label-left/control-right rows. The two are never mixed.
5. **Every slider gets a numeric readout, and it is editable.** Apple's sheets,
   Spotify, Freeform, Tiimo. On a phone a slider alone cannot hit a precise value,
   so the number is the real input and the slider is the coarse one.
6. **Object actions and tool actions live in different places.** Freeform, Spotify
   and Craft all float a contextual bar for the selection while keeping the tool
   rail docked.

**Tablet:** Mobbin's iOS captures in this sample are overwhelmingly phone-sized,
so I have **no direct tablet evidence** here. The Craft and Freeform floating-bar
patterns are the ones that scale up naturally (a floating bar can become a docked
side rail without restructuring), but that is reasoning, not evidence.

### Recommendation for UIL4B

`HomeWorkbench` is 1,068 lines across five tabs with a tablist, and each tab
carries its own dense controls — colour ramps with lock toggles, gradient stops
plus an angle, resolution/format/compression, icon size plus stroke width, base
size plus ratio. On a phone that is a lot of control per square inch.

1. **Adopt the canvas-above / controls-below split for every tool page.** The
   output (ramp, gradient, specimen, icon preview) pins to the top; the controls
   scroll beneath. This is the single structural decision that makes the rest
   fall out, and it matches every reference.
2. **Move the workbench tablist inside the panel on small screens.** Spotify,
   Canva and Linktree all put the segmented control at the top of the sheet.
   This also dovetails with the Topic 8 recommendation to dock the tablist to the
   panel chrome — one change serves both.
3. **Give every numeric control a readout, and make it editable.** Angle, base
   size, ratio, stroke width, compression. This is the most consistently observed
   detail in the whole topic and is likely the largest concrete gap between our
   mobile experience and the references.
4. **Split option rails from property rows.** Icon sizes and stroke widths are
   *options* → horizontal rail. Base size and ratio are *properties* → stacked
   rows. Do not put both in the same vertical stack.
5. **Steal the colour-space label.** The iOS sheet writes `sRGB Hex Colour #`,
   not `Hex`. For a product whose entire pitch is defensible colour systems —
   with an M3 method documented in `color-system-m3.md` — naming the space is
   both more correct and a credibility signal.
6. **Steal Squarespace's inline format selector.** A `Hex ▾` dropdown beside the
   value field, switching HEX / RGB / HSL / OKLCH in place, is a better mobile
   affordance than a separate mode and reinforces the Topic 4 export story.
7. **Use stacked sheets for drill-down, not navigation.** Canva's parent-sheet
   -behind-child-sheet keeps the context visible. Navigating to a new route to
   edit one colour loses the system the user is building.
8. **Tablet remains unvalidated.** Treat the floating-bar patterns as the
   starting hypothesis for the responsive audit and verify against real captures
   before committing.

**Confidence:** `observed` for all sixteen cited screens and all six rules.
`inferred` for the mapping of those rules onto `HomeWorkbench`'s five modes.
`judgement` for the sheet-vs-route recommendation. **Tablet is `judgement` only —
Mobbin returned no tablet-sized captures in this sample and nothing about tablet
here should be treated as evidenced.**

---

## Coverage summary — where Mobbin earned its keep and where it did not

| # | Topic | Mobbin coverage | Strongest single reference |
|---|---|---|---|
| 1 | Section eyebrow numbering | **Strong** — four distinct sequence strategies, plus direct corroboration of our bracketed eyebrow | Daydream `01 / 04`; Grok `[ PRODUCTS ]` |
| 2 | Community gallery | **Strong** — including three hover→preview flows | Lovable *From the Community* |
| 3 | Tool catalogue | **Strong** — a clean success/failure split | Mural expanding rail; Patreon as the anti-pattern |
| 4 | Export showcase | **Strongest topic** — a mature, well-solved pattern | Resend; Sketch's colour-token export |
| 5 | Learn surface | **Good** for destination pages, **thin** for homepage strips (one example) | Sketch *Guides & Courses*; Figma's two-line strip |
| 6 | Pricing | **Strong** — eight pricing pages, clear consensus mechanics | Current (in-card cadence); Oku (indie tone) |
| 7 | Sticky scroll | **Partial** — layout and inactive-state yes, transition timing no | Mural; Anchor's accidental mid-transition frame |
| 8 | Tab micro-animation | **Weak** — indicator styles and placement yes, **no motion data at all** | Poly / Sunday (control docked to media) |
| 9 | Search typing animation | **Weakest** — no typing animation found; only the static states one would pass through | mymind; ClickUp's muted sample query |
| 10 | Mobile tool-heavy UIs | **Strong** for phone, **absent** for tablet | Spotify *Create cover art*; the iOS system colour sheet |

**The two topics to treat with suspicion are 8 and 9.** Both are motion questions
asked of a stills library. The layout and state findings in them are sound; every
duration, easing curve and pacing statement in them is my judgement and carries no
evidence. Topic 8's height-change hypothesis in particular should be verified
against the running `HomeWorkbench` before any motion values are touched — that is
a five-minute check that would convert a `judgement` into a `measured`.

**Topic 10's tablet half is also unevidenced.** The responsive audit should run its
own Mobbin pass filtered to tablet captures rather than extrapolating from phones.
