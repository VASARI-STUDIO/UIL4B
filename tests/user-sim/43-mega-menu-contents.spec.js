// The mega menu shows the product, and says where to start.
//
// #340 fixed this panel's STRUCTURE: the clipped bottom, the truncated labels,
// the misplaced eyebrow, the blank editorial card, hover on touch, and the
// seventh hand-kept copy of the tool list. All of that stayed fixed. The
// complaint that arrived afterwards was different in kind -- the panel was
// correct and still generic -- and it had two causes this file guards.
//
// ONE: the card drew a picture of a UI instead of showing one. PromoMock
// rendered grey <rect> bars standing in for text beside coloured rectangles
// standing in for swatches, in a menu leading to 64 real palettes and 100 real
// gradients. The tests below assert the previews carry values read from the
// SAME gallery data the tools read, so the nav cannot advertise something the
// product does not contain -- and that Learn, which is honestly unbuilt, gets
// no preview at all. That absence is load-bearing: it is what makes live and
// unbuilt read apart without hunting for a badge.
//
// TWO: nothing said which tool to open first. The product already had an
// opinion -- promo.guide/promo.cta, honoured by the mobile sheet, dropped on
// desktop, where the card headed "Build your brand kit, step by step" offered
// one link to /sitemap. The desktop card now renders the guided path from
// UIKIT_STEPS and the button that launches it.
//
// THE KEYBOARD CONTRACT IS THE POINT OF THIS FILE, not a footnote. #340
// verified fifteen behaviours by hand and only three of them were ever committed
// as assertions, which means fourteen months of refactors could have taken any
// of the other twelve without a single test going red. Restructuring the panel
// is exactly the change that would, so all fifteen are written down here against
// the markup that ships now.
import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './base.js'
import { watch, go } from './helpers.js'
import { GALLERY_PALETTES } from '../../src/data/paletteGallery.js'
import { GALLERY_GRADIENTS, gradientCss } from '../../src/data/gradientGallery.js'

// Derived, never hand-listed. A literal copy of these labels here would be the
// eighth hand-kept list in a codebase that has spent two PRs deleting the first
// seven, and it would pass while the guide itself changed underneath it.
function guideStepLabels() {
  const src = fs.readFileSync(path.join('src', 'components', 'UIKitGuide.jsx'), 'utf8')
  const block = src.slice(src.indexOf('export const UIKIT_STEPS = ['))
  const body = block.slice(0, block.indexOf('\n]'))
  return [...body.matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1])
}

const TRIGGERS = ['Create', 'Discover', 'Learn']

/** Every menu item a person can actually reach: rendered ones, in DOM order. */
function ring(page) {
  return page.evaluate(() => [...document.querySelectorAll('#pnav-mega [data-pnav-menuitem]')]
    .filter((el) => el.getClientRects().length > 0)
    .map((el) => (el.textContent || '').trim()))
}

const focusedText = (page) => page.evaluate(() => (document.activeElement.textContent || '').trim())

async function openWithPointer(page, name) {
  await page.getByRole('button', { name, exact: true }).click()
  await expect(page.getByRole('region', { name: `${name} menu` })).toBeVisible()
}

/**
 * Enter dark by seeding storage and RELOADING.
 *
 * Stamping data-theme on <html> with setAttribute does not re-render React, so a
 * branch written that way asserts nothing -- that exact mistake shipped a
 * vacuous test in #341 and was only caught by mutation. The boot script reads
 * vs-t before first paint, so seeding plus a reload is the only honest way in.
 */
async function enterDark(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem('vs-t', 'dark') } catch { /* blocked storage */ }
  })
  await go(page, '/')
  await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark')
}

test.describe('the mega menu shows real contents and keeps its keyboard contract', () => {
  // ── The complaint: it read as a directory, not as this product ────────────

  test('the Create card previews a real stored palette, not a drawing of one', async ({ page }) => {
    watch(page, 'a first-time visitor deciding whether this product is for them')
    await go(page, '/')
    await openWithPointer(page, 'Create')

    const swatches = page.locator('.pnav-prev--create .pnav-prev-swatch')
    const expected = GALLERY_PALETTES[0].colors
    await expect(swatches).toHaveCount(expected.length)

    // Read back the painted colour of every swatch and compare against the
    // gallery entry itself. This is what makes the preview un-fakeable: a
    // decorative row of pleasant rectangles would fail here.
    const painted = await swatches.evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor))
    const asRgb = (hex) => {
      const h = hex.replace('#', '')
      const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
      return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
    }
    expect(painted).toEqual(expected.map(asRgb))

    // The two families that genuinely ship, doing two jobs. A third specimen
    // cannot be honest here: --serif resolves to Manrope, the same value as
    // --font (serif-token-is-not-a-serif).
    await expect(page.locator('.pnav-prev-ag')).toHaveText('Ag')
    const mono = await page.locator('.pnav-prev-mono').evaluate((el) => getComputedStyle(el).fontFamily)
    expect(mono.toLowerCase()).toContain('jetbrains')
  })

  test('the Discover card previews real gradients at their stored angles', async ({ page }) => {
    watch(page, 'a designer scanning for something worth a tab')
    await go(page, '/')
    await openWithPointer(page, 'Discover')

    const tiles = page.locator('.pnav-prev--discover .pnav-prev-grad')
    await expect(tiles).toHaveCount(3)

    // The angle is the assertion. A gradient rendered at a default 180deg would
    // look plausible and be a different object from the one the gallery ships.
    const painted = await tiles.evaluateAll((els) => els.map((el) => el.style.backgroundImage))
    const expected = GALLERY_GRADIENTS.slice(0, 3).map((g) => gradientCss(g.type, g.angle, g.stops))

    // Normalise the expected strings through the SAME CSS parser that produced
    // the painted ones -- the browser rewrites #FF512F as rgb(255, 81, 47), so a
    // raw string compare fails on notation while the gradients are identical.
    // Round-tripping both sides keeps the assertion about the gradient rather
    // than about hex formatting.
    const normalised = await page.evaluate((list) => list.map((css) => {
      const probe = document.createElement('div')
      probe.style.backgroundImage = css
      return probe.style.backgroundImage
    }), expected)

    expect(painted).toEqual(normalised)
    expect(normalised.some((css) => /\d+deg/.test(css))).toBe(true)
  })

  test('Learn gets no preview at all, because Learn is not built', async ({ page }) => {
    watch(page, 'a visitor checking whether the guides exist yet')
    await go(page, '/')
    await openWithPointer(page, 'Learn')

    // Not "an empty box" and not "a book illustration" -- no frame either. The
    // absence is the honest signal, and it is only honest if it is total.
    await expect(page.locator('#pnav-mega .pnav-editorial-visual')).toHaveCount(0)
    await expect(page.locator('#pnav-mega .pnav-prev')).toHaveCount(0)

    // Every Learn row is Soon today, so the panel must not offer a "start here"
    // action it cannot honour.
    await expect(page.locator('#pnav-mega .pnav-editorial-cta')).toHaveCount(0)
  })

  test('the Create card names the guided path and launches it', async ({ page }) => {
    watch(page, 'a new visitor asking which tool to open first')
    await go(page, '/')
    await openWithPointer(page, 'Create')

    const labels = guideStepLabels()
    expect(labels.length).toBeGreaterThan(2)
    await expect(page.locator('#pnav-mega .pnav-step-label')).toHaveText(labels)
    await expect(page.locator('#pnav-mega .pnav-step-n').first()).toHaveText('1')

    // The button the card's own copy has always promised. It was in the data and
    // on the mobile sheet, and the desktop panel dropped it.
    const cta = page.locator('#pnav-mega .pnav-editorial-cta')
    await expect(cta).toBeVisible()
    await cta.click()
    // /create/color is the merged studio and is NOT one of the redirect-only
    // category homes, so the guided flow opens a page rather than bouncing.
    await expect.poll(() => new URL(page.url()).pathname).toBe('/create/color')
  })

  test('column heads wear their own category hue instead of one shared accent', async ({ page }) => {
    watch(page, 'a scanner trying to tell six columns apart')
    await go(page, '/')
    await openWithPointer(page, 'Create')

    const rules = await page.locator('#pnav-mega .pnav-col-label').evaluateAll(
      (els) => els.map((el) => getComputedStyle(el, '::before').backgroundColor),
    )
    // Six columns previously drew one identical accent rule. At least three
    // distinct hues now, which is what stops the panel reading as one field.
    expect(new Set(rules).size).toBeGreaterThanOrEqual(3)
  })

  // ── The fifteen-part keyboard contract, on the new markup ────────────────

  test('the full keyboard contract survives the restructure', async ({ page }) => {
    watch(page, 'a keyboard-first designer')
    await go(page, '/')

    const create = page.getByRole('button', { name: 'Create', exact: true })
    const discover = page.getByRole('button', { name: 'Discover', exact: true })
    const learn = page.getByRole('button', { name: 'Learn', exact: true })
    const menu = page.getByRole('region', { name: 'Create menu' })

    // 13 + 14 · the disclosure contract, closed.
    await expect(create).toHaveAttribute('aria-expanded', 'false')
    expect(await create.getAttribute('aria-controls')).toBeNull()

    // 1 · ArrowDown opens and enters at the top.
    await create.focus()
    await create.press('ArrowDown')
    await expect(menu).toBeVisible()
    // 13 + 14 · and open.
    await expect(create).toHaveAttribute('aria-expanded', 'true')
    await expect(create).toHaveAttribute('aria-controls', 'pnav-mega')

    const items = await ring(page)
    expect(items.length).toBeGreaterThan(5)

    // WHAT IS IN THE RING, not just how many. Every assertion below reads
    // items[0] and items[at end] back out of the live DOM, so on its own the
    // walk would happily pass against a ring that had silently lost members --
    // mutation-checked, and it did. These two names are the contract: the
    // card's primary action and the panel's last link were BOTH unreachable by
    // keyboard before this pass, jumped over in each direction by the Tab
    // bridge, so naming them is what stops that regressing quietly.
    expect(items[0]).toContain('Build a brand kit')
    expect(items[items.length - 1]).toContain('How UIL4B works')
    // The trigger handler focuses inside requestAnimationFrame twice over, so
    // every assertion that follows a trigger key has to settle rather than read
    // the first frame. Arrow keys WITHIN the panel move focus synchronously and
    // are asserted directly.
    await expect.poll(() => focusedText(page)).toBe(items[0])

    // 5 · ArrowDown walks forward.
    await page.keyboard.press('ArrowDown')
    expect(await focusedText(page)).toBe(items[1])

    // 6 · ArrowUp walks back, and wraps off the top.
    await page.keyboard.press('ArrowUp')
    expect(await focusedText(page)).toBe(items[0])
    await page.keyboard.press('ArrowUp')
    expect(await focusedText(page)).toBe(items[items.length - 1])

    // 7 + 8 · Home and End.
    await page.keyboard.press('Home')
    expect(await focusedText(page)).toBe(items[0])
    await page.keyboard.press('End')
    expect(await focusedText(page)).toBe(items[items.length - 1])

    // 11 · Shift+Tab off the first item returns to the trigger that owns it.
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+Tab')
    await expect(create).toBeFocused()

    // 10 · forward Tab off an open trigger bridges into the panel it opened,
    // rather than landing on the next trigger (the panel is rendered after
    // </nav>, so nothing but this handler puts it in reach).
    await page.keyboard.press('Tab')
    await expect.poll(() => focusedText(page)).toBe(items[0])

    // 12 · Tab off the last item closes the menu and carries on along the bar.
    await page.keyboard.press('End')
    await page.keyboard.press('Tab')
    await expect(menu).toBeHidden()
    await expect(create).toHaveAttribute('aria-expanded', 'false')

    // 9 · Escape closes and gives focus back to the control that owns the layer.
    await create.focus()
    await create.press('ArrowDown')
    await expect(menu).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(create).toBeFocused()

    // 2 · ArrowUp opens and enters at the BOTTOM.
    await create.press('ArrowUp')
    await expect(menu).toBeVisible()
    await expect.poll(() => focusedText(page)).toBe(items[items.length - 1])
    await page.keyboard.press('Escape')

    // 3 + 4 · Left/Right walk the three triggers, and wrap both ways.
    await create.focus()
    await create.press('ArrowRight')
    await expect(discover).toBeFocused()
    await discover.press('ArrowRight')
    await expect(learn).toBeFocused()
    await learn.press('ArrowRight')
    await expect(create).toBeFocused()
    await create.press('ArrowLeft')
    await expect(learn).toBeFocused()
  })

  test('the Soon badge adds no focus stop', async ({ page }) => {
    watch(page, 'a keyboard user tabbing past what is not built yet')
    await go(page, '/')
    await openWithPointer(page, 'Create')

    const soonRow = page.locator('#pnav-mega .pnav-tool[data-soon]').first()
    await expect(soonRow.locator('.soon-badge')).toHaveCount(1)
    await soonRow.focus()

    const before = await focusedText(page)
    await page.keyboard.press('Tab')
    const after = await focusedText(page)

    // The badge is inside the row it qualifies, so a tabindex on it would put a
    // stop between the tool and the next one. Focus must skip straight past.
    expect(after).not.toBe(before)
    const isBadge = await page.evaluate(() => document.activeElement.classList.contains('soon-badge'))
    expect(isBadge).toBe(false)
  })

  test('the keyboard ring skips items the layout has hidden', async ({ page }) => {
    watch(page, 'a keyboard user on a small laptop')
    // Below 1240 the editorial card is display:none, and it now carries the
    // first menu item. querySelectorAll returns elements inside a display:none
    // subtree and .focus() on one is a silent no-op, so an unfiltered ring would
    // make ArrowDown appear to do nothing at all in this band.
    await page.setViewportSize({ width: 1200, height: 860 })
    await go(page, '/')

    const create = page.getByRole('button', { name: 'Create', exact: true })
    await create.focus()
    await create.press('ArrowDown')
    await expect(page.getByRole('region', { name: 'Create menu' })).toBeVisible()

    const hidden = await page.locator('#pnav-mega .pnav-editorial').evaluate((el) => getComputedStyle(el).display)
    expect(hidden).toBe('none')

    const raw = await page.locator('#pnav-mega [data-pnav-menuitem]').count()
    const visible = (await ring(page)).length
    expect(visible).toBeLessThan(raw)

    // Focus landed on something real, and it is the first VISIBLE item.
    const smallRing = await ring(page)
    await expect.poll(() => focusedText(page)).toBe(smallRing[0])
    const onBody = await page.evaluate(() => document.activeElement === document.body)
    expect(onBody).toBe(false)
  })

  // ── Both themes are shipped surfaces ─────────────────────────────────────

  test('the panel and its previews hold up in dark theme', async ({ page }) => {
    watch(page, 'a designer who works at night')
    await enterDark(page)
    await openWithPointer(page, 'Create')

    // The palette this preview shows opens on near-black values, which is
    // exactly the case a black hairline could not separate from a dark card.
    const ring1 = await page.locator('.pnav-prev-swatch').first()
      .evaluate((el) => getComputedStyle(el).boxShadow)
    expect(ring1).not.toBe('none')

    // The card, the guided path and the action all survive the theme.
    await expect(page.locator('#pnav-mega .pnav-prev--create')).toBeVisible()
    await expect(page.locator('#pnav-mega .pnav-editorial-cta')).toBeVisible()
    await expect(page.locator('#pnav-mega .pnav-step-label').first()).toBeVisible()

    // And the keyboard contract is not a light-theme feature.
    const create = page.getByRole('button', { name: 'Create', exact: true })
    await page.keyboard.press('Escape')
    await create.focus()
    await create.press('ArrowDown')
    const darkRing = await ring(page)
    await expect.poll(() => focusedText(page)).toBe(darkRing[0])
    await page.keyboard.press('Escape')
    await expect(create).toBeFocused()
  })

  test('every section still opens and closes cleanly at both ends of the range', async ({ page }) => {
    watch(page, 'a visitor on whatever machine they happen to own')
    for (const size of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
      await page.setViewportSize(size)
      await go(page, '/')
      for (const name of TRIGGERS) {
        await openWithPointer(page, name)
        const panel = page.locator('#pnav-mega')
        const box = await panel.boundingBox()
        // #340's finding: a fixed panel taller than the space it has simply
        // clips, with no scrollbar to recover the bottom. The body scrolls now,
        // and the footer must stay on screen.
        expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1)
        await expect(panel.locator('.pnav-menu-foot')).toBeVisible()
        await page.keyboard.press('Escape')
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `${size.width} should not scroll horizontally`).toBeLessThanOrEqual(1)
    }
  })
})
