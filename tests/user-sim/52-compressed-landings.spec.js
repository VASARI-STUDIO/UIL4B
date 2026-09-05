// The compressed secondary landings, and the two homepage marks.
//
// Two founder requests of 2026-09-05 land here, and both are the kind of change
// that regresses by ACCRETION rather than by breaking: somebody adds one more
// "why it helps" band to /discover, or a stale count creeps back into a hero
// hint, and nothing fails. So these assert the SHAPE and the DERIVATION, not
// the wording.
//
//   1. [secondary-pages-compress-to-links] — "i want to compress our secondary
//      sales pages to mostly act as linking pages showcasing a tools value
//      proposition then a link". Three pages, and the founder chose the deepest
//      of the three depths offered: value prop plus link, nothing else.
//
//   2. [homepage-hero-buffer-reference] — the drawn "give it a try" pointing at
//      the command bar, and the five step ticks beside the tools heading.
//
// WHAT THESE DELIBERATELY DO NOT ASSERT: any sentence. Copy on these pages is
// still being worked and a test that pins a phrase would fail the next honest
// rewrite. What is pinned is the page having no pitch section left, its counts
// coming from the data, and each mark being attached to the thing it points at.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'
import { CREATE_GROUPS, DISCOVER_GROUPS, LEARN_GROUPS } from '../../src/data/toolTree.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'

const COMPRESSED = ['/create/color', '/discover', '/learn']

// The three landings each render a hero and their grid, and NOTHING between the
// two or after the grid. Counted as top-level children of <main>, because that
// is the unit a reader scrolls past: one <header> plus one <section> on
// /create/color and /discover, and one extra on /learn for the guides that
// exist (which are links, so they belong).
const EXPECTED_BANDS = { '/create/color': 2, '/discover': 2, '/learn': 3 }

// Where each page's real destinations live.
const LINKS = {
  '/create/color': '.surface-card--link',
  '/discover': '.surface-card--link',
  '/learn': '.lidx-card',
}

test.describe('the secondary landings stay compressed', () => {
  for (const route of COMPRESSED) {
    test(`${route} is a hero and its links, with nothing bolted between them`, async ({ page }) => {
      watch(page, 'visitor landing on a secondary sales page')
      await go(page, route)

      const bands = await page.locator('main#main > *').count()
      expect(bands, `${route} has grown a section: expected ${EXPECTED_BANDS[route]} bands under <main>`)
        .toBe(EXPECTED_BANDS[route])

      // The three things that were deleted, and the classes that would tell us
      // any of them came back. The pillar row and the world map were pitch and
      // decoration; the closing SystemCTA was the hero's own call to action a
      // second time, one scroll later.
      for (const gone of ['.sl-pillars', '.sl-pillar', '.wmap', '.wmap-blip', '.system-cta']) {
        await expect(page.locator(gone), `${route} brought back ${gone}`).toHaveCount(0)
      }

      // ONE primary way in from the hero. The second hero button on all three
      // pages pointed OUT of the surface the visitor had just arrived at.
      await expect(page.locator('.home-hero .ui-pill'), `${route} hero has more than one link`)
        .toHaveCount(1)

      // And the grid is real links, not a list of names. On /learn that is the
      // guide cards rather than the surface grid: every LEARN_GROUPS row is
      // still `soon: true`, so the roadmap grid is correctly link-free and the
      // pages you can actually open are the three published articles.
      await expect(page.locator(LINKS[route]).first()).toBeVisible()
    })
  }

  test('every hero count is read off the data rather than typed into the copy', async ({ page }) => {
    watch(page, 'visitor checking whether the numbers are true')

    // /discover said "Four curated libraries are ready now" for months after it
    // stopped being four — the Prompt Library shipped, then /discover/resources
    // did, and the sentence could not know. It counts now.
    await go(page, '/discover')
    const live = DISCOVER_GROUPS.filter((g) => !g.soon).length
    const soon = DISCOVER_GROUPS.length - live
    const discoverHint = await page.locator('.home-hero-hint').innerText()
    expect(discoverHint, 'the Discover hint no longer matches the group data')
      .toMatch(new RegExp(`\\b${live}\\b[\\s\\S]*\\b${soon}\\b`))

    // The live cards and the Soon cards are the two halves of that same count,
    // so the hint cannot disagree with the grid beneath it.
    await expect(page.locator('.surface-card--link')).toHaveCount(live)
    await expect(page.locator('.surface-card:not(.surface-card--link)')).toHaveCount(soon)

    await go(page, '/learn')
    const learnHint = await page.locator('.home-hero-hint').innerText()
    expect(learnHint, 'the Learn hint no longer matches the article registry')
      .toContain(String(LEARN_ARTICLES.length))
    await expect(page.locator('.lidx-card')).toHaveCount(LEARN_ARTICLES.length)
    await expect(page.locator('.surface-card:not(.surface-card--link)'))
      .toHaveCount(LEARN_GROUPS.filter((g) => g.soon).length)

    // /create/color renders one card per LIVE colour tool and no more, so the
    // page cannot advertise a tool the tree has taken back into the workshop.
    await go(page, '/create/color')
    const colour = CREATE_GROUPS.find((g) => g.id === 'colour')
    await expect(page.locator('.surface-card--link'))
      .toHaveCount(colour.tools.filter((t) => !t.soon).length)
  })

  test('each colour tool card names its own next action, not a shared Open', async ({ page }) => {
    watch(page, 'visitor deciding which colour tool to open')
    await go(page, '/create/color')
    const gos = await page.locator('.surface-card--link .surface-card-go').allInnerTexts()
    expect(gos.length).toBeGreaterThan(1)
    // Shopify's Explore Tools index is the reference: every tile's link text is
    // that tool's own verb. A page whose remaining job is linking has nowhere
    // else left to say what happens next, so identical link text is a defect.
    const normalised = gos.map((t) => t.replace(/\s+/g, ' ').trim().toLowerCase())
    expect(new Set(normalised).size, `link text repeats: ${normalised.join(' | ')}`)
      .toBe(normalised.length)
  })
})

test.describe('the homepage marks point at something real', () => {
  test('the drawn mark hangs beside the command bar and is hidden from assistive tech', async ({ page }) => {
    watch(page, 'first-time visitor meeting the hero on a wide screen')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/')

    const mark = page.locator('.tim')
    await expect(mark).toBeVisible()
    // The whole argument for the mark is that it POINTS at a control. If it
    // ever floats free of the command bar it is decoration, which is the
    // failure the anti-slop bar names by name.
    await expect(mark, 'the mark is not aria-hidden').toHaveAttribute('aria-hidden', 'true')

    const geometry = await page.evaluate(() => {
      const m = document.querySelector('.tim').getBoundingClientRect()
      const bar = document.querySelector('.hcmd').getBoundingClientRect()
      return {
        gap: Math.round(bar.left - m.right),
        overlapsVertically: m.bottom > bar.top && m.top < bar.bottom,
      }
    })
    expect(geometry.gap, 'the mark has drifted away from the bar it points at')
      .toBeGreaterThanOrEqual(0)
    expect(geometry.gap, 'the mark is no longer beside the bar').toBeLessThan(60)
    expect(geometry.overlapsVertically, 'the mark no longer sits at the bar').toBe(true)

    // It must never be the reason a hero scrolls sideways.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, 'the hero scrolls horizontally at 1440px').toBe(0)
  })

  test('the drawn mark goes when there is no margin left to hang it in', async ({ page }) => {
    watch(page, 'visitor on a narrow laptop, then a phone')
    for (const width of [1180, 1024, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await go(page, '/')
      await expect(page.locator('.tim'), `the mark is still painted at ${width}px`).toBeHidden()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `the homepage scrolls sideways at ${width}px`).toBe(0)
    }
  })

  test('the tools heading shows the five it claims, and marks the one you are on', async ({ page }) => {
    watch(page, 'visitor scrolling into the tools narrative')
    await page.setViewportSize({ width: 1440, height: 900 })
    await go(page, '/')

    const ticks = page.locator('.hsteps-tick')
    // Five ticks and five steps, from one source. The heading says "Five tools"
    // and a reader meeting one sticky panel at a time cannot check that; this
    // is what lets them.
    await expect(ticks).toHaveCount(await page.locator('.hstep').count())
    await expect(page.locator('.hsteps-ticks')).toHaveAttribute('aria-hidden', 'true')

    // Exactly one is marked, and it is the same one the rail below marks. Two
    // active rows, or a mark that disagrees with the rail, would be a second
    // source of truth for scroll position.
    const agrees = async () => page.evaluate(() => {
      const t = [...document.querySelectorAll('.hsteps-tick')].map((el) => el.hasAttribute('data-active'))
      const s = [...document.querySelectorAll('.hstep')].map((el) => el.dataset.active === 'true')
      return { tick: t.indexOf(true), step: s.indexOf(true), marked: t.filter(Boolean).length }
    })

    await page.locator('#workbench').scrollIntoViewIfNeeded()
    await expect.poll(async () => (await agrees()).marked).toBe(1)
    const first = await agrees()
    expect(first.tick, 'the tick and the rail disagree about the active step').toBe(first.step)

    // And it MOVES. A mark frozen on step one is worse than no mark: it says
    // the section is a list when it is a walkthrough.
    await page.mouse.wheel(0, 2600)
    await expect.poll(async () => (await agrees()).tick, { timeout: 8000 })
      .not.toBe(first.tick)
    const later = await agrees()
    expect(later.marked, 'more than one tick is marked active').toBe(1)
    expect(later.tick, 'the tick and the rail disagree after scrolling').toBe(later.step)
  })
})
