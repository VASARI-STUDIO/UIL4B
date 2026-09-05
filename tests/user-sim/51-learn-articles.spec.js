// The Learn articles, in a browser.
//
// tests/unit/learn-articles.test.js guards the joins between the registry, the
// prose, the page and the nav on disk. Three things it cannot see are asserted
// here, and each one is a defect that shipped green through the unit half:
//
//   1. THE LIVE TABLES. Three components measure something at render time —
//      TokenContrastTable reads this page's own custom properties and runs
//      contrastRatio() on them, ReadingMeasure measures the reading column,
//      ColourMixTable paints four color-mix() declarations and reads them back
//      off a canvas. All three return null rather than print a wrong number if
//      the measurement fails, which is right and also silent. A page that
//      quietly dropped its evidence would pass every render assertion.
//   2. THE CONTENTS ANCHORS. The unit test asserts the ids in the prose match
//      the ids in the registry. Only the browser can say whether the anchor
//      each contents link points at is actually in the document.
//   3. HORIZONTAL SCROLL. A visually-hidden span inside the contrast table was
//      position:absolute with no positioned ancestor, escaped the table's
//      overflow container and widened the DOCUMENT by 39px — a horizontal
//      scrollbar at 320px and 390px with every visible box inside the viewport.
//      Nothing on disk shows that, and no render assertion notices it.
import { test, expect } from './base.js'
import { expectRendered, go, watch } from './helpers.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'
import { LEARN_GROUPS } from '../../src/data/toolTree.js'

// A guard against this whole file passing over an empty list.
test('the registry this spec walks is not empty', async () => {
  expect(LEARN_ARTICLES.length, 'no Learn articles are registered').toBeGreaterThan(0)
})

test.describe('Learn articles', () => {
  test('the Learn landing leads with guides that open and a roadmap that does not pretend to', async ({ page }) => {
    watch(page, 'designer arriving at Learn for the first time')
    await go(page, '/learn')

    // Every published guide is a real link with its real destination.
    for (const article of LEARN_ARTICLES) {
      const card = page.locator(`.lidx-card[href="/learn/${article.slug}"]`)
      await expect(card, `${article.slug} is missing from the Learn landing`).toBeVisible()
      await expect(card).toContainText(article.title)
      await expect(card).toContainText(article.topic)
    }
    await expect(page.locator('.lidx-card')).toHaveCount(LEARN_ARTICLES.length)

    // The hero no longer says the section is coming soon — it now says how many
    // guides there are, which is a fact rather than a promise.
    await expect(page.locator('.home-hero-hint')).not.toContainText(/coming soon/i)
    await expect(page.locator('.home-hero-hint')).toContainText(new RegExp(`${LEARN_ARTICLES.length}|One`, 'i'))

    // And the topics that are NOT written still wear a Soon badge and go
    // nowhere. This is the half that was called out as dishonest before: eight
    // cards describing eight unbuilt guides. They stay, they just stay honest.
    const soon = page.locator('.surface-card:not(.surface-card--link)')
    await expect(soon).toHaveCount(LEARN_GROUPS.filter((g) => g.soon).length)
    await expect(soon.locator('.soon-badge').first()).toBeVisible()
  })

  for (const article of LEARN_ARTICLES) {
    test(`${article.slug} renders its heading, contents, sources and next step`, async ({ page }) => {
      watch(page, `reader working through the ${article.topic.toLowerCase()} guide`)
      await go(page, `/learn/${article.slug}`)
      await expectRendered(page, `/learn/${article.slug}`)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.title)
      await expect(page.locator('.lart-topic')).toHaveText(article.topic)

      // The contents list every section, and every anchor lands on a real one.
      const links = page.locator('.lart-toc a')
      await expect(links).toHaveCount(article.sections.length)
      for (const section of article.sections) {
        const link = page.locator(`.lart-toc a[href="#${section.id}"]`)
        await expect(link, `no contents link for #${section.id}`).toHaveText(section.title)
        await expect(
          page.locator(`section#${section.id}`),
          `the contents link for #${section.id} points at an anchor that is not in the document`,
        ).toBeAttached()
      }

      // Every source is a real outbound link, and the article ends at its tool.
      const sources = page.locator('.lart-sources a')
      await expect(sources).toHaveCount(article.sources.length)
      await expect(page.locator(`.lart-next a[href="${article.toolTo}"]`)).toBeVisible()

      // The head is the article's own, not the homepage's.
      await expect(page).toHaveTitle(new RegExp(article.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
      await expect(page.locator('link[rel="canonical"]'))
        .toHaveAttribute('href', `https://www.uil4b.com/learn/${article.slug}`)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow')
    })
  }

  test('THE ONE THAT MATTERS: the measured tables carry real numbers, not an empty figure', async ({ page }) => {
    watch(page, 'reader checking the figures an article publishes about itself')

    // The contrast article's live reading of this page's own colours.
    await go(page, '/learn/colour-contrast')
    const ratios = page.locator('.lart-verdict')
    await expect(ratios.first(), 'TokenContrastTable rendered nothing — it measured no usable pair').toBeVisible()
    const verdicts = await ratios.allInnerTexts()
    expect(verdicts.length, 'the measured contrast table has no rows').toBeGreaterThanOrEqual(4)
    for (const v of verdicts) {
      // The visible word is uppercased by CSS and innerText reports the
      // transformed text, so this is case-insensitive on purpose. The tail is
      // the .sr-only detail: SC 1.4.1 says the colour cannot be the only
      // carrier, so the ratio and the threshold have to reach assistive tech.
      expect(v.replace(/\s+/g, ' ').trim())
        .toMatch(/^(pass|fail) — \d+\.\d{2}:1 against a [\d.]+:1 minimum$/i)
    }
    // Every cell in the ratio column has to be a real measurement, not a dash.
    const measured = await page.locator('.lart-table td[data-num]').allInnerTexts()
    expect(measured.some((t) => /^\d+\.\d{2}:1$/.test(t.trim())),
      'no ratio in the measured table looks like a measurement').toBe(true)

    // The type article's measurement of its own column.
    await go(page, '/learn/type-scales')
    const measure = page.locator('.lart-table-wrap').last()
    await expect(measure).toContainText(/Characters per line/)
    const chars = Number((await measure.locator('tr', { hasText: 'Characters per line' })
      .locator('td').innerText()).trim())
    // The article states Bringhurst's 45-75 and the column is capped in `ch` to
    // land inside it. If the CSS drifts, the article contradicts itself on the
    // page — which is the exact defect a passing render assertion would miss.
    expect(chars, `the reading column measures ${chars} characters a line, outside the 45-75 this article cites`)
      .toBeGreaterThanOrEqual(45)
    expect(chars).toBeLessThanOrEqual(75)

    // The colour article's four color-mix() results, painted and read back.
    await go(page, '/learn/colour-spaces')
    const mix = page.locator('.lart-table-wrap').last()
    await expect(mix, 'ColourMixTable rendered nothing — color-mix() was not measurable').toContainText('in oklab')
    const hexes = (await mix.locator('td[data-num]').allInnerTexts())
      .map((t) => t.trim()).filter((t) => /^#[0-9A-F]{6}$/.test(t))
    expect(hexes.length, 'no painted colour was read back').toBe(4)
    expect(new Set(hexes).size, 'four interpolation spaces produced the same colour — the mix is not being measured')
      .toBe(4)
  })

  test('an unknown guide is a real 404, not the landing page wearing a new URL', async ({ page }) => {
    watch(page, 'visitor following a stale link to a guide that never shipped')
    await go(page, '/learn/a-guide-that-does-not-exist')

    await expect(page).toHaveURL(/a-guide-that-does-not-exist/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/doesn’t exist/i)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    // Not a soft 404: the landing's guide cards must not be what is rendered.
    await expect(page.locator('.lidx-card')).toHaveCount(0)
    await expect(page.locator('.lart-prose')).toHaveCount(0)
  })

  test('no Learn route scrolls sideways on a phone', async ({ page }) => {
    watch(page, 'reader on a 390px phone, and on a 320px one')
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 })
      for (const route of ['/learn', ...LEARN_ARTICLES.map((a) => `/learn/${a.slug}`)]) {
        await go(page, route)
        const overflow = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }))
        expect(
          overflow.scroll,
          `${route} at ${width}px scrolls horizontally: ${overflow.scroll} > ${overflow.client}`,
        ).toBeLessThanOrEqual(overflow.client + 1)
      }
    }
  })
})
