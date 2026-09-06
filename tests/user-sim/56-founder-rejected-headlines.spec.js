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

// The three heading slots the founder has ruled on. A rejected line is only
// half the rule — the other half is that the slot still says SOMETHING, so
// deleting a heading can never be the way this file goes green.
const SLOTS = ['hsteps-title', 'htools-title', 'hcomm-title']

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

// `textContent`, not `innerText`, and this is the deliberate opposite of the
// P-019 "token" check in 10-home-chaos-to-calm.spec.js, which reads innerText
// off the same element.
//
// MEASURED, NOT ASSUMED: every `.hsteps-head` / `.htools-head` / `.hcomm-head`
// on this page carries `data-reveal`, which is `opacity:0` until the section
// scrolls in (global.css:5904), and under the GSAP path the band reports as
// hidden outright — `toBeVisible()` on `#hsteps-title` fails on a freshly
// loaded homepage. So an innerText rule here would be evadable by the worst
// possible means: a rejected sentence could come back below the fold and this
// file would call the page clean.
//
// The two rules want different subjects and that is correct. "Do not SELL with
// this word" is about what is read, so it reads innerText. "The founder threw
// this sentence out" is about what the page SAYS, full stop — reveal state,
// scroll position and viewport cannot make a retired headline acceptable — so
// it reads the DOM. The hidden-but-mounted workbench panels textContent also
// returns are tool chrome; none of the four strings below can appear in them.
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

  // ── C11, the one line of the parked batch that reached main ───────────────
  //
  // Four of #264's five headline lines never landed. This one did, and until
  // now nothing asserted it: the suite checked the strip's DATA thoroughly
  // (cards link inward, no fabricated save counts, no ordering tablist) and
  // never once checked that the section still has the heading that names it.
  // The heading could have been reworded, or deleted outright, and the whole
  // homepage suite would have stayed green.
  //
  // Asserted through the ACCESSIBLE NAME rather than by reading the h2's text,
  // because that is the wiring and the text alone is not. `section.hcomm`
  // carries `aria-labelledby="hcomm-title"`; going through role+name proves in
  // one assertion that the section exists, that its label points at a real
  // element, and that the element says this. Reading `#hcomm-title` directly
  // would still pass with the aria-labelledby deleted, which is the failure
  // that costs a screen-reader user the section's name.
  test('the starting-points section is still named by the C11 heading that shipped', async ({ page }) => {
    watch(page, 'a screen-reader user reaching the starting-points strip')
    await go(page, '/')
    await expectRendered(page, '/')

    const region = page.getByRole('region', {
      name: 'Start from something that already works.',
      exact: true,
    })
    await expect(
      region,
      'section.hcomm is no longer labelled "Start from something that already works." — '
      + 'either the heading moved, its text changed, or the aria-labelledby that points '
      + 'at it was dropped. This is the only line of #264\'s C8–C13 batch on main.',
    ).toHaveCount(1)

    // POSITIVE CONTROL — and it is the right region. A `<section>` that lost
    // its cards would still answer to the name; the six inward cards are what
    // make this the starting-points strip and not an empty band wearing its
    // label. Their destinations are covered in 10-home-chaos-to-calm.spec.js.
    await expect(
      region.locator('.hcomm-card-link'),
      'the region carries the C11 heading but rendered no starting points under it',
    ).toHaveCount(6)
  })
})
