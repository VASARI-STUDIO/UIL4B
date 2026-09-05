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
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'
import { LEARN_GROUPS } from '../../src/data/toolTree.js'

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

// Nine shapes x three menus = the 27 combinations #340 measured by hand. The
// range starts at 1024 because below 769 the panel is not the thing on screen
// at all -- that is the sheet, which has its own coverage.
const DESKTOP_MATRIX = [
  { width: 1024, height: 768 }, { width: 1024, height: 608 }, { width: 1152, height: 864 },
  { width: 1280, height: 800 }, { width: 1280, height: 720 }, { width: 1366, height: 768 },
  { width: 1366, height: 608 }, { width: 1440, height: 900 }, { width: 1600, height: 1200 },
]

/** Every menu item a person can actually reach: rendered ones, in DOM order. */
function ring(page) {
  return page.evaluate(() => [...document.querySelectorAll('#pnav-mega [data-pnav-menuitem]')]
    .filter((el) => el.getClientRects().length > 0)
    .map((el) => (el.textContent || '').trim()))
}

const focusedText = (page) => page.evaluate(() => (document.activeElement.textContent || '').trim())

/**
 * Wait for the panel to STOP MOVING before measuring it.
 *
 * .pnav-menu animates in from scale(.975) and transitions its width between
 * sections, and .pnav-tool rows fade up on a stagger. Anything read between
 * "the region is visible" and "the animation is done" is the real geometry
 * multiplied by whatever the scale is on that frame -- which is exactly how a
 * 44px row measured 43 (44 x 0.975 = 42.9) and made a settled layout look like
 * a broken one.
 *
 * This waits on the animation LAYER via getAnimations().finished. A timeout
 * would be a guess that a slower machine invalidates, and two equal reads in a
 * row can simply be two reads from the same frame.
 */
async function settle(page) {
  await page.locator('#pnav-mega').evaluate((el) => Promise.all(
    el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})),
  ))
}

async function openWithPointer(page, name) {
  await page.getByRole('button', { name, exact: true }).click()
  await expect(page.getByRole('region', { name: `${name} menu` })).toBeVisible()
  await settle(page)
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
    // cannot be honest here: --display is Manrope, the same value as --font.
    // (The token used to be called --serif and claimed otherwise; renamed in
    // serif-token-is-not-a-serif.)
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

  // #340 reported 27 of 27 viewport-by-menu combinations clean and only ever
  // committed two of the nine widths, so seven of them were a hand check that no
  // test could repeat. DESKTOP_MATRIX x TRIGGERS is that claim, written down: nine
  // shapes across the range where the desktop panel is the thing on screen, times
  // the three menus. Tall AND short pairs at the same width are deliberate -- a
  // height regression that only shows at 608 would otherwise pass at 768.
  test('every section still opens and closes cleanly across all 27 viewport-by-menu combinations', async ({ page }) => {
    watch(page, 'a visitor on whatever machine they happen to own')
    test.setTimeout(15000 + DESKTOP_MATRIX.length * 9000)
    for (const size of DESKTOP_MATRIX) {
      await page.setViewportSize(size)
      await go(page, '/')
      for (const name of TRIGGERS) {
        await openWithPointer(page, name)
        const panel = page.locator('#pnav-mega')
        const box = await panel.boundingBox()
        // #340's finding: a fixed panel taller than the space it has simply
        // clips, with no scrollbar to recover the bottom. The body scrolls now,
        // and the footer must stay on screen.
        expect(box.y + box.height,
          `${name} at ${size.width}x${size.height} runs past the bottom`).toBeLessThanOrEqual(size.height + 1)
        await expect(panel.locator('.pnav-menu-foot')).toBeVisible()

        // NOTHING MAY CLIP. This is the assertion whose absence let two
        // truncated descriptions ship past #340 and #352: -webkit-line-clamp
        // renders overflow as a tidy ellipsis, so a row that has lost its last
        // two words looks deliberate in a screenshot and identical to a row
        // that fits. Measured, it is scrollHeight > clientHeight.
        const clipped = await panel.evaluate((el) => [...el.querySelectorAll('.pnav-tool-desc')]
          .filter((d) => d.scrollHeight > d.clientHeight + 1)
          .map((d) => d.textContent))
        expect(clipped, `${name} at ${size.width}x${size.height} clipped a description`).toEqual([])

        // The 44px target-size floor the row height was relaxed TO, not past.
        const short = await panel.evaluate((el) => [...el.querySelectorAll('.pnav-tool')]
          .filter((r) => r.getBoundingClientRect().height < 43.5)
          .map((r) => r.textContent.trim()))
        expect(short,
          `${name} at ${size.width}x${size.height} has a row under the 44px target-size floor`,
        ).toEqual([])

        await page.keyboard.press('Escape')
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `${size.width} should not scroll horizontally`).toBeLessThanOrEqual(1)
    }
  })
  // ── The second line has to earn its place ────────────────────────────────
  //
  // The panel was correct after #352 and still read as a directory: eighteen rows,
  // each an icon over a title over a grey line at the same size and spacing, so
  // the eye got no purchase on which of them mattered. Eighteen of the thirty-four
  // description lines said nothing their label had not already said.

  test('a Soon row never describes what it will do once it exists', async ({ page }) => {
    watch(page, 'a visitor deciding what is worth clicking')
    await go(page, '/')

    for (const name of TRIGGERS) {
      await openWithPointer(page, name)
      const offenders = await page.evaluate(() => [...document.querySelectorAll('#pnav-mega .pnav-tool[data-soon]')]
        .filter((r) => r.querySelector('.pnav-tool-desc'))
        .map((r) => r.querySelector('.pnav-tool-label').textContent))
      // A sentence about an unbuilt tool is a claim about something that does not
      // exist. Withholding it is also what makes live and unbuilt read apart
      // straight down a column, which is the same reasoning that already keeps a
      // preview off the Learn card.
      expect(offenders, `${name} describes a tool it has not built`).toEqual([])
      await page.keyboard.press('Escape')
    }
  })

  test('Learn separates the guides that exist from the topics that do not', async ({ page }) => {
    watch(page, 'a visitor checking whether the guides exist yet')
    await go(page, '/')
    await openWithPointer(page, 'Learn')

    // THIS TEST USED TO ASSERT THAT EVERY LEARN ROW WAS SOON, and its own
    // comment predicted the day that would stop being true: "it is what the
    // panel should look like until one of them ships -- at which point that row
    // gets its line back with no edit here, because the rule reads t.soon
    // rather than a list." Three guides have shipped. The rule did hold; what
    // changed is the arithmetic, so the assertion is now the SPLIT rather than
    // the total, which is the property that actually matters: a Soon row must
    // never become clickable, and a published guide must never be marked Soon.
    const rows = page.locator('#pnav-mega .pnav-tool')
    const total = await rows.count()
    expect(total).toBeGreaterThan(4)

    const soonRows = page.locator('#pnav-mega .pnav-tool[data-soon]')
    await expect(soonRows).toHaveCount(LEARN_GROUPS.filter((g) => g.soon).length)

    for (const article of LEARN_ARTICLES) {
      const row = page.locator(`#pnav-mega a.pnav-tool[href="/learn/${article.slug}"]`)
      await expect(row, `${article.slug} is not offered in the Learn menu`).toBeVisible()
      await expect(row).not.toHaveAttribute('data-soon', 'true')
      await expect(row).toContainText(article.navLabel)
    }

    // The description rule is unchanged and still absolute here: a Soon row
    // never describes what it will do, and the guide rows lead with their
    // title rather than a second line of prose in a 180px column.
    await expect(page.locator('#pnav-mega .pnav-tool-desc')).toHaveCount(0)
  })

  test('an emptied description does not fall through to the page copy behind it', async ({ page }) => {
    watch(page, 'a visitor reading the Typography column')
    await go(page, '/')
    await openWithPointer(page, 'Create')

    // THIS IS THE SUBTLE ONE. menuDescription used a truthiness test, so setting a
    // key to '' would not have dropped the line -- it would have fallen through to
    // the group's `desc` in toolTree.js, which is page copy written for a card on
    // /discover and runs three lines deep in a menu column. The `in` test is what
    // makes an empty string mean "deliberately none". Deleting the key instead of
    // emptying it would put a paragraph here and this test is the tripwire.
    for (const label of ['Font Gallery', 'Font Pair', 'Type Scale', 'Emoji Library']) {
      const row = page.locator('#pnav-mega .pnav-tool', { hasText: label }).first()
      await expect(row).toBeVisible()
      await expect(row.locator('.pnav-tool-desc')).toHaveCount(0)
    }

    // THE ROW THAT ACTUALLY BREAKS IS ON DISCOVER, and the four above would not
    // have caught it. Mutation-checked: reverting `in` to a truthiness test left
    // all four of them empty and green, because the fall-through only has
    // somewhere to fall when the tool's id ALSO names a group in toolTree.js, and
    // Create has no such group. Discover does -- id 'font-gallery' matches the
    // Discover group of the same id, whose desc is a 79-character sentence
    // written for a card. That is the assertion with teeth.
    await page.keyboard.press('Escape')
    await openWithPointer(page, 'Discover')
    const discoverFonts = page.locator('#pnav-mega .pnav-tool', { hasText: 'Font Gallery' }).first()
    await expect(discoverFonts).toBeVisible()
    await expect(discoverFonts.locator('.pnav-tool-desc')).toHaveCount(0)
    await expect(discoverFonts).not.toContainText(/Google Fonts catalogue/)

    await page.keyboard.press('Escape')
    await openWithPointer(page, 'Create')
    // And the rows that kept a line kept it because it carries a fact the label
    // cannot: an input, a range, a standard, a privacy claim.
    const palette = page.locator('#pnav-mega .pnav-tool', { hasText: 'Palette' }).first()
    await expect(palette.locator('.pnav-tool-desc')).toHaveText(/one seed/)
    const tint = page.locator('#pnav-mega .pnav-tool', { hasText: 'Tint' }).first()
    await expect(tint.locator('.pnav-tool-desc')).toHaveText(/50/)
  })

  test('the rows stop tiling: a row without a second line is visibly shorter', async ({ page }) => {
    watch(page, 'a visitor scanning for the thing that matters')
    await go(page, '/')
    await openWithPointer(page, 'Create')

    // min-height:50px was holding every row at a measured 54px whether it had
    // anything to say or not, so removing the prose would have changed the text
    // and left the tiling exactly as it was. The panel has to contain rows of at
    // least two different heights for the hierarchy to be visible at all.
    const heights = await page.evaluate(() => [...new Set([...document.querySelectorAll('#pnav-mega .pnav-tool')]
      .map((r) => Math.round(r.getBoundingClientRect().height)))].sort((a, b) => a - b))
    expect(heights.length, `every Create row is still ${heights[0]}px`).toBeGreaterThan(1)
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(44)

    // And the short ones are the ones with no second line, not an unrelated cause.
    const mismatched = await page.evaluate(() => [...document.querySelectorAll('#pnav-mega .pnav-tool')]
      .filter((r) => {
        const tall = Math.round(r.getBoundingClientRect().height) > 44
        return tall !== Boolean(r.querySelector('.pnav-tool-desc'))
      })
      .map((r) => r.querySelector('.pnav-tool-label').textContent))
    expect(mismatched).toEqual([])
  })
})
