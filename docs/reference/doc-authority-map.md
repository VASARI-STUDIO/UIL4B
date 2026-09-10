# Doc authority map

> Reference doc for UIL4B. Linked from `CLAUDE.md`. **Read this before trusting
> any other document in this repository.**
>
> It answers one question: *for the thing I am about to do, which file is
> authoritative, and which files look authoritative but are not?*

Written 2026-09-03 in response to the founder: *"review our subagent MD files
and our other MD files to ensure nothing is stale as i feel like we have been
going in circles sometimes."*

**Revised 2026-09-05**, on the founder: *"clean up old docs update all docs with
recent information also when leaving information for me or questions make sure to
make them easy to understand as i dont have lots of time to figure out what you
are asking."* That pass deleted the two QA audits, re-verified the three homepage
documents rather than deferring them again, rewrote `OWNER-ACTIONS.md` for a
reader in a hurry, and added the fifth trap below.

**Revised 2026-09-10**, on the founder: *"clean up the documents."* That pass
checked every claim in `docs/` against the code rather than against the
previous version of the document, found **failure mode 6 for the second time**
(below), gave the five August documents a dated status header, closed two
proposals the founder had already answered, and added
`tests/unit/doc-file-references.test.js` — the first thing in this repository
that fails when a document names a file that is not there.

**Revised 2026-09-06**, on the founder: *"also complete a document review"* and
*"make sure we get this app in a nice tidy round state so i can continue from that
point with a new round of changes."* That pass ran the gate before writing
anything, checked every figure and every named file against `5c6603a`, added the
`public/` section this map never had, added `RELEASE-READINESS.md`, and added the
sixth trap below — which is the first one whose cost lands on the founder rather
than on an agent.

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
| Ideas awaiting a founder verdict | `docs/PROPOSALS.md` | — no agent may claim a verdict not written on the verdict line. **Check it before asking:** five entries were answered on 2026-09-05 and re-asking one is the exact friction the founder complained about |
| Founder-only console / credential work | `docs/OWNER-ACTIONS.md` | — |
| Agent roles, tools, evidence classes | `.claude/agents/README.md` | — |
| What real content exists, and what must never be fabricated | `PRODUCT.md`, "Evidence on Hand" | Any surface's own copy — a mock-up is a claim |
| Durable product truth for the `impeccable` skill's commands | `PRODUCT.md` | It for values, routes or the backlog; it links to those |
| Which skill to load | `.claude/skills/README.md` | — |
| How to use the imported taste skills here | **This file**, "Imported taste skills" below | Those skills' own claims about what fonts and icon packs are "available" |

## The failure modes, and what to do about each

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

> **Guarded since 2026-09-10, for half of it.**
> `tests/unit/doc-file-references.test.js` reads every `.md` under `docs/`
> plus `README.md` and `CLAUDE.md`, pulls out every repo-rooted path in
> backticks, and fails the build if the file is not on disk. It found
> `api/_lib/aiGeneration.js` missing from `architecture.md`'s helper list on
> its first run.
>
> **It does not close the whole failure mode, and the gap is the dangerous
> half.** A path that exists is not a path a route reaches — `IconLibrary.jsx`
> and `EmojiLibrary.jsx` would both pass this test. Grepping for the import is
> still the rule.
>
> Documents that name a deleted file **because it is deleted** are carried in
> the test's `TOMBSTONES` list, one entry each with its reason. That is the
> `CHANGELOG.md` case above, written down instead of remembered.

**3. Two documents answering the same question differently.** Nobody notices,
because each reader opens only one.

> **Rule.** One home, everything else links. If you find a second copy, delete
> the copy — do not reconcile it, or you will have two documents that agree
> today and disagree next month.

**4. Advice that was true before a refactor.** The most dangerous kind, because
it was correct when written and reads as authoritative.

> **Rule.** When a doc describes a *gap*, check the queue item it names before
> acting. The 404 paragraph pointed at an item that had read `done` for weeks.

**5. A status signal that means one thing and reads as another.** Found
2026-09-05 and new in kind, because nothing in this file is wrong — the *tool* is.
GitHub Actions stopped starting jobs on 2026-09-04 for a **billing** reason, so
`gh pr view` reports every open PR as **`UNSTABLE`**. `UNSTABLE` reads as "the
code is broken". It means "the gate never ran". Any agent or human triaging by
check status draws the exact wrong conclusion about **every open PR at once**,
and the honest signal — a local gate run — is invisible on the PR.

> **Rule.** A red or amber check is evidence only if you have confirmed the check
> *ran*. When CI is down, the only evidence a change is green is a local
> lint/build/test:unit/test:users run pasted into the PR body, and the reviewer
> has to be told to look there. The state is on the App condition board in
> `src/data/pipeline.js` (`ci` and `deploy`) and is an owner action in
> `docs/OWNER-ACTIONS.md` §1.

**6. An instruction to a human that cannot be carried out.** Found 2026-09-06,
and new in kind because the cost lands on the founder rather than on an agent.
Failure mode 2 is an agent editing a file no route reaches — it wastes a pass and
somebody notices. This is `OWNER-ACTIONS.md` §4.5 telling the founder to *“open
the AI Image Prompt Generator and generate one prompt”*: `/create/ai-prompt` is
badged **Soon** and renders the workshop state, so there is no button anywhere on
the site that does it. He would open the page, find nothing to click, and have no
way to tell a broken runbook from a broken product.

The consequence was worse than a wasted trip. That tool is the **only** caller of
the OpenRouter path — the live Alt Text tool runs on Gemini — so the account has
been paying for a provider no visitor can reach, and the Admin panel that would
have reported it correctly said “no generations to judge by” the whole time.

**This item had already failed this way once.** `openrouter-path-verification` in
`pipeline.js` records the previous version asking for a confirmation the
diagnostic could not give, and calls that “the silent failover reproduced inside
the procedure meant to catch it.” The rewrite fixed *which fact* to look for and
not *whether the founder could get at it*.

> **Rule.** A runbook step is only real if the surface it names is reachable
> **today, by the person it is addressed to**. Before writing “open X and do Y”,
> check X's `soon` flag and grep that a route mounts it — the same check failure
> mode 2 demands, applied to instructions rather than to code. If it is not
> reachable, the item is a decision, not a task, and must say so.

> **It happened again, and this time nobody noticed for three days.** Found
> 2026-09-10. `OWNER-ACTIONS.md` §2.1 asked the founder to pick a homepage hero
> shape by opening `?hero=a`, `?hero=b` or `?hero=c`. **He had retired that
> exploration on 2026-09-07** — *"Retire it, V2 hero decides"* — and the three
> sketches and the switch that served them were deleted from `src/` in the same
> change. `Home.jsx` and `TryItMark.jsx` both carry a comment saying so. So the
> item was impossible *and* already answered, and it stayed on his to-do list
> through four merged pull requests, one of which (#439) re-derived "the hero
> shape is still open" from a proposal rather than from the code.
>
> **What makes this different from the §4.5 instance** is that the surface did
> not merely become unreachable — **the founder himself closed the question**,
> and the document went on asking it. `PROPOSALS.md` P-006 was `PENDING` the
> whole time too.
>
> **Rule, extended.** Before writing "open X and do Y", check that X is
> reachable — and before leaving an open question standing, grep the code for
> the thing it asks about. A deleted feature flag is an answered question.
> `git log -S` on the identifier finds the commit that answered it, and its
> message usually carries the founder's own words.

The same shape, one layer out: **everything merged since #295 is not deployed**.
"Merged" is not "live", and no document said so until this one did. Anchored to a
PR rather than counted — the count was wrong within the hour of being written,
when #374 landed.

> **Updated 2026-09-06, and the cause turned out to be different from the
> message.** Vercel's own answer was *"Deployment rate limited — retry in 24
> hours"*, which reads as a transient throttle that waiting clears. Waiting did
> not clear it. The real constraint is **Fast Origin Transfer**: `dist/assets`
> was 35 MB and 32,129,114 bytes of that was one file,
> `ffmpeg-core-<hash>.wasm` — 91% of the whole deployable byte-mass — which is
> re-hashed on every deploy, so every edge region re-fetches all 32 MB after
> each one. Roughly 300 region-first-hits exhausts the Hobby plan's 10 GB month.
> The fix (serve the engine from jsDelivr, pinned) is in flight on
> `perf/ffmpeg-core-off-origin`; the account-side decision is
> `OWNER-ACTIONS.md` §1.1.
>
> **The trap, and it is a variant of #5.** A platform's error message named a
> symptom with a plausible remedy attached to it, and the remedy was wrong. Two
> documents repeated the message as the diagnosis for four days. **When a
> vendor's message tells you to wait, check what is actually being metered
> before you wait.**

## Per-file register

Verdicts from this pass. **KEEP** = accurate and needed · **UPDATE** = fixed here
· **ARCHIVE** = spent, propose moving · **DELETE** = obsolete, nothing unique.

### Root

| File | Verdict | Why |
|---|---|---|
| `CLAUDE.md` | UPDATE | Accurate. Gains a link to this map. |
| `README.md` | **UPDATE 2026-09-06** | Named three deleted components in its structure block (`Sidebar`, `TopBar`, `Dashboard`), pointed the colour tools at the pre-#266 `/color/*` prefix, and called Learn "an honest coming-soon surface … the articles do not yet" exist — five had shipped by then and **seven have now** (`LEARN_ARTICLES` in `src/data/learnIndex.js`; the same figure went stale in `llms.txt` and in `RELEASE-READINESS.md`, which is why no document should carry it). Also said "four unit tests read the prerendered shells" and it is six; now names the files. |
| `CHANGELOG.md` | KEEP | Historical record. It names seven files that no longer exist — correctly, because it is the record *of* their deletion. Do not repair those as broken links. |
| `PRODUCT.md` | NEW | Written by `$impeccable init` (2026-09-04). The durable product record every other Impeccable command reads. Deliberately short: it **links** for positioning, routes, tokens, gate and backlog rather than restating them. What it OWNS is `## Evidence on Hand` — the counted list of real content and, more importantly, the list of things this product has never had and no surface may invent. Also records the deliberate refusal to write a `DESIGN.md`, because `global.css` and `design-language-v2.md` already own that ground and every doc table of design values here has drifted at least once. |

### `public/` — the documents strangers read

**This section did not exist until 2026-09-06, and its absence was the bug.**
Every table above covers documents *we* read. `public/llms.txt` is a document
**other people's crawlers read**, it ships in the deploy, and nothing in this map
had ever assigned it an owner.

| File | Verdict | Why |
|---|---|---|
| `public/llms.txt` | **GENERATED 2026-09-08** | **Now derived, not written.** `scripts/llms-txt.mjs` writes it from `src/data/positioning.js` (the summary line, by `SURFACE_LINE.llmsSummary`), `scripts/site-pricing.mjs`, `src/config/plans.js`, `aiGeneration.js`, `exportFormats.js`, `planLadder.js`, the tool tree, `learnIndex.js` and `routeMetaMap.js`; `npm run sync:llms` regenerates the committed copy and `scripts/prerender.mjs` writes the served one from the same function. `tests/unit/llms-txt-truth.test.js` fails the build on drift or on any composed number that is not the server-enforced figure. By 2026-09-08 the hand-typed file had drifted again — the Brand Starter missing while "UI Auto-Builder" sat under not-yet-built, "five guides" against seven, a summary selling design-token exports that are not live — which is the record that prose does not go stale loudly. **History, 2026-09-06:** Four faults, all of the kind this map exists to catch. (1) **It quoted `$4.99/mo` — a pre-ladder price — twice**, one of them labelled AUD over a USD ladder. This is the *same defect* `index.html` had, recorded as fixed under `seo-per-route-share-and-schema`: "the only price a non-JS reader could see stayed pre-ladder for weeks." The fix there was to generate the figure from `planLadder.js`; `llms.txt` was never brought into that fix. (2) Its whole **Documentation** section pointed at five `/docs-*` URLs that are **301s to `/learn`**, not pages. (3) It listed four **Soon** tools as live. (4) It linked `/#pricing`, an anchor that exists nowhere in `src/`. Now mirrors the generated `index.html` sentence and the real `/learn` guides. |

> **Closed 2026-09-08.** The guard this paragraph asked for exists:
> `tests/unit/llms-txt-truth.test.js` ties every number `llms.txt` composes to
> `planLadder.js`, `plans.js` and `aiGeneration.js`, and asserts the committed
> file is the generator's output. Nothing else in `public/` is guarded that
> way; `sitemap.xml` and `previews/cards.json` have their own drift tests.

### `docs/reference/`

| File | Verdict | Why |
|---|---|---|
| `architecture.md` | **UPDATE 2026-09-10** | Its typed `api/_lib` helper list had gone stale a second time — `aiGeneration.js` missing — in the very paragraph that names `moderators.js` as proof the list goes stale. Replaced with `ls api/_lib`. The `api/` cap of 12 stays written, because a test fails when *that* one is exceeded. **2026-09-06:** | Three claims the code contradicted on 2026-09-05, fixed then. Three more today: it still listed the deleted `Landing.jsx` as a live shell, omitted `LearnArticle`, `PaletteGallery` and `CuratedResources`, and said the `/docs-*` redirects stood “until the Learn content library ships” — which it has. `api/_lib/moderators.js` was missing from the helper list a week after #390 added it. |
| `build-and-verify.md` | UPDATE | Sole home of the gate. Its hand-carried counts were removed by **#312**, which landed while this pass was running and restated every row as a *property* — 0 errors, 0 failures, 0 skipped. `tests/unit/gate-doc.test.js` now fails CI if a count comes back. This branch deliberately did not touch the counts, so the two passes did not collide; only the duplicated breakpoint row was changed here. |
| `css-conventions.md` | UPDATE | Now owns the widths-to-test question, and names 640px and the 641–900 band. |
| `positioning.md` | **UPDATE 2026-09-10** | Canonical story; its Workspace/Create naming note is explicit and correct. **Carries one flagged contradiction and it is the founder's to settle, not an agent's:** its founder-approved 2026-08-20 line says every export format is free with a visible credit, and `src/config/exportFormats.js` marks `book` and `guidelines` `pro: true`, with `/plans` and `Home.jsx` printing them as what Pro adds. Both claims are kept, both flagged, neither edited to match the other — `OWNER-ACTIONS.md` §2.3. Its "Export & Handoff" list also names two `live: false` formats and one that does not exist; marked as intent rather than inventory. |
| `murphys-law.md` | UPDATE | Carried a third breakpoint answer; now links to the one home. |
| `constants-and-config.md` | **UPDATE 2026-09-06** | This row said "Verified against source — admin email, brand hexes, contrast tokens all match". The admin email and the brand hexes did. **The contrast-token table did not, and all eight of its values were wrong** — it carried a cool grey ramp against a stylesheet that has shipped a warm one since Design Language V2. The table is deleted and replaced with the one-line `grep` that answers it, per the #312 pattern. **Verifying a table and verifying one row of it are not the same act**, and a verdict of "verified" that covers a table nobody re-checked is worse than no verdict, because it stops the next reader looking. |
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
| `PROPOSALS.md` | **UPDATE 2026-09-10** | Founder verdict queue. Two entries were still `PENDING` after he had answered them: **P-006** (the hero — he retired the shape exploration on 2026-09-07 and approved the assembled headline on 2026-09-10) and **P-012** (the parked homepage PRs — he closed all three on 2026-09-10). Both resolved, both added to the Resolved table, and P-006's dead `/?hero=a\|b\|c` instruction removed. **P-023 was re-checked and is genuinely open**, so it stays. |
| `RELEASE-READINESS.md` | **UPDATE 2026-09-10** | Cross-checked against the corrected `OWNER-ACTIONS.md`. Three defects: "Learn is live — five published guides" against seven in `learnIndex.js`; a JDK row reporting the rules suite at **37 pass** while §1 of the same page reported **105**; and "the moderator role works everywhere except the two files in §1.3" — §1.3 covers four files and deliberately does **not** cover `api/verify-admin.js`, so after the command the rules understand a moderator and nothing can appoint one. Items 3 and 11 were also the same command listed twice with different times. **2026-09-06:** | One page answering “can we release?” — what is done (measured, with the command beside each figure), what is blocked on the founder, and what is blocked on an outside service. It **owns nothing**: the gate stays `build-and-verify.md`, the to-do list stays `OWNER-ACTIONS.md`, the queue stays `pipeline.js`. Written because the founder asked for the app “in a nice tidy round state” and no single document answered that question. |
| `OWNER-ACTIONS.md` | **RE-VERIFIED 2026-09-10** | Every item checked against the code. §2.1 closed (failure mode 6, above) and moved to §3; §1.1's "in flight" ffmpeg claim, §1.3's Java promise and §4.6's incomplete instruction corrected; six founder decisions surfaced by the #429–#439 audits added as §2.3–§2.6; the two sentence lists reconciled into one §2.2 with the file beside each slot. **2026-09-05 / 2026-09-06:** | Founder-gated actions, restructured on the founder’s instruction that our writing takes too long to parse. Every item carries Do / Time / Why / If you do nothing. §1 is what is stopped, §2 is the short list of what still needs him, §3 is the ten decisions he made on 2026-09-05 **restated so no agent asks twice — `CHANGELOG.md` remains their canonical home**, §4 onward is console work. `tests/unit/ai-provider-path.test.js` still pins the OpenRouter procedure. |
| `build-plan/tool-tree.md` | KEEP | Derived from `toolTree.js` and says so. |
| `design/homepage-spec-2026-08.md` | **MARKED SUPERSEDED 2026-09-10** | Now carries a dated status header saying it is a record, not a spec, and naming what is authoritative instead. The hero-shape pick it was being held for was answered on 2026-09-07, and #270/#269/#264 were all closed on 2026-09-10 — so the deletion condition below is met **except** that it is still the cited evidence for **P-011**. Delete it in the same commit that closes P-011. **2026-09-05:** | Still a live spec, but its consumer list has changed and the old one would mislead. #262 **merged**. #269 is **empty** (C2 shipped as #363) and closable. #264 **cannot be rebased** — it edits `src/components/TopBar.jsx`, deleted from `main`. **#270 was salvaged by #401 on 2026-09-06** — nine of its thirteen items were already solved elsewhere, and only its specimen band is still held, on the founder’s hero-shape pick (P-006). **Deletable when that pick lands**, and not before. |
| `design/anti-slop-and-hero-2026-08.md` | **MARKED SUPERSEDED 2026-09-10** | Now carries a dated status header. Its subject — the homepage "once #262 and #264 land" — never existed, because #264 never landed and is now closed; that is also why it names `src/data/homeGallery.js`. Its Option A hero line was never approved and is now one of the rejected headlines `56-founder-rejected-headlines.spec.js` walks. **P-006 is resolved, so three of the four proposals that pinned this file are down to P-008, P-009 and P-010.** **2026-09-05:** | Same correction. Two things keep it alive rather than one: §2.3 is the spec for #270’s specimen band, and §2.12 is the source of `PROPOSALS.md` P-006, P-008, P-009 and P-010 — four open founder verdicts, each of which names a section of it as its evidence. **Do not delete while those are PENDING**, or four proposals lose their evidence line. (P-011 cites the spec, not this file.) It still references `src/data/homeGallery.js`, which does not exist on `main` and now never will, since #264 is not landing; read it as a spec, not a description of `main`. |
| `design/motion-reference-2026-08-23.md` | **KEEP, marked 2026-09-10** | Founder-supplied reference; frames deliberately uncommitted. Now carries a header saying it is **live, not superseded** — it records taste, which nothing in the product can date. The only August document in that category. |
| `research/homepage-patterns-2026-08.md` | **MARKED SUPERSEDED 2026-09-10** | Now carries a dated status header, including the instruction to open a capture before citing it. Its two consumers are both superseded records, so it goes in the same commit as the last of them. **2026-09-05:** | 1,371 lines, 95 Mobbin captures. Checked for deletion this pass and **kept**: it is the cited Inputs line of `homepage-spec-2026-08.md` and the Sources line of `anti-slop-and-hero-2026-08.md`, both of which are still live. Deleting it would leave two live specs citing nothing. **Delete it in the same commit as those two**, not before — it has no other consumer. |
| `qa/mobile-audit-2026-08.md` | **DELETED 2026-09-05** | 609 lines of diagnosis for defects that are fixed and held by `24-mobile-overhaul.spec.js` and `25-defect-sweep.spec.js`. Its route table named pre-#266 URLs. |
| `qa/responsive-audit-2026-08.md` | **DELETED 2026-09-05** | 417 lines, same reason, held by `23-responsive-mid-band.spec.js` and `25-defect-sweep.spec.js`. Its Director addendum carried two decisions that existed nowhere else; those moved to `CHANGELOG.md` under 2026-08-20 **before** the delete. |
| `qa/defect-register-2026-08.md` | **KEEP, marked 2026-09-10** | Re-checked: the citations it exists to resolve are still in the tree, so it still earns its place, and it now says so in a dated header. The two deleted audit paths it names are its subject and are carried as tombstones in `tests/unit/doc-file-references.test.js`. **2026-09-06:** | What replaced the two above, at 117 lines instead of 1,026. Roughly twenty CSS comments, three specs, a page component and `.gitignore` cite those audits **by finding number** (`S14`, `N4`); this is what each number was and what holds it now. Migrate-then-delete, per #295. |

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

## A stranded documentation branch, adjudicated 2026-09-10

`docs/consolidation` (three commits, never pushed, worktree
`.claude/worktrees/docs-consolidation`). **Verdict: write it off. Nothing was
brought forward.** Written down here because a branch that touches `CLAUDE.md`
and `README.md` looks worth reviving until you check its base.

**Its merge-base is 2026-07-30 — 266 commits behind `main`.** That single fact
settles most of it:

- **Every document it deletes was already deleted**, by another route:
  `V1-READINESS.md`, four files under `docs/audit/`, `build-plan/roadmap.md`,
  `google-sheets-setup.md`.
- **Every document it edits most heavily no longer exists.** `docs/BUILD-PLAN.md`
  and `docs/DECISIONS-NEEDED.md` are *modifications* on that branch, and `main`
  deleted both **deliberately** in #208, "docs: the Director model, and one home
  per fact" — a week after the branch forked. Rebasing it would resurrect the
  two files that pass existed to remove, and its `CLAUDE.md` and `README.md`
  hunks are mostly pointers to them.
- **The two edits worth having are already on `main`.** Its `README.md` fix to
  the Google Sheets row (dropping the dead `docs/google-sheets-setup.md` link,
  adding `GOOGLE_SHEETS_WEBHOOK_SECRET`) and its `discover.md` corrections
  (Workspace → Create, and the 2026-07-31 Firebase architecture note) are both
  in the tree today, arrived at independently. Checked line by line, not
  assumed.
- **Its `api/support.js` hunk is product code** and was not read as part of a
  documentation pass.

**Do not recreate `docs/BUILD-PLAN.md`.** `CLAUDE.md` already says *"do not
create parallel historical planning docs"*, and the job that file used to do is
now split across `PRODUCT.md`, `RELEASE-READINESS.md`, `src/data/pipeline.js`
and this map — one home per fact, which is the whole point of #208.

---

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

### What happened on 2026-09-05

**The two QA audits were deleted, and no `docs/archive/` directory was created.**
The proposal above still stands unadopted, and this pass is the argument that it
should stay unadopted: everything worth keeping fitted in 117 lines beside the
code that cites it, which is a better home than a directory nobody opens.

The procedure was #295’s, in order:

1. **Establish what still cites them.** Twenty places, and almost all cite by
   *finding number* rather than by path — `S14, mobile-audit-2026-08` in a CSS
   comment, `N4 (responsive-audit-2026-08)` in another. That decided the shape of
   the successor: an index of numbers, not a summary of prose.
2. **Establish what is still true.** Every one of the 25 findings was checked
   against `main`, not against the audit. Two of the "open" ones turned out fixed
   — M5 (`.hw-pal-copy` has `min-width:0` now, with 360 and 320 overrides) and N6
   (`.hw-tabs` is on the shared `.rail-overflow` utility). One is genuinely still
   open (N5, which is `PROPOSALS.md` P-014) and one is unverified (N7).
3. **Find what exists ONLY there.** The responsive audit’s Director addendum
   held two accepted decisions — the toolbar wrap and the 1344px/940px threshold
   — recorded nowhere else in the repository. Those moved to `CHANGELOG.md`
   first. **This is the step that would have lost something**, and it was found
   only by reading the tail of the file rather than its finding list.
4. **Delete, then read the facts back in their new home.**

The three homepage documents were assessed the same way and **kept**, with the
condition that makes each deletable written into its row above. "Archive later"
is not a verdict; "delete in the same commit as #270" is.

## Keeping this file true

It has the same failure mode as everything it documents. Three defences:

1. **It holds no values.** No counts, no hexes, no route lists — only which file
   to open. Those change far less often.
2. **Every verdict says what evidence produced it**, so the next reader can
   re-check rather than re-derive.
3. **When you find a stale instruction, fix the instruction and add the trap
   here** if it is a new *kind* of trap. Six kinds are listed above. The fifth,
   added 2026-09-05, is the first where the repository is right and an external
   tool is the thing lying. The sixth, added 2026-09-06, is the first whose cost
   lands on the **founder** rather than on an agent — an instruction addressed to
   him that no reachable surface could satisfy. A seventh would be worth knowing
   about.

If this file and the thing it points at disagree, **the thing it points at
wins** — and this file is the bug.
