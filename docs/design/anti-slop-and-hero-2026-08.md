# Anti-slop diagnosis and hero redesign — August 2026

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
from the tool tree so the claim cannot drift; the step rail's `/color/palette`
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

*Part 2 follows: the hero specification.*
