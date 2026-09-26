// THE TWO DECISIONS THE FOUNDER MADE ON 2026-09-10, RENDERED.
//
// Both had been sitting open in docs/RELEASE-READINESS.md § 2 with an agent's
// measurement under them and no answer. He answered both on the same day, and
// this file is the record that the answers are what actually ships — not what a
// comment or a changelog line says ships.
//
// ─────────────────────────────────────────────────────────────────────────────
// 1 · THE HERO HEADLINE IS APPROVED
// ─────────────────────────────────────────────────────────────────────────────
// "Build and export UI and brand design kits, in one unified location." was
// assembled from two of his own sentences (src/data/positioning.js) rather than
// drafted, because he chose "build one from my words only" over an agent draft.
// It had never been read by him, and every surface that carried it said so.
// On 2026-09-10 he read it beside the two phrases it was cut from and said ship
// it.
//
// The pending-approval flag is now off positioning.js, docs/reference/
// positioning.md, docs/RELEASE-READINESS.md item 10, Home.jsx's hero comment
// and 10-home-chaos-to-calm's failure message. What replaces it is a FACT with
// a date, and — because a fact in a comment protects nothing — a pin:
// tests/unit/positioning-truth.test.js holds the exact string, and the two
// tests below hold the rendered sentence at both widths.
//
// WHY BOTH A UNIT PIN AND A RENDERED ONE. The unit pin catches an edit to the
// module. It cannot catch the hero being rewritten in the PAGE, because
// Home.jsx would then simply have stopped rendering the module — and it cannot
// see the <mark>, which is a paint decision. 10-home-chaos-to-calm proves the
// h1 EQUALS heroHeadlineText(); these prove the h1 equals the sentence he
// actually approved, which is a different claim and the one that matters now
// that there is an approval.
//
// ─────────────────────────────────────────────────────────────────────────────
// 2 · NO MORE SEEDED "DEFAULT PROJECT"
// ─────────────────────────────────────────────────────────────────────────────
// ProjectContext seeded a project called "Default Project" into any account
// that had none. #436's flow audit measured what that cost and put it to him:
//
//   · it spent one of the three free save slots, so a new free account had two;
//   · it made `/projects`'s "No projects yet · Create your first project" panel
//     unreachable while signed in — dead code that two other things (Onboarding's
//     "Not now — take me to my projects", and first-run-destination.test.js's
//     "the projects empty state still teaches") described as the landing.
//
// His call: stop seeding it. New accounts start empty, see the real empty
// state, and get all three slots.
//
// WHAT THIS FILE HAS TO PROVE, and each of the four is a separate way of being
// wrong:
//
//   a. the seed is gone            — a new account has no card it did not make
//   b. NOTHING WAS TAKEN AWAY     — an account that already holds a "Default
//                                   Project", with work in it, still holds it,
//                                   with the work intact, across a reload
//   c. the empty state is correct  — it renders at both widths in both themes,
//                                   says what to do next, its control works and
//                                   is keyboard-reachable, and its heading sits
//                                   in the page's outline
//   d. the cap means three         — from empty, three saves land and the fourth
//                                   is refused in place
//
// (b) IS THE ONE WORTH BEING CAREFUL ABOUT and it is why the test exists rather
// than a sentence in the PR. Removing a write is not obviously safe: if anything
// downstream had treated "the seeded project" as a shape it could rely on — a
// migration, a prune, a "first project" special case — an existing account could
// have lost a record. Nothing did (the effect only ever WROTE, and only into an
// empty list), and the test is what makes that checkable rather than asserted.
//
// ─────────────────────────────────────────────────────────────────────────────
// MUTATION, at the call site, each seen red before it was trusted
// ─────────────────────────────────────────────────────────────────────────────
//   M1  positioning.js      HERO_HEADLINE.mark → 'in one place'
//   M2  ProjectContext.jsx  the seeding effect restored verbatim
//   M3  Projects.jsx        the empty state's <h2> → <h3> (the outline check)
//   M4  Projects.jsx        empty-state button onClick → () => {}
//
// Every mutated file was restored from git and re-hashed (SHA-256); the tally
// and the restores are in the PR body.
import { test, expect } from './base.js'
import { go, watch, signIn, expectRendered } from './helpers.js'
import { SPECTRUM_HERO } from '../../src/components/spectrum/spectrumHero.js'
import { FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const CAP = FREE_SAVE_LIMITS.projects
const PHONE = [390, 844]
const DESK = [1280, 800]
const WIDTHS = [PHONE, DESK]
const THEMES = ['light', 'dark']

/** Name and keep the working design from the Palette Builder's Save current
 *  menu — where a project is saved since New project goes straight into the
 *  builder. */
async function saveFromBuilder(page, name) {
  await page.getByRole('button', { name: /^Save current/ }).click()
  await page.locator('.plb-savemenu').getByLabel('Project name').fill(name)
  await page.keyboard.press('Enter')
}

// THE SENTENCE HE APPROVED, TYPED OUT. Not imported — that is the whole point.
// An assertion that the page renders `heroHeadlineText()` is satisfied by any
// headline the module happens to hold; this one is satisfied only by his.
// The front door uses the Spectrum design's headline. Still typed out, for
// the same reason: only the design's sentence satisfies this, not whatever the
// module happens to hold. The accent run reveals as ONE word, as drawn.
const APPROVED = 'Build and export UI and brand kits from one place.'
const APPROVED_MARK = 'one place'
const APPROVED_UNITS = APPROVED.split(' ').length - (APPROVED_MARK.split(' ').length - 1)

// ─────────────────────────────────────────────────────────────────────────────
// HOW THE SENTENCE IS READ OFF SPECTRUM, AND WHY IT IS NOT `h1.innerText()`
// ─────────────────────────────────────────────────────────────────────────────
// Home.jsx painted the headline as two `.home-hero-line-in` spans and the h1's
// innerText WAS the sentence. `<SpectrumWords>` paints it twice on purpose: a
// `.sr-only` span carrying the whole sentence once for a screen reader, and an
// `aria-hidden` visual split of one `.sp-w` per word inside a `.sp-wm` clipping
// mask, because there is no CSS that can clip and offset individual words of a
// text node. So `h1.innerText()` now returns the approved sentence CONCATENATED
// WITH ITSELF — measured, and it is exactly what this test failed on after the
// route swap.
//
// Reading the words is therefore the right subject and the stronger one: the
// visual split is what a sighted visitor reads, and joining `.sp-w` proves the
// split itself is intact — a lost space, a dropped word or a word rendered out
// of order all fail here, and none of them would move `innerText`. The sr-only
// copy is asserted separately below, because a screen-reader user and a sighted
// one must be given the SAME sentence and nothing before this checked that.
//
// SCOPED TO `.sp-hero-h1`, always. `<SpectrumWords>` paints the section
// headings too; an unscoped `.sp-w` matches 47 elements on this page.
const HERO_WORDS = '.sp-hero-h1 .sp-words-visual .sp-w'
const HERO_MARKED = '.sp-hero-h1 .sp-words-visual .sp-w--mark'

// `textContent`, not `innerText`, and that is not tidiness: innerText applies
// `text-transform`, so a stylesheet that uppercased the hero would turn an
// equality against the design's sentence into a failure about CSS rather than about
// copy — and the claim here is what the page SAYS.
const joinWords = async (locator) =>
  (await locator.evaluateAll((els) => els.map((el) => (el.textContent || '').trim())))
    .filter(Boolean).join(' ')

/** A context at one width, in one theme — the shape 72-flow-followups uses. */
async function open(browser, [w, h], theme = 'light') {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme })
  await context.addInitScript((t) => { try { localStorage.setItem('vs-t', t) } catch { /* private mode */ } }, theme)
  const page = await context.newPage()
  return { context, page }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 · THE APPROVED HEADLINE, ON THE PAGE
// ─────────────────────────────────────────────────────────────────────────────
test.describe('the hero headline the founder approved on 2026-09-10 is the one that ships', () => {
  for (const size of WIDTHS) {
    test(`${size[0]}px: the h1 is his sentence, word for word, with his run highlighted`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `a first-time visitor reading the first sentence on the site (${size[0]}px)`)
      await go(page, '/')
      // The homepage has to have PAINTED before an absence or an equality on it
      // means anything — a boot shell and an ErrorBoundary card both carry an
      // <h1> of their own.
      await expectRendered(page, '/')

      const h1 = page.locator('main h1.sp-hero-h1')
      await expect(h1).toBeVisible()

      const words = page.locator(HERO_WORDS)
      // POSITIVE CONTROL for the join below: a headline that rendered no words
      // would join to '' and every equality here would be reporting on nothing.
      await expect(words, 'the hero headline painted no words at all')
        .toHaveCount(APPROVED_UNITS)
      const text = await joinWords(words)

      expect(text,
        'the hero headline is not the sentence the founder approved on 2026-09-10. It is '
        + 'assembled only from words he wrote and he read it before saying ship it — do not '
        + 'reword it, in the page or in src/data/positioning.js, without asking him again.',
      ).toBe(APPROVED)

      // …and it agrees with the module, so the page is still DERIVING it rather
      // than having grown a typed copy that happens to match today.
      expect(text, 'the hero no longer renders src/components/spectrum/spectrumHero.js').toBe(SPECTRUM_HERO.text)

      // THE SCREEN READER IS GIVEN THE SAME SENTENCE. `<SpectrumWords>` carries
      // it once in a `.sr-only` span precisely because the visual split would
      // otherwise be announced one word per line; if that copy ever drifts from
      // the words beside it, two readers meet two different headlines and only
      // one of them is the one he approved.
      const spoken = await h1.locator('.sr-only').evaluate((el) => el.textContent || '')
      expect(spoken.replace(/\s+/g, ' ').trim(),
        'the headline a screen reader is given is not the one on screen',
      ).toBe(APPROVED)

      // THE HIGHLIGHT IS PART OF WHAT HE APPROVED. Moving a word across the
      // lead/mark boundary leaves the sentence identical and changes what the
      // page paints and what the share card paints.
      //
      // ONE RUN, NOT ONE ELEMENT. Home.jsx wrapped the run in a single <mark>;
      // SpectrumWords marks it a word at a time, so the design-language budget
      // of one --hi run per viewport is now a statement about CONTIGUITY rather
      // than about node count. Asserted as both: the marked words join to his
      // phrase, and they are consecutive in the headline — a second highlighted
      // run elsewhere in the sentence would satisfy neither.
      const marked = page.locator(HERO_MARKED)
      await expect(marked, 'the hero highlights no run at all').toHaveCount(1)
      // Trailing punctuation belongs to the sentence, not to the run: the mark
      // ends the headline, so its last word renders as "location." while the
      // run he approved is "…location". SpectrumWords matches it the same way.
      expect((await joinWords(marked)).replace(/[.,;:!?]+$/, '')).toBe(APPROVED_MARK)
      const contiguous = await page.locator('.sp-hero-h1 .sp-words-visual').evaluate((el) => {
        const all = [...el.querySelectorAll('.sp-w')]
        const hit = all.map((w, i) => (w.classList.contains('sp-w--mark') ? i : -1)).filter((i) => i > -1)
        return hit.length > 0 && hit[hit.length - 1] - hit[0] === hit.length - 1
      })
      expect(contiguous, 'the highlighted words are not one contiguous run').toBe(true)
      expect(SPECTRUM_HERO.mark).toBe(APPROVED_MARK)

      await context.close()
    })
  }

  test('no surface still tells a reader the headline is waiting on him', async ({ browser }) => {
    // The flag was on five files. Four are source or docs and are checked by
    // reading them; the fifth was the homepage itself, and this is the one that
    // could have shipped a "pending approval" note to a VISITOR. An absence
    // check needs something to be absent from, so the render control runs first.
    const { context, page } = await open(browser, DESK)
    watch(page, 'a visitor who must never be shown the repo’s own paperwork')
    await go(page, '/')
    await expectRendered(page, '/')

    const visible = await page.evaluate(() => {
      const clone = document.body.cloneNode(true)
      clone.querySelectorAll('script, style, template, noscript').forEach((n) => n.remove())
      return (clone.textContent || '').toLowerCase()
    })
    for (const phrase of ['not yet approved', 'pending his', 'yes or no', 'awaiting approval']) {
      expect(visible, `the homepage shows the repo’s approval paperwork: "${phrase}"`).not.toContain(phrase)
    }
    await context.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2a · A NEW ACCOUNT HAS NO CARD IT DID NOT MAKE
// ─────────────────────────────────────────────────────────────────────────────
test.describe('a new account starts empty', () => {
  for (const size of WIDTHS) {
    for (const theme of THEMES) {
      test(`${size[0]}px ${theme}: the empty state is what a new account sees`, async ({ browser }) => {
        const { context, page } = await open(browser, size, theme)
        watch(page, `somebody opening their projects for the first time (${size[0]}px, ${theme})`)
        await signIn(page, { plan: 'free', projects: 0 })
        await go(page, '/projects')
        await expectRendered(page, '/projects')

        // Nothing was seeded: no card at all, and specifically not the one that
        // used to be there.
        await expect(page.locator('.uh-grid .proj-card')).toHaveCount(0)
        await expect(page.locator('.proj-card', { hasText: 'Default Project' })).toHaveCount(0)

        // The panel that had never been on a screen.
        //
        // Selected on `.uh-empty`, the panel's own class, rather than on the
        // shared `.card`. It was a card until the Spectrum pass (carried over
        // from #481) — a centred, filled, rounded container with a circular
        // tinted icon badge, the stock first-run screen. `.card` was never
        // what this test was about: everything below reads the panel's words,
        // its two links and its control, and all of those are unchanged.
        const empty = page.locator('.uh .uh-empty').filter({ hasText: 'No projects yet' })
        await expect(empty).toBeVisible()

        // IT SAYS WHAT TO DO NEXT, in the design's words: start with a colour. The
        // tool it names is the lead tile of "Start something" on the same page.
        await expect(empty).toContainText('Start with a colour and the rest of the project follows.')
        await expect(page.locator('.uh-lead')).toHaveAttribute('href', '/create/palette')

        // THE FIRST SCREEN STILL CARRIES A WAY TO MAKE ONE. The design's layout puts
        // "Start something" above the recent projects, so on a phone this card
        // is below the fold — which is why the fold is asserted on the title
        // row's New project (which does the same thing), measured before any scroll.
        const first = await page.getByRole('button', { name: 'New project' }).evaluate((el) => {
          const r = el.getBoundingClientRect()
          const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight, scrolled: window.scrollY, hit: at === el || el.contains(at) }
        })
        expect(first.scrolled).toBe(0)
        expect(first.bottom, `New project runs y=${first.top}..${first.bottom} in a ${first.vh}px viewport`).toBeLessThanOrEqual(first.vh)
        expect(first.hit, 'something paints over New project').toBe(true)

        // The card's own control: big enough to hit, and hit-testable once it
        // is on screen (elementFromPoint is viewport-relative, so scroll first).
        const cta = empty.getByRole('button', { name: 'Start a project' })
        await cta.scrollIntoViewIfNeeded()
        await expect(cta).toBeVisible()
        const box = await cta.boundingBox()
        expect(box.height, 'the empty state’s control must be reachable by thumb').toBeGreaterThanOrEqual(24)
        const hit = await cta.evaluate((el) => {
          const r = el.getBoundingClientRect()
          const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          return at === el || el.contains(at)
        })
        expect(hit, 'something paints over the empty state’s button').toBe(true)

        // …and it does the thing it says: straight into the Palette Builder,
        // as the design file wires it.
        await cta.click()
        await expect(page).toHaveURL(/\/create\/palette$/)

        await context.close()
      })
    }
  }

  test('the empty state’s heading sits in the page outline, not beside it', async ({ browser }) => {
    // It was an <h3> under the page's single <h1>, and BEFORE the "Starters,
    // rotating daily" <h2> in the DOM — so the outline read 1 → 3 → 2, which
    // is a level-3 with nothing above it followed by a level-2 after it. A
    // screen-reader user navigating by heading cannot tell where that broke
    // (WCAG 1.3.1). Same defect and same fix the legal pages' section headings
    // got: the tag changed, the size deliberately did not.
    const { context, page } = await open(browser, DESK)
    watch(page, 'a screen-reader user navigating the empty projects page by heading')
    await signIn(page, { plan: 'free', projects: 0 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const outline = await page.evaluate(() =>
      [...document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6')]
        .map((h) => ({ level: Number(h.tagName[1]), text: h.innerText.trim().slice(0, 40) })))

    expect(outline.length, 'the page rendered no headings at all').toBeGreaterThan(1)
    expect(outline[0].level, 'the page must open on its h1').toBe(1)
    const at = outline.findIndex((h) => h.text === 'No projects yet')
    const heading = outline[at]
    expect(heading, 'the empty state’s heading is not in the outline').toBeTruthy()
    // The design's screen sets it as an h3 under the "Recent projects" h2 — one level
    // under the section it belongs to (it was an h2 directly under the h1 on
    // the old page, which had no sections).
    expect(heading.level, 'the empty state’s heading must be one level under its section').toBe(3)
    expect(outline[at - 1], 'and the section above it must be Recent projects').toEqual({ level: 2, text: 'Recent projects' })

    // No level may jump by more than one from the one before it.
    for (let i = 1; i < outline.length; i += 1) {
      expect(outline[i].level - outline[i - 1].level,
        `the outline jumps from h${outline[i - 1].level} "${outline[i - 1].text}" to `
        + `h${outline[i].level} "${outline[i].text}"`,
      ).toBeLessThanOrEqual(1)
    }

    // THE PANEL ANNOUNCES ITS WORDS AND NOTHING ELSE.
    //
    // This read the folder mark's aria-hidden and asserted 'true' — which
    // pinned the mark itself: delete the glyph and the expression is
    // undefined, so the test went red for the decoration being GONE rather
    // than for it being announced. The mark was deleted with the card (#481,
    // ported onto Spectrum), so the assertion is the property it was always
    // after, in a form that survives either answer: every graphic in this
    // panel is hidden, however many there are. The panel itself must be found,
    // so a selector that stops matching cannot report it clean by reading
    // nothing.
    const marks = await page.evaluate(() => {
      const panel = [...document.querySelectorAll('.uh .uh-empty')]
        .find((el) => el.textContent.includes('No projects yet'))
      if (!panel) return null
      const graphics = [...panel.querySelectorAll('svg, img, [role="img"]')]
      return { found: graphics.length, announced: graphics.filter((g) => g.getAttribute('aria-hidden') !== 'true').length }
    })
    expect(marks, 'the empty state panel itself is not on the page').not.toBeNull()
    expect(marks.announced, `${marks.announced} of the empty state’s ${marks.found} graphic(s) are announced`).toBe(0)

    await context.close()
  })

  test('the empty state is reachable and operable by keyboard alone', async ({ browser }) => {
    const { context, page } = await open(browser, DESK)
    watch(page, 'a keyboard-only visitor making their first project')
    await signIn(page, { plan: 'free', projects: 0 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const cta = page.getByRole('button', { name: 'Start a project' })
    await expect(cta).toBeVisible()

    // TAB FROM THE TOP OF THE DOCUMENT rather than calling .focus(): the
    // question is whether a keyboard user can GET there, and .focus() answers a
    // different question entirely. 60 is a ceiling, not an expectation — the
    // control sits eighth among the page's own tabbables.
    await page.evaluate(() => document.body.focus())
    let reached = false
    for (let i = 0; i < 60 && !reached; i += 1) {
      await page.keyboard.press('Tab')
      reached = await page.evaluate(() => {
        const el = document.activeElement
        return !!el && el.tagName === 'BUTTON' && el.innerText.trim() === 'Start a project'
      })
    }
    expect(reached, 'the empty state’s only control cannot be reached by Tab').toBe(true)

    // It has a visible focus ring rather than only a focus state the browser
    // knows about.
    const ring = await cta.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, boxShadow: cs.boxShadow }
    })
    expect(
      ring.boxShadow !== 'none' || (ring.outlineStyle !== 'none' && parseFloat(ring.outlineWidth) > 0),
      'the focused control paints no focus indicator',
    ).toBe(true)

    // Enter goes straight into the Palette Builder on a new, unsaved project
    // — there is no dialog on the way any more.
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/create\/palette$/)

    // And through: the first project of this account's life, named as it is
    // kept.
    await saveFromBuilder(page, 'Brand v1')
    await expect(page.locator('.toast.show')).toContainText('Project saved')
    await go(page, '/projects')
    await expect(page.locator('.uh-grid .proj-card', { hasText: 'Brand v1' })).toHaveCount(1)
    // The empty state is gone now that it is not true any more.
    await expect(page.locator('.uh .uh-empty').filter({ hasText: 'No projects yet' })).toHaveCount(0)

    await context.close()
  })

  test('a new account is counted as having used none of its slots', async ({ browser }) => {
    // WHAT THE SEED USED TO MAKE THIS PAGE SAY: one slot spent on a project
    // nobody had made. The design's workspace screen meters the
    // slots from the first visit ("Project slots  n of 3" in the plan strip —
    // the design, which retires the old page's "no countdown until it is worth
    // knowing" rule), so the property is now read straight off the meter: a
    // new account is at 0, and one project later it is at 1, counted off the
    // same array the cap refuses from.
    const { context, page } = await open(browser, DESK)
    watch(page, 'a new free account looking at what it has spent')
    await signIn(page, { plan: 'free', projects: 0 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const slots = page.locator('[data-testid="project-quota-note"]')
    await expect(slots).toContainText(`0 of ${CAP}`)

    await page.getByRole('button', { name: 'Start a project' }).click()
    await expect(page).toHaveURL(/\/create\/palette$/)
    await saveFromBuilder(page, 'Brand v1')
    await expect(page.locator('.toast.show')).toContainText('Project saved')
    await go(page, '/projects')
    await expect(slots).toContainText(`1 of ${CAP}`)

    await context.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2b · AN EXISTING ACCOUNT LOSES NOTHING
// ─────────────────────────────────────────────────────────────────────────────
test.describe('an account that already has a Default Project keeps it', () => {
  // A real one, with work in it: five colours, two families that are not the
  // default, a scale that was moved and six tints. Built off DEFAULT_DESIGN so
  // it is the shape saveProject() writes, then changed in every one of the four
  // parts the card reports — so if anything were rewritten or re-seeded under
  // this account, the card would say so rather than merely disappearing.
  const worked = () => ({
    id: 'legacy-default',
    name: 'Default Project',
    design: {
      ...JSON.parse(JSON.stringify(DEFAULT_DESIGN)),
      palette: { ...DEFAULT_DESIGN.palette, base: '#8A2BE2', colors: ['#8A2BE2', '#2BE28A', '#E28A2B', '#2B8AE2', '#E22B8A'] },
      fonts: {
        heading: { family: 'Fraunces', weight: 700, category: 'serif' },
        body: { family: 'Manrope', weight: 400, category: 'sans-serif' },
      },
      typeScale: { ...DEFAULT_DESIGN.typeScale, base: 17, ratio: 1.333 },
      tints: { ...DEFAULT_DESIGN.tints, scale: [1, 2, 3, 4, 5, 6] },
    },
    createdAt: '2026-03-04T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
  })

  for (const size of WIDTHS) {
    test(`${size[0]}px: the project and every part of its work is still there`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `somebody who has been using this account since March (${size[0]}px)`)
      await signIn(page, { plan: 'free', projects: [worked()] })
      await go(page, '/projects')
      await expectRendered(page, '/projects')

      const card = page.locator('.proj-card').filter({ hasText: 'Default Project' })
      await expect(card, 'an existing account lost its Default Project').toHaveCount(1)

      // The card reads it as complete…
      await expect(card.locator('.uh-card-line')).toContainText('4 of 4 parts')
      // The empty state must NOT be on this page: it is not true here.
      await expect(page.locator('.uh .uh-empty').filter({ hasText: 'No projects yet' })).toHaveCount(0)

      // NOT JUST PRESENT — INTACT. The project's own page reads every part off
      // the saved design (the slots on /projects/:id carry these values), so this is the
      // whole record checked through the product's own reading of it.
      await card.locator('.uh-card-name').click()
      const detail = (label) => page.locator('.pjd-slot', { has: page.locator('.pjd-slot-label', { hasText: new RegExp(`^${label}$`) }) }).locator('.pjd-slot-detail')
      await expect(detail('Colour')).toHaveText('5 colours')
      await expect(detail('Type')).toContainText('Fraunces')
      await expect(detail('Type')).toContainText('Manrope')
      await expect(detail('Type scale')).toContainText('from 17 px')
      await expect(detail('Tints')).toHaveText('6 steps')
      await expect(page.locator('.pjd-progress-label')).toHaveText('4 of 4 parts')

      await context.close()
    })
  }

  test('it survives a reload — nothing prunes it on the second visit either', async ({ browser }) => {
    // The seeding effect ran on every mount, not only on the first one. Its
    // removal has to be checked the same way: a second load of the same tab,
    // reading the store the app itself has written back since.
    const { context, page } = await open(browser, DESK)
    watch(page, 'the same account, opened again the next morning')
    const account = await signIn(page, { plan: 'free', projects: [worked()] })
    await go(page, '/projects')
    await expectRendered(page, '/projects')
    await expect(page.locator('.proj-card').filter({ hasText: 'Default Project' })).toHaveCount(1)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expectRendered(page, '/projects')
    await expect(page.locator('.proj-card').filter({ hasText: 'Default Project' })).toHaveCount(1)

    // And in the store, under this account's own key, still exactly one record
    // and still the one that was there. (The fixture seeds localStorage once
    // per tab, so what is read back on the second load is the APP's copy.)
    const stored = await page.evaluate((email) => {
      const all = JSON.parse(localStorage.getItem('vs-projects') || '{}')
      const mine = all[email] || []
      return { count: mine.length, names: mine.map((p) => p.name), colours: mine[0]?.design?.palette?.colors?.length ?? 0 }
    }, account.email)
    expect(stored.count, 'the account gained or lost a project across a reload').toBe(1)
    expect(stored.names).toEqual(['Default Project'])
    expect(stored.colours, 'the saved palette was rewritten').toBe(5)

    await context.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2c · THREE SLOTS, AND THE FOURTH SAVE IS REFUSED IN PLACE
// ─────────────────────────────────────────────────────────────────────────────
test.describe(`a new account gets all ${CAP} free slots`, () => {
  for (const size of WIDTHS) {
    test(`${size[0]}px: ${CAP} saves land from empty and the ${CAP + 1}th is refused`, async ({ browser }) => {
      const { context, page } = await open(browser, size)
      watch(page, `a free account spending its whole allowance from a standing start (${size[0]}px)`)
      await signIn(page, { plan: 'free', projects: 0 })
      await go(page, '/projects')
      await expectRendered(page, '/projects')
      await expect(page.getByRole('button', { name: 'Start a project' })).toBeVisible()

      // ALL THREE, not two. This is the arithmetic the seed was costing: with
      // it, the third of these was the fourth save and was refused. Saved the
      // way a project is saved now — named from the Palette Builder that New
      // project opens.
      await page.getByRole('button', { name: 'New project' }).click()
      await expect(page).toHaveURL(/\/create\/palette$/)
      const kept = () => page.evaluate(() => JSON.parse(localStorage.getItem('vs-projects') || '{}')['free.user@uil4b.test']?.length ?? 0)
      for (let i = 1; i <= CAP; i += 1) {
        await saveFromBuilder(page, `Project ${i}`)
        await expect.poll(kept, { message: `save ${i} of ${CAP} was refused — the account did not start with ${CAP} slots` }).toBe(i)
        await expect(page.locator('[data-testid="palette-save-refusal"]')).toHaveCount(0)
      }

      // And the next one is refused where it was asked for, in ProjectContext's
      // words, with a way forward — SaveRefusal.
      await saveFromBuilder(page, `Project ${CAP + 1}`)
      const builderRefusal = page.locator('[data-testid="palette-save-refusal"]')
      await expect(builderRefusal).toBeVisible()
      await expect(builderRefusal).toContainText(`Free plan saves up to ${CAP} projects`)
      expect(await kept(), `the ${CAP + 1}th save must be refused, not made`).toBe(CAP)

      // The workspace says so, off the same array: the slot meter is full, the
      // three are there, and New project now explains the cap instead of
      // opening a project that could never be saved.
      await go(page, '/projects')
      await expect(page.locator('[data-testid="project-quota-note"]')).toContainText(`${CAP} of ${CAP}`)
      await expect(page.locator('.uh-grid .proj-card')).toHaveCount(CAP)
      await page.getByRole('button', { name: 'New project' }).click()
      const refusal = page.locator('[data-testid="project-create-refusal"]')
      await expect(refusal).toBeVisible()
      await expect(refusal).toContainText(`Free plan saves up to ${CAP} projects`)
      await expect(refusal.getByRole('link', { name: 'See what Pro adds' })).toHaveAttribute('href', '/plans')

      await context.close()
    })
  }
})
