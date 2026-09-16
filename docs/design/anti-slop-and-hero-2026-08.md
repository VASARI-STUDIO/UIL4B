# Anti-slop diagnosis and hero redesign — August 2026

> ## Status, 2026-09-10 — **SUPERSEDED RECORD. Kept for its reasoning.**
>
> **Do not build from this file.** Read it to find out *why* something was
> decided, never to find out what the homepage is.
>
> **Its subject never shipped.** This file critiques the homepage "as it will
> be once PR #262 and PR #264 land". #262 merged; **#264 never did and never
> will** — the founder closed it on 2026-09-10 (`PROPOSALS.md` P-012). So the
> page it describes has never existed, and `src/data/homeGallery.js`, which it
> names as a shipped data layer, is not on `main`.
>
> **Its hero recommendation was not taken.** §2.4 recommends *"A UI system that
> survives the handoff."* as Option A. That line was never approved by anyone
> and is now one of the rejected headlines
> `tests/user-sim/56-founder-rejected-headlines.spec.js` walks across every
> route. The headline that shipped on 2026-09-10 is assembled from the
> founder's own two sentences and is pinned by
> `tests/unit/positioning-truth.test.js`.
>
> **Why it is not deleted.** §2.12 is the cited evidence line for **P-008,
> P-009 and P-010**, three founder verdicts still open in `PROPOSALS.md`.
> Deleting this file would leave three proposals citing nothing. Delete it in
> the same commit that closes the last of them — and `docs/research/
> homepage-patterns-2026-08.md` goes with it, as its only remaining consumer.
>
> **`PROPOSALS.md` is local-only since 2026-09-16** — the founder keeps the
> unreleased roadmap off a public repository, and `.gitignore` records it. So
> the three verdicts this file is being held for cannot be checked from a clone.
> That is a reason to leave the file alone, not a reason to assume they closed.
>
> **What is authoritative instead:** the live copy is `src/data/positioning.js`
> and the surfaces that read it; the vocabulary is
> `.claude/skills/uil4b-brand-design/references/anti-slop-quality-bar.md`; the
> anti-slop work that actually shipped is the 2026-09-09 pass recorded in
> `src/data/pipeline.js` under `anti-slop-audit-2026-09-09`.

> **The brief.** The founder was told of the live site: *"it instantly looks
> like AI built it."* This file names what produces that reaction, line by line,
> and specifies a hero that would not.
>
> **What this file critiques.** The homepage **as it will be once PR #262 and
> PR #264 land**, not as it is today. Both diffs were read in full. Copy that
> #264 already replaces is not criticised here; copy #264 leaves alone is fair
> game and most of the hero is in that category — **#264 does not touch the hero
> at all**, and #262 touches only the mark's clip, the sub-line's top margin and
> the chip row's alignment.
>
> **Evidence classes**, same convention as
> `docs/design/homepage-spec-2026-08.md`: `measured` (a number run here) ·
> `observed` (seen in a cited Mobbin capture) · `inferred` (reasoned from
> observed evidence) · `judgement` (design opinion, no evidence). Every Mobbin
> claim carries its app and its link. **Mobbin is a stills library — it is
> silent on motion, timing and easing.** Every duration in Part 2 is
> `judgement` and is labelled as such.
>
> **What this file does not decide.** No prices. No founder biography, user
> quotes or metrics. No replacement of the V2 design language — Part 2 is a
> redesign of one surface inside the existing token system and inside the fixed
> `--hw-frame` PR #262 introduces.
>
> **New Mobbin evidence.** Twelve captures gathered for this pass, on top of the
> 95 in `docs/research/homepage-patterns-2026-08.md`. This file builds on that
> research and does not repeat it; where a topic is already settled there, it is
> cited rather than re-argued.

---

## Verdict, before the detail

Using the brand skill's scale
(`.claude/skills/uil4b-brand-design/references/anti-slop-quality-bar.md`), the
page splits cleanly in two:

| Region | Verdict | Why |
|---|---|---|
| **The hero — the first screen** | **Under-authored** | Eight centred text blocks on an empty ground. No product artefact in frame. A headline that is the framing `positioning.md` explicitly retired. |
| **Sections 2–8, after #264** | **Distinctive and coherent**, with two residual problems | The gallery renders real artefacts and links inward; the export panel is fed by the shipped exporter; the step rail's route line replaced a decorative ordinal with a fact. This is genuinely good work. The tool grid and the step-title template are the exceptions. |

**The founder's reaction is almost certainly the hero and only the hero.** "It
*instantly* looks like AI built it" is a first-screen judgement, made in under
two seconds, before a word is read. Ten of the thirteen tells below are above
the fold, and the top six are all in the opening viewport. Fixing the hero fixes
most of the reported problem; fixing the tool grid and the step titles closes
the rest.

---

# Part 1 — the diagnosis

## The ranked table

Ranked by contribution to the *instant* reaction. Above-the-fold items are
weighted heavily, because that is where the judgement is made.

| # | Tell | Where | Why it reads as AI | Fix direction |
|---|---|---|---|---|
| 1 | **The headline is the exact framing the positioning doc retired** | `Home.jsx:222–225` — "Every design tool, / one `search box` away." | `positioning.md` §"Why the shift" names *"every design tool in one place"* as the old framing that **"sells a grab-bag of tools"** and undersells the product. The hero says it anyway. It is also an unbackable superlative: "Every" against 13 live tools, three of six categories partly unbuilt, and a stat line two lines above that says `13 LIVE TOOLS`. A quantifier the page's own data contradicts is the single loudest generated-copy signal. | Replace. Two options in Part 2 §2.4. |
| 2 | **The first screen contains no product artefact** | The whole hero. The only object with edges is an empty text input. | Every comparable hero in the sample puts a real, specific artefact in the opening frame — Firecrawl hangs a wireframe and a JSON result under the field; Antimetal dims a command panel with real suggested queries; Vizcom staggers three product panels; Vercel lays out eight labelled topic tiles; Craft prints a chip grid on a coloured band. Ours has a faint grid texture and nothing else, because the workbench is deliberately (and correctly) below the fold. A hero made entirely of type and one empty input is the default output shape. | Put one real, generated artefact in the frame. Part 2 §2.5. |
| 3 | **The stat line is four items of four different kinds, two of them borrowed** | `Home.jsx:42–47` → `13 LIVE TOOLS · 200K ICONS · 1,500+ FONTS · ONE WORKSPACE` | `13` is ours and honest. `200K ICONS` is the Iconify catalogue and `1,500+ FONTS` is the Google Fonts catalogue — other people's inventory, printed as if they were our achievements. `ONE WORKSPACE` is not a number at all. Four items, four units, one of them a word. It has the *form* of a proof strip with proof in only one slot — and putting `13` next to `200K` makes our real number look small. | Cut to what is ours, and give every number a unit label. Part 2 §2.6. |
| 4 | **The scarcest emphasis in the system is spent on a piece of UI furniture** | `Home.jsx:224` — `<mark className="home-mark">search box</mark>` | `design-language-v2.md` calls `--hi` a marker pen with a budget of one per viewport: *"spend it on the single most important thing on screen."* It is spent on the words "search box", and the literal search box is 200px below it. The mark is therefore redundant with the object it names. | Move the mark onto the claim a reader would not guess. Part 2 §2.4. |
| 5 | **The decorative grid references nothing** | `global.css:5302–5306` — `.home::before`, 48×48px lines at 4% ink, 46% opacity, 760px tall | It is not the product's grid. It does not register with the 1216px content measure. It carries no ticks, no labels, no units, and nothing sits on it. Firecrawl runs the same device but hangs mono corner ticks off it naming the artefacts (`[ .JSON ]`, `[ HD ]`) and puts a wireframe on its lines. Ours is texture chosen for texture — the anti-slop bar's "decoration that references nothing", and it is the literal ground of the first screen. | Either make it measure something or reduce it to a page edge. Part 2 §2.7. |
| 6 | **`ONE WORKSPACE` breaks the project's own naming rule, and after #264 contradicts the screen below it** | `Home.jsx:46` vs the `[ CREATE ]` eyebrow one section down | `CLAUDE.md`: *"'Workspace' survives only as an internal code name… Don't reintroduce it in UI copy."* #264 correctly changed the section eyebrow from `[ THE WORKSPACE ]` to `[ CREATE ]` but did not touch the hero. A visitor scrolls one screen and reads two different names for the same surface. Inconsistent product nomenclature across adjacent screens is one of the most reliable tells that copy was generated section by section. | Delete the item. Part 2 §2.6. Same call as spec §14 open decision 4, now half-resolved by #264. |
| 7 | **The sub-line names an inventory and invents a specific** | `Home.jsx:228–231` | *"Type what you need — colour, type, icons, tokens — and start working"* is four nouns where a consequence belongs (anti-slop bar: "copy that names an inventory"). And *"twelve bookmarked tabs"* is a manufactured specific — a precise-sounding number about the reader that nothing supports. `growth-persuasion.md` bans invented metrics; a rhetorical twelve reads the same way to a sceptical visitor. | Rewrite around what the reader walks away with. Part 2 §2.4. |
| 8 | **The page reassures about payment three times** | Hero hint `Home.jsx:246` · pricing lede `Home.jsx:471` · `SystemCTA` hint `Home.jsx:518` | "No credit card · No setup · Your first system stays free" / "no card and no trial clock" / "No credit card · Upgrade only when you're ready". Plus "Nothing to install" in the sub-line and "free" in the CTA label. Five reassurances, three of them the same reassurance. Repeated risk reversal reads as anxiety, and stacked defensive copy is characteristic of generated marketing pages. `growth-persuasion.md` places risk reversal *next to the ask*; it is currently everywhere. | Keep it once, at the ask. Part 2 §2.6 removes the hero's copy of it. |
| 9 | **Five step titles built from one sentence template** | `Home.jsx:53–105`, `STEPS[].title` | "Start with a palette you can defend." · "Tune a gradient and take the CSS." · "Decide the output before you convert." · "Size and weight an icon before you commit." · "Build a scale that actually computes." Five imperatives; four are *verb + object + qualifying clause*. Individually each is good. Read as a block — which is how the sticky rail presents them — they scan as five fills of one template. Nobody has flagged this and it survives #264 untouched. | Break the pattern on at least two. Out of scope for Part 2 (below the fold); logged in §1.5 as a follow-up. |
| 10 | **Six tool cards of identical weight, one of which is entirely unbuilt** | `Home.jsx:332–394`, `.htools-grid`, `global.css:5511` | The Colour group has five live tools; the Component group has three, **all** `soon: true`. Both render as the same 26px card with the same bordered 38px glyph tile, the same title size and the same nested pill list. Symmetry overriding truth is on the founder's own tell list. #264 fixed the *heading* ("A value you set in one tool is set in all of them.") and left the cards. Research Topic 3's diagnosis — the nested route list makes it Patreon's directory dump — therefore still stands after #264. | Not in this spec's scope; research Topic 3 §"Recommendation" 1–2 is still the right fix. Logged in §1.5. |
| 11 | **A bordered line-art glyph stands in for output, on a product that generates output** | `Home.jsx:336–340`, `.htool-glyph` | Six categories, six abstract glyphs in six identical tiles. Colour renders real ramps three sections down, and Export renders real token files two sections down — the page proves it can show its own artefacts and then chooses an icon here. Anti-slop bar: "icons or abstract shapes fill space without strengthening recognition." | As above — research Topic 3 recommendation 2. Logged in §1.5. |
| 12 | **Six bracketed mono eyebrows on one page, and one of them is shaped differently** | `[ CREATE ]` `[ THE TOOLSET ]` `[ DISCOVER ]` `[ EXPORT ]` `[ LEARN ]` `[ PRICING ]` | The device itself is corroborated — Grok ([products](https://mobbin.com/sites/sections/af82f082-c333-48b4-8601-ca330ec1b109)) and BitcoinOS ([article](https://mobbin.com/sites/sections/744a8baf-ae51-43ce-916d-7ac79130e96d)) both use it, and research Topic 1 says keep it. But **Grok uses it once**. Repeated six times down one page it stops being emphasis and becomes wallpaper — and five of the six are bare nouns while `[ THE TOOLSET ]` carries an article, which is exactly the small unevenness that reads as generated. | Drop the article: `[ TOOLSET ]`. One-word change, no design cost. Logged in §1.5. |
| 13 | **The quick-fill chips reprint the placeholder** | `HomeCommandBar.jsx:25` vs `:132` | Placeholder: `Search tools — contrast, gradient, type scale…`. Chips: `contrast · gradient · icons · type scale · convert`. Three of five chips are already printed in the field directly above them. The row is two thirds redundant with its own neighbour. Also `convert` is a verb among four nouns and `type scale` is two words among four single words. | Part 2 §2.6 gives the placeholder a different job from the chips. |

**Not tells — corroborated, leave alone.** Three things that look like tells and
are not, so they are not "fixed" by mistake:

- **The two-pill CTA row.** Filled primary beside a quiet secondary is what
  Firecrawl ([hero](https://mobbin.com/sites/sections/7374e232-3232-4f76-bf3e-a95a4ee73b8a))
  and Browserbase ([hero](https://mobbin.com/sites/sections/8616612a-cd9d-478e-969c-a11502c3d35b))
  both ship. `observed`. Keep the pair.
- **A centred hero.** Firecrawl, Antimetal, Vizcom, Campsite, Vercel, Craft and
  ClickUp all centre. Centring is not the tell. `observed`. **The tell is
  centring with nothing in the frame** — every one of those centres a headline
  over a real artefact.
- **`SystemCTA`'s "From first decision to clean handoff."** The A-to-B
  construction is real editorial practice — Maze ships "From chaos to clarity"
  ([platform hero](https://mobbin.com/sites/sections/3de86c04-135e-4a67-af1a-c9c869778759)).
  `observed`. Leave it.

**What already works — do not undo it.** Worth naming so the founder can see
what the difference looks like in his own product: `LIVE_TOOL_COUNT` derived
from the tool tree so the claim cannot drift; the step rail's `/create/palette`
route line (#264) replacing a decorative ordinal with a fact the reader cannot
otherwise see; the export panel's code coming out of `buildCSSVars` /
`buildTailwindTheme` / `buildStyleGuideHTML` at render time with an honest
truncation line; the gallery's cards all resolving inward with the artefact
pre-loaded; the honesty note moved below the grid so the section no longer opens
on a disclaimer; the `Soon` badges; the `--hi` budget being enforced at all; and
#262's fixed `--hw-frame`, which turned a 451px jump into 0px.

---

## 1.1 The headline, in detail

`Home.jsx:222–225`:

```
Every design tool,
one [search box] away.
```

Three separate problems, stacked.

**It is the retired framing.** `positioning.md` is the single source of truth for
what UIL4B is, and it opens its rationale with this:

> UIL4B was framed as "every design tool in one place"… That framing sells a
> *grab-bag of tools*. It undersells what the product actually does.

The shipped hero is that sentence with a synonym. This is not a taste
disagreement — it is a documented contradiction between the largest text on the
site and the canonical positioning document. It is also, mechanically, why the
hero feels generic: a grab-bag framing has no point of view, and a headline with
no point of view is indistinguishable from a generated one.

**"Every" is a claim the page's own data contradicts.** Thirteen tools are live
(`measured` — `CREATE_GROUPS.flatMap(g => g.tools).filter(t => !t.soon).length`
evaluates to 13). Twenty-three entries across the tool tree are `soon: true`.
The Component category has zero live tools. The stat line prints `13 LIVE TOOLS`
one line above the word "Every". A visitor does not need to audit us; the hero
audits itself.

**"one X away" is a spatial cliché with no referent.** The construction promises
proximity and delivers a metaphor. Compare the headlines in the sample that
name a consequence instead: Retool's "All the ways you work, in one place"
([hero](https://mobbin.com/sites/sections/dcbd55be-58cb-4e0e-9b70-cb4d184fa30a))
earns the same claim by putting the unified surface directly underneath it;
Firecrawl's "Power AI agents with **clean web data**"
([hero](https://mobbin.com/sites/sections/7374e232-3232-4f76-bf3e-a95a4ee73b8a))
names the deliverable in the second line and colours exactly that phrase.
`observed`.

## 1.2 The empty frame, in detail

The hero's opening viewport, in order, is: stat line · headline · sub-line ·
command bar · chip row · two pills · fine print. Seven text blocks and one empty
input, centred on one axis, over a faint grid.

The `tests/user-sim/10-home-chaos-to-calm.spec.js` fold test is right and must
stay — the workbench belongs below the fold, and the primary CTA belongs above
it. But the consequence, unaddressed, is that **a product whose entire pitch is
that it generates things shows a visitor nothing it has generated until they
scroll.** And the first generated thing they then meet — the workbench palette
panel — is produced by `Math.random()` (`HomeWorkbench.jsx:138–147`), so it is
different on every load and could not be shown in the hero as-is without a
prerender/hydration mismatch. Part 2 §2.5 solves both at once.

What the references put in that space:

- **Firecrawl** ([hero](https://mobbin.com/sites/sections/7374e232-3232-4f76-bf3e-a95a4ee73b8a))
  — the closest analogue to our hero anywhere in either research pass. A small
  announcement pill; a two-line headline whose second line is in the brand
  orange; a sub-line carrying a **marker-pen highlight on one phrase**
  (`It's also open source.`); then a real URL field with **mode tabs inside the
  field itself** (`Search · Scrape · Map · Crawl`, active `Crawl`) and an orange
  submit arrow; and directly beneath, **the output**: a wireframe of the crawled
  page with mono labels (`H1 Title`, `Logo`, `Navigation`, `Button`) beside a
  JSON panel showing the returned object, with a `Scraping…` status pill. The
  whole hero is input → instrument → result, in one screen. `observed`.
- **Ramp** ([business account hero](https://mobbin.com/sites/sections/4c3bb2de-4b4d-41b6-90d5-8a273bd30011))
  — the hero's decoration **is a computation**. Headline, short dek, then an
  enormous blue `$100,000` with a small `/Year` hung off it, a comparison line
  (`vs. national average (0.07%) = $3,500`), and a **single slider labelled
  `Balance` with a `5M` value bubble** driving the number. One control, one
  generated figure, no ornament at all. `observed`.
- **Claude Type** ([Romie specimen](https://mobbin.com/sites/sections/87c2dd71-75a5-4bf1-8d12-86e29d509e35))
  — a foundry whose hero is the typeface itself set at display size, with a tiny
  green `12 Styles` pill above it and a green `Buy Romie` pill below. The
  product's own output is the entire composition. `observed`.
- **Antimetal** ([hero](https://mobbin.com/sites/sections/a8eb47a5-9254-4e58-bdc9-ab44b8259ae5))
  — a command field rendered at **reduced opacity** with real suggested queries
  and their meta (`How is DNS configured? · Most popular`), so the panel reads
  unmistakably as a demonstration rather than as a live control someone left
  dirty. `observed`. This is the same signal ClickUp gets from its muted sample
  query (research Topic 9) and it is directly reusable.

## 1.3 The stat line, in detail

`13 LIVE TOOLS · 200K ICONS · 1,500+ FONTS · ONE WORKSPACE`

The code comment above `HERO_STATS` is scrupulous — it explains that 200k is the
Iconify catalogue and 1,500+ is the Google Fonts catalogue, both real libraries
the tools read. The honesty is in the source file. **It is not on the page.** A
visitor reads four uppercase mono claims in a row and attributes all four to us.

Two references show what a stat strip looks like when it is authored:

- **TinyWins** ([hero](https://mobbin.com/sites/sections/eb379572-6bc5-4f91-8ad9-ef6a2ff09f11))
  — three stats on one hairline-separated row at the foot of the hero, and every
  one is a **complete phrase with a subject**: "357% average client value
  growth" · "7 unicorns and counting" · "$10B+ raised by TinyWins portfolio
  companies". Nothing is a bare noun. `observed`.
- **Voiceflow** ([context engine](https://mobbin.com/sites/sections/55a5e8f2-1e4b-4641-ad6d-52e0d15e62e9))
  — three stats, each a **large numeral above a small unit label**, separated by
  hairline vertical rules: `430ms / Latency for voice`, `258k / messages per
  minute`, `9K+ / live agents in production`. The number is a display element;
  the label says what it counts. `observed`.

Both do the thing ours does not: **every number states what it is a number of,
and whose it is.** `inferred` — consistent across both, and the rule explains
the failure exactly.

## 1.4 The highlight, in detail

`--hi` (`#E9FF64`) appears exactly four times in the whole design language: the
hero mark, the `AAA` contrast badge, the Pro pricing row, and `::selection`.
`design-language-v2.md` sets the budget at one per viewport and says to spend it
on the single most important thing on screen.

It is currently on the words **"search box"** — the name of a control that is
rendered, literally, 200px below it. The mark is pointing at something already
visible, which is the "decoration that references nothing" failure in its
subtlest form: it references something, but something that needs no reference.

Firecrawl spends its equivalent marker on `It's also open source.` — the one
claim in the sub-line a reader would not otherwise guess. `observed`. Sketch
spends its inverted black mono box on `Inside Sketch:` — a category label set
inline before the roman title
([feature card](https://mobbin.com/sites/sections/0aa61d33-7cfb-43eb-b005-55c4718fb1f5)).
`observed`. In both cases the marker carries information; in ours it carries a
noun.

## 1.5 Below the fold — the three residual items, and what to do about them

Out of Part 2's scope (this is a hero redesign) but they should not be lost:

1. **The tool cards** (tells 10 and 11). Research Topic 3's recommendations 1
   and 2 are still exactly right after #264: cut the nested route lists off the
   card face, and replace the abstract glyph with a small static render of the
   category's real output — a five-step ramp for Colour, a specimen for Type, a
   3×3 set for Icons. The page already proves it can do this in two other
   sections. `observed` (ElevenLabs
   [creative suite](https://mobbin.com/sites/sections/096778a1-7d16-4119-8b49-6db127275d74)
   puts a screenshot of each tool in use inside its own card).
2. **The five step titles** (tell 9). Break the template on at least two of the
   five so the block does not scan as one sentence repeated. Cheapest honest
   variants: make one a plain statement of fact and one a consequence rather
   than an instruction.
3. **`[ THE TOOLSET ]` → `[ TOOLSET ]`** (tell 12). One word, no design cost,
   and it makes the six eyebrows one consistent set.

---

## 1.6 The hero audited against real products, element by element

| Our element | What we ship | What the sample ships | Verdict |
|---|---|---|---|
| **Eyebrow** | none | Firecrawl: an announcement pill with a `▶` (`2 Months Free — Annually`). Antimetal: a small orange square glyph + `Get answers`. Maze: a bordered pill `▪ THE MAZE PLATFORM`. Claude Type: a green `12 Styles` pill. `observed` | **Gap.** Every strong hero in the sample opens with a small labelled object; ours opens with a row of uppercase claims. Part 2 §2.6 converts the stat line into one. |
| **Headline construction** | Quantifier + spatial cliché, centred, two lines, one word marked | Retool: consequence, left-aligned two lines. Firecrawl: consequence, second line in brand colour. Figma: a flat declarative sentence on a full-bleed yellow field ([creative tools](https://mobbin.com/sites/sections/5f84e90e-f4ae-48e5-bdb0-9b0b9b303f03)). V7: the headline itself is typed into, with a live caret ([hero](https://mobbin.com/sites/sections/26660d92-77ce-470d-a481-fa9873bd1b3e)). `observed` | **Fail** on construction (tell 1); the two-line centred form is fine and stays. |
| **Stat line** | Four items, four units, two borrowed | TinyWins: three complete phrases. Voiceflow: numeral over unit label. `observed` | **Fail** (tell 3). |
| **Search bar** | Real, searches the real index, real `⌘K`, real links, honest empty state | Firecrawl: real field with **mode tabs inside it**. Copy.ai: field rendered focused with an open suggestion list ([hero](https://mobbin.com/sites/sections/c646a2dd-b699-44fc-a414-9a9a8b908cc2)). Campsite: scoped rows under a placeholder ([find everything](https://mobbin.com/sites/sections/e4547810-67d9-46bc-b103-77bb719fe9a6)). Antimetal: dimmed, with query meta. `observed` | **The strongest thing in our hero, and under-used.** It is genuinely real — no fixture list, same `queryCommandIndex` the ⌘K palette uses. What it lacks is any indication that it does anything, which is what spec §2.2's typing overlay addresses. Part 2 keeps that spec item unchanged and adds the payoff it declined. |
| **Chip row** | `TRY` + five queries, now centred by #262 | Airbnb: five topic chips under a centred field ([search](https://mobbin.com/sites/sections/04ec26fb-062e-4210-815d-08ef23fa0888)). Craft: a two-row chip grid on a coloured band ([help hero](https://mobbin.com/sites/sections/1509a6d6-fa2f-4b1e-ba6e-da143d4d7e06)). Vercel: a `Topics` label over an 8-tile icon grid ([resources hero](https://mobbin.com/sites/sections/bfdd6f6e-3296-4d9c-9041-413c0a935926)). `observed` | **Pass on pattern**, fail on content (tell 13 — redundant with the placeholder). |
| **CTA pair** | Accent `ui-pill-lg` + quiet `ui-pill-lg` | Firecrawl and Browserbase both ship exactly this. `observed` | **Pass.** Leave it. |
| **Fine print** | "No credit card · No setup · Your first system stays free" | ClickUp puts its reassurance under the field it applies to ("No email required"). Lyssna and Maze put "No credit card required" under the pricing button. `observed`, research Topic 6 | **Fail on placement** (tell 8) — ours is 400px from the ask and repeated twice more down the page. |
| **Satellites** | none — V2 removed them; the eleven links live in the tool grid | Maze scatters artefacts at varying focus above a bottom-left headline. Vizcom staggers three panels bleeding off both edges ([hero](https://mobbin.com/sites/sections/998ec837-65e9-49f7-84f6-bcd40fbf480e)). `observed` | **Correctly removed. Do not bring them back.** The canonical chaos-to-calm decision in `surface-principles.md` explicitly forbids generalising satellites into a brand rule, and the fold test now depends on the hero being short. |
| **Ground** | 48px grid, 4% ink, unlabelled | Firecrawl: the same grid **with mono corner ticks naming the artefacts**. Browserbase: a dithered halftone landscape. Figma: a flat saturated colour field. `observed` | **Fail** (tell 5). |

---

# Part 2 — the hero specification

> **Written against the tree as it will be once #262, #264 and #266 have all
> landed.** #266 moved every Create tool to `/create/<pagetitle>` with 50
> permanent redirects, so **nothing in this spec types a route literal** — every
> destination is derived, and §2.3.2 names the exact helper for each. #264
> shipped the homepage gallery's data layer (`src/data/homeGallery.js`), and
> this spec **reuses it rather than opening a second path to the same
> artefacts**.

## 2.0 What changes, and what deliberately does not

**Changes.** The hero's stat line is deleted. The headline and sub-line are
rewritten. A fixed-height band of real product output — the **specimen band** —
is added between the chip row and the CTA row. The hero's fine print shrinks to
one line and changes what it says. The page ground's opacity drops one step.

**Does not change.** The V2 token set, the two families, the display scale, the
pill vocabulary, the `--hi` budget, `PillNav`, the CTA pair, `HomeCommandBar`'s
search behaviour and ARIA, the hero's `min-height: min(100svh, 980px)`, the
entrance keyframes, the reduced-motion guard shape at `global.css:5386–5388`,
spec §2.2's typing overlay (adopted unchanged, with one accessibility addition
in §2.8), or anything below the fold.

**`--hw-frame` — read this before building.** The hero does **not** consume
`--hw-frame`. That token is `clamp(420px, calc(100svh - var(--nav-clear) -
var(--s-8)), 640px)`, scoped to `.hsteps-sticky` inside `@media(min-width:981px)`,
and putting a 420–640px object in the hero would push the workbench above the
fold and fail `tests/user-sim/10-home-chaos-to-calm.spec.js`. The hero gets its
own, much shorter fixed reserve, `--hero-specimen`. **The two are the same
idea** — one declared height that content is fitted into, never a height that
content decides — and #262 already proved the idea works. That is what "work
within the fixed workbench frame" means here: same principle, its own value.
Do not promote `--hw-frame` to a page-level token to make the hero read it.

## 2.1 The design logic, in one paragraph

The product makes palettes, gradients, type scales and tokens, and it measures
them. A hero that shows one of those artefacts, the measurement the product took
of it, and the file it becomes, is inherently less generic than any arrangement
of type on a gradient — because no competitor can copy it without building the
product. So the hero's decoration is deleted and replaced with **one real entry
from the shipped palette library, rendered as three facts: the artefact, what we
measured about it, and the CSS it exports as.** It is ruled into the page as a
band, it never changes size, one quiet control steps to the next entry, and one
text link hands the current entry to the Palette Builder with its values already
loaded — the same hand-off the Discover section three screens down performs on
the same data. That is the working mini-workspace `CLAUDE.md` asks for, hoisted
above the fold, at a cost of 96–144 vertical pixels.

## 2.2 Composition and reading order

| # | Element | Change |
|---|---|---|
| 1 | ~~`.home-hero-stats`~~ | **Deleted** (§2.5) |
| 2 | `.home-hero-h1` | New copy (§2.4). Structure, sizes, mark and clip maths unchanged |
| 3 | `.home-hero-sub` | New copy (§2.4). Two lines at the 54ch measure |
| 4 | `HomeCommandBar` | New placeholder (§2.4). Everything else unchanged, including spec §2.2's typing overlay |
| 5 | `.hcmd-chips` | Content change only (§2.4). Centring from #262 stays |
| 6 | **`.home-hero-specimen`** | **New** (§2.3) |
| 7 | `.home-hero-cta` | Unchanged — the pair is corroborated (Part 1, "Not tells") |
| 8 | `.home-hero-hint` | One claim instead of three, and it changes kind (§2.4) |

The hero opens on the headline. Five of the strongest captures in the sample do
the same — Figma
([creative tools](https://mobbin.com/sites/sections/5f84e90e-f4ae-48e5-bdb0-9b0b9b303f03)),
Retool ([hero](https://mobbin.com/sites/sections/dcbd55be-58cb-4e0e-9b70-cb4d184fa30a)),
Descript ([hero](https://mobbin.com/sites/sections/d8d07829-3c7e-4c6e-b7ea-1651b01944ae)),
Vizcom ([hero](https://mobbin.com/sites/sections/998ec837-65e9-49f7-84f6-bcd40fbf480e))
and Framer ([hero](https://mobbin.com/sites/sections/b842c72f-733c-4052-b488-b74e9b2c1104)).
`observed`.

The composition stays centred. Centring is not the tell (Part 1); the empty
frame was. Element 6 fills the frame.

## 2.3 The specimen band

### 2.3.1 Why this artefact, and not decoration

**The problem.** A product that generates things shows a visitor nothing it has
generated until they scroll.

**The pattern.** Three references, three variants of one move — *put the
product's own output in the hero, at the size the product makes it*:

- **Ramp** ([business account hero](https://mobbin.com/sites/sections/4c3bb2de-4b4d-41b6-90d5-8a273bd30011))
  — the hero's visual is a **computation**: a giant blue `$100,000` with a small
  `/Year`, a comparison line `vs. national average (0.07%) = $3,500`, and one
  slider labelled `Balance` driving it. One control, one generated figure, no
  ornament. `observed`.
- **Claude Type** ([Romie specimen](https://mobbin.com/sites/sections/87c2dd71-75a5-4bf1-8d12-86e29d509e35))
  — the hero **is the product's output**: the typeface set at display size, a
  tiny `12 Styles` pill above, a `Buy Romie` pill below. `observed`.
- **Firecrawl** ([hero](https://mobbin.com/sites/sections/7374e232-3232-4f76-bf3e-a95a4ee73b8a))
  — input, instrument and **result** in one screen: a real URL field with mode
  tabs inside it, and directly beneath, the wireframe it parsed beside the JSON
  it returned, with mono labels naming each part. `observed`.

Our version is Firecrawl's shape (instrument, then result, ruled into a
technical ground) driven by Ramp's economy (one control, generated output, no
ornament) showing Claude Type's subject (our own artefact at the size we make
it).

**One thing none of them has.** They show output. We can show output **and the
measurement we took of it** — because contrast validation is a real capability
with a real function behind it. That fact is what makes this hero uncopyable,
and it is the single most UIL4B thing available to put above the fold.

### 2.3.2 Data — reuse, not a parallel path

Every value in the band comes from a module that already ships. **No new data
file. No route literal. No `Math.random()`.**

| What | Source | Notes |
|---|---|---|
| The entries | `HOME_CURATED` from `src/data/homeGallery.js` | 64 palettes, the same array the Discover section renders. Import the export, do not re-derive from `GALLERY_PALETTES` |
| The artefact | `item.colors` — four hexes, dominant → accent | `paletteGallery.js`'s own documented order |
| The name | `item.name` | |
| The CSS | `item.css`, produced by `paletteCss()` | **The same bytes the gallery's Copy CSS hands over.** A visitor who copies from the hero and from the gallery must get identical text |
| The hand-off | `item.to`, produced by `paletteBuilderUrl(item.colors)` | Resolves to `/create/palette?c=…` after #266. **Never typed** |
| The ratio | `contrastRatio(a, b)` from `src/utils/colors.js` | |
| The grade | `grade(ratio)` from `src/utils/styleGuideExport.js` | Returns `AAA` / `AA` / `AA Large` / `Fail`. Reusing it is why the hero can never disagree with a style-guide export |

**The two computed facts**, both derived at render from `item.colors` alone:

1. **The best pair.** Of the six unordered pairs among four colours, the one
   with the highest `contrastRatio`. Rendered lighter-on-darker as
   `{fg} on {bg}`, with `{ratio.toFixed(2)}:1` and `grade(ratio)`.
2. **How many pairs are usable.** `n of 6 pairs clear AA` — the count of pairs
   whose ratio is ≥ 4.5.

Fact 2 is the load-bearing one. Fact 1 alone would read `AAA` on nearly every
palette and therefore look printed rather than computed; fact 2 genuinely varies
across the 64 entries, which is what proves to a sceptical designer that a
function ran. §2.11 makes that a test.

### 2.3.3 Anatomy, tokens and geometry

One band, ruled top and bottom, spanning the full `.home-hero-core` measure
(1080px cap). No side borders — it is a rule across the page, not a card. It is
deliberately **not** a `--surf` card: the page already has seven of those below
the fold, and an eighth in the hero would be the "every idea in an equally
weighted rounded card" tell.

```
grid-template-columns: minmax(0,1.25fr) minmax(0,1fr) minmax(0,1.15fr) auto;
grid-template-rows:    auto 1fr auto;      /* labels · content · caption */
height:                var(--hero-specimen);
border-block:          1px solid var(--border);
column-gap:            var(--s-5);
```

| Token | Value | Why |
|---|---|---|
| `--hero-specimen` | `144px` | 3 × the 48px ground module (§2.6) |
| `--hero-specimen` @ `max-height:900px` | `96px` | 2 × the module. Declared inside the **existing** `@media(max-height:900px)` block at `global.css:5432` — no new breakpoint |

**Column 1 — `PALETTE`.** Four swatches, `1fr` each, `--radius-xs`, `1px solid
var(--border)`, `gap: var(--s-1)`, 44px tall (30px in the 96px variant). The
four hexes sit in a mono row **beneath** the swatches — `--mono`, `--fs-micro`,
`--t2`, `tabular-nums` — never inside them. Text inside a generated swatch would
have to pick its own ink at runtime, and `readableInk()`'s 0.58 luminance
threshold does not guarantee 4.5:1 at 11px. Moving the labels onto `--bg-0`
deletes the entire failure class.

**Column 2 — `CONTRAST`.** Two lines:

```
#2E3440 on #ECEFF4        12.63:1   AAA
4 of 6 pairs clear AA
```

Line 1: hexes in `--mono` `--fs-micro` `--t2`; the ratio in `--mono`
`--fs-body-s` `--t0` `tabular-nums`; the grade as a category pill —
`--radius-pill`, `--bg-2`, `1px solid var(--border)`, `--mono` `--fs-micro`
weight 700, `--accent-strong`. That is `.hcmd-row-cat`'s existing language.
**It is not the `--hi` AAA badge**, and that is deliberate: `--hi` is budgeted at
one element per viewport and it is spent on the headline mark (§2.4). Line 2:
`--fs-caption`, `--t2`.

**Column 3 — `CSS`.** The first two lines of `item.css` after the comment
header, in `--mono` `--fs-micro` `--t2`, one line each, clipped. No line
numbers, no traffic lights, no copy button — the export section two screens down
owns the full panel treatment and duplicating its chrome here would make the two
compete. This column is a glimpse, not a panel.

**Column 4 — the control.** `auto` width. A `ui-pill ui-pill-quiet ui-pill-md`
labelled `Next palette`, and beneath it a `.hstep-cta`-styled text link
`Open in Palette Builder →`. Both are real; §2.3.4.

**Caption row**, spanning all four columns, `--mono` `--fs-micro` `--t3`, single
line, clipped:

```
{item.name} · sRGB · from the UIL4B palette library
```

`sRGB` is deliberate. Research Topic 10, recommendation 5: *"for a product whose
entire pitch is defensible colour systems, naming the space is both more correct
and a credibility signal"* — the iOS system colour sheet writes `sRGB Hex Colour
#`, not `Hex`. `observed`.

The three column labels (`PALETTE`, `CONTRAST`, `CSS`) are `--mono` `--fs-micro`
weight 700, `letter-spacing:.1em`, uppercase, `--t3`. They are the same device as
Firecrawl's mono corner ticks, and they are the reason the band reads as
measured rather than styled.

### 2.3.4 The one control

`Next palette` advances an index into `HOME_CURATED`, wrapping at the end. That
is the whole interaction. It is Ramp's `Balance` slider with a different axis:
one control, and the artefact regenerates from it.

- It is a real `<button type="button">`, `ui-pill-quiet` `ui-pill-md` (44px —
  clears WCAG 2.5.8 with 20px to spare).
- It **never auto-advances.** A hero that cycles its own artefact in a reader's
  peripheral vision while they read the headline is the gimmicky failure the
  research warns about at Topic 9, and it would also put a second piece of
  auto-motion in the same viewport as the typing overlay.
- `Open in Palette Builder →` is a `<Link to={item.to}>`. It stays a real link
  so middle-click and open-in-new-tab work — the same rule `HomeCommandBar`'s
  result rows already follow.

**Why this is not a second workbench.** It has one control and no state to lose.
It grants nothing: no save, no export, no account, no quota. It hands off to the
real tool the same way every other homepage surface does. The five-mode
workbench below the fold is untouched and remains the demonstration.

### 2.3.5 CLS reserves, item by item

**The baseline is mean 0.0000 on the `homepage-field-metrics` profile and must
not move.** Every variable-length string in the band is enumerated here with its
reserve. Nothing in the band is content-sized.

| What varies | Widest form | Reserve |
|---|---|---|
| Band height | — | `--hero-specimen`, a fixed token per breakpoint. **Never `auto`, never `min-height`.** |
| Swatch colours | — | Four `1fr` cells in a fixed-height row. A colour change is a paint, not a layout |
| Hex row | always `#RRGGBB`, uppercased | 7 characters exactly. `tabular-nums` so digit width cannot vary |
| Ratio | `21.00:1` | `min-width: 7ch` + `tabular-nums`. Always `.toFixed(2)` — never a bare `21:1` |
| Grade pill | `AA Large` | `min-width: 9ch`, text centred. Covers all four `grade()` return values, including the two the best-pair rule should never produce |
| Pair count | `n of 6` | `n` is a single digit by construction (0–6) |
| CSS lines | slug length varies with the palette name | Two lines, each `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`, fixed `line-height` |
| Caption | name length varies | One line, same clip treatment |
| Control column | labels are constant | Fixed |

**The rule for the engineer:** if a future change makes any cell size on its
content, the reserve is broken and the CLS gate will catch it — but only after
it ships. Assert the fixed height in a unit test (§2.11) so it is caught before.

**Why the band makes spec §2.2's rejection *more* correct.** §2.2 declined to
render the search results panel for the typed query, because `.hcmd-results` is
an in-flow sibling and showing it moves everything below. With the band directly
beneath the chips, that "everything below" now includes a 144px object and the
primary CTA. **Do not revisit that decision.** The typing overlay stays exactly
as §2.2 specifies: an out-of-flow, `aria-hidden`, `pointer-events:none` overlay
in the existing `minmax(0,1fr)` grid track, with the input's `value` empty at
every moment.

### 2.3.6 Determinism, prerender and hydration

The build prerenders 27 shells. The band must therefore render identically on
the server and on the first client paint.

- The index starts at `0`. Not random, not date-seeded, not
  `localStorage`-seeded.
- `HOME_CURATED` is a module-scope constant built from static arrays.
- `contrastRatio` and `grade` are pure.
- Hex strings are uppercased with `.toUpperCase()`, not with a locale-aware
  method.

**The trap, stated plainly.** `HomeWorkbench.makePalette()`
(`HomeWorkbench.jsx:138–147`) uses `Math.random()`. It generates a different
ramp on every load, which is fine below the fold in a client-only panel and is
**not** fine in prerendered markup. Do not hoist it, do not copy its approach,
and do not "improve" the band by randomising the starting index.

## 2.4 Copy

Australian English throughout. No denial-then-assertion. No superlatives. No
invented numbers.

### The headline — two options

**Option A — recommended.**

```
A UI system that
survives the [handoff].
```

- **Why it is the recommendation.** "Survives the handoff" is the sentence a
  designer who has done the job writes, and it is not a sentence a generator
  reaches for. It names the pain `growth-persuasion.md` names verbatim
  (*"palettes that don't survive handoff"*), so it is describing a problem the
  reader already has rather than inventing one — the ethical line that document
  draws. It uses the product's own noun (`CLAUDE.md`: *"the operating workspace
  for UI system creation"*). It is backable: the export section renders the
  actual exporter's output two screens down. And it spends the mark on the
  moment of value.
- **The `--hi` mark sits on `handoff`** — the one word in the sentence that
  carries the claim. This is Firecrawl's use of the same device
  ([hero](https://mobbin.com/sites/sections/7374e232-3232-4f76-bf3e-a95a4ee73b8a),
  marker on `It's also open source.`) and Sketch's
  ([feature card](https://mobbin.com/sites/sections/0aa61d33-7cfb-43eb-b005-55c4718fb1f5),
  inverted mono box on `Inside Sketch:`). `observed`. It is the correction for
  Part 1's tell 4: the marker now carries information rather than naming a
  widget that is visible 200px below it.
- **The risk, stated.** "UI system" and "handoff" are both trade words. Our
  audience is product and web designers and front-end developers
  (`positioning.md`), who use both daily — but `CLAUDE.md` also says a
  first-time visitor should understand the product immediately. The sub-line
  carries that load. If the founder judges the headline too inside-baseball,
  Option B is the plainer one.

**Option B — the alternative.**

```
Design the system.
Leave with the [code].
```

Leads with the deliverable rather than the risk removed. Mark on `code`.
Backable by the same export section. **Its weakness:** it edges close to #264's
sticky-section H2, "Use the tools here, then take the values with you." Two
statements of the same promise, two screens apart, is the "generated section by
section" pattern. If the founder prefers B, move that H2 — #264 is still open.

**Line-length constraint, for whichever is chosen.** Each `.home-hero-line` is
`display:block`, so the break is authored, not computed, and `text-wrap:balance`
has no effect across the two block children. The shipped headline's own lines are
18 and 20 characters and fit inside `.home-hero-core`'s 1080px at the 95.04px
computed cap. **Treat 21 characters per line as the ceiling** and check the
render at 1440 before merging. `inferred` — calibrated from the shipped
headline, not measured directly. Option A is 16 / 21; Option B is 18 / 21.

**The clip maths does not change.** #262 derived `.28em` on `.home-hero-line`
from `.194em` of half-leading plus `.home-mark`'s `.06em` `padding-block`, and
its unit test enforces the relationship rather than the number. Both options keep
the mark on line 2, exactly as today. Because #262 compensates with
`padding-block` (both edges), a headline that puts the mark on line 1 instead
would also be covered. **Do not re-derive it, and do not touch
`tests/unit/hero-entrance.test.js`.**

### The sub-line

> Every tool here writes to one set of values, so the contrast you check is the
> contrast you hand over.

100 characters — two lines at the existing 54ch measure at every viewport ≥981px.
It fixes Part 1's tell 7 in both halves: no four-noun inventory, and the invented
"twelve bookmarked tabs" is gone. It names a consequence, it explains the band
directly beneath it, and it echoes the headline's `handoff` deliberately — the
headline states the outcome, the sub-line states the mechanism.

### The command bar placeholder

> `Search 13 live tools`

Derived, never typed: the number is `LIVE_TOOL_COUNT`, which `Home.jsx:36–38`
already computes from `CREATE_GROUPS`. This does three things at once. It fixes
tell 13 — the current placeholder prints three of the five chips sitting directly
beneath it, so the chip row was two thirds redundant with its own neighbour. It
gives the deleted stat line's one honest number a place where it is doing a job:
telling the reader how large the index is. And it is Dropbox's move from research
Topic 1 — `506 Articles — Page 1 of 57`, quantity rather than a bare claim.
`observed`.

**Spec §2.2's static fallback placeholder changes with it.** §2.2 specifies the
input keeps a static `placeholder` for the moment the typing overlay is hidden;
that string becomes this one. The overlay's cycled queries (`contrast` →
`gradient` → `type scale` → `icons`) are unchanged.

### The chips

Unchanged in behaviour and styling. Two content edits, both fixing the
unevenness in tell 13:

- `convert` → `file converter`. It was the only verb among four nouns, and the
  tool it resolves to is now `/create/file-converter`.
- The `Try` label stays, stays `aria-hidden`, stays first.

**Verify before merging** that both edited strings still return results from
`queryCommandIndex`. `HomeCommandBar.jsx:23–24` states the rule: chips are real
queries against the real index, asserted by `tests/user-sim`. A chip that
returns nothing is worse than no chip.

### The fine print

> No account needed to try the tools.

One claim, not three, and it changes kind. The current line — "No credit card ·
No setup · Your first system stays free" — is a payment reassurance repeated
almost verbatim in the pricing lede (`Home.jsx:471`) and again in `SystemCTA`
(`Home.jsx:518`). `growth-persuasion.md` puts risk reversal *next to the ask*;
three copies of it down one page reads as anxiety. The replacement is a
**capability** statement, it is true (the workbench, the band and the search all
work signed out), and it is the sentence most likely to make a visitor try
rather than bounce.

Margin drops from `--s-4` to `--s-2` so it reads as attached to the CTA row
rather than as a fifth stacked block.

**The other two copies stay for now.** `SystemCTA`'s is correctly placed next to
the final ask. The pricing lede's is the one to cut if the founder wants it down
to one — flagged in §2.12, not changed here, because `.hprice` is outside this
spec's surface.

## 2.5 What is deleted, and where each thing goes

| Deleted | Was | Goes to |
|---|---|---|
| `13 LIVE TOOLS` | stat line | The command bar placeholder, derived (§2.4) |
| `200K ICONS` | stat line | **Nowhere.** It is the Iconify catalogue. `toolTree.js` and the workbench's Icon panel already claim it in context, where it is true and attributable |
| `1,500+ FONTS` | stat line | **Nowhere.** It is the Google Fonts catalogue. `discoverResources.js` already describes it in context |
| `ONE WORKSPACE` | stat line | **Nowhere.** `CLAUDE.md` forbids the word in UI copy, and #264 already changed the section eyebrow below it to `[ CREATE ]`. This closes spec §14 open decision 4 |
| `.home-hero-stats` rule + its entrance keyframe entry | `global.css` | Removed from the `:is(…)` selector lists in **both** reduced-motion blocks at `global.css:5386–5388` |

Deleting the two borrowed catalogue numbers is the point of the exercise, not a
side effect. They are the two items that made the strip read as a manufactured
proof line, and neither is ours to claim in a hero.

## 2.6 The ground

`global.css:5302–5306` — the 48×48px grid, 4% ink, `opacity:.46`, 760px tall,
masked to transparent at 82%.

**Keep it. Two changes.**

1. **`opacity: .46` → `.32`.** There is now a real object competing for the eye
   in the same region; the texture should lose. `judgement`.
2. **The band's height is a whole multiple of the grid module** — 144px = 3 × 48,
   96px = 2 × 48. This is the actual fix for tell 5. The grid stops being
   wallpaper not because it gains ornament but because something is now built on
   it, in its own units, in the same hairline language. Firecrawl's grid works
   for exactly that reason: a wireframe sits on its lines and mono labels name
   the parts.

**Do not** chase pixel alignment between the band's rules and the grid lines.
The band's vertical offset depends on how the headline and sub-line wrap, so any
alignment would be true at one viewport and false at the next — false precision,
which is its own kind of slop. The shared module is the relationship; that is
enough.

**Do not** add corner ticks or margin labels. The band's three mono column
labels already are that device, and doing it twice in one viewport spends the
mono texture that `design-language-v2.md` calls load-bearing.

## 2.7 Motion register

Every animation, with its reduced-motion behaviour, in the shape spec §10 uses.
**Mobbin is a stills library and gave no timing evidence of any kind.** Every
duration below is either an existing project token or `judgement`; none is
`observed`.

| # | What | Property | Duration | Easing | Reduced motion (BOTH directions) |
|---|---|---|---|---|---|
| **H1** | Hero entrance (existing) | `transform`, `opacity` | existing | `--ease-entrance` | `animation:none`. The `:is(…)` lists at `global.css:5386–5388` **drop `.home-hero-stats` and gain `.home-hero-specimen`** |
| **H2** | Specimen band arrival | `opacity`, `translate3d(0,18px,0)→0` | `.6s` (matches the existing `home-hero-rise` family) | `--ease-entrance` | `animation:none`. **The band's fixed height is layout, not motion, and stays in force** — same reasoning #262 used to keep `--hw-frame` under reduced motion |
| **H3** | Reseed value cross-fade | `opacity` on the swatches, hex row, contrast lines, CSS lines and caption | `--dur-2` | `--ease-standard` | `transition:none`. **The values still change** — instantly, and completely. Reduced motion removes the transition, never the update |
| **H4** | Reseed pill press | `transform: scale(.97)` | `--dur-1` | `--ease-standard` | Global clamp handles it; keep the colour change, drop the transform |
| **H5** | Typing overlay (spec §2.2) | text substitution | per spec §2.2 | none (discrete) | per spec §2.2, plus the 2.2.2 addition in §2.8 |
| **H6** | Typing caret (spec §2.2) | `opacity` | per spec §2.2 | — | per spec §2.2 |

**Entrance order.** With the stat line gone, the band takes the delay slot after
the CTAs so the hero still resolves top-to-bottom: line 1 `.08s` → line 2 `.18s`
→ sub `.42s` → command bar `.52s` → CTAs `.64s`/`.72s` → **band `.70s`** → hint
`.86s`. Total run lengthens by ~60ms. `judgement`.

**Explicitly not added: the swatch-grow hover.** `design-language-v2.md` names
`flex: 1 → 1.8` on swatch hover as a signature worth preserving. **It must not
be used here.** It is a layout-changing hover inside a fixed-height band above
the fold — the exact class of thing the CLS baseline exists to prevent — and it
is a hover-only affordance on a decorative element, which is unreachable by
keyboard and by touch. The signature stays where it belongs, in the palette
tools. This is a deliberate, documented exception, not an oversight.

**The guard pattern is mandatory for every CSS row above**, mirroring
`global.css:5386–5388` so an explicit in-app toggle beats the OS query in both
directions:

```
@media (prefers-reduced-motion:reduce){
  html:not([data-reduced-motion="false"]) <selector>{ … }
}
html[data-reduced-motion="true"] <selector>{ … }
```

Any JavaScript-driven motion reads the same contract `prefersReducedMotion()`
implements in `useHomeMotion.js` — attribute first, OS query as fallback.

## 2.8 Accessibility

**Focus order.** Skip link → `PillNav` → command bar input → `⌘K` keycap →
result rows (when open) → `Try` chips → **`Next palette`** → **`Open in Palette
Builder`** → primary CTA → secondary CTA → (below the fold, unchanged).

The band sits between the chips and the CTAs visually and in the DOM, so the tab
order matches the reading order with no `tabindex` anywhere. Nothing in the band
is a focus trap, a hover-only affordance, or a focusable element that is
visually hidden.

**Target sizes (WCAG 2.5.8, ≥24×24 CSS px).**

| Component | Min | ≤480px |
|---|---|---|
| `Next palette` pill | 44px (`ui-pill-md`) | 44px |
| `Open in Palette Builder` link | 32px | 40px, per the existing `≤480px` rule that lifts small targets |
| Swatches | n/a — not interactive | n/a |

**Assistive-technology treatment.** The band is a `<figure>` with a
`<figcaption>`. That gives AT one coherent object instead of fifteen fragments.

| Element | Treatment | Why |
|---|---|---|
| The four swatches | `aria-hidden="true"` | The hex row beneath carries the same information as text. Same rule spec §11 applies to the gallery's swatch renders |
| Column labels (`PALETTE`, `CONTRAST`, `CSS`) | **real text, not `aria-hidden`** | They are the band's structure, and a screen-reader user needs them to make sense of the values that follow |
| Hex row | real text | |
| Ratio, grade, pair count | real text | The measurement is the point; it must reach AT |
| The two CSS lines | real text inside `<code>` | |
| `<figcaption>` | real text | Names the artefact and its colour space |
| Typing overlay + caret | `aria-hidden="true"` | Unchanged from spec §2.2 |

**The status region.** `Next palette` announces the new artefact through a
`role="status" aria-live="polite"` node **scoped to the band**, empty at rest,
e.g. `Nordic Frost — 4 of 6 pairs clear AA`. `HomeCommandBar` already owns a
separate polite status for its result count. Two live regions in one viewport is
normally a mistake; it is safe here because **both are empty until the user acts,
and no single action can populate both** — one fires on typing, the other on a
button press. State that in the code comment so it is not "tidied" into one.

**Contrast.** The band introduces no accent-coloured small text except the grade
pill, which takes `--accent-strong` (never `--accent` — `#0F6FFF` measures
≈3.85:1 on the page ground and fails the 4.5:1 floor for normal text). The hex
row and the CSS lines are `--t2`. No text is ever painted on a generated swatch
(§2.3.3). **Dark mode needs its own pass — confirm, don't assume.**

**Reduced motion.** Every row of §2.7 must be verified in both mechanisms: OS
query with no attribute, and `data-reduced-motion="true"` with the OS query off.

**WCAG 2.2.2 — an exposure in spec §2.2 that this pass should close.** §2.2's
typing overlay auto-starts 1200ms after mount and runs one pass of four queries
for roughly 16 seconds. Success Criterion 2.2.2 requires a mechanism to pause,
stop or hide motion that starts automatically and runs beyond five seconds
alongside other content. §2.2 does specify a permanent stop on `focus`, `input`,
`pointerdown` or any keypress — so **the mechanism exists**; what is missing is
that nothing tells the user it does.

The cheapest honest fix adds no UI. The `⌘K` keycap button is already in the
bar, already focusable, and already carries an `sr-only` name ("Focus the tool
search"). **While the cycle is running, that name becomes "Stop the
demonstration and focus the tool search."** One conditional string, one existing
control, criterion satisfied without a second control above the fold.

Sana ([hero](https://mobbin.com/sites/sections/7f35e77e-e242-4333-809d-49fc3156ba43))
ships the explicit alternative — a visible pause button sitting in the tab row of
an auto-cycling hero. `observed`. That is the fallback if an accessibility
reviewer rejects the label-only approach. **Which of the two ships is a
§2.12 decision**, and the sufficiency of the label-only version is `judgement`,
not a verified pass.

## 2.9 Responsive intent

| Band | Composition | `--hero-specimen` |
|---|---|---|
| **Desktop ≥981px, viewport height >900px** | Four columns as specified, caption spanning | `144px` |
| **Desktop ≥981px, viewport height ≤900px** | Identical four columns; swatches 44px → 30px, row gaps tighten | `96px` — set inside the existing `@media(max-height:900px)` block |
| **Tablet 641–980px** | Two columns × two rows: `PALETTE` and `CONTRAST` on row 1, `CSS` and the control on row 2. Caption spans both | `192px` (4 × 48) |
| **Phone ≤640px** | Two rows: `PALETTE` full width, then `CSS` with the control beside it. **`CONTRAST` drops to a single line under the hexes** rather than being cut — the measurement is the reason the band exists | `144px` (3 × 48) |

**Nothing is hidden on phone.** Every fact survives; only the arrangement
changes. The `CSS` column is the one that could reasonably be dropped, and it is
kept because the export section is a long way down on a phone.

**Tablet is the weakest band here, as it is in spec §12.** Mobbin returned no
tablet-sized captures in either research pass, and the 641–980px range is being
reworked by PR #263 anyway. Treat the tablet row as a hypothesis and verify it
against #263's band once that lands. `judgement`.

## 2.10 The vertical budget

The hero must keep two contracts from
`tests/user-sim/10-home-chaos-to-calm.spec.js`: **the workbench starts below the
fold**, and **the primary CTA stays above it**, at 1440×900, 1512×982, 1920×1080
and 1280×800. The band is the only thing this spec adds to that stack, so the
arithmetic is stated in full.

All values read from the stylesheet, not from a browser — `inferred`, and the
engineer must confirm the totals in a real render before merging.

**1280×800** — the binding case. `@media(max-height:900px)` applies, so
`--hero-specimen` is 96px:

| Item | px |
|---|---|
| `.home-hero` padding-top — `--nav-top` 0 + `--nav-h` 60 + `--s-6` 32 | 92 |
| H1 — 2 × (6.6vw = 84.48 × 0.98) | 165.6 |
| sub margin-top `--s-4` | 16 |
| sub — 2 × (21 × 1.6) | 67.2 |
| `.hcmd` margin-top `--s-4` | 16 |
| `.hcmd-bar` min-height | 60 |
| `.hcmd-chips` margin-top `--s-3` | 12 |
| chip min-height | 34 |
| band margin-top `--s-5` | 24 |
| **band `--hero-specimen`** | **96** |
| `.home-hero-cta` margin-top `--s-5` | 24 |
| `ui-pill-lg` | 52 |
| hint margin-top `--s-2` | 8 |
| hint — 11 × 1.65 | 18.2 |
| `.home-hero` padding-bottom `--s-8` | 64 |
| **Total** | **749** |

749 ≤ 800, so the hero fits inside `min-height: min(100svh, 980px)` and the
workbench still begins at exactly 800px. **51px of slack.** Running the column down to the
CTA — 92 + 165.6 + 16 + 67.2 + 16 + 60 + 12 + 34 = 462.8 at the chip row, + 24
+ 96 = 582.8 at the band's foot, + 24 + 52 — puts the primary CTA's bottom edge
at **658.8px**, 141px clear of the fold.

| Viewport | `--hero-specimen` | Hero content total | Fold | Slack |
|---|---|---|---|---|
| 1280×800 | 96 | 749 | 800 | **51** |
| 1440×900 | 96 | 770 | 900 | 130 |
| 1512×982 | 144 | 872 | 982 | 110 |
| 1920×1080 | 144 | 872 | 1080 | 208 |

The 1512 and 1920 rows drop the `max-height:900px` overrides, so padding-top is
108, the sub takes `--s-6`, `.hcmd` takes `--s-5`, chips take `--s-4` and the CTA
row takes `--s-6`; the H1 is at its 96px cap in both.

**Reading of the result.** The 96px variant is what makes this fit. Specifying a
single 144px band at every height would put 1280×800 at 797px against an 800px
fold — three pixels, which is not a margin, it is a coin toss. The two-step token
is not a nicety.

## 2.11 Acceptance criteria

Observable and checkable. Numbers 1–4 are the ones that would catch a
regression silently reintroducing the problem.

1. **CLS** — homepage CLS stays at **0.0000 mean** on the existing
   `homepage-field-metrics` profile (4× CPU throttle, 1440×900, ten cold loads,
   cache disabled). Any regression is a fail, not a rounding argument.
2. **Fixed height** — `.home-hero-specimen` measures the same height across all
   64 entries at 1440×900 and at 1920×1080. Stepping through every entry with
   `Next palette` moves nothing below the band by a single pixel.
3. **The fold contract** — `tests/user-sim/10-home-chaos-to-calm.spec.js` passes
   unmodified at all four viewports: `.hw-shell` starts at or below the fold, and
   `.home-hero-cta .ui-pill-accent` ends above it.
4. **The number is computed, not printed** — a unit test asserts that across the
   64 entries in `HOME_CURATED`, the `n of 6 pairs clear AA` value takes **at
   least three distinct values**. If it ever collapses to one, the fact has
   stopped being evidence and the band has become decoration.
5. **No route literal** — no string beginning `/create/` or `/color/` appears in
   the band's source. The hand-off is `item.to`; the chips resolve through the
   search index. The existing route tests stay green.
6. **The bytes match** — the CSS shown in the band is a prefix of the string
   `paletteCss(palette)` returns, and copying the same palette from the Discover
   gallery yields text that starts with the same two lines.
7. **The grade cannot disagree with an export** — the badge is `grade(ratio)`
   from `styleGuideExport.js`, not a local threshold table.
8. **Prerender parity** — the prerendered HTML for `/` and the first client
   render produce identical band markup. No hydration warning in the console.
9. **Deletions** — no `200K ICONS`, `1,500+ FONTS` or `ONE WORKSPACE` string
   remains anywhere on the page. `.home-hero-stats` is gone from the markup and
   from both reduced-motion `:is(…)` lists.
10. **`--hi` budget** — exactly one `--hi` element in the hero viewport: the
    headline mark. The grade pill is `--accent-strong` on `--bg-2`.
11. **Reduced motion** — every row of §2.7 verified in both mechanisms. Under
    reduced motion the band renders at rest, at full height, and `Next palette`
    still changes every value instantly.
12. **Keyboard** — `Next palette` and `Open in Palette Builder` are reachable in
    the §2.8 order, operable by keyboard, and visibly focused. `Open in Palette
    Builder` middle-clicks into a new tab.
13. **Chips still hit** — every `Try` chip, including the edited `file
    converter`, returns at least one result from `queryCommandIndex`.
14. **2.2.2** — while the typing cycle runs, the `⌘K` keycap's accessible name
    names the stop. Focusing or clicking it stops the cycle permanently.
15. **Contrast** — the grade pill, hex row, CSS lines and caption all clear
    4.5:1 in light **and** dark. No text is painted on a generated swatch.
16. **Headline** — neither line of the chosen option wraps at 1440×900; the mark
    is unclipped at top and bottom; the entrance still plays and still settles
    instantly under both reduced-motion paths.

**Still unrun, and must not be claimed as passed** (`homepage-field-metrics`):
keyboard-only, screen-reader name, 200% zoom and forced-colours passes. This
spec defines the intent; it is not evidence any of it was verified.

## 2.12 Open decisions — founder judgement required

1. **Which headline.** Option A (`A UI system that survives the handoff.` —
   recommended) or Option B (`Design the system. Leave with the code.`). A is
   the more authored sentence and does not collide with #264's H2; B is the
   plainer one for a visitor who does not already know the vocabulary. **One
   call, and it sets the tone of the whole page.**
2. **Deleting the stat line.** The two catalogue numbers (200K icons, 1,500+
   fonts) are real libraries and are honest *in context* — this spec removes
   them from the hero because in a stat strip they read as ours. If the founder
   wants a number above the fold, `13` survives in the placeholder and the band
   carries `n of 6 pairs clear AA`. Confirm that is enough.
3. **WCAG 2.2.2 on the typing cycle.** The label-only fix (§2.8) or Sana's
   visible pause control. Recommended: label-only, because it adds no control to
   a viewport that already has six interactive elements. An accessibility
   reviewer should confirm sufficiency — this is `judgement`.
4. **The third risk-reversal copy.** The hero's shrinks to a capability
   statement and `SystemCTA` keeps its payment one. The pricing lede's *"no card
   and no trial clock"* is the remaining duplicate. Cut it or keep it —
   `.hprice` is outside this spec's surface, so it is flagged, not changed.
5. **The three below-the-fold items from Part 1 §1.5** — the tool cards, the
   five templated step titles, and `[ THE TOOLSET ]` → `[ TOOLSET ]`. None is in
   this spec. All three are cheap, and the tool-card fix is the largest
   remaining anti-slop win on the page after the hero.
6. **Ordering against the open PRs.** This spec assumes #262, #264 and #266 have
   all landed. #262 is a hard precondition (the mark's clip maths and the chip
   centring). #264 is a hard precondition (`homeGallery.js` is the band's data
   source). #266 is a hard precondition (`paletteBuilderUrl` must already return
   `/create/palette`). **Build order: #262 → #264 → #266 → this.**

---

## Sources

**Read for this pass.** `src/pages/Home.jsx` · `src/components/HomeCommandBar.jsx`
· `src/components/HomeWorkbench.jsx` · `src/styles/global.css` (`:root` tokens,
`.home-*`, `.h*`, both reduced-motion blocks) · `src/data/toolTree.js` ·
`src/data/paletteGallery.js` · `src/data/gradientGallery.js` ·
`src/data/paletteLibrary.js` · `src/utils/colors.js` ·
`src/utils/styleGuideExport.js` · `src/utils/uiSystem.js` ·
`src/utils/exportBuilder.js` ·
`tests/user-sim/10-home-chaos-to-calm.spec.js` ·
`tests/unit/hero-entrance.test.js` · and the full diffs of **PR #262**, **PR
#264** and **PR #266**.

**Reference.** `docs/design/homepage-spec-2026-08.md` ·
`docs/research/homepage-patterns-2026-08.md` ·
`docs/reference/design-language-v2.md` · `docs/reference/growth-persuasion.md` ·
`docs/reference/positioning.md` · `CLAUDE.md` ·
`.claude/skills/uil4b-brand-design/references/` (brand-foundation,
anti-slop-quality-bar, surface-principles).

**Mobbin — twelve new captures, gathered 2026-08-22**, on top of the 95 in the
research document. Four searches: developer-tool heroes with a live demo;
design-tool heroes showing real colour output; heroes with an inline interactive
control; heroes built around a search field.

| App | Capture | Used for |
|---|---|---|
| Firecrawl | [hero](https://mobbin.com/sites/sections/7374e232-3232-4f76-bf3e-a95a4ee73b8a) | The closest analogue to our hero in either pass — instrument + result + technical ground + marker on the sub-line |
| Ramp | [business account hero](https://mobbin.com/sites/sections/4c3bb2de-4b4d-41b6-90d5-8a273bd30011) | One control driving one generated figure |
| Claude Type | [Romie specimen](https://mobbin.com/sites/sections/87c2dd71-75a5-4bf1-8d12-86e29d509e35) | The product's own output as the entire hero |
| Antimetal | [hero](https://mobbin.com/sites/sections/a8eb47a5-9254-4e58-bdc9-ab44b8259ae5) | A demo panel dimmed so it reads as a demonstration |
| Sana | [hero](https://mobbin.com/sites/sections/7f35e77e-e242-4333-809d-49fc3156ba43) | An explicit pause control on an auto-cycling hero (WCAG 2.2.2) |
| V7 | [hero](https://mobbin.com/sites/sections/26660d92-77ce-470d-a481-fa9873bd1b3e) | The only capture in either pass showing typed text with a live caret — into the *headline*, which is why we do not copy it |
| TinyWins | [hero](https://mobbin.com/sites/sections/eb379572-6bc5-4f91-8ad9-ef6a2ff09f11) | Stat strips written as complete phrases |
| Voiceflow | [context engine](https://mobbin.com/sites/sections/55a5e8f2-1e4b-4641-ad6d-52e0d15e62e9) | Numeral over a unit label |
| Maze | [platform hero](https://mobbin.com/sites/sections/3de86c04-135e-4a67-af1a-c9c869778759) | Asymmetric hero; the A-to-B headline as real practice |
| Retool | [hero](https://mobbin.com/sites/sections/dcbd55be-58cb-4e0e-9b70-cb4d184fa30a) | Headline-first opening; artefact bleeding off the edge |
| Vercel | [resources hero](https://mobbin.com/sites/sections/bfdd6f6e-3296-4d9c-9041-413c0a935926) | A labelled tile grid as the chip row's grown-up form |
| Figma | [creative tools](https://mobbin.com/sites/sections/5f84e90e-f4ae-48e5-bdb0-9b0b9b303f03) | Decoration as a flat colour field, not a gradient |

Also cited from the earlier research where a claim needed corroboration: Grok,
BitcoinOS, Sketch, ElevenLabs, ClickUp, Copy.ai, Campsite, Airbnb, Craft,
Browserbase, Vizcom, Framer, Descript.

**Mobbin gave no motion, timing or easing evidence, and none is attributed to
it.** Every duration in §2.7 is either an existing project token or
`judgement`.
