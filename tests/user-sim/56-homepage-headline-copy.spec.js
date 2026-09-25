// The homepage headlines the founder rejected BY NAME, and the one he kept.
//
// ── Why this file exists ────────────────────────────────────────────────────
//
// PR #264 (`feat/home-copy-sections`, parked since August, 144 commits behind
// and unmergeable — see [homepage-parked-prs-triage]) claimed one thing that
// needed no design authority to be worth keeping: "the rejected headlines
// cannot return". That test never landed, and in the year since, the workbench
// heading alone has been through THREE versions, two of which the founder
// rejected in his own words. Nothing in the repo stopped a fourth attempt from
// landing on a sentence he had already thrown out.
//
// So this is the half of #264 that carries no copy judgement at all. It does
// not decide what any heading should say — three of the four slots below are
// live copy decisions the founder still owns, and this file deliberately pins
// none of them. It pins only what he has already ruled OUT, quoting him.
//
// ── The four strings, and the founder quote that retired each ───────────────
//
// Each `line` below is reproduced inside the founder's own complaint, which is
// why it is safe to make it a build rule: he did not paraphrase these, he
// quoted them back. Sources are `docs/design/homepage-spec-2026-08.md` (the
// complaints are verbatim; note that the REPLACEMENT copy in that file is
// agent-authored "Option 1 — RECOMMENDED", not his) and the comment block
// above `#hsteps-title` in `src/pages/Home.jsx`, which records the 2026-09-05
// rejection that produced today's version.
//
// ── EVERY ABSENCE IS PAIRED WITH A PRESENCE ─────────────────────────────────
//
// `toHaveCount(0)` and "the string is not on the page" are both trivially true
// of a page that rendered nothing, and the homepage has form here: the h1
// assertion this suite carried until #394 was satisfied by a word that never
// varied, so it passed for every possible headline including the one it was
// written to catch. So each test below proves the page arrived (expectRendered
// reads the route's OWN character count and fails on the ErrorBoundary card),
// then proves the slots still carry a headline, and only then proves which
// sentences those headlines are not.

import { test, expect } from './base.js'
import { go, watch, expectRendered } from './helpers.js'

// The heading slots the front door still has. A rejected line is only half the
// rule — the other half is that the page still says SOMETHING in its headings,
// so deleting a heading can never be the way this file goes green.
//
// ─────────────────────────────────────────────────────────────────────────────
// THESE IDS MOVED WITH THE ROUTE SWAP, AND THE RULE DID NOT
// ─────────────────────────────────────────────────────────────────────────────
// The four sentences below were rejected for what they SAY, not for the element
// they sat in, and the founder's ruling does not expire because a page was
// rebuilt — a page he has not read is exactly where a retired sentence comes
// back. So the absence sweep is unchanged and still runs over the whole of
// <main>; only the presence control had to be re-pointed.
//
// Home.jsx's `#hsteps-title` / `#htools-title` / `#hcomm-title` are gone with
// the page. Their successors on Spectrum, where one exists:
//   · #hsteps-title (the tools/workbench heading)  → #sp-bench-h, which renders
//     `SURFACE_LINE.toolsSectionHeading` — the design's line for that section, and
//     the slot both rejected workbench headings were aimed at.
//   · #hcomm-title  (the community showcase)        → #sp-disc-h, the library
//     section. "Systems worth stealing." was rejected in this slot.
//   · #htools-title (the six-category strip)        → NOTHING. Spectrum has no
//     category strip; the bench is one rail of five groups. The sentence stays
//     in REJECTED regardless, because the sweep is over the page, not the slot.
//
// Listed as the page's full set of section headings rather than as two, because
// the control is "the front door still headlines its sections" and naming all
// of them makes a quietly deleted section fail here too.
//
// The pricing and FAQ headings are on /plans (the Pricing screen), not the
// landing, and the design's proof band has a heading.
const SLOTS = ['sp-bench-h', 'sp-disc-h', 'sp-spec-h', 'sp-proof-h', 'sp-close-h']

const REJECTED = [
  {
    slot: '#hsteps-title',
    line: 'Not a screenshot. The actual tools, running here.',
    quote: 'i dont like "Not a screenshot. The actual tools, running here." this just '
      + 'sounds stupid — founder, homepage-spec-2026-08.md §3.5',
  },
  {
    slot: '#hsteps-title',
    line: 'Everything below is the real tool. Use it.',
    quote: '"MEGA AI generated this is horrible copy" — founder, 2026-09-05, recorded in '
      + 'the comment above #hsteps-title in Home.jsx and in [home-mini-tools-fidelity]',
  },
  {
    slot: '#htools-title',
    line: 'Six categories. One account.',
    quote: '"Six categories. One account." … this section makes me feel like skipping '
      + 'over it — founder, homepage-spec-2026-08.md §5',
  },
  {
    slot: '#hcomm-title',
    line: 'Systems worth stealing.',
    quote: '"Systems worth stealing." is bad copy. this whole section is to showcase the '
      + 'community gallery so pivot towards that — founder, homepage-spec-2026-08.md §6',
  },
]

// `textContent`, not `innerText`, and the reason SURVIVED the route swap
// intact — only the attribute's name changed.
//
// MEASURED, NOT ASSUMED: every section block on the front door carries
// `data-sp-reveal` (Home's `data-reveal` before it), which spectrum.css starts
// at `opacity:0` and hands to a scroll observer, so `toBeVisible()` on a
// section heading fails on a freshly loaded page. An innerText rule here would
// be evadable by the worst possible means: a rejected sentence could come back
// below the fold and this file would call the page clean.
//
// The two rules want different subjects and that is correct. "Do not SELL with
// this word" is about what is read, so it reads innerText. "The founder threw
// this sentence out" is about what the page SAYS, full stop — reveal state,
// scroll position and viewport cannot make a retired headline acceptable — so
// it reads the DOM.
//
// ONE CONSEQUENCE OF <SpectrumWords>, and it is harmless here: every headline
// it paints appears TWICE in textContent — once in the `.sr-only` sentence and
// once as the per-word visual split. This sweep only ever asks whether a
// retired string is present, so a doubled haystack changes nothing; a test that
// wanted the sentence itself must read the words (see 73-hero-headline-new-account).
const homepageText = async (page) =>
  flatten(await page.locator('#main').evaluate((el) => el.textContent || ''))

function flatten(s) {
  return s.replace(/\s+/g, ' ').toLowerCase()
}

test.describe('homepage copy the founder has already ruled out', () => {
  test('no headline the founder rejected by name is back on the page', async ({ page }) => {
    watch(page, 'the founder re-reading his own homepage')
    await go(page, '/')

    // POSITIVE CONTROL 1 — the route rendered its own content and is not the
    // ErrorBoundary card. Without this, every absence below is free.
    await expectRendered(page, '/')

    // POSITIVE CONTROL 2 — the three slots still carry a headline. This is the
    // pairing the absences need: it makes "delete the heading" a FAILURE
    // rather than the cheapest way to satisfy this test. Presence and length,
    // not visibility — see the note on `homepageText` above for why visibility
    // is the wrong subject for this rule and is asserted elsewhere.
    for (const id of SLOTS) {
      const heading = page.locator(`h2#${id}`)
      await expect(heading, `#${id} is not on the homepage at all`).toHaveCount(1)
      const text = (await heading.evaluate((el) => el.textContent || '')).trim()
      expect(text.length, `#${id} rendered an empty heading`).toBeGreaterThan(10)
    }

    const said = await homepageText(page)
    // POSITIVE CONTROL 3 — and the page has real prose in it, so a substring
    // search over it means something.
    expect(said.length, 'the homepage rendered no text at all').toBeGreaterThan(2000)

    for (const { slot, line, quote } of REJECTED) {
      expect(
        said.includes(flatten(line)),
        `"${line}" is readable on the homepage again. The founder rejected this exact `
        + `sentence in ${slot}: ${quote}. If it is being brought back deliberately, that `
        + 'is his call to reverse, not a test to edit.',
      ).toBe(false)
    }
  })

  // ── C11 IS GONE WITH THE SECTION IT NAMED. What replaced it, and why ──────
  //
  // WHAT THE DELETED TEST GUARDED. `section.hcomm` — the "starting points"
  // strip of six inward cards — carried `aria-labelledby="hcomm-title"`, and
  // "Start from something that already works." was the one line of #264's
  // C8–C13 copy batch that ever reached main. The test pinned that sentence
  // through the section's ACCESSIBLE NAME rather than by reading the h2,
  // because the text alone is not the wiring: reading `#hcomm-title` directly
  // still passes with the `aria-labelledby` deleted, which is exactly the
  // failure that costs a screen-reader user the section's name.
  //
  // WHY IT IS GONE. Home.jsx is deleted and Spectrum has no starting-points
  // strip: the front door's "somewhere to begin" is now the bench (five tool
  // panels, each ending at the real tool) and the Discover grid (five real
  // library rows out of CURATED_LIBRARY_PALETTES / GALLERY_GRADIENTS). The
  // sentence was never the founder's — it was an agent line from a parked PR —
  // so there is nothing of his to carry forward, and re-pointing a copy pin at
  // a heading he has not ruled on would invent an approval. Founder's call on
  // the page, taken 2026-09-22 with the route swap.
  //
  // WHERE THE SURVIVING HALF LIVES. Two pieces, both kept:
  //   · the CARDS half — that the section is not an empty band wearing a label
  //     — is now the bench and Discover grids, counted in 04-premium-home.
  //   · the WIRING half is the test below, which is the same claim made of the
  //     whole page instead of one section: a labelled section's name must
  //     resolve to a real heading that says something.
  test('every section on the front door is named by a heading that exists', async ({ page }) => {
    watch(page, 'a screen-reader user listing the front door by landmark')
    await go(page, '/')
    await expectRendered(page, '/')

    const sections = await page.locator('main#main section[aria-labelledby]').evaluateAll(
      (els) => els.map((el) => {
        const id = el.getAttribute('aria-labelledby')
        const target = id ? document.getElementById(id) : null
        return {
          id,
          className: el.className,
          resolves: !!target,
          says: (target?.textContent || '').replace(/\s+/g, ' ').trim().length,
        }
      }),
    )

    // POSITIVE CONTROL. An empty list satisfies every check below, and a page
    // that stopped labelling its sections is precisely the regression.
    expect(sections.length, 'the front door labels no section at all — the checks below would be vacuous')
      .toBeGreaterThanOrEqual(5)

    const broken = sections.filter((s) => !s.resolves || s.says === 0)
    expect(broken.map((s) => `${s.className} → #${s.id}`),
      'a section points aria-labelledby at an element that does not exist or says nothing, so a '
      + 'screen-reader user is given an unnamed region where the page has a heading',
    ).toEqual([])

    // …and the names actually reach the accessibility tree, which is the half
    // reading the DOM cannot prove.
    await expect(page.locator('main#main').getByRole('region'),
      'the labelled sections are not being exposed as named regions',
    ).toHaveCount(await page.locator('main#main section[aria-labelledby], main#main section[aria-label]').count())
  })
})
