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
import { HERO_HEADLINE, heroHeadlineText } from '../../src/data/positioning.js'
import { FREE_SAVE_LIMITS } from '../../src/config/plans.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'

const CAP = FREE_SAVE_LIMITS.projects
const PHONE = [390, 844]
const DESK = [1280, 800]
const WIDTHS = [PHONE, DESK]
const THEMES = ['light', 'dark']

// THE SENTENCE HE APPROVED, TYPED OUT. Not imported — that is the whole point.
// An assertion that the page renders `heroHeadlineText()` is satisfied by any
// headline the module happens to hold; this one is satisfied only by his.
const APPROVED = 'Build and export UI and brand design kits, in one unified location.'
const APPROVED_MARK = 'in one unified location'

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
// equality against his sentence into a failure about CSS rather than about
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

const focused = (page) => page.evaluate(() => {
  const el = document.activeElement
  if (!el || el === document.body) return 'BODY'
  return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}:${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40)}`
})

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
        .toHaveCount(APPROVED.split(/\s+/).length)
      const text = await joinWords(words)

      expect(text,
        'the hero headline is not the sentence the founder approved on 2026-09-10. It is '
        + 'assembled only from words he wrote and he read it before saying ship it — do not '
        + 'reword it, in the page or in src/data/positioning.js, without asking him again.',
      ).toBe(APPROVED)

      // …and it agrees with the module, so the page is still DERIVING it rather
      // than having grown a typed copy that happens to match today.
      expect(text, 'the hero no longer renders src/data/positioning.js').toBe(heroHeadlineText())

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
      await expect(marked, 'the hero highlights no run at all').toHaveCount(APPROVED_MARK.split(/\s+/).length)
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
      expect(HERO_HEADLINE.mark).toBe(APPROVED_MARK)

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
        const empty = page.locator('.sec.uh .card').filter({ hasText: 'No projects yet' })
        await expect(empty).toBeVisible()

        // IT SAYS WHAT TO DO NEXT, and the two things it names are real routes
        // rather than prose. Read as links, so a renamed route fails here.
        await expect(empty.getByRole('link', { name: 'Colour Studio' })).toHaveAttribute('href', '/create/color')
        await expect(empty.getByRole('link', { name: 'Font Pair Finder' })).toHaveAttribute('href', '/create/font-pair')
        await expect(empty).toContainText('then save your design as a project')

        // The control is on screen, hit-testable (not painted under anything)
        // and big enough to hit — 24px is the suite's target-size floor.
        const cta = empty.getByRole('button', { name: 'Create your first project' })
        await expect(cta).toBeVisible()
        const box = await cta.boundingBox()
        expect(box.height, 'the empty state’s only control must be reachable by thumb').toBeGreaterThanOrEqual(24)

        // WITHOUT SCROLLING FIRST, and said in its own assertion because the
        // hit test below cannot say it. `elementFromPoint` is viewport-relative
        // and returns null for a point outside the viewport, so a control below
        // the fold fails the hit test with "something paints over the button" —
        // which is what happened at 390 and 320 on 2026-09-13 and sent three
        // lanes looking for an overlay that was not there. The real reading was
        // geometry: the button's centre was at y=851 in an 844px viewport, and
        // at 320 its top was at 886. Same defect either way, but a failure has
        // to name the thing that broke, so this one is measured and reported
        // before the occlusion question is even asked.
        //
        // This is the first screen a new signup sees, on the narrowest phone
        // the suite tests. A primary action that needs a scroll nobody was told
        // about is a defect in the page, not in the assertion.
        const geometry = await cta.evaluate((el) => {
          const r = el.getBoundingClientRect()
          return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight }
        })
        expect(geometry.bottom,
          `the empty state’s only control is below the fold: it runs y=${geometry.top}..${geometry.bottom} `
          + `in a ${geometry.vh}px viewport, so a new account on this phone cannot see or tap the one thing `
          + 'the panel asks them to do and nothing tells them to scroll',
        ).toBeLessThanOrEqual(geometry.vh)

        const hit = await cta.evaluate((el) => {
          const r = el.getBoundingClientRect()
          const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          return at === el || el.contains(at)
        })
        expect(hit, 'something paints over the empty state’s button').toBe(true)

        // …and it does the thing it says.
        await cta.click()
        await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible()

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
    const heading = outline.find((h) => h.text === 'No projects yet')
    expect(heading, 'the empty state’s heading is not in the outline').toBeTruthy()
    expect(heading.level, 'the empty state’s heading must be one level under the page title').toBe(2)

    // No level may jump by more than one from the one before it.
    for (let i = 1; i < outline.length; i += 1) {
      expect(outline[i].level - outline[i - 1].level,
        `the outline jumps from h${outline[i - 1].level} "${outline[i - 1].text}" to `
        + `h${outline[i].level} "${outline[i].text}"`,
      ).toBeLessThanOrEqual(1)
    }

    // The decoration above it is decoration: it must not be announced.
    const svgHidden = await page.evaluate(() => {
      const card = [...document.querySelectorAll('.sec.uh .card')]
        .find((c) => c.textContent.includes('No projects yet'))
      return card.querySelector('svg')?.getAttribute('aria-hidden')
    })
    expect(svgHidden, 'the empty state’s folder mark is announced as a graphic').toBe('true')

    await context.close()
  })

  test('the empty state is reachable and operable by keyboard alone', async ({ browser }) => {
    const { context, page } = await open(browser, DESK)
    watch(page, 'a keyboard-only visitor making their first project')
    await signIn(page, { plan: 'free', projects: 0 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    const cta = page.getByRole('button', { name: 'Create your first project' })
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
        return !!el && el.tagName === 'BUTTON' && el.innerText.trim() === 'Create your first project'
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

    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'New project' })
    await expect(dialog).toBeVisible()
    expect(await focused(page), 'the name field takes focus').toMatch(/^input#proj-new-name/)

    // The way back, before the way through.
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    // The restore lands a frame after the close (#436 follow-up 8), so poll.
    await expect.poll(() => focused(page), 'Escape must hand focus back to the opener')
      .toMatch(/Create your first project/)

    // And through: the first project of this account's life.
    await page.keyboard.press('Enter')
    await expect(dialog).toBeVisible()
    await page.keyboard.type('Brand v1')
    await page.keyboard.press('Enter')
    await expect(dialog).toHaveCount(0)
    await expect(page.locator('.uh-grid .proj-card', { hasText: 'Brand v1' })).toHaveCount(1)
    // The empty state is gone now that it is not true any more.
    await expect(page.locator('.sec.uh .card').filter({ hasText: 'No projects yet' })).toHaveCount(0)

    await context.close()
  })

  test('a new account is counted as having used none of its slots', async ({ browser }) => {
    // WHAT THE SEED USED TO MAKE THIS PAGE SAY. `homeStats()` counts the same
    // array the cap counts, so a fresh account read "1 project · 1 colour kept"
    // — a project nobody had made and a colour nobody had chosen. Zero used
    // means both figures are absent (utils/userHome.js drops any figure that is
    // zero) and projectQuota resolves to 'clear', which prints no countdown:
    // P-003, a foot in the door rather than a meter from the first save.
    const { context, page } = await open(browser, DESK)
    watch(page, 'a new free account looking at what it has spent')
    await signIn(page, { plan: 'free', projects: 0 })
    await go(page, '/projects')
    await expectRendered(page, '/projects')

    await expect(page.locator('.uh-stats')).toHaveCount(0)
    await expect(page.locator('[data-testid="project-quota-note"]')).toHaveCount(0)

    // POSITIVE CONTROL for both absences: they must be capable of appearing.
    // Make one project and the count arrives, reading 1 — which is only
    // possible if the account started at 0.
    await page.getByRole('button', { name: 'Create your first project' }).click()
    await page.locator('#proj-new-name').fill('Brand v1')
    await page.getByRole('button', { name: 'Create project' }).click()
    await expect(page.locator('.uh-stats')).toBeVisible()
    await expect(page.locator('.uh-stats')).toContainText('1 project')
    await expect(page.locator('.uh-stats'), 'the first project must not start a countdown')
      .not.toContainText(`of ${CAP}`)

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

      // NOT JUST PRESENT — INTACT. Every figure on the card is read off the
      // saved design, so this is the whole record checked through the product's
      // own reading of it.
      const meta = card.locator('.uh-card-meta')
      await expect(meta).toContainText('Fraunces')
      await expect(meta).toContainText('Manrope')
      await expect(meta).toContainText('17px')
      await expect(meta).toContainText('5 colours')
      await expect(meta).toContainText('6 tints')
      await expect(card.locator('.uh-parts-label')).toHaveText('All four parts')

      // The empty state must NOT be on this page: it is not true here.
      await expect(page.locator('.sec.uh .card').filter({ hasText: 'No projects yet' })).toHaveCount(0)

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
      await expect(page.getByRole('button', { name: 'Create your first project' })).toBeVisible()

      const saveCurrent = async (name) => {
        await page.getByRole('button', { name: 'Save Current' }).click()
        await page.getByPlaceholder(/Brand v1/i).fill(name)
        await page.getByRole('button', { name: 'Save', exact: true }).click()
      }

      // ALL THREE, not two. This is the arithmetic the seed was costing: with
      // it, the third of these was the fourth save and was refused.
      for (let i = 1; i <= CAP; i += 1) {
        await saveCurrent(`Project ${i}`)
        await expect(page.locator('.uh-grid .proj-card')).toHaveCount(i)
        await expect(page.locator('[data-testid="project-save-refusal"]'),
          `save ${i} of ${CAP} was refused — the account did not start with ${CAP} slots`,
        ).toHaveCount(0)
      }

      // The counter now says so, in the page's own words, off the same array.
      await expect(page.locator('.uh-stats')).toContainText(`${CAP} of ${CAP} projects`)
      await expect(page.locator('[data-testid="project-quota-note"]'))
        .toContainText(`You’ve used all ${CAP} projects on the free plan`)

      // And the next one is refused where it was asked for, in ProjectContext's
      // words, with a way forward — #437's SaveRefusal, unchanged by this lane.
      await saveCurrent(`Project ${CAP + 1}`)
      const refusal = page.locator('[data-testid="project-save-refusal"]')
      await expect(refusal).toBeVisible()
      await expect(refusal).toContainText(`Free plan saves up to ${CAP} projects`)
      await expect(refusal.getByRole('link', { name: 'See what Pro adds' })).toHaveAttribute('href', '/plans')
      await expect(page.locator('.uh-grid .proj-card'),
        `the ${CAP + 1}th save must be refused, not made`,
      ).toHaveCount(CAP)

      await context.close()
    })
  }
})
