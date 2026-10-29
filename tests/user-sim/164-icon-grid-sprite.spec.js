// THE ICON GRID DRAWS MONOCHROME ICONS FROM ONE INLINE SPRITE.
//
// A monochrome Iconify icon in /create/icons is `<svg class="ig-sym"><use href="#icsN"/></svg>`,
// where `#icsN` is a <symbol> inside one hidden `<svg id="ig-sprite">` (src/utils/iconSprite.js).
// Coloured, brand and animated packs, and any icon the sanitiser would change, stay `<img>`.
//
// What a person relies on, and what this file pins:
//   - every cell they can see is drawn: its <use> points at a symbol that exists, after six pages;
//   - ids inside an icon cannot collide with another icon's, so a gradient or clip path in one icon
//     never borrows another's;
//   - an icon with a <style>, <script>, an animation or an event handler is never put in the page's
//     DOM: it stays an image, so it looks as it did and runs nothing;
//   - the sprite takes no space and is invisible to a screen reader, while each cell keeps its name
//     and still opens from the keyboard;
//   - the icons are light on the dark page and dark on the light one, by the pixels drawn;
//   - a sprite already in the page (an older copy of the module left one) is reused, not doubled, and
//     is emptied so nothing in it can be mistaken for a symbol of this page;
//   - a page still being revealed when the listing is replaced reaches its next page without a scroll;
//   - in Windows High Contrast (forced colors) the icon is painted in the system text colour and is
//     distinct from its tile, in both themes;
//   - a brand pack still renders <img>;
//   - Copy SVG and Download SVG hand over the same markup they always did.
//
// HOW TO SEE EACH FAIL (src/utils/iconSprite.js unless named):
//   symbolMarkup skips `!clean.ok`        -> "an icon the sanitiser would change stays an image"
//   symbolMarkup drops `idPrefix: id`     -> "ids inside two icons never collide"
//   spriteRoot drops aria-hidden          -> "the sprite takes no space and is hidden from assistive tech"
//   acquireDom stops reusing #ig-sprite   -> "a sprite already in the page is reused"
//   current() drops host.clear()          -> "a sprite already in the page is reused"
//   current() drops the host.maxId() step -> "a sprite already in the page is reused"
//   IconLibrary observer deps [icons, visible] -> [icons.length, visible]
//                                         -> "an answer that leaves the listing the same length mid-reveal"
//                                            (the plain pack switch changes `visible` too, so it stays green)
//   global.css drops `filter:none` from the forced-colors rule (dark), or paints it Canvas (both)
//                                         -> "in forced colors"
//   src restored byte for byte            -> all of them pass again.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER, headPackNames, headPackOfUrl, isLiveIconify } from './iconify-stub.js'

const PERSONA = 'a designer scrolling the icon library and copying an icon out of it'
const LIVE = 'the live API decides which icons exist; this spec controls the answers'

const SPRITE = '#ig-sprite'
const CELL_ART = '.ig .ic :is(img, svg.ig-sym)'

const STROKE = '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'
// What Copy SVG and Download SVG gave for the fixture's icon (fixtures/iconify/icon.svg) before the
// sprite existed, at the customiser's old default 48px (it opens at 24 now, so the width and height below are 24): recorded from a build of origin/main (88d65517),
// whose grid drew <img>. Its path is the fixture's own, character for character.
const EXPECTED_EXPORT = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + STROKE + '</svg>'
// A body with an id and a reference to it, the same in every icon on purpose: unless the sprite
// renames them per icon, every symbol holds a clip path called "a".
const CLIPPED = `<defs><clipPath id="a"><rect width="24" height="24"/></clipPath></defs><g clip-path="url(#a)">${STROKE}</g>`
// Bodies the sanitiser changes or refuses; each must stay out of the page's own DOM.
const HOSTILE = {
  '005': `<style>path{stroke:red}</style>${STROKE}`,
  '006': `<script>window.__ranFromIcon = true</script>${STROKE}`,
  '007': `<path fill="none" stroke="currentColor" stroke-width="2" d="M3 12h18"><animate attributeName="opacity" values="0;1" dur="1s"/></path>`,
  '008': `<path fill="none" stroke="currentColor" stroke-width="2" d="M3 12h18" onload="window.__ranFromIcon = true"/>`,
}
const NAME = (i) => `sprite-${String(i).padStart(3, '0')}`
const TOTAL = 800

/** Serve `TOTAL` names of `prefix`, and a batch answer built from `bodyOf(name)`, over the fixture. */
async function servePack(page, prefix, bodyOf, nameOf = NAME) {
  const names = Array.from({ length: TOTAL }, (_, i) => nameOf(i))
  const headers = { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' }
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/collection' && u.searchParams.get('prefix') === prefix,
    (route) => route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ prefix, total: TOTAL, title: prefix, uncategorized: names }) }))
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === `/${prefix}.json` && u.search.includes('icons='),
    (route) => {
      const asked = (new URL(route.request().url()).searchParams.get('icons') || '').split(',').filter(Boolean)
      const icons = Object.fromEntries(asked.map((n) => [n, { body: bodyOf(n) }]))
      return route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ prefix, width: 24, height: 24, icons, aliases: {} }) })
    })
}
const serveLucide = (page, bodyOf) => servePack(page, 'lucide', bodyOf)

/**
 * The darkest and brightest the element draws, from a screenshot of it. An icon painted in the
 * tile's own colour, or not painted at all, has no spread between them.
 */
async function inkTone(page, locator) {
  const png = (await locator.screenshot()).toString('base64')
  return page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d')
    g.drawImage(bmp, 0, 0)
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data
    let lo = 255
    let hi = 0
    let n = 0
    let opaque = 0
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
      lo = Math.min(lo, l)
      hi = Math.max(hi, l)
      n += 1
      if (d[i + 3] > 0) opaque += 1
    }
    return { lo: Math.round(lo), hi: Math.round(hi), n, opaque }
  }, png)
}

/**
 * Hold each frame of the grid's reveal chain back by `window.__rafDelay` ms (0 = no hold), so a
 * spec has time to act while a page is half revealed. Cancelling a held frame works as usual.
 */
async function holdRevealFrames(page) {
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window)
    const caf = window.cancelAnimationFrame.bind(window)
    const held = new Map()
    let next = 1e9
    window.__rafDelay = 0
    window.requestAnimationFrame = (cb) => {
      if (!window.__rafDelay) return raf(cb)
      next += 1
      const id = next
      held.set(id, setTimeout(() => { held.delete(id); raf(cb) }, window.__rafDelay))
      return id
    }
    window.cancelAnimationFrame = (id) => {
      if (held.has(id)) { clearTimeout(held.get(id)); held.delete(id) } else caf(id)
    }
  })
}

async function choosePack(page, pack) {
  const filters = page.getByRole('button', { name: /^Filters\b/ })
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  const inPanel = await filters.isVisible()
  const panel = sheet.or(page.getByRole('group', { name: 'Filters', exact: true }))
  if (inPanel) {
    await filters.click()
    await expect(panel).toBeVisible()
  }
  await chooseMenuOption(page, (inPanel ? panel : page).getByRole('button', { name: 'Icon pack' }), pack)
  if (await sheet.isVisible()) {
    await sheet.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(sheet).toBeHidden()
  } else if (inPanel) {
    await filters.click()
    await expect(panel).toBeHidden()
  }
}

/** Scroll to the foot of the page until `count` cells are mounted. */
async function revealCells(page, count) {
  await expect.poll(async () => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    return page.locator('.ig .ic').count()
  }, { timeout: 30_000, message: `the grid never revealed ${count} cells` }).toBeGreaterThanOrEqual(count)
}

test.describe('the icon grid draws monochrome icons from one inline sprite', () => {
  test.skip(isLiveIconify(), LIVE)

  test('after six pages every cell is a <use> of a symbol the sprite holds', async ({ page }) => {
    watch(page, PERSONA)
    await serveLucide(page, () => STROKE)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await choosePack(page, 'lucide')
    await expect(page.locator(`.ig .ic[aria-label="Customise ${NAME(0)}"] svg.ig-sym`)).toBeVisible({ timeout: 20_000 })

    // Six pages of 120, each revealed as the sentinel comes into view.
    await revealCells(page, 6 * 120)
    await expect(page.locator('.ig .ic .ig-glyph-wait')).toHaveCount(0, { timeout: 20_000 })

    const m = await page.evaluate(() => {
      const uses = [...document.querySelectorAll('.ig .ic svg.ig-sym use')]
      const missing = uses.filter((u) => !document.querySelector(`#ig-sprite ${u.getAttribute('href')}`)).map((u) => u.getAttribute('href'))
      const cells = [...document.querySelectorAll('.ig .ic')]
      // A far-above cell is windowed to a bare name at its measured height; anything else holds art.
      const blank = cells.filter((c) => !c.style.height && !c.querySelector('svg, img')).map((c) => c.getAttribute('aria-label'))
      return {
        cells: cells.length,
        uses: uses.length,
        missing,
        blank,
        symbols: document.querySelectorAll('#ig-sprite symbol').length,
        sprites: document.querySelectorAll('#ig-sprite').length,
        images: document.querySelectorAll('.ig .ic > img').length,
      }
    })
    expect(m.cells, 'six pages were not revealed').toBeGreaterThanOrEqual(6 * 120)
    expect(m.uses, 'positive control: the grid has sprite cells to check').toBeGreaterThan(40)
    expect(m.missing, 'cells whose symbol is not in the sprite').toEqual([])
    expect(m.blank, 'cells that drew nothing').toEqual([])
    expect(m.symbols, 'the sprite holds every icon the batches brought').toBeGreaterThanOrEqual(m.uses)
    expect(m.sprites, 'one sprite, not one per batch').toBe(1)
    expect(m.images, 'a clean monochrome icon fell back to an image').toBe(0)
  })

  test('ids inside two icons never collide', async ({ page }) => {
    watch(page, PERSONA)
    await serveLucide(page, () => CLIPPED)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await choosePack(page, 'lucide')
    await expect(page.locator(`.ig .ic[aria-label="Customise ${NAME(0)}"] svg.ig-sym`)).toBeVisible({ timeout: 20_000 })
    await revealCells(page, 240)

    const m = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map((e) => e.id)
      const seen = new Set()
      const duplicated = [...new Set(ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false))))]
      const clips = [...document.querySelectorAll('#ig-sprite clipPath')]
      const stray = []
      for (const clip of clips) {
        const owner = clip.closest('symbol')
        const user = owner.querySelector(`[clip-path="url(#${clip.id})"]`)
        // The icon's own reference must point at its own clip path, which carries the symbol's id.
        if (!clip.id.startsWith(`${owner.id}.`) || !user) stray.push({ symbol: owner.id, clip: clip.id, referenced: !!user })
      }
      return { duplicated, clips: clips.length, stray }
    })
    expect(m.clips, 'positive control: icons with a clip path reached the sprite').toBeGreaterThan(40)
    expect(m.stray, 'a clip path is not renamed after its symbol, or its reference was left behind').toEqual([])
    expect(m.duplicated, 'ids that appear more than once on the page').toEqual([])
  })

  test('an icon the sanitiser would change stays an image and runs nothing', async ({ page }) => {
    watch(page, PERSONA)
    await serveLucide(page, (name) => HOSTILE[name.slice(-3)] || STROKE)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await choosePack(page, 'lucide')
    await expect(page.locator(`.ig .ic[aria-label="Customise ${NAME(0)}"] svg.ig-sym`)).toBeVisible({ timeout: 20_000 })
    for (const n of Object.keys(HOSTILE)) {
      const cell = page.locator(`.ig .ic[aria-label="Customise ${NAME(Number(n))}"]`)
      await expect(cell.locator('img'), `${NAME(Number(n))} was inlined`).toHaveCount(1, { timeout: 20_000 })
      await expect(cell.locator('svg.ig-sym')).toHaveCount(0)
    }
    // Its neighbours are still sprite cells: only the changed ones fall back.
    await expect(page.locator(`.ig .ic[aria-label="Customise ${NAME(4)}"] svg.ig-sym`)).toHaveCount(1)
    const m = await page.evaluate(() => ({
      unsafe: document.querySelectorAll('#ig-sprite :is(script, style, animate, set, foreignObject, image, filter), #ig-sprite [onload]').length,
      ran: window.__ranFromIcon === true,
    }))
    expect(m.unsafe, 'the page DOM holds markup the sanitiser would remove').toBe(0)
    expect(m.ran, 'an icon ran script on the page').toBe(false)
  })

  test('the sprite takes no space and is hidden from assistive tech, while each cell keeps its name', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/icons')
    const art = page.locator(`${CELL_ART}`).first()
    await expect(art).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.ig .ic svg.ig-sym').first(), 'positive control: a sprite cell is on screen').toBeVisible()

    const sprite = page.locator(SPRITE)
    await expect(sprite).toHaveCount(1)
    await expect(sprite).toHaveAttribute('aria-hidden', 'true')
    const box = await sprite.evaluate((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height } })
    expect(box, 'the hidden sprite is taking up room').toEqual({ w: 0, h: 0 })
    expect(await sprite.evaluate((el) => el.getAttribute('focusable'))).toBe('false')

    const cell = page.locator('.ig .ic').first()
    const label = await cell.getAttribute('aria-label')
    expect(label).toMatch(/^Customise \S+/)
    await expect(cell).toHaveAccessibleName(label)
    await expect(cell.locator('svg.ig-sym')).toHaveAttribute('aria-hidden', 'true')
    // The drawn icon adds no second name or title for a screen reader to read.
    await expect(cell.locator('svg.ig-sym title')).toHaveCount(0)
    // The cell's own row of the page is still reachable by name, as a button.
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(1)
  })

  for (const key of ['Enter', ' ']) {
    test(`a sprite cell opens from the keyboard with ${key === ' ' ? 'Space' : key}`, async ({ page }) => {
      watch(page, PERSONA)
      await go(page, '/create/icons')
      const cell = page.locator('.ig .ic', { has: page.locator('svg.ig-sym') }).first()
      await expect(cell).toBeVisible({ timeout: 20_000 })
      await expect(cell).toHaveAttribute('tabindex', '0')
      await expect(cell).toHaveAttribute('role', 'button')
      // The visible name, not the aria-label: the label now ends with the pack when the grid mixes packs.
      const name = (await cell.locator('.ic-name').textContent()).trim()
      await cell.focus()
      await expect(cell).toBeFocused()
      await page.keyboard.press(key)
      await expect(page.locator('.icust-stage'), 'the customiser did not open').toBeVisible({ timeout: 20_000 })
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
    })
  }

  for (const scheme of ['dark', 'light']) {
    test(`in the ${scheme} theme the drawn icon is ${scheme === 'dark' ? 'light' : 'dark'} on its tile`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } })
      const page = await ctx.newPage()
      watch(page, PERSONA)
      await go(page, '/create/icons')
      const svg = page.locator('.ig .ic svg.ig-sym').first()
      await expect(svg).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme)
      await expect(page.locator('.ig .ic .ig-glyph-wait')).toHaveCount(0, { timeout: 20_000 })

      const style = await svg.evaluate((el) => { const s = getComputedStyle(el); return { filter: s.filter, fill: s.fill, color: s.color } })
      expect(style.color, 'the ink starts black, as it did inside an <img>').toBe('rgb(0, 0, 0)')
      if (scheme === 'dark') expect(style.filter, 'dark page: the ink is not flipped').toMatch(/invert\((1|100%)\)/)
      else expect(style.filter, 'light page: the ink is flipped').toBe('none')

      // And by the pixels: the brightest and darkest the tile's icon draws, away from any hover state.
      await page.mouse.move(0, 0)
      const tone = await inkTone(page, svg)
      expect(tone.n, 'the screenshot is empty').toBeGreaterThan(100)
      // The tile is the page ground (light in light, near black in dark); the stroke is the opposite.
      if (scheme === 'dark') expect(tone.hi, `no light ink in the dark theme (${JSON.stringify(tone)})`).toBeGreaterThan(200)
      else expect(tone.lo, `no dark ink in the light theme (${JSON.stringify(tone)})`).toBeLessThan(80)
      await ctx.close()
    })
  }

  test('a brand pack is still drawn as an image', async ({ page }) => {
    watch(page, PERSONA)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic svg.ig-sym').first(), 'positive control: the default grid is sprite cells').toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.ig .ic .ig-glyph-wait')).toHaveCount(0, { timeout: 20_000 })
    const symbolsBefore = await page.locator(`${SPRITE} symbol`).count()
    expect(symbolsBefore, 'positive control: the default grid filled the sprite').toBeGreaterThan(8)
    await choosePack(page, 'logos')
    await expect(page.locator('.ig .ic .ig-chip img').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.ig .ic .ig-chip--wait')).toHaveCount(0, { timeout: 20_000 })
    const m = await page.evaluate(() => ({
      chips: document.querySelectorAll('.ig .ic .ig-chip img').length,
      inlined: document.querySelectorAll('.ig .ic svg.ig-sym').length,
      symbols: document.querySelectorAll('#ig-sprite symbol').length,
    }))
    expect(m.chips, 'the brand pack drew no images').toBeGreaterThan(8)
    expect(m.inlined, 'a brand icon was drawn from the sprite').toBe(0)
    expect(m.symbols, 'the brand pack added symbols nobody draws').toBe(symbolsBefore)
  })

  test('a sprite already in the page is reused: one #ig-sprite remains and the icons draw', async ({ page }) => {
    watch(page, PERSONA)
    // What an older copy of the module (a hot reload) leaves behind: a sprite with a symbol the
    // new one knows nothing about, there before the app's first icon batch.
    await page.addInitScript(() => {
      const put = () => {
        if (document.getElementById('ig-sprite')) return
        document.body.insertAdjacentHTML('afterbegin',
          '<svg id="ig-sprite" width="0" height="0" aria-hidden="true"><symbol id="ics5000" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></symbol></svg>')
      }
      if (document.body) put()
      else new MutationObserver((_, o) => { if (document.body) { o.disconnect(); put() } }).observe(document, { childList: true, subtree: true })
    })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic svg.ig-sym').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.ig .ic .ig-glyph-wait')).toHaveCount(0, { timeout: 20_000 })

    const m = await page.evaluate(() => {
      const uses = [...document.querySelectorAll('.ig .ic svg.ig-sym use')]
      const ids = [...document.querySelectorAll('#ig-sprite symbol')].map((s) => s.id)
      return {
        sprites: document.querySelectorAll('#ig-sprite').length,
        uses: uses.length,
        missing: uses.filter((u) => !document.querySelector(`#ig-sprite ${u.getAttribute('href')}`)).map((u) => u.getAttribute('href')),
        decoyLeft: !!document.getElementById('ics5000'),
        lowest: Math.min(...ids.map((id) => Number(id.slice(3)))),
        duplicated: ids.length - new Set(ids).size,
        symbols: ids.length,
      }
    })
    expect(m.uses, 'positive control: the grid has sprite cells to check').toBeGreaterThan(8)
    expect(m.sprites, 'a second sprite was added beside the one already there').toBe(1)
    expect(m.missing, 'cells whose symbol is not in the sprite').toEqual([])
    expect(m.decoyLeft, 'a symbol nothing here wrote was left in the sprite').toBe(false)
    expect(m.lowest, 'new ids start above the highest one already in the page').toBeGreaterThan(5000)
    expect(m.duplicated, 'symbols sharing an id').toBe(0)
    expect(m.symbols).toBeGreaterThanOrEqual(m.uses)
  })

  test('a listing replaced while a page is still being revealed still reaches its next page', async ({ page }) => {
    watch(page, PERSONA)
    await holdRevealFrames(page)
    await servePack(page, 'lucide', () => STROKE)
    // The same number of icons, under different names, so the swap is seen and has the same length.
    await servePack(page, 'tabler', () => STROKE, (i) => `tab-${String(i).padStart(3, '0')}`)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await choosePack(page, 'lucide')
    await expect(page.locator(`.ig .ic[aria-label="Customise ${NAME(0)}"] svg.ig-sym`)).toBeVisible({ timeout: 20_000 })

    // The grid reveals pages by itself until the sentinel is more than 600px away; let that settle.
    const cells = () => page.locator('.ig .ic').count()
    let settled = -1
    await expect.poll(async () => { const was = settled; settled = await cells(); return was === settled }, { intervals: [400], timeout: 20_000 }).toBe(true)
    const base = settled

    // Start the next page's reveal and stop it part-way: some of its cells are in, not all.
    await page.evaluate(() => { window.__rafDelay = 2500 })
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect.poll(cells, { timeout: 10_000 }).toBeGreaterThan(base)
    expect(await cells(), 'positive control: the reveal is part-way, not done').toBeLessThan(base + 120)

    await choosePack(page, 'tabler')
    await expect(page.locator('.ig .ic[aria-label="Customise tab-000"]')).toBeVisible({ timeout: 20_000 })
    await page.evaluate(() => { window.__rafDelay = 0 })

    // No scrolling from here: the person is already at the foot of the page.
    await expect.poll(() => page.locator('.ig .ic').count(), {
      timeout: 15_000,
      message: 'the new listing never revealed its next page (the observer did not restart)',
    }).toBeGreaterThanOrEqual(240)
    await expect(page.locator('.ig .ic[aria-label="Customise tab-000"]')).toBeVisible()
    await expect(page.locator(`.ig .ic[aria-label="Customise ${NAME(0)}"]`), 'the old listing is still in the grid').toHaveCount(0)
  })

  test('an answer that leaves the listing the same length mid-reveal does not strand the page', async ({ page }) => {
    watch(page, PERSONA)
    await holdRevealFrames(page)
    // A short window, set before the page opens. The grid reveals a page by itself while the
    // sentinel is within 600px of the window, so on the suite's 900px-tall one the second page
    // starts the moment the first lands (the sentinel sits ~1390px down) and is done in three
    // frames, before this test can hold anything back. At 500px the second page waits for the
    // scroll below, which is the moment the test means to hold.
    await page.setViewportSize({ width: 1440, height: 500 })
    // "All packs" is built from one answer per pack, and the listing is replaced each time one
    // lands. One pack answers late and with nothing to add: the listing is a new array of the
    // same length, which cancels the page being revealed.
    let answerLate
    const late = new Promise((resolve) => { answerLate = resolve })
    await page.route((u) => headPackOfUrl(u.href) === 'ph', async (route) => {
      await late
      await route.fulfill({ status: 200, contentType: 'text/javascript', body: 'export default { title: "Phosphor", names: [] }' })
        .catch(() => { /* page closed while held */ })
    })
    // Every other pack's answer has landed before the reveal starts. One landing during it would
    // replace the listing too, and each replacement restarts the reveal a chunk further on.
    const landed = new Set()
    page.on('requestfinished', (req) => { const p = headPackOfUrl(req.url()); if (p) landed.add(p) })
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    const cells = () => page.locator('.ig .ic').count()
    await expect(page.locator('.ig .ic svg.ig-sym').first()).toBeVisible({ timeout: 20_000 })
    const others = headPackNames().filter((p) => p !== 'ph')
    await expect.poll(() => others.filter((p) => !landed.has(p)), { timeout: 20_000, message: 'packs whose answer never landed' }).toEqual([])
    await expect(page.locator('.ig-sentinel')).toBeAttached()

    // The first page is whatever the grid shows before anyone scrolls; its size is the page size.
    let settled = -1
    await expect.poll(async () => { const was = settled; settled = await cells(); return was === settled }, { intervals: [300], timeout: 20_000 }).toBe(true)
    const pageSize = settled
    expect(pageSize, 'the first page drew no cells').toBeGreaterThan(0)
    const beyondMargin = await page.evaluate(() => document.querySelector('.ig-sentinel').getBoundingClientRect().top - window.innerHeight)
    expect(beyondMargin, 'the sentinel is inside the 600px margin, so the second page starts without a scroll and cannot be held').toBeGreaterThan(600)

    // Start the second page at the foot of the grid; part-way through it, its first cells are in and the rest are held back.
    await page.evaluate(() => { window.__rafDelay = 2500; window.scrollTo(0, document.documentElement.scrollHeight) })
    await expect.poll(cells, { timeout: 15_000 }).toBeGreaterThan(pageSize)
    const mid = await cells()
    expect(mid, 'positive control: the second page is part-way, not done').toBeLessThan(2 * pageSize)

    await page.evaluate(() => { window.__rafDelay = 0 })
    answerLate()
    // No scrolling: the foot of the page is where the person already is.
    await expect.poll(cells, {
      timeout: 15_000,
      message: `the page stopped at ${mid} cells after the listing was replaced (the observer did not restart)`,
    }).toBeGreaterThanOrEqual(2 * pageSize)
  })

  for (const scheme of ['dark', 'light']) {
    test(`in forced colors (${scheme} theme) a sprite icon is painted in the system text colour, not lost`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } })
      const page = await ctx.newPage()
      watch(page, PERSONA)
      await go(page, '/create/icons')
      const svg = page.locator('.ig .ic svg.ig-sym').first()
      await expect(svg).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('.ig .ic .ig-glyph-wait')).toHaveCount(0, { timeout: 20_000 })
      await page.emulateMedia({ forcedColors: 'active' })
      await expect.poll(() => page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
      await page.mouse.move(0, 0)

      const style = await svg.evaluate((el) => { const s = getComputedStyle(el); return { filter: s.filter, fill: s.fill } })
      expect(style.filter, 'the theme filter is still on the icon').toBe('none')

      // By the pixels: ink and tile differ. An icon drawn in the tile's colour (black on the
      // system's black Canvas) or not drawn has no spread between its darkest and brightest.
      const tone = await inkTone(page, svg)
      expect(tone.n, 'the screenshot is empty').toBeGreaterThan(100)
      expect(tone.opaque, 'the icon painted nothing').toBeGreaterThan(100)
      expect(tone.hi - tone.lo, `the icon is not distinct from its tile (${JSON.stringify(tone)})`).toBeGreaterThan(150)
      await ctx.close()
    })
  }

  test('Copy SVG and Download SVG hand over the same markup a sprite icon always gave', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
    const page = await ctx.newPage()
    watch(page, PERSONA)
    await page.addInitScript(() => {
      window.__clipboardWrites = []
      const orig = navigator.clipboard.writeText.bind(navigator.clipboard)
      navigator.clipboard.writeText = (text) => { window.__clipboardWrites.push(text); return orig(text) }
    })
    // Copying is free; taking the file needs an account.
    await signIn(page, { plan: 'free' })
    await go(page, '/create/icons')
    const cell = page.locator('.ig .ic', { has: page.locator('svg.ig-sym') }).first()
    await expect(cell).toBeVisible({ timeout: 20_000 })
    await cell.click()
    await expect(page.locator('.icust-stage')).toBeVisible({ timeout: 20_000 })

    const copy = page.getByRole('button', { name: 'Copy SVG', exact: true })
    await expect(copy).toBeEnabled({ timeout: 20_000 })
    await copy.click()
    await expect(page.getByRole('button', { name: /Copied!/ }).first()).toBeVisible()
    const writes = await page.evaluate(() => window.__clipboardWrites)
    expect(writes.length, 'nothing reached the clipboard').toBeGreaterThan(0)
    for (const w of writes) expect(w, 'the copied markup').toBe(EXPECTED_EXPORT)

    const downloaded = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download SVG', exact: true }).click()
    const file = await downloaded
    const fs = await import('node:fs/promises')
    expect(await fs.readFile(await file.path(), 'utf8'), 'the downloaded file').toBe(EXPECTED_EXPORT)
    await ctx.close()
  })
})
