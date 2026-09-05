# Defect register — the two August 2026 QA audits

**What this is.** Two diagnosis-only audits ran in August 2026 and produced 25
numbered defects between them. Roughly twenty places in this repository — CSS
comments, three Playwright specs, a page component, `.gitignore` — cite those
defects **by number**: `S14, mobile-audit-2026-08`, `N4 (responsive-audit-2026-08)`.

The audits themselves are gone. They were 1,026 lines of diagnosis for defects
that are now fixed and held by regression tests, and their route tables named
pre-#266 URLs (`/color/palette`, `/fontgallery`, `/typescale`) that have been
301s for weeks. This file is what survived: **what each number was, and what
holds it now.** That is the only part any of those citations needed.

Deleted following the rule #295 set and `doc-authority-map.md` records — *migrate
the still-true unique facts out, read them back in their new home, then delete
the spent document.* The audits are in git history if you want the full working.

- `docs/qa/mobile-audit-2026-08.md` — 609 lines, deleted 2026-09-05
- `docs/qa/responsive-audit-2026-08.md` — 417 lines, deleted 2026-09-05

**Where the durable knowledge went**, so this file does not become its second
home:

| The knowledge | Its home now |
|---|---|
| Which widths to test at, the 641–900 band, the 834px dead zone | `.claude/skills/uil4b-surface-review/references/responsive-bands.md` |
| The real-device-metrics capture rule | the same file, plus `capture-artefacts.md` beside it |
| The recurring scrollbar-less-rail pattern, and the full census of it | the `.rail-overflow` comment block in `src/styles/global.css` |
| The two Director decisions the responsive audit's addendum carried | `CHANGELOG.md`, under 2026-08-20 |
| The one defect still awaiting a founder verdict (N5) | `docs/PROPOSALS.md` P-014 |

---

## Mobile audit — `S1`–`S16`

Brief: founder, 2026-08-20 — *"the entire app's mobile UI needs an overhaul.
there are heaps of clipping issues and other things."*

| # | What it was | Held now by |
|---|---|---|
| S1 | Semantic Colours — 7 of 10 tones per ramp hidden behind an invisible scroller, hex values switched off | `24-mobile-overhaul.spec.js` |
| S2 | Semantic Colours — the bundle picker showed 1 of 7 presets with no affordance | `24-mobile-overhaul.spec.js` |
| S3 | Semantic Colours — preset chip rows cut mid-word | `25-defect-sweep.spec.js` |
| S4 | Emoji Library — 9 of 12 category chips off-screen | `25-defect-sweep.spec.js` |
| S5 | Prompt Library — the feedback FAB landed on a filter chip at landscape heights | `25-defect-sweep.spec.js` |
| S6 | Information Centre — the page was 37px wider than a 320px phone, and the excess was thrown away rather than scrolled | `24-mobile-overhaul.spec.js` |
| S7 | Login — the Sign In button cut in half on a landscape phone; sign-up below the fold | `24-mobile-overhaul.spec.js` |
| S8 | Settings — 3 of 5 sections off-screen in a scroller with the scrollbar explicitly deleted | `24-mobile-overhaul.spec.js` |
| S9 | Information Centre — 8 links inside collapsed accordions stayed in the tab order | `24-mobile-overhaul.spec.js`, `25-defect-sweep.spec.js`, and a comment in `src/pages/InfoCentre.jsx` |
| S10 | Sitemap — the feedback FAB sat on a route link at 320px | `25-defect-sweep.spec.js` |
| S11 | **Blocker.** Palette Builder — all 34 per-swatch controls invisible on every tablet and every landscape phone | `24-mobile-overhaul.spec.js`, as `S11b` |
| S12 | Palette Library — five per-card actions invisible on every touch device | `24-mobile-overhaul.spec.js` |
| S13 | The `visibility` reveal was timing-dependent, and the CSS comment explaining it was wrong | `24-mobile-overhaul.spec.js` |
| S14 | Community — the like button on every card invisible on touch | `24-mobile-overhaul.spec.js`, and the `.ch-heart` comment in `global.css` |
| S15 | The primary nav CTA rendered as "tart for Fre" between 769px and ~870px | `24-mobile-overhaul.spec.js`, and the `.pnav` comment in `global.css` |
| S16 | Type Scale — all 9 specimen rows truncated to 192px on a phone | `24-mobile-overhaul.spec.js` for the phone, `25-defect-sweep.spec.js` above 768px |

**The one thing worth carrying forward from its method**, because it decides
whether a pass finds this class of defect at all: run phone viewports with **real
device metrics** — `isMobile: true`, `hasTouch: true`, an iOS user agent — and
verify inside the run that `matchMedia('(hover: hover)')` reports **false**. A
desktop Chromium narrowed to 390px still reports hover capability, and hides
every one of S11 through S15.

---

## Responsive breakpoint audit — `B1`, `M1`–`M6`, `N1`–`N8`

Scope: 16 routes × 17 widths (320 → 1920) at height 900, plus a 390×640
short-viewport pass and a 560→1000px height sweep on Palette Builder.

| # | What it was | Held now by |
|---|---|---|
| B1 | **Blocker.** Palette Builder's colour-system selector completely unclickable at 961–1000px, partially blocked to 1079px | `23-responsive-mid-band.spec.js` |
| M1 | Palette Builder — swatch controls collided on every real phone (height-driven) | `25-defect-sweep.spec.js` |
| M2 | Tint Scale — 1 to 3 of the 11 tint stops invisible at 981–1119px | `23-responsive-mid-band.spec.js` |
| M3 | Type Scale — the specimen column halved at 981px; 6 of 9 rows truncated | `23-responsive-mid-band.spec.js` |
| M4 | Font Pair — the specimen lost 37% of its width at 981px, then more at 1051px | `23-responsive-mid-band.spec.js` |
| M5 | Home — palette swatch buttons overlapped and printed **invalid** hex values (`#9826`, `#C751`) at 320–399px | Fixed: `.hw-pal-copy` gained `min-width:0`, plus 360px and 320px overrides in `global.css`. Homepage-scoped, so deliberately **not** in the sweep spec |
| M6 | Gradient Library — every gradient name and meta line truncated at 450–579px | `25-defect-sweep.spec.js` |
| N1 | Font Gallery — 7 family names truncated at 320px | `25-defect-sweep.spec.js` |
| N2 | Gradient Generator — stop hex inputs clipped their value in two narrow bands | `25-defect-sweep.spec.js` |
| N3 | Palette Builder — swatch name clipped at 480px | `25-defect-sweep.spec.js` |
| N4 | Discover / Learn — the tool-map tooltip overflowed the page container below 400px | `25-defect-sweep.spec.js` |
| N5 | Icon Library — long names truncate at **every** width; 51 to 75 labels at any given width. Width-invariant, so a content-density decision rather than a breakpoint fault | **Still open.** `docs/PROPOSALS.md` **P-014** |
| N6 | Home — the workbench tab strip hid 3 of 5 tabs at 320px with no scroll affordance | Fixed by the shared `.rail-overflow` utility; the census in that comment block records it |
| N7 | File Converter — the 3D converter pill wrapped to two rows below ~430px | **Not held by a test.** Purely cosmetic; every control stayed reachable and full size. #318 rebuilt that band's toolbar layout, so it may already be gone — **measure before assuming either way** |
| N8 | WCAG 2.5.8 — eight interactive controls under 24px, at every width | Partly. `25-defect-sweep.spec.js` holds the Palette Builder targets and the tonal ramp. The audit's full list was measured in August and has **not** been re-measured since — treat it as a lead, not a status |

**One genuine positive, worth keeping.** Across 16 pages × 17 widths there was
**no horizontal page scrolling anywhere**, and nothing escaped the document.
Every defect above was *inside* a container. The page-gutter token system held,
and it is still the first thing to check when something does overflow.

---

## If you want to run this again

Both audits used the same method, and it is the method — not the defect list —
that was worth keeping: build, preview, then drive it with Playwright/Chromium at
the widths in `responsive-bands.md`, **measuring rendered geometry rather than
reading the DOM**.

That last part is load-bearing, and it is why these audits found what code review
had not: a swatch row collapsed to 24px still contains all seven of its buttons
at their full 32×32 CSS size — they simply sit on top of each other. A truncated
font name still reports its whole string in `textContent`. A chip row that has
scrolled its last option 1,160px out of view still has that option in the tree.
Nothing in the three specs above counts nodes or reads text; they measure boxes,
hit-test points, and compare a label's own DOM Range against the box that is
supposed to contain it.

**The screenshots those audits cited (`docs/qa/screenshots/…`) were never in the
repository and still are not** — 11 MB of PNGs that go stale the moment the
stylesheet they document changes. They are gitignored deliberately. Regenerate
them with a build plus a preview run. The similarly named
`docs/qa/screenshots-mobile/` **is** tracked, and is a different thing.
