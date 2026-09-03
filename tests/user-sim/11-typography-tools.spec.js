// Personas: DESIGNER choosing a typeface, FRONT-END DEVELOPER shipping tokens,
// and a KEYBOARD-ONLY visitor.
//
// Goal: prove the three typography tools are reachable, do their primary job,
// hand state to each other rather than opening empty, and degrade visibly.
//
// NOTE ON THE ENVIRONMENT: the sandboxed runner blocks fonts.googleapis.com and
// googleapis.com, and `vite preview` does not serve /api/fonts — so every run
// here exercises the DEGRADED catalogue path for real. That is deliberate: the
// bundled-fallback notice, the retry and the "everything still works" promise
// are the states most likely to rot, and they are the ones under test.
import { test, expect } from './base.js'
import { go, watch } from './helpers.js'

async function installFontEvidenceMock(page, { fontApi, mode }) {
  await page.addInitScript(({ exposeFontApi, initialMode }) => {
    window.__fontEvidenceMode = initialMode
    if (exposeFontApi) {
      Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: {
          load: async () => [],
          check: () => false,
          ready: Promise.resolve(),
        },
      })
    } else {
      Object.defineProperty(document, 'fonts', { configurable: true, value: undefined })
    }

    const originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
      if (type !== '2d') return originalGetContext.call(this, type, ...args)
      return {
        font: '',
        measureText() {
          const generic = this.font.includes('monospace')
            ? 'monospace'
            : this.font.includes('sans-serif') ? 'sans-serif' : 'serif'
          const baseline = { monospace: 100, serif: 110, 'sans-serif': 120 }[generic]
          const target = this.font.includes('"Lora"')
          const differs = window.__fontEvidenceMode === 'loaded'
            || (window.__fontEvidenceMode === 'mixed' && generic === 'monospace')
          return { width: baseline + (target && differs ? 20 : 0) }
        },
      }
    }
  }, { exposeFontApi: fontApi, initialMode: mode })
}

test.describe('Type Scale Generator', () => {
  test('a designer generates a scale from a base size and a ratio', async ({ page }) => {
    watch(page, 'designer building a type scale')
    await go(page, '/create/type-scale')

    await expect(page.getByRole('heading', { level: 1, name: 'Type Scale Generator' })).toBeVisible()
    // Default scale: 6 steps up + base + 2 down.
    await expect(page.locator('.tsc-row')).toHaveCount(9)
    await expect(page.locator('.tsc-status')).toContainText('16px')
    await expect(page.locator('.tsc-status')).toContainText('1.25')

    // The ratio genuinely drives the maths: a bigger ratio must move the top step.
    // 16 × 1.25^6 = 61.04 and 16 × 1.5^6 = 182.25, both snapped to the default
    // nearest-0.5px rounding.
    const largest = page.locator('.tsc-row').first().locator('.tsc-row-num')
    await expect(largest).toContainText('61px')
    await page.getByLabel('Scale ratio').selectOption('1.5')
    await expect(largest).toContainText('182.5px')
    await page.getByLabel('Scale ratio').selectOption('1.25')
    await expect(largest).toContainText('61px')

    // Rounding is an explicit decision, not a hidden .toFixed().
    await page.getByLabel('Rounding').selectOption('whole')
    await expect(largest).toContainText('61px')
    await page.getByLabel('Rounding').selectOption('none')
    await expect(largest).toContainText('61.04px')

    // The audience control is now the switch that sits above the panel it
    // changes, not the pair of hero cards that used to sit two screens away
    // from it. (Tint Scale still has its own "For designers" hero tabs — see
    // 05-tint-scale-workflows.spec.js. Only Type Scale's duplicate went.)
    await expect(page.getByRole('tab', { name: /Design preview/i })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.tsc-article')).toBeVisible()
  })

  test('a developer copies CSS custom properties for the whole scale', async ({ page }) => {
    watch(page, 'front-end developer shipping type tokens')
    await go(page, '/create/type-scale')

    await page.getByRole('tab', { name: 'Developer handoff' }).click()
    await expect(page.getByRole('heading', { name: 'Prepare the handoff' })).toBeVisible()

    // The scale is now FLUID by default: two ladders (mobile and desktop)
    // joined by clamp(), so a step exports as an interpolation rather than a
    // single rem. The comment carries both ends, which is what keeps the export
    // readable by a human rather than an opaque expression.
    const code = page.locator('#tsc-export')
    await expect(code).toContainText('--text-base: clamp(')
    await expect(code).toContainText('vw,')                    // the fluid term
    await expect(code).toContainText('px → ')                  // mobile → desktop, in the comment
    await expect(code).toContainText('--text-5xl:')
    await expect(code).toContainText('--leading: 1.5;')
    await expect(code).toContainText('--font-heading:')
    await expect(page.getByRole('button', { name: /^Copy CSS$/ })).toBeVisible()

    await page.getByRole('button', { name: 'Tailwind' }).click()
    await expect(code).toContainText('fontSize: {')
    await expect(code).toContainText("'base': ['clamp(")

    await page.getByRole('button', { name: 'SCSS' }).click()
    await expect(code).toContainText('$text-base: clamp(')

    // Fixed mode is the other honest answer, for teams whose specs are stated
    // per breakpoint. Mobile-first: the base :root carries the SMALL ladder and
    // a single media query raises it, rather than desktop values being the
    // default and mobile an override.
    await page.getByRole('button', { name: 'CSS variables' }).click()
    await page.getByRole('button', { name: /Fixed · media query/ }).click()
    await expect(code).not.toContainText('clamp(')
    await expect(code).toContainText(`@media (min-width: 1440px)`)
  })

  test('the audience tabs are a real tablist for the keyboard', async ({ page }) => {
    watch(page, 'keyboard-only visitor')
    await go(page, '/create/type-scale')

    // ONE tablist, and it is the one beside its own panel. `audience` used to
    // have two controls: hero cards under role="tablist" whose aria-controls
    // named a panel 1,593px below them, and a separate aria-pressed switch
    // sitting next to that panel. The hero pair is gone and the switch carries
    // the tablist contract, so the arrow keys now move focus and selection
    // within sight of what they change.
    await expect(page.getByRole('tablist')).toHaveCount(1)

    const designer = page.getByRole('tab', { name: /Design preview/i })
    await designer.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: /Developer handoff/i })).toBeFocused()
    await expect(page.locator('#tsc-export')).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(designer).toBeFocused()
  })

  test('the scale stays contained on a small phone', async ({ page }) => {
    watch(page, 'mobile designer')
    await page.setViewportSize({ width: 320, height: 720 })
    await go(page, '/create/type-scale')

    await expect(page.locator('.tsc-row').first()).toBeVisible()
    const overflowed = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    )
    expect(overflowed, 'Type Scale should not create horizontal page overflow at 320px').toBe(false)
  })

  test('extreme 40px, ratio 3, nine-step tokens stay exact while the preview is fitted', async ({ page }) => {
    watch(page, 'designer stress-testing an extreme modular scale')
    await go(page, '/create/type-scale')

    await page.getByLabel('Scale ratio').selectOption('custom')
    await page.locator('#tsc-custom + .snapv-value').click()
    await page.getByRole('spinbutton', { name: /Custom scale ratio/ }).fill('3')
    await page.getByRole('spinbutton', { name: /Custom scale ratio/ }).press('Enter')
    await page.locator('#tsc-base + .snapv-value').click()
    await page.getByRole('spinbutton', { name: /Base font size/ }).fill('40')
    await page.getByRole('spinbutton', { name: /Base font size/ }).press('Enter')
    await page.getByLabel('Number of steps above the base size').fill('9')

    await expect(page.locator('.tsc-row').first().locator('.tsc-row-num')).toContainText('787320px')
    await expect(page.locator('.tsc-fit-note')).toContainText('Labels and exports retain the exact scale')
    const rendered = parseFloat(await page.locator('.tsc-row-text').first().evaluate(
      element => getComputedStyle(element).fontSize,
    ))
    expect(rendered).toBeLessThanOrEqual(96)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(10000)

    // The exact figure survives into the export. It is now the DESKTOP end of a
    // clamp rather than a lone rem — the extreme value is still carried
    // losslessly, which is what this test exists to prove, and the comment
    // still names it in pixels.
    await page.getByRole('tab', { name: 'Developer handoff' }).click()
    await expect(page.locator('#tsc-export')).toContainText('787320px')
    await expect(page.locator('#tsc-export')).toContainText('--text-8xl: clamp(')
  })
})

test.describe('Font Pair', () => {
  test('a designer gets reasoned body suggestions and a live specimen', async ({ page }) => {
    watch(page, 'designer choosing a font pairing')
    await go(page, '/create/font-pair')

    await expect(page.getByRole('heading', { level: 1, name: 'Font Pair' })).toBeVisible()
    await expect(page.locator('.fpr-specimen')).toBeVisible()
    await expect(page.getByRole('link', { name: /Browse the Font Gallery/ })).toHaveAttribute('href', '/create/font-gallery')
    await expect(page.getByRole('link', { name: /Select from the Font Gallery/ })).toHaveAttribute('href', '/create/font-gallery')

    const cards = page.locator('.fpr-card')
    await expect(cards).toHaveCount(6)
    // Every suggestion states WHY it is here — that is the whole point of the tool.
    for (const reason of await cards.locator('.fpr-card-reason').allInnerTexts()) {
      expect(reason.trim().length).toBeGreaterThan(20)
    }

    // Applying a pair marks it in use and swaps the body family everywhere.
    const first = cards.first()
    const chosen = (await first.locator('.fpr-card-name').innerText()).split('\n')[0].trim()
    await first.getByRole('button', { name: 'Use this pair' }).click()
    await expect(first.getByRole('button', { name: 'In use' })).toBeVisible()
    await expect(page.locator('.fpr-status')).toContainText(chosen)
  })

  test('the specimen re-lays out and honours custom preview text', async ({ page }) => {
    watch(page, 'designer testing brand words')
    await go(page, '/create/font-pair')

    await page.getByRole('button', { name: 'Product page' }).click()
    await expect(page.locator('.fpr-product')).toBeVisible()
    await page.getByRole('button', { name: 'Specimen' }).click()
    await expect(page.locator('.fpr-specimen-raw')).toBeVisible()
    await page.getByRole('button', { name: 'Article' }).click()

    await page.getByLabel('Preview text').fill('Ship interfaces that hold up')
    await expect(page.locator('.fpr-h1')).toHaveText('Ship interfaces that hold up')
  })

  test('a developer copies one import and one block of CSS', async ({ page }) => {
    watch(page, 'front-end developer wiring up two families')
    await go(page, '/create/font-pair')

    const code = page.locator('#fpr-export')
    await expect(code).toContainText('@import url(')
    await expect(code).toContainText('--font-heading:')
    await expect(code).toContainText('--font-body:')
    await expect(code).toContainText('font-family: var(--font-heading);')
    await expect(page.getByRole('button', { name: 'Copy font import' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy CSS' })).toBeVisible()
  })
})

test.describe('Font Gallery', () => {
  const loraCatalog = {
    fonts: [{
      family: 'Lora',
      category: 'serif',
      variants: [400, 700],
      subsets: ['latin'],
      popularity: 0,
    }],
  }

  test('a designer browses, filters and opens a specimen', async ({ page }) => {
    watch(page, 'designer looking for a typeface')
    await go(page, '/create/font-gallery')

    await expect(page.getByRole('heading', { level: 1, name: 'Font Gallery' })).toBeVisible()
    await expect(page.locator('.fg-card')).toHaveCount(24)

    await page.getByLabel('Preview text').fill('Make the words the interface')
    await expect(page.getByLabel('Preview text')).toHaveValue('Make the words the interface')
    // ONE SPECIMEN PER ROW, AT EVERY WIDTH.
    //
    // This assertion has now been turned twice, and both turns were founder
    // decisions rather than tests relaxed to go green. It first pinned a
    // full-width list; then a grid, on the direction that the typography tools
    // browse like the gradient and palette libraries; and now a list again, on
    // the direction of 2026-09-02 — "1 font per row and 1 column".
    //
    // What is NOT the same as the first version is what a row now contains, and
    // that is the part worth pinning. The audit that produced the grid was
    // complaining about a 790px row holding content composed for 435px, so the
    // test below asserts the row is full width AND that the specimen actually
    // spans it, which is the only version of this layout worth having.
    const cards = page.locator('.fg-card')
    const first = await cards.nth(0).boundingBox()
    const second = await cards.nth(1).boundingBox()
    expect(second.y, 'the second typeface sits under the first, not beside it')
      .toBeGreaterThan(first.y + first.height - 2)
    expect(Math.abs(second.x - first.x), 'every row starts at the same left edge').toBeLessThan(2)

    await page.getByRole('button', { name: 'Serif', exact: true }).click()
    await expect(page.locator('.fg-count')).toContainText('in Serif')
    const serifCount = await page.locator('.fg-card').count()
    expect(serifCount).toBeGreaterThan(0)
    expect(serifCount).toBeLessThan(48)
    await page.getByRole('button', { name: 'All', exact: true }).click()

    await page.getByLabel('Search font families').fill('Lora')
    await expect(page.locator('.fg-card')).toHaveCount(1)
    await page.locator('.fg-card-open').first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect(dialog.getByRole('heading', { name: 'Lora' })).toBeVisible()
    await expect(dialog.getByText('Character set')).toBeVisible()
  })

  test('code, emoji, icon and symbol families never enter the gallery', async ({ page }) => {
    watch(page, 'designer browsing a text-only type catalogue')
    await page.route('**/api/fonts', route => route.fulfill({ json: {
      fonts: [
        ...loraCatalog.fonts,
        { family: 'JetBrains Mono', category: 'monospace', variants: [400], subsets: ['latin'] },
        { family: 'Noto Color Emoji', category: 'sans-serif', variants: [400], subsets: ['emoji'] },
        { family: 'Material Symbols Rounded', category: 'display', variants: [400], subsets: ['symbols'] },
        { family: 'Libre Barcode 39', category: 'display', variants: [400], subsets: ['latin'] },
      ],
    } }))

    await go(page, '/create/font-gallery')
    await expect(page.locator('.fg-card')).toHaveCount(1)
    await expect(page.locator('.fg-card-name')).toHaveText('Lora')
    await expect(page.getByRole('button', { name: 'Mono', exact: true })).toHaveCount(0)
  })

  test('a search that matches nothing shows a real empty state with a way out', async ({ page }) => {
    watch(page, 'designer searching for a font that is not there')
    await go(page, '/create/font-gallery')

    await page.getByLabel('Search font families').fill('zzzzzznotafont')
    await expect(page.locator('.fg-empty')).toBeVisible()
    await expect(page.locator('.fg-card')).toHaveCount(0)
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.locator('.fg-card').first()).toBeVisible()
  })

  test('the specimen dialog fits the viewport and keeps its actions reachable', async ({ page }) => {
    // The defect this replaces: 1,763px of dialog in a 900px viewport, scrolling
    // the OVERLAY, so every action it offers — Find a pairing, Copy import URL,
    // Add to comparison — was below the fold the moment it opened.
    watch(page, 'designer deciding whether to use this family')
    await page.route('**/api/fonts', route => route.fulfill({ json: { fonts: [{
      family: 'Lora', category: 'serif', variants: [100, 200, 300, 400, 500, 600, 700, 800, 900],
      subsets: ['latin', 'latin-ext', 'cyrillic'], popularity: 0,
    }] } }))

    await go(page, '/create/font-gallery')
    await page.locator('.fg-card-open').first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const viewport = page.viewportSize().height
    const box = await dialog.boundingBox()
    expect(box.height, 'the dialog fits the screen it opened on').toBeLessThanOrEqual(viewport)

    // Every action is on screen WITHOUT scrolling anything.
    for (const name of [/Find a pairing/, /Build a type scale/, /Add to comparison/, /Copy import URL/]) {
      const action = dialog.getByRole('button', { name })
      await expect(action).toBeVisible()
      const ab = await action.boundingBox()
      expect(ab.bottom ?? ab.y + ab.height, `${name} is inside the viewport`).toBeLessThanOrEqual(viewport + 1)
      expect(ab.y, `${name} is inside the viewport`).toBeGreaterThanOrEqual(0)
    }

    // The body is what scrolls, not the overlay behind it.
    const overflows = await dialog.locator('.fg-detail-body').evaluate(
      (el) => el.scrollHeight > el.clientHeight,
    )
    expect(overflows, 'a nine-weight family overflows the BODY, which is the scrolling part').toBe(true)
  })

  test('the specimen dialog shows every real weight as words, and the scripts it covers', async ({ page }) => {
    // Replaces two sections that told the reader nothing: six "Ag" tiles, and a
    // "Type scale" block that printed one sentence six times, five of them
    // ellipsised. Also replaces the "1 subset" tag with the script names.
    watch(page, 'designer checking a family has the cuts and the scripts they need')
    await page.route('**/api/fonts', route => route.fulfill({ json: { fonts: [{
      family: 'Lora', category: 'serif', variants: [400, 600, 700],
      subsets: ['latin', 'latin-ext', 'cyrillic'], popularity: 0,
    }] } }))

    await go(page, '/create/font-gallery')
    await page.getByLabel('Preview text').fill('Handgloves')
    await page.locator('.fg-card-open').first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // One line per cut the family actually ships — no more, no fewer.
    const rows = dialog.locator('.fg-weight-row')
    await expect(rows).toHaveCount(3)
    await expect(dialog.locator('.fg-weight-tag')).toHaveText([
      '400 Regular', '600 SemiBold', '700 Bold',
    ])

    // Each line is drawn in its own cut, and set in the reader's own words —
    // which the dialog inherited rather than discarding when it opened.
    const lines = await dialog.locator('.fg-weight-line').evaluateAll(
      (nodes) => nodes.map((n) => `${n.textContent}:${getComputedStyle(n).fontWeight}`),
    )
    expect(lines).toEqual(['Handgloves:400', 'Handgloves:600', 'Handgloves:700'])

    // Scripts stated, not counted.
    await expect(dialog.locator('.fg-tag--scripts')).toHaveText('Latin, Latin Extended, Cyrillic')
    await expect(dialog.getByText('1 subset')).toHaveCount(0)

    // Editing the words in the dialog re-sets every cut at once.
    await dialog.getByLabel('Preview text').fill('Ampersand')
    await expect(dialog.locator('.fg-weight-line').first()).toHaveText('Ampersand')
    await expect(dialog.locator('.fg-weight-line').last()).toHaveText('Ampersand')
  })

  test('the detail dialog is closable from the keyboard and restores focus', async ({ page }) => {
    watch(page, 'keyboard-only visitor')
    await go(page, '/create/font-gallery')

    const card = page.locator('.fg-card-open').first()
    await card.click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(card).toBeFocused()
    // Background scroll must be handed back, or the page is left unusable.
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
  })

  test('rows reserve their metrics so the list never reflows as faces load', async ({ page }) => {
    watch(page, 'designer on a slow connection')
    await go(page, '/create/font-gallery')

    await expect(page.locator('.fg-card').first()).toBeVisible()
    const heights = await page.locator('.fg-card').evaluateAll(
      (nodes) => nodes.map((n) => Math.round(n.getBoundingClientRect().height)),
    )
    expect(new Set(heights).size, 'every gallery row must be the same reserved height').toBe(1)

    const boxes = await page.locator('.fg-card-preview > :first-child').evaluateAll(
      (nodes) => nodes.map((n) => Math.round(n.getBoundingClientRect().height)),
    )
    expect(new Set(boxes).size, 'the sample line must keep a fixed box whatever face lands in it').toBe(1)

    // The row's third line — the weight ladder — has its own reserved box, and
    // it is the line most likely to break this contract because its content
    // varies most. It is asserted in "a full-width row spends its width on the
    // typeface" rather than here: this test runs before any face has verified,
    // so every row is still a skeleton and a ladder-height check would be
    // uniform whatever the rule said. There it compares a nine-cut family
    // against a two-cut one with both faces actually painting.
  })

  test('a full-width row spends its width on the typeface, not on empty space', async ({ page }) => {
    // The point of one-per-row. The 2026-09-01 audit found a 790px row whose
    // content was composed for a 435px card, and one column by intent looks
    // exactly like one column by accident unless the row is rebuilt to want the
    // width — so this pins the three lines that do.
    watch(page, 'designer judging a typeface across a full-width row')
    // Two families with very different weight counts — nine against two — so the
    // row that varies most in ladder content is compared against the row that
    // varies least.
    await page.route('**/api/fonts', route => route.fulfill({ json: { fonts: [
      {
        family: 'Lora', category: 'serif', variants: [100, 300, 400, 500, 700, 900],
        subsets: ['latin', 'latin-ext', 'cyrillic', 'vietnamese'], popularity: 0,
      },
      {
        family: 'PT Sans', category: 'sans-serif', variants: [400, 700],
        subsets: ['latin', 'cyrillic'], popularity: 1,
      },
    ] } }))

    await go(page, '/create/font-gallery')
    const row = page.locator('.fg-card').first()
    await expect(row).toBeVisible()

    const rowBox = await row.boundingBox()
    const shot = await page.locator('.fg-card-open').first().boundingBox()
    expect(shot.width, 'the specimen block fills the row it is given')
      .toBeGreaterThan(rowBox.width - 2)

    // THE WEIGHT LADDER. The gallery's whole answer to "what weights has this
    // family got" used to be the string "6w" in the card foot. It now draws
    // them, and each numeral is set in the cut it names.
    const ladder = page.locator('.fg-card-ladder').first()
    await expect(ladder).toBeVisible()
    const steps = ladder.locator('.fg-card-step')
    await expect(steps).toHaveCount(5)
    await expect(steps.first()).toHaveText('100')
    await expect(steps.last()).toHaveText('900')

    const stepWeights = await steps.evaluateAll(
      (nodes) => nodes.map((n) => `${n.textContent}:${getComputedStyle(n).fontWeight}`),
    )
    expect(stepWeights, 'each numeral is rendered at the weight it names')
      .toEqual(['100:100', '300:300', '500:500', '700:700', '900:900'])

    // A two-weight family draws two numerals, and its ladder still occupies the
    // SAME reserved box — the row must not shrink or grow with the weight count,
    // or a list of mixed families would step up and down as faces arrive.
    const shortLadder = page.locator('.fg-card-ladder').nth(1)
    await expect(shortLadder.locator('.fg-card-step')).toHaveCount(2)
    const ladderBoxes = await page.locator('.fg-card-ladder').evaluateAll(
      (nodes) => nodes.map((n) => Math.round(n.getBoundingClientRect().height)),
    )
    expect(ladderBoxes.length).toBe(2)
    expect(new Set(ladderBoxes).size, 'nine cuts and two cuts reserve the same ladder box').toBe(1)

    // The body line is running text at body weight, not a 43-character squeeze.
    const bodyLine = await page.locator('.fg-card-pangram').first().textContent()
    expect(bodyLine.length, 'the body sample uses the width it now has').toBeGreaterThan(90)

    // Script coverage at the row's far edge — the fact the grid never showed.
    await expect(page.locator('.fg-card-scripts').first())
      .toHaveText('Latin, Latin Extended, Cyrillic +1')
  })

  test('a held stylesheet keeps skeletons visible until the face registers, then reveals without FOUT', async ({ page }) => {
    watch(page, 'designer on a font stylesheet that is slow but succeeds')
    await page.addInitScript(() => {
      window.__fontFaceReady = false
      Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: {
          load: async () => window.__fontFaceReady ? [{}] : [],
          check: () => window.__fontFaceReady,
          ready: Promise.resolve(),
        },
      })
    })
    await page.route('**/api/fonts', route => route.fulfill({ json: loraCatalog }))
    let releaseStylesheet
    const stylesheetGate = new Promise(resolve => { releaseStylesheet = resolve })
    await page.route(/https:\/\/fonts\.googleapis\.com\/css2\?family=Lora/, async route => {
      await stylesheetGate
      await route.fulfill({ contentType: 'text/css', body: '/* registered by the test FontFaceSet */' })
    })

    await go(page, '/create/font-gallery')
    const preview = page.locator('.fg-card-preview').first()
    await expect(preview).toHaveClass(/fg-card-preview--pending/)
    await expect(preview.locator('.fg-card-sample')).toHaveCount(0)
    await page.waitForTimeout(300)
    await expect(preview).toHaveClass(/fg-card-preview--pending/)

    await page.evaluate(() => { window.__fontFaceReady = true })
    releaseStylesheet()
    await expect(preview).not.toHaveClass(/fg-card-preview--pending/)
    await expect(preview.locator('.fg-card-sample')).toHaveText('Lora')
  })

  test('a blocked stylesheet reports fallback and a successful retry clears the failure', async ({ page }) => {
    watch(page, 'designer recovering a font after a content blocker is paused')
    await page.addInitScript(() => {
      window.__fontFaceReady = false
      Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: {
          load: async () => window.__fontFaceReady ? [{}] : [],
          check: () => window.__fontFaceReady,
          ready: Promise.resolve(),
        },
      })
    })
    await page.route('**/api/fonts', route => route.fulfill({ json: loraCatalog }))
    let blocked = true
    await page.route('https://fonts.googleapis.com/css2**', route => (
      blocked
        ? route.abort('blockedbyclient')
        : route.fulfill({ contentType: 'text/css', body: '/* retry success */' })
    ))

    await go(page, '/create/font-gallery')
    await page.locator('.fg-card-open').first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('.typ-notice')).toContainText('fallback is shown')

    blocked = false
    await page.evaluate(() => { window.__fontFaceReady = true })
    await dialog.getByRole('button', { name: 'Retry this font' }).click()
    await expect(dialog.locator('.typ-notice')).toHaveCount(0)
    await expect(dialog.getByRole('heading', { name: 'Lora' })).toBeVisible()
  })

  test('inconclusive multi-baseline evidence never reveals a fallback specimen as loaded', async ({ page }) => {
    watch(page, 'designer whose browser reports mixed font metrics')
    await installFontEvidenceMock(page, { fontApi: true, mode: 'mixed' })
    await page.route('**/api/fonts', route => route.fulfill({ json: loraCatalog }))
    await page.route(/https:\/\/fonts\.googleapis\.com\/css2\?family=Lora/, route => (
      route.fulfill({ contentType: 'text/css', body: '/* stylesheet settled */' })
    ))

    await go(page, '/create/font-gallery')
    const preview = page.locator('.fg-card-preview').first()
    await expect(preview).toHaveClass(/fg-card-preview--pending/)
    await expect(preview.locator('.fg-card-sample')).toHaveCount(0)
    await page.locator('.fg-card-open').first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('.typ-notice')).toContainText('fallback is shown')

    await page.evaluate(() => { window.__fontEvidenceMode = 'loaded' })
    await dialog.getByRole('button', { name: 'Retry this font' }).click()
    await expect(dialog.locator('.typ-notice')).toHaveCount(0)
  })

  test('without document.fonts a settled stylesheet still needs canvas proof and can retry', async ({ page }) => {
    watch(page, 'designer whose browser has no Font Loading API')
    await installFontEvidenceMock(page, { fontApi: false, mode: 'fallback' })
    await page.route('**/api/fonts', route => route.fulfill({ json: loraCatalog }))
    await page.route(/https:\/\/fonts\.googleapis\.com\/css2\?family=Lora/, route => (
      route.fulfill({ contentType: 'text/css', body: '/* binary intentionally missing */' })
    ))

    await go(page, '/create/font-gallery')
    const preview = page.locator('.fg-card-preview').first()
    await expect(preview).toHaveClass(/fg-card-preview--pending/)
    await expect(preview.locator('.fg-card-sample')).toHaveCount(0)
    await page.locator('.fg-card-open').first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('.typ-notice')).toContainText('font file did not become usable')

    await page.evaluate(() => { window.__fontEvidenceMode = 'loaded' })
    await dialog.getByRole('button', { name: 'Retry this font' }).click()
    await expect(dialog.locator('.typ-notice')).toHaveCount(0)
  })
})

test.describe('typography hand-offs', () => {
  test('a family carries from the gallery into Font Pair and on into the Type Scale', async ({ page }) => {
    watch(page, 'designer building a whole typography system')
    await go(page, '/create/font-gallery')

    await page.getByLabel('Search font families').fill('Merriweather')
    await page.locator('.fg-card-open').first().click()
    await page.getByRole('dialog').getByRole('button', { name: /Find a pairing/ }).click()

    await expect.poll(() => new URL(page.url()).pathname).toBe('/create/font-pair')
    // Never an empty tool: the chosen family arrives as the heading.
    await expect(page.locator('.fpr-status')).toContainText('Merriweather')
    await expect(page.locator('.fpr-card')).not.toHaveCount(0)

    await page.getByRole('button', { name: /Build a scale from this pair/ }).click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/create/type-scale')
    await expect(page.locator('.tsc-row').first()).toBeVisible()
    const family = await page.locator('.tsc-row-text--heading').first().evaluate(
      (el) => getComputedStyle(el).fontFamily,
    )
    expect(family).toContain('Merriweather')
  })

  test('a direct visit to a destination inherits nothing from an earlier hand-off', async ({ page }) => {
    watch(page, 'visitor arriving from a bookmark')
    await go(page, '/create/type-scale')
    // The slot is one-consumption and in-memory only: a fresh load has no draft,
    // so the tool opens on the saved kit rather than someone else's leftovers.
    await expect(page.locator('.tsc-row')).toHaveCount(9)
    await expect(page.locator('.toast.show')).toHaveCount(0)
  })
})

test.describe('typography tools under a failing font catalogue', () => {
  test('a catalogue source that never answers falls back within the request bound', async ({ page }) => {
    watch(page, 'visitor on a connection that stalls without failing')
    let sourceStartedAt = null
    let sourceReleased = false
    await page.route('**/api/fonts', async (route) => {
      sourceStartedAt = Date.now()
      await new Promise(resolve => setTimeout(resolve, 5000))
      sourceReleased = true
      await route.abort().catch(() => {})
    })

    await go(page, '/create/font-gallery')
    await expect.poll(() => sourceStartedAt).not.toBeNull()
    await expect(page.locator('.typ-notice')).toContainText('bundled list', { timeout: 4500 })
    expect(sourceReleased, 'the request bound must beat the deliberately held upstream').toBe(false)
    expect(
      Date.now() - sourceStartedAt,
      'the stalled source must fall back well before the 5s upstream release',
    ).toBeLessThan(4500)
    await expect(page.locator('.fg-card').first()).toBeVisible()
  })

  test('a blocked catalogue degrades visibly and still lets the tools work', async ({ page }) => {
    watch(page, 'visitor behind a content blocker')
    await go(page, '/create/font-gallery')

    // The sandbox blocks googleapis.com, so this is the real fallback path.
    const notice = page.locator('.typ-notice')
    await expect(notice).toBeVisible()
    await expect(notice).toContainText('bundled list')
    await expect(notice.getByRole('button', { name: /Try the full catalogue again/ })).toBeEnabled()

    // Degraded, not broken: the grid, the filters and the specimen all work.
    await expect(page.locator('.fg-card').first()).toBeVisible()
    await page.locator('.fg-card-open').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('going offline is reported without losing the workbench', async ({ page, context }) => {
    watch(page, 'visitor whose connection drops mid-session')
    await go(page, '/create/type-scale')
    await expect(page.locator('.tsc-row').first()).toBeVisible()

    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.locator('.typ-notice')).toContainText('offline')

    // The scale is pure maths — it must keep responding with the network gone.
    await page.getByLabel('Scale ratio').selectOption('1.5')
    await expect(page.locator('.tsc-row').first().locator('.tsc-row-num')).toContainText('182.5px')

    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.locator('.tsc-row').first()).toBeVisible()
  })
})

// ── Choosing a family is BROWSABLE, not recall-and-type ──────────────────────
// The founder's report was that picking a pair "expects you to remember and
// type font names". The cause was structural rather than cosmetic: the picker
// was a native <select>, and a <select> renders every option in the UI font, so
// there was no arrangement of it that could show a face. These tests pin the
// property that fixes it — you can SEE what you are choosing — plus the
// keyboard contract the <select> used to give for free.
test.describe('the font picker is browsable', () => {
  test('a designer picks a heading face by looking at specimens', async ({ page }) => {
    watch(page, 'designer choosing a heading face')
    await go(page, '/fontpairs')

    const trigger = page.locator('.typ-picker-trigger').first()
    await expect(trigger).toBeVisible()
    await trigger.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')

    // THE POINT OF THE WHOLE CHANGE: each tile renders in its OWN family, so
    // the grid shows faces rather than a list of names in one font. A <select>
    // could never satisfy this, which is why it had to go.
    const families = await dialog.locator('.fbd-sample').evaluateAll(
      (nodes) => nodes.slice(0, 6).map((n) => getComputedStyle(n).fontFamily),
    )
    expect(families.length).toBeGreaterThan(3)
    expect(new Set(families).size, 'each specimen tile renders in its own family').toBeGreaterThan(1)

    // Search narrows, and picking a tile closes the dialog and applies the face.
    await dialog.getByLabel('Search font families').fill('Lora')
    const tile = dialog.locator('.fbd-card', { hasText: 'Lora' }).first()
    await expect(tile).toBeVisible()
    await tile.locator('.fbd-tile').click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(trigger.locator('.typ-picker-name')).toHaveText('Lora')
  })

  test('the browser closes from the keyboard and hands focus back', async ({ page }) => {
    watch(page, 'keyboard-only visitor choosing a face')
    await go(page, '/typescale')

    const trigger = page.locator('.typ-picker-trigger').first()
    await trigger.click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(trigger).toBeFocused()
    // Background scroll must be handed back, or the page is left unusable.
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
  })

  test('the trigger shows the current family in that family', async ({ page }) => {
    watch(page, 'designer glancing at the current selection')
    await go(page, '/fontpairs')

    // The trigger is a preview, not a label: its specimen must resolve to the
    // selected family and not to the UI font.
    const face = page.locator('.typ-picker-face').first()
    const named = await page.locator('.typ-picker-name').first().innerText()
    const stack = await face.evaluate((n) => getComputedStyle(n).fontFamily)
    expect(stack.toLowerCase()).toContain(named.toLowerCase())
  })
})

test('coarse-pointer typography controls expose 44px hit targets', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  watch(page, 'mobile designer using touch controls')
  const expectTarget = async (locator, label) => {
    const box = await locator.boundingBox()
    expect(box, `${label} should have a rendered box`).not.toBeNull()
    expect(box.width, `${label} width`).toBeGreaterThanOrEqual(44)
    expect(box.height, `${label} height`).toBeGreaterThanOrEqual(44)
  }

  await go(page, '/create/font-gallery')
  await expect(page.locator('.fg-card').first()).toBeVisible()
  await expectTarget(page.locator('.fg-card-compare').first(), 'Font Gallery compare')
  // The bespoke .fg-sort-btn segment is now the shared Library filter control.
  await expectTarget(page.locator('.lbry-filter').first(), 'Font Gallery filter')
  await page.locator('.fg-card-compare').first().click()
  await expectTarget(page.locator('.fg-compare-tray .fg-more-btn').first(), 'Font Gallery clear')

  await go(page, '/create/font-pair')
  await expect(page.locator('.fpr-card').first()).toBeVisible()
  await expectTarget(page.locator('.fpr-card-apply').first(), 'Font Pair apply')

  await go(page, '/create/type-scale')
  await expect(page.locator('.tsc-width-btn').first()).toBeVisible()
  await expectTarget(page.locator('.tsc-width-btn').first(), 'Type Scale width')
  await context.close()
})
