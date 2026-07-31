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
import { test, expect } from '@playwright/test'
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
    await go(page, '/typescale')

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

    await expect(page.getByRole('tab', { name: /For designers/i })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.tsc-article')).toBeVisible()
  })

  test('a developer copies CSS custom properties for the whole scale', async ({ page }) => {
    watch(page, 'front-end developer shipping type tokens')
    await go(page, '/typescale')

    await page.getByRole('button', { name: 'Developer handoff' }).click()
    await expect(page.getByRole('heading', { name: 'Prepare the handoff' })).toBeVisible()

    const code = page.locator('#tsc-export')
    await expect(code).toContainText('--text-base: 1rem;')
    await expect(code).toContainText('--text-5xl:')
    await expect(code).toContainText('--leading: 1.5;')
    await expect(code).toContainText('--font-heading:')
    await expect(page.getByRole('button', { name: /^Copy CSS$/ })).toBeVisible()

    await page.getByRole('button', { name: 'Tailwind' }).click()
    await expect(code).toContainText('fontSize: {')
    await expect(code).toContainText("'base': ['1rem'")

    await page.getByRole('button', { name: 'SCSS' }).click()
    await expect(code).toContainText('$text-base: 1rem;')
  })

  test('the audience tabs are a real tablist for the keyboard', async ({ page }) => {
    watch(page, 'keyboard-only visitor')
    await go(page, '/typescale')

    const designer = page.getByRole('tab', { name: /For designers/i })
    await designer.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: /For developers/i })).toBeFocused()
    await expect(page.locator('#tsc-export')).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(designer).toBeFocused()
  })

  test('the scale stays contained on a small phone', async ({ page }) => {
    watch(page, 'mobile designer')
    await page.setViewportSize({ width: 320, height: 720 })
    await go(page, '/typescale')

    await expect(page.locator('.tsc-row').first()).toBeVisible()
    const overflowed = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    )
    expect(overflowed, 'Type Scale should not create horizontal page overflow at 320px').toBe(false)
  })

  test('extreme 40px, ratio 3, nine-step tokens stay exact while the preview is fitted', async ({ page }) => {
    watch(page, 'designer stress-testing an extreme modular scale')
    await go(page, '/typescale')

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

    await page.getByRole('button', { name: 'Developer handoff' }).click()
    await expect(page.locator('#tsc-export')).toContainText('--text-8xl: 49207.5rem; /* 787320px */')
  })
})

test.describe('Font Pair', () => {
  test('a designer gets reasoned body suggestions and a live specimen', async ({ page }) => {
    watch(page, 'designer choosing a font pairing')
    await go(page, '/fontpairs')

    await expect(page.getByRole('heading', { level: 1, name: 'Font Pair' })).toBeVisible()
    await expect(page.locator('.fpr-specimen')).toBeVisible()

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
    await go(page, '/fontpairs')

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
    await go(page, '/fontpairs')

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
    await go(page, '/fontgallery')

    await expect(page.getByRole('heading', { level: 1, name: 'Font Gallery' })).toBeVisible()
    await expect(page.locator('.fg-card')).toHaveCount(48)

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

  test('a search that matches nothing shows a real empty state with a way out', async ({ page }) => {
    watch(page, 'designer searching for a font that is not there')
    await go(page, '/fontgallery')

    await page.getByLabel('Search font families').fill('zzzzzznotafont')
    await expect(page.locator('.fg-empty')).toBeVisible()
    await expect(page.locator('.fg-card')).toHaveCount(0)
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.locator('.fg-card').first()).toBeVisible()
  })

  test('the detail dialog is closable from the keyboard and restores focus', async ({ page }) => {
    watch(page, 'keyboard-only visitor')
    await go(page, '/fontgallery')

    const card = page.locator('.fg-card-open').first()
    await card.click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(card).toBeFocused()
    // Background scroll must be handed back, or the page is left unusable.
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
  })

  test('cards reserve their metrics so the grid never reflows as faces load', async ({ page }) => {
    watch(page, 'designer on a slow connection')
    await go(page, '/fontgallery')

    await expect(page.locator('.fg-card').first()).toBeVisible()
    const heights = await page.locator('.fg-card').evaluateAll(
      (nodes) => nodes.map((n) => Math.round(n.getBoundingClientRect().height)),
    )
    expect(new Set(heights).size, 'every gallery card must be the same reserved height').toBe(1)

    const boxes = await page.locator('.fg-card-preview > :first-child').evaluateAll(
      (nodes) => nodes.map((n) => Math.round(n.getBoundingClientRect().height)),
    )
    expect(new Set(boxes).size, 'the sample line must keep a fixed box whatever face lands in it').toBe(1)
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

    await go(page, '/fontgallery')
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

    await go(page, '/fontgallery')
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

    await go(page, '/fontgallery')
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

    await go(page, '/fontgallery')
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
    await go(page, '/fontgallery')

    await page.getByLabel('Search font families').fill('Merriweather')
    await page.locator('.fg-card-open').first().click()
    await page.getByRole('dialog').getByRole('button', { name: /Find a pairing/ }).click()

    await expect.poll(() => new URL(page.url()).pathname).toBe('/fontpairs')
    // Never an empty tool: the chosen family arrives as the heading.
    await expect(page.locator('.fpr-status')).toContainText('Merriweather')
    await expect(page.locator('.fpr-card')).not.toHaveCount(0)

    await page.getByRole('button', { name: /Build a scale from this pair/ }).click()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/typescale')
    await expect(page.locator('.tsc-row').first()).toBeVisible()
    const family = await page.locator('.tsc-row-text--heading').first().evaluate(
      (el) => getComputedStyle(el).fontFamily,
    )
    expect(family).toContain('Merriweather')
  })

  test('a direct visit to a destination inherits nothing from an earlier hand-off', async ({ page }) => {
    watch(page, 'visitor arriving from a bookmark')
    await go(page, '/typescale')
    // The slot is one-consumption and in-memory only: a fresh load has no draft,
    // so the tool opens on the saved kit rather than someone else's leftovers.
    await expect(page.locator('.tsc-row')).toHaveCount(9)
    await expect(page.locator('.toast.show')).toHaveCount(0)
  })
})

test.describe('typography tools under a failing font catalogue', () => {
  test('a catalogue source that never answers falls back within the request bound', async ({ page }) => {
    watch(page, 'visitor on a connection that stalls without failing')
    await page.route('**/api/fonts', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 5000))
      await route.abort().catch(() => {})
    })

    const started = Date.now()
    await go(page, '/fontgallery')
    await expect(page.locator('.typ-notice')).toContainText('bundled list', { timeout: 4000 })
    expect(Date.now() - started, 'the stalled source must not hold the loading UI').toBeLessThan(4000)
    await expect(page.locator('.fg-card').first()).toBeVisible()
  })

  test('a blocked catalogue degrades visibly and still lets the tools work', async ({ page }) => {
    watch(page, 'visitor behind a content blocker')
    await go(page, '/fontgallery')

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
    await go(page, '/typescale')
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

  await go(page, '/fontgallery')
  await expect(page.locator('.fg-card').first()).toBeVisible()
  await expectTarget(page.locator('.fg-card-compare').first(), 'Font Gallery compare')
  await expectTarget(page.locator('.fg-sort-btn').first(), 'Font Gallery sort')
  await page.locator('.fg-card-compare').first().click()
  await expectTarget(page.locator('.fg-compare-tray .fg-more-btn').first(), 'Font Gallery clear')

  await go(page, '/fontpairs')
  await expect(page.locator('.fpr-card').first()).toBeVisible()
  await expectTarget(page.locator('.fpr-card-apply').first(), 'Font Pair apply')

  await go(page, '/typescale')
  await expect(page.locator('.tsc-width-btn').first()).toBeVisible()
  await expectTarget(page.locator('.tsc-width-btn').first(), 'Type Scale width')
  await context.close()
})
