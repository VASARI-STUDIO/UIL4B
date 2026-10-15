// A GLYPH THAT HAS NOT LOADED IS A FAINT SKELETON, NEVER A SOLID TILE.
//
// The grid takes its markup from one batched request per pack and composes each
// body into a data: URI. Until that request answers a cell is the wait box; once
// it answers, each <img> carries `ig-glyph-pending` until its own `load` event
// has fired, and then loses it.
//
// The pending window after the batch lands is a few milliseconds, so a poll
// from the test would miss it. A MutationObserver installed before the page
// script runs samples each pending <img> in the microtask after the commit that
// inserted it, which is before the image's `load` task can run, and records its
// computed background at that moment.
//
// MUTATIONS: give `.ic img.ig-glyph-pending` an opaque background in
// library.css and the alpha assertions fail; stop removing the class on load in
// MonoGlyph and the final assertion fails.
//
// A COLOURED-PACK GLYPH (a flag, a brand logo) sits in a transparent slot
// (`ig-chip`), so its skeleton is the slot itself: while `ig-chip--wait` the slot
// is the same faint tint, and once the glyph loads it is transparent again.
// MUTATION: drop the `.ig-chip.ig-chip--wait` selector from the skeleton rule in
// library.css and the pending-slot test fails (the slot is then invisible).
//
// A NAME THE SERVICE HAS NO ICON FOR stops being a skeleton once the batch has
// answered: the API lists it under `not_found`, and its cell is an empty slot.
// MUTATION: ignore the missing set when a cell is drawn (`gone` always false)
// and the cell keeps pulsing, so both not_found tests fail.
import { test, expect } from './base.js'
import { chooseMenuOption, go, signIn, watch } from './helpers.js'
import { ICONIFY_HOSTS, ICONIFY_STUB_HEADER, answerIconify, isLiveIconify } from './iconify-stub.js'

const PERSONA = 'a designer opening the icon library on a slow connection'
const MAX_SKELETON_ALPHA = 0.2

/** Alpha channel of a computed CSS colour, whatever colour space it came back in. */
function alphaOf(css) {
  if (css === 'transparent') return 0
  const slash = css.match(/\/\s*([\d.]+)(%?)\s*\)/)
  if (slash) return Number(slash[1]) / (slash[2] ? 100 : 1)
  const rgba = css.match(/rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/)
  if (rgba) return Number(rgba[1])
  if (/^(rgb|color|oklab|oklch|lab|lch|hsl)\(/.test(css)) return 1
  throw new Error(`unparseable colour: ${css}`)
}

test.describe('the icon grid while glyph images are still loading', () => {
  test.skip(isLiveIconify(), 'the live API decides how long a glyph takes; this spec controls it')

  test('a pending glyph is a faint skeleton and the class is gone once it has loaded', async ({ page }) => {
    watch(page, PERSONA)

    await page.addInitScript(() => {
      const seen = new WeakSet()
      window.__pendingGlyphs = []
      const sample = (img) => {
        if (seen.has(img) || !img.classList.contains('ig-glyph-pending')) return
        seen.add(img)
        window.__pendingGlyphs.push({
          background: getComputedStyle(img).backgroundColor,
          loaded: img.complete && img.naturalWidth > 0,
        })
      }
      const scan = (node) => {
        if (node.nodeType !== 1) return
        if (node.tagName === 'IMG') sample(node)
        node.querySelectorAll?.('img.ig-glyph-pending').forEach(sample)
      }
      new MutationObserver((records) => {
        for (const r of records) {
          if (r.type === 'attributes') scan(r.target)
          else r.addedNodes.forEach(scan)
        }
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
    })

    let release
    const held = new Promise((resolve) => { release = resolve })
    let heldRequests = 0
    await page.route(
      (u) => ICONIFY_HOSTS.includes(u.hostname) && /^\/[^/]+\.json$/.test(u.pathname) && u.search.includes('icons='),
      async (route) => {
        heldRequests += 1
        await held
        await route.fallback()
      },
    )

    await go(page, '/create/icons')

    // While the glyph requests are held the cells are the wait box.
    await expect(page.locator('.ig .ic .ig-glyph-wait').first()).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => heldRequests, { timeout: 20_000 }).toBeGreaterThan(0)
    expect(await page.locator('.ig .ic img').count(), 'no glyph has arrived yet').toBe(0)
    const waiting = await page.locator('.ig .ic .ig-glyph-wait').first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(alphaOf(waiting), `the wait box paints ${waiting}`).toBeLessThan(MAX_SKELETON_ALPHA)
    expect(alphaOf(waiting), 'the wait box is a tint, not nothing').toBeGreaterThan(0)

    release()

    await expect
      .poll(() => page.evaluate(() => window.__pendingGlyphs.length), { timeout: 20_000 })
      .toBeGreaterThan(8)
    const pending = await page.evaluate(() => window.__pendingGlyphs)
    for (const sample of pending) {
      expect(sample.loaded, 'sampled before the image finished loading').toBe(false)
      expect(alphaOf(sample.background), `a pending glyph paints ${sample.background}`)
        .toBeLessThan(MAX_SKELETON_ALPHA)
    }
    expect(pending.some((s) => alphaOf(s.background) > 0), 'the pending glyph is a tint, not nothing').toBe(true)

    // Once the images have loaded nothing is left pending and the glyphs drew.
    await expect
      .poll(() => page.evaluate(() => {
        const cells = [...document.querySelectorAll('.ig .ic img')]
        return {
          total: cells.length,
          pending: cells.filter((i) => i.classList.contains('ig-glyph-pending')).length,
          painted: cells.filter((i) => i.complete && i.naturalWidth > 0).length,
        }
      }), { timeout: 20_000 })
      .toMatchObject({ pending: 0 })
    const after = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.ig .ic img')]
      return { total: cells.length, painted: cells.filter((i) => i.complete && i.naturalWidth > 0).length }
    })
    expect(after.total, 'the grid drew glyphs').toBeGreaterThan(8)
    expect(after.painted, 'every glyph that is no longer pending has decoded').toBe(after.total)
    await expect(page.locator('.ig .ic .ig-glyph-wait')).toHaveCount(0)
  })
})

test.describe('the icon grid while a coloured pack is still loading', () => {
  test.skip(isLiveIconify(), 'the live API decides how long a glyph takes; this spec controls it')

  test('a pending coloured glyph slot is a faint tint, and a loaded one is transparent', async ({ page }) => {
    watch(page, PERSONA)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })

    // Hold only the flag pack's glyph batches, so the pack picker itself still works.
    let release
    const held = new Promise((resolve) => { release = resolve })
    let heldRequests = 0
    await page.route(
      (u) => ICONIFY_HOSTS.includes(u.hostname) && u.pathname === '/circle-flags.json' && u.search.includes('icons='),
      async (route) => {
        heldRequests += 1
        await held
        await route.fallback()
      },
    )
    await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'circle-flags')
    await expect.poll(() => heldRequests, { timeout: 20_000 }).toBeGreaterThan(0)

    const slot = page.locator('.ig .ic .ig-chip.ig-chip--wait').first()
    await expect(slot).toBeVisible({ timeout: 20_000 })
    const waiting = await slot.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(alphaOf(waiting), `the pending slot paints ${waiting}`).toBeLessThan(MAX_SKELETON_ALPHA)
    expect(alphaOf(waiting), 'the pending slot is a tint, not nothing').toBeGreaterThan(0)

    release()

    // A slot whose glyph has loaded is a transparent slot, not a box.
    const loaded = page.locator('.ig .ic .ig-chip:not(.ig-chip--wait):has(img)').first()
    await expect(loaded).toBeVisible({ timeout: 20_000 })
    const resting = await loaded.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(alphaOf(resting), `a loaded slot paints ${resting}`).toBe(0)
  })
})

// A batch answered with one name under `not_found`. The answer is built from the
// fixture's own (every other name keeps its body), held until the test releases it
// so the pulsing state can be seen first.
const batchOf = (pack) => (u) => ICONIFY_HOSTS.includes(u.hostname)
  && u.pathname === `/${pack}.json` && u.search.includes('icons=')

async function answerWithMissing(page, pack, pick) {
  let release
  const held = new Promise((resolve) => { release = resolve })
  const state = { name: null, requests: 0, release }
  await page.route(batchOf(pack), async (route) => {
    state.requests += 1
    await held
    const answer = answerIconify(route.request().url())
    const data = JSON.parse(answer.body)
    const drop = state.name ? null : pick(Object.keys(data.icons))
    if (drop) {
      state.name = drop
      delete data.icons[drop]
      data.not_found = [drop]
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*', [ICONIFY_STUB_HEADER]: '1' },
      body: JSON.stringify(data),
    })
  })
  return state
}

test.describe('the icon grid for a name the service does not have', () => {
  test.skip(isLiveIconify(), 'the live API decides what it serves; this spec controls the answer')

  test('a coloured name listed under not_found stops pulsing once the batch returns', async ({ page }) => {
    watch(page, PERSONA)
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })

    const missing = await answerWithMissing(page, 'logos', (names) => names.find((n) => n === 'arrow-kit'))
    await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'logos')
    const cell = page.locator('.ig .ic[aria-label="Customise arrow-kit"]')
    const slot = cell.locator('.ig-chip')

    // POSITIVE CONTROL. Before the answer the name pulses like every other cell, so
    // the absence of the skeleton afterwards is the answer's doing, not the cell's
    // having never been waiting.
    await expect(slot).toHaveClass(/ig-chip--wait/, { timeout: 20_000 })
    await expect.poll(() => missing.requests, { timeout: 20_000 }).toBeGreaterThan(0)
    missing.release()

    // Its neighbours drew their artwork; the missing name did not, and does not pulse.
    await expect(page.locator('.ig .ic[aria-label="Customise github-icon"] .ig-chip img')).toBeVisible({ timeout: 20_000 })
    expect(missing.name, 'the answer never listed arrow-kit as not found').toBe('arrow-kit')
    await expect(slot, 'a name the service does not have is still a loading skeleton').not.toHaveClass(/ig-chip--wait/)
    await expect(slot.locator('img'), 'a missing name drew artwork').toHaveCount(0)
    await expect(cell.locator('.ig-glyph-wait')).toHaveCount(0)
  })

  test('a mono name listed under not_found is an empty slot, not the wait box', async ({ page }) => {
    watch(page, PERSONA)
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible({ timeout: 20_000 })

    const missing = await answerWithMissing(page, 'lucide', (names) => names[0])
    await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'lucide')
    await expect(page.locator('.ig .ic .ig-glyph-wait').first()).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => missing.requests, { timeout: 20_000 }).toBeGreaterThan(0)
    missing.release()

    await expect(page.locator('.ig .ic img').nth(8)).toBeVisible({ timeout: 20_000 })
    expect(missing.name, 'the answer listed nothing as not found').toBeTruthy()
    const cell = page.locator(`.ig .ic[aria-label="Customise ${missing.name}"]`)
    await expect(cell.locator('.ig-glyph-gone'), 'the missing name has no empty slot').toHaveCount(1)
    await expect(cell.locator('.ig-glyph-wait'), 'the missing name still pulses').toHaveCount(0)
    await expect(page.locator('.ig .ic .ig-glyph-wait'), 'something is still waiting after the batch returned').toHaveCount(0)
  })
})

test.describe('the customiser while its artwork is loading', () => {
  test.skip(isLiveIconify(), 'this spec controls when the artwork arrives')

  test('a cold preview pulses until the held artwork arrives', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await expect(page.locator('.ig .ic').first()).toBeVisible()
    let release
    const held = new Promise(resolve => { release = resolve })
    let requests = 0
    await page.route(u => ICONIFY_HOSTS.includes(u.hostname)
      && (u.pathname === '/logos.json' || /^\/logos\/[^/]+\.svg$/.test(u.pathname)), async route => {
      requests += 1
      await held
      await route.fallback()
    })
    try {
      await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'logos')
      await page.locator('.ig .ic').first().click()
      const stage = page.locator('.icust-stage')
      const placeholder = stage.locator('.icust-stage-wait')
      await expect(placeholder).toBeVisible()
      await expect.poll(() => requests).toBeGreaterThan(0)
      await expect(placeholder).toHaveClass(/icust-stage-wait/)
      await expect(placeholder).toHaveCSS('animation-name', 'ig-skel-pulse')
      const paint = await placeholder.evaluate(el => {
        const css = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        const stage = el.parentElement.getBoundingClientRect()
        return { background: css.backgroundColor, width: r.width, height: r.height,
          dx: r.x + r.width / 2 - stage.x - stage.width / 2,
          dy: r.y + r.height / 2 - stage.y - stage.height / 2 }
      })
      expect(alphaOf(paint.background)).toBeGreaterThan(0)
      expect(alphaOf(paint.background)).toBeLessThan(MAX_SKELETON_ALPHA)
      expect(paint.width).toBeCloseTo(48, 1)
      expect(paint.height).toBeCloseTo(48, 1)
      expect(Math.abs(paint.dx)).toBeLessThan(1)
      expect(Math.abs(paint.dy)).toBeLessThan(1)
      await expect(placeholder).toHaveCSS('border-radius', '8px')
      const status = stage.getByRole('status')
      await expect(status).toHaveText('Loading\u2026')
      // The loading string is clipped for sighted readers but remains announced.
      await expect(status.getByText('Loading\u2026', { exact: true })).toHaveClass('sr-only')
      await expect(status.locator('.sr-only')).toHaveCSS('clip', 'rect(0px, 0px, 0px, 0px)')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await expect(placeholder).toHaveCSS('animation-name', 'none')
      release()
      await expect(stage.locator('img.icust-stage-img')).toBeVisible()
      await expect.poll(() => stage.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
      await expect(placeholder).toHaveCount(0)
      await expect(status).toHaveCount(0)
    } finally { release() }
  })

  test('cached markup opens without a loading frame', async ({ page }) => {
    await signIn(page, { plan: 'pro' })
    await go(page, '/create/icons')
    await chooseMenuOption(page, page.getByRole('button', { name: 'Icon pack' }), 'logos')
    const cell = page.locator('.ig .ic').first()
    await expect.poll(() => cell.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
    await page.evaluate(() => {
      window.__stagePaints = []
      new MutationObserver(() => {
        const stage = document.querySelector('.icust-stage')
        if (stage) window.__stagePaints.push({
          waiting: !!stage.querySelector('.icust-stage-wait, [role="status"]'),
          image: !!stage.querySelector('img[src^="data:"]'),
        })
      }).observe(document.body, { childList: true, subtree: true })
    })
    await cell.click()
    await expect(page.locator('.icust-stage img')).toBeVisible()
    const paints = await page.evaluate(() => window.__stagePaints)
    expect(paints.length).toBeGreaterThan(0)
    expect(paints.every(p => !p.waiting && p.image)).toBe(true)
  })
})
