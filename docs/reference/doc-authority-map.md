# Doc authority map

> Reference doc for UIL4B. Linked from `CLAUDE.md`. **Read this before trusting
> any other document in this repository.**
>
> It answers one question: *for the thing I am about to do, which file is
> authoritative, and which files look authoritative but are not?*

Written 2026-09-03 in response to the founder: *"review our subagent MD files
and our other MD files to ensure nothing is stale as i feel like we have been
going in circles sometimes."*

---

## Why this file exists

The circling is a **symptom**. The cause is that a wrong instruction in this
repository does not announce itself.

**An agent that follows a wrong instruction confidently does not fail.** It does
the wrong work, the gate goes green, and it reports success. Nobody sees an
error, so nobody looks for one — and the next agent reads the same instruction
and does the same wrong work. From outside, that is exactly what going in
circles feels like.

Four instances inside one week, all found by accident rather than by any check:

| # | The instruction | The truth | Cost |
|---|---|---|---|
| #291 | The gate doc said `npx vite build`, **five times** | CI runs `npm run build`; the same doc twice warned that bare vite skips the prerender | A green run with a silently smaller test count |
| #303 | The gate doc hardcoded 571 unit / 291 browser | 659 / 355. Its own line records it had **already** drifted and been corrected once before. #312 later established it had drifted **four** times, one of them undetected the whole time | A clean run reads as a wild regression |
| #306 | The backlog named a hero in `IconLibrary.jsx` | The hero is in `IconEmojiLibrary.jsx`; the named block is dead on every shipped route | A whole pass edited a file nothing renders |
| #305 | The backlog named `FontBrowseDialog` as the Font Gallery's popup | That belongs to `FontPicker`; the gallery opens `DetailDialog` | Sent to the wrong component |

None of these was found by a test. Three were found because a human noticed the
result did not match the claim.

## Which file answers which question

The first table is for **facts about the product's state**; it lives in
`CLAUDE.md` and is canonical — this file does not restate it. The table below is
for **which document to open**, which is a different question and was not
written down anywhere before.

| I need to know… | Open | Do **not** trust for this |
|---|---|---|
| What UIL4B is, who it is for, the surfaces | `docs/reference/positioning.md` | `architecture.md`'s surface section — it is an IA lens, not the story |
| What the routes are, live vs Soon | `src/data/toolTree.js`, then `docs/build-plan/tool-tree.md` | Any prose route list. `positioning.md` deleted its copy for this reason |
| Which routes get prerendered | `public/sitemap.xml` | Any counted list — `prerender.mjs` derives from the sitemap |
| **How the app is built** — and that there are **two** paths | `package.json` scripts, then `build-and-verify.md` | Either path in isolation. See "Two build paths" below |
| Where a page, context or API route lives | `docs/reference/architecture.md` | Its page list for *whether a route reaches it* — grep the import |
| What the gate is and how to run it | `docs/reference/build-and-verify.md` | — it is the only home; no other file may restate a gate number |
| The breakpoint scale, tokens, class naming | `docs/reference/css-conventions.md` | `murphys-law.md` and any older "768 / 480 / 380" triple |
| Which widths actually break | `.claude/skills/uil4b-surface-review/references/responsive-bands.md` | Any doc that omits 640px or the 641–900 band |
| Live token values (colour, radius, type, motion) | `src/styles/global.css` | Every doc table of values — all of them have drifted at least once |
| What "AI slop" is, and what each failure is called | `uil4b-brand-design/references/anti-slop-quality-bar.md` | — vocabulary only; it is not runnable |
| **How to run** a visual or responsive review | `.claude/skills/uil4b-surface-review/` | The quality bar, and `design.md`'s tell list — those say what to look for, not where to stand |
| What is queued, blocked or known-broken | `src/data/pipeline.js` | Any doc naming an item as open — check its `status` field first |
| What shipped, and founder decisions already made | `CHANGELOG.md` | — but it is a historical record; a file it names may since have been deleted |
| Ideas awaiting a founder verdict | `docs/PROPOSALS.md` | — no agent may claim a verdict not written on the verdict line |
| Founder-only console / credential work | `docs/OWNER-ACTIONS.md` | — |
| Agent roles, tools, evidence classes | `.claude/agents/README.md` | — |
| Which skill to load | `.claude/skills/README.md` | — |
| How to use the imported taste skills here | **This file**, "Imported taste skills" below | Those skills' own claims about what fonts and icon packs are "available" |

## The four failure modes, and what to do about each

**1. A hand-maintained number.** Test counts, route totals, file tallies. These
*always* drift, and the drift is invisible because a stale number still looks
like a number. **Every single one found in this pass had drifted** — the gate
doc's unit total, the rules-test total, the "four unit tests read the shells" in
both `README.md` and `engineer.md`.

> **Rule.** A number belongs in a document only if something fails when it goes
> wrong. The `/api` 12-function cap qualifies — `tests/unit/account-deletion.test.js`
> fails the build if it is exceeded. A test count does not, and never can.
> Name the file or the command instead of the count.

#312 took this furthest and is the pattern to copy: it deleted the gate doc's
counts rather than correcting them a fifth time, restated each row as a property,
and added `tests/unit/gate-doc.test.js` so the shape is now enforced instead of
merely intended. **A convention loses across dozens of PRs and many agents; a
test does not.**

**2. A reference to a file that is not reached.** A page component existing is
not evidence that a route reaches it. `IconLibrary.jsx` and `EmojiLibrary.jsx`
are both unrouted, and both were listed as live pages.

> **Rule.** Grep for the import before editing a page file.

**3. Two documents answering the same question differently.** Nobody notices,
because each reader opens only one.

> **Rule.** One home, everything else links. If you find a second copy, delete
> the copy — do not reconcile it, or you will have two documents that agree
> today and disagree next month.

**4. Advice that was true before a refactor.** The most dangerous kind, because
it was correct when written and reads as authoritative.

> **Rule.** When a doc describes a *gap*, check the queue item it names before
> acting. The 404 paragraph pointed at an item that had read `done` for weeks.

## Per-file register

Verdicts from this pass. **KEEP** = accurate and needed · **UPDATE** = fixed here
· **ARCHIVE** = spent, propose moving · **DELETE** = obsolete, nothing unique.

### Root

| File | Verdict | Why |
|---|---|---|
| `CLAUDE.md` | UPDATE | Accurate. Gains a link to this map. |
| `README.md` | UPDATE | Accurate; said "four unit tests read the prerendered shells" and it is six. Now names the files. |
| `CHANGELOG.md` | KEEP | Historical record. It names seven files that no longer exist — correctly, because it is the record *of* their deletion. Do not repair those as broken links. |

### `docs/reference/`

| File | Verdict | Why |
|---|---|---|
| `architecture.md` | UPDATE | Three claims the code contradicts — see the top of this file. Fixed. |
| `build-and-verify.md` | UPDATE | Sole home of the gate. Its hand-carried counts were removed by **#312**, which landed while this pass was running and restated every row as a *property* — 0 errors, 0 failures, 0 skipped. `tests/unit/gate-doc.test.js` now fails CI if a count comes back. This branch deliberately did not touch the counts, so the two passes did not collide; only the duplicated breakpoint row was changed here. |
| `css-conventions.md` | UPDATE | Now owns the widths-to-test question, and names 640px and the 641–900 band. |
| `positioning.md` | KEEP | Canonical story. Its Workspace/Create naming note is explicit and correct. |
| `murphys-law.md` | UPDATE | Carried a third breakpoint answer; now links to the one home. |
| `constants-and-config.md` | KEEP | Verified against source — admin email, brand hexes, contrast tokens all match `global.css` and `constants.js`. |
| `tech-stack.md` | KEEP | Verified. |
| `human-validation-zones.md` | KEEP | Binding and current. |
| `git-workflow.md` | KEEP | Current. |
| `director.md` | KEEP | Current operating doc. |
| `discover.md` | KEEP | Current. |
| `design-language-v2.md` | KEEP | The shipped V2 language. |
| `color-system-m3.md` | KEEP | Method doc; values live in code. |
| `growth-persuasion.md` | KEEP | Playbook, not state. |
| `doc-authority-map.md` | NEW | This file. |

### `docs/` — other

| File | Verdict | Why |
|---|---|---|
| `PROPOSALS.md` | KEEP | Founder verdict queue. |
| `OWNER-ACTIONS.md` | KEEP | Founder-gated actions. |
| `build-plan/tool-tree.md` | KEEP | Derived from `toolTree.js` and says so. |
| `design/homepage-spec-2026-08.md` | KEEP | **Live spec** — PRs #262/#264/#269/#270 are still open against it. Not spent. |
| `design/anti-slop-and-hero-2026-08.md` | KEEP | Live spec for the same open PRs. Note it references `src/data/homeGallery.js`, which does not exist on `main` — it ships with #264. Read it as a spec, not as a description of `main`. |
| `design/motion-reference-2026-08-23.md` | KEEP | Founder-supplied reference; frames deliberately uncommitted. |
| `research/homepage-patterns-2026-08.md` | KEEP → ARCHIVE later | 95 cited Mobbin captures backing the open homepage PRs. Archive once they land. |
| `qa/mobile-audit-2026-08.md` | **ARCHIVE (proposed)** | Diagnosis-only pass; its fixes shipped in #271/#274 and are held by regression specs. See the archive note below. |
| `qa/responsive-audit-2026-08.md` | **ARCHIVE (proposed)** | Same. Its durable knowledge — the breakpoint bands and the recurring-defect pattern — is migrated into `uil4b-surface-review/references/responsive-bands.md`. |

### `.claude/agents/`

| File | Verdict | Why |
|---|---|---|
| `README.md` | UPDATE | Accurate and load-bearing. Gains the new skill in its routing table. The pending `motionsites` grant is correctly flagged as **not done**. |
| `design.md` | UPDATE | Its anti-slop tell list is good and stays; now points at the review procedure for audits. |
| `engineer.md` | UPDATE | Carried the same drifted "four unit tests" count. |
| `research.md`, `qa.md`, `reviewer.md` | KEEP | Current. |

### `.claude/skills/`

| File | Verdict | Why |
|---|---|---|
| `README.md` | UPDATE | Now records the vocabulary/procedure split and the known conflicts with the vendored skills. |
| `uil4b-brand-design/**` | UPDATE | Kept and sharpened. `anti-slop-quality-bar.md` said "the relationship between **Workspace**, Discover, and Learn" — a label `CLAUDE.md` retired and `tests/unit/surface-vocabulary.test.js` guards in shipped copy. Fixed, and the file now states it is vocabulary rather than procedure. |
| `uil4b-surface-review/**` | NEW | The runnable review procedure. |
| Six vendored skills | KEEP | Unmodified upstream MIT text. Their generic advice (Tailwind, 320/768/1024/1440 breakpoints, per-component stylesheets) conflicts with UIL4B; that is resolved by the precedence order in `skills/README.md`, **not** by editing them. |
| 13 imported taste skills | KEEP, SCOPED, **gitignored** | Founder-installed and to be used. Three factual conflicts with this codebase are carved out below; the rest applies. Not edited, not committed. |

## Two build paths, which must not diverge

Findable here because a future agent editing one will not think to check the
other. Both are in `package.json`:

```
build      vite build              && node scripts/prerender.mjs
test:users vite build --mode test  && node scripts/prerender.mjs && playwright test
```

They differ only in `--mode test`, and **both must run the prerender**. This has
already gone wrong once: `test:users` ran `vite build --mode test` *alone*, which
overwrote `dist/` **without** the prerender step. Two things followed, both
silent:

- Running `test:users` before the unit suite skipped every unit test that asserts
  against the built shells — a green run with a quietly smaller count.
- The acceptance suite walked a different artefact from the one production
  serves, so it was not testing what ships.

> **Rule.** If you change how one of these builds, change the other in the same
> commit, or say in the PR why they may now differ. `npm run prerender` exists as
> a third entry point and calls the same script — three callers, one script.

The related trap, which is the same fault seen from the agent's side: **a bare
`npx vite build` writes `dist/` and prints nothing.** The line
`prerender: wrote N route shells + a noindex 404 shell` is the only evidence the
prerender ran at all. Look for the line.

## Imported taste skills — how to use them well here

On 2026-09-03 the founder ran `npx skills add Leonxlnx/taste-skill`, installing
**13 third-party skills**, and said: *"use the tasteskill i just provided to help
also."*

**They are active design input. Use them.** Their substance — obsessive spacing
rhythm, depth and materiality, motion craft, refusal of templated defaults — is
what the founder is asking for, and it agrees with `uil4b-brand-design` rather
than fighting it.

But they were written for greenfield landing pages and they assert things about
"your project" that are **factually untrue of this one**. Those assertions read
as commands, and an agent that obeys them will confidently break working
product. That is the same mechanism this whole file is about.

### The rule

> **Where an imported skill asserts a fact about this codebase, the codebase
> wins. Everywhere else, the skill is live design input.**

That is a narrow carve-out, not a licence to ignore the skill. It applies to
statements of fact — what exists, what is installed, what is on screen — and not
to statements of taste.

`uil4b-brand-design` remains the arbiter when two directions genuinely conflict.

### The three carve-outs, verified

`high-end-visual-design/SKILL.md` opens with *"If your generated code includes
ANY of the following, the design instantly fails"* and then bans three things
this app is built on. Each was checked against source:

| The skill says | This codebase | Use instead |
|---|---|---|
| **"Banned Icons: standard thick-stroked Lucide"** | Lucide is a **live product surface**. `src/utils/iconHandoff.js` sets `ICON_DRAFT_PACK = 'lucide'` with twelve bundled Lucide ids drawn inline on the homepage handoff. | Keep Lucide. Apply the *underlying* point — thick uniform strokes read cheap — which is now actionable, because #303 made icon stroke width mean real pixels. Thin the stroke; do not remove the pack. |
| **"Assume premium fonts like `Geist`, `Clash Display`, `PP Editorial New` are available"** | They are not installed. `global.css:35+` self-hosts **Manrope** (200–800) and **JetBrains Mono** (100–800) as woff2, both preloaded. There is no Geist. | Apply the *typographic intent* — contrast, weight discipline, optical sizing — with the two families that exist. A weight outside the axis is silently clamped. |
| **"Banned Layouts: edge-to-edge sticky navbars glued to the top"** | `.pnav` at `global.css:5191` is `position:fixed;top:0;left:0;right:0` on every page. It is not up for removal on aesthetic grounds. | Apply the *spirit* — a nav should not feel glued on. Elevation, contrast on scroll and hairline treatment are all in scope. |

**A worked example of the trap, from establishing this very table.** The first
citation offered for the Lucide claim was `src/pages/IconLibrary.jsx:46`. That
line does list Lucide first — but **`IconLibrary.jsx` is unrouted**, so it is not
evidence of anything shipped. The real evidence is `iconHandoff.js`. The
conclusion survived; the citation did not. Check the file is reached, every time.

### What applies here without qualification

Most of it. These need no translation and should be treated as guidance:

- Generic 1px solid grey borders, and harsh dark drop shadows.
- Symmetrical three-column Bootstrap-ish grids with no whitespace.
- Repeating the same layout or aesthetic twice in a row.
- `linear` / `ease-in-out` transitions and instant uninterpolated state changes —
  though take the actual values from the named motion scale in
  `css-conventions.md`, which already encodes this.

### Which of the 13 earn a place, and where

Redundancy between imported skills is the same duplication problem as anywhere
else. Load one per job, not several.

| Skill | Use it for |
|---|---|
| **`full-output-enforcement`** | **Anything.** Conflicts with nothing here and is the most broadly useful of the set. |
| **`redesign-existing-projects`** | The best fit for UIL4B's actual shape — it is audit-first and explicitly tries not to break working functionality. Prefer it over the greenfield taste skills for existing surfaces. |
| **`high-end-visual-design`** | Marketing and sales surfaces — the homepage, `/plans`, Discover landing. Apply the three carve-outs above. |
| **`design-taste-frontend`** | Landing pages and redesigns. **Read its own scope line**: *"Not dashboards, not data tables, not multi-step product UI"* — which excludes most of the Create tools. |
| **`minimalist-ui`**, **`industrial-brutalist-ui`** | Direction exploration only. Both are whole aesthetics; adopting either wholesale would replace Design Language V2, which is a founder decision, not an agent's. |
| **`brandkit`**, **`imagegen-frontend-web`**, **`imagegen-frontend-mobile`**, **`image-to-code`** | Image generation and comps. Useful for exploration; they generate references, not shipped code. |
| **`gpt-taste`**, **`stitch-design-taste`** | Largely overlap the above and each other. No independent reason to reach for them; pick one deliberately if you do. |
| **`design-taste-frontend-v1`** | **Skip.** Its own description says it is the superseded version, kept only for exact backward compatibility. |

### Why they are not committed

`.agents/` and the 13 symlinks are **gitignored**, deliberately — the reasoning
is written out in `.gitignore` next to the entries. Short version: the symlinks
carry absolute machine-specific targets and would resolve to nothing anywhere
else, and git on Windows degrades symlinks into plain text files. They are a
package manager's install directory. Reinstall rather than commit:

```bash
npx skills add Leonxlnx/taste-skill
```

**The imported files themselves are not edited.** They are the founder's tooling
and a third-party package; scoping them here keeps `npx skills add` re-runnable.

## The archive location — proposed, not created

The founder asked that obsolete docs be deleted and important ones archived.
**Nothing has been archived or deleted in this pass**, on purpose.

**Proposal: `docs/archive/<original-path>`**, each file gaining a header stating
the date it was archived, why, and where its still-live facts now live.

Why propose rather than do it:

- Git history is already the archive, and `CLAUDE.md` says so — *"do not create
  parallel historical planning docs"*. A `docs/archive/` directory is a real
  change to that policy and is the founder's call, not an agent's.
- #295's rule stands and is right: **migrate first, read the fact back in its
  new home, then delete.** The two QA audits hold roughly forty findings between
  them. Establishing which are still live needs a rendered pass, and five agents
  are moving the source concurrently — any verdict taken today would be stale
  before it merged.

**What has been migrated already**, so the audits are closer to archivable: the
breakpoint bands, the 834px dead zone, the real-device-metrics capture rule, and
the recurring scrollbar-less-rail pattern are now in
`uil4b-surface-review/references/responsive-bands.md`, readable without opening
either audit.

## Keeping this file true

It has the same failure mode as everything it documents. Three defences:

1. **It holds no values.** No counts, no hexes, no route lists — only which file
   to open. Those change far less often.
2. **Every verdict says what evidence produced it**, so the next reader can
   re-check rather than re-derive.
3. **When you find a stale instruction, fix the instruction and add the trap
   here** if it is a new *kind* of trap. Four kinds are listed above. A fifth
   would be worth knowing about.

If this file and the thing it points at disagree, **the thing it points at
wins** — and this file is the bug.
