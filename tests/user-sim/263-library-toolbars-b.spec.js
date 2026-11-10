// SPEC 263: THE LIBRARY TOOLBARS FIT A PHONE AND READ AS WHAT THEY ARE.
//
// Palette, Emoji and Icon libraries, at 320 and 390 on a touch screen:
//   - the toolbar is one row of controls (plus the quick chip row) and nothing
//     in it runs past the viewport or the toolbar's own edge;
//   - a chip row that scrolls sideways either shows its last chip whole or
//     carries the `.rail-overflow` edge fade, so a cut chip reads as "continues";
//   - the selected "All" chip's count reads at 4.5:1 in dark and light;
//   - a locked preview is blurred lightly enough to show bands but holds no
//     content: no hex, no image, only the item's name, a Pro tag and a link to
//     /plans.
//
// MUTATIONS (each should turn the named test red):
//   - drop `rail-overflow` from `.lbry-toolbar-quick` in LibraryToolbar.jsx:
//     "the emoji chip row shows its last chip or an edge fade" fails;
//   - set the selected count's colour back to `var(--bg-0)`: "the selected All
//     count reads at 4.5:1" fails in both themes;
//   - set `.lockt-stripes` back to `blur(16px)`: "a locked preview is lightly
//     blurred" fails; remove the blur: it fails the other way;
//   - make `mainShowPack` in IconLibrary.jsx `gridShowsPack(icons)` again in group mode:
//     "the cells carry no pack label" fails (a `.ic-pack` is back on every cell);
//   - drop `grid-column:1/-1` from `.ig-pack-head`: "the heading spans the grid" fails;
//   - make the heading `tabindex="0"`: "a heading is not focusable" and the Tab test fail.
import { test, expect } from './base.js'
import { go, signIn, watch } from './helpers.js'
import { ICON_PACK_CREDITS } from '../../src/data/iconPackCredits.js'

const SHOTS = '.claude/scratch/libb1'

// WCAG contrast of an element's text over what is painted behind it: the first opaque
// ground up the tree, with every translucent layer between laid back down on it.
const contrastOf = (locator) => locator.evaluate((el) => {
  // `rgb()` runs 0-255; a colour-mix() result comes back as `color(srgb r g b / a)`, 0-1.
  const parse = (c) => {
    const m = c.match(/[\d.]+(?:e-?\d+)?/g).map(Number)
    const k = c.startsWith('color(') ? 255 : 1
    return { r: m[0] * k, g: m[1] * k, b: m[2] * k, a: m[3] ?? 1 }
  }
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const over = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1,
  })
  // Walk up for the first opaque ground, then lay the translucent layers back down on it.
  const layers = []
  for (let n = el; n; n = n.parentElement) {
    const bg = parse(getComputedStyle(n).backgroundColor)
    if (bg.a > 0) layers.push(bg)
    if (bg.a >= 1) break
  }
  let ground = { r: 255, g: 255, b: 255, a: 1 }
  for (const layer of layers.reverse()) ground = over(layer, ground)
  const text = over(parse(getComputedStyle(el).color), ground)
  const [a, b] = [lum(text), lum(ground)]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
})

const LIBRARIES = [
  { route: '/discover/palettes', name: 'Palette Library' },
  { route: '/create/emoji', name: 'Emoji Library' },
  { route: '/create/icons', name: 'Icon Library' },
]

// Everything measured inside the page; a list of problems, empty when it fits.
const toolbarProblems = (page) => page.evaluate(() => {
  const bad = []
  const vw = window.innerWidth
  const bar = document.querySelector('.lbry-toolbar')
  if (!bar) return ['no .lbry-toolbar on the page']
  const barBox = bar.getBoundingClientRect()
  if (document.documentElement.scrollWidth > vw + 1) bad.push(`page scrolls sideways: ${document.documentElement.scrollWidth} > ${vw}`)
  const row = bar.querySelector('.lbry-toolbar-row')
  const kids = [...row.children].filter((c) => c.offsetWidth > 0)
  const mid = (c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2 }
  // A grid phone toolbar (Palette Library) lays its row's children out in two
  // rows on purpose; the others keep one.
  const grid = getComputedStyle(bar).display === 'grid'
  if (!grid && kids.length && Math.max(...kids.map(mid)) - Math.min(...kids.map(mid)) > 4) bad.push('toolbar row wraps')
  for (const el of bar.querySelectorAll('button, a[href], input:not([type=hidden])')) {
    if (el.closest('.lbry-toolbar-quick')) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if (r.right > barBox.right + 0.5 || r.left < barBox.left - 0.5) bad.push(`control past the toolbar edge: ${el.className || el.tagName} ${Math.round(r.left)}-${Math.round(r.right)}`)
    if (el.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 1) bad.push(`label cut: ${(el.textContent || '').trim().slice(0, 20)}`)
  }
  return bad
})

for (const theme of ['light', 'dark']) {
  for (const width of [320, 390]) {
    test.describe(`Library toolbars at ${width}, ${theme}`, () => {
      test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true, colorScheme: theme })

      for (const lib of LIBRARIES) {
        test(`${lib.name} toolbar neither clips nor wraps`, async ({ page }) => {
          watch(page, `someone browsing the ${lib.name} on a phone`)
          await go(page, lib.route)
          await expect(page.locator('.lbry-toolbar')).toBeVisible()
          await page.waitForTimeout(500)
          expect(await toolbarProblems(page)).toEqual([])
          await page.screenshot({ path: `${SHOTS}/${lib.route.split('/').pop()}-${width}-${theme}.png` })
        })
      }

      test('the emoji chip row shows its last chip or an edge fade', async ({ page }) => {
        watch(page, 'someone choosing an emoji category on a phone')
        await go(page, '/create/emoji')
        const quick = page.locator('.lbry-toolbar-quick')
        await expect(quick).toBeVisible()
        await page.waitForTimeout(400)
        const state = await quick.evaluate((el) => {
          const last = el.querySelector('.lbry-filter:last-of-type')
          const lastBox = last.getBoundingClientRect()
          const box = el.getBoundingClientRect()
          const cs = getComputedStyle(el)
          return {
            lastWhole: lastBox.right <= box.right + 0.5,
            scrolls: el.scrollWidth > el.clientWidth + 1,
            faded: el.classList.contains('rail-overflow') && /gradient/.test(cs.maskImage || cs.webkitMaskImage || ''),
          }
        })
        expect(state.lastWhole || state.faded, `last chip whole: ${state.lastWhole}, edge fade: ${state.faded}`).toBe(true)
      })

      test('the selected All count reads at 4.5:1', async ({ page }) => {
        watch(page, 'someone reading the emoji category counts')
        await go(page, '/create/emoji')
        const count = page.locator('.lbry-toolbar-quick .lbry-filter[data-active="true"] .lbry-filter-count').first()
        await expect(count).toBeVisible()
        const ratio = await contrastOf(count)
        expect(ratio, 'count contrast').toBeGreaterThanOrEqual(4.5)
      })
    })
  }
}

test.describe('Locked previews', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  for (const theme of ['light', 'dark']) test(`a locked preview is blurred and reveals no values, ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    // Signed out, the page shows 3 palettes and a sign-up call; the blurred cards stand in past the free rung's ten.
    watch(page, 'a free visitor meeting the locked palettes')
    await signIn(page, { plan: 'free' })
    await go(page, '/discover/palettes')
    await expect(page.locator('.pgal-card').nth(9)).toBeVisible()
    const card = page.locator('.lockt-card--blur').first()
    await card.scrollIntoViewIfNeeded()
    await expect(card).toBeVisible()
    const blur = await card.locator('.lockt-stripes').evaluate((el) => parseFloat((getComputedStyle(el).filter.match(/blur\(([\d.]+)px\)/) || [])[1]))
    // Light enough to make out the row, heavy enough that nothing sharp is left.
    expect(blur, 'blur radius in px').toBeGreaterThanOrEqual(4)
    expect(blur, 'blur radius in px').toBeLessThanOrEqual(10)
    const html = await card.evaluate((el) => el.outerHTML)
    expect(html, 'no colour value in the locked card').not.toMatch(/#[0-9a-f]{3,8}\b/i)
    // The one image is the row's own soft preview, made and rounded at build time
    // (scripts/library/lockedThumbs.mjs, spec 279); anything else is a leak.
    expect(html, 'a canvas or CSS image in the locked card').not.toMatch(/<canvas|url\(/i)
    const imgs = await card.locator('img').evaluateAll((els) => els.map((i) => ({ path: new URL(i.src).pathname, alt: i.getAttribute('alt') })))
    expect(imgs.length, 'more than the one preview image in the locked card').toBeLessThanOrEqual(1)
    for (const img of imgs) {
      expect(img.path, 'an image that is not the locked preview').toMatch(/^\/locked-previews\/palettes\/[a-z0-9-]+\.png$/)
      expect(img.alt, 'the preview is decoration').toBe('')
    }
    const links = await card.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    expect(links, 'the only way out of a locked card is /plans').toEqual(['/plans'])
    await page.screenshot({ path: `${SHOTS}/palettes-locked-390-${theme}.png` })
  })
})

// A grouped grid (Flags) opens each pack with a full-width heading row, in place of a
// label on every cell. Grid cells are Tab stops (`role=button`, tabindex 0), not an
// arrow-key grid, so "moving cell to cell" is Tab and Shift+Tab; a heading is not a stop.
const FLAG_PACKS = ['circle-flags', 'flag', 'flagpack', 'cif']

const openFlagsGroup = async (page) => {
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  const flags = page.getByRole('button', { name: 'Flags', exact: true })
  const groupMenu = page.getByRole('button', { name: /^Group\b/ })
  // The toolbar steps through its layouts (all controls inline, then a Group menu, then
  // a Filters panel) in the first moments after paint, and on a slow runner the page
  // can be caught between two of them: the control a one-off look found is gone by the
  // time it is clicked (CI: "waiting for Group" until the 30 s timeout). So each way in
  // is looked at and used inside one retried step, the way a person would click again
  // on the layout in front of them. Once the Flags click has gone through, no later
  // step may repeat it: a second click on the active group would switch it off.
  const open = async (loc) => (await loc.isVisible()) && (await loc.getAttribute('aria-expanded')) === 'true'
  let picked = false
  await expect(async () => {
    if (!picked) {
      if (await filters.isVisible() && !await open(filters)) await filters.click({ timeout: 2000 })
      if (!await flags.isVisible()) await groupMenu.click({ timeout: 2000 })
      await flags.click({ timeout: 2000 })
      picked = true
    }
    if (await sheet.isVisible()) await sheet.getByRole('button', { name: 'Done', exact: true }).click({ timeout: 2000 })
    else if (await open(filters)) await filters.click({ timeout: 2000 })
    expect(await sheet.isVisible() || await open(filters), 'the Filters panel is closed again').toBe(false)
  }, { message: 'Flags chosen from whichever layout the toolbar settled on' }).toPass({ timeout: 25_000 })
  const listed = async () => Number(((await page.locator('#ig-result-count').textContent()) || '').replace(/\D/g, ''))
  await expect.poll(listed, { timeout: 20_000, message: 'the Flags group replaced the full listing' }).toBeLessThan(1000)
  await expect(page.locator('.ig .ig-pack-head').first()).toBeVisible({ timeout: 20_000 })
  // The grid is headed per pack as soon as the group is chosen, while it may still hold the
  // listing it replaces; wait until every heading on it is one of the Flags packs.
  const flagNames = FLAG_PACKS.map((p) => ICON_PACK_CREDITS[p].name)
  await expect.poll(
    async () => (await page.locator('.ig').last().locator('.ig-pack-head .ig-pack-name').allTextContents()).map((n) => n.trim()).filter((n) => !flagNames.includes(n)),
    { timeout: 20_000, message: 'only Flags packs are headed' },
  ).toEqual([])
  return listed
}

for (const theme of ['light', 'dark']) {
  for (const width of [390, 768, 1440]) {
    test.describe(`Icon library pack headings at ${width}, ${theme}`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme: theme, ...(width === 390 ? { hasTouch: true, isMobile: true } : {}) })

      test('Flags opens each pack under a heading with its name and count, and the cells carry no pack label', async ({ page }) => {
        watch(page, `someone browsing Flags at ${width}`)
        await signIn(page, { plan: 'pro' })
        await go(page, '/create/icons')
        const listed = await openFlagsGroup(page)
        const ig = page.locator('.ig').last()
        const heads = ig.locator('.ig-pack-head')
        const total = await listed()
        await expect.poll(() => ig.locator('.ic').count(), { timeout: 20_000 }).toBeGreaterThan(0)

        // One heading per pack, in the group's order, named as the footer names the pack.
        const names = (await heads.locator('.ig-pack-name').allTextContents()).map((n) => n.trim())
        const credited = FLAG_PACKS.map((p) => ICON_PACK_CREDITS[p].name)
        expect(names.length, 'at least two packs are headed').toBeGreaterThan(1)
        expect(names, 'names are the credit names, in group order').toEqual(credited.filter((n) => names.includes(n)))

        // Each count reads "N icons" (or "1 icon"), and together they are the whole result.
        const counts = (await heads.locator('.ig-pack-count').allTextContents()).map((t) => t.trim())
        for (const c of counts) expect(c).toMatch(/^\d[\d,]* icons?$/)
        const sum = counts.reduce((a, c) => a + Number(c.replace(/\D/g, '')), 0)
        expect(sum, 'the headings count the whole result').toBe(total)

        // The heading is a real heading, whole to the grid's width, and not a Tab stop.
        await expect(page.getByRole('heading', { name: new RegExp(`^${names[0]} \\d`) })).toBeVisible()
        const first = heads.first()
        expect(await first.evaluate((el) => el.tagName)).toBe('H3')
        expect(await first.evaluate((el) => el.tabIndex), 'a heading is not focusable').toBe(-1)
        const [hb, gb] = await Promise.all([first.boundingBox(), ig.boundingBox()])
        expect(hb.width, 'the heading spans the grid').toBeGreaterThanOrEqual(gb.width - 1)

        // The heading's count reads at 4.5:1 on the page ground, in whichever theme this is.
        expect(await contrastOf(heads.first().locator('.ig-pack-count')), 'pack count contrast').toBeGreaterThanOrEqual(4.5)
        expect(await contrastOf(heads.first().locator('.ig-pack-name')), 'pack name contrast').toBeGreaterThanOrEqual(4.5)

        // No cell draws a pack label, but a focused cell still names its pack.
        await expect(ig.locator('.ic .ic-pack')).toHaveCount(0)
        await expect(ig.locator('.ic.has-pack')).toHaveCount(0)
        expect(await ig.locator('.ic').first().getAttribute('aria-label')).toMatch(/^Customise .+, .+$/)

        await page.screenshot({ path: `${SHOTS}/flags-group-${width}-${theme}.png` })
      })
    })
  }
}

test.describe('Icon library pack headings: keyboard and layout', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Tab and Shift+Tab step from the last cell of a pack to the first of the next, across its heading', async ({ page }) => {
    watch(page, 'someone tabbing through Flags')
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await openFlagsGroup(page)
    const ig = page.locator('.ig').last()
    const second = await ig.evaluate((grid) => [...grid.children].findIndex((k, i) => i > 0 && k.classList.contains('ig-pack-head')))
    expect(second, 'a second pack heading follows the first pack').toBeGreaterThan(1)
    const kid = (i) => ig.locator(':scope > *').nth(i)
    const focusedIs = (i) => kid(i).evaluate((el) => el === document.activeElement)
    await kid(second - 1).focus()
    expect(await focusedIs(second - 1), 'POSITIVE CONTROL: the last cell of the first pack took focus').toBe(true)
    await page.keyboard.press('Tab')
    expect(await focusedIs(second + 1), 'Tab lands on the first cell after the heading').toBe(true)
    expect(await kid(second + 1).evaluate((el) => el.classList.contains('ic'))).toBe(true)
    await page.keyboard.press('Shift+Tab')
    expect(await focusedIs(second - 1), 'Shift+Tab returns to the last cell before it').toBe(true)
  })

  test('headings are one fixed height, sit clear of their cells, and do not move when the page scrolls and returns', async ({ page }) => {
    watch(page, 'someone scrolling Flags')
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await openFlagsGroup(page)
    await page.waitForTimeout(500)
    const ig = page.locator('.ig').last()
    // Each heading's height, and its top and the next cell's top in document coordinates.
    const measure = () => ig.evaluate((grid) => {
      const y = window.scrollY
      return [...grid.querySelectorAll(':scope > .ig-pack-head')].map((h) => {
        const r = h.getBoundingClientRect()
        const next = h.nextElementSibling?.getBoundingClientRect()
        return { height: r.height, top: Math.round(r.top + y), clear: next ? next.top >= r.bottom - 0.5 : true }
      })
    })
    const before = await measure()
    expect(before.length).toBeGreaterThan(1)
    expect(new Set(before.map((h) => h.height)).size, 'every heading is the same height').toBe(1)
    expect(before.every((h) => h.clear), 'a heading never overlaps the cells below it').toBe(true)
    // Down the whole page and back. Once a grid holds more than one page of cells it
    // ghosts the ones scrolled past, and no heading may move for that. (The fixture's flag
    // packs fit one page, so this pins the headings' own stability, not the ghosting.)
    for (const frac of [0.5, 1, 0.5, 0]) {
      await page.evaluate((f) => window.scrollTo({ top: f * (document.documentElement.scrollHeight - innerHeight), behavior: 'instant' }), frac)
      await page.waitForTimeout(150)
    }
    await page.waitForTimeout(300)
    const after = await measure()
    expect(after.map((h) => h.top), 'no heading moved').toEqual(before.map((h) => h.top))
    expect(after.map((h) => h.height)).toEqual(before.map((h) => h.height))
  })
})
