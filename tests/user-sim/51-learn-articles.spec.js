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

  test('THE TWO NEWEST TABLES MEASURE, and print what they measured', async ({ page }) => {
    watch(page, 'reader checking the two guides that argue from their own arithmetic')

    // ThemeInversionTable reads this page's tokens out of the running stylesheet
    // and returns null rather than a wrong number if any of them comes back in a
    // form it cannot measure — which is right, and silent. The paragraph under it
    // says the two ratio columns disagree in EVERY row, so that is the assertion:
    // a component that quietly rendered nothing, or a stylesheet that made the
    // claim false, both fail here and nowhere else.
    await go(page, '/learn/theme-systems')
    const inversion = page.locator('[aria-label*="every channel inverted"]')
    await expect(inversion, 'ThemeInversionTable rendered nothing — a token was not measurable')
      .toBeVisible()
    const inversionRows = inversion.locator('tbody tr')
    await expect(inversionRows).toHaveCount(4)
    for (let i = 0; i < 4; i += 1) {
      const cells = await inversionRows.nth(i).locator('td[data-num]').allInnerTexts()
      expect(cells, `row ${i} does not print two measured ratios`).toHaveLength(2)
      for (const cell of cells) expect(cell.trim()).toMatch(/^\d+\.\d{2}:1$/)
      expect(cells[0].trim(), `row ${i} reads the same painted and inverted — the guide`
        + ' says the two columns disagree in every row').not.toBe(cells[1].trim())
    }

    // BrandRampTable generates the ramp with the product's own generator. Its
    // article's central claim is a NEGATIVE one — no stop clears 4.5:1 on both
    // grounds — and a negative claim is exactly what an empty table satisfies,
    // so the row count is asserted first and the claim second.
    await go(page, '/learn/brand-colour')
    const ramp = page.locator('[aria-label*="both theme grounds"]')
    await expect(ramp, 'BrandRampTable rendered nothing').toBeVisible()
    const rampRows = ramp.locator('tbody tr')
    await expect(rampRows).toHaveCount(11)
    let clearsBoth = 0
    for (let i = 0; i < 11; i += 1) {
      const row = rampRows.nth(i)
      const ratios = await row.locator('td[data-num]').allInnerTexts()
      expect(ratios, `stop row ${i} does not print two measured ratios`).toHaveLength(2)
      const [onLight, onDark] = ratios.map((t) => Number(t.trim().replace(':1', '')))
      expect(Number.isFinite(onLight) && Number.isFinite(onDark),
        `stop row ${i} printed something that is not a ratio: ${ratios.join(' / ')}`).toBe(true)
      if (onLight >= 4.5 && onDark >= 4.5) clearsBoth += 1
      // And the derived column is never blank: an empty verdict beside two real
      // numbers is the shape a broken derivation takes.
      await expect(row.locator('td').last()).not.toBeEmpty()
    }
    expect(clearsBoth, 'a stop now clears 4.5:1 on both grounds — the section above the'
      + ' table says not one of them does').toBe(0)
  })
  test('THE THREE TYPE TABLES MEASURE THE BROWSER THEY ARE IN', async ({ page }) => {
    watch(page, 'reader checking the figures the two typography guides publish about their own type')

    // ── /learn/typeface-metrics ────────────────────────────────────────────
    // TypeMetricsTable paints each font stack to a canvas and reads the ink
    // above the baseline. It waits for document.fonts.ready and drops any
    // named family the product's own detector cannot confirm rendered, so it
    // can legitimately come back with nothing — which is right, and silent.
    // Every claim the section makes is about the numbers in it.
    await go(page, '/learn/typeface-metrics')
    const metrics = page.locator('[aria-label*="measured per em"]')
    await expect(metrics, 'TypeMetricsTable rendered nothing — no face was measurable').toBeVisible()
    const metricRows = metrics.locator('tbody tr')
    // Two product faces and three generics. A generic can never be missing, so
    // fewer than four rows means a webfont row was dropped AND a generic failed.
    await expect(metricRows).not.toHaveCount(0)
    const rowCount = await metricRows.count()
    expect(rowCount, 'the metrics table lost rows it cannot lose').toBeGreaterThanOrEqual(4)

    const aspects = []
    const matched = []
    const lastDigits = []
    for (let i = 0; i < rowCount; i += 1) {
      const cells = await metricRows.nth(i).locator('td[data-num]').allInnerTexts()
      lastDigits.push(cells[0].trim().slice(-1), cells[1].trim().slice(-1))
      matched.push(cells[3].trim())
      expect(cells, `metrics row ${i} does not print four figures`).toHaveLength(4)
      const aspect = Number(cells[0])
      const cap = Number(cells[1])
      expect(Number.isFinite(aspect) && Number.isFinite(cap),
        `metrics row ${i} printed something that is not a ratio: ${cells.join(' / ')}`).toBe(true)
      // A real face measured off real ink: the x-height is inside the em box and
      // the capitals are taller than the lowercase. A row that failed to measure
      // and printed a placeholder cannot satisfy both.
      expect(aspect, `row ${i} has an x-height of ${aspect} per em`).toBeGreaterThan(0)
      expect(aspect).toBeLessThan(1)
      expect(cap, `row ${i} measures a cap height (${cap}) no taller than its x-height (${aspect})`)
        .toBeGreaterThan(aspect)
      expect(cells[2].trim()).toMatch(/^\d+\.\d%$/)
      expect(cells[3].trim()).toMatch(/^\d+\.\dpx$/)
      aspects.push(aspect)
    }
    // The last column is the guide's own formula — u = (m / m′) s at 16px — run
    // per row against the first row's x-height. The reference row must therefore
    // match itself at exactly 16px.
    expect(matched[0], 'the reference row does not match itself at 16px').toBe('16.0px')

    // …and that assertion ALONE let a mutation through: replacing the whole
    // derivation with a constant 16 kept row one right and made every other row
    // wrong without changing the shape of anything. So the column is checked
    // against the columns it is derived FROM. Each printed size is recomputed
    // from the printed aspect values, which are rounded to three places, so the
    // tolerance is a tenth of a pixel rather than an equality.
    expect(new Set(matched).size,
      `every face matches at the same size (${matched.join(', ')}) — the last column has stopped`
      + ' dividing by the reference and is printing the base size back')
      .toBeGreaterThan(1)
    for (let i = 0; i < rowCount; i += 1) {
      const derived = (aspects[0] / aspects[i]) * 16
      const printed = Number(matched[i].replace('px', ''))
      expect(Math.abs(printed - derived),
        `row ${i} prints ${matched[i]} but its own x-height (${aspects[i]}) against the`
        + ` reference (${aspects[0]}) gives ${derived.toFixed(2)}px — the matched-size column`
        + ' does not follow from the columns beside it')
        .toBeLessThan(0.1)
    }
    // And the section's claim: the faces do not agree. If every row measured the
    // same, the table would be measuring one font under five names.
    expect(new Set(aspects.map((a) => a.toFixed(3))).size,
      'every face on this page reports the same x-height — the table is not measuring them separately')
      .toBeGreaterThan(1)

    // THE PRECISION GUARD, and it is here rather than in the unit half because
    // only a browser knows what a browser rounds.
    //
    // This table was measured at 100px and printed three decimals. At 100px the
    // ink extents come back rounded to whole pixels, so every ratio was a
    // multiple of 0.01 and the third decimal was ALWAYS a zero the component had
    // invented. That defect prints a perfectly well-formed table, satisfies
    // every assertion above, and is invisible on disk.
    //
    // A digit that cannot vary is a digit that was not measured, so: across
    // every printed x-height and cap height, the last place must not be zero in
    // all of them.
    expect(lastDigits.length, 'no ratios were read, so this guard is vacuous')
      .toBeGreaterThanOrEqual(8)
    expect(lastDigits.every((d) => d === '0'),
      `every measured ratio ends in 0 (${lastDigits.join('')}) — the last decimal place is not`
      + ' being measured, it is being padded, which is what measuring at too small an em does')
      .toBe(false)

    // And the direct form of the same check, against the browser rather than
    // against the rendered digits: re-measure at the em the component uses and
    // at the em that was wrong, and confirm the small one is the one that
    // rounds. If Chromium ever stopped rounding at 100px this would go red and
    // the guard above would become untestable rather than merely unnecessary.
    const rounding = await page.evaluate(() => {
      const ctx = document.createElement('canvas').getContext('2d')
      const stack = getComputedStyle(document.documentElement).getPropertyValue('--font').trim()
      const at = (em) => {
        ctx.font = `${em}px ${stack}`
        return ctx.measureText('x').actualBoundingBoxAscent / em
      }
      return { small: at(100), large: at(1000) }
    })
    expect(Number.isInteger(rounding.small * 100),
      `an ink extent measured at 100px came back as ${rounding.small * 100}px rather than a whole`
      + ' pixel — the premise of the precision guard above no longer holds').toBe(true)
    expect(rounding.large * 1000 % 1,
      'the same measurement at 1000px is also a whole pixel, so the larger em buys no precision')
      .not.toBe(0)

    // ── /learn/font-loading ────────────────────────────────────────────────
    await go(page, '/learn/font-loading')

    // FontFaceTable reads the @font-face rules out of the CSSOM and computes
    // each range's size. A cross-origin sheet throws rather than returning
    // nothing, so an empty table here is a real possibility.
    const faces = page.locator('[aria-label*="has been downloaded"]')
    await expect(faces, 'FontFaceTable rendered nothing — no @font-face rule was readable').toBeVisible()
    const faceRows = faces.locator('tbody tr')
    await expect(faceRows).toHaveCount(4)
    const counts = []
    for (let i = 0; i < 4; i += 1) {
      const row = faceRows.nth(i)
      const nums = await row.locator('td[data-num]').allInnerTexts()
      expect(nums, `face row ${i} does not print a weight range and a code-point count`).toHaveLength(2)
      const points = Number(nums[1].replace(/[^\d]/g, ''))
      expect(points, `face row ${i} reports ${nums[1]} code points`).toBeGreaterThan(0)
      counts.push(points)
      // Every face on this page is declared `swap`, which the guide says in the
      // section above and this reads back off the rendered row.
      await expect(row.locator('td').nth(1)).toHaveText('swap')
      await expect(row.locator('td').last()).toContainText(/^(Yes|No)/)
    }
    // The section's premise: a family is split, and the two halves are not the
    // same size. One count repeated four times means the range is not being read.
    expect(new Set(counts).size,
      `the four faces report ${[...new Set(counts)].join(', ')} code points — the ranges are not being computed separately`)
      .toBe(2)

    // FallbackShiftTable paints the same sentence in the declared stack and in
    // the stack with its webfont removed. The section's whole argument is that
    // those two are different widths.
    const shift = page.locator('[aria-label*="without its webfont"]')
    await expect(shift, 'FallbackShiftTable rendered nothing — the webfont was not confirmed').toBeVisible()
    const shiftRows = shift.locator('tbody tr')
    await expect(shiftRows).toHaveCount(3)
    const widths = []
    for (let i = 0; i < 3; i += 1) {
      const cells = await shiftRows.nth(i).locator('td[data-num]').allInnerTexts()
      expect(cells, `shift row ${i} does not print a width and a difference`).toHaveLength(2)
      expect(cells[0].trim()).toMatch(/^\d+\.\d{2}px$/)
      widths.push(Number(cells[0].replace('px', '')))
      // The first row IS the baseline, so it has nothing to differ from; every
      // other row must print a real signed percentage rather than a blank.
      if (i === 0) expect(cells[1].trim()).toBe('—')
      else expect(cells[1].trim()).toMatch(/^[+−]\d+\.\d{2}%$/)
    }
    expect(widths[0], 'the declared stack and the stack without its webfont measure the same width —'
      + ' the section above says the line re-breaks when the file lands')
      .not.toBe(widths[1])
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
